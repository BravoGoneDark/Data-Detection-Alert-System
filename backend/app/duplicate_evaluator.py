# backend/app/duplicate_evaluator.py
from fastapi import Request
from sqlalchemy.orm import Session

from app.models import User, Dataset, LSHBucket
from app.authorization import can_user_access_classification
from app.audit_logger import record_audit_event
from app.storage import get_storage
from app.metadata_extractor import ExtractedMetadata
from app.similarity import compute_metadata_similarity, parse_db_columns
from app.tfidf_engine import (
    extract_text_content,
    tokenize,
    build_tfidf_vector,
    compute_cosine_similarity,
    get_shared_keywords,
)
from app.fuzzy_engine import (
    compute_simhash_64,
    compute_hamming_distance,
    compute_simhash_similarity,
)
from app.lsh_engine import extract_all_lsh_keys
from app.schemas import UploadResult, ExistingDataset, ScoreBreakdown
from app.routers.lsh import parse_keywords_json


def evaluate_duplicate_candidates(
    db: Session,
    filename: str,
    file_bytes: bytes,
    file_hash: str,
    classification: str,
    meta: ExtractedMetadata,
    raw_text: str,
    tfidf_vec: dict[str, float],
    top_kw: list[str],
    text_preview: str | None,
    simhash_hex: str,
    minhash_sig: list[int],
    current_user: User,
    request: Request,
) -> UploadResult | None:
    """
    Evaluates potential duplicates via LSH Candidate Retrieval and multi-tier priority matching:
    - Priority 1 (Tabular >= 2 cols): Structural Metadata & Schema overlap (>= 70.0%)
    - Priority 2 (Unstructured): Fuzzy SimHash match (Hamming distance <= 4 bits -> >= 93.75%)
    - Priority 3 (Unstructured): TF-IDF Content Cosine Similarity (>= 60.0%)
    - Priority 4: Fallback non-tabular metadata similarity (>= 70.0%)

    Returns an UploadResult if a duplicate is detected, or None if unique.
    """
    # 1. Generate LSH & inverted index bucket keys for incoming file
    incoming_lsh_keys = extract_all_lsh_keys(
        simhash_val=simhash_hex,
        minhash_sig=minhash_sig,
        top_keywords=top_kw,
        columns=meta.columns,
    )
    incoming_key_strings = [k[2] for k in incoming_lsh_keys]

    # 2. Sub-linear candidate lookup via indexed LSH bucket table
    lsh_cand_tuples = (
        db.query(LSHBucket.dataset_id)
        .filter(LSHBucket.bucket_key.in_(incoming_key_strings))
        .distinct()
        .all()
    )
    lsh_candidate_ids = {t[0] for t in lsh_cand_tuples}

    total_dataset_count = db.query(Dataset).count()
    if total_dataset_count <= 30 or not lsh_candidate_ids:
        candidates_to_check = db.query(Dataset).all()
    else:
        candidates_to_check = db.query(Dataset).filter(Dataset.id.in_(lsh_candidate_ids)).all()

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

    for candidate in candidates_to_check:
        if candidate.uploader_id != current_user.id and not can_user_access_classification(current_user, candidate.classification):
            continue

        # (A) Check SimHash Bitwise Hamming Distance
        cand_simhash = candidate.simhash
        if not cand_simhash and candidate.storage_path and storage.file_exists(candidate.storage_path):
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
            filename,
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

    has_schema = bool(len(meta.columns) >= 2)

    # Priority 1 (Tabular): High Metadata / Schema Similarity (>= 70.0%)
    if has_schema and best_meta_candidate and best_meta_score >= 70.0:
        record_audit_event(
            db,
            event_type="DUPLICATE_DETECTED",
            severity="WARNING",
            user=current_user,
            dataset=best_meta_candidate,
            classification=classification,
            request=request,
            details={
                "match_type": "METADATA_SIMILAR",
                "similarity_score": best_meta_score,
                "incoming_filename": filename,
                "canonical_id": best_meta_candidate.id,
                "score_breakdown": best_meta_breakdown,
            },
        )
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
            filename=filename,
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
        record_audit_event(
            db,
            event_type="DUPLICATE_DETECTED",
            severity="WARNING",
            user=current_user,
            dataset=best_fuzzy_candidate,
            classification=classification,
            request=request,
            details={
                "match_type": "FUZZY_SIMILAR",
                "similarity_score": best_fuzzy_score,
                "hamming_distance": best_hamming_dist,
                "incoming_filename": filename,
                "canonical_id": best_fuzzy_candidate.id,
            },
        )
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
            simhash=best_fuzzy_candidate.simhash,
            hamming_distance=best_hamming_dist,
        )
        return UploadResult(
            id=None,
            filename=filename,
            sha256=file_hash,
            size_bytes=len(file_bytes),
            duplicate=True,
            match_type="FUZZY_SIMILAR",
            similarity_score=best_fuzzy_score,
            hamming_distance=best_hamming_dist,
            simhash=simhash_hex,
            score_breakdown=ScoreBreakdown(
                filename_similarity=round(best_fuzzy_score, 1),
                schema_similarity=0.0,
                size_proximity=round(best_fuzzy_score, 1),
                row_proximity=None,
            ),
            classification=classification,
            extracted_columns=meta.columns,
            row_count=meta.row_count,
            col_count=meta.col_count,
            top_keywords=top_kw,
            shared_keywords=[],
            text_preview=text_preview,
            existing=existing_info,
        )

    # Priority 3 (Unstructured Text): High Content Overlap / Plagiarism via TF-IDF Cosine Similarity (>= 60.0%)
    if best_content_candidate and best_content_score >= 60.0:
        record_audit_event(
            db,
            event_type="DUPLICATE_DETECTED",
            severity="WARNING",
            user=current_user,
            dataset=best_content_candidate,
            classification=classification,
            request=request,
            details={
                "match_type": "CONTENT_SIMILAR",
                "similarity_score": best_content_score,
                "incoming_filename": filename,
                "canonical_id": best_content_candidate.id,
                "shared_keywords": best_shared_keywords,
            },
        )
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
            filename=filename,
            sha256=file_hash,
            size_bytes=len(file_bytes),
            duplicate=True,
            match_type="CONTENT_SIMILAR",
            similarity_score=best_content_score,
            hamming_distance=best_hamming_dist,
            simhash=simhash_hex,
            score_breakdown=ScoreBreakdown(
                filename_similarity=round(best_content_score, 1),
                schema_similarity=0.0,
                size_proximity=round(best_content_score, 1),
                row_proximity=None,
            ),
            classification=classification,
            extracted_columns=meta.columns,
            row_count=meta.row_count,
            col_count=meta.col_count,
            top_keywords=top_kw,
            shared_keywords=best_shared_keywords,
            text_preview=text_preview,
            existing=existing_info,
        )

    # Priority 4: Fallback non-tabular metadata similarity (>= 70.0%)
    if not has_schema and best_meta_candidate and best_meta_score >= 70.0:
        record_audit_event(
            db,
            event_type="DUPLICATE_DETECTED",
            severity="WARNING",
            user=current_user,
            dataset=best_meta_candidate,
            classification=classification,
            request=request,
            details={
                "match_type": "METADATA_SIMILAR",
                "similarity_score": best_meta_score,
                "incoming_filename": filename,
                "canonical_id": best_meta_candidate.id,
                "score_breakdown": best_meta_breakdown,
            },
        )
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
            filename=filename,
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

    return None
