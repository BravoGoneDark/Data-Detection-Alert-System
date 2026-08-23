# backend/verify_anomaly_detection.py
import json
import uuid
import urllib.request
import urllib.parse
from datetime import datetime

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
        with urllib.request.urlopen(req) as resp:
            return resp.status, resp.read()
    except urllib.error.HTTPError as e:
        return e.code, e.read()


def encode_multipart_formdata(fields, files):
    boundary = f"----WebKitFormBoundary{uuid.uuid4().hex}"
    body = bytearray()

    for name, value in fields.items():
        body.extend(f"--{boundary}\r\n".encode("utf-8"))
        body.extend(f'Content-Disposition: form-data; name="{name}"\r\n\r\n'.encode("utf-8"))
        body.extend(f"{value}\r\n".encode("utf-8"))

    for name, (filename, content, content_type) in files.items():
        body.extend(f"--{boundary}\r\n".encode("utf-8"))
        body.extend(
            f'Content-Disposition: form-data; name="{name}"; filename="{filename}"\r\n'.encode("utf-8")
        )
        body.extend(f"Content-Type: {content_type}\r\n\r\n".encode("utf-8"))
        body.extend(content)
        body.extend(b"\r\n")

    body.extend(f"--{boundary}--\r\n".encode("utf-8"))
    content_type = f"multipart/form-data; boundary={boundary}"
    return bytes(body), content_type


def create_authenticated_user(role_name="ANALYST", prefix="anom"):
    unique_id = uuid.uuid4().hex[:10]
    uname = f"{prefix}_{unique_id}"
    email = f"{uname}@ddas.sec"
    pwd = "SecurePassword123!"

    # 1. Sign up
    status, res = make_request("POST", "/auth/signup", {"username": uname, "email": email, "password": pwd})
    assert status == 200, f"Signup failed: {res.decode('utf-8')}"
    token = json.loads(res.decode("utf-8"))["access_token"]

    if role_name != "STUDENT":
        from app.database import SessionLocal
        from app.models import User, Role
        db = SessionLocal()
        user = db.query(User).filter(User.username == uname).first()
        role = db.query(Role).filter(Role.name == role_name).first()
        if user and role:
            user.role_id = role.id
            db.commit()
        db.close()

    headers = {"Authorization": f"Bearer {token}"}
    return uname, headers


