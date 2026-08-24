# backend/app/async_uploader.py
"""
DDAS Asynchronous Background Upload Worker.
Executes multi-stage feature extraction, TF-IDF vectorization, SimHash/MinHash
fingerprinting, LSH candidate pruning, CAS storage, and PostgreSQL indexing in
the background worker pool with fine-grained milestone telemetry.
"""
import hashlib
import json
import logging
from typing import Dict, Any, Optional

from app.database import SessionLocal
from app.models import Dataset, User
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
from app.task_queue import update_task_progress, is_task_cancelled
from app.redis_client import delete_cache_pattern, delete_cache_key
from app.audit_logger import record_audit_event

logger = logging.getLogger("ddas.async_uploader")


def process_async_upload(
    task_id: str,
    filename: str,
    file_bytes: bytes,
    classification: str = "INTERNAL",
    description: Optional[str] = None,
    force: bool = False,
    user_id: Optional[int] = None,
    username: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Background worker execution routine for processing an uploaded dataset.
    Reports real-time progress percentages (0-100%) to Redis task registry.
    """
    db = SessionLocal()
    try:
        if is_task_cancelled(task_id):
            return {"cancelled": True}

        # Milestone 1: Hashing
        update_task_progress(task_id, 15, "Computing cryptographic SHA-256 checksum...")
        file_hash = hashlib.sha256(file_bytes).hexdigest()

        # Milestone 2: Schema & Metadata Extraction
        update_task_progress(task_id, 30, "Extracting schema and structural metadata...")
        meta: ExtractedMetadata = extract_metadata(filename, file_bytes)

        # Milestone 3: TF-IDF & Fuzzy Fingerprints
        update_task_progress(task_id, 50, "Generating TF-IDF vectors & 64-bit SimHash/MinHash fingerprints...")
        raw_text = extract_text_content(filename, file_bytes)
        tokens = tokenize(raw_text)
        tfidf_vec = build_tfidf_vector(tokens)
        top_kw = get_top_keywords(tfidf_vec, top_n=5)
        text_preview = raw_text[:400] + "..." if len(raw_text) > 400 else (raw_text if raw_text else None)

        simhash_int, simhash_hex = compute_simhash_64(raw_text if raw_text else filename)
        minhash_sig = compute_minhash(raw_text if raw_text else filename)

        if is_task_cancelled(task_id):
            return {"cancelled": True}

        # Milestone 4: Candidate Pruning & Similarity Evaluation
        update_task_progress(task_id, 70, "Scanning candidate pool via Locality-Sensitive Hashing...")
        user_obj = db.query(User).filter(User.id == user_id).first() if user_id else None

        existing_exact = db.query(Dataset).filter(Dataset.sha256 == file_hash).first()
        if existing_exact and not force:
            record_audit_event(
                db,
                event_type="DUPLICATE_DETECTED",
                severity="WARNING",
                user=user_obj,
                dataset=existing_exact,
                classification=existing_exact.classification,
                details={
                    "match_type": "EXACT",
                    "similarity_score": 100.0,
                    "incoming_filename": filename,
                    "canonical_id": existing_exact.id,
                },
            )
            return {
                "id": existing_exact.id,
                "filename": filename,
                "sha256": file_hash,
                "duplicate": True,
                "match_type": "EXACT",
                "similarity_score": 100.0,
                "existing_dataset": {
                    "id": existing_exact.id,
                    "filename": existing_exact.filename,
                    "sha256": existing_exact.sha256,
                    "size_bytes": existing_exact.size_bytes,
                },
            }

        if not force:
            dup_result = evaluate_duplicate_candidates(
                db=db,
                filename=filename,
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
                current_user=user_obj,
                request=None,
            )
            if dup_result:
                return dup_result.dict()

        # Milestone 5: CAS Storage & DB Persistence
        update_task_progress(task_id, 85, "Storing payload in Content-Addressable Storage (CAS)...")
        storage = get_storage()
        rel_path = storage.save_file(file_hash, file_bytes)

        clean_preview = text_preview.replace("\x00", "").replace("\u0000", "") if text_preview else None
        clean_desc = description.replace("\x00", "").replace("\u0000", "") if description else None
        clean_filename = filename.replace("\x00", "").replace("\u0000", "")
        clean_columns = [c.replace("\x00", "") for c in meta.columns] if meta.columns else None
        clean_top_kw = [k.replace("\x00", "") for k in top_kw] if top_kw else None

        columns_serialized = json.dumps(clean_columns) if clean_columns else None
        top_kw_serialized = json.dumps(clean_top_kw) if clean_top_kw else None
        minhash_serialized = json.dumps(minhash_sig)

        new_dataset = Dataset(
            filename=clean_filename,
            sha256=file_hash,
            size_bytes=len(file_bytes),
            classification=classification,
            description=clean_desc,
            storage_path=rel_path,
            mime_type=meta.mime_type,
            row_count=meta.row_count,
            col_count=meta.col_count,
            columns_json=columns_serialized,
            text_preview=clean_preview,
            top_keywords_json=top_kw_serialized,
            simhash=simhash_hex,
            minhash_json=minhash_serialized,
            uploader_id=user_id,
        )

        db.add(new_dataset)
        db.commit()
        db.refresh(new_dataset)

        # Milestone 6: LSH Bucket Partitioning
        update_task_progress(task_id, 95, "Registering multi-band LSH partition buckets...")
        index_dataset_lsh_buckets(
            db=db,
            dataset_id=new_dataset.id,
            simhash_val=simhash_hex,
            minhash_sig=minhash_sig,
            top_keywords=clean_top_kw or [],
            columns=clean_columns or [],
        )

        # Invalidate Redis Caches
        delete_cache_pattern("ddas:cache:datasets*")
        delete_cache_key("ddas:cache:lsh:stats")

        # Record Audit Log
        record_audit_event(
            db,
            event_type="DATASET_UPLOAD",
            severity="INFO",
            user=user_obj,
            dataset=new_dataset,
            classification=classification,
            details={
                "filename": filename,
                "size_bytes": len(file_bytes),
                "async_task_id": task_id,
                "sha256": file_hash,
            },
        )

        return {
            "id": new_dataset.id,
            "filename": filename,
            "sha256": file_hash,
            "duplicate": False,
            "size_bytes": len(file_bytes),
            "classification": classification,
            "simhash": simhash_hex,
            "uploaded_at": str(new_dataset.uploaded_at),
        }
    finally:
        db.close()


def process_async_lsh_backfill(
    task_id: str,
    user_id: Optional[int] = None,
    username: Optional[str] = None,
) -> Dict[str, Any]:
    """Background worker routine for batch LSH re-indexing across all stored datasets."""
    from app.routers.lsh import parse_minhash_json, index_dataset_lsh_buckets
    db = SessionLocal()
    try:
        datasets = db.query(Dataset).all()
        total = len(datasets)
        update_task_progress(task_id, 5, f"Beginning LSH re-indexing across {total} datasets...")

        storage = get_storage()
        indexed_count = 0

        for idx, d in enumerate(datasets):
            if is_task_cancelled(task_id):
                return {"cancelled": True, "indexed_so_far": indexed_count}

            progress_pct = int(10 + (idx / max(1, total)) * 85)
            update_task_progress(task_id, progress_pct, f"Indexing dataset {idx + 1}/{total}: '{d.filename}'...")

            sim_val = d.simhash
            min_val = parse_minhash_json(d.minhash_sig if hasattr(d, 'minhash_sig') else getattr(d, 'minhash_json', None))
            top_kw = parse_keywords_json(d.top_keywords_json)
            cols = parse_db_columns(d.columns_json)

            if (not sim_val or not min_val) and d.storage_path and storage.file_exists(d.storage_path):
                bytes_data = storage.read_file(d.storage_path)
                text = extract_text_content(d.filename, bytes_data)
                if not sim_val:
                    _, sim_val = compute_simhash_64(text if text else d.filename)
                    d.simhash = sim_val
                if not min_val:
                    min_val = compute_minhash(text if text else d.filename)
                    if hasattr(d, 'minhash_sig'):
                        d.minhash_sig = json.dumps(min_val)
                    else:
                        d.minhash_json = json.dumps(min_val)
                db.commit()

            index_dataset_lsh_buckets(
                db,
                d.id,
                simhash_val=sim_val,
                minhash_sig=min_val,
                top_keywords=top_kw,
                columns=cols,
            )
            indexed_count += 1

        delete_cache_key("ddas:cache:lsh:stats")
        update_task_progress(task_id, 100, f"Successfully indexed {indexed_count} datasets.")
        return {
            "status": "success",
            "message": f"Successfully indexed LSH buckets for {indexed_count} datasets.",
            "datasets_indexed": indexed_count,
        }
    finally:
        db.close()
