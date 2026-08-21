import hashlib
import json
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
from app.metadata_extractor import extract_metadata, ExtractedMetadata
from app.similarity import compute_metadata_similarity, parse_db_columns
from app.tfidf_engine import (
    extract_text_content,
    tokenize,
    build_tfidf_vector,
    compute_cosine_similarity,
    get_top_keywords,
    get_shared_keywords,
)
from app.fuzzy_engine import (
    compute_simhash_64,
    compute_hamming_distance,
    compute_simhash_similarity,
    compute_minhash,
    compute_minhash_jaccard,
)

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


class ScoreBreakdown(BaseModel):
    filename_similarity: float
    schema_similarity: float
    size_proximity: float
    row_proximity: float | None = None


def parse_keywords_json(kw_json: str | None) -> list[str]:
    """Safely decodes stored JSON keywords array from the database."""
    if not kw_json:
        return []
    try:
        data = json.loads(kw_json)
        return data if isinstance(data, list) else []
    except Exception:
        return []


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
    columns: list[str] = []
    row_count: int | None = None
    col_count: int | None = None
    mime_type: str | None = None
    top_keywords: list[str] = []
    text_preview: str | None = None
    simhash: str | None = None
    hamming_distance: int | None = None

    class Config:
        from_attributes = True


class UploadResult(BaseModel):
    id: int | None = None
    filename: str
    sha256: str
    size_bytes: int
    duplicate: bool
    match_type: str = "UNIQUE"  # "UNIQUE", "EXACT", "FUZZY_SIMILAR", "CONTENT_SIMILAR", "METADATA_SIMILAR"
    similarity_score: float = 0.0
    hamming_distance: int | None = None
    simhash: str | None = None
    score_breakdown: ScoreBreakdown | None = None
    classification: str | None = None
    extracted_columns: list[str] = []
    row_count: int | None = None
    col_count: int | None = None
    top_keywords: list[str] = []
    shared_keywords: list[str] = []
    text_preview: str | None = None
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
    columns: list[str] = []
    row_count: int | None = None
    col_count: int | None = None
    mime_type: str | None = None
    top_keywords: list[str] = []
    text_preview: str | None = None
    simhash: str | None = None

    class Config:
        from_attributes = True


def compute_sha256(file_bytes: bytes) -> str:
    hasher = hashlib.sha256()
    hasher.update(file_bytes)
    return hasher.hexdigest()


def parse_keywords_json_legacy(json_str: str | None) -> list[str]:
    if not json_str:
        return []
    try:
        data = json.loads(json_str)
        return data if isinstance(data, list) else []
    except Exception:
        return []


