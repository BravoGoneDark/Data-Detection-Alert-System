"""
Locality-Sensitive Hashing (LSH) Engine for DDAS.

Implements banding techniques for:
1. 64-bit SimHash bitwise signatures (Hamming distance indexing via Pigeonhole Principle).
2. 64-permutation MinHash signature arrays (Jaccard similarity indexing via S-curve collision probability).

Sub-linear O(1) candidate pair generation replaces O(N) brute-force linear scans.
"""

from typing import List, Tuple, Set, Dict, Optional
from app.fuzzy_engine import (
    parse_simhash,
    parse_minhash_json,
    fnv1a_64,
    MASK_64,
)


def generate_simhash_bucket_keys(
    simhash_val: int | str | None,
    num_bands: int = 4,
) -> List[Tuple[int, str]]:
    """
    Partitions a 64-bit SimHash into `num_bands` equal bit chunks (bands).
    Default: 4 bands of 16 bits each (b=4, r=16).
    
    Pigeonhole Principle Guarantee:
    If Hamming distance d <= 3 bits between two 64-bit fingerprints,
    distributing 3 flips across 4 bands guarantees that at least ONE band has 0 bit flips.
    Thus, documents with d <= 3 bits are mathematically GUARANTEED to collide in at least one band.

    Returns a list of (band_index, bucket_key) tuples, e.g.:
    [(0, 'sim_b0_a1b2'), (1, 'sim_b1_c3d4'), (2, 'sim_b2_e5f6'), (3, 'sim_b3_0789')]
    """
    val_int = parse_simhash(simhash_val)
    if val_int == 0 and simhash_val is None:
        return []

    bits_per_band = 64 // num_bands
    band_mask = (1 << bits_per_band) - 1

    bucket_keys: List[Tuple[int, str]] = []
    for band_idx in range(num_bands):
        shift = band_idx * bits_per_band
        chunk = (val_int >> shift) & band_mask
        # Format chunk as hex with width corresponding to bits_per_band // 4
        hex_width = max(1, bits_per_band // 4)
        key = f"sim_b{band_idx}_{chunk:0{hex_width}x}"
        bucket_keys.append((band_idx, key))

    return bucket_keys


def generate_minhash_bucket_keys(
    signature: List[int] | str | None,
    num_bands: int = 16,
    rows_per_band: int = 4,
) -> List[Tuple[int, str]]:
    """
    Partitions a 64-permutation MinHash signature array into `num_bands` bands of `rows_per_band` integers each.
    Default: 16 bands x 4 rows = 64 permutations.

    S-Curve Collision Probability:
    P(collision) = 1 - (1 - s^r)^b = 1 - (1 - s^4)^16
    - For Jaccard similarity s = 0.80 -> P ≈ 99.99% collision probability.
    - For Jaccard similarity s = 0.60 -> P ≈ 90.0% collision probability.
    - For Jaccard similarity s = 0.20 -> P ≈ 2.5% collision probability.

    Returns a list of (band_index, bucket_key) tuples, e.g.:
    [(0, 'min_b0_9e8f7a6b5c4d3e2f'), ...]
    """
    if isinstance(signature, str):
        sig_list = parse_minhash_json(signature)
    elif isinstance(signature, list):
        sig_list = signature
    else:
        return []

    if not sig_list or len(sig_list) < (num_bands * rows_per_band):
        return []

    bucket_keys: List[Tuple[int, str]] = []
    for band_idx in range(num_bands):
        start = band_idx * rows_per_band
        end = start + rows_per_band
        chunk = sig_list[start:end]
        # Hash the 4-tuple of integer values using FNV-1a to form a 64-bit deterministic bucket key
        raw_repr = f"b{band_idx}:" + ",".join(str(v) for v in chunk)
        band_hash = fnv1a_64(raw_repr)
        key = f"min_b{band_idx}_{band_hash:016x}"
        bucket_keys.append((band_idx, key))

    return bucket_keys


def extract_all_lsh_keys(
    simhash_val: int | str | None = None,
    minhash_sig: List[int] | str | None = None,
    top_keywords: Optional[List[str]] = None,
    columns: Optional[List[str]] = None,
    sim_bands: int = 4,
    min_bands: int = 16,
    min_rows: int = 4,
) -> List[Tuple[str, int, str]]:
    """
    Extracts all multi-tier LSH & inverted index bucket keys:
    - SimHash Bands: 64-bit partitioned bit chunks (Hamming distance)
    - MinHash Bands: 64-permutation banded buckets (Jaccard similarity)
    - Salient Keywords: Inverted index tokens for topical paraphrase match
    - Schema Columns: Inverted index column names for tabular schema match
    
    Returns list of (band_type, band_index, bucket_key) tuples.
    """
    results: List[Tuple[str, int, str]] = []

    # 1. SimHash Bands
    sim_keys = generate_simhash_bucket_keys(simhash_val, num_bands=sim_bands)
    for band_idx, key in sim_keys:
        results.append(("SIMHASH", band_idx, key))

    # 2. MinHash Bands
    min_keys = generate_minhash_bucket_keys(minhash_sig, num_bands=min_bands, rows_per_band=min_rows)
    for band_idx, key in min_keys:
        results.append(("MINHASH", band_idx, key))

    # 3. Salient Domain Keywords (TF-IDF Top Keywords)
    if top_keywords:
        for idx, kw in enumerate(top_keywords[:6]):
            norm_kw = kw.strip().lower()
            if norm_kw and len(norm_kw) >= 3:
                results.append(("KEYWORD", idx, f"kw_{norm_kw}"))

    # 4. Tabular Schema Columns
    if columns:
        for idx, col in enumerate(columns[:10]):
            norm_col = col.strip().lower()
            if norm_col:
                results.append(("COLUMN", idx, f"col_{norm_col}"))

    return results


class LSHMemoryIndex:
    """
    In-memory LSH Index providing O(1) candidate lookup and indexing.
    Can be used as a cache or standalone fast index.
    """

    def __init__(self, sim_bands: int = 4, min_bands: int = 16, min_rows: int = 4):
        self.sim_bands = sim_bands
        self.min_bands = min_bands
        self.min_rows = min_rows
        # bucket_key -> set of dataset_ids
        self.buckets: Dict[str, Set[int]] = {}
        # dataset_id -> list of bucket_keys
        self.dataset_keys: Dict[int, List[str]] = {}

    def insert(
        self,
        dataset_id: int,
        simhash_val: int | str | None = None,
        minhash_sig: List[int] | str | None = None,
        top_keywords: Optional[List[str]] = None,
        columns: Optional[List[str]] = None,
    ) -> None:
        """Indexes a dataset's signatures and keywords into LSH buckets."""
        all_keys = extract_all_lsh_keys(
            simhash_val,
            minhash_sig,
            top_keywords=top_keywords,
            columns=columns,
            sim_bands=self.sim_bands,
            min_bands=self.min_bands,
            min_rows=self.min_rows,
        )
        key_strings = []
        for _, _, key in all_keys:
            if key not in self.buckets:
                self.buckets[key] = set()
            self.buckets[key].add(dataset_id)
            key_strings.append(key)
        self.dataset_keys[dataset_id] = key_strings

    def remove(self, dataset_id: int) -> None:
        """Removes a dataset from all indexed buckets."""
        if dataset_id not in self.dataset_keys:
            return
        for key in self.dataset_keys[dataset_id]:
            if key in self.buckets:
                self.buckets[key].discard(dataset_id)
                if not self.buckets[key]:
                    del self.buckets[key]
        del self.dataset_keys[dataset_id]

    def query_candidates(
        self,
        simhash_val: int | str | None = None,
        minhash_sig: List[int] | str | None = None,
        top_keywords: Optional[List[str]] = None,
        columns: Optional[List[str]] = None,
    ) -> Set[int]:
        """
        Retrieves all candidate dataset IDs that collide with the query
        in at least one SimHash, MinHash, Keyword, or Column LSH bucket.
        """
        all_keys = extract_all_lsh_keys(
            simhash_val,
            minhash_sig,
            top_keywords=top_keywords,
            columns=columns,
            sim_bands=self.sim_bands,
            min_bands=self.min_bands,
            min_rows=self.min_rows,
        )
        candidates: Set[int] = set()
        for _, _, key in all_keys:
            if key in self.buckets:
                candidates.update(self.buckets[key])
        return candidates

    def get_stats(self) -> dict:
        """Returns telemetry statistics about the in-memory index."""
        total_buckets = len(self.buckets)
        total_indexed = len(self.dataset_keys)
        total_postings = sum(len(ids) for ids in self.buckets.values())
        avg_postings = round(total_postings / max(1, total_buckets), 2)
        return {
            "total_buckets": total_buckets,
            "total_datasets_indexed": total_indexed,
            "total_postings": total_postings,
            "avg_postings_per_bucket": avg_postings,
        }
