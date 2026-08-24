# backend/app/routers/anomalies.py
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database import get_db
from app.models import User, AnomalyEvent
from app.authorization import require_permission
from app.audit_logger import record_audit_event
from app.schemas import (
    AnomalyEventOut,
    AnomalyEventsResponse,
    AnomalyStatsResponse,
    AnomalyResolveRequest,
)

router = APIRouter(prefix="/admin/anomalies", tags=["Behavioral Anomaly Detection"])


@router.get("", response_model=AnomalyEventsResponse)
async def list_anomaly_events(
    severity: Optional[str] = None,
    status: Optional[str] = None,
    anomaly_type: Optional[str] = None,
    username: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("dataset:view")),
):
    """
    Lists behavioral anomaly events with multi-dimensional filtering and pagination.
    """
    query = db.query(AnomalyEvent)

    if severity:
        query = query.filter(AnomalyEvent.severity == severity.upper())
    if status:
        query = query.filter(AnomalyEvent.status == status.upper())
    if anomaly_type:
        query = query.filter(AnomalyEvent.anomaly_type == anomaly_type.upper())
    if username:
        query = query.filter(AnomalyEvent.username.ilike(f"%{username}%"))

    total = query.count()
    items = query.order_by(desc(AnomalyEvent.timestamp)).offset(offset).limit(limit).all()

    out_items = [
        AnomalyEventOut(
            id=item.id,
            timestamp=item.timestamp,
            user_id=item.user_id,
            username=item.username,
            dataset_id=item.dataset_id,
            dataset_filename=item.dataset_filename,
            anomaly_type=item.anomaly_type,
            severity=item.severity,
            z_score=item.z_score,
            risk_score=item.risk_score,
            status=item.status,
            details_json=item.details_json,
        )
        for item in items
    ]

    return AnomalyEventsResponse(
        total=total,
        count=len(out_items),
        anomalies=out_items,
    )


@router.get("/stats", response_model=AnomalyStatsResponse)
async def get_anomaly_statistics(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("dataset:view")),
):
    """
    Returns real-time behavioral anomaly posture, active threat volume, and user risk scores with Redis caching.
    """
    from app.redis_client import get_cached_json, set_cached_json
    cache_key = "ddas:cache:anomalies:stats"
    cached = get_cached_json(cache_key)
    if cached is not None:
        return AnomalyStatsResponse(**cached)

    total = db.query(AnomalyEvent).count()
    active_threats = (
        db.query(AnomalyEvent)
        .filter(AnomalyEvent.status.in_(["ACTIVE", "INVESTIGATING"]))
        .count()
    )

    # Severity counts
    all_events = db.query(AnomalyEvent.severity, AnomalyEvent.anomaly_type, AnomalyEvent.status).all()
    sev_counts: dict[str, int] = {}
    type_counts: dict[str, int] = {}
    status_counts: dict[str, int] = {}

    for sev, atype, st in all_events:
        sev_counts[sev] = sev_counts.get(sev, 0) + 1
        type_counts[atype] = type_counts.get(atype, 0) + 1
        status_counts[st] = status_counts.get(st, 0) + 1

    # Highest-risk users calculation based on cumulative anomaly risk score
    user_anomalies = (
        db.query(AnomalyEvent.username, AnomalyEvent.risk_score, AnomalyEvent.severity)
        .filter(AnomalyEvent.status.in_(["ACTIVE", "INVESTIGATING"]))
        .all()
    )
    user_risk_map: dict[str, dict[str, float]] = {}
    for uname, risk, sev in user_anomalies:
        if uname not in user_risk_map:
            user_risk_map[uname] = {"cumulative_risk": 0.0, "incident_count": 0, "critical_count": 0}
        user_risk_map[uname]["cumulative_risk"] += risk
        user_risk_map[uname]["incident_count"] += 1
        if sev == "CRITICAL":
            user_risk_map[uname]["critical_count"] += 1

    sorted_risks = sorted(
        [
            {
                "username": uname,
                "cumulative_risk": round(data["cumulative_risk"], 1),
                "incident_count": int(data["incident_count"]),
                "critical_incidents": int(data["critical_count"]),
            }
            for uname, data in user_risk_map.items()
        ],
        key=lambda x: x["cumulative_risk"],
        reverse=True,
    )[:5]

    stats_dict = {
        "total_anomalies": total,
        "active_threats": active_threats,
        "severity_breakdown": sev_counts,
        "anomaly_type_breakdown": type_counts,
        "status_breakdown": status_counts,
        "highest_risk_users": sorted_risks,
    }
    set_cached_json(cache_key, stats_dict, ttl_seconds=10)
    return AnomalyStatsResponse(**stats_dict)


@router.post("/{anomaly_id}/resolve")
async def resolve_anomaly_event(
    anomaly_id: int,
    payload: AnomalyResolveRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("dataset:upload")),
):
    """
    Updates anomaly status (e.g. INVESTIGATING, RESOLVED, FALSE_POSITIVE) with audit trail.
    """
    from app.redis_client import delete_cache_key
    anomaly = db.query(AnomalyEvent).filter(AnomalyEvent.id == anomaly_id).first()
    if not anomaly:
        raise HTTPException(status_code=404, detail="Anomaly event not found")

    old_status = anomaly.status
    anomaly.status = payload.status.upper()
    db.commit()
    db.refresh(anomaly)

    delete_cache_key("ddas:cache:anomalies:stats")

    # Log status transition in security audit ledger
    record_audit_event(
        db=db,
        event_type="ANOMALY_STATUS_UPDATED",
        severity="INFO",
        user=current_user,
        request=request,
        details={
            "anomaly_id": anomaly.id,
            "target_user": anomaly.username,
            "anomaly_type": anomaly.anomaly_type,
            "old_status": old_status,
            "new_status": anomaly.status,
            "resolution_notes": payload.notes,
        },
    )

    return {
        "status": "success",
        "anomaly_id": anomaly.id,
        "new_status": anomaly.status,
        "message": f"Anomaly #{anomaly.id} updated from {old_status} to {anomaly.status}",
    }
