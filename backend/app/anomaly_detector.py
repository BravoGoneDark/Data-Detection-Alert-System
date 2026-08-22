# backend/app/anomaly_detector.py
import json
import math
from datetime import datetime, timezone, timedelta
from typing import Optional, Any
from fastapi import Request
from sqlalchemy.orm import Session
from sqlalchemy import desc, func

from app.models import User, Dataset, AuditLog, AnomalyEvent
from app.audit_logger import record_audit_event


def get_user_recent_download_count(db: Session, user_id: int, window_seconds: int = 3600) -> int:
    """
    Returns count of dataset downloads initiated by the user within the sliding window.
    """
    cutoff = datetime.now(timezone.utc) - timedelta(seconds=window_seconds)
    count = (
        db.query(AuditLog)
        .filter(
            AuditLog.user_id == user_id,
            AuditLog.event_type == "DATASET_DOWNLOAD",
            AuditLog.timestamp >= cutoff,
        )
        .count()
    )
    return count


def compute_user_baseline_stats(db: Session, user_id: int) -> tuple[float, float]:
    """
    Calculates historical baseline mean (mu) and standard deviation (sigma) of hourly downloads.
    If historical data is sparse (< 3 distinct hourly buckets), returns default baseline (1.0, 1.0).
    """
    # Query download events older than 1 hour up to 30 days
    cutoff_recent = datetime.now(timezone.utc) - timedelta(hours=1)
    cutoff_history = datetime.now(timezone.utc) - timedelta(days=30)

    download_logs = (
        db.query(AuditLog.timestamp)
        .filter(
            AuditLog.user_id == user_id,
            AuditLog.event_type == "DATASET_DOWNLOAD",
            AuditLog.timestamp >= cutoff_history,
            AuditLog.timestamp < cutoff_recent,
        )
        .all()
    )

    if len(download_logs) < 3:
        # Default baseline for cold start
        return 1.0, 1.0

    # Bucket downloads by hour (YYYY-MM-DD-HH)
    hourly_buckets: dict[str, int] = {}
    for (ts,) in download_logs:
        bucket_key = ts.strftime("%Y-%m-%d-%H")
        hourly_buckets[bucket_key] = hourly_buckets.get(bucket_key, 0) + 1

    counts = list(hourly_buckets.values())
    if len(counts) < 2:
        return float(counts[0]), 1.0

    mu = sum(counts) / len(counts)
    variance = sum((x - mu) ** 2 for x in counts) / (len(counts) - 1)
    sigma = max(1.0, math.sqrt(variance))

    return round(mu, 2), round(sigma, 2)


def calculate_z_score(current_count: int, mu: float, sigma: float) -> float:
    """Calculates standardized statistical Z-Score: Z = (x - mu) / sigma."""
    if sigma <= 0:
        sigma = 1.0
    z = (current_count - mu) / sigma
    return round(max(0.0, z), 2)


def detect_download_burst(db: Session, user_id: int) -> tuple[bool, int, str]:
    """
    Checks for high-velocity burst activity:
    - 30-second window: >= 4 downloads (velocity spike)
    - 5-minute window: >= 12 downloads (bulk exfiltration)
    """
    # 30-second window
    count_30s = get_user_recent_download_count(db, user_id, window_seconds=30)
    if count_30s >= 4:
        return True, count_30s, "HIGH_VELOCITY_BURST_30S"

    # 5-minute window
    count_300s = get_user_recent_download_count(db, user_id, window_seconds=300)
    if count_300s >= 12:
        return True, count_300s, "BULK_EXFILTRATION_5M"

    return False, count_30s, "NORMAL"


def detect_off_hours_access(dt: datetime | None = None) -> tuple[bool, int]:
    """
    Flags downloads occurring in atypical off-hours (23:00 to 05:00 UTC).
    """
    if dt is None:
        dt = datetime.now(timezone.utc)
    hour = dt.hour
    is_off_hours = (hour >= 23 or hour <= 5)
    return is_off_hours, hour


def detect_classification_drift(db: Session, user_id: int, incoming_classification: str) -> tuple[bool, str]:
    """
    Detects sudden shift from PUBLIC/INTERNAL downloads to RESTRICTED/CONFIDENTIAL data.
    """
    target_cls = (incoming_classification or "INTERNAL").upper()
    if target_cls not in ["RESTRICTED", "CONFIDENTIAL"]:
        return False, "STANDARD"

    past_downloads = (
        db.query(AuditLog.classification)
        .filter(
            AuditLog.user_id == user_id,
            AuditLog.event_type == "DATASET_DOWNLOAD",
        )
        .limit(20)
        .all()
    )

    if len(past_downloads) >= 5:
        sensitive_count = sum(
            1 for (cls,) in past_downloads
            if (cls or "").upper() in ["RESTRICTED", "CONFIDENTIAL"]
        )
        if sensitive_count == 0:
            return True, f"FIRST_TIME_SENSITIVE_ACCESS ({target_cls})"

    return False, "STANDARD"


