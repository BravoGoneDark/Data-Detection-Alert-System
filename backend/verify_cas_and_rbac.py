# backend/verify_cas_and_rbac.py
"""
Automated Verification Suite for DDAS:
1. User Authentication (Signup & JWT)
2. Content-Addressable Storage (CAS) - Single-Instance Storage
3. Duplicate Alert Refinement (Canonical Metadata)
4. Force Upload / Alias Registration
5. Dataset Inventory Listing
6. Authenticated File Streaming Downloads
7. Classification-based RBAC Enforcement (Clearance Gating)
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


def run_tests():
    print("=== 1. Testing Signup & Login ===")
    timestamp = int(time.time())
    username = f"tester_{timestamp}"
    email = f"tester_{timestamp}@example.com"
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

    print("\n=== 2. Testing Unique Upload (CAS Storage & Metadata) ===")
    fname_cas = f"test_data_{timestamp}.csv"
    test_content = f"record_id_{timestamp},metric_val_{timestamp},tag_{timestamp}\n1,99.5,alpha\n2,88.1,beta\n".encode("utf-8")
    body, ct = encode_multipart_formdata(
        {"classification": "INTERNAL", "description": "Test dataset v1"},
        {"file": (fname_cas, test_content, "text/csv")}
    )
    h_upload = headers.copy()
    h_upload["Content-Type"] = ct
    status, res = make_request("POST", "/datasets/upload", data=body, headers=h_upload, is_json=False)
    assert status == 200, f"Upload failed ({status}): {res.decode('utf-8')}"
    upload_json = json.loads(res.decode("utf-8"))
    assert upload_json["duplicate"] is False, f"Expected duplicate=False for first upload, got: {upload_json}"
    dataset_id = upload_json["id"]
    sha256 = upload_json["sha256"]
    print(f"[OK] Unique upload succeeded (ID: {dataset_id}, SHA: {sha256[:16]}...)")

    print("\n=== 3. Testing Duplicate Alert (Rich Existing Metadata) ===")
    body_dup, ct_dup = encode_multipart_formdata(
        {"classification": "INTERNAL"},
        {"file": (f"another_name_{timestamp}.csv", test_content, "text/csv")}
    )
    h_dup = headers.copy()
    h_dup["Content-Type"] = ct_dup
    status, res = make_request("POST", "/datasets/upload", data=body_dup, headers=h_dup, is_json=False)
    assert status == 200
    dup_json = json.loads(res.decode("utf-8"))
    assert dup_json["duplicate"] is True
    assert dup_json["existing"]["id"] == dataset_id
    assert dup_json["existing"]["filename"] == fname_cas
    assert dup_json["existing"]["uploader_username"] == username
    print(f"[OK] Duplicate alert correctly returned existing canonical metadata (Canonical: {dup_json['existing']['filename']}, Uploader: {dup_json['existing']['uploader_username']})")

    print("\n=== 4. Testing 'Proceed Anyway / Force Upload' (Alias Creation) ===")
    body_force, ct_force = encode_multipart_formdata(
        {"classification": "INTERNAL", "force": "true"},
        {"file": ("forced_alias.csv", test_content, "text/csv")}
    )
    h_force = headers.copy()
    h_force["Content-Type"] = ct_force
    status, res = make_request("POST", "/datasets/upload", data=body_force, headers=h_force, is_json=False)
    assert status == 200, f"Force upload failed ({status}): {res.decode('utf-8')}"
    force_json = json.loads(res.decode("utf-8"))
    assert force_json["id"] is not None, "Expected new ID for alias"
    print(f"[OK] Force upload succeeded, created alias dataset ID: {force_json['id']}")

    print("\n=== 5. Testing Dataset Listing (GET /datasets) ===")
    status, res = make_request("GET", "/datasets", headers=headers)
    assert status == 200, f"Listing failed ({status}): {res.decode('utf-8')}"
    datasets = json.loads(res.decode("utf-8"))
    assert len(datasets) >= 2, "Expected at least 2 datasets listed"
    print(f"[OK] Successfully listed {len(datasets)} datasets")

    print("\n=== 6. Testing Secure Download (GET /datasets/{id}/download) ===")
    status, dl_content = make_request("GET", f"/datasets/{dataset_id}/download", headers=headers)
    assert status == 200, f"Download failed ({status}): {dl_content.decode('utf-8')}"
    assert dl_content == test_content, "Downloaded content does not match original bytes"
    print("[OK] Secure download successfully streamed identical bytes from CAS storage")

    print("\n=== 7. Testing Classification RBAC (STUDENT vs CONFIDENTIAL) ===")
    confidential_content = f"Top Secret Data {timestamp}".encode("utf-8")
    body_conf, ct_conf = encode_multipart_formdata(
        {"classification": "CONFIDENTIAL"},
        {"file": ("confidential.csv", confidential_content, "text/csv")}
    )
    h_conf = headers.copy()
    h_conf["Content-Type"] = ct_conf
    status, res = make_request("POST", "/datasets/upload", data=body_conf, headers=h_conf, is_json=False)
    assert status == 200, f"Confidential upload failed ({status}): {res.decode('utf-8')}"
    conf_id = json.loads(res.decode("utf-8"))["id"]

    # Student should not see CONFIDENTIAL dataset in list
    status, res = make_request("GET", "/datasets", headers=headers)
    list_after = json.loads(res.decode("utf-8"))
    conf_in_list = any(d["id"] == conf_id for d in list_after)
    assert not conf_in_list, "CONFIDENTIAL dataset should be filtered out for STUDENT role"
    print("[OK] CONFIDENTIAL dataset correctly hidden from STUDENT dataset list")

    # Student download attempt on CONFIDENTIAL should return 403 Forbidden
    status, err_body = make_request("GET", f"/datasets/{conf_id}/download", headers=headers)
    assert status == 403, f"Expected 403 for student accessing confidential, got {status}"
    err_json = json.loads(err_body.decode("utf-8"))
    print(f"[OK] CONFIDENTIAL download correctly blocked with 403: {err_json['detail']}")

    print("\n==========================================")
    print("ALL CAS & RBAC VERIFICATION TESTS PASSED!")
    print("==========================================")


if __name__ == "__main__":
    run_tests()
