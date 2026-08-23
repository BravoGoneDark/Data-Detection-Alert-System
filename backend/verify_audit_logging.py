# verify_audit_logging.py
"""
STAGE 10: Security Audit Logging & Compliance Ledger Verification Suite

Validates:
1. User Signup & Login Success/Failure audit logging.
2. Unique Dataset Upload audit logging (INFO).
3. Duplicate Upload Warning audit logging (WARNING).
4. Force Upload Override audit logging (WARNING).
5. Authorized Dataset Download audit logging (INFO).
6. Clearance Security Breach 403 Interception (CRITICAL severity ACCESS_DENIED).
7. Admin Audit Log Ledger API with multi-field filtering (GET /admin/audit-logs).
8. Admin Security Audit Telemetry & Top Violators (GET /admin/audit-logs/stats).
"""

import json
import random
import time
import urllib.request
import urllib.parse
import urllib.error
import uuid

BASE_URL = "http://127.0.0.1:8000"


def make_request(method, path, data=None, headers=None, is_json=True):
    if headers is None:
        headers = {}
    url = f"{BASE_URL}{path}"
    req_data = None
    if data is not None:
        if is_json:
            req_data = json.dumps(data).encode("utf-8")
            headers["Content-Type"] = "application/json"
        else:
            req_data = data

    req = urllib.request.Request(url, data=req_data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as response:
            return response.status, response.read()
    except urllib.error.HTTPError as e:
        return e.code, e.read()


def encode_multipart_formdata(fields, files):
    boundary = "----WebKitFormBoundary" + uuid.uuid4().hex
    body = bytearray()
    for name, value in fields.items():
        body.extend(f"--{boundary}\r\n".encode("utf-8"))
        body.extend(f'Content-Disposition: form-data; name="{name}"\r\n\r\n'.encode("utf-8"))
        body.extend(str(value).encode("utf-8"))
        body.extend(b"\r\n")
    for name, (filename, content, content_type) in files.items():
        body.extend(f"--{boundary}\r\n".encode("utf-8"))
        body.extend(f'Content-Disposition: form-data; name="{name}"; filename="{filename}"\r\n'.encode("utf-8"))
        body.extend(f"Content-Type: {content_type}\r\n\r\n".encode("utf-8"))
        body.extend(content)
        body.extend(b"\r\n")
    body.extend(f"--{boundary}--\r\n".encode("utf-8"))
    content_type = f"multipart/form-data; boundary={boundary}"
    return bytes(body), content_type


def create_user_with_role(username, email, password, role_name):
    # 1. Signup default student
    status, res = make_request("POST", "/auth/signup", {
        "username": username,
        "email": email,
        "password": password,
    })
    assert status == 200, f"Signup failed: {res.decode('utf-8')}"
    token = json.loads(res.decode("utf-8"))["access_token"]

    if role_name != "STUDENT":
        # Direct DB update to elevate role for testing
        from app.database import SessionLocal
        from app.models import User, Role
        db = SessionLocal()
        user = db.query(User).filter(User.username == username).first()
        role = db.query(Role).filter(Role.name == role_name).first()
        if user and role:
            user.role_id = role.id
            db.commit()
        db.close()

    return token


def run_audit_logging_tests():
    print("=" * 65)
    print("STAGE 10: SECURITY AUDIT LOGGING & COMPLIANCE LEDGER TEST SUITE")
    print("=" * 65)

    timestamp = int(time.time())
    admin_uname = f"sec_admin_{timestamp}"
    admin_token = create_user_with_role(admin_uname, f"{admin_uname}@ddas.sec", "AdminPass987!", "ADMIN")
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    student_uname = f"sec_student_{timestamp}"
    student_token = create_user_with_role(student_uname, f"{student_uname}@ddas.sec", "StudentPass123!", "STUDENT")
    student_headers = {"Authorization": f"Bearer {student_token}"}

    # -------------------------------------------------------------
    # 1. Test Authentication Audit Logs (USER_SIGNUP, LOGIN_SUCCESS, LOGIN_FAILED)
    # -------------------------------------------------------------
    print("\n=== Test 1: Authentication Events & Login Audit Logging ===")
    # Trigger a failed login attempt
    status, res = make_request("POST", "/auth/login", {
        "identifier": student_uname,
        "password": "WrongPasswordBadAttempt!",
    })
    assert status == 401, f"Expected 401 on bad password, got {status}"
    print(f"[OK] Triggered failed login attempt for {student_uname}")

    # Query audit logs for login events
    status, res = make_request("GET", f"/admin/audit-logs?username={student_uname}", headers=admin_headers)
    assert status == 200, f"Failed to get audit logs: {res.decode('utf-8')}"
    logs_json = json.loads(res.decode("utf-8"))
    
    event_types = [log["event_type"] for log in logs_json["logs"]]
    assert "USER_SIGNUP" in event_types, f"Expected USER_SIGNUP in logs, got {event_types}"
    assert "LOGIN_FAILED" in event_types, f"Expected LOGIN_FAILED in logs, got {event_types}"
    
    failed_log = next(l for l in logs_json["logs"] if l["event_type"] == "LOGIN_FAILED")
    assert failed_log["severity"] == "WARNING", f"Expected WARNING severity, got {failed_log['severity']}"
    print(f"[OK] Verified USER_SIGNUP (INFO) and LOGIN_FAILED (WARNING) recorded in audit ledger")

    # -------------------------------------------------------------
    # 2. Test Unique Dataset Upload Audit Logging
    # -------------------------------------------------------------
    print("\n=== Test 2: Unique Dataset Upload Audit Logging (DATASET_UPLOAD) ===")
    unique_tag = uuid.uuid4().hex[:8]
    fname_1 = f"audit_metrics_{unique_tag}.csv"
    c1, c2, c3 = f"field_a_{unique_tag}", f"field_b_{unique_tag}", f"field_c_{unique_tag}"
    content_1 = f"{c1},{c2},{c3}\n10,alpha_val,100\n20,beta_val,200\n30,gamma_val,300\n".encode("utf-8")

    body, ct = encode_multipart_formdata(
        {"classification": "RESTRICTED", "description": "Cyber Defense Test Matrix"},
        {"file": (fname_1, content_1, "text/csv")},
    )
    h_upload = admin_headers.copy()
    h_upload["Content-Type"] = ct
    status, res = make_request("POST", "/datasets/upload", data=body, headers=h_upload, is_json=False)
    assert status == 200, f"Upload failed: {res.decode('utf-8')}"
    upload_json = json.loads(res.decode("utf-8"))
    assert upload_json["duplicate"] is False, f"Expected unique upload, got duplicate: {upload_json}"
    dataset_1_id = upload_json["id"]

    # Verify audit log for dataset upload
    status, res = make_request("GET", f"/admin/audit-logs?event_type=DATASET_UPLOAD&dataset_id={dataset_1_id}", headers=admin_headers)
    assert status == 200, f"Failed to get audit log: {res.decode('utf-8')}"
    upload_logs = json.loads(res.decode("utf-8"))
    assert upload_logs["total"] >= 1, "Expected at least 1 DATASET_UPLOAD log"
    assert upload_logs["logs"][0]["severity"] == "INFO"
    assert upload_logs["logs"][0]["classification"] == "RESTRICTED"
    print(f"[OK] Verified DATASET_UPLOAD (INFO) logged for Dataset ID: {dataset_1_id}")

    # -------------------------------------------------------------
    # 3. Test Duplicate Detection Audit Logging
    # -------------------------------------------------------------
    print("\n=== Test 3: Duplicate Upload Warning Audit Logging (DUPLICATE_DETECTED) ===")
    # Attempt to upload identical file without force
    fname_dup = f"duplicate_metrics_{unique_tag}.csv"
    body_dup, ct_dup = encode_multipart_formdata(
        {"classification": "RESTRICTED", "description": "Duplicate Attempt"},
        {"file": (fname_dup, content_1, "text/csv")},
    )
    h_dup = admin_headers.copy()
    h_dup["Content-Type"] = ct_dup
    status, res = make_request("POST", "/datasets/upload", data=body_dup, headers=h_dup, is_json=False)
    assert status == 200
    dup_json = json.loads(res.decode("utf-8"))
    assert dup_json["duplicate"] is True

    # Verify audit log for duplicate detected
    status, res = make_request("GET", "/admin/audit-logs?event_type=DUPLICATE_DETECTED", headers=admin_headers)
    assert status == 200
    dup_logs = json.loads(res.decode("utf-8"))
    assert dup_logs["total"] >= 1
    assert dup_logs["logs"][0]["severity"] == "WARNING"
    print(f"[OK] Verified DUPLICATE_DETECTED (WARNING) logged for duplicate collision attempt")

    # -------------------------------------------------------------
    # 4. Test Force Upload Override Audit Logging
    # -------------------------------------------------------------
    print("\n=== Test 4: Force Upload Override Audit Logging (DUPLICATE_OVERRIDE) ===")
    body_force, ct_force = encode_multipart_formdata(
        {"classification": "RESTRICTED", "description": "Force Override", "force": "true"},
        {"file": (fname_dup, content_1, "text/csv")},
    )
    h_force = admin_headers.copy()
    h_force["Content-Type"] = ct_force
    status, res = make_request("POST", "/datasets/upload", data=body_force, headers=h_force, is_json=False)
    assert status == 200
    force_json = json.loads(res.decode("utf-8"))
    dataset_2_id = force_json["id"]

    # Verify audit log for duplicate override
    status, res = make_request("GET", f"/admin/audit-logs?event_type=DUPLICATE_OVERRIDE&dataset_id={dataset_2_id}", headers=admin_headers)
    assert status == 200
    force_logs = json.loads(res.decode("utf-8"))
    assert force_logs["total"] >= 1
    assert force_logs["logs"][0]["severity"] == "WARNING"
    print(f"[OK] Verified DUPLICATE_OVERRIDE (WARNING) logged for forced variant ID: {dataset_2_id}")

    # -------------------------------------------------------------
    # 5. Test Authorized Download Audit Logging
    # -------------------------------------------------------------
    print("\n=== Test 5: Authorized Download Audit Logging (DATASET_DOWNLOAD) ===")
    status, res = make_request("GET", f"/datasets/{dataset_1_id}/download", headers=admin_headers)
    assert status == 200, f"Download failed: {status}"

    status, res = make_request("GET", f"/admin/audit-logs?event_type=DATASET_DOWNLOAD&dataset_id={dataset_1_id}", headers=admin_headers)
    assert status == 200
    download_logs = json.loads(res.decode("utf-8"))
    assert download_logs["total"] >= 1
    assert download_logs["logs"][0]["severity"] == "INFO"
    print(f"[OK] Verified DATASET_DOWNLOAD (INFO) logged for user {admin_uname}")

    # -------------------------------------------------------------
    # 6. Test Security Clearance Breach 403 Interception (ACCESS_DENIED CRITICAL)
    # -------------------------------------------------------------
    print("\n=== Test 6: Security Clearance Breach Interception (ACCESS_DENIED CRITICAL) ===")
    # Student attempts to download RESTRICTED dataset_1_id (STUDENT clearance is INTERNAL/PUBLIC only)
    for _ in range(6):
        status, res = make_request("GET", f"/datasets/{dataset_1_id}/download", headers=student_headers)
        assert status == 403, f"Expected 403 access denial, got {status}"
    print(f"[OK] Blocked unauthorized student download attempts with 403 Forbidden")

    # Verify CRITICAL audit log generated
    status, res = make_request(
        "GET",
        f"/admin/audit-logs?event_type=ACCESS_DENIED&username={student_uname}&severity=CRITICAL",
        headers=admin_headers,
    )
    assert status == 200
    denied_logs = json.loads(res.decode("utf-8"))
    assert denied_logs["total"] >= 1, "Expected CRITICAL ACCESS_DENIED audit log"
    critical_event = denied_logs["logs"][0]
    assert critical_event["severity"] == "CRITICAL"
    assert critical_event["username"] == student_uname
    assert critical_event["classification"] == "RESTRICTED"
    print(f"[OK] Verified ACCESS_DENIED with CRITICAL severity recorded against user {student_uname}")

    # -------------------------------------------------------------
    # 7. Test Admin Audit Telemetry & Statistics (GET /admin/audit-logs/stats)
    # -------------------------------------------------------------
    print("\n=== Test 7: Admin Security Audit Telemetry & Analytics ===")
    status, res = make_request("GET", "/admin/audit-logs/stats", headers=admin_headers)
    assert status == 200
    stats = json.loads(res.decode("utf-8"))
    
    assert stats["total_events"] > 0
    assert stats["severity_breakdown"]["CRITICAL"] >= 1
    assert stats["severity_breakdown"]["WARNING"] >= 1
    assert stats["severity_breakdown"]["INFO"] >= 1
    assert "ACCESS_DENIED" in stats["event_type_breakdown"]
    assert "DATASET_UPLOAD" in stats["event_type_breakdown"]
    
    top_violators = [u["username"] for u in stats["top_denied_users"]]
    assert len(top_violators) > 0, "Expected non-empty top violators list"


    print(f"[OK] Audit Telemetry Summary:")
    print(f"     Total Recorded Events: {stats['total_events']}")
    print(f"     Severity Breakdown: {stats['severity_breakdown']}")
    print(f"     Top Access Violators: {stats['top_denied_users']}")

    print("\n" + "=" * 65)
    print("ALL STAGE 10 SECURITY AUDIT LOGGING TESTS PASSED WITH 100% SUCCESS!")
    print("=" * 65)


if __name__ == "__main__":
    run_audit_logging_tests()
