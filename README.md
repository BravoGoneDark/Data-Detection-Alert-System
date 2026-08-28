# 🛡️ DDAS — Deduplication and Anomaly Detection System For Secure Data Download

DDAS is an enterprise-level cybersecurity/data-governance platform with a focus on reduction of storage overhead via deduplication and providing zero-trust RBAC permissions model for data downloads.
## 🔬 Main Features

Multi-tier deduplication and outlier detection:
• Tier 1: Exact match (SHA-256 CAS)
• Tier 2: Schema overlap (column tokenization + Jaccard score)
• Tier 3: TF-IDF cosine similarity (research paper/text overlap)
• Tier 4: 64-bit simhash + MinHash LSH (fuzzy near duplicate detection)

SOC2 watchdog/anomaly detection:
• Statistical spike detection (Gaussian $Z$)
• Burst protection (exfiltration defense): sliding-window detection of suspicious download bursts (,$\ge 6$ downloads/30s)
• Threat analyst: transitions between `ACTIVE` $\to$ `INVESTIGATING` $\to$ `RESOLVED`

Containment quarantine + webhook dispatchers:
• Policy-based containment: granular account-level lockdowns with download barriers (HTTP 403) + UI banners
• Outbound HMAC-SHA256 webhook signing (SIEM/SOC compatibility)
Cybersecurity SOC2 operations dashboard:

• Discrete card transitions: instant switch between SOC Overview, Vector Analysis, Telemetry Viewer, CAS Manager
• Continuous fluid scroll: mousepad + trackpad spring physics API
• Forensic popups: queue manager for batch downloads with crypto detail modals

## Tech Stack
Backend: FastAPI + Python 3.13, SQLAlchemy, PostgreSQL 16, Redis 7/Valkey, JWT, Docker Compose
Frontend: React 19, Vite, TailwindCSS, Motion (Framer), Lucide icons
