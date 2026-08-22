# app/audit_logger.py

import json
from typing import Any, Optional
from fastapi import Request
from sqlalchemy.orm import Session

from app.models import AuditLog, User, Dataset


def extract_client_ip(request: Optional[Request]) -> Optional[str]:
    """
    Extracts the client IP address from proxy headers or direct socket connection.
    """
    if not request:
        return None
    
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        # First IP in the comma-separated chain is the client IP
        return forwarded.split(",")[0].strip()
    
    real_ip = request.headers.get("X-Real-IP")
    if real_ip:
        return real_ip.strip()
    
    if request.client and request.client.host:
        return request.client.host
    
    return None


def extract_user_agent(request: Optional[Request]) -> Optional[str]:
    """Extracts client User-Agent string from request headers."""
    if not request:
        return None
    return request.headers.get("User-Agent")


def record_audit_event(
    db: Session,
    event_type: str,
    severity: str = "INFO",
    user: Optional[User] = None,
    user_id: Optional[int] = None,
    username: Optional[str] = None,
    dataset: Optional[Dataset] = None,
    dataset_id: Optional[int] = None,
    dataset_filename: Optional[str] = None,
    classification: Optional[str] = None,
    request: Optional[Request] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
    details: Optional[Any] = None,
) -> AuditLog:
    """
    Safely creates and commits an immutable security audit record in PostgreSQL.
    
    Event Types:
      - 'USER_SIGNUP': New user registration
      - 'LOGIN_SUCCESS': Successful authentication
      - 'LOGIN_FAILED': Failed authentication attempt
      - 'DATASET_UPLOAD': New unique dataset registered in CAS
      - 'DUPLICATE_DETECTED': Upload blocked by duplicate detection
      - 'DUPLICATE_OVERRIDE': Forced upload registered as variant
      - 'DATASET_DOWNLOAD': Authorized dataset download
      - 'ACCESS_DENIED': 403 Clearance or RBAC access violation
      - 'LSH_BACKFILL': Locality-Sensitive Hashing backfill executed
      
    Severity Levels:
      - 'INFO': Standard legitimate operations
      - 'WARNING': Suspicious events, duplicate collisions, failed logins
      - 'CRITICAL': Security clearance violations, unauthorized exfiltration attempts
    """
    u_id = user.id if user else user_id
    u_name = user.username if user else username

    d_id = dataset.id if dataset else dataset_id
    d_filename = dataset.filename if dataset else dataset_filename
    cls = classification or (dataset.classification if dataset else None)

    ip = ip_address or extract_client_ip(request)
    ua = user_agent or extract_user_agent(request)

    if details is not None and not isinstance(details, str):
        try:
            details_str = json.dumps(details)
        except Exception:
            details_str = str(details)
    else:
        details_str = details

    log_entry = AuditLog(
        user_id=u_id,
        username=u_name,
        event_type=event_type,
        severity=severity.upper(),
        dataset_id=d_id,
        dataset_filename=d_filename,
        classification=cls,
        ip_address=ip,
        user_agent=ua,
        action_details=details_str,
    )
    
    db.add(log_entry)
    db.commit()
    db.refresh(log_entry)
    return log_entry
