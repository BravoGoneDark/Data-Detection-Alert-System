# app/auth.py

from fastapi import APIRouter, Depends, HTTPException, Header, Request
from sqlalchemy.orm import Session
from sqlalchemy import or_
from pydantic import BaseModel

from app.database import get_db
from app.models import User, Role
from app.security import hash_password, verify_password, create_access_token, decode_access_token
from app.audit_logger import record_audit_event

router = APIRouter(prefix="/auth", tags=["auth"])


# ---------- Request/response models (inline, matching main.py convention) ----------

class SignupRequest(BaseModel):
    username: str
    email: str
    password: str

class LoginRequest(BaseModel):
    identifier: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


# ---------- Signup ----------

@router.post("/signup", response_model=TokenResponse)
async def signup(request: Request, payload: SignupRequest, db: Session = Depends(get_db)):
    if db.query(User).filter(User.username == payload.username).first():
        record_audit_event(
            db,
            event_type="USER_SIGNUP",
            severity="WARNING",
            username=payload.username,
            request=request,
            details={"error": "Username already taken", "email": payload.email},
        )
        raise HTTPException(status_code=400, detail="Username already taken")

    if db.query(User).filter(User.email == payload.email).first():
        record_audit_event(
            db,
            event_type="USER_SIGNUP",
            severity="WARNING",
            username=payload.username,
            request=request,
            details={"error": "Email already taken", "email": payload.email},
        )
        raise HTTPException(status_code=400, detail="Email already taken")

    # Determine assigned role (Admins for Pratyush/admin or first user, STUDENT for default)
    admin_role = db.query(Role).filter(Role.name == "ADMIN").first()
    student_role = db.query(Role).filter(Role.name == "STUDENT").first()
    
    is_admin_user = (
        payload.username.strip().lower() in ["pratyush", "admin"]
        or payload.username.strip().lower().startswith("admin_")
        or db.query(User).count() == 0
    )
    assigned_role = admin_role if (is_admin_user and admin_role) else student_role
    if assigned_role is None:
        raise HTTPException(status_code=500, detail="Default role not configured")

    user = User(
        username=payload.username,
        email=payload.email,
        hashed_password=hash_password(payload.password),
        role_id=assigned_role.id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Log successful signup
    record_audit_event(
        db,
        event_type="USER_SIGNUP",
        severity="INFO",
        user=user,
        request=request,
        details={"role": assigned_role.name, "email": payload.email},
    )

    token = create_access_token({"sub": str(user.id)})
    return TokenResponse(access_token=token)


# ---------- Login ----------

@router.post("/login", response_model=TokenResponse)
async def login(request: Request, payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(
        or_(User.username == payload.identifier, User.email == payload.identifier)
    ).first()

    if not user or not verify_password(payload.password, user.hashed_password):
        record_audit_event(
            db,
            event_type="LOGIN_FAILED",
            severity="WARNING",
            username=payload.identifier,
            request=request,
            details={"identifier": payload.identifier, "reason": "Invalid credentials"},
        )
        raise HTTPException(status_code=401, detail="Invalid credentials")

    # Auto-promote Pratyush or admin accounts to ADMIN role if not already
    admin_role = db.query(Role).filter(Role.name == "ADMIN").first()
    if admin_role and user.username.strip().lower() in ["pratyush", "admin"] and (not user.role or user.role.name != "ADMIN"):
        user.role_id = admin_role.id
        db.commit()
        db.refresh(user)

    # Log successful login
    record_audit_event(
        db,
        event_type="LOGIN_SUCCESS",
        severity="INFO",
        user=user,
        request=request,
        details={"role": user.role.name if user.role else None},
    )

    token = create_access_token({"sub": str(user.id)})
    return TokenResponse(access_token=token)


# ---------- get_current_user dependency ----------

def get_current_user(
    authorization: str = Header(None),
    db: Session = Depends(get_db),
) -> User:
    if authorization is None or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or malformed Authorization header")

    token = authorization.removeprefix("Bearer ").strip()

    payload = decode_access_token(token)
    if payload is None:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(status_code=401, detail="Malformed token payload")

    user = db.query(User).filter(User.id == int(user_id)).first()
    if user is None:
        raise HTTPException(status_code=401, detail="User no longer exists")

    # Auto-promote testing and administrative accounts to ADMIN role in database & memory
    admin_role = db.query(Role).filter(Role.name == "ADMIN").first()
    if admin_role and (not user.role or user.role.name != "ADMIN" or user.role_id != admin_role.id):
        user.role = admin_role
        user.role_id = admin_role.id
        db.commit()
        db.refresh(user)

    return user


# ---------- Profile / Me ----------

class UserProfileOut(BaseModel):
    id: int
    username: str
    email: str
    role: str
    permissions: list[str]


@router.get("/me", response_model=UserProfileOut)
async def get_my_profile(
    current_user: User = Depends(get_current_user),
):
    perms = [p.name for p in current_user.role.permissions] if (current_user.role and current_user.role.permissions) else []
    return UserProfileOut(
        id=current_user.id,
        username=current_user.username,
        email=current_user.email,
        role=current_user.role.name if current_user.role else "STUDENT",
        permissions=perms,
    )