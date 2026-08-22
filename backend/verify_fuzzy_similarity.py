import urllib.request
import urllib.error
import json
import time
import uuid

BASE_URL = "http://127.0.0.1:8000"


def make_request(method, endpoint, data=None, headers=None, is_json=True):
    url = f"{BASE_URL}{endpoint}"
    req_headers = headers.copy() if headers else {}
    req_data = None

    if data is not None:
        if is_json:
            req_data = json.dumps(data).encode("utf-8")
            req_headers["Content-Type"] = "application/json"
        else:
            req_data = data

    req = urllib.request.Request(url, data=req_data, headers=req_headers, method=method)
    try:
        with urllib.request.urlopen(req) as response:
            return response.status, response.read()
    except urllib.error.HTTPError as e:
        return e.code, e.read()


def encode_multipart_formdata(fields, files):
    boundary = uuid.uuid4().hex
    crlf = b"\r\n"
    lines = []

    for name, value in fields.items():
        lines.append(f"--{boundary}".encode("utf-8"))
        lines.append(f'Content-Disposition: form-data; name="{name}"'.encode("utf-8"))
        lines.append(b"")
        lines.append(str(value).encode("utf-8"))

    for name, (filename, content, content_type) in files.items():
        lines.append(f"--{boundary}".encode("utf-8"))
        lines.append(
            f'Content-Disposition: form-data; name="{name}"; filename="{filename}"'.encode("utf-8")
        )
        lines.append(f"Content-Type: {content_type}".encode("utf-8"))
        lines.append(b"")
        lines.append(content)

    lines.append(f"--{boundary}--".encode("utf-8"))
    lines.append(b"")

    body = crlf.join(lines)
    content_type_header = f"multipart/form-data; boundary={boundary}"
    return body, content_type_header


