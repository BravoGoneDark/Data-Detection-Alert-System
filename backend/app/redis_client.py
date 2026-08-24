# backend/app/redis_client.py
"""
DDAS Redis Distributed Cache & Connection Manager.
Provides connection pooling, JSON serialization, pattern-based invalidation,
resilient fail-soft in-memory fallback, and telemetry instrumentation.
"""
import os
import json
import time
import logging
from typing import Any, Optional, Dict, List
import redis
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger("ddas.redis")
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

# Global in-memory fallback cache (used when Redis is unavailable)
_memory_cache: Dict[str, Dict[str, Any]] = {}
_cache_stats = {"hits": 0, "misses": 0, "sets": 0, "purges": 0}

# Connection pool singleton
_pool: Optional[redis.ConnectionPool] = None


def get_redis_pool() -> redis.ConnectionPool:
    global _pool
    if _pool is None:
        try:
            _pool = redis.ConnectionPool.from_url(
                REDIS_URL,
                max_connections=20,
                decode_responses=True,
                socket_timeout=2.0,
                socket_connect_timeout=2.0,
            )
        except Exception as e:
            logger.warning("Failed to initialize Redis pool: %s", e)
    return _pool


def get_redis_client() -> Optional[redis.Redis]:
    """Returns a connected Redis client or None if Redis is unreachable."""
    try:
        pool = get_redis_pool()
        if pool:
            client = redis.Redis(connection_pool=pool)
            client.ping()
            return client
    except Exception as e:
        logger.debug("Redis unreachable, falling back to in-memory cache: %s", e)
    return None


def is_redis_available() -> bool:
    client = get_redis_client()
    return client is not None


# ============================================================================
# Cache Operations with Automatic Fail-Soft Resilience
# ============================================================================

def get_cached_json(key: str) -> Optional[Any]:
    """Retrieve and deserializes cached JSON value. Falls back to in-memory."""
    client = get_redis_client()
    if client:
        try:
            val = client.get(key)
            if val is not None:
                _cache_stats["hits"] += 1
                return json.loads(val)
            _cache_stats["misses"] += 1
            return None
        except Exception as e:
            logger.warning("Redis GET error on key %s: %s", key, e)

    # In-memory fallback
    now = time.time()
    if key in _memory_cache:
        entry = _memory_cache[key]
        if entry["expires_at"] is None or entry["expires_at"] > now:
            _cache_stats["hits"] += 1
            return entry["data"]
        else:
            del _memory_cache[key]

    _cache_stats["misses"] += 1
    return None


def set_cached_json(key: str, data: Any, ttl_seconds: Optional[int] = 60) -> bool:
    """Serializes and stores data in Redis or in-memory fallback with TTL."""
    serialized = json.dumps(data, default=str)
    _cache_stats["sets"] += 1

    client = get_redis_client()
    if client:
        try:
            if ttl_seconds and ttl_seconds > 0:
                client.setex(key, ttl_seconds, serialized)
            else:
                client.set(key, serialized)
            return True
        except Exception as e:
            logger.warning("Redis SET error on key %s: %s", key, e)

    # In-memory fallback
    expires_at = time.time() + ttl_seconds if ttl_seconds else None
    _memory_cache[key] = {"data": data, "expires_at": expires_at}
    return True


def delete_cache_key(key: str) -> bool:
    """Deletes a single cache key from Redis and in-memory cache."""
    _cache_stats["purges"] += 1
    deleted = False

    client = get_redis_client()
    if client:
        try:
            res = client.delete(key)
            deleted = bool(res)
        except Exception as e:
            logger.warning("Redis DELETE error on key %s: %s", key, e)

    if key in _memory_cache:
        del _memory_cache[key]
        deleted = True

    return deleted


def delete_cache_pattern(pattern: str) -> int:
    """Deletes all keys matching a glob pattern (e.g. 'ddas:cache:datasets*')."""
    _cache_stats["purges"] += 1
    count = 0

    client = get_redis_client()
    if client:
        try:
            keys = list(client.scan_iter(match=pattern, count=100))
            if keys:
                count = client.delete(*keys)
        except Exception as e:
            logger.warning("Redis SCAN/DELETE error on pattern %s: %s", pattern, e)

    # In-memory fallback matching
    import fnmatch
    to_del = [k for k in _memory_cache.keys() if fnmatch.fnmatch(k, pattern)]
    for k in to_del:
        del _memory_cache[k]
        count += 1

    return count


# ============================================================================
# Telemetry & Diagnostics Instrumentation
# ============================================================================

def get_redis_telemetry() -> Dict[str, Any]:
    """Generates real-time health and performance metrics for the SOC dashboard."""
    client = get_redis_client()
    is_online = client is not None
    ping_ms = None
    info: Dict[str, Any] = {}

    if client:
        try:
            t0 = time.time()
            client.ping()
            ping_ms = round((time.time() - t0) * 1000, 2)
            info = client.info()
        except Exception as e:
            logger.warning("Failed to query Redis info: %s", e)
            is_online = False

    # Calculate hit ratio
    total_queries = _cache_stats["hits"] + _cache_stats["misses"]
    hit_ratio = round((_cache_stats["hits"] / total_queries * 100), 1) if total_queries > 0 else 0.0

    # Human-readable memory
    memory_used_human = info.get("used_memory_human", "N/A")
    uptime_days = info.get("uptime_in_days", 0)
    connected_clients = info.get("connected_clients", 0)
    total_keys = 0

    if client and is_online:
        try:
            db_info = client.info("keyspace")
            total_keys = sum(db_data.get("keys", 0) for db_data in db_info.values() if isinstance(db_data, dict))
            if total_keys == 0:
                total_keys = len(client.keys("ddas:*"))
        except Exception:
            total_keys = len(_memory_cache)
    else:
        total_keys = len(_memory_cache)

    return {
        "status": "ONLINE" if is_online else "OFFLINE_FALLBACK",
        "engine": "Redis 7 (Distributed)" if is_online else "Python In-Memory (Local Fallback)",
        "ping_latency_ms": ping_ms,
        "memory_used": memory_used_human,
        "total_keys": total_keys,
        "cache_hits": _cache_stats["hits"],
        "cache_misses": _cache_stats["misses"],
        "cache_sets": _cache_stats["sets"],
        "cache_purges": _cache_stats["purges"],
        "hit_ratio_percent": hit_ratio,
        "connected_clients": connected_clients,
        "uptime_days": uptime_days,
        "redis_url": REDIS_URL.split("@")[-1] if "@" in REDIS_URL else REDIS_URL,
    }
