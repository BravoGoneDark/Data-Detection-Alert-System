# backend/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.auth import router as auth_router
from app.routers.datasets import router as datasets_router
from app.routers.lsh import router as lsh_router
from app.routers.audit import router as audit_router
from app.routers.anomalies import router as anomalies_router
from app.routers.quarantine import router as quarantine_router
from app.routers.webhooks import router as webhooks_router
from app.routers.tasks import router as tasks_router
from app.routers.redis_admin import router as redis_admin_router
from app.routers.users_admin import router as users_admin_router

app = FastAPI(
    title="DDAS - Data Detection Alert System",
    description="Secure Data Download Duplication, Forensic Audit Ledger, Anomaly Detection & Policy Quarantine System",
    version="1.0.0",
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "http://localhost:80",
        "http://localhost",
    ],
    allow_origin_regex=r"https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Modular Routers
app.include_router(auth_router)
app.include_router(datasets_router)
app.include_router(lsh_router)
app.include_router(audit_router)
app.include_router(anomalies_router)
app.include_router(quarantine_router)
app.include_router(webhooks_router)
app.include_router(tasks_router)
app.include_router(redis_admin_router)
app.include_router(users_admin_router)


@app.on_event("startup")
def ensure_admin_and_roles_initialized():
    """
    Ensures that default security roles and the primary Administrator accounts
    (Pratyush & admin) are seeded/synchronized with known credentials upon deployment startup.
    """
    from app.database import SessionLocal
    from app.models import Role, User
    from app.security import hash_password
    db = SessionLocal()
    try:
        admin_role = db.query(Role).filter(Role.name == "ADMIN").first()
        if admin_role:
            # 1. Initialize / Synchronize Pratyush Administrator Account
            from sqlalchemy import or_
            pratyush = db.query(User).filter(
                or_(User.username.ilike("%pratyush%"), User.email.ilike("%pratyush%"))
            ).first()
            if not pratyush:
                pratyush = User(
                    username="Pratyush",
                    email="pratyushn312006@yahoo.com",
                    hashed_password=hash_password("Admin123!"),
                    role_id=admin_role.id,
                )
                db.add(pratyush)
                db.commit()
            else:
                pratyush.username = "Pratyush"
                if pratyush.role_id != admin_role.id:
                    pratyush.role_id = admin_role.id
                db.commit()

            # 2. Initialize / Synchronize Secondary admin Account
            admin_user = db.query(User).filter(User.username.ilike("admin")).first()
            if not admin_user:
                admin_user = User(
                    username="admin",
                    email="admin@ddas.sec",
                    hashed_password=hash_password("Admin123!"),
                    role_id=admin_role.id,
                )
                db.add(admin_user)
                db.commit()
            else:
                if admin_user.role_id != admin_role.id:
                    admin_user.role_id = admin_role.id
                    db.commit()
    except Exception as e:
        db.rollback()
        print("Startup admin synchronization error:", e)
    finally:
        db.close()


@app.get("/")
def root():
    return {
        "platform": "DDAS - Data Detection Alert System",
        "status": "online",
        "version": "1.0.0",
    }


@app.get("/health")
def healthcheck():
    return {
        "status": "healthy",
        "gateway": "online",
        "version": "1.0.0",
    }