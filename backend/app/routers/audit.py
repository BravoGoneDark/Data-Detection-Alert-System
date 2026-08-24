# backend/app/routers/audit.py
from typing import Optional
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database import get_db
from app.models import User, AuditLog
from app.authorization import require_permission
from app.schemas import AuditLogsResponse, AuditLogOut, AuditStatsResponse

router = APIRouter(prefix="/admin/audit-logs", tags=["Audit Logs & Compliance"])


@router.get("", response_model=AuditLogsResponse)
async def list_audit_logs(
    event_type: Optional[str] = None,
    severity: Optional[str] = None,
    username: Optional[str] = None,
    dataset_id: Optional[int] = None,
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("dataset:view")),
):
    """
    Returns security audit log ledger records with multi-dimensional filtering.
    """
    query = db.query(AuditLog)

    if event_type:
        query = query.filter(AuditLog.event_type == event_type.upper())
    if severity:
        query = query.filter(AuditLog.severity == severity.upper())
    if username:
        query = query.filter(AuditLog.username.ilike(f"%{username}%"))
    if dataset_id is not None:
        query = query.filter(AuditLog.dataset_id == dataset_id)

    total = query.count()
    items = query.order_by(desc(AuditLog.timestamp)).offset(offset).limit(limit).all()

    logs_out = [
        AuditLogOut(
            id=item.id,
            timestamp=item.timestamp,
            user_id=item.user_id,
            username=item.username,
            event_type=item.event_type,
            severity=item.severity,
            dataset_id=item.dataset_id,
            dataset_filename=item.dataset_filename,
            classification=item.classification,
            ip_address=item.ip_address,
            user_agent=item.user_agent,
            action_details=item.action_details,
        )
        for item in items
    ]

    return AuditLogsResponse(
        total=total,
        count=len(logs_out),
        logs=logs_out,
    )


@router.get("/stats", response_model=AuditStatsResponse)
async def get_audit_log_statistics(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("dataset:view")),
):
    """
    Returns high-level security statistics and telemetry from the audit ledger with Redis caching.
    """
    from app.redis_client import get_cached_json, set_cached_json
    cache_key = "ddas:cache:audit:stats"
    cached = get_cached_json(cache_key)
    if cached is not None:
        return AuditStatsResponse(**cached)

    total = db.query(AuditLog).count()

    # Severity counts
    info_count = db.query(AuditLog).filter(AuditLog.severity == "INFO").count()
    warning_count = db.query(AuditLog).filter(AuditLog.severity == "WARNING").count()
    critical_count = db.query(AuditLog).filter(AuditLog.severity == "CRITICAL").count()

    # Event type breakdown
    all_logs = db.query(AuditLog.event_type).all()
    event_counts: dict[str, int] = {}
    for (etype,) in all_logs:
        event_counts[etype] = event_counts.get(etype, 0) + 1

    # Top access denied attempts
    denied_logs = (
        db.query(AuditLog.username, AuditLog.classification)
        .filter(AuditLog.event_type == "ACCESS_DENIED")
        .all()
    )
    user_denial_counts: dict[str, int] = {}
    for uname, _ in denied_logs:
        key = uname or "Unknown"
        user_denial_counts[key] = user_denial_counts.get(key, 0) + 1

    top_denied = [
        {"username": uname, "violations_count": count}
        for uname, count in sorted(user_denial_counts.items(), key=lambda x: x[1], reverse=True)[:5]
    ]

    stats_dict = {
        "total_events": total,
        "severity_breakdown": {
            "INFO": info_count,
            "WARNING": warning_count,
            "CRITICAL": critical_count,
        },
        "event_type_breakdown": event_counts,
        "top_denied_users": top_denied,
    }
    set_cached_json(cache_key, stats_dict, ttl_seconds=10)
    return AuditStatsResponse(**stats_dict)
