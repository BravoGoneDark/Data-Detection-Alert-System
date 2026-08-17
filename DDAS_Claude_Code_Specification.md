# DDAS — Secure Data Download Duplication & Anomaly Detection System

## Claude Code Project Specification

---

## 0. Role and Development Philosophy

You are helping build a serious full-stack cybersecurity/data-management project based on the Smart India Hackathon software problem statement:

**Data Download Duplication Alert System (DDAS)**

This is primarily a **learning project**, but it should be developed with production-quality engineering practices.

The developer already has experience with React, frontend development, JavaScript, and basic databases, but wants to use this project to substantially deepen knowledge in:

- Cybersecurity
- Backend development
- PostgreSQL
- Cryptography
- File integrity
- Duplicate detection
- Similarity algorithms
- Authentication
- Authorization
- RBAC
- Data Loss Prevention
- Audit logging
- Anomaly detection
- Data security
- Python
- FastAPI
- C++

### Very Important Development Rule

Do **not** simply generate the entire application at once.

The project must be developed in stages.

For every major stage:

1. Explain what is being built.
2. Explain why it is required.
3. Explain the relevant concepts.
4. Explain the architecture.
5. Implement it.
6. Test it.
7. Explain the implementation.
8. Only then proceed to the next stage.

The developer should be able to explain every significant component during an interview.

Do not introduce a technology merely because it sounds impressive.

If a technology is listed as optional/advanced, first explain its purpose and trade-offs before implementing it.

---

# 1. Original Problem Statement

## Data Download Duplication Alert System (DDAS)

In an institute environment, multiple users often require access to the same datasets for various purposes. Due to lack of communication or visibility, users may unknowingly download duplicate copies of the same data.

This results in:

- Unnecessary bandwidth consumption
- Unnecessary storage consumption
- Data redundancy
- Increased data-management complexity
- Wasted time
- Multiple uncontrolled copies of datasets

The proposed **Data Download Duplication Alert System (DDAS)** addresses this problem by maintaining a repository/database containing metadata about previously downloaded datasets.

When a user initiates a download request, the system checks whether an equivalent or sufficiently similar dataset already exists within the institute's available repositories or users' accessible locations.

If a potential duplicate is detected, the system alerts the user and provides useful information about the existing dataset, including:

- Dataset name
- Dataset location
- Download timestamp
- File size
- Time period
- Spatial domain
- Dataset source
- Other relevant metadata
- Similarity/duplicate confidence

The user can then choose whether to access the existing dataset or proceed with a new download, depending on permissions and organizational policy.

The system should be flexible enough to operate in:

- Academic institutions
- Research institutions
- Government organizations
- Research laboratories
- Enterprises
- Any organization where datasets are frequently shared/downloaded

---

# 2. Project Objective

Build a **secure, intelligent, web-based DDAS platform** that:

1. Detects exact duplicate datasets.
2. Detects potentially similar/near-duplicate datasets.
3. Maintains dataset metadata.
4. Alerts users before redundant downloads.
5. Provides useful information about existing datasets.
6. Controls access using authentication and RBAC.
7. Maintains tamper-resistant audit information.
8. Detects suspicious/bulk downloading behavior.
9. Provides DLP-style security policies.
10. Provides an administrator/security dashboard.
11. Provides a visually polished modern interface.
12. Demonstrates practical cybersecurity concepts.

The original SIH problem must remain the foundation.

Cybersecurity features should **extend the problem naturally**, not replace it.

---

# 3. Project Identity

Suggested project name:

**DDAS — Secure Data Download Duplication & Anomaly Detection System**

Alternative internal name:

**DDAS Secure Data Intelligence Platform**

The project should be presented as:

> A secure institutional data-access platform that identifies duplicate and near-duplicate datasets while providing access control, integrity verification, audit logging and suspicious download detection.

---

# 4. Core Functionality

The system should ultimately support the following workflow:

```text
User
 ↓
Login
 ↓
Search / Request Dataset
 ↓
DDAS receives request
 ↓
Check authorization
 ↓
Identify requested dataset
 ↓
Calculate/retrieve fingerprint
 ↓
Search existing dataset repository
 ↓
Exact duplicate?
 ├── YES → Alert
 │          ↓
 │       Show existing dataset
 │
 └── NO
       ↓
   Similar dataset?
       ├── YES → Similarity Alert
       │
       └── NO → Continue
                    ↓
              Allow Download
                    ↓
              Record Metadata
                    ↓
              Create Audit Event
```

---

# 5. Security-Enhanced Workflow

The complete secure flow should eventually be:

```text
                         USER
                           │
                           ▼
                    Authentication
                           │
                           ▼
                     JWT / Session
                           │
                           ▼
                     Authorization
                           │
                           ▼
                        RBAC
                           │
                           ▼
                  Download Request
                           │
                           ▼
                ┌─────────────────────┐
                │    DDAS Engine      │
                └──────────┬──────────┘
                           │
             ┌─────────────┼─────────────┐
             ▼             ▼             ▼
          SHA-256      Metadata       Similarity
          Fingerprint   Matching       Detection
             │             │             │
             └─────────────┼─────────────┘
                           ▼
                   Duplicate Decision
                           │
              ┌────────────┴────────────┐
              ▼                         ▼
           Duplicate                  Unique
              │                         │
              ▼                         ▼
           Alert                    Security Checks
                                        │
                              ┌─────────┴─────────┐
                              ▼                   ▼
                         Normal Request      Suspicious
                              │                   │
                              ▼                   ▼
                          Download          Alert / Block
                              │
                              ▼
                         Audit Log
```

