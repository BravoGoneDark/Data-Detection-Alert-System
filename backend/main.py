import hashlib
from datetime import datetime, timezone
from app.auth import router as auth_router, get_current_user
from app.models import User, Dataset
from fastapi import FastAPI, UploadFile, File, Form, Depends, HTTPException
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.authorization import require_permission, can_user_access_classification
from app.storage import get_storage

app = FastAPI(title="DDAS - Data Duplicate Analysis System")

app.include_router(auth_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ExistingDataset(BaseModel):
    id: int
    filename: str
    sha256: str
    size_bytes: int
    uploaded_at: datetime
    classification: str | None = "INTERNAL"
    uploader_username: str | None = None
    download_count: int = 0
    description: str | None = None

    class Config:
        from_attributes = True


class UploadResult(BaseModel):
    id: int | None = None
    filename: str
    sha256: str
    size_bytes: int
    duplicate: bool
    classification: str | None = None
    existing: ExistingDataset | None = None


class DatasetOut(BaseModel):
    id: int
    filename: str
    sha256: str
    size_bytes: int
    uploaded_at: datetime
    classification: str | None = "INTERNAL"
    uploader_username: str | None = None
    download_count: int = 0
    description: str | None = None

    class Config:
        from_attributes = True


def compute_sha256(file_bytes: bytes) -> str:
    hasher = hashlib.sha256()
    hasher.update(file_bytes)
    return hasher.hexdigest()


@app.post("/datasets/upload", response_model=UploadResult)
async def upload_dataset(
    file: UploadFile = File(...),
    classification: str = Form("INTERNAL"),
    description: str | None = Form(None),
    force: bool = Form(False),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("dataset:upload")),
):
    file_bytes = await file.read()
    file_hash = compute_sha256(file_bytes)

    # Check if duplicate exists
    existing = db.query(Dataset).filter(Dataset.sha256 == file_hash).first()

    if existing and not force:
        uploader_name = existing.uploader.username if existing.uploader else "System"
        existing_info = ExistingDataset(
            id=existing.id,
            filename=existing.filename,
            sha256=existing.sha256,
            size_bytes=existing.size_bytes,
            uploaded_at=existing.uploaded_at,
            classification=existing.classification or "INTERNAL",
            uploader_username=uploader_name,
            download_count=existing.download_count,
            description=existing.description,
        )
        return UploadResult(
            id=None,
            filename=file.filename,
            sha256=file_hash,
            size_bytes=len(file_bytes),
            duplicate=True,
            classification=classification,
            existing=existing_info,
        )

    # Save to Content-Addressable Storage (CAS)
    storage = get_storage()
    storage_path = storage.save_file(file_hash, file_bytes)

    # Insert dataset record into Postgres
    new_dataset = Dataset(
        filename=file.filename,
        sha256=file_hash,
        size_bytes=len(file_bytes),
        classification=classification.upper() if classification else "INTERNAL",
        description=description,
        storage_path=storage_path,
        uploader_id=current_user.id,
        download_count=0,
    )
    db.add(new_dataset)
    db.commit()
    db.refresh(new_dataset)

    return UploadResult(
        id=new_dataset.id,
        filename=new_dataset.filename,
        sha256=new_dataset.sha256,
        size_bytes=new_dataset.size_bytes,
        duplicate=bool(existing),  # true if force uploaded alias, false if first unique
        classification=new_dataset.classification,
        existing=None,
    )


@app.get("/datasets", response_model=list[DatasetOut])
async def list_datasets(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("dataset:view")),
):
    """List datasets accessible to the current user based on classification clearance."""
    all_datasets = db.query(Dataset).order_by(Dataset.uploaded_at.desc()).all()
    results = []
    for d in all_datasets:
        if can_user_access_classification(current_user, d.classification):
            results.append(
                DatasetOut(
                    id=d.id,
                    filename=d.filename,
                    sha256=d.sha256,
                    size_bytes=d.size_bytes,
                    uploaded_at=d.uploaded_at,
                    classification=d.classification or "INTERNAL",
                    uploader_username=d.uploader.username if d.uploader else "System",
                    download_count=d.download_count,
                    description=d.description,
                )
            )
    return results


@app.get("/datasets/{dataset_id}/download")
async def download_dataset(
    dataset_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("dataset:download")),
):
    """Download dataset file bytes after enforcing RBAC permission and classification clearance."""
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    if not can_user_access_classification(current_user, dataset.classification):
        raise HTTPException(
            status_code=403,
            detail=f"Access denied: clearance level insufficient for {dataset.classification} data",
        )

    if not dataset.storage_path:
        raise HTTPException(
            status_code=404,
            detail="Dataset storage path is missing or file was uploaded in legacy mode",
        )

    storage = get_storage()
    if not storage.file_exists(dataset.storage_path):
        raise HTTPException(
            status_code=404,
            detail="Physical file not found in storage",
        )

    # Increment download counter
    dataset.download_count += 1
    db.commit()

    file_path = storage.get_file_path(dataset.storage_path)
    return FileResponse(
        path=file_path,
        filename=dataset.filename,
        media_type="application/octet-stream",
    )