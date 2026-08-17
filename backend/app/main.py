import hashlib
from datetime import datetime, timezone

from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="DDAS - Stage 1")

# Allow the Vite dev server to call this API during local development.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory "repository" of previously seen datasets.
# This is intentionally NOT a database yet — that's Stage 2.
# Resets every time the server restarts.
dataset_registry: list[dict] = []


class UploadResult(BaseModel):
    filename: str
    sha256: str
    size_bytes: int
    duplicate: bool
    existing: dict | None = None


def compute_sha256(file_bytes: bytes) -> str:
    """
    Compute the SHA-256 hash of raw file bytes.
    hashlib processes data in chunks internally, but since we already
    have the full byte string in memory, update() once is fine here.
    For very large files streamed from disk, you'd feed this in chunks
    instead of loading everything into memory at once.
    """
    hasher = hashlib.sha256()
    hasher.update(file_bytes)
    return hasher.hexdigest()


@app.post("/datasets/upload", response_model=UploadResult)
async def upload_dataset(file: UploadFile = File(...)):
    file_bytes = await file.read()
    file_hash = compute_sha256(file_bytes)

    # Check for an exact match against everything seen so far.
    existing = next(
        (entry for entry in dataset_registry if entry["sha256"] == file_hash),
        None,
    )

    if existing:
        return UploadResult(
            filename=file.filename,
            sha256=file_hash,
            size_bytes=len(file_bytes),
            duplicate=True,
            existing=existing,
        )

    # No match — register this as a new dataset.
    new_entry = {
        "filename": file.filename,
        "sha256": file_hash,
        "size_bytes": len(file_bytes),
        "uploaded_at": datetime.now(timezone.utc).isoformat(),
    }
    dataset_registry.append(new_entry)

    return UploadResult(
        filename=file.filename,
        sha256=file_hash,
        size_bytes=len(file_bytes),
        duplicate=False,
        existing=None,
    )


@app.get("/datasets")
async def list_datasets():
    """Debug endpoint — see everything registered so far."""
    return dataset_registry