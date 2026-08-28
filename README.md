# 🛡️ DDAS — Secure Data Download Duplication & Anomaly Detection System

DDAS is an enterprise-grade cyber-defense and data-governance platform designed to eliminate redundant storage overhead, detect data exfiltration attempts in real time, and enforce strict zero-trust role-based access control (RBAC).

---

### ⚡ Key Capabilities:

* **🔬 Multi-Tier Deduplication & Fuzzy Fingerprinting:**
  * **Tier 1 — Exact SHA-256 CAS:** Instant cryptographic byte-level collision interception.
  * **Tier 2 — Schema Overlap:** Structural column tokenization with Jaccard coefficient scoring.
  * **Tier 3 — TF-IDF Cosine Similarity:** Semantic vector similarity detection for research papers & text datasets.
  * **Tier 4 — 64-bit SimHash & MinHash LSH:** Fuzzy near-duplicate detection via multi-band Locality Sensitive Hashing.

* **🛡️ Real-Time SOC Watchdog & Anomaly Engine:**
  * **Statistical Spike Detection:** Live Gaussian $Z$-score tracking on download velocity.
  * **Burst Exfiltration Defense:** Sliding-window burst monitoring that automatically flags rapid unauthorized data harvesting ($\ge 6$ downloads / 30s).
  * **Threat Analyst Resolution Workflow:** Live transitions (`ACTIVE` $\to$ `INVESTIGATING` $\to$ `RESOLVED`).

* **🔒 Containment Quarantine & Webhook Dispatchers:**
  * **Policy Quarantine:** Automatic account containment with hard download locks (HTTP 403) and dynamic lockdown banners.
  * **HMAC-SHA256 Outbound Webhooks:** Cryptographically signed event notifications for SIEM / external SOC integrations.

* **📊 High-Performance Cyber-Ops SOC Deck:**
  * **Discrete Card Transitions:** Instant switching across SOC Overview, Vector Analytics, Live Telemetry, and CAS Inventory with zero intermediate lag.
  * **Continuous Fluid Spring Physics:** Smooth mousepad and trackpad scrolling overlay.
  * **Interactive Forensic Popups:** Sequential batch upload queue with cryptographic breakdown modals.

* **🏗️ Tech Stack:**
  * **Backend:** FastAPI, Python 3.13, SQLAlchemy, PostgreSQL 16, Redis 7 / Valkey, JWT Auth, Docker Compose.
  * **Frontend:** React 19, Vite, TailwindCSS v4, Motion (Framer Motion), Lucide Icons.
