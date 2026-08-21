# backend/verify_metadata_similarity.py
"""
Automated Verification Suite for DDAS: Metadata & Structural Similarity Matching
- Schema Extraction (CSV / JSON / Text columns and row counts)
- Multi-Attribute Similarity Scoring (Levenshtein distance, Jaccard column overlap, size & row proximity)
- Tiered Duplicate Detection (EXACT Hash Match vs METADATA_SIMILAR)
- Force Upload / Variant Registration
- Schema-Enriched Inventory Listing & Authenticated Downloads
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


def generate_sample_csv(filename, columns, row_count, seed=""):
    lines = [",".join(columns)]
    for i in range(row_count):
        row = [f"{col}_{seed}_{i}" for col in columns]
        lines.append(",".join(row))
    return "\n".join(lines).encode("utf-8")


def run_stage6_tests():
    print("=== 1. Authentication Setup ===")
    timestamp = int(time.time())
    username = f"analyst_{timestamp}"
    email = f"analyst_{timestamp}@example.com"
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

    print("\n=== 2. Testing CSV Schema Extraction & Unique Upload ===")
    print("\n=== 2. Testing CSV Schema Extraction & Unique Upload ===")
    fname_v1 = f"experiment_{timestamp}_v1.csv"
    fname_v2 = f"experiment_{timestamp}_v2.csv"
    cols_v1 = [f"sensor_id_{timestamp}", f"temp_{timestamp}", f"volt_{timestamp}", f"freq_{timestamp}", f"status_{timestamp}"]
    content_v1 = generate_sample_csv(fname_v1, cols_v1, 40, seed=str(timestamp))
    
    body, ct = encode_multipart_formdata(
        {"classification": "INTERNAL", "description": "IoT sensor telemetry baseline"},
        {"file": (fname_v1, content_v1, "text/csv")}
    )
    h_upload = headers.copy()
    h_upload["Content-Type"] = ct
    status, res = make_request("POST", "/datasets/upload", data=body, headers=h_upload, is_json=False)
    assert status == 200, f"Upload failed ({status}): {res.decode('utf-8')}"
    res_json = json.loads(res.decode("utf-8"))
    assert res_json["duplicate"] is False, f"Expected unique upload, got: {res_json}"
    assert res_json["match_type"] == "UNIQUE"
    assert res_json["row_count"] == 40, f"Expected 40 rows, got {res_json['row_count']}"
    assert len(res_json["extracted_columns"]) == 5, f"Expected 5 columns, got {len(res_json['extracted_columns'])}"
    dataset_v1_id = res_json["id"]
    print(f"[OK] Unique upload registered with schema: {res_json['extracted_columns']} ({res_json['row_count']} rows)")

    print("\n=== 3. Testing Metadata Similarity Matching (Different SHA-256, High Metadata Overlap) ===")
    # Version 2 has different content (different byte values) and 1 extra column
    cols_v2 = [f"sensor_id_{timestamp}", f"temp_{timestamp}", f"volt_{timestamp}", f"freq_{timestamp}", f"status_{timestamp}", f"opt_{timestamp}"]
    content_v2 = generate_sample_csv(fname_v2, cols_v2, 42, seed=f"{timestamp}_v2")
    
    body_dup, ct_dup = encode_multipart_formdata(
        {"classification": "INTERNAL"},
        {"file": (fname_v2, content_v2, "text/csv")}
    )
    h_dup = headers.copy()
    h_dup["Content-Type"] = ct_dup
    status, res = make_request("POST", "/datasets/upload", data=body_dup, headers=h_dup, is_json=False)
    assert status == 200, f"Similarity check failed ({status}): {res.decode('utf-8')}"
    sim_json = json.loads(res.decode("utf-8"))
    
    assert sim_json["duplicate"] is True, "Expected duplicate=True for metadata match"
    assert sim_json["match_type"] == "METADATA_SIMILAR", f"Expected METADATA_SIMILAR, got {sim_json['match_type']}"
    assert sim_json["similarity_score"] >= 75.0, f"Expected similarity score >= 75%, got {sim_json['similarity_score']}%"
    assert sim_json["score_breakdown"] is not None
    assert sim_json["score_breakdown"]["schema_similarity"] >= 80.0
    print(f"[OK] Caught metadata near-duplicate! Score: {sim_json['similarity_score']}%")
    print(f"     Breakdown: Filename {sim_json['score_breakdown']['filename_similarity']}%, Schema {sim_json['score_breakdown']['schema_similarity']}%, Size {sim_json['score_breakdown']['size_proximity']}%")

    print("\n=== 4. Testing Exact Hash Collision (100% SHA-256 Match) ===")
    body_exact, ct_exact = encode_multipart_formdata(
        {"classification": "INTERNAL"},
        {"file": (f"renamed_{fname_v1}", content_v1, "text/csv")}
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

    print("\n=== 5. Testing 'Proceed Anyway / Force Upload' with Metadata ===")
    body_force, ct_force = encode_multipart_formdata(
        {"classification": "INTERNAL", "description": "Forced telemetry v2 variant", "force": "true"},
        {"file": (fname_v2, content_v2, "text/csv")}
    )
    h_force = headers.copy()
    h_force["Content-Type"] = ct_force
    status, res = make_request("POST", "/datasets/upload", data=body_force, headers=h_force, is_json=False)
    assert status == 200
    force_json = json.loads(res.decode("utf-8"))
    assert force_json["id"] is not None
    print(f"[OK] Force upload succeeded for metadata variant (New ID: {force_json['id']})")

    print("\n=== 6. Testing Metadata-Enriched Inventory Listing (GET /datasets) ===")
    status, res = make_request("GET", "/datasets", headers=headers)
    assert status == 200
    datasets = json.loads(res.decode("utf-8"))
    
    found_v1 = next((d for d in datasets if d["id"] == dataset_v1_id), None)
    assert found_v1 is not None
    assert len(found_v1["columns"]) == 5
    assert found_v1["row_count"] == 40
    assert found_v1["col_count"] == 5
    assert "csv" in found_v1["mime_type"]
    print(f"[OK] Verified dataset inventory returns extracted schema attributes: {found_v1['columns']} ({found_v1['row_count']} rows)")

    print("\n=== 7. Testing Authenticated File Download ===")
    status, dl_bytes = make_request("GET", f"/datasets/{dataset_v1_id}/download", headers=headers)
    assert status == 200
    assert dl_bytes == content_v1
    print("[OK] Verified byte-for-byte streaming download from Content-Addressable Storage")

    print("\n========================================================")
    print("ALL STAGE 6 METADATA SIMILARITY TESTS PASSED!")
    print("========================================================")


if __name__ == "__main__":
    run_stage6_tests()
