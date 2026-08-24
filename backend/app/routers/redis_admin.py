# backend/app/routers/redis_admin.py
"""
DDAS Redis Administration & Cache Telemetry Router.
Provides endpoints for monitoring distributed cache performance, hit/miss ratios,
memory consumption, and administrative cache purge workflows.
"""
from typing import Optional
from fastapi import APIRouter, Depends, Request, Query, status
from pydantic import BaseModel

from app.authorization import require_permission
from app.models import User
from app.redis_client import get_redis_telemetry, delete_cache_pattern, delete_cache_key
from app.audit_logger import record_audit_event
from app.task_queue import get_task_stats

router = APIRouter(prefix="/admin/redis", tags=["Redis Administration & Cache"])


class RedisStatsOut(BaseModel):
    status: str
    engine: str
    ping_latency_ms: Optional[float] = None
    memory_used: str
    total_keys: int
    cache_hits: int
    cache_misses: int
    cache_sets: int
    cache_purges: int
    hit_ratio_percent: float
    connected_clients: int
    uptime_days: int
    redis_url: str
    task_queue: dict


class CachePurgeRequest(BaseModel):
    pattern: Optional[str] = "ddas:cache:*"


class CachePurgeOut(BaseModel):
    message: str
    pattern: str
    keys_purged: int


@router.get("/stats", response_model=RedisStatsOut)
def get_redis_cache_statistics(
    current_user: User = Depends(require_permission("security:view")),
):
    """
    Returns real-time telemetry on the Redis distributed caching cluster,
    hit/miss efficiency, memory utilization, and background task queue.
    """
    telemetry = get_redis_telemetry()
    task_stats = get_task_stats()
    telemetry["task_queue"] = task_stats
    return telemetry


@router.post("/cache/purge", response_model=CachePurgeOut)
def purge_redis_cache(
    request: Request,
    payload: CachePurgeRequest,
    current_user: User = Depends(require_permission("alert:manage")),
):
    """
    Purges distributed cache keys matching the specified pattern.
    Emits an immutable audit log entry for forensic accountability.
    """
    pattern = payload.pattern or "ddas:cache:*"
    purged_count = delete_cache_pattern(pattern)

    # Record Audit Event
    try:
        from app.database import SessionLocal
        db = SessionLocal()
        try:
            record_audit_event(
                db=db,
                request=request,
                event_type="CACHE_PURGED",
                severity="INFO",
                user=current_user,
                action_details={
                    "pattern": pattern,
                    "keys_purged": purged_count,
                    "purged_by": current_user.username,
                },
            )
        finally:
            db.close()
    except Exception:
        pass

    return {
        "message": f"Successfully purged {purged_count} cache keys matching '{pattern}'.",
        "pattern": pattern,
        "keys_purged": purged_count,
    }
