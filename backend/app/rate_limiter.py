# backend/app/rate_limiter.py
"""
DDAS Distributed Sliding-Window Rate Limiter & Burst Detector.
Uses Redis Sorted Sets (ZADD / ZREMRANGEBYSCORE / ZCARD) for atomic,
cross-process synchronized download velocity and exfiltration rate monitoring.
Includes transparent local fallback when Redis is offline.
"""
import time
import logging
from typing import Tuple, Dict, List
from collections import defaultdict
from app.redis_client import get_redis_client

logger = logging.getLogger("ddas.ratelimiter")

# In-memory sliding window fallback: key -> list of float timestamps
_memory_windows: Dict[str, List[float]] = defaultdict(list)


def record_and_count_events(
    key: str,
    window_seconds: int = 30,
) -> int:
    """
    Atomically logs a timestamped event under `key` and returns the total
    event count within the sliding `[now - window_seconds, now]` interval.
    """
    now = time.time()
    cutoff = now - window_seconds
    redis_key = f"ddas:rate:{key}"

    client = get_redis_client()
    if client:
        try:
            pipeline = client.pipeline()
            # 1. Remove expired events older than cutoff
            pipeline.zremrangebyscore(redis_key, "-inf", cutoff)
            # 2. Add current event with score = current timestamp
            pipeline.zadd(redis_key, {f"{now}:{time.time_ns()}": now})
            # 3. Count remaining events in current window
            pipeline.zcard(redis_key)
            # 4. Refresh TTL on key so inactive keys automatically expire
            pipeline.expire(redis_key, window_seconds * 2)
            results = pipeline.execute()
            count = results[2]
            return int(count)
        except Exception as e:
            logger.warning("Redis sliding window error on %s: %s", key, e)

    # In-memory fallback
    timestamps = _memory_windows[key]
    # Prune old timestamps
    _memory_windows[key] = [t for t in timestamps if t > cutoff] + [now]
    return len(_memory_windows[key])


def check_sliding_window_burst(
    user_id: str,
    window_seconds: int = 30,
    threshold: int = 4,
) -> Tuple[bool, int]:
    """
    Checks if a user has exceeded the allowable download velocity threshold
    in the specified sliding window.
    Returns:
        (is_burst_triggered: bool, current_count: int)
    """
    key = f"burst:user:{user_id}:{window_seconds}s"
    count = record_and_count_events(key, window_seconds=window_seconds)
    is_burst = count >= threshold
    return is_burst, count


def reset_sliding_window(key: str) -> None:
    """Clears the sliding window counter for a specific user/key."""
    redis_key = f"ddas:rate:{key}"
    client = get_redis_client()
    if client:
        try:
            client.delete(redis_key)
        except Exception as e:
            logger.warning("Failed to reset Redis rate key %s: %s", key, e)

    if key in _memory_windows:
        del _memory_windows[key]
