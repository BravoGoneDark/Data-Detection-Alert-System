# app/similarity.py

import json
import re
from pathlib import Path
from typing import Any
from app.metadata_extractor import ExtractedMetadata


def levenshtein_distance(s1: str, s2: str) -> int:
    """Calculates standard Levenshtein edit distance between two strings."""
    if len(s1) < len(s2):
        return levenshtein_distance(s2, s1)
    if len(s2) == 0:
        return len(s1)

    previous_row = range(len(s2) + 1)
    for i, c1 in enumerate(s1):
        current_row = [i + 1]
        for j, c2 in enumerate(s2):
            insertions = previous_row[j + 1] + 1
            deletions = current_row[j] + 1
            substitutions = previous_row[j] + (c1 != c2)
            current_row.append(min(insertions, deletions, substitutions))
        previous_row = current_row

    return previous_row[-1]


def clean_tokens(text: str) -> set[str]:
    """Extracts alphanumeric word tokens from a string (excluding extensions)."""
    stem = Path(text).stem.lower()
    tokens = re.findall(r"[a-z0-9]+", stem)
    return set(tokens)


def filename_similarity(name1: str, name2: str) -> float:
    """
    Computes hybrid string & token similarity between two filenames (0.0 to 1.0).
    """
    stem1 = Path(name1).stem.lower()
    stem2 = Path(name2).stem.lower()

    if stem1 == stem2:
        return 1.0

    max_len = max(len(stem1), len(stem2))
    if max_len == 0:
        return 1.0

    # 1. Edit distance ratio
    dist = levenshtein_distance(stem1, stem2)
    edit_ratio = max(0.0, 1.0 - (dist / max_len))

    # 2. Token Jaccard similarity
    tokens1 = clean_tokens(name1)
    tokens2 = clean_tokens(name2)
    union = tokens1 | tokens2
    intersection = tokens1 & tokens2
    token_ratio = len(intersection) / len(union) if union else 0.0

    return max(edit_ratio, token_ratio)


def schema_similarity(cols1: list[str], cols2: list[str]) -> float:
    """
    Computes Jaccard similarity on column header sets (0.0 to 1.0).
    """
    set1 = set(cols1)
    set2 = set(cols2)

    if not set1 and not set2:
        return 0.0
    if not set1 or not set2:
        return 0.0

    intersection = set1 & set2
    union = set1 | set2
    return len(intersection) / len(union) if union else 0.0


def size_proximity(size1: int, size2: int) -> float:
    """
    Computes ratio proximity of two file byte lengths (0.0 to 1.0).
    """
    max_size = max(size1, size2)
    if max_size == 0:
        return 1.0
    diff = abs(size1 - size2)
    return max(0.0, 1.0 - (diff / max_size))


def row_count_proximity(r1: int | None, r2: int | None) -> float:
    """
    Computes ratio proximity of two row counts (0.0 to 1.0).
    """
    if r1 is None or r2 is None:
        return 0.5  # Neutral default when row count is unavailable

    max_rows = max(r1, r2)
    if max_rows == 0:
        return 1.0
    diff = abs(r1 - r2)
    return max(0.0, 1.0 - (diff / max_rows))


def compute_metadata_similarity(
    name1: str,
    meta1: ExtractedMetadata,
    size1: int,
    name2: str,
    meta2_cols: list[str],
    meta2_rows: int | None,
    size2: int,
) -> tuple[float, dict[str, float]]:
    """
    Computes weighted composite metadata similarity score and breakdown.
    Returns (composite_score_0_to_100, breakdown_dict).
    """
    s_name = filename_similarity(name1, name2)
    s_schema = schema_similarity(meta1.columns, meta2_cols)
    s_size = size_proximity(size1, size2)
    s_rows = row_count_proximity(meta1.row_count, meta2_rows)

    has_schema = bool(meta1.columns or meta2_cols)

    if has_schema:
        # Structured file weighting
        w_name = 0.35
        w_schema = 0.35
        w_size = 0.15
        w_rows = 0.15
        composite = (
            w_name * s_name +
            w_schema * s_schema +
            w_size * s_size +
            w_rows * s_rows
        )
    else:
        # Non-tabular file weighting
        w_name = 0.60
        w_size = 0.40
        composite = (w_name * s_name) + (w_size * s_size)

    score_pct = round(composite * 100, 1)

    breakdown = {
        "filename_similarity": round(s_name * 100, 1),
        "schema_similarity": round(s_schema * 100, 1),
        "size_proximity": round(s_size * 100, 1),
        "row_proximity": round(s_rows * 100, 1) if has_schema else None,
    }

    return score_pct, breakdown


def parse_db_columns(columns_json: str | None) -> list[str]:
    """Safely decodes stored JSON column array from the database."""
    if not columns_json:
        return []
    try:
        data = json.loads(columns_json)
        return data if isinstance(data, list) else []
    except Exception:
        return []