---

# 6. Technology Stack

## Frontend

Use:

- React
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui
- Kokonut UI
- Motion for React
- Anime.js
- Lucide React
- Recharts

### Motion

Use the modern:

```text
motion
```

package.

Install:

```bash
npm install motion
```

Import:

```javascript
import { motion, AnimatePresence } from "motion/react";
```

Do **not** install `framer-motion` unless a specific dependency absolutely requires it.

Use Motion for:

- Page transitions
- Component entrance/exit
- Cards
- Modals
- Notifications
- Hover/tap interactions
- Layout transitions
- Sidebar transitions
- Loading states
- Dashboard interactions
- Security alerts

---

## Anime.js

Use Anime.js selectively.

Install:

```bash
npm install animejs
```

Use it for:

- Complex animation sequences
- Dataset fingerprint visualization
- Sequential "scanning" animations
- SVG animations
- Advanced timeline effects
- Special visualizations

Do not use Anime.js for basic UI transitions that Motion already handles.

Anime.js has an official React integration. Handle animation lifecycle correctly so animations are cleaned up when components unmount.

---

## Kokonut UI

Use Kokonut UI where appropriate for:

- Dashboard components
- Animated UI components
- Cards
- Navigation
- Search interfaces
- Interactive components
- Visually distinctive elements

Do not blindly import every Kokonut component.

Adapt components to the DDAS design system.

Kokonut UI is a component/UI library, not a replacement for the animation engine.

---

## Styling

Use:

- Tailwind CSS
- CSS variables
- shadcn/ui design conventions

Design should feel like:

**Modern enterprise cybersecurity/data platform**

NOT:

- Generic Bootstrap dashboard
- Excessive neon hacker aesthetic
- Gaming UI
- Overly animated portfolio

---

# 7. Backend

Use:

**Python + FastAPI**

Why:

- Excellent API framework
- Python ecosystem is strong for data processing
- Excellent cybersecurity scripting ecosystem
- Excellent similarity/ML libraries
- Easy integration with C++
- Automatic OpenAPI documentation

---

# 8. Database

Use:

**PostgreSQL**

Do **not** use Supabase.

The developer has already used Supabase in previous projects and specifically wants to learn direct PostgreSQL usage.

The application should communicate:

```text
React
 ↓
FastAPI
 ↓
PostgreSQL
```

Do not hide database functionality behind Supabase.

---

# 9. Authentication

Implement secure authentication.

Recommended:

- JWT access tokens
- Secure password hashing
- Argon2id or another current secure password hashing implementation
- OAuth2-compatible bearer authentication
- Token expiration
- Refresh-token strategy if required by architecture

Important:

> JWT payloads are signed, not encrypted. Do not store secrets or sensitive information inside JWT claims.

---

# 10. RBAC — Role-Based Access Control

Implement:

### Roles

At minimum:

```text
ADMIN
FACULTY
RESEARCHER
STUDENT
GUEST
```

Permissions should include concepts such as:

```text
dataset:view
dataset:download
dataset:upload
dataset:delete
dataset:modify
dataset:manage_access
audit:view
security:view
user:manage
alert:manage
```

Do not hardcode role checks everywhere.

Create a reusable authorization system.

Conceptual flow:

```text
Request
 ↓
Authenticated user
 ↓
User role
 ↓
Required permission
 ↓
Permission granted?
 ├── YES → Continue
 └── NO → Deny + Audit Event
```

---

# 11. Dataset Classification

Datasets should have sensitivity classifications.

Example:

```text
PUBLIC
INTERNAL
RESTRICTED
CONFIDENTIAL
```

Example:

```text
Dataset:
Student Research Dataset

Classification:
CONFIDENTIAL

Allowed:
RESEARCHER
FACULTY
ADMIN
```

This supports the DLP/security layer.

---

# 12. Database Design

Create a normalized PostgreSQL schema.

Potential tables:

## users

```text
id
name
email
password_hash
role_id
department_id
is_active
created_at
updated_at
```

## roles

```text
id
name
description
```

## permissions

```text
id
name
description
```

## role_permissions

```text
role_id
permission_id
```

## datasets

```text
id
name
description
source
file_name
file_size
file_type
storage_location
classification
created_at
updated_at
```

## dataset_metadata

```text
dataset_id
start_date
end_date
spatial_domain
geographical_region
record_count
columns
source_organization
version
additional_metadata
```

## dataset_fingerprints

```text
id
dataset_id
sha256
simhash
minhash_signature
created_at
```

## downloads

```text
id
dataset_id
user_id
timestamp
ip_address
device_information
download_location
status
```

## similarity_results

```text
id
dataset_id
matched_dataset_id
algorithm
similarity_score
created_at
```

## security_events

```text
id
user_id
event_type
severity
ip_address
dataset_id
description
timestamp
metadata
```

## alerts

```text
id
user_id
dataset_id
alert_type
severity
message
status
created_at
resolved_at
```

## access_policies

```text
id
dataset_id
role_id
action
allowed
```

The exact schema may evolve during development.

Do not over-normalize unnecessarily.

---

# 13. Exact Duplicate Detection

The first duplicate detection algorithm must be:

**SHA-256**

Python's standard `hashlib` can calculate SHA-256.

Conceptually:

```text
File
 ↓
Read bytes
 ↓
SHA-256
 ↓
Hex digest
 ↓
Database lookup
```

If:

```text
hash(A) == hash(B)
```

then A and B are byte-for-byte identical.

Store the hash in PostgreSQL with an appropriate index/unique constraint strategy.