def record_anomaly_event(
    db: Session,
    user: User,
    dataset: Optional[Dataset],
    anomaly_type: str,
    severity: str,
    z_score: Optional[float],
    risk_score: float,
    details: dict[str, Any],
) -> AnomalyEvent:
    """
    Persists an anomaly incident to PostgreSQL table `anomaly_events`.
    """
    event = AnomalyEvent(
        user_id=user.id,
        username=user.username,
        dataset_id=dataset.id if dataset else None,
        dataset_filename=dataset.filename if dataset else None,
        anomaly_type=anomaly_type,
        severity=severity,
        z_score=z_score,
        risk_score=round(risk_score, 1),
        status="ACTIVE",
        details_json=json.dumps(details),
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    return event


def evaluate_download_anomaly(
    db: Session,
    user: User,
    dataset: Dataset,
    request: Optional[Request] = None,
) -> list[AnomalyEvent]:
    """
    Comprehensive Behavioral & Statistical Anomaly Evaluator:
    Runs on every dataset download transaction.
    """
    triggered_anomalies: list[AnomalyEvent] = []

    # 1. Rolling 1-Hour Z-Score Evaluation
    current_hourly_downloads = get_user_recent_download_count(db, user.id, window_seconds=3600)
    mu, sigma = compute_user_baseline_stats(db, user.id)
    z_val = calculate_z_score(current_hourly_downloads, mu, sigma)

    if z_val >= 3.0:
        severity = "CRITICAL" if z_val >= 5.0 else "HIGH"
        risk_score = min(100.0, 50.0 + (z_val * 10.0))
        details = {
            "z_score": z_val,
            "current_hourly_downloads": current_hourly_downloads,
            "baseline_mean_mu": mu,
            "baseline_sigma": sigma,
            "threshold": 3.0,
            "message": f"User download rate ({current_hourly_downloads}/hr) exceeded statistical threshold (Z={z_val:.1f} >= 3.0)",
        }
        event = record_anomaly_event(
            db=db,
            user=user,
            dataset=dataset,
            anomaly_type="Z_SCORE_SPIKE",
            severity=severity,
            z_score=z_val,
            risk_score=risk_score,
            details=details,
        )
        triggered_anomalies.append(event)

    # 2. High-Velocity Burst / Scraping Detection
    is_burst, burst_count, burst_type = detect_download_burst(db, user.id)
    if is_burst:
        severity = "CRITICAL" if burst_type == "HIGH_VELOCITY_BURST_30S" else "HIGH"
        details = {
            "burst_type": burst_type,
            "burst_count": burst_count,
            "window": "30s" if "30S" in burst_type else "5m",
            "message": f"High-velocity download surge detected: {burst_count} files retrieved in rapid succession",
        }
        event = record_anomaly_event(
            db=db,
            user=user,
            dataset=dataset,
            anomaly_type="BURST_EXFILTRATION",
            severity=severity,
            z_score=z_val if z_val >= 2.0 else None,
            risk_score=85.0 if severity == "CRITICAL" else 70.0,
            details=details,
        )
        triggered_anomalies.append(event)

    # 3. Off-Hours Temporal Anomaly
    is_off_hours, hour_utc = detect_off_hours_access()
    if is_off_hours and current_hourly_downloads >= 2:
        details = {
            "access_hour_utc": hour_utc,
            "hourly_volume": current_hourly_downloads,
            "message": f"Off-hours download activity detected at {hour_utc:02d}:00 UTC",
        }
        event = record_anomaly_event(
            db=db,
            user=user,
            dataset=dataset,
            anomaly_type="OFF_HOURS_ACCESS",
            severity="MEDIUM",
            z_score=z_val if z_val > 1.0 else None,
            risk_score=55.0,
            details=details,
        )
        triggered_anomalies.append(event)

    # 4. Classification Sensitivity Drift
    is_drift, drift_reason = detect_classification_drift(db, user.id, dataset.classification)
    if is_drift:
        details = {
            "classification": dataset.classification,
            "drift_type": drift_reason,
            "message": f"Atypical access to high-clearance data: {dataset.classification}",
        }
        event = record_anomaly_event(
            db=db,
            user=user,
            dataset=dataset,
            anomaly_type="CLASSIFICATION_DRIFT",
            severity="HIGH" if dataset.classification == "CONFIDENTIAL" else "MEDIUM",
            z_score=None,
            risk_score=65.0,
            details=details,
        )
        triggered_anomalies.append(event)

    return triggered_anomalies