def run_fuzzy_tests():
    timestamp = int(time.time())
    print("=== 1. Authentication Setup ===")
    username = f"analyst_{timestamp}"
    email = f"{username}@agency.gov"
    password = "SecurePassword123!"

    status, res = make_request(
        "POST",
        "/auth/signup",
        {"username": username, "email": email, "password": password},
    )
    assert status == 200, f"Signup failed ({status}): {res.decode('utf-8')}"
    token = json.loads(res.decode("utf-8"))["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print(f"[OK] Created user {username} with token")

    topic_seeds = [
        (
            "Astrophysics Magnetar",
            "Magnetospheric Alfvén wave resonance in relativistic neutron stars produces extreme gamma-ray bursts.",
            "Submillimeter cryogenic radio telescopes track high-energy flare polarization and metric tensor strain.",
            "spectrophotometers",
            "spectrophotometrs",
        ),
        (
            "Volcanology Basaltic",
            "Magmatic chamber conduit dynamics in shield volcanoes control subterranean seismic tremor frequency.",
            "Infrared thermal imaging radiometers quantify degassing effusion rates along calderas.",
            "pyroclastic",
            "pyroclastc",
        ),
        (
            "Cryogenics Josephson",
            "Superconducting quantum interference devices in sub-Kelvin dilution refrigerators detect magnetic flux quanta.",
            "Microwave reflectometry probes quantify phase coherence and Cooper pair tunneling impedance.",
            "oscillations",
            "oscillatons",
        ),
        (
            "Aerodynamics Hypersonic",
            "Boundary layer laminar-to-turbulent transition along slender carbon-composite re-entry scramjet waveriders.",
            "Schlieren optical interferometry maps shockwave boundary layer interactions in hypersonic wind tunnels.",
            "calibrations",
            "calibratons",
        ),
    ]
    prefix = f"pfx_{uuid.uuid4().hex[:6]}"
    unique_tag = uuid.uuid4().hex[:8]
    base_tokens = [f"{prefix}_tok_{uuid.uuid4().hex[:6]}" for _ in range(35)]
    word_orig = f"{prefix}_word_{uuid.uuid4().hex[:6]}"
    word_typo = word_orig[:-1] + "x"
    domain_name = f"Fuzzy_{prefix}"

    print("\n=== 2. Testing Unique Upload & 64-bit SimHash Fingerprinting ===")
    fname_v1 = f"{uuid.uuid4().hex}.txt"
    text_v1 = f"Experiment_{prefix} {word_orig} " + " ".join(base_tokens)
    content_v1 = text_v1.encode("utf-8")

    body, ct = encode_multipart_formdata(
        {"classification": "PUBLIC", "description": f"{domain_name} Study {unique_tag}"},
        {"file": (fname_v1, content_v1, "text/plain")},
    )
    h_upload = headers.copy()
    h_upload["Content-Type"] = ct
    status, res = make_request("POST", "/datasets/upload", data=body, headers=h_upload, is_json=False)
    assert status == 200, f"Upload failed ({status}): {res.decode('utf-8')}"
    res_json = json.loads(res.decode("utf-8"))

    assert res_json["duplicate"] is False, f"Expected unique upload, got: {res_json}"
    assert res_json["match_type"] == "UNIQUE"
    assert res_json["simhash"] is not None and res_json["simhash"].startswith("0x"), "Expected valid 64-bit SimHash hex string"
    dataset_v1_id = res_json["id"]
    simhash_v1 = res_json["simhash"]
    print(f"[OK] Unique report uploaded (ID: {dataset_v1_id})")
    print(f"     64-bit SimHash Fingerprint: {simhash_v1}")

    print("\n=== 3. Testing Fuzzy SimHash Mutation Matching (Hamming Distance <= 4 Bits) ===")
    # Version 2 has a single character typo (word_typo instead of word_orig) and different filename
    fname_v2 = f"{uuid.uuid4().hex}.txt"
    text_v2 = f"Experiment_{prefix} {word_typo} " + " ".join(base_tokens)
    content_v2 = text_v2.encode("utf-8")

    body_v2, ct_v2 = encode_multipart_formdata(
        {"classification": "PUBLIC", "description": f"Mutated {domain_name} Variant"},
        {"file": (fname_v2, content_v2, "text/plain")},
    )
    h_upload_v2 = headers.copy()
    h_upload_v2["Content-Type"] = ct_v2
    status, res = make_request("POST", "/datasets/upload", data=body_v2, headers=h_upload_v2, is_json=False)
    assert status == 200, f"Fuzzy upload failed ({status}): {res.decode('utf-8')}"
    fuzzy_json = json.loads(res.decode("utf-8"))

    assert fuzzy_json["duplicate"] is True, "Expected duplicate=True for near-identical document"
    assert fuzzy_json["match_type"] == "FUZZY_SIMILAR", f"Expected FUZZY_SIMILAR, got: {fuzzy_json['match_type']}"
    assert fuzzy_json["hamming_distance"] is not None and fuzzy_json["hamming_distance"] <= 4, f"Expected Hamming distance <= 4, got: {fuzzy_json['hamming_distance']}"
    assert fuzzy_json["similarity_score"] >= 93.0, f"Expected similarity >= 93%, got: {fuzzy_json['similarity_score']}%"
    assert fuzzy_json["existing"]["id"] == dataset_v1_id
    assert fuzzy_json["existing"]["simhash"] == simhash_v1
    print(f"[OK] Fuzzy SimHash near-duplicate successfully caught!")
    print(f"     Incoming SimHash: {fuzzy_json['simhash']}")
    print(f"     Existing SimHash: {fuzzy_json['existing']['simhash']}")
    print(f"     Bitwise Hamming Distance: {fuzzy_json['hamming_distance']} / 64 bits (Similarity: {fuzzy_json['similarity_score']}%)")

    print("\n=== 4. Testing Exact Hash Collision (100% SHA-256 Match) ===")
    body_exact, ct_exact = encode_multipart_formdata(
        {"classification": "PUBLIC"},
        {"file": (f"exact_copy_{timestamp}.txt", content_v1, "text/plain")},
    )
    h_upload_exact = headers.copy()
    h_upload_exact["Content-Type"] = ct_exact
    status, res = make_request("POST", "/datasets/upload", data=body_exact, headers=h_upload_exact, is_json=False)
    assert status == 200
    exact_json = json.loads(res.decode("utf-8"))
    assert exact_json["duplicate"] is True
    assert exact_json["match_type"] == "EXACT"
    assert exact_json["similarity_score"] == 100.0
    print("[OK] Exact hash collision correctly classified as EXACT (100%)")

    print("\n=== 5. Testing 'Proceed Anyway / Force Upload' Variant Registration ===")
    body_force, ct_force = encode_multipart_formdata(
        {"classification": "PUBLIC", "force": "true", "description": "Forced CRISPR variant"},
        {"file": (fname_v2, content_v2, "text/plain")},
    )
    h_upload_force = headers.copy()
    h_upload_force["Content-Type"] = ct_force
    status, res = make_request("POST", "/datasets/upload", data=body_force, headers=h_upload_force, is_json=False)
    assert status == 200
    force_json = json.loads(res.decode("utf-8"))
    assert force_json["duplicate"] is False
    assert force_json["id"] is not None
    variant_id = force_json["id"]
    print(f"[OK] Force upload registered variant with ID: {variant_id}")

    print("\n=== 6. Testing Inventory Listing with SimHash Fingerprints (GET /datasets) ===")
    status, res = make_request("GET", "/datasets", headers=headers)
    assert status == 200
    inventory = json.loads(res.decode("utf-8"))
    found = next((d for d in inventory if d["id"] == dataset_v1_id), None)
    assert found is not None, "Uploaded dataset not found in inventory"
    assert found["simhash"] == simhash_v1, f"Expected inventory to return simhash: {simhash_v1}"
    print(f"[OK] Verified dataset inventory returns SimHash fingerprint: {found['simhash']}")

    print("\n=== 7. Testing Authenticated File Download from Content-Addressable Storage ===")
    status, downloaded_bytes = make_request("GET", f"/datasets/{dataset_v1_id}/download", headers=headers)
    assert status == 200
    assert downloaded_bytes == content_v1, "Downloaded bytes do not match uploaded content"
    print("[OK] Verified byte-for-byte streaming download from Content-Addressable Storage")

    print("\n========================================================")
    print("ALL MINHASH & SIMHASH FUZZY SIMILARITY TESTS PASSED!")
    print("========================================================")


if __name__ == "__main__":
    run_fuzzy_tests()