---

# 14. Important: Hash ≠ Similarity

The system must distinguish:

### Exact duplicate

Same content.

Use:

**SHA-256**

### Near duplicate

Mostly similar content.

Use:

- Metadata similarity
- MinHash
- SimHash
- TF-IDF/cosine similarity
- LSH

Do not call a 90% similar dataset an "exact duplicate."

Use terminology such as:

- Exact duplicate
- Potential duplicate
- Similar dataset
- Related dataset

---

# 15. Metadata Similarity

Datasets can contain:

- Name
- Description
- Date range
- Spatial domain
- Source
- File size
- Columns
- Number of records
- Dataset category
- Version

Compare these before invoking expensive content-level algorithms.

For example:

```text
Name similarity
+
Date overlap
+
Spatial overlap
+
Column overlap
+
Source similarity
```

can produce a preliminary similarity score.

---

# 16. TF-IDF + Cosine Similarity

Use this primarily for text/metadata similarity.

Potential input:

```text
dataset name
+
description
+
tags
+
source
```

Convert text to TF-IDF vectors.

Then calculate cosine similarity.

Example conceptual result:

```text
Dataset A
Dataset B

Cosine similarity:
0.91
```

Meaning they are highly similar.

Define sensible thresholds through experimentation.

Do not arbitrarily claim:

```text
0.90 = duplicate
```

without testing.

---

# 17. MinHash

Learn and implement MinHash for approximate Jaccard similarity.

Purpose:

Efficiently estimate similarity between large sets.

Potential use:

```text
Dataset A records/tokens
Dataset B records/tokens
        ↓
      MinHash
        ↓
Similarity estimate
```

Use an established implementation where appropriate, but understand the algorithm.

---

# 18. SimHash

Use SimHash for approximate content fingerprinting.

Concept:

Similar documents should produce fingerprints with relatively small Hamming distance.

Example:

```text
Dataset A → 101101001...
Dataset B → 101101101...
```

Measure Hamming distance.

Understand the algorithm before treating it as a black box.

---

# 19. Locality-Sensitive Hashing

LSH should be considered an **optimization/search technique**, not simply another similarity score.

Purpose:

Avoid comparing a new dataset against every dataset in a large repository.

Concept:

```text
100,000 datasets
       ↓
      LSH
       ↓
Candidate set
       ↓
Detailed comparison
       ↓
Final matches
```

Use LSH only after the simpler implementation works.

---

# 20. Duplicate-Detection Pipeline

The eventual system should use a tiered approach:

```text
New dataset
     │
     ▼
SHA-256 lookup
     │
     ├── Exact match → STOP
     │
     ▼
Metadata filtering
     │
     ▼
TF-IDF / cosine
     │
     ▼
MinHash / SimHash
     │
     ▼
LSH candidate optimization
     │
     ▼
Potential matches
```

Do NOT run every algorithm on every file.

The goal is:

> Fast first, sophisticated only when necessary.

---

# 21. DLP — Data Loss Prevention

The security layer should introduce DLP-style controls.

Examples:

### Policy 1

User cannot download `CONFIDENTIAL` dataset unless authorized.

### Policy 2

More than 100 downloads within 10 minutes triggers an alert.

### Policy 3

Repeated access to restricted datasets triggers monitoring.

### Policy 4

Bulk downloads may be temporarily blocked.

### Policy 5

User attempting unauthorized access generates a security event.

The project should clearly distinguish:

**Detection**

from

**Prevention**

from

**Alerting**

---

# 22. Bulk Data Extraction Detection

Track download behavior.

Example:

```text
User A

10:01 → Dataset 1
10:02 → Dataset 2
10:02 → Dataset 3
...
10:09 → Dataset 400
```

System detects:

```text
400 downloads
within 8 minutes
```

Potentially suspicious.

Generate:

```text
SECURITY ALERT
Type: BULK_DATA_EXTRACTION
Severity: HIGH
```

The administrator can:

- Review
- Dismiss
- Block user
- Investigate
- Mark as legitimate

---

# 23. Insider-Threat Concept

The system should eventually detect abnormal user behavior.

Examples:

Normal:

```text
Researcher
usually accesses:
Agriculture datasets
```

Suddenly:

```text
HR
Financial
Student
Confidential research
```

datasets are accessed.

This should not automatically mean malicious activity.

Instead:

> Flag as anomalous behavior for review.

Avoid pretending that a basic rule system is an AI insider-threat detector.

---

# 24. Audit Logging

Every security-sensitive action should be logged.

Examples:

```text
LOGIN_SUCCESS
LOGIN_FAILURE
DATASET_VIEW
DOWNLOAD_REQUEST
DOWNLOAD_ALLOWED
DOWNLOAD_BLOCKED
DUPLICATE_DETECTED
UNAUTHORIZED_ACCESS
BULK_DOWNLOAD_DETECTED
ROLE_CHANGED
DATASET_CREATED
DATASET_DELETED
POLICY_CHANGED
```

Audit logs should include:

```text
timestamp
user
action
dataset
IP
result
severity
metadata
```

Audit logs should not be casually editable by ordinary users.

---

# 25. File Integrity

The system should also detect if a stored dataset has changed unexpectedly.

Example:

```text
Original SHA-256:
ABC123

Current file SHA-256:
XYZ789
```

System:

```text
⚠ FILE INTEGRITY VIOLATION
```

Create a security event.

This gives the project a legitimate cybersecurity use for cryptographic hashing beyond duplicate detection.

---

# 26. C++ Component

C++ is optional initially.