@app.post("/datasets/upload", response_model=UploadResult)
async def upload_dataset(
    file: UploadFile = File(...),
    classification: str = Form("INTERNAL"),
    description: str | None = Form(None),
    force: bool = Form(False),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("dataset:upload")),
):
    """
    Handles dataset uploads with Content-Addressable Storage (CAS), schema/metadata
    extraction, TF-IDF vectorization, SimHash fuzzy bitwise fingerprinting, and
    multi-tier duplicate detection (EXACT vs FUZZY_SIMILAR vs CONTENT_SIMILAR vs METADATA_SIMILAR).
    """
    file_bytes = await file.read()
    file_hash = hashlib.sha256(file_bytes).hexdigest()

    # 1. Extract structural schema & row counts (CSV, JSON, Plaintext)
    meta: ExtractedMetadata = extract_metadata(file.filename, file_bytes)

    # 2. Extract text payload, TF-IDF vector, and 64-bit SimHash / MinHash fingerprints
    raw_text = extract_text_content(file.filename, file_bytes)
    tokens = tokenize(raw_text)
    tfidf_vec = build_tfidf_vector(tokens)
    top_kw = get_top_keywords(tfidf_vec, top_n=5)
    text_preview = raw_text[:400] + "..." if len(raw_text) > 400 else (raw_text if raw_text else None)

    simhash_int, simhash_hex = compute_simhash_64(raw_text if raw_text else file.filename)
    minhash_sig = compute_minhash(raw_text if raw_text else file.filename)

    # 3. Check for Tier 1 Exact Hash Collision (100% SHA-256 Match)
    existing_exact = db.query(Dataset).filter(Dataset.sha256 == file_hash).first()

    if existing_exact and not force:
        uploader_name = existing_exact.uploader.username if existing_exact.uploader else "System"
        existing_info = ExistingDataset(
            id=existing_exact.id,
            filename=existing_exact.filename,
            sha256=existing_exact.sha256,
            size_bytes=existing_exact.size_bytes,
            uploaded_at=existing_exact.uploaded_at,
            classification=existing_exact.classification or "INTERNAL",
            uploader_username=uploader_name,
            download_count=existing_exact.download_count,
            description=existing_exact.description,
            columns=parse_db_columns(existing_exact.columns_json),
            row_count=existing_exact.row_count,
            col_count=existing_exact.col_count,
            mime_type=existing_exact.mime_type,
            top_keywords=parse_keywords_json(existing_exact.top_keywords_json),
            text_preview=existing_exact.text_preview,
            simhash=existing_exact.simhash,
            hamming_distance=0,
        )
        return UploadResult(
            id=None,
            filename=file.filename,
            sha256=file_hash,
            size_bytes=len(file_bytes),
            duplicate=True,
            match_type="EXACT",
            similarity_score=100.0,
            hamming_distance=0,
            simhash=simhash_hex,
            score_breakdown=ScoreBreakdown(
                filename_similarity=100.0,
                schema_similarity=100.0,
                size_proximity=100.0,
                row_proximity=100.0,
            ),
            classification=classification,
            extracted_columns=meta.columns,
            row_count=meta.row_count,
            col_count=meta.col_count,
            top_keywords=top_kw,
            shared_keywords=top_kw,
            text_preview=text_preview,
            existing=existing_info,
        )

    # 4. Check for Fuzzy Fingerprint, Content Cosine, and Metadata Similarity
    if not force:
        all_candidates = db.query(Dataset).all()
        storage = get_storage()

        best_meta_candidate = None
        best_meta_score = 0.0
        best_meta_breakdown = None

        best_content_candidate = None
        best_content_score = 0.0
        best_shared_keywords = []

        best_fuzzy_candidate = None
        best_fuzzy_score = 0.0
        best_hamming_dist = 64

        for candidate in all_candidates:
            if candidate.uploader_id != current_user.id and not can_user_access_classification(current_user, candidate.classification):
                continue

            # (A) Check SimHash Bitwise Hamming Distance
            cand_simhash = candidate.simhash
            if not cand_simhash and candidate.storage_path and storage.file_exists(candidate.storage_path):
                # Lazy backfill SimHash for earlier datasets if missing
                c_bytes = storage.read_file(candidate.storage_path)
                c_text = extract_text_content(candidate.filename, c_bytes)
                _, cand_simhash = compute_simhash_64(c_text if c_text else candidate.filename)

            if cand_simhash:
                h_dist = compute_hamming_distance(simhash_hex, cand_simhash)
                f_score, _ = compute_simhash_similarity(simhash_hex, cand_simhash)
                if h_dist < best_hamming_dist:
                    best_hamming_dist = h_dist
                    best_fuzzy_score = f_score
                    best_fuzzy_candidate = candidate

            # (B) Check Structural / Metadata Similarity
            cand_cols = parse_db_columns(candidate.columns_json)
            meta_score, breakdown = compute_metadata_similarity(
                file.filename,
                meta,
                len(file_bytes),
                candidate.filename,
                cand_cols,
                candidate.row_count,
                candidate.size_bytes,
            )
            if meta_score > best_meta_score:
                best_meta_score = meta_score
                best_meta_candidate = candidate
                best_meta_breakdown = breakdown

            # (C) Check TF-IDF Cosine Similarity on Content
            if tfidf_vec and candidate.storage_path and storage.file_exists(candidate.storage_path):
                cand_bytes = storage.read_file(candidate.storage_path)
                cand_text = extract_text_content(candidate.filename, cand_bytes)
                cand_tokens = tokenize(cand_text)
                cand_vec = build_tfidf_vector(cand_tokens)

                cosine_sim = compute_cosine_similarity(tfidf_vec, cand_vec)
                if cosine_sim > best_content_score:
                    best_content_score = cosine_sim
                    best_content_candidate = candidate
                    best_shared_keywords = get_shared_keywords(tfidf_vec, cand_vec, top_n=6)

        # Tabular datasets with structured column schemas (>= 2 columns) prioritize Structural / Metadata Schema Matching
        has_schema = bool(len(meta.columns) >= 2 or (best_meta_candidate and len(parse_db_columns(best_meta_candidate.columns_json)) >= 2))

        # Priority 1 (Tabular): High Metadata / Schema Similarity (>= 70.0%)
        if has_schema and best_meta_candidate and best_meta_score >= 70.0:
            uploader_name = best_meta_candidate.uploader.username if best_meta_candidate.uploader else "System"
            existing_info = ExistingDataset(
                id=best_meta_candidate.id,
                filename=best_meta_candidate.filename,
                sha256=best_meta_candidate.sha256,
                size_bytes=best_meta_candidate.size_bytes,
                uploaded_at=best_meta_candidate.uploaded_at,
                classification=best_meta_candidate.classification or "INTERNAL",
                uploader_username=uploader_name,
                download_count=best_meta_candidate.download_count,
                description=best_meta_candidate.description,
                columns=parse_db_columns(best_meta_candidate.columns_json),
                row_count=best_meta_candidate.row_count,
                col_count=best_meta_candidate.col_count,
                mime_type=best_meta_candidate.mime_type,
                top_keywords=parse_keywords_json(best_meta_candidate.top_keywords_json),
                text_preview=best_meta_candidate.text_preview,
                simhash=best_meta_candidate.simhash,
                hamming_distance=best_hamming_dist,
            )
            return UploadResult(
                id=None,
                filename=file.filename,
                sha256=file_hash,
                size_bytes=len(file_bytes),
                duplicate=True,
                match_type="METADATA_SIMILAR",
                similarity_score=best_meta_score,
                hamming_distance=best_hamming_dist,
                simhash=simhash_hex,
                score_breakdown=ScoreBreakdown(**best_meta_breakdown),
                classification=classification,
                extracted_columns=meta.columns,
                row_count=meta.row_count,
                col_count=meta.col_count,
                top_keywords=top_kw,
                shared_keywords=[],
                text_preview=text_preview,
                existing=existing_info,
            )

        # Priority 2 (Unstructured Text): High Fuzzy SimHash Match (Hamming Distance <= 4 bits -> >= 93.7% bit match)
        if best_fuzzy_candidate and best_hamming_dist <= 4:
            uploader_name = best_fuzzy_candidate.uploader.username if best_fuzzy_candidate.uploader else "System"
            existing_info = ExistingDataset(
                id=best_fuzzy_candidate.id,
                filename=best_fuzzy_candidate.filename,
                sha256=best_fuzzy_candidate.sha256,
                size_bytes=best_fuzzy_candidate.size_bytes,
                uploaded_at=best_fuzzy_candidate.uploaded_at,
                classification=best_fuzzy_candidate.classification or "INTERNAL",
                uploader_username=uploader_name,
                download_count=best_fuzzy_candidate.download_count,
                description=best_fuzzy_candidate.description,
                columns=parse_db_columns(best_fuzzy_candidate.columns_json),
                row_count=best_fuzzy_candidate.row_count,
                col_count=best_fuzzy_candidate.col_count,
                mime_type=best_fuzzy_candidate.mime_type,
                top_keywords=parse_keywords_json(best_fuzzy_candidate.top_keywords_json),
                text_preview=best_fuzzy_candidate.text_preview,
                simhash=best_fuzzy_candidate.simhash or cand_simhash,
                hamming_distance=best_hamming_dist,
            )
            return UploadResult(
                id=None,
                filename=file.filename,
                sha256=file_hash,
                size_bytes=len(file_bytes),
                duplicate=True,
                match_type="FUZZY_SIMILAR",
                similarity_score=best_fuzzy_score,
                hamming_distance=best_hamming_dist,
                simhash=simhash_hex,
                score_breakdown=ScoreBreakdown(**(best_meta_breakdown or {
                    "filename_similarity": 0.0,
                    "schema_similarity": 0.0,
                    "size_proximity": 0.0,
                    "row_proximity": 0.0,
                })),
                classification=classification,
                extracted_columns=meta.columns,
                row_count=meta.row_count,
                col_count=meta.col_count,
                top_keywords=top_kw,
                shared_keywords=best_shared_keywords,
                text_preview=text_preview,
                existing=existing_info,
            )

        # Priority 3 (Unstructured Text): High Content Cosine Similarity (>= 60.0%) -> Plagiarism / Content Match
        if best_content_candidate and best_content_score >= 60.0:
            uploader_name = best_content_candidate.uploader.username if best_content_candidate.uploader else "System"
            existing_info = ExistingDataset(
                id=best_content_candidate.id,
                filename=best_content_candidate.filename,
                sha256=best_content_candidate.sha256,
                size_bytes=best_content_candidate.size_bytes,
                uploaded_at=best_content_candidate.uploaded_at,
                classification=best_content_candidate.classification or "INTERNAL",
                uploader_username=uploader_name,
                download_count=best_content_candidate.download_count,
                description=best_content_candidate.description,
                columns=parse_db_columns(best_content_candidate.columns_json),
                row_count=best_content_candidate.row_count,
                col_count=best_content_candidate.col_count,
                mime_type=best_content_candidate.mime_type,
                top_keywords=parse_keywords_json(best_content_candidate.top_keywords_json),
                text_preview=best_content_candidate.text_preview,
                simhash=best_content_candidate.simhash,
                hamming_distance=best_hamming_dist,
            )
            return UploadResult(
                id=None,
                filename=file.filename,
                sha256=file_hash,
                size_bytes=len(file_bytes),
                duplicate=True,
                match_type="CONTENT_SIMILAR",
                similarity_score=best_content_score,
                hamming_distance=best_hamming_dist,
                simhash=simhash_hex,
                score_breakdown=ScoreBreakdown(**(best_meta_breakdown or {
                    "filename_similarity": 0.0,
                    "schema_similarity": 0.0,
                    "size_proximity": 0.0,
                    "row_proximity": 0.0,
                })),
                classification=classification,
                extracted_columns=meta.columns,
                row_count=meta.row_count,
                col_count=meta.col_count,
                top_keywords=top_kw,
                shared_keywords=best_shared_keywords,
                text_preview=text_preview,
                existing=existing_info,
            )

        # Priority 4: Fallback Non-Tabular Metadata / Filename Similarity (>= 70.0%)
        if best_meta_candidate and best_meta_score >= 70.0:
            uploader_name = best_meta_candidate.uploader.username if best_meta_candidate.uploader else "System"
            existing_info = ExistingDataset(
                id=best_meta_candidate.id,
                filename=best_meta_candidate.filename,
                sha256=best_meta_candidate.sha256,
                size_bytes=best_meta_candidate.size_bytes,
                uploaded_at=best_meta_candidate.uploaded_at,
                classification=best_meta_candidate.classification or "INTERNAL",
                uploader_username=uploader_name,
                download_count=best_meta_candidate.download_count,
                description=best_meta_candidate.description,
                columns=parse_db_columns(best_meta_candidate.columns_json),
                row_count=best_meta_candidate.row_count,
                col_count=best_meta_candidate.col_count,
                mime_type=best_meta_candidate.mime_type,
                top_keywords=parse_keywords_json(best_meta_candidate.top_keywords_json),
                text_preview=best_meta_candidate.text_preview,
                simhash=best_meta_candidate.simhash,
                hamming_distance=best_hamming_dist,
            )
            return UploadResult(
                id=None,
                filename=file.filename,
                sha256=file_hash,
                size_bytes=len(file_bytes),
                duplicate=True,
                match_type="METADATA_SIMILAR",
                similarity_score=best_meta_score,
                hamming_distance=best_hamming_dist,
                simhash=simhash_hex,
                score_breakdown=ScoreBreakdown(**best_meta_breakdown),
                classification=classification,
                extracted_columns=meta.columns,
                row_count=meta.row_count,
                col_count=meta.col_count,
                top_keywords=top_kw,
                shared_keywords=[],
                text_preview=text_preview,
                existing=existing_info,
            )

    # 5. Save to Content-Addressable Storage (CAS)
    storage = get_storage()
    storage_path = storage.save_file(file_hash, file_bytes)

    # 6. Insert dataset record with metadata, TF-IDF keywords, and SimHash / MinHash into Postgres
    new_dataset = Dataset(
        filename=file.filename,
        sha256=file_hash,
        size_bytes=len(file_bytes),
        classification=classification.upper() if classification else "INTERNAL",
        description=description,
        storage_path=storage_path,
        uploader_id=current_user.id,
        download_count=0,
        columns_json=json.dumps(meta.columns) if meta.columns else None,
        row_count=meta.row_count,
        col_count=meta.col_count,
        mime_type=meta.mime_type,
        text_preview=text_preview,
        top_keywords_json=json.dumps(top_kw) if top_kw else None,
        simhash=simhash_hex,
        minhash_json=json.dumps(minhash_sig) if minhash_sig else None,
    )
    db.add(new_dataset)
    db.commit()
    db.refresh(new_dataset)

    return UploadResult(
        id=new_dataset.id,
        filename=new_dataset.filename,
        sha256=new_dataset.sha256,
        size_bytes=new_dataset.size_bytes,
        duplicate=False,
        match_type="UNIQUE",
        similarity_score=0.0,
        hamming_distance=None,
        simhash=simhash_hex,
        score_breakdown=None,
        classification=new_dataset.classification,
        extracted_columns=meta.columns,
        row_count=meta.row_count,
        col_count=meta.col_count,
        top_keywords=top_kw,
        shared_keywords=[],
        text_preview=text_preview,
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
                    columns=parse_db_columns(d.columns_json),
                    row_count=d.row_count,
                    col_count=d.col_count,
                    mime_type=d.mime_type,
                    top_keywords=parse_keywords_json(d.top_keywords_json),
                    text_preview=d.text_preview,
                    simhash=d.simhash,
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