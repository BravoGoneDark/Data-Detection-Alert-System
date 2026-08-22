# backend/app/routers/datasets.py
import hashlib
import json
from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException, Request
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, Dataset
from app.authorization import require_permission, can_user_access_classification
from app.audit_logger import record_audit_event
from app.storage import get_storage
from app.metadata_extractor import extract_metadata, ExtractedMetadata
from app.similarity import parse_db_columns
from app.tfidf_engine import (
    extract_text_content,
    tokenize,
    build_tfidf_vector,
    get_top_keywords,
)
from app.fuzzy_engine import (
    compute_simhash_64,
    compute_minhash,
)
from app.routers.lsh import index_dataset_lsh_buckets, parse_keywords_json
from app.duplicate_evaluator import evaluate_duplicate_candidates
from app.anomaly_detector import evaluate_download_anomaly
from app.schemas import (
    UploadResult,
    ExistingDataset,
    ScoreBreakdown,
    DatasetOut,
)

router = APIRouter(prefix="/datasets", tags=["Datasets"])


@router.post("/upload", response_model=UploadResult)
async def upload_dataset(
    request: Request,
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
        # Record duplicate alert in audit log
        record_audit_event(
            db,
            event_type="DUPLICATE_DETECTED",
            severity="WARNING",
            user=current_user,
            dataset=existing_exact,
            classification=existing_exact.classification,
            request=request,
            details={
                "match_type": "EXACT",
                "similarity_score": 100.0,
                "incoming_filename": file.filename,
                "canonical_id": existing_exact.id,
                "sha256": file_hash,
            },
        )
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

    # 4. Check for Fuzzy Fingerprint, Content Cosine, and Metadata Similarity via LSH Candidate Retrieval
    if not force:
        duplicate_result = evaluate_duplicate_candidates(
            db=db,
            filename=file.filename,
            file_bytes=file_bytes,
            file_hash=file_hash,
            classification=classification,
            meta=meta,
            raw_text=raw_text,
            tfidf_vec=tfidf_vec,
            top_kw=top_kw,
            text_preview=text_preview,
            simhash_hex=simhash_hex,
            minhash_sig=minhash_sig,
            current_user=current_user,
            request=request,
        )
        if duplicate_result:
            return duplicate_result

    # 5. Unique File or Forced Override: Store File in Content-Addressable Storage (CAS)
    storage = get_storage()
    rel_path = storage.save_file(file_hash, file_bytes)

    dataset = Dataset(
        filename=file.filename,
        sha256=file_hash,
        size_bytes=len(file_bytes),
        classification=classification,
        uploader_id=current_user.id,
        storage_path=rel_path,
        download_count=0,
        description=description,
        columns_json=json.dumps(meta.columns) if meta.columns else None,
        row_count=meta.row_count,
        col_count=meta.col_count,
        mime_type=meta.mime_type,
        top_keywords_json=json.dumps(top_kw) if top_kw else None,
        text_preview=text_preview,
        simhash=simhash_hex,
        minhash_json=json.dumps(minhash_sig) if minhash_sig else None,
    )
    db.add(dataset)
    db.commit()
    db.refresh(dataset)

    # Index LSH buckets for sub-linear retrieval
    index_dataset_lsh_buckets(
        db,
        dataset.id,
        simhash_val=simhash_hex,
        minhash_sig=minhash_sig,
        top_keywords=top_kw,
        columns=meta.columns,
    )

    # Record Audit Event
    audit_event = "DUPLICATE_OVERRIDE" if force else "DATASET_UPLOAD"
    audit_severity = "WARNING" if force else "INFO"
    record_audit_event(
        db,
        event_type=audit_event,
        severity=audit_severity,
        user=current_user,
        dataset=dataset,
        classification=classification,
        request=request,
        details={
            "filename": dataset.filename,
            "size_bytes": dataset.size_bytes,
            "classification": classification,
            "force_override": force,
        },
    )

    return UploadResult(
        id=dataset.id,
        filename=dataset.filename,
        sha256=dataset.sha256,
        size_bytes=dataset.size_bytes,
        duplicate=False,
        match_type="UNIQUE",
        similarity_score=0.0,
        hamming_distance=None,
        simhash=dataset.simhash,
        score_breakdown=None,
        classification=dataset.classification,
        extracted_columns=meta.columns,
        row_count=dataset.row_count,
        col_count=dataset.col_count,
        top_keywords=top_kw,
        shared_keywords=[],
        text_preview=text_preview,
        existing=None,
    )


@router.get("", response_model=list[DatasetOut])
async def list_datasets(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("dataset:view")),
):
    """List datasets accessible by current user based on RBAC clearance level."""
    datasets = db.query(Dataset).all()
    results = []
    for d in datasets:
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


@router.get("/{dataset_id}/download")
async def download_dataset(
    dataset_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("dataset:download")),
):
    """Download dataset file bytes after enforcing RBAC permission and classification clearance."""
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        record_audit_event(
            db,
            event_type="ACCESS_DENIED",
            severity="WARNING",
            user=current_user,
            dataset_id=dataset_id,
            request=request,
            details={"error": "Dataset not found", "requested_id": dataset_id},
        )
        raise HTTPException(status_code=404, detail="Dataset not found")

    if not can_user_access_classification(current_user, dataset.classification):
        cls_level = (dataset.classification or "INTERNAL").upper()
        severity = "CRITICAL" if cls_level in ["CONFIDENTIAL", "RESTRICTED"] else "WARNING"
        
        record_audit_event(
            db,
            event_type="ACCESS_DENIED",
            severity=severity,
            user=current_user,
            dataset=dataset,
            classification=dataset.classification,
            request=request,
            details={
                "reason": "Clearance level insufficient",
                "user_role": current_user.role.name if current_user.role else "GUEST",
                "required_classification": dataset.classification,
            },
        )
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

    # Log successful download in audit ledger
    record_audit_event(
        db,
        event_type="DATASET_DOWNLOAD",
        severity="INFO",
        user=current_user,
        dataset=dataset,
        classification=dataset.classification,
        request=request,
        details={
            "filename": dataset.filename,
            "size_bytes": dataset.size_bytes,
            "total_downloads": dataset.download_count,
        },
    )

    # Evaluate Statistical & Behavioral Download Anomalies (Z-Score, Burst, Off-Hours, Drift)
    evaluate_download_anomaly(db=db, user=current_user, dataset=dataset, request=request)

    file_path = storage.get_file_path(dataset.storage_path)
    return FileResponse(
        path=file_path,
        filename=dataset.filename,
        media_type="application/octet-stream",
    )
