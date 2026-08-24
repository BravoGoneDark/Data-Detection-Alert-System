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