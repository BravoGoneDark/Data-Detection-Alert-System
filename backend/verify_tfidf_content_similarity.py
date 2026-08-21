# backend/verify_tfidf_content_similarity.py
"""
Automated Verification Suite for DDAS: TF-IDF & Cosine Similarity Content Matching
- Text Extraction & Tokenization (Unigrams + Bigrams with stop-word filtration)
- TF-IDF Sparse Vectorization & Cosine Similarity Calculation
- Plagiarism & Content Overlap Detection (Different Hash & Filename, High Vocabulary Match)
- Salient Keyword Extraction & Intersection
- Metadata-Enriched Inventory Listing & CAS Streaming Download
"""

import urllib.request
import urllib.parse
import urllib.error
import json
import time
import uuid

BASE_URL = "http://127.0.0.1:8000"


def make_request(method, path, data=None, headers=None, is_json=True):
    url = f"{BASE_URL}{path}"
    req_headers = headers.copy() if headers else {}
    body = None

    if data is not None:
        if is_json:
            body = json.dumps(data).encode("utf-8")
            req_headers["Content-Type"] = "application/json"
        else:
            body = data

    req = urllib.request.Request(url, data=body, headers=req_headers, method=method)
    try:
        with urllib.request.urlopen(req) as response:
            res_body = response.read()
            return response.status, res_body
    except urllib.error.HTTPError as e:
        return e.code, e.read()


def encode_multipart_formdata(fields, files):
    boundary = f"----WebKitFormBoundary{uuid.uuid4().hex}"
    lines = []
    for name, value in fields.items():
        lines.append(f"--{boundary}".encode("utf-8"))
        lines.append(f'Content-Disposition: form-data; name="{name}"'.encode("utf-8"))
        lines.append(b"")
        lines.append(str(value).encode("utf-8"))
    for name, (filename, content, content_type) in files.items():
        lines.append(f"--{boundary}".encode("utf-8"))
        lines.append(f'Content-Disposition: form-data; name="{name}"; filename="{filename}"'.encode("utf-8"))
        lines.append(f'Content-Type: {content_type}'.encode("utf-8"))
        lines.append(b"")
        lines.append(content)
    lines.append(f"--{boundary}--".encode("utf-8"))
    lines.append(b"")
    body = b"\r\n".join(lines)
    content_type = f"multipart/form-data; boundary={boundary}"
    return body, content_type


