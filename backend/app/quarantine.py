# backend/app/quarantine.py
import json
from datetime import datetime, timezone
from typing import Optional, Any
from fastapi import Request
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.models import User, AnomalyEvent, QuarantineRecord, AuditLog
from app.audit_logger import record_audit_event
from app.alerting import dispatch_webhook_alert


def is_user_quarantined(
    db: Session,
    user_id: Optional[int] = None,
    username: Optional[str] = None,
) -> tuple[bool, Optional[QuarantineRecord]]:
    """
    Checks if a user is currently subject to active policy quarantine containment.
    """
    query = db.query(QuarantineRecord).filter(QuarantineRecord.status == "ACTIVE")
    if user_id:
        record = query.filter(QuarantineRecord.user_id == user_id).first()
        if record:
            return True, record
    if username:
        record = query.filter(QuarantineRecord.username == username).first()
        if record:
            return True, record
    return False, None


def quarantine_user(
    db: Session,
    username: str,
    user_id: Optional[int] = None,
    reason: str = "High-risk behavioral anomaly surge detected",
    risk_score: float = 85.0,
    trigger_anomaly_id: Optional[int] = None,
    ip_address: Optional[str] = None,
    request: Optional[Request] = None,
) -> QuarantineRecord:
    """
    Enforces immediate containment isolation on a user account, records audit entry,
    and broadcasts outbound webhook threat alerts.
    """
    # Check if already under active quarantine
    is_active, existing = is_user_quarantined(db, user_id=user_id, username=username)
    if is_active and existing:
        return existing

    record = QuarantineRecord(
        user_id=user_id,
        username=username,
        ip_address=ip_address,
        reason=reason,
        trigger_anomaly_id=trigger_anomaly_id,
        risk_score=round(risk_score, 1),
        status="ACTIVE",
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    # Immutable SIEM audit entry
    record_audit_event(
        db=db,
        event_type="USER_QUARANTINED",
        severity="CRITICAL",
        user_id=user_id,
        username=username,
        ip_address=ip_address,
        request=request,
        details={
            "quarantine_id": record.id,
            "reason": reason,
            "risk_score": risk_score,
            "trigger_anomaly_id": trigger_anomaly_id,
        },
    )

    # Real-Time Outbound Webhook Alert
    dispatch_webhook_alert(
        db=db,
        event_type="QUARANTINE_TRIGGERED",
        severity="CRITICAL",
        payload_data={
            "quarantine_id": record.id,
            "user_id": user_id,
            "username": username,
            "reason": reason,
            "risk_score": risk_score,
            "trigger_anomaly_id": trigger_anomaly_id,
            "quarantined_at": record.quarantined_at.isoformat() if record.quarantined_at else None,
        },
    )

    return record


def release_user_quarantine(
    db: Session,
    record_id: int,
    admin_user: User,
    release_notes: str,
    request: Optional[Request] = None,
) -> QuarantineRecord:
    """
    Administratively lifts security quarantine containment and restores account privileges.
    """
    record = db.query(QuarantineRecord).filter(QuarantineRecord.id == record_id).first()
    if not record:
        raise ValueError("Quarantine record not found")

    if record.status == "RELEASED":
        return record

    record.status = "RELEASED"
    record.released_at = datetime.now(timezone.utc)
    record.released_by = admin_user.username
    record.release_notes = release_notes
    db.commit()
    db.refresh(record)

    # SIEM audit entry
    record_audit_event(
        db=db,
        event_type="QUARANTINE_RELEASED",
        severity="INFO",
        user=admin_user,
        request=request,
        details={
            "quarantine_id": record.id,
            "target_username": record.username,
            "released_by": admin_user.username,
            "release_notes": release_notes,
        },
    )

    # Outbound webhook notification
    dispatch_webhook_alert(
        db=db,
        event_type="QUARANTINE_RELEASED",
        severity="INFO",
        payload_data={
            "quarantine_id": record.id,
            "target_username": record.username,
            "released_by": admin_user.username,
            "release_notes": release_notes,
            "released_at": record.released_at.isoformat() if record.released_at else None,
        },
    )

    return record


def evaluate_auto_quarantine(
    db: Session,
    user: User,
    triggered_anomalies: list[AnomalyEvent],
    request: Optional[Request] = None,
) -> Optional[QuarantineRecord]:
    """
    Autonomous Defensive Quarantine Evaluator:
    Automatically contains accounts exceeding risk threshold (>= 80.0) or critical burst surge.
    """
    if not triggered_anomalies:
        return None

    # Check if already quarantined
    is_active, existing = is_user_quarantined(db, user_id=user.id, username=user.username)
    if is_active and existing:
        return existing

    # Find highest risk trigger
    max_risk = max((a.risk_score for a in triggered_anomalies), default=0.0)
    critical_triggers = [
        a for a in triggered_anomalies
        if a.severity == "CRITICAL" or a.risk_score >= 80.0 or a.anomaly_type == "BURST_EXFILTRATION"
    ]

    if critical_triggers or max_risk >= 80.0:
        primary_trigger = critical_triggers[0] if critical_triggers else triggered_anomalies[0]
        reason = f"Autonomous policy containment: {primary_trigger.anomaly_type} detected with risk score {primary_trigger.risk_score:.1f}"
        
        client_ip = request.client.host if (request and request.client) else None
        quarantine_rec = quarantine_user(
            db=db,
            username=user.username,
            user_id=user.id,
            reason=reason,
            risk_score=max_risk,
            trigger_anomaly_id=primary_trigger.id,
            ip_address=client_ip,
            request=request,
        )
        return quarantine_rec

    return None
