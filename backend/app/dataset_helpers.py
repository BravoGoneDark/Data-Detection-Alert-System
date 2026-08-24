# backend/app/dataset_helpers.py
"""
DDAS Dataset Serialization and Upload Result Builder Helpers.
Modular helper utilities to construct structured API responses for exact duplicates,
unique uploads, and dataset listings while keeping router files concise.
"""
from typing import Optional, List, Dict, Any
from app.models import Dataset
from app.metadata_extractor import ExtractedMetadata
from app.similarity import parse_db_columns
from app.routers.lsh import parse_keywords_json
from app.schemas import UploadResult, ExistingDataset, ScoreBreakdown, DatasetOut


def build_exact_duplicate_result(
    existing: Dataset,
    incoming_filename: str,
    file_bytes_len: int,
    file_hash: str,
    simhash_hex: str,
    classification: str,
    meta: ExtractedMetadata,
    top_kw: List[str],
    text_preview: Optional[str],
) -> UploadResult:
    """Builds a structured UploadResult for Tier 1 Exact SHA-256 match."""
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
        columns=parse_db_columns(existing.columns_json),
        row_count=existing.row_count,
        col_count=existing.col_count,
        mime_type=existing.mime_type,
        top_keywords=parse_keywords_json(existing.top_keywords_json),
        text_preview=existing.text_preview,
        simhash=existing.simhash,
        hamming_distance=0,
    )
    return UploadResult(
        id=None,
        filename=incoming_filename,
        sha256=file_hash,
        size_bytes=file_bytes_len,
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


def serialize_dataset_record(d: Dataset) -> Dict[str, Any]:
    """Serializes a SQLAlchemy Dataset instance to a dictionary for caching and output."""
    uploader_name = d.uploader.username if d.uploader else "System"
    return {
        "id": d.id,
        "filename": d.filename,
        "sha256": d.sha256,
        "size_bytes": d.size_bytes,
        "uploaded_at": str(d.uploaded_at) if d.uploaded_at else "",
        "classification": d.classification or "INTERNAL",
        "uploader_username": uploader_name,
        "download_count": d.download_count,
        "description": d.description,
        "columns": parse_db_columns(d.columns_json),
        "row_count": d.row_count,
        "col_count": d.col_count,
        "mime_type": d.mime_type,
        "top_keywords": parse_keywords_json(d.top_keywords_json),
        "text_preview": d.text_preview,
        "simhash": d.simhash,
    }