def run_tfidf_tests():
    print("=== 1. Authentication Setup ===")
    timestamp = int(time.time())
    username = f"researcher_{timestamp}"
    email = f"researcher_{timestamp}@example.com"
    password = "SecurePassword123!"

    status, res = make_request("POST", "/auth/signup", {
        "username": username,
        "email": email,
        "password": password
    })
    assert status == 200, f"Signup failed ({status}): {res.decode('utf-8')}"
    token = json.loads(res.decode("utf-8"))["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print(f"[OK] Created user {username} with token")

    print("\n=== 2. Testing Unique Upload & TF-IDF Salient Keyword Extraction ===")
    domain = f"neuro_{timestamp}"
    fname_v1 = f"neurodoc_{timestamp}_alpha.txt"
    text_v1 = f"""
    Title: Analysis of {domain} Synaptic Plasticity and Neural Networks
    Abstract: We investigate {domain}_dendritic spine morphology and {domain}_axon signaling across mammalian cerebral cortex.
    High-frequency stimulation induces long-term potentiation in {domain}_hippocampal pyramidal neurons.
    Electrophysiological recordings combined with two-photon imaging reveal calcium influx dynamics in {domain}_synapses.
    Our computational model predicts memory consolidation rates across distributed cortical networks.
    """
    content_v1 = text_v1.encode("utf-8")

    body, ct = encode_multipart_formdata(
        {"classification": "PUBLIC", "description": "Neuroscience Synaptic Plasticity Study"},
        {"file": (fname_v1, content_v1, "text/plain")}
    )
    h_upload = headers.copy()
    h_upload["Content-Type"] = ct
    status, res = make_request("POST", "/datasets/upload", data=body, headers=h_upload, is_json=False)
    assert status == 200, f"Upload failed ({status}): {res.decode('utf-8')}"
    res_json = json.loads(res.decode("utf-8"))
    
    assert res_json["duplicate"] is False, f"Expected unique upload, got: {res_json}"
    assert res_json["match_type"] == "UNIQUE"
    assert len(res_json["top_keywords"]) > 0, "Expected extracted TF-IDF keywords"
    dataset_v1_id = res_json["id"]
    print(f"[OK] Unique text report uploaded (ID: {dataset_v1_id})")
    print(f"     Extracted Salient Terms: {res_json['top_keywords']}")

    print("\n=== 3. Testing Plagiarism & TF-IDF Cosine Similarity Matching ===")
    # Version 2 is completely rewritten in sentence structure and has a different filename, but shares the domain vocabulary
    fname_v2 = f"synapse_digest_{timestamp}_beta.txt"
    text_v2 = f"""
    Executive Summary: {domain} Synaptic Plasticity and Cortical Networks Overview
    During two-photon calcium imaging and electrophysiological experiments, {domain}_dendritic spine remodeling
    and {domain}_axon signaling were observed in mammalian cerebral cortex. Long-term potentiation was stimulated
    in {domain}_hippocampal pyramidal neurons, confirming memory consolidation in {domain}_synapses.
    """
    content_v2 = text_v2.encode("utf-8")

    body_dup, ct_dup = encode_multipart_formdata(
        {"classification": "PUBLIC"},
        {"file": (fname_v2, content_v2, "text/plain")}
    )
    h_dup = headers.copy()
    h_dup["Content-Type"] = ct_dup
    status, res = make_request("POST", "/datasets/upload", data=body_dup, headers=h_dup, is_json=False)
    assert status == 200, f"Similarity check failed ({status}): {res.decode('utf-8')}"
    sim_json = json.loads(res.decode("utf-8"))

    assert sim_json["duplicate"] is True, f"Expected duplicate=True for high TF-IDF similarity, got {sim_json}"
    assert sim_json["match_type"] == "CONTENT_SIMILAR", f"Expected CONTENT_SIMILAR, got {sim_json['match_type']}"
    assert sim_json["similarity_score"] >= 60.0, f"Expected Cosine similarity >= 60%, got {sim_json['similarity_score']}%"
    assert len(sim_json["shared_keywords"]) > 0, "Expected shared salient keywords"
    print(f"[OK] Plagiarism / Content Overlap Caught!")
    print(f"     Cosine Similarity Score: {sim_json['similarity_score']}%")
    print(f"     Shared Vocabulary Intersect: {sim_json['shared_keywords']}")

    print("\n=== 4. Testing Exact Hash Collision (100% SHA-256 Match) ===")
    body_exact, ct_exact = encode_multipart_formdata(
        {"classification": "PUBLIC"},
        {"file": (f"renamed_exact_{fname_v1}", content_v1, "text/plain")}
    )
    h_exact = headers.copy()
    h_exact["Content-Type"] = ct_exact
    status, res = make_request("POST", "/datasets/upload", data=body_exact, headers=h_exact, is_json=False)
    assert status == 200
    exact_json = json.loads(res.decode("utf-8"))
    assert exact_json["duplicate"] is True
    assert exact_json["match_type"] == "EXACT"
    assert exact_json["similarity_score"] == 100.0
    print("[OK] Exact hash collision correctly classified as EXACT (100%)")

    print("\n=== 5. Testing 'Proceed Anyway / Force Upload' Variant Registration ===")
    body_force, ct_force = encode_multipart_formdata(
        {"classification": "PUBLIC", "description": "Forced variant summary", "force": "true"},
        {"file": (fname_v2, content_v2, "text/plain")}
    )
    h_force = headers.copy()
    h_force["Content-Type"] = ct_force
    status, res = make_request("POST", "/datasets/upload", data=body_force, headers=h_force, is_json=False)
    assert status == 200
    force_json = json.loads(res.decode("utf-8"))
    assert force_json["id"] is not None
    print(f"[OK] Force upload registered variant with ID: {force_json['id']}")

    print("\n=== 6. Testing Inventory Listing with TF-IDF Salient Keywords (GET /datasets) ===")
    status, res = make_request("GET", "/datasets", headers=headers)
    assert status == 200
    datasets = json.loads(res.decode("utf-8"))
    
    found_v1 = next((d for d in datasets if d["id"] == dataset_v1_id), None)
    assert found_v1 is not None
    assert len(found_v1["top_keywords"]) > 0
    assert found_v1["text_preview"] is not None
    print(f"[OK] Verified dataset inventory returns top keywords: {found_v1['top_keywords']}")
    print(f"     Preview snippet: {found_v1['text_preview'][:80]}...")

    print("\n=== 7. Testing Authenticated File Download from Content-Addressable Storage ===")
    status, dl_bytes = make_request("GET", f"/datasets/{dataset_v1_id}/download", headers=headers)
    assert status == 200
    assert dl_bytes == content_v1
    print("[OK] Verified byte-for-byte streaming download from Content-Addressable Storage")

    print("\n========================================================")
    print("ALL TF-IDF & COSINE SIMILARITY TESTS PASSED!")
    print("========================================================")


if __name__ == "__main__":
    run_tfidf_tests()
