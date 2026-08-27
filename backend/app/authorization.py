# app/authorization.py

from fastapi import Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User
from app.auth import get_current_user


def user_has_permission(user: User, permission: str) -> bool:
    """Check whether the user's role grants the named permission."""
    if user.role is None:
        return False
    if user.role.name == "ADMIN":
        return True
    return any(p.name == permission for p in user.role.permissions)


# Classification hierarchy: PUBLIC (0) < INTERNAL (1) < RESTRICTED (2) < CONFIDENTIAL (3)
CLASSIFICATION_LEVELS = {
    "PUBLIC": 0,
    "INTERNAL": 1,
    "RESTRICTED": 2,
    "CONFIDENTIAL": 3,
}

# Maximum classification clearance allowed per role
ROLE_CLASSIFICATION_CLEARANCE = {
    "ADMIN": 3,        # PUBLIC, INTERNAL, RESTRICTED, CONFIDENTIAL
    "FACULTY": 2,      # PUBLIC, INTERNAL, RESTRICTED
    "RESEARCHER": 2,   # PUBLIC, INTERNAL, RESTRICTED
    "STUDENT": 1,      # PUBLIC, INTERNAL
    "GUEST": 0,        # PUBLIC only
}


def can_user_access_classification(user: User, classification: str | None) -> bool:
    """Checks whether the user's role has security clearance for the given classification."""
    if not classification:
        classification = "INTERNAL"
    classification = classification.upper()
    req_level = CLASSIFICATION_LEVELS.get(classification, 1)

    role_name = user.role.name if user.role else "GUEST"
    user_clearance = ROLE_CLASSIFICATION_CLEARANCE.get(role_name, 0)

    return user_clearance >= req_level


def require_permission(permission: str):
    """
    Dependency factory. Returns a FastAPI dependency that:
    1. Resolves the current authenticated user (delegates to get_current_user)
    2. Checks whether their role grants `permission`
    3. Raises 403 if not, otherwise returns the user — so routes can use
       it as a drop-in replacement for get_current_user.
    """
    def checker(current_user: User = Depends(get_current_user)) -> User:
        if not user_has_permission(current_user, permission):
            raise HTTPException(
                status_code=403,
                detail=f"Missing required permission: {permission}",
            )
        return current_user

    return checker