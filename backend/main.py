# backend/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.auth import router as auth_router
from app.routers.datasets import router as datasets_router
from app.routers.lsh import router as lsh_router
from app.routers.audit import router as audit_router
from app.routers.anomalies import router as anomalies_router

app = FastAPI(
    title="DDAS - Data Detection Alert System",
    description="Secure Data Download Duplication, Forensic Audit Ledger & Anomaly Detection System",
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
    ],
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


@app.get("/")
def root():
    return {
        "platform": "DDAS - Data Detection Alert System",
        "status": "online",
        "version": "1.0.0",
    }