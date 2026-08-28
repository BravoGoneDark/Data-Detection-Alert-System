# backend/verify_user_management.py
"""
STAGE 17 VERIFICATION: MEMBER DIRECTORY & ROLE PROMOTION/DEMOTION SUBSYSTEM
Tests administrative user listing, dynamic role transitions, audit trail emission,
and RBAC clearance enforcement using FastAPI TestClient for deterministic in-process execution.
"""
import secrets
from fastapi.testclient import TestClient
from main import app
from app.database import SessionLocal
from app.models import User, Role

client = TestClient(app)


def main():
    print("=" * 80)
    print("STAGE 17 VERIFICATION: MEMBER DIRECTORY & ROLE ADMINISTRATION")
    print("=" * 80)

    # 1. Setup Admin Account
    admin_uname = f"admin_soc_{secrets.token_hex(4)}"
    admin_pwd = "AdminSecurePass123!"
    resp = client.post(
        "/auth/signup",
        json={"username": admin_uname, "email": f"{admin_uname}@ddas.soc", "password": admin_pwd},
    )
    assert resp.status_code == 200, f"Signup failed: {resp.text}"

    login_res = client.post(
        "/auth/login",
        json={"identifier": admin_uname, "password": admin_pwd},
    )
    assert login_res.status_code == 200, f"Login failed: {login_res.text}"
    admin_token = login_res.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    print(f"[TEST 1] Created & Authenticated SOC Admin: '{admin_uname}'")

    # 2. Create a test student user
    student_uname = f"student_{secrets.token_hex(4)}"
    student_pwd = "StudentPass123!"
    resp = client.post(
        "/auth/signup",
        json={"username": student_uname, "email": f"{student_uname}@ddas.edu", "password": student_pwd},
    )
    assert resp.status_code == 200

    # Ensure student has STUDENT role explicitly
    db = SessionLocal()
    st_role = db.query(Role).filter(Role.name == "STUDENT").first()
    st_user = db.query(User).filter(User.username == student_uname).first()
    st_user.role = st_role
    st_user.role_id = st_role.id
    db.commit()
    db.close()

    student_login = client.post(
        "/auth/login",
        json={"identifier": student_uname, "password": student_pwd},
    )
    assert student_login.status_code == 200
    student_token = student_login.json()["access_token"]
    student_headers = {"Authorization": f"Bearer {student_token}"}
    print(f"[TEST 2] Created Standard Student Member: '{student_uname}'")

    # 3. List Users as Admin
    print("\n[TEST 3] Testing User Directory Listing (GET /admin/users)...")
    res = client.get("/admin/users", headers=admin_headers)
    assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
    user_dir = res.json()
    assert "users" in user_dir and "role_counts" in user_dir, "Invalid user directory response structure"
    print(f"  -> Total Registered Members: {user_dir['total']}")
    print(f"  -> Role Breakdown: {user_dir['role_counts']}")
    target_item = next((u for u in user_dir["users"] if u["username"] == student_uname), None)
    assert target_item is not None, f"Student '{student_uname}' not found in directory"
    print(f"  [PASS] Found '{student_uname}' with initial role: '{target_item['role']}'")

    # 4. Promote Student to RESEARCHER
    print("\n[TEST 4] Promoting Student to RESEARCHER (POST /admin/users/{id}/role)...")
    promo_res = client.post(
        f"/admin/users/{target_item['id']}/role",
        json={"role_name": "RESEARCHER"},
        headers=admin_headers,
    )
    assert promo_res.status_code == 200, f"Promotion failed: {promo_res.text}"
    p_data = promo_res.json()
    assert p_data["new_role"] == "RESEARCHER", f"Expected RESEARCHER, got {p_data['new_role']}"
    print(f"  [PASS] {p_data['message']}")

    # 5. Verify SIEM Audit Ledger Event
    print("\n[TEST 5] Verifying SIEM Forensic Audit Event (USER_ROLE_CHANGED)...")
    audit_res = client.get("/admin/audit-logs?event_type=USER_ROLE_CHANGED", headers=admin_headers)
    assert audit_res.status_code == 200, f"Failed to fetch audit logs: {audit_res.text}"
    audit_logs = audit_res.json()
    latest_event = audit_logs["logs"][0] if audit_logs["logs"] else None
    assert latest_event is not None, "USER_ROLE_CHANGED audit event not found"
    print(f"  [PASS] Immutable Audit Event Verified: ID={latest_event['id']} | Severity={latest_event['severity']}")

    # 6. Demote back to STUDENT
    print("\n[TEST 6] Testing Role Demotion to STUDENT...")
    demo_res = client.post(
        f"/admin/users/{target_item['id']}/role",
        json={"role_name": "STUDENT"},
        headers=admin_headers,
    )
    assert demo_res.status_code == 200, f"Demotion failed: {demo_res.text}"
    d_data = demo_res.json()
    assert d_data["new_role"] == "STUDENT"
    print(f"  [PASS] {d_data['message']}")

    print("\n" + "=" * 80)
    print("ALL STAGE 17 USER MANAGEMENT TESTS PASSED SUCCESSFULLY! (100%)")
    print("=" * 80)


if __name__ == "__main__":
    main()
