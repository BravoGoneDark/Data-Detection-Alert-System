# backend/app/routers/users_admin.py
"""
DDAS User & Role Management Router.
Provides administrative endpoints to list system users, inspect security posture,
and dynamically promote or demote roles with immutable SIEM audit event emission.
"""
import logging
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models import User, Role, Dataset, QuarantineRecord, AuditLog
from app.authorization import require_permission
from app.audit_logger import record_audit_event
from app.quarantine import is_user_quarantined

logger = logging.getLogger("ddas.users_admin")
router = APIRouter(prefix="/admin/users", tags=["Users Admin"])


class UserDirectoryItem(BaseModel):
    id: int
    username: str
    email: str
    role: str
    role_id: int
    created_at: Optional[datetime] = None
    dataset_count: int = 0
    is_quarantined: bool = False
    quarantine_risk: Optional[float] = None


class UserDirectoryOut(BaseModel):
    users: List[UserDirectoryItem]
    total: int
    role_counts: dict


class ChangeRoleRequest(BaseModel):
    role_name: str  # "ADMIN", "FACULTY", "RESEARCHER", "STUDENT", "GUEST"


class ChangeRoleOut(BaseModel):
    id: int
    username: str
    previous_role: str
    new_role: str
    message: str


@router.get("", response_model=UserDirectoryOut)
def list_system_users(
    search: Optional[str] = None,
    role_filter: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("user:manage")),
):
    """
    Returns the complete directory of registered users with dataset counts,
    assigned roles, and active quarantine containment status.
    """
    query = db.query(User)

    if search:
        s = f"%{search.strip()}%"
        query = query.filter(User.username.ilike(s) | User.email.ilike(s))

    if role_filter:
        query = query.join(Role).filter(Role.name == role_filter.upper())

    users = query.order_by(User.id.asc()).all()

    # Preload dataset counts
    dataset_counts_raw = (
        db.query(Dataset.uploader_id, func.count(Dataset.id))
        .group_by(Dataset.uploader_id)
        .all()
    )
    dataset_count_map = {row[0]: row[1] for row in dataset_counts_raw if row[0] is not None}

    # Preload active quarantines
    active_quarantines = (
        db.query(QuarantineRecord)
        .filter(QuarantineRecord.status == "ACTIVE")
        .all()
    )
    quarantine_map = {q.username.lower(): q.risk_score for q in active_quarantines}

    # Role counts breakdown
    all_users = db.query(User).all()
    role_counts = {}
    for u in all_users:
        r_name = u.role.name if u.role else "UNKNOWN"
        role_counts[r_name] = role_counts.get(r_name, 0) + 1

    items = []
    for u in users:
        # Self-healing database normalization if username was saved as email address
        if u.username and "@" in u.username:
            if "pratyush" in u.username.lower() or "pratyush" in u.email.lower():
                u.username = "Pratyush"
                db.commit()
            elif "carnage" in u.username.lower() or "carnage" in u.email.lower():
                u.username = "Carnage"
                db.commit()
            else:
                u.username = u.username.split("@")[0]
                db.commit()

        r_name = u.role.name if u.role else "STUDENT"
        u_count = dataset_count_map.get(u.id, 0)
        q_risk = quarantine_map.get(u.username.lower())
        items.append(
            UserDirectoryItem(
                id=u.id,
                username=u.username,
                email=u.email,
                role=r_name,
                role_id=u.role_id,
                created_at=u.created_at,
                dataset_count=u_count,
                is_quarantined=q_risk is not None,
                quarantine_risk=q_risk,
            )
        )

    return UserDirectoryOut(
        users=items,
        total=len(items),
        role_counts=role_counts,
    )


@router.post("/{user_id}/role", response_model=ChangeRoleOut)
def change_user_role(
    user_id: int,
    payload: ChangeRoleRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("user:manage")),
):
    """
    Promotes or demotes a target user account to a designated role.
    Emits an immutable SIEM forensic audit event for compliance tracking.
    """
    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="Target user not found")

    target_role = db.query(Role).filter(Role.name == payload.role_name.upper()).first()
    if not target_role:
        raise HTTPException(
            status_code=400,
            detail=f"Role '{payload.role_name}' does not exist. Available: ADMIN, FACULTY, RESEARCHER, STUDENT, GUEST",
        )

    previous_role_name = target_user.role.name if target_user.role else "UNKNOWN"

    target_user.role = target_role
    target_user.role_id = target_role.id
    db.commit()
    db.refresh(target_user)

    # Emit SIEM audit log
    record_audit_event(
        db=db,
        event_type="USER_ROLE_CHANGED",
        severity="INFO" if target_role.name != "ADMIN" else "WARNING",
        user_id=current_user.id,
        username=current_user.username,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
        details={
            "target_user_id": target_user.id,
            "target_username": target_user.username,
            "previous_role": previous_role_name,
            "new_role": target_role.name,
            "promoted_by": current_user.username,
        },
    )

    logger.info(
        f"Admin '{current_user.username}' changed role for user '{target_user.username}' "
        f"from '{previous_role_name}' to '{target_role.name}'."
    )

    return ChangeRoleOut(
        id=target_user.id,
        username=target_user.username,
        previous_role=previous_role_name,
        new_role=target_role.name,
        message=f"User '{target_user.username}' role successfully changed to '{target_role.name}'.",
    )
