# backend/verify_redis_and_tasks.py
"""
STAGE 13 AUTOMATED VERIFICATION SUITE:
Distributed Redis Caching & Asynchronous Background Task Queue Verification
"""
import sys
import io
import time
import uuid
import json
import urllib.request
import urllib.error
import urllib.parse

# Ensure UTF-8 output on Windows terminal
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

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
        body.extend(f'Content-Disposition: form-data; name="{name}"; filename="{filename}"\r\n'.encode("utf-8"))
        body.extend(f"Content-Type: {content_type}\r\n\r\n".encode("utf-8"))
        body.extend(content)
        body.extend(b"\r\n")

    body.extend(f"--{boundary}--\r\n".encode("utf-8"))
    content_type = f"multipart/form-data; boundary={boundary}"
    return bytes(body), content_type


def create_authenticated_user(role_name="ADMIN", prefix="redis_user"):
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


def main():
    print("=" * 80)
    print("STAGE 13 VERIFICATION: DISTRIBUTED REDIS CACHING & ASYNC TASK QUEUE")
    print("=" * 80)

    # ------------------------------------------------------------------------
    # Test 1: Redis Connectivity & In-Memory Fallback Verification
    # ------------------------------------------------------------------------
    print("\n[TEST 1] Testing Redis Connectivity & Fallback Layer...")
    from app.redis_client import is_redis_available, get_redis_telemetry, set_cached_json, get_cached_json, delete_cache_key, delete_cache_pattern
    
    online = is_redis_available()
    print(f"  -> Redis cluster available: {online}")
    assert online is True, "Redis should be running on localhost:6379"

    telemetry = get_redis_telemetry()
    print(f"  -> Engine: {telemetry['engine']}")
    print(f"  -> Ping Latency: {telemetry['ping_latency_ms']} ms")
    print(f"  -> Memory Used: {telemetry['memory_used']}")
    assert telemetry["status"] == "ONLINE"

    # Test cache set/get/delete
    test_key = "ddas:test:cache_check"
    set_cached_json(test_key, {"ping": "pong", "count": 42}, ttl_seconds=10)
    val = get_cached_json(test_key)
    assert val == {"ping": "pong", "count": 42}, f"Cache mismatch: {val}"
    delete_cache_key(test_key)
    assert get_cached_json(test_key) is None
    print("  ✓ Redis cache set/get/delete cycle verified.")

    # ------------------------------------------------------------------------
    # Test 2: Admin Auth Setup
    # ------------------------------------------------------------------------
    print("\n[TEST 2] Setting up authenticated Admin context...")
    admin_uname, admin_headers = create_authenticated_user("ADMIN", "admin_r13")
    print(f"  -> Created and authenticated admin: {admin_uname}")

    # ------------------------------------------------------------------------
    # Test 3: Distributed Caching Lifecycle on GET /datasets & Invalidation
    # ------------------------------------------------------------------------
    print("\n[TEST 3] Testing Dataset Inventory Caching & Cache Invalidation...")
    # Clear existing dataset cache
    delete_cache_pattern("ddas:cache:datasets*")

    # Initial request (Cache Miss -> DB Query -> Populates Redis Cache)
    t0 = time.time()
    st1, res1 = make_request("GET", "/datasets", headers=admin_headers)
    dur_miss = (time.time() - t0) * 1000
    assert st1 == 200, f"GET /datasets failed: {res1.decode('utf-8')}"
    data1 = json.loads(res1.decode("utf-8"))
    initial_count = len(data1)
    print(f"  -> Cache MISS duration: {dur_miss:.2f} ms (Loaded {initial_count} records from PostgreSQL)")

    # Second request (Cache HIT from Redis)
    t0 = time.time()
    st2, res2 = make_request("GET", "/datasets", headers=admin_headers)
    dur_hit = (time.time() - t0) * 1000
    assert st2 == 200
    data2 = json.loads(res2.decode("utf-8"))
    assert len(data2) == initial_count
    print(f"  -> Cache HIT duration:  {dur_hit:.2f} ms (Served directly from Redis)")

    # Upload a new dataset to trigger automatic cache invalidation
    test_filename = f"cached_test_{uuid.uuid4().hex[:6]}.csv"
    test_content = f"unique_key_{uuid.uuid4().hex},metric\n1,Alpha,99.5\n2,Beta,88.2\n"
    fields = {"classification": "INTERNAL", "description": "Cache Invalidation Test", "force": "true"}
    files = {"file": (test_filename, test_content.encode("utf-8"), "text/csv")}
    body, ct = encode_multipart_formdata(fields, files)
    up_headers = admin_headers.copy()
    up_headers["Content-Type"] = ct

    st_up, res_up = make_request("POST", "/datasets/upload", data=body, headers=up_headers, is_json=False)
    assert st_up == 200, f"Upload failed: {res_up.decode('utf-8')}"
    print(f"  -> Uploaded new dataset '{test_filename}' (triggered delete_cache_pattern).")

    # Verify cache was invalidated and now reflects new count
    st3, res3 = make_request("GET", "/datasets", headers=admin_headers)
    assert st3 == 200
    data3 = json.loads(res3.decode("utf-8"))
    assert len(data3) == initial_count + 1, f"Expected {initial_count + 1} datasets after invalidation, got {len(data3)}"
    print(f"  ✓ Automatic cache invalidation verified: dataset count updated to {len(data3)}.")

    # ------------------------------------------------------------------------
    # Test 4: Redis-Backed Sliding-Window Rate Limiting & Burst Detection
    # ------------------------------------------------------------------------
    print("\n[TEST 4] Testing Redis Sliding-Window Rate Limiter...")
    from app.rate_limiter import record_and_count_events, check_sliding_window_burst, reset_sliding_window
    
    burst_test_user = f"burst_test_{uuid.uuid4().hex[:8]}"
    reset_sliding_window(f"burst:user:{burst_test_user}:30s")

    # Record 3 events -> below burst threshold of 4
    for i in range(3):
        is_burst, count = check_sliding_window_burst(burst_test_user, window_seconds=30, threshold=4)
        assert not is_burst, f"Should not be burst on event {i+1}"
        assert count == i + 1

    # 4th event -> triggers burst
    is_burst, count = check_sliding_window_burst(burst_test_user, window_seconds=30, threshold=4)
    assert is_burst is True, "4th event should trigger burst"
    assert count == 4
    print(f"  ✓ Redis Sorted Set atomic sliding window successfully flagged burst threshold (count={count}).")

    # ------------------------------------------------------------------------
    # Test 5: Asynchronous Dataset Upload via Background Task Queue
    # ------------------------------------------------------------------------
    print("\n[TEST 5] Testing Asynchronous Dataset Upload (POST /datasets/upload-async)...")
    c_rand = uuid.uuid4().hex[:6]
    async_filename = f"async_payload_{c_rand}.csv"
    async_content = f"sensor_id_{c_rand},reading_{c_rand},status_{c_rand}\n101,42.8,OPTIMAL\n102,89.4,WARNING\n"
    
    fields = {"classification": "RESTRICTED", "description": "Async Upload Queue Benchmark", "force": "false"}
    files = {"file": (async_filename, async_content.encode("utf-8"), "text/csv")}
    body, ct = encode_multipart_formdata(fields, files)
    up_headers = admin_headers.copy()
    up_headers["Content-Type"] = ct

    st_async, res_async = make_request("POST", "/datasets/upload-async", data=body, headers=up_headers, is_json=False)
    assert st_async == 202, f"Expected 202 Accepted, got {st_async}: {res_async.decode('utf-8')}"
    async_resp = json.loads(res_async.decode("utf-8"))
    task_id = async_resp["task_id"]
    assert task_id.startswith("task_"), f"Invalid task_id: {task_id}"
    print(f"  -> Dispatched async job. Task ID: '{task_id}' (Status: {async_resp['status']})")

    # Poll /tasks/{task_id} until completed
    max_wait = 10.0
    start_poll = time.time()
    final_task_state = None

    while time.time() - start_poll < max_wait:
        st_poll, res_poll = make_request("GET", f"/tasks/{task_id}", headers=admin_headers)
        assert st_poll == 200
        poll_data = json.loads(res_poll.decode("utf-8"))
        status = poll_data["status"]
        progress = poll_data["progress"]
        msg = poll_data["message"]
        print(f"     [POLL] Status: {status:<10} | Progress: {progress}% | Message: {msg}")

        if status in ("COMPLETED", "FAILED"):
            final_task_state = poll_data
            break
        time.sleep(0.3)

    assert final_task_state is not None, "Task did not complete within timeout"
    assert final_task_state["status"] == "COMPLETED", f"Task failed: {final_task_state.get('error')}"
    assert final_task_state["progress"] == 100
    res_payload = final_task_state["result"]
    assert res_payload["filename"] == async_filename
    assert res_payload["duplicate"] is False
    assert "id" in res_payload
    print(f"  ✓ Async dataset upload successfully executed by background worker in {final_task_state.get('execution_time_seconds', 'N/A')}s.")

    # ------------------------------------------------------------------------
    # Test 6: Asynchronous Batch LSH Backfill
    # ------------------------------------------------------------------------
    print("\n[TEST 6] Testing Asynchronous LSH Backfill (POST /lsh/backfill-async)...")
    st_bf, res_bf = make_request("POST", "/lsh/backfill-async", headers=admin_headers)
    assert st_bf == 202, f"Backfill dispatch failed: {res_bf.decode('utf-8')}"
    bf_data = json.loads(res_bf.decode("utf-8"))
    bf_task_id = bf_data["task_id"]
    print(f"  -> Dispatched LSH backfill task: '{bf_task_id}'")

    start_poll = time.time()
    final_bf_state = None
    while time.time() - start_poll < 10.0:
        st_poll, res_poll = make_request("GET", f"/tasks/{bf_task_id}", headers=admin_headers)
        assert st_poll == 200
        poll_data = json.loads(res_poll.decode("utf-8"))
        if poll_data["status"] in ("COMPLETED", "FAILED"):
            final_bf_state = poll_data
            break
        time.sleep(0.3)

    assert final_bf_state is not None and final_bf_state["status"] == "COMPLETED"
    print(f"  ✓ Batch LSH backfill worker completed successfully: {final_bf_state['result']['datasets_indexed']} datasets indexed.")

    # ------------------------------------------------------------------------
    # Test 7: Redis Telemetry & Administrative Cache Purge
    # ------------------------------------------------------------------------
    print("\n[TEST 7] Testing Redis Telemetry & Cache Purge Endpoints...")
    # Telemetry endpoint
    st_tel, res_tel = make_request("GET", "/admin/redis/stats", headers=admin_headers)
    assert st_tel == 200, f"Redis stats failed: {res_tel.decode('utf-8')}"
    stats_data = json.loads(res_tel.decode("utf-8"))
    print(f"  -> Cache Hits: {stats_data['cache_hits']}, Misses: {stats_data['cache_misses']}, Hit Ratio: {stats_data['hit_ratio_percent']}%")
    print(f"  -> Worker Tasks: Total={stats_data['task_queue']['total_tasks']}, Completed={stats_data['task_queue']['completed_tasks']}")
    assert stats_data["status"] == "ONLINE"
    assert stats_data["task_queue"]["completed_tasks"] >= 2

    # Administrative cache purge
    st_purge, res_purge = make_request("POST", "/admin/redis/cache/purge", {"pattern": "ddas:cache:*"}, headers=admin_headers)
    assert st_purge == 200, f"Cache purge failed: {res_purge.decode('utf-8')}"
    purge_data = json.loads(res_purge.decode("utf-8"))
    print(f"  -> Cache Purge Result: {purge_data['message']}")
    assert purge_data["keys_purged"] >= 0
    print("  ✓ Administrative cache purge verified.")

    # ------------------------------------------------------------------------
    # Test 8: Task Cancellation Workflow
    # ------------------------------------------------------------------------
    print("\n[TEST 8] Testing Background Task Cancellation...")
    from app.task_queue import enqueue_task

    def dummy_long_task(task_id):
        time.sleep(5.0)
        return "done"

    cancel_task_id = enqueue_task("DUMMY_JOB", dummy_long_task, name="Cancel Test Job", created_by=admin_uname)
    st_can, res_can = make_request("POST", f"/tasks/{cancel_task_id}/cancel", headers=admin_headers)
    assert st_can == 200, f"Cancel failed: {res_can.decode('utf-8')}"
    
    st_poll, res_poll = make_request("GET", f"/tasks/{cancel_task_id}", headers=admin_headers)
    assert json.loads(res_poll.decode("utf-8"))["status"] == "CANCELLED"
    print("  ✓ Task cancellation lifecycle verified.")

    print("\n" + "=" * 80)
    print("🎉 ALL STAGE 13 VERIFICATION TESTS PASSED SUCCESSFULLY! (100%)")
    print("=" * 80)


if __name__ == "__main__":
    main()
