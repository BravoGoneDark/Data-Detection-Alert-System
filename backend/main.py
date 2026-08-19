import hashlib
from datetime import datetime, timezone
from app.auth import router as auth_router, get_current_user
from app.models import User
from fastapi import FastAPI, UploadFile, File, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Dataset

app = FastAPI(title="DDAS - Stage 2")

app.include_router(auth_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class ExistingDataset(BaseModel):
    filename: str
    sha256: str
    size_bytes: int
    uploaded_at: datetime

    class Config:
        from_attributes = True  # lets Pydantic read SQLAlchemy model attributes directly


class UploadResult(BaseModel):
    filename: str
    sha256: str
    size_bytes: int
    duplicate: bool
    existing: ExistingDataset | None = None


def compute_sha256(file_bytes: bytes) -> str:
    hasher = hashlib.sha256()
    hasher.update(file_bytes)
    return hasher.hexdigest()


@app.post("/datasets/upload", response_model=UploadResult)
async def upload_dataset(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):


    file_bytes = await file.read()
    file_hash = compute_sha256(file_bytes)
    # Query Postgres for an existing row with this hash.
    # This uses the unique index on sha256 — a fast lookup, not a scan.
    existing = db.query(Dataset).filter(Dataset.sha256 == file_hash).first()

    if existing:
        return UploadResult(
            filename=file.filename,
            sha256=file_hash,
            size_bytes=len(file_bytes),
            duplicate=True,
            existing=ExistingDataset.model_validate(existing),
        )

    # No match — insert a new row.
    new_dataset = Dataset(
        filename=file.filename,
        sha256=file_hash,
        size_bytes=len(file_bytes),
    )
    db.add(new_dataset)
    db.commit()
    db.refresh(new_dataset)  # pulls back the DB-generated id and uploaded_at

    return UploadResult(
        filename=file.filename,
        sha256=file_hash,
        size_bytes=len(file_bytes),
        duplicate=False,
        existing=None,
    )


@app.get("/datasets")
async def list_datasets(db: Session = Depends(get_db)):
    """Debug endpoint — see everything registered so far."""
    return db.query(Dataset).all()