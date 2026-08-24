# app/tfidf_engine.py

import io
import json
import math
import re
import zipfile
from collections import Counter
from pathlib import Path

# Standard English stop words
STOP_WORDS = {
    "a", "about", "above", "after", "again", "against", "all", "am", "an", "and",
    "any", "are", "aren't", "as", "at", "be", "because", "been", "before", "being",
    "below", "between", "both", "but", "by", "can", "can't", "cannot", "could",
    "couldn't", "did", "didn't", "do", "does", "doesn't", "doing", "don't", "down",
    "during", "each", "few", "for", "from", "further", "had", "hadn't", "has",
    "hasn't", "have", "haven't", "having", "he", "he'd", "he'll", "he's", "her",
    "here", "here's", "hers", "herself", "him", "himself", "his", "how", "how's",
    "i", "i'd", "i'll", "i'm", "i've", "if", "in", "into", "is", "isn't", "it",
    "it's", "its", "itself", "let's", "me", "more", "most", "mustn't", "my",
    "myself", "no", "nor", "not", "of", "off", "on", "once", "only", "or", "other",
    "ought", "our", "ours", "ourselves", "out", "over", "own", "same", "shan't",
    "she", "she'd", "she'll", "she's", "should", "shouldn't", "so", "some", "such",
    "than", "that", "that's", "the", "their", "theirs", "them", "themselves",
    "then", "there", "there's", "these", "they", "they'd", "they'll", "they're",
    "they've", "this", "those", "through", "to", "too", "under", "until", "up",
    "very", "was", "wasn't", "we", "we'd", "we'll", "we're", "we've", "were",
    "weren't", "what", "what's", "when", "when's", "where", "where's", "which",
    "while", "who", "who's", "whom", "why", "why's", "with", "won't", "would",
    "wouldn't", "you", "you'd", "you'll", "you're", "you've", "your", "yours",
    "yourself", "yourselves"
}


def extract_text_content(filename: str, file_bytes: bytes) -> str:
    """
    Extracts searchable textual representation from file bytes.
    Works on plain text, markdown, CSV, TSV, JSON, and DOCX files.
    """
    ext = Path(filename).suffix.lower()

    # 1. Handle DOCX Word Documents (extract text from word/document.xml)
    if ext == ".docx" or file_bytes.startswith(b"PK\x03\x04"):
        try:
            with zipfile.ZipFile(io.BytesIO(file_bytes)) as docx_zip:
                extracted_parts = []
                for name in docx_zip.namelist():
                    if name.startswith("word/") and name.endswith(".xml"):
                        xml_content = docx_zip.read(name).decode("utf-8", errors="ignore")
                        text_content = re.sub(r"<[^>]+>", " ", xml_content)
                        clean = " ".join(text_content.split())
                        if clean:
                            extracted_parts.append(clean)
                if extracted_parts:
                    return " ".join(extracted_parts)
        except Exception:
            pass

        # If it was a ZIP/DOCX and extraction failed or yielded no text, do NOT treat raw zip binary as text!
        if file_bytes.startswith(b"PK\x03\x04"):
            return ""

    # 2. Handle JSON
    if ext in [".json"]:
        try:
            data = json.loads(file_bytes.decode("utf-8", errors="replace"))
            if isinstance(data, list):
                extracted = []
                for item in data:
                    if isinstance(item, dict):
                        extracted.append(" ".join(str(v) for v in item.values()))
                    else:
                        extracted.append(str(item))
                return " ".join(extracted)
            elif isinstance(data, dict):
                return " ".join(str(v) for v in data.values())
        except Exception:
            pass

    # 3. Detect binary files (NUL bytes or non-text magic headers)
    sample = file_bytes[:1024]
    if b"\x00" in sample or sample.startswith((b"\x7fELF", b"\x89PNG", b"\xff\xd8\xff", b"%PDF", b"GIF8")):
        # Pure binary with no text parser - do not pollute text index
        return ""

    # 4. For CSV/TSV, Markdown, or plain text, return sanitized text content
    try:
        raw_text = file_bytes.decode("utf-8", errors="replace")
        sanitized = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f]", " ", raw_text)
        return " ".join(sanitized.split())
    except Exception:
        return ""


def tokenize(text: str) -> list[str]:
    """
    Extracts normalized words from raw text, filtering stop words and pure numbers.
    """
    words = re.findall(r"[a-z0-9_]{2,}", text.lower())
    clean_unigrams = [w for w in words if w not in STOP_WORDS and not w.isdigit()]
    return clean_unigrams


def build_tfidf_vector(tokens: list[str]) -> dict[str, float]:
    """
    Constructs a Euclidean-normalized Term Frequency (TF) vector (L2 norm = 1.0).
    Using sublinear TF: 1 + log(tf) for non-zero counts.
    """
    if not tokens:
        return {}

    counts = Counter(tokens)
    vector = {}
    sum_sq = 0.0

    for term, count in counts.items():
        weight = 1.0 + math.log(count)
        vector[term] = weight
        sum_sq += weight * weight

    # Normalize to unit length
    norm = math.sqrt(sum_sq)
    if norm > 0:
        for term in vector:
            vector[term] /= norm

    return vector


def compute_cosine_similarity(vec1: dict[str, float], vec2: dict[str, float]) -> float:
    """
    Computes Cosine Similarity between two L2-normalized sparse vectors.
    Since ||vec1||_2 = 1 and ||vec2||_2 = 1, Cosine Similarity is simply the dot product.
    Returns percentage (0.0 to 100.0%).
    """
    if not vec1 or not vec2:
        return 0.0

    # Iterate over the smaller vector for speed
    if len(vec1) > len(vec2):
        vec1, vec2 = vec2, vec1

    dot_product = sum(weight * vec2.get(term, 0.0) for term, weight in vec1.items())
    return round(max(0.0, min(1.0, dot_product)) * 100, 1)


def get_top_keywords(vector: dict[str, float], top_n: int = 5) -> list[str]:
    """
    Extracts the highest-weight salient terms from a normalized TF vector.
    """
    if not vector:
        return []
    # Filter out bigrams with underscores for display keywords, or keep top terms
    sorted_terms = sorted(vector.items(), key=lambda x: x[1], reverse=True)
    return [term for term, _ in sorted_terms[:top_n]]


def get_shared_keywords(vec1: dict[str, float], vec2: dict[str, float], top_n: int = 5) -> list[str]:
    """
    Finds intersecting terms between two vectors, ranked by mutual product weight.
    """
    common_terms = set(vec1.keys()) & set(vec2.keys())
    if not common_terms:
        return []

    scored_terms = sorted(
        common_terms,
        key=lambda term: vec1[term] * vec2[term],
        reverse=True
    )
    return scored_terms[:top_n]
