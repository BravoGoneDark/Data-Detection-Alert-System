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

    student_role = db.query(Role).filter(Role.name == "STUDENT").first()
    if student_role is None:
        raise HTTPException(status_code=500, detail="Default role not configured")

    user = User(
        username=payload.username,
        email=payload.email,
        hashed_password=hash_password(payload.password),
        role_id=student_role.id,
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
        details={"role": "STUDENT", "email": payload.email},
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

    return user