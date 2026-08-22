# backend/app/routers/lsh.py
import json
from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, Dataset, LSHBucket
from app.authorization import require_permission
from app.audit_logger import record_audit_event
from app.storage import get_storage
from app.similarity import parse_db_columns
from app.tfidf_engine import extract_text_content
from app.fuzzy_engine import (
    compute_simhash_64,
    compute_minhash,
    parse_minhash_json,
)
from app.lsh_engine import extract_all_lsh_keys

router = APIRouter(prefix="/lsh", tags=["Locality-Sensitive Hashing"])


def parse_keywords_json(kw_json: str | None) -> list[str]:
    """Safely decodes stored JSON keywords array from the database."""
    if not kw_json:
        return []
    try:
        data = json.loads(kw_json)
        return data if isinstance(data, list) else []
    except Exception:
        return []


def index_dataset_lsh_buckets(
    db: Session,
    dataset_id: int,
    simhash_val: str | int | None = None,
    minhash_sig: list[int] | str | None = None,
    top_keywords: list[str] | None = None,
    columns: list[str] | None = None,
) -> int:
    """
    Extracts and persists all SimHash, MinHash, Keyword, and Column LSH bucket entries for a dataset.
    Enables sub-linear O(1) candidate retrieval during future uploads.
    """
    # Clear existing bucket postings for this dataset if re-indexing
    db.query(LSHBucket).filter(LSHBucket.dataset_id == dataset_id).delete()

    lsh_keys = extract_all_lsh_keys(
        simhash_val=simhash_val,
        minhash_sig=minhash_sig,
        top_keywords=top_keywords,
        columns=columns,
    )
    bucket_objs = [
        LSHBucket(
            dataset_id=dataset_id,
            band_type=band_type,
            band_index=band_index,
            bucket_key=bucket_key,
        )
        for band_type, band_index, bucket_key in lsh_keys
    ]
    if bucket_objs:
        db.add_all(bucket_objs)
        db.commit()
    return len(bucket_objs)


@router.get("/stats")
async def get_lsh_statistics(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("dataset:view")),
):
    """
    Returns telemetry metrics for the Locality-Sensitive Hashing (LSH) index.
    """
    total_entries = db.query(LSHBucket).count()
    unique_keys = db.query(LSHBucket.bucket_key).distinct().count()
    indexed_datasets = db.query(LSHBucket.dataset_id).distinct().count()
    simhash_entries = db.query(LSHBucket).filter(LSHBucket.band_type == "SIMHASH").count()
    minhash_entries = db.query(LSHBucket).filter(LSHBucket.band_type == "MINHASH").count()

    avg_buckets = round(total_entries / max(1, indexed_datasets), 2)
    collision_density = round(total_entries / max(1, unique_keys), 2)

    return {
        "status": "active",
        "total_bucket_entries": total_entries,
        "unique_bucket_keys": unique_keys,
        "indexed_datasets_count": indexed_datasets,
        "simhash_entries": simhash_entries,
        "minhash_entries": minhash_entries,
        "avg_buckets_per_dataset": avg_buckets,
        "collision_density": collision_density,
        "simhash_config": {"bands": 4, "bits_per_band": 16},
        "minhash_config": {"bands": 16, "rows_per_band": 4},
    }


@router.post("/backfill")
async def backfill_lsh_buckets(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("dataset:upload")),
):
    """
    Backfills LSH bucket entries for all existing datasets that do not have them indexed.
    """
    all_datasets = db.query(Dataset).all()
    storage = get_storage()
    backfilled_count = 0

    for d in all_datasets:
        sim_val = d.simhash
        min_val = parse_minhash_json(d.minhash_json)
        top_kw = parse_keywords_json(d.top_keywords_json)
        cols = parse_db_columns(d.columns_json)

        # Lazy compute missing signatures if storage file exists
        if (not sim_val or not min_val) and d.storage_path and storage.file_exists(d.storage_path):
            bytes_data = storage.read_file(d.storage_path)
            text = extract_text_content(d.filename, bytes_data)
            if not sim_val:
                _, sim_val = compute_simhash_64(text if text else d.filename)
                d.simhash = sim_val
            if not min_val:
                min_val = compute_minhash(text if text else d.filename)
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
        backfilled_count += 1

    record_audit_event(
        db,
        event_type="LSH_BACKFILL",
        severity="INFO",
        user=current_user,
        request=request,
        details={"total_datasets_backfilled": backfilled_count},
    )

    return {
        "status": "success",
        "message": f"Successfully indexed LSH buckets for {backfilled_count} datasets",
        "datasets_indexed": backfilled_count,
    }