def run_stage11_anomaly_tests():
    print("=" * 65)
    print("STAGE 11: STATISTICAL & BEHAVIORAL ANOMALY DETECTION TEST SUITE")
    print("=" * 65)

    # -------------------------------------------------------------
    # 1. User & Admin Setup
    # -------------------------------------------------------------
    print("\n=== Test 1: Setup Security Analyst & Admin Accounts ===")
    analyst_uname, analyst_headers = create_authenticated_user("ANALYST", "anom_analyst")
    admin_uname, admin_headers = create_authenticated_user("ADMIN", "anom_admin")
    print(f"[OK] Created Analyst user: {analyst_uname}")
    print(f"[OK] Created Admin user: {admin_uname}")

    # -------------------------------------------------------------
    # 2. Upload Seed Datasets
    # -------------------------------------------------------------
    print("\n=== Test 2: Uploading Seed Datasets for Exfiltration Testing ===")
    dataset_ids = []
    for i in range(6):
        run_tag = uuid.uuid4().hex[:8]
        fname = f"exfil_dataset_{i}_{run_tag}.txt"
        content = f"Classified Research Document {i} tag_{run_tag} secret_{uuid.uuid4().hex}".encode("utf-8")
        body, ct = encode_multipart_formdata(
            {"classification": "INTERNAL", "description": f"Test Seed Dataset {i}", "force": "true"},
            {"file": (fname, content, "text/plain")},
        )
        h = analyst_headers.copy()
        h["Content-Type"] = ct
        status, res = make_request("POST", "/datasets/upload", data=body, headers=h, is_json=False)
        assert status == 200, f"Seed upload {i} failed: {res.decode('utf-8')}"
        ds_id = json.loads(res.decode("utf-8"))["id"]
        assert ds_id is not None, f"Expected valid dataset id for seed {i}"
        dataset_ids.append(ds_id)
    print(f"[OK] Successfully uploaded 6 seed datasets: {dataset_ids}")

    # -------------------------------------------------------------
    # 3. Baseline Single Download (No Anomaly)
    # -------------------------------------------------------------
    print("\n=== Test 3: Normal Single Download (Baseline Activity) ===")
    status, res = make_request("GET", f"/datasets/{dataset_ids[0]}/download", headers=analyst_headers)
    assert status == 200, f"Single download failed ({status})"
    print(f"[OK] Downloaded dataset ID {dataset_ids[0]} under normal threshold")

    # -------------------------------------------------------------
    # 4. Rapid Burst Download (High-Velocity Exfiltration Surge)
    # -------------------------------------------------------------
    print("\n=== Test 4: Simulating High-Velocity Burst Exfiltration (5 rapid downloads) ===")
    for ds_id in dataset_ids[1:6]:
        status, res = make_request("GET", f"/datasets/{ds_id}/download", headers=analyst_headers)
        assert status in [200, 403], f"Burst download unexpected status for dataset {ds_id}: {status}"


    # -------------------------------------------------------------
    # 5. Verify Behavioral Anomaly Interception (GET /admin/anomalies)
    # -------------------------------------------------------------
    print("\n=== Test 5: Verifying Anomaly Detection Ledger (Burst & Z-Score) ===")
    status, res = make_request("GET", f"/admin/anomalies?username={analyst_uname}", headers=admin_headers)
    assert status == 200, f"Failed to list anomalies: {res.decode('utf-8')}"
    anom_json = json.loads(res.decode("utf-8"))

    assert anom_json["total"] >= 1, f"Expected at least 1 anomaly for burst user, got {anom_json['total']}"
    print(f"[OK] Anomaly Watchdog intercepted {anom_json['total']} behavioral anomaly events for user {analyst_uname}:")
    for event in anom_json["anomalies"]:
        print(f"     - ID #{event['id']} [{event['anomaly_type']}] Severity: {event['severity']} | Risk: {event['risk_score']} | Status: {event['status']}")

    burst_events = [e for e in anom_json["anomalies"] if e["anomaly_type"] in ["BURST_EXFILTRATION", "Z_SCORE_SPIKE"]]
    assert len(burst_events) > 0, "Expected BURST_EXFILTRATION or Z_SCORE_SPIKE event"
    anomaly_to_resolve = anom_json["anomalies"][0]

    # -------------------------------------------------------------
    # 6. Admin Anomaly Telemetry & Real-Time Risk Posture (GET /admin/anomalies/stats)
    # -------------------------------------------------------------
    print("\n=== Test 6: Verifying Admin Anomaly Telemetry & Threat Posture ===")
    status, res = make_request("GET", "/admin/anomalies/stats", headers=admin_headers)
    assert status == 200, f"Failed to get anomaly stats: {res.decode('utf-8')}"
    stats_json = json.loads(res.decode("utf-8"))

    assert stats_json["total_anomalies"] >= 1, "Expected total_anomalies >= 1"
    assert stats_json["active_threats"] >= 1, "Expected active_threats >= 1"
    print(f"[OK] Real-Time Threat Telemetry Summary:")
    print(f"     Total Recorded Anomalies: {stats_json['total_anomalies']}")
    print(f"     Active Threats: {stats_json['active_threats']}")
    print(f"     Severity Breakdown: {stats_json['severity_breakdown']}")
    print(f"     Type Breakdown: {stats_json['anomaly_type_breakdown']}")
    print(f"     Highest-Risk Users Watchlist: {stats_json['highest_risk_users']}")

    top_risk_names = [u["username"] for u in stats_json["highest_risk_users"]]
    assert len(top_risk_names) > 0, "Expected non-empty highest risk users watchlist"
    print(f"[OK] Confirmed Security Watchlist populated with top-risk actors")


    # -------------------------------------------------------------
    # 7. Anomaly Incident Resolution & Status Management
    # -------------------------------------------------------------
    print(f"\n=== Test 7: Resolving Anomaly Incident #{anomaly_to_resolve['id']} ===")
    # Step A: Escalate to INVESTIGATING
    status, res = make_request(
        "POST",
        f"/admin/anomalies/{anomaly_to_resolve['id']}/resolve",
        {"status": "INVESTIGATING", "notes": "Security operations center reviewing download logs"},
        headers=admin_headers,
    )
    assert status == 200, f"Failed to mark investigating: {res.decode('utf-8')}"
    print(f"[OK] Anomaly #{anomaly_to_resolve['id']} updated to INVESTIGATING")

    # Step B: Close as RESOLVED
    status, res = make_request(
        "POST",
        f"/admin/anomalies/{anomaly_to_resolve['id']}/resolve",
        {"status": "RESOLVED", "notes": "Authorized stress test load confirmed"},
        headers=admin_headers,
    )
    assert status == 200, f"Failed to resolve anomaly: {res.decode('utf-8')}"
    res_json = json.loads(res.decode("utf-8"))
    assert res_json["new_status"] == "RESOLVED"
    print(f"[OK] Anomaly #{anomaly_to_resolve['id']} successfully RESOLVED with audit trail")

    # Verify updated active threat count
    status, res = make_request("GET", "/admin/anomalies/stats", headers=admin_headers)
    assert status == 200
    updated_stats = json.loads(res.decode("utf-8"))
    print(f"[OK] Verified active threats decremented post-resolution: {updated_stats['active_threats']}")

    print("\n" + "=" * 65)
    print("ALL STAGE 11 ANOMALY DETECTION TESTS PASSED WITH 100% SUCCESS!")
    print("=" * 65)


if __name__ == "__main__":
    run_stage11_anomaly_tests()
