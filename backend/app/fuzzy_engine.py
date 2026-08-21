import re
import json

# 64-bit FNV-1a Constants
FNV_OFFSET_BASIS = 14695981039346656037
FNV_PRIME = 1099511628211
MASK_64 = 0xFFFFFFFFFFFFFFFF

# Mersenne Prime for MinHash permutations: 2^61 - 1
MERSENNE_PRIME_61 = (1 << 61) - 1

# 64 Universal Hash Permutation Coefficients (a_i, b_i) deterministically seeded
MINHASH_PERMUTATIONS = [
    ((i * 1000003 + 49999) % MERSENNE_PRIME_61, (i * 2000029 + 99991) % MERSENNE_PRIME_61)
    for i in range(1, 65)
]


def fnv1a_64(text: str) -> int:
    """
    Computes standard 64-bit FNV-1a non-cryptographic hash for a string shingle.
    """
    h = FNV_OFFSET_BASIS
    for b in text.encode("utf-8"):
        h ^= b
        h = (h * FNV_PRIME) & MASK_64
    return h


def clean_text(text: str) -> str:
    """
    Normalizes text to lowercase alphanumeric with single spaces.
    """
    if not text:
        return ""
    cleaned = re.sub(r"[^\w\s]", " ", text.lower())
    return re.sub(r"\s+", " ", cleaned).strip()


def extract_shingles(text: str, char_k: int = 4, word_k: int = 2) -> list[str]:
    """
    Extracts multi-resolution shingles (4-character n-grams and 2-word n-grams)
    to balance typo resilience and phrase structure capture.
    """
    norm = clean_text(text)
    if not norm:
        return []

    shingles: list[str] = []

    # 1. Character n-grams (resilient to typos and character transpositions)
    if len(norm) <= char_k:
        shingles.append(norm)
    else:
        for i in range(len(norm) - char_k + 1):
            shingles.append(norm[i : i + char_k])

    # 2. Word n-grams (captures phrase and semantic context)
    words = norm.split()
    if len(words) >= word_k:
        for i in range(len(words) - word_k + 1):
            shingles.append(" ".join(words[i : i + word_k]))
    elif words:
        shingles.extend(words)

    return shingles


def compute_simhash_64(text: str, char_k: int = 4) -> tuple[int, str]:
    """
    Computes Charikar's 64-bit SimHash bitwise fingerprint.
    Returns (fingerprint_int, hex_string).
    """
    shingles = extract_shingles(text, char_k=char_k)
    if not shingles:
        return 0, "0x0000000000000000"

    # 64-dimensional accumulator vector
    v = [0] * 64

    for shingle in shingles:
        h = fnv1a_64(shingle)
        for bit in range(64):
            if (h >> bit) & 1:
                v[bit] += 1
            else:
                v[bit] -= 1

    fingerprint = 0
    for bit in range(64):
        if v[bit] > 0:
            fingerprint |= 1 << bit

    hex_str = f"0x{fingerprint:016x}"
    return fingerprint, hex_str


def parse_simhash(simhash_val: int | str | None) -> int:
    """Safely parses integer or hex string to 64-bit integer."""
    if simhash_val is None:
        return 0
    if isinstance(simhash_val, int):
        return simhash_val & MASK_64
    if isinstance(simhash_val, str):
        try:
            return int(simhash_val, 16 if simhash_val.startswith("0x") else 10) & MASK_64
        except ValueError:
            return 0
    return 0


def compute_hamming_distance(h1: int | str, h2: int | str) -> int:
    """
    Computes the bitwise Hamming distance between two 64-bit SimHash values.
    Returns integer in [0, 64].
    """
    int1 = parse_simhash(h1)
    int2 = parse_simhash(h2)
    return (int1 ^ int2).bit_count()


def compute_simhash_similarity(h1: int | str, h2: int | str) -> tuple[float, int]:
    """
    Computes SimHash similarity percentage and raw bit Hamming distance.
    Returns (similarity_percentage_0_to_100, hamming_distance_0_to_64).
    """
    dist = compute_hamming_distance(h1, h2)
    score_pct = round((1.0 - (dist / 64.0)) * 100.0, 1)
    return score_pct, dist


def compute_minhash(text: str, num_perm: int = 64) -> list[int]:
    """
    Computes a 64-permutation MinHash signature array for Jaccard set similarity.
    """
    shingles = extract_shingles(text)
    if not shingles:
        return [0] * num_perm

    # Hash each shingle once
    shingle_hashes = [fnv1a_64(s) for s in shingles]

    signature: list[int] = []
    for a, b in MINHASH_PERMUTATIONS[:num_perm]:
        min_val = MERSENNE_PRIME_61
        for h in shingle_hashes:
            perm_h = (a * h + b) % MERSENNE_PRIME_61
            if perm_h < min_val:
                min_val = perm_h
        signature.append(min_val)

    return signature


def compute_minhash_jaccard(sig1: list[int], sig2: list[int]) -> float:
    """
    Estimates Jaccard similarity from two MinHash signatures (0.0 to 1.0).
    """
    if not sig1 or not sig2 or len(sig1) != len(sig2):
        return 0.0
    matches = sum(1 for a, b in zip(sig1, sig2) if a == b)
    return round(matches / len(sig1), 4)


def parse_minhash_json(minhash_json: str | None) -> list[int]:
    """Safely decodes JSON array of MinHash integers."""
    if not minhash_json:
        return []
    try:
        data = json.loads(minhash_json)
        return data if isinstance(data, list) else []
    except Exception:
        return []
