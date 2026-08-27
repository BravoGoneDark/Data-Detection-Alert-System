# backend/app/routers/quarantine.py
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database import get_db
from app.models import User, QuarantineRecord
from app.authorization import require_permission
from app.quarantine import (
    is_user_quarantined,
    quarantine_user,
    release_user_quarantine,
)
from app.schemas import (
    QuarantineRecordOut,
    QuarantineListResponse,
    QuarantineStatsResponse,
    ManualQuarantineRequest,
    QuarantineReleaseRequest,
    QuarantineStatusResponse,
)

router = APIRouter(tags=["Security Quarantine & Policy Containment"])


@router.get("/admin/quarantine", response_model=QuarantineListResponse)
async def list_quarantine_records(
    status: Optional[str] = None,
    username: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("dataset:view")),
):
    """Lists security quarantine containment records with filtering and pagination."""
    query = db.query(QuarantineRecord)

    if status:
        query = query.filter(QuarantineRecord.status == status.upper())
    if username:
        query = query.filter(QuarantineRecord.username.ilike(f"%{username}%"))

    total = query.count()
    items = query.order_by(desc(QuarantineRecord.quarantined_at)).offset(offset).limit(limit).all()

    out_records = [
        QuarantineRecordOut(
            id=item.id,
            user_id=item.user_id,
            username=item.username,
            ip_address=item.ip_address,
            reason=item.reason,
            trigger_anomaly_id=item.trigger_anomaly_id,
            risk_score=item.risk_score,
            status=item.status,
            quarantined_at=item.quarantined_at,
            released_at=item.released_at,
            released_by=item.released_by,
            release_notes=item.release_notes,
        )
        for item in items
    ]

    return QuarantineListResponse(
        total=total,
        count=len(out_records),
        records=out_records,
    )


@router.get("/admin/quarantine/stats", response_model=QuarantineStatsResponse)
async def get_quarantine_statistics(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("dataset:view")),
):
    """Returns real-time containment statistics and status breakdown with Redis caching."""
    from app.redis_client import get_cached_json, set_cached_json
    cache_key = "ddas:cache:quarantine:stats"
    cached = get_cached_json(cache_key)
    if cached is not None:
        return QuarantineStatsResponse(**cached)

    active_count = db.query(QuarantineRecord).filter(QuarantineRecord.status == "ACTIVE").count()
    total_count = db.query(QuarantineRecord).count()

    all_records = db.query(QuarantineRecord.status).all()
    st_counts: dict[str, int] = {}
    for (st,) in all_records:
        st_counts[st] = st_counts.get(st, 0) + 1

    stats_dict = {
        "active_quarantines": active_count,
        "total_quarantined_all_time": total_count,
        "status_breakdown": st_counts,
    }
    set_cached_json(cache_key, stats_dict, ttl_seconds=10)
    return QuarantineStatsResponse(**stats_dict)


@router.post("/admin/quarantine", response_model=QuarantineRecordOut)
async def create_manual_quarantine(
    payload: ManualQuarantineRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("user:manage")),
):
    """Manually subjects a user account to administrative quarantine containment."""
    from app.redis_client import delete_cache_key
    target_user = db.query(User).filter(User.username == payload.username).first()
    target_user_id = target_user.id if target_user else None

    record = quarantine_user(
        db=db,
        username=payload.username,
        user_id=target_user_id,
        reason=f"Manual administrative quarantine: {payload.reason}",
        risk_score=payload.risk_score or 85.0,
        trigger_anomaly_id=None,
        ip_address=request.client.host if request.client else None,
        request=request,
    )

    delete_cache_key("ddas:cache:quarantine:stats")

    return QuarantineRecordOut(
        id=record.id,
        user_id=record.user_id,
        username=record.username,
        ip_address=record.ip_address,
        reason=record.reason,
        trigger_anomaly_id=record.trigger_anomaly_id,
        risk_score=record.risk_score,
        status=record.status,
        quarantined_at=record.quarantined_at,
        released_at=record.released_at,
        released_by=record.released_by,
        release_notes=record.release_notes,
    )


@router.post("/admin/quarantine/{record_id}/release", response_model=QuarantineRecordOut)
async def release_quarantine_record(
    record_id: int,
    payload: QuarantineReleaseRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("user:manage")),
):
    """Lifts security quarantine containment and restores account privileges."""
    from app.redis_client import delete_cache_key
    try:
        record = release_user_quarantine(
            db=db,
            record_id=record_id,
            admin_user=current_user,
            release_notes=payload.release_notes,
            request=request,
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

    delete_cache_key("ddas:cache:quarantine:stats")

    return QuarantineRecordOut(
        id=record.id,
        user_id=record.user_id,
        username=record.username,
        ip_address=record.ip_address,
        reason=record.reason,
        trigger_anomaly_id=record.trigger_anomaly_id,
        risk_score=record.risk_score,
        status=record.status,
        quarantined_at=record.quarantined_at,
        released_at=record.released_at,
        released_by=record.released_by,
        release_notes=record.release_notes,
    )


@router.get("/quarantine/status", response_model=QuarantineStatusResponse)
async def get_my_quarantine_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("dataset:view")),
):
    """Allows authenticated user to check their active quarantine containment status."""
    is_quarantined, record = is_user_quarantined(db, user_id=current_user.id, username=current_user.username)
    if is_quarantined and record:
        return QuarantineStatusResponse(
            is_quarantined=True,
            record=QuarantineRecordOut(
                id=record.id,
                user_id=record.user_id,
                username=record.username,
                ip_address=record.ip_address,
                reason=record.reason,
                trigger_anomaly_id=record.trigger_anomaly_id,
                risk_score=record.risk_score,
                status=record.status,
                quarantined_at=record.quarantined_at,
                released_at=record.released_at,
                released_by=record.released_by,
                release_notes=record.release_notes,
            ),
        )
    return QuarantineStatusResponse(is_quarantined=False, record=None)
