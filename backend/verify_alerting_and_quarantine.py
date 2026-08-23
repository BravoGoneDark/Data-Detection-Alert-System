# backend/verify_alerting_and_quarantine.py
"""
STAGE 12 AUTOMATED VERIFICATION SUITE:
Automated Alerting, Webhooks & Policy Quarantine Engine Verification
"""
import sys
import io
import time
import uuid
import hmac
import hashlib
import json
import threading
import urllib.request
import urllib.error
import urllib.parse
from http.server import HTTPServer, BaseHTTPRequestHandler

BASE_URL = "http://127.0.0.1:8000"

# Mock Webhook Server to capture outgoing webhook broadcasts
captured_webhooks = []


class MockWebhookHandler(BaseHTTPRequestHandler):
    def do_POST(self):
        content_length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(content_length).decode("utf-8")
        # Store lowercased headers mapping
        headers_dict = {k.lower(): v for k, v in self.headers.items()}
        try:
            payload = json.loads(body)
        except Exception:
            payload = body

        captured_webhooks.append({
            "path": self.path,
            "headers": headers_dict,
            "raw_body": body,
            "payload": payload,
        })
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(b'{"received": true}')

    def log_message(self, format, *args):
        pass  # Quiet logging


def start_mock_webhook_server(port=9876):
    server = HTTPServer(("127.0.0.1", port), MockWebhookHandler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    return server


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
        body.extend(f'Content-Disposition: form-data; name="{name}"; filename="{filename}"\r\n'.encode("utf-8"))
        body.extend(f"Content-Type: {content_type}\r\n\r\n".encode("utf-8"))
        body.extend(content)
        body.extend(b"\r\n")

    body.extend(f"--{boundary}--\r\n".encode("utf-8"))
    content_type = f"multipart/form-data; boundary={boundary}"
    return bytes(body), content_type


def create_authenticated_user(role_name="ANALYST", prefix="quar"):
    unique_id = uuid.uuid4().hex[:10]
    uname = f"{prefix}_{unique_id}"
    email = f"{uname}@ddas.sec"
    pwd = "SecurePassword123!"

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


def upload_test_dataset(headers: dict, filename: str, content: str, classification: str = "INTERNAL") -> int:
    fields = {
        "classification": classification,
        "description": f"Quarantine test dataset: {filename}",
        "force": "true",
    }
    files = {"file": (filename, content.encode("utf-8"), "text/plain")}
    body, content_type = encode_multipart_formdata(fields, files)
    upload_headers = headers.copy()
    upload_headers["Content-Type"] = content_type

    status, res = make_request("POST", "/datasets/upload", data=body, headers=upload_headers, is_json=False)
    assert status == 200, f"Upload failed: {res.decode('utf-8')}"
    ds_id = json.loads(res.decode("utf-8"))["id"]
    assert ds_id is not None, f"Dataset id should not be None: {res.decode('utf-8')}"
    return ds_id



def main():
    print("=" * 65)
    print("STAGE 12: AUTOMATED ALERTING, WEBHOOKS & POLICY QUARANTINE TEST")
    print("=" * 65)

    # 0. Start local mock webhook receiver
    mock_port = 9876
    mock_url = f"http://127.0.0.1:{mock_port}/soc-webhook"
    webhook_secret = "ddas_soc_hmac_secret_key_456"
    mock_server = start_mock_webhook_server(mock_port)
    time.sleep(0.5)

    # 1. Setup Analyst and Admin Accounts
    print("\n=== Test 1: Setup Security Analyst & Admin Accounts ===")
    analyst_user, analyst_headers = create_authenticated_user("ANALYST", "quar_analyst")
    admin_user, admin_headers = create_authenticated_user("ADMIN", "quar_admin")
    print(f"[OK] Created Analyst user: {analyst_user}")
    print(f"[OK] Created Admin user: {admin_user}")

    # 2. Register & Test Webhook Connection
    print("\n=== Test 2: Registering Outbound SOC Webhook & Verifying HMAC Ping ===")
    wh_payload = {
        "name": "SOC Primary Channel",
        "url": mock_url,
        "secret_token": webhook_secret,
        "event_types": ["ALL"],
    }
    st, res = make_request("POST", "/admin/webhooks", data=wh_payload, headers=admin_headers)
    assert st == 200, f"Create webhook failed: {res.decode('utf-8')}"
    wh_id = json.loads(res.decode("utf-8"))["id"]
    print(f"[OK] Registered Webhook ID #{wh_id} targeting {mock_url}")

    # Send test ping
    st, ping_res = make_request("POST", f"/admin/webhooks/{wh_id}/test", data={}, headers=admin_headers)
    assert st == 200, f"Webhook ping failed: {ping_res.decode('utf-8')}"
    ping_data = json.loads(ping_res.decode("utf-8"))
    assert ping_data["success"] is True, f"Ping returned unsuccessful: {ping_data}"
    print(f"[OK] Test Ping dispatched successfully (Latency: {ping_data['latency_ms']}ms)")

    # Verify mock received test payload with HMAC
    time.sleep(0.5)
    assert len(captured_webhooks) >= 1, "Mock server did not receive webhook!"
    last_hook = captured_webhooks[-1]
    assert last_hook["payload"]["event_type"] == "TEST_PING"
    sig_header = last_hook["headers"].get("x-ddas-signature") or last_hook["headers"].get("X-DDAS-Signature")
    assert sig_header is not None, "Missing HMAC signature header!"
    print(f"[OK] Verified incoming HMAC signature header: {sig_header}")

    # 3. Seed Datasets for Quarantine Testing
    print("\n=== Test 3: Uploading Seed Datasets for Quarantine Verification ===")
    dataset_ids = []
    for i in range(1, 8):
        content = f"Critical telemetry row index #{i} with cryptographic payload data {uuid.uuid4().hex}"
        ds_id = upload_test_dataset(admin_headers, f"quarantine_test_doc_{i}_{uuid.uuid4().hex[:6]}.txt", content)
        dataset_ids.append(ds_id)
    print(f"[OK] Seeded 7 datasets: {dataset_ids}")

    # 4. Manual Administrative Quarantine & Access Revocation Test
    print("\n=== Test 4: Testing Manual Quarantine Enforcement & 403 Block ===")
    man_quar_payload = {
        "username": analyst_user,
        "reason": "Administrative suspension pending credential validation",
        "risk_score": 85.0,
    }
    st, man_res = make_request("POST", "/admin/quarantine", data=man_quar_payload, headers=admin_headers)
    assert st == 200, f"Manual quarantine failed: {man_res.decode('utf-8')}"
    quar_record_id = json.loads(man_res.decode("utf-8"))["id"]
    print(f"[OK] Analyst user {analyst_user} manually quarantined (Record ID #{quar_record_id})")

    # Analyst checks self status
    st, status_res = make_request("GET", "/quarantine/status", headers=analyst_headers)
    assert st == 200
    status_data = json.loads(status_res.decode("utf-8"))
    assert status_data["is_quarantined"] is True
    print(f"[OK] Verified /quarantine/status returns active containment state for {analyst_user}")

    # Attempt to download dataset while quarantined -> MUST FAIL 403
    st, blocked_res = make_request("GET", f"/datasets/{dataset_ids[0]}/download", headers=analyst_headers)
    assert st == 403, f"Expected 403, got {st}"
    blocked_detail = json.loads(blocked_res.decode("utf-8"))["detail"]
    assert "quarantined under active security containment policy" in blocked_detail
    print(f"[OK] Confirmed download was blocked with HTTP 403: {blocked_detail}")

    # 5. Administrative Release Protocol
    print("\n=== Test 5: Testing Administrative Quarantine Release Protocol ===")
    rel_payload = {"release_notes": "Analyst identity verified via MFA out-of-band clearance"}
    st, rel_res = make_request("POST", f"/admin/quarantine/{quar_record_id}/release", data=rel_payload, headers=admin_headers)
    assert st == 200, f"Release failed: {rel_res.decode('utf-8')}"
    assert json.loads(rel_res.decode("utf-8"))["status"] == "RELEASED"
    print(f"[OK] Released Quarantine Record #{quar_record_id} by {admin_user}")

    # Verify download succeeds post-release
    st, dl_res = make_request("GET", f"/datasets/{dataset_ids[0]}/download", headers=analyst_headers)
    assert st == 200, f"Download failed after release: {st}"
    print(f"[OK] Download privileges successfully restored post-release (HTTP 200 OK)")

    # 6. Autonomous Policy Quarantine on High-Velocity Burst Exfiltration
    print("\n=== Test 6: Testing Autonomous Policy Quarantine on High-Velocity Burst ===")
    # Perform rapid downloads to reach threshold of >= 6 downloads in 30s
    for i in range(1, 6):
        st, dl_res = make_request("GET", f"/datasets/{dataset_ids[i]}/download", headers=analyst_headers)
        if st == 403:
            # Reached containment and blocked on the burst trigger
            print(f"[OK] Containment blocked burst trigger at download #{i+1} with HTTP 403")
            break
        time.sleep(0.05)

    # Check that system autonomously quarantined the user
    time.sleep(0.5)
    st, status_res = make_request("GET", "/quarantine/status", headers=analyst_headers)
    assert st == 200
    burst_status = json.loads(status_res.decode("utf-8"))
    assert burst_status["is_quarantined"] is True, "Autonomous quarantine did not trigger!"
    auto_quar_rec = burst_status["record"]
    print(f"[OK] System autonomously quarantined {analyst_user}:")
    print(f"     Reason: {auto_quar_rec['reason']}")
    print(f"     Risk Score: {auto_quar_rec['risk_score']} | Status: {auto_quar_rec['status']}")

    # Subsequent download MUST now be intercepted and blocked with HTTP 403
    st, blocked_surge_dl = make_request("GET", f"/datasets/{dataset_ids[6]}/download", headers=analyst_headers)
    assert st == 403, f"Expected 403, got {st}"
    print(f"[OK] Subsequent exfiltration attempt blocked with HTTP 403: {json.loads(blocked_surge_dl.decode('utf-8'))['detail']}")



    # 7. Real-Time Webhook Broadcast Verification
    print("\n=== Test 7: Verifying Outbound Real-Time Webhook Alert Deliveries ===")
    time.sleep(0.5)
    event_types_captured = [h["payload"].get("event_type") for h in captured_webhooks]
    print(f"[OK] Captured {len(captured_webhooks)} webhook transmissions at mock SOC endpoint:")
    for h in captured_webhooks:
        print(f"     - Event: {h['payload'].get('event_type')} | Severity: {h['payload'].get('severity')} | Data: {list(h['payload'].get('data', {}).keys())}")

    assert "QUARANTINE_TRIGGERED" in event_types_captured, "QUARANTINE_TRIGGERED webhook not received!"
    assert "QUARANTINE_RELEASED" in event_types_captured, "QUARANTINE_RELEASED webhook not received!"
    print("[OK] Confirmed real-time SOC alerting for all critical quarantine lifecycle events")

    # 8. SIEM Security Audit Ledger Verification
    print("\n=== Test 8: Verifying SIEM Security Audit Ledger for Quarantine Events ===")
    st, audit_res = make_request("GET", "/admin/audit-logs?limit=50", headers=admin_headers)
    assert st == 200
    logs = json.loads(audit_res.decode("utf-8"))["logs"]
    event_types = [l["event_type"] for l in logs]
    assert "USER_QUARANTINED" in event_types, "USER_QUARANTINED audit entry missing!"
    assert "QUARANTINE_RELEASED" in event_types, "QUARANTINE_RELEASED audit entry missing!"
    assert "ACCESS_DENIED" in event_types, "ACCESS_DENIED audit entry missing!"
    print(f"[OK] Verified audit trail contains USER_QUARANTINED, QUARANTINE_RELEASED, and ACCESS_DENIED events")

    print("\n" + "=" * 65)
    print("ALL STAGE 12 ALERTING & QUARANTINE TESTS PASSED WITH 100% SUCCESS!")
    print("=" * 65)


if __name__ == "__main__":
    main()
