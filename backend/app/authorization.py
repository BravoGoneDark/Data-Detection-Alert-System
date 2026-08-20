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
    return any(p.name == permission for p in user.role.permissions)


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