Do not force C++ into the architecture if it provides no practical benefit.

Potential future architecture:

```text
FastAPI
   ↓
Similarity Service
   ↓
C++ Engine
```

C++ may be used for:

- High-performance hashing
- Large-file processing
- Similarity calculations
- MinHash
- SimHash
- LSH
- Computationally expensive operations

Initially implement the algorithms in Python where appropriate.

Once the system works:

1. Identify a computational bottleneck.
2. Benchmark it.
3. Implement that component in C++.
4. Benchmark again.
5. Integrate it with Python.

Possible integration methods:

- Separate C++ executable
- REST/gRPC microservice if justified
- `pybind11`

Do not create a microservice simply for architectural complexity.

---

# 27. Frontend Architecture

Use React + TypeScript.

Suggested structure:

```text
src/
├── components/
│   ├── ui/
│   ├── dashboard/
│   ├── datasets/
│   ├── security/
│   ├── alerts/
│   └── charts/
│
├── pages/
│   ├── Login
│   ├── Dashboard
│   ├── Datasets
│   ├── DatasetDetails
│   ├── Downloads
│   ├── Security
│   ├── AuditLogs
│   └── Settings
│
├── hooks/
├── services/
├── api/
├── types/
├── utils/
├── animations/
└── layouts/
```

---

# 28. Main User Interfaces

## Login

Modern secure login.

Show:

- Email
- Password
- Authentication status
- Error states
- Loading state

## User Dashboard

Show:

- Total datasets available
- Downloads
- Duplicates avoided
- Recent downloads
- Recent alerts
- Security status

## Dataset Search

Search by:

- Name
- Description
- Source
- Region
- Date range
- Category

---

# 29. Dataset Details Page

Show:

```text
Dataset name

Description

Source

Period
Spatial domain
Size
File type
Records
Columns

Classification

Fingerprint

Version

Availability
```

Potential duplicate matches:

```text
Potential Matches

Dataset A
Similarity: 97%

Dataset B
Similarity: 88%
```

---

# 30. Duplicate Alert UI

This should be a major UI feature.

Example:

```text
⚠ Potential Duplicate Detected

The dataset you requested may already exist.

Existing Dataset:
Indian Agricultural Production

Similarity:
100% Exact Match

Available at:
Agriculture Repository

Period:
2020–2025

Region:
India

Size:
428 MB

Downloaded:
14 Aug 2026

[Access Existing Dataset]
[Download Anyway]
[Cancel]
```

The interface should make the original SIH requirement immediately obvious.

---

# 31. Security Dashboard

This is the major cybersecurity showcase.

Show:

```text
Downloads
Duplicates prevented
Security alerts
Blocked downloads
Unauthorized attempts
Suspicious users
```

Charts:

- Downloads over time
- Duplicate detections
- Alert severity
- User activity
- Dataset usage
- Blocked requests

---

# 32. Security Event Timeline

Example:

```text
17:42  ⚠ Bulk download detected
17:39  ✓ Dataset download
17:35  ⚠ Unauthorized access attempt
17:31  ✓ Duplicate download prevented
17:28  ✓ User login
```

---

# 33. Admin Panel

Admin should be able to:

- Manage users
- Assign roles
- Manage datasets
- Configure access policies
- Review security alerts
- Review audit logs
- Block/unblock users
- View download activity

---

# 34. Animation Design

Animations should communicate state and activity.

Do not overanimate.

## Motion

Use Motion for:

- Page transitions
- Card entrance
- Sidebar
- Modal
- Alerts
- Hover
- Tap
- Layout transitions
- Loading states
- Dataset cards
- Security notifications

## Anime.js

Use Anime.js for:

- Complex sequences
- Dataset fingerprint visualization
- Security scanning visualization
- SVG animations
- Special dashboard effects

Keep Anime.js isolated from normal UI animation.

## Kokonut UI

Use selectively for polished prebuilt components.

Do not make the project visually dependent on a third-party component library.

---

# 35. Animation Principles

The visual language should communicate:

```text
Searching
Scanning
Comparing
Verified
Duplicate
Blocked
Warning
Secure
Compromised
```

Example:

```text
Scanning...
   ↓
Fingerprint generated
   ↓
Repository searched
   ↓
Match found
   ↓
⚠ Duplicate detected
```

Use animation to reinforce this process.

---

# 36. Visual Design

Design direction:

**Modern enterprise cybersecurity + data intelligence platform**

Use:

- Dark/light theme
- Clean typography
- Subtle borders
- Cards
- Glass effects only where appropriate
- Security status indicators
- Charts
- Activity timelines
- Dataset comparison panels

Avoid:

- Excessive neon
- Fake hacker graphics
- Matrix rain everywhere
- Excessive glowing
- Animation for the sake of animation

The interface should look like a product an enterprise could actually use.

---

# 37. Responsiveness

The frontend must work on:

- Desktop
- Laptop
- Tablet

Mobile support should be reasonable but desktop is the primary target because this is an institutional data platform.

---

# 38. Accessibility

Support:

- Keyboard navigation
- Semantic HTML
- Visible focus states
- Sufficient contrast
- Reduced-motion preference

Respect the user's reduced-motion preference for animations.

---

# 39. Backend API

Suggested endpoints:

## Authentication

```text
POST /auth/register
POST /auth/login
POST /auth/refresh
GET  /auth/me
```

## Datasets

```text
GET    /datasets
GET    /datasets/{id}
POST   /datasets
PUT    /datasets/{id}
DELETE /datasets/{id}
```

## Duplicate detection

```text
POST /duplicates/check
POST /duplicates/compare
GET  /datasets/{id}/matches
```

## Downloads

```text
POST /downloads/request
GET  /downloads
GET  /downloads/{id}
```

## Alerts

```text
GET  /alerts
GET  /alerts/{id}
PATCH /alerts/{id}
```

## Security

```text
GET /security/events
GET /security/statistics
GET /security/suspicious-users
```

## Admin

```text
GET /admin/users
PATCH /admin/users/{id}/role
PATCH /admin/users/{id}/status
```

Exact endpoint structure may be refined during implementation.

---

# 40. Python Dependencies

Initial backend dependencies should include only what is actually required.

Potential dependencies:

```text
fastapi
uvicorn
sqlalchemy
psycopg
alembic
pydantic
pydantic-settings
pyjwt
pwdlib
python-multipart
```

Potential data/similarity dependencies:

```text
pandas
numpy
scikit-learn
scipy
datasketch
```

Testing:

```text
pytest
pytest-asyncio
httpx
```

Code quality:

```text
ruff
black
mypy
```

Do not install everything on day one if the stage does not require it.

---

# 41. Frontend Dependencies

Potential dependencies:

```text
react
react-dom
typescript
vite
tailwindcss
motion
animejs
lucide-react
recharts
```

UI ecosystem:

```text
shadcn/ui
Kokonut UI
Radix UI components as required by shadcn
```

Only install individual dependencies required by selected components.

---

# 42. Database / Development Tools

Use:

- PostgreSQL
- pgAdmin or another PostgreSQL GUI if desired
- Alembic for migrations
- Docker optionally

Docker can eventually provide:

```text
PostgreSQL
Backend
```

But local development should remain understandable without Docker.

---

# 43. Environment Variables

Use `.env`.

Never hardcode:

- Database password
- JWT secret
- Encryption keys
- API secrets
- Cloud credentials

Example:

```text
DATABASE_URL=
JWT_SECRET=
JWT_ALGORITHM=
ACCESS_TOKEN_EXPIRE_MINUTES=
```

Use:

```text
.env
.env.example
```

Add `.env` to `.gitignore`.

---

# 44. Security Requirements

The application must protect against:

- SQL injection
- XSS
- CSRF where relevant
- Broken access control
- IDOR
- Weak password storage
- JWT misuse
- Path traversal
- Malicious file uploads
- Unauthorized dataset access
- Excessive downloads
- Sensitive information leakage
- Improper error disclosure

Use parameterized queries/ORM.

Do not construct SQL with string concatenation.

---

# 45. File Upload Security

If dataset uploads are supported:

Validate:

- File size
- File extension
- MIME type
- Filename
- Storage path

Generate internal filenames rather than trusting user-supplied paths.

Prevent:

```text
../../something
```

and similar path traversal attacks.

Do not execute uploaded files.

---

# 46. Password Security

Never store plaintext passwords.

Use a modern password hashing algorithm such as Argon2id through an appropriate maintained library.

The database should store:

```text
password_hash
```

not:

```text
password
```

---

# 47. JWT Security

JWT should contain minimal claims.

Example:

```text
sub
role
exp
iat
```

Do not put sensitive user information in the JWT.

Use expiration.

Validate:

- Signature
- Expiration
- Token type
- User status

---

# 48. Audit Log Security

Audit logs are security-sensitive.

Normal users should not be able to modify or delete them.

Administrators may view them.

If deletion is required for data retention, it should itself generate an audit event.

---

# 49. Database Indexing

Investigate indexes for:

```text
datasets.sha256
downloads.user_id
downloads.dataset_id
downloads.timestamp
security_events.user_id
security_events.timestamp
alerts.status
datasets.classification
```

Benchmark queries.

Do not blindly index every column.

---

# 50. Development Stages

## Stage 0 — Project Setup

Learn:

- Git
- Monorepo structure
- React + Vite
- FastAPI
- PostgreSQL
- Environment variables

Deliverable:

```text
Frontend running
Backend running
PostgreSQL running
Frontend ↔ Backend connection
Backend ↔ Database connection
```

---

## Stage 1 — Basic Database + Dataset Repository

Build:

- Dataset table
- Metadata table
- Dataset CRUD
- Search
- Dataset details

Learn:

- PostgreSQL
- SQL
- ORM
- Relationships
- Indexes
- REST APIs

---

## Stage 2 — Authentication

Build:

- Registration
- Login
- Password hashing
- JWT
- Protected routes

Learn:

- Authentication
- JWT
- Password hashing
- Sessions/tokens
- API security

---

## Stage 3 — RBAC

Build:

- Roles
- Permissions
- Authorization middleware
- Dataset access policies

Learn:

- Authentication vs authorization
- RBAC
- Least privilege
- Access control

---

## Stage 4 — SHA-256 Duplicate Detection

Build:

```text
File
 ↓
SHA-256
 ↓
Database lookup
 ↓
Exact duplicate?
```

Learn:

- Cryptographic hashing
- SHA-256
- File integrity
- Hash collisions conceptually
- Fingerprinting

---

## Stage 5 — DDAS Alert System

Build:

- Duplicate alert
- Existing dataset information
- Location
- Period
- Spatial domain
- Source
- Timestamp
- Similarity

This becomes the **minimum viable SIH solution**.

---

## Stage 6 — Metadata Similarity

Build:

- Metadata comparison
- Text normalization
- TF-IDF
- Cosine similarity

Learn:

- Vectorization
- TF-IDF
- Cosine similarity
- Similarity thresholds

---

## Stage 7 — Advanced Duplicate Detection

Implement and compare:

- MinHash
- SimHash
- LSH

Do experiments.

For example:

```text
Dataset pair
 ↓
SHA-256
 ↓
TF-IDF
 ↓
MinHash
 ↓
SimHash
```

Compare:

- Accuracy
- Speed
- Memory
- False positives
- False negatives

This should be treated as an **experimental/learning stage**, not blindly added to production.

---

## Stage 8 — Audit Logging

Track:

- Login
- Download
- Duplicate detection
- Access denial
- Dataset creation
- Dataset modification
- Role changes
- Security alerts

Learn:

- Security monitoring
- Audit trails
- Event logging

---

## Stage 9 — Bulk Download Detection

Build:

```text
Download history
 ↓
Sliding time window
 ↓
Threshold
 ↓
Anomaly detection
 ↓
Security alert
```

Learn:

- Behavioral analysis
- Anomaly detection
- Rate limiting
- Insider threats
- Data exfiltration

---

## Stage 10 — DLP

Implement policy engine.

Example:

```text
IF dataset.classification == CONFIDENTIAL
AND user lacks permission
→ BLOCK

IF downloads > threshold
→ ALERT

IF restricted dataset accessed unusually
→ FLAG
```

Learn:

- DLP
- Security policies
- Data classification
- Prevention vs detection

---

## Stage 11 — Security Dashboard

Build:

- Security overview
- Alerts
- Audit logs
- Suspicious users
- Download statistics
- Blocked downloads
- Duplicate prevention statistics

---

## Stage 12 — Advanced UI

Use:

- Motion
- Anime.js
- Kokonut UI
- Recharts

Add:

- Page transitions
- Dataset scanning animation
- Duplicate detection visualization
- Security alert animation
- Dashboard charts
- Activity timeline

Animations must remain functional and performant.

---

## Stage 13 — C++ Optimization

Only now investigate C++.

Benchmark Python implementation.

If a component is computationally expensive:

```text
Python
vs
C++
```

Implement the selected algorithm in C++.

Measure:

- Runtime
- Memory
- Throughput

Then integrate only if the result is meaningfully beneficial.

---

## Stage 14 — Security Testing

Test:

### Authentication

- Wrong password
- Expired JWT
- Invalid JWT
- Disabled user

### Authorization

- Student accessing confidential dataset
- Researcher attempting admin endpoint
- User modifying another user's dataset

### API

- SQL injection
- XSS payloads
- IDOR
- Path traversal
- Malicious input

### DLP

- Bulk downloads
- Restricted datasets
- Repeated download attempts

### Integrity

- Modify stored dataset
- Recalculate hash
- Verify integrity violation

---

# 51. Testing Strategy

## Unit Tests

Test:

- SHA-256
- Similarity
- RBAC
- DLP rules
- Anomaly detection

## Integration Tests

Test:

```text
API → Database
API → Duplicate engine
Authentication → Authorization
Download → Audit log
```

## End-to-End Tests

Test:

```text
Login
 ↓
Search
 ↓
Request dataset
 ↓
Duplicate detected
 ↓
Alert
 ↓
Access existing dataset
 ↓
Audit event
```

---

# 52. Performance Testing

Eventually test:

- 1,000 datasets
- 10,000 datasets
- 100,000 datasets

Measure:

- Exact duplicate lookup
- Metadata search
- Similarity search
- Download logging
- Dashboard queries

Determine when advanced techniques like LSH actually provide benefits.

---

# 53. Sample Data

Create synthetic datasets for development.

Examples:

```text
agriculture_2025.csv
agriculture_final.csv
agriculture_v2.csv
climate_india.csv
student_research.csv
population_india.csv
```

Include:

### Exact duplicates

Same content, different filenames.

### Near duplicates

Minor modifications.

### Completely unrelated files

For benchmarking.

Never use real sensitive institutional data.

---

# 54. Demonstration Scenario

The final demo should tell a story.

## Scenario

User A downloads:

```text
Indian Agricultural Production 2020–2025
```

DDAS calculates:

```text
SHA-256
```

and records metadata.

Later User B searches for:

```text
agri_production_final.csv
```

DDAS detects:

```text
100% exact match
```

and displays:

```text
⚠ Existing dataset found
```

Then User B accesses the existing dataset instead.

The system records:

```text
DUPLICATE_PREVENTED
```

---

## Security Scenario

Then simulate:

```text
User B downloads 250 datasets in 5 minutes.
```

System detects:

```text
BULK_DATA_EXTRACTION
```

and displays:

```text
⚠ HIGH SEVERITY ALERT
```

Administrator sees the event in the security dashboard.

This demonstrates both:

**SIH functionality**

and

**Cybersecurity functionality.**

---

# 55. What Should Be Learned

## Cybersecurity

- Authentication
- Authorization
- RBAC
- Least privilege
- JWT
- Password hashing
- Cryptographic hashing
- SHA-256
- File integrity
- Audit logging
- Data classification
- DLP
- Insider threats
- Data exfiltration
- Anomaly detection
- Secure file handling
- SQL injection
- XSS
- IDOR
- Path traversal
- API security

## Algorithms

- Hashing
- Jaccard similarity
- MinHash
- SimHash
- Hamming distance
- TF-IDF
- Cosine similarity
- Locality-Sensitive Hashing
- Approximate nearest-neighbor concepts
- Threshold selection
- False positives/negatives

## Backend

- FastAPI
- REST APIs
- Authentication middleware
- Authorization middleware
- PostgreSQL
- SQLAlchemy
- Database migrations
- Indexing
- Transactions

## Frontend

- React
- TypeScript
- Tailwind
- Component architecture
- Motion
- Anime.js
- Kokonut UI
- Data visualization

## Systems

- File processing
- Large dataset handling
- Performance benchmarking
- Python/C++ interoperability

---

# 56. What Not to Do

Do NOT:

- Use Supabase.
- Build everything in one huge step.
- Install unnecessary dependencies.
- Add blockchain unless there is an actual justified use case.
- Add AI/ML just for marketing.
- Call simple threshold rules "AI".
- Implement every similarity algorithm simultaneously.
- Make C++ mandatory where Python is sufficient.
- Store plaintext passwords.
- Put secrets in source code.
- Trust filenames for duplicate detection.
- Expose sensitive user information in duplicate alerts.
- Allow users to access datasets they are not authorized to access.
- Overuse animations.
- Use the old `framer-motion` package for new code when `motion` is appropriate.
- Build a generic CRUD application and call it cybersecurity.

---

# 57. Development Style

Every stage should produce a working application.

At the end of each stage:

1. Run tests.
2. Fix errors.
3. Explain the architecture.
4. Explain the new concepts.
5. Explain relevant files.
6. Explain how to run the feature.
7. Explain security implications.
8. Provide a short manual testing procedure.

Do not move forward if the previous stage is broken.

---

# 58. Documentation

Maintain:

```text
README.md
ARCHITECTURE.md
SECURITY.md
API.md
DATABASE.md
ALGORITHMS.md
DEVELOPMENT.md
```

`ALGORITHMS.md` should explain:

- SHA-256
- MinHash
- SimHash
- TF-IDF
- Cosine similarity
- LSH

including:

- Purpose
- Mathematical intuition
- Complexity
- Implementation
- Limitations
- When the algorithm is used

---

# 59. Final Architecture

The intended final architecture is approximately:

```text
                         ┌───────────────────┐
                         │      React        │
                         │   TypeScript UI   │
                         └─────────┬─────────┘
                                   │
                          REST / JSON / JWT
                                   │
                                   ▼
                         ┌───────────────────┐
                         │      FastAPI      │
                         │      Backend      │
                         └─────────┬─────────┘
                                   │
              ┌────────────────────┼────────────────────┐
              │                    │                    │
              ▼                    ▼                    ▼
       Authentication        DDAS Engine          Security Engine
              │                    │                    │
              │          ┌─────────┼─────────┐          │
              │          ▼         ▼         ▼          │
              │       SHA-256   Metadata  Similarity   │
              │                              │          │
              │                     ┌────────┼───────┐  │
              │                     ▼        ▼       ▼  │
              │                  TF-IDF   MinHash SimHash
              │                              │
              │                              ▼
              │                             LSH
              │
              └────────────────────┬───────────────────┘
                                   │
                                   ▼
                           ┌───────────────┐
                           │  PostgreSQL   │
                           └───────────────┘
                                   │
                                   ▼
                            Audit / Security
                                Events

Optional:
FastAPI → C++ Processing Engine
```

---

# 60. Final Feature Set

## Core DDAS

- [ ] Dataset repository
- [ ] Dataset metadata
- [ ] Dataset search
- [ ] Exact duplicate detection
- [ ] Duplicate alert
- [ ] Existing dataset information
- [ ] Dataset access

## Security

- [ ] Authentication
- [ ] JWT
- [ ] Password hashing
- [ ] RBAC
- [ ] Dataset classification
- [ ] Authorization
- [ ] Audit logging
- [ ] File integrity verification
- [ ] Security alerts
- [ ] DLP rules
- [ ] Bulk extraction detection
- [ ] Anomaly detection

## Algorithms

- [ ] SHA-256
- [ ] Metadata similarity
- [ ] TF-IDF
- [ ] Cosine similarity
- [ ] MinHash
- [ ] SimHash
- [ ] Hamming distance
- [ ] LSH

## Frontend

- [ ] Login
- [ ] User dashboard
- [ ] Dataset search
- [ ] Dataset details
- [ ] Duplicate alert
- [ ] Download history
- [ ] Security dashboard
- [ ] Audit log viewer
- [ ] Admin panel
- [ ] Charts
- [ ] Responsive UI
- [ ] Dark/light theme
- [ ] Accessible UI

## Animation

- [ ] Motion
- [ ] Anime.js
- [ ] Kokonut UI
- [ ] Dataset scanning animation
- [ ] Duplicate detection animation
- [ ] Security alerts
- [ ] Dashboard transitions
- [ ] Reduced-motion support

## Engineering

- [ ] Unit tests
- [ ] Integration tests
- [ ] E2E tests
- [ ] Security testing
- [ ] Performance testing
- [ ] API documentation
- [ ] Database documentation
- [ ] Architecture documentation
- [ ] Algorithm documentation

## Optional Advanced Work

- [ ] C++ duplicate engine
- [ ] C++ benchmarking
- [ ] Python/C++ integration
- [ ] Advanced anomaly detection
- [ ] Large-scale similarity benchmarking
- [ ] Deployment

---

# 61. Definition of Success

The project is successful if a developer can demonstrate:

## Scenario 1 — Exact Duplicate

```text
Dataset A uploaded
↓
SHA-256 generated
↓
Dataset B requested
↓
SHA-256 matches
↓
DDAS warns user
↓
Existing dataset shown
```

## Scenario 2 — Near Duplicate

```text
Dataset A
↓
Dataset B has different filename/content
↓
Metadata/content similarity calculated
↓
High similarity detected
↓
Potential duplicate alert
```

## Scenario 3 — Unauthorized Access

```text
Student
↓
Confidential dataset
↓
RBAC check
↓
Access denied
↓
Security event created
```

## Scenario 4 — Bulk Extraction

```text
User
↓
Hundreds of downloads
↓
Behavioral threshold exceeded
↓
DLP/security engine
↓
HIGH severity alert
↓
Administrator dashboard
```

## Scenario 5 — Integrity Violation

```text
Stored dataset
↓
Hash originally recorded
↓
File modified
↓
New hash calculated
↓
Hash mismatch
↓
Integrity violation alert
```

---

# 62. Final Instruction to Claude Code

Build this project **incrementally and educationally**.

The primary objective is not simply to produce a working application.

The objective is to create a project where the developer understands:

> **How secure dataset management works, how duplicate detection works, how cryptographic fingerprints work, how similarity algorithms work, how RBAC protects data, how audit systems work, and how DLP/anomaly detection can identify suspicious data access.**

Start with the simplest functional DDAS implementation.

Then progressively introduce:

```text
Core DDAS
    ↓
PostgreSQL
    ↓
Authentication
    ↓
RBAC
    ↓
SHA-256
    ↓
Duplicate Alerts
    ↓
Metadata Similarity
    ↓
TF-IDF / Cosine
    ↓
MinHash / SimHash
    ↓
LSH
    ↓
Audit Logging
    ↓
Bulk Download Detection
    ↓
DLP
    ↓
Security Dashboard
    ↓
Advanced UI/Animation
    ↓
C++ Optimization
```

At every stage, prioritize:

- Correctness
- Understanding
- Security
- Maintainability
- Measurable results
- Explainability

over unnecessary complexity.

---

# 63. Additional Guidance for the AI Coding Agent

The AI coding agent must behave as a **technical mentor and implementation assistant**, not as an autonomous code generator.

Before introducing a significant technology or algorithm:

1. Explain what problem it solves.
2. Explain why it is appropriate here.
3. Explain simpler alternatives.
4. Explain its trade-offs.
5. Confirm the implementation plan in the project documentation.
6. Implement it only after the preceding stage is stable.

When implementing algorithms:

- Explain the intuition first.
- Provide mathematical intuition where useful.
- Explain computational complexity.
- Explain practical limitations.
- Create test cases.
- Benchmark where appropriate.

When implementing cybersecurity features:

- Explain the threat being addressed.
- Explain the attack scenario.
- Explain the defense mechanism.
- Explain limitations.
- Create a test demonstrating that the defense works.

When implementing UI:

- Prioritize usability.
- Use Motion for normal React UI transitions/interactions.
- Use Anime.js only for specialized sequences/visualizations.
- Use Kokonut UI selectively.
- Avoid animation overload.
- Respect reduced-motion preferences.
- Ensure animations do not interfere with functionality.

When adding dependencies:

- Explain why the dependency is needed.
- Prefer maintained, well-supported libraries.
- Avoid duplicate libraries solving the same problem.
- Do not install dependencies simply because they are available.

When modifying the database:

- Use migrations.
- Never silently destroy existing data.
- Explain schema changes.
- Add indexes based on actual query requirements.

When handling security-sensitive information:

- Never expose secrets.
- Never commit `.env`.
- Never store plaintext passwords.
- Never log passwords or authentication tokens.
- Do not expose sensitive dataset metadata to unauthorized users.

---

# 64. Suggested Repository Structure

A possible final repository:

```text
ddas/
│
├── frontend/
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── ...
│
├── backend/
│   ├── app/
│   │   ├── api/
│   │   ├── auth/
│   │   ├── datasets/
│   │   ├── duplicates/
│   │   ├── security/
│   │   ├── users/
│   │   ├── database/
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── services/
│   │   └── main.py
│   │
│   ├── tests/
│   ├── requirements.txt
│   └── ...
│
├── cpp-engine/
│   ├── src/
│   ├── include/
│   ├── tests/
│   └── CMakeLists.txt
│
├── database/
│   ├── migrations/
│   └── seed/
│
├── datasets/
│   └── synthetic/
│
├── docs/
│   ├── ARCHITECTURE.md
│   ├── SECURITY.md
│   ├── API.md
│   ├── DATABASE.md
│   ├── ALGORITHMS.md
│   └── DEVELOPMENT.md
│
├── .env.example
├── .gitignore
├── README.md
└── docker-compose.yml
```

The exact structure may evolve as the implementation progresses.

---

# 65. Important Scope Boundary

This is a **defensive cybersecurity/data-management project**.

The system is intended to:

- Protect institutional datasets
- Prevent redundant downloads
- Detect unauthorized access
- Detect suspicious download activity
- Maintain audit trails
- Verify dataset integrity
- Improve data-management efficiency

Do not add offensive-security functionality that is unrelated to these objectives.

---

# 66. Final Product Vision

The final DDAS should feel like a real institutional security/data platform.

A user should be able to:

1. Log in.
2. Search for a dataset.
3. Request/download a dataset.
4. Receive a meaningful duplicate warning if applicable.
5. See existing dataset metadata.
6. Access an authorized existing copy instead of creating redundancy.

An administrator should be able to:

1. Manage users and roles.
2. Manage dataset classifications.
3. Configure access policies.
4. Monitor downloads.
5. View duplicate-prevention statistics.
6. Review security alerts.
7. Investigate audit events.
8. Detect suspicious/bulk data extraction.
9. Investigate dataset integrity violations.

The developer should finish the project understanding not only **how the application works**, but also **why each cybersecurity and algorithmic component exists**.
