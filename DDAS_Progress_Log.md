# DDAS — Detailed Technical Progress Log

**Project:** Secure Data Download Duplication & Anomaly Detection System (DDAS)
**Date:** August 17–21, 2026
**Covers:** Stage 1 (Core Duplicate Detection), Stage 2 (PostgreSQL Persistence), Stage 3 (Authentication — complete with animated auth UI), Stage 4 (RBAC), and Stage 5 (Content-Addressable Storage, Duplicate Alert Refinement, Classification-based Access Control)

---

## 1. Project Structure Evolution

At the start of today, the repository did not exist. By the end of today, the structure is:

```
ddas/
├── frontend/
│   ├── src/
│   │   ├── App.jsx          ← Stage 1: upload UI + result display
│   │   ├── index.css        ← Stage 1: Tailwind v4 import
│   │   └── main.jsx         ← Vite default entry point
│   ├── vite.config.js       ← Stage 1: React + Tailwind plugin config
│   ├── index.html
│   └── package.json
│
├── backend/
│   ├── app/
│   │   ├── main.py          ← Stage 1 (in-memory) → Stage 2 (Postgres-backed)
│   │   ├── database.py      ← Stage 2: SQLAlchemy engine/session setup
│   │   └── models.py        ← Stage 2: Dataset table definition
│   ├── alembic/
│   │   ├── env.py           ← Stage 2: migration environment config
│   │   └── versions/
│   │       └── 8d51a122e03e_create_datasets_table.py
│   ├── alembic.ini          ← Stage 2: Alembic configuration file
│   ├── requirements.txt     ← Stage 1: fastapi, uvicorn, python-multipart
│   │                          Stage 2: + sqlalchemy, psycopg2-binary, alembic, python-dotenv
│   ├── .env                 ← Stage 2: DATABASE_URL (gitignored, never committed)
│   └── venv/                ← Python virtual environment (gitignored)
│
├── docker-compose.yml       ← Stage 2: defines the Postgres container
├── .env.example             ← Stage 2: documents required env vars without secrets
├── .gitignore
└── docs/
```

**Structural shift between Stage 1 and Stage 2:** Stage 1 had no `database.py` or `models.py` — all state lived inside a single Python list (`dataset_registry`) declared directly in `main.py`. Stage 2 introduced a proper separation of concerns: `database.py` owns the connection/session machinery, `models.py` owns the table schema, and `main.py` was reduced to just routing and business logic, querying the database through those two new files rather than manipulating a list directly. This separation is what allows every future stage (auth, RBAC, audit logs) to add new tables/models without touching the connection logic at all.

---

## 2. Backend Technologies

### 2.1 Python
The language the entire backend is written in. Version in use: **3.13.3**. Chosen because it's the language the spec calls for, and pairs naturally with FastAPI, SQLAlchemy, and the eventual C++ interop stage (via bindings) later in the roadmap.

### 2.2 FastAPI
The web framework used to define the API. FastAPI was chosen (over alternatives like Flask or Django) because:
- It's built around Python type hints, which lets it auto-generate request validation and interactive API documentation with almost no extra code.
- It's asynchronous-native (`async def` routes), which matters for an I/O-heavy app like this (file uploads, database queries, eventually external service calls).
- It auto-generates the Swagger UI (`/docs`) and ReDoc (`/redoc`) documentation pages directly from route definitions — this has been the primary manual testing tool so far, letting us test `/datasets/upload` without needing the frontend built yet.
- It's currently the dominant choice for building performant, modern Python APIs, making it directly relevant experience.

FastAPI itself does **not** run a server — it only defines *what* happens when a request arrives. Something else has to actually listen on a network port and hand requests to it.

### 2.3 Uvicorn
The ASGI (Asynchronous Server Gateway Interface) server that actually runs the FastAPI application. It listens on `localhost:8000`, accepts incoming HTTP connections, and passes them into the FastAPI app. Run via:
```
uvicorn app.main:app --reload
```
The `--reload` flag makes it watch source files and auto-restart on save — a development convenience, not something used in production.

### 2.4 python-multipart
A dependency FastAPI requires internally to parse `multipart/form-data` requests — the encoding used whenever a file is uploaded via an HTML form or `fetch()`/`FormData`. Without this installed, the `UploadFile` parameter type in the upload route would fail to parse incoming files at all.

### 2.5 hashlib (Python standard library)
Used to compute the SHA-256 hash of uploaded file bytes. Part of Python's standard library — no installation needed. This is the actual core algorithm of Stage 1: a cryptographic hash function that takes arbitrary-size input (the file's raw bytes) and produces a fixed-size, 256-bit (64 hex character) fingerprint. Key properties relied on:
- **Deterministic** — identical file content always produces an identical hash, which is the entire basis for duplicate detection.
- **Avalanche effect** — a single changed bit produces a completely different hash, meaning this method only catches *byte-for-byte identical* files, not modified/renamed ones (a deliberate scope boundary — near-duplicate detection is a separate, later stage using different algorithms: TF-IDF, MinHash, SimHash, LSH).
- **Collision-resistant** — it is computationally infeasible for two different files to produce the same hash, which is why "same hash" can be trusted to mean "same file" without re-reading both files byte-by-byte.

### 2.6 Pydantic
FastAPI's built-in data-validation library (installed automatically as a FastAPI dependency, not added separately). Used to define the shape of API responses — `UploadResult` and (from Stage 2) `ExistingDataset` are Pydantic models. Pydantic validates that data matches declared types before it's sent back as JSON. In Stage 2, the `from_attributes = True` config option was needed so Pydantic could read values directly off a SQLAlchemy database object rather than only accepting plain Python dictionaries.

### 2.7 CORS Middleware (part of FastAPI/Starlette)
Configured in `main.py` to explicitly allow requests from `http://localhost:5173` (the Vite dev server's default address). Browsers block cross-origin requests by default as a security measure — since the frontend (port 5173) and backend (port 8000) run on different ports, they're considered different "origins," and without this middleware explicitly allowing it, the browser would silently block the frontend's `fetch()` calls to the API.

---

## 3. Database Technologies (Introduced in Stage 2)

### 3.1 PostgreSQL
The relational database system storing all persistent data, version **16**, run via Docker rather than installed natively on Windows. Chosen over alternatives for several concrete reasons:
- **Relational integrity** — future entities (users, datasets, download events, audit log entries) all reference each other. Postgres enforces these relationships at the database level via foreign keys, rather than relying on application code to keep everything consistent.
- **Proper concurrent write handling** — multiple simultaneous uploads/downloads from different users need ACID-compliant transactions and row-level locking, which Postgres provides and an in-memory structure or flat file cannot.
- **Indexing** — Postgres supports proper B-tree indexes (used here on the `sha256` column), enabling fast lookups even as the dataset table grows large, versus the linear O(n) scan Stage 1's Python list required.
- **Industry-standard choice** — Postgres is the most common relational database in real-world data platforms, making this directly relevant, interview-worthy experience.
- **Future-relevant features** — later similarity-detection stages may use Postgres extensions like `pg_trgm` for text similarity, which simpler databases (SQLite) don't offer.

**SQLite** was considered as a simpler alternative but rejected because it handles concurrent writes poorly and lacks the extension ecosystem the later similarity-detection stages will likely need. **MongoDB** was not used because this data is inherently relational (not document-oriented), and Postgres gives stronger consistency guarantees for that shape of data.

### 3.2 Docker / Docker Desktop
Used to run PostgreSQL inside a container rather than installing it natively on Windows. Reasons this was chosen:
- One command (`docker compose up -d`) starts a fully configured Postgres instance; one command (`docker compose down -v`) destroys it completely cleanly — useful while iterating on schema design.
- Avoids Windows-specific installation quirks (service management, `pg_hba.conf` configuration, manual password setup).
- Matches how Postgres is run in most real engineering teams, making it directly relevant experience.
- The project's planned final repository structure already called for a `docker-compose.yml` at the root.

Docker Desktop runs on top of **WSL2** (Windows Subsystem for Linux) under the hood on Windows machines.

### 3.3 docker-compose.yml
Defines the Postgres service declaratively: which image to use (`postgres:16`), the container name (`ddas_postgres`), environment variables for the default user/password/database name, the port mapping (host `5432` → container `5432`), and a **named volume** (`ddas_pg_data`) that persists the actual database files outside the container's filesystem — meaning a container restart does not lose data; only an explicit volume deletion would.

### 3.4 SQLAlchemy
The Object-Relational Mapper (ORM) used to interact with Postgres from Python. Rather than writing raw SQL strings by hand, database tables are defined as Python classes (see `models.py`, the `Dataset` class), and rows are queried/inserted using Python method calls that SQLAlchemy translates into SQL under the hood.

Why an ORM was chosen over raw SQL:
- Reduces risk of SQL injection and typo-based bugs from manually building SQL strings.
- Makes schema changes easier to track and reason about across many future stages.
- Still fully transparent — the underlying SQL SQLAlchemy generates can be inspected/logged at any time, so nothing is hidden.

Trade-off acknowledged: raw SQL can be more directly controlled and occasionally more efficient for complex queries, but for a project going through many incremental schema changes (auth, RBAC, audit logs all still to come), the ORM's maintainability benefit outweighs that cost.

Specific SQLAlchemy components used:
- **`create_engine`** — establishes the connection pool to Postgres using the `DATABASE_URL`.
- **`sessionmaker`** — a factory that creates database "sessions," each representing a single unit-of-work / conversation with the database (used per-request in FastAPI via dependency injection).
- **`declarative_base`** — the base class all table models (like `Dataset`) inherit from, which is how SQLAlchemy knows which Python classes correspond to which database tables.

### 3.5 psycopg2-binary
The actual low-level driver that allows Python (via SQLAlchemy) to communicate with PostgreSQL over the wire — SQLAlchemy is a layer on top of this, not a replacement for it. The "binary" variant ships a precompiled version so it doesn't need to be built from source. Version pinned in `requirements.txt` was bumped from `2.9.9` to `2.9.12` after `2.9.9` failed to install on Python 3.13 (no prebuilt wheel available for that Python version at that package version — `2.9.12` did have one, resolving the issue without needing to switch database drivers entirely).

### 3.6 Alembic
The migration tool used to manage database schema changes over time as versioned, trackable scripts rather than manual/ad-hoc table edits. This directly satisfies a hard requirement from the project specification: schema changes must use migrations and must never silently destroy existing data.

How it works in this project:
- `alembic init alembic` scaffolded the migration environment (`alembic/env.py`, `alembic/versions/`, `alembic.ini`).
- `alembic/env.py` was configured to load `DATABASE_URL` from `.env` (via `python-dotenv`) and to point at the SQLAlchemy models' metadata (`Base.metadata`), so it knows what the "target" schema should look like.
- `alembic revision --autogenerate -m "create datasets table"` compared the live Postgres database against the Python models and automatically generated a migration script describing the difference (in this case: create the entire `datasets` table plus its two indexes).
- `alembic upgrade head` actually executed that migration against the real database.
- Alembic tracks which migrations have been applied via its own bookkeeping table, `alembic_version`, which now exists in the database alongside `datasets`.

This means any future schema change (e.g., adding an `owner_id` column to `datasets` once auth exists) will follow the same pattern: edit the model → autogenerate a migration → review it → apply it — never a manual, untracked `ALTER TABLE`.

### 3.7 python-dotenv
A small library used to load key-value pairs from a `.env` file into the application's environment variables at runtime (`load_dotenv()` in both `database.py` and `alembic/env.py`). This is what allows `DATABASE_URL` (containing the database password) to live outside the actual source code.

### 3.8 .env / .env.example
`.env` (inside `backend/`) holds the real, local `DATABASE_URL` connection string, including the development database password. It is listed in `.gitignore` and is never committed to version control — this is standard practice to avoid leaking credentials into a public or shared repository's history. `.env.example` (at the repo root) documents the *shape* of what's required (`DATABASE_URL=postgresql://...`) without containing any real secret, so anyone cloning the repo knows what environment variables they need to supply themselves.

---

## 4. Frontend Technologies

### 4.1 React
The UI library used to build the frontend, chosen because it's the framework with the most existing familiarity (from prior projects — ResearchPrototype, Wealth Team Quiz), and is explicitly specified in the project's technology stack.

### 4.2 JavaScript (not TypeScript)
Initially scaffolded as TypeScript, then deliberately switched to plain JavaScript partway through setup as a simplification decision — fewer moving parts given the project already has substantial complexity on the backend side (Postgres, auth, RBAC, cryptography, similarity algorithms all still ahead). Trade-off acknowledged at the time: TypeScript would have caught certain bugs at write-time (particularly around the shape of API responses flowing between frontend and backend), but was judged not essential for a project of this scope.

### 4.3 Vite
The frontend build tool and dev server, chosen over alternatives like Create React App because it's dramatically faster (native ES modules in development, no full bundling needed until production build) and is the current standard tool for scaffolding React projects. Scaffolded via `npm create vite@latest . -- --template react` (the plain JavaScript React template).

### 4.4 Tailwind CSS (v4)
A utility-first CSS framework used for all styling in the current bare-bones UI. Version 4 specifically was used, which is a significant change from earlier Tailwind versions: it integrates directly via a Vite plugin (`@tailwindcss/vite`) and requires no `tailwind.config.js` or `postcss.config.js` files — styling is enabled with a single `@import "tailwindcss";` line in the main CSS file. This is a leaner setup than Tailwind v3's typical configuration.

### 4.5 Other frontend dependencies installed but not yet used
The following were installed proactively during scaffolding, anticipating later stages, but have not been used in any code yet:
- **lucide-react** — icon library, will be used once the UI moves beyond the bare Stage 1 upload card (dashboards, admin panel, etc.).
- **recharts** — charting library, intended for the eventual security dashboard (download statistics, duplicate-prevention metrics).
- **motion** (the modern successor package to `framer-motion`) — animation library for page transitions, modals, and UI interactions, intentionally deferred until there are multiple real screens/pages to animate between.

Deliberately **not yet installed**: shadcn/ui, Kokonut UI, Anime.js — all deferred until a dedicated visual design pass, once the functional skeleton (auth, RBAC, similarity detection, dashboard) exists to actually apply them to. Installing them now was judged likely to mean redoing configuration/styling decisions multiple times as the data model evolves.

---

## 5. Tooling / Environment

### 5.1 Git & GitHub
Version control for the project. Repository initialized locally (`git init`) and connected to a GitHub remote. Commit history so far:
1. `Initial commit`
2. `chore: initial repo structure`
3. `chore: scaffold frontend (Vite+React+JS+Tailwind) and backend (FastAPI) structure` — this commit inadvertently also contains Stage 1's actual implementation code (`main.py`, `App.jsx`) due to an earlier broad `git add .`, rather than being split into its own commit as originally planned. Left as-is by decision rather than rewriting history.
4. *(pending, not yet committed at time of writing)* Stage 2: PostgreSQL persistence via SQLAlchemy + Alembic.

### 5.2 Python virtual environment (venv)
Created via `python -m venv venv` inside `backend/`, activated per-session via `venv\Scripts\Activate.ps1` (Windows PowerShell syntax). Purpose: isolates this project's Python dependencies from the system-wide Python installation, so package versions here don't conflict with any other Python project on the machine.

### 5.3 PowerShell
All terminal commands standardized to PowerShell syntax (as opposed to bash/Unix syntax) per explicit preference, since the development machine is Windows. Notable divergence hit during setup: `source venv/bin/activate` (bash) has no PowerShell equivalent by that name — the correct command is `venv\Scripts\Activate.ps1`.

---

## 6. Issues Encountered and Resolved Today

| Issue | Cause | Resolution |
|---|---|---|
| `source venv/bin/activate` not recognized | That's a bash command, not PowerShell | Used `venv\Scripts\Activate.ps1` instead |
| `docker` command not recognized right after install | PATH not yet refreshed in open terminal sessions | Fully restarted VS Code |
| `psycopg2-binary==2.9.9` failed to build (`pg_config` not found) | No prebuilt wheel for that version on Python 3.13; pip fell back to building from source, which needs Postgres dev tools not installed on the machine | Installed without version pinning; got `2.9.12`, which had a prebuilt wheel for Python 3.13 |
| `alembic` command not recognized | Package hadn't actually installed successfully despite being listed in `requirements.txt` | Ran `pip install alembic` directly inside the activated venv |
| `psql` output left terminal stuck at a `:` prompt | This is `psql`'s built-in pager (not a hang or error) | Pressed `q` to exit the pager and return to the normal prompt |

---

## 7. Verified Working End-to-End (as of end of today)

1. File uploaded → SHA-256 computed → checked against Postgres `datasets` table → correctly identified as unique or duplicate.
2. Server fully restarted → previously uploaded file re-uploaded → still correctly identified as a duplicate, with the original database row's `id` and `uploaded_at` returned — proving true persistence, which was the entire purpose of Stage 2.
3. Direct SQL inspection via `psql` confirms the `datasets` table content matches exactly what the API reports.
4. Frontend (`localhost:5173`) successfully communicates with backend (`localhost:8000`) across origins via configured CORS middleware.

---

## 8. Roadmap

`Core DDAS → PostgreSQL → Authentication → RBAC → Duplicate Alerts → Metadata Similarity → TF-IDF/Cosine → MinHash/SimHash → LSH → Audit Logging → Bulk Download Detection → DLP → Security Dashboard → Advanced UI/Animation → C++ Optimization`

Stage 3 (Authentication) — complete, see Section 9. Stage 4 (RBAC) — complete, see Section 10.

**Open item before Stage 5 begins:** the system currently stores only file hash + metadata (filename, size, timestamp) in Postgres — never the actual file bytes. Real deployment will require object storage (S3-compatible or equivalent), with the DB row extended to hold a storage pointer. Not yet assigned to a specific stage — a decision is needed on whether to fold this into Stage 5 or make it its own explicit stage.

---

## 9. Stage 3 — Authentication (Complete)

**Date:** August 18, 2026
**Status:** User model, migration, and crypto helper module complete and verified. Signup/login endpoints and route protection still pending.

### 9.1 Project Structure Additions

```
backend/
├── app/
│   ├── main.py          ← unchanged this session
│   ├── database.py      ← unchanged this session
│   ├── models.py        ← Stage 3: added User class alongside Dataset
│   └── security.py      ← Stage 3 (new): argon2 password hashing + JWT creation/decoding
├── alembic/
│   └── versions/
│       └── c7c0961ffdc9_add_users_table.py   ← Stage 3: new users table migration
└── .env                 ← Stage 3: added JWT_SECRET_KEY alongside existing DATABASE_URL
```

No new top-level folders. Stage 3 additively extends Stage 2's structure rather than restructuring it — `models.py` now defines two tables (`Dataset`, `User`) instead of one, and `security.py` is a new module sitting alongside `database.py` at the same level.

### 9.2 New Concepts and Technologies

**Authentication vs. Authorization** — Stage 3 answers "who is making this request" (authentication). Stage 4 (RBAC) will separately answer "what is this identified user allowed to do" (authorization). Keeping these as two distinct stages mirrors how real systems separate identity verification from permission checking — a user can be authenticated (logged in) but still denied access to a specific action if they lack the right role.

**Password hashing — why not SHA-256 again:** Stage 1 used SHA-256 to fingerprint file contents, and it was tempting to reach for the same tool here, but password hashing has the opposite design goal from file hashing. File hashing (SHA-256) is deliberately **fast** — you want to hash large files quickly and compare many of them. Password hashing must be deliberately **slow and computationally expensive**, because if a database of hashed passwords is ever stolen, a fast hash lets an attacker try billions of guesses per second on cheap hardware (a "brute-force" attack). Slow, memory-hard hashing functions make that attack impractical even with stolen data.

**Argon2 (specifically Argon2id)** — the password hashing algorithm chosen for DDAS, via the `argon2-cffi` Python library. Argon2 won the Password Hashing Competition in 2015 and is currently the most modern, recommended choice — stronger than the older, more commonly-tutorialized `bcrypt`, because it's resistant to both GPU-based cracking attempts and certain side-channel attacks, while requiring no manual tuning (the library's defaults are already sound). Two functions wrap this: `hash_password()` (turns a plaintext password into a secure hash for storage) and `verify_password()` (checks a login attempt's plaintext password against the stored hash, without ever needing to "decrypt" the hash — hashing is one-way by design).

**JWT (JSON Web Token)** — the mechanism chosen for proving a user's identity on subsequent requests after login, via the `python-jose` library. A JWT is a signed piece of data (here containing the user's ID and an expiration time) that the server generates once at login and hands to the client. On every future request, the client sends this token back, and the server verifies its cryptographic signature — proving the token hasn't been tampered with — without needing to look anything up in the database or maintain server-side session state. This was chosen over traditional session-based authentication (where the server stores session data and gives the client only a reference ID) because:
- The frontend (Vite, port 5173) and backend (FastAPI, port 8000) are separate origins — a stateless, header-based token avoids cross-origin cookie complications.
- Stage 4 (RBAC) will need the user's role available on every request; embedding it as a JWT claim means permission checks won't require a database round-trip on every single call.
- The tradeoff accepted: a JWT remains valid until it expires, even if a user "logs out" — there is no instant revocation without additional infrastructure (a token blacklist). This has been explicitly deferred as a future hardening item (likely bundled into Stage 10's audit logging or a dedicated security pass near Stage 12–13), not solved now. Current expiry is set to 24 hours.

**`python-jose[cryptography]`** — the specific library used to create and decode JWTs. The `[cryptography]` extra installs the underlying cryptographic backend needed for signing/verifying tokens (as opposed to a pure-Python fallback, which is slower and less standard).

**`argon2-cffi`** — the Python library providing Argon2 hashing. The `cffi` in the name refers to it being a C Foreign Function Interface binding — Argon2's reference implementation is written in C for performance, and this package provides the Python wrapper around it, rather than a pure-Python reimplementation.

### 9.3 Database Change: `users` Table

A new `User` SQLAlchemy model was added to `models.py`, with columns: `id` (primary key), `username` (unique, indexed), `email` (unique, indexed), `hashed_password`, and `created_at` (server-side default timestamp, same pattern as `Dataset.uploaded_at`).

**Design decision — username AND email, not just one:** the login flow will accept either identifier interchangeably (a single "identifier" field checked against both columns), a pattern seen in systems like GitHub. This means signup must separately validate that neither the chosen username nor email is already taken, and return distinct, specific error messages for each collision (rather than one generic error) — prioritizing user-friendliness for this hackathon-scope project, while acknowledging the minor security tradeoff that this makes it slightly easier for an outside party to determine whether a specific email is already registered.

**Design decision — no `role` column yet:** Role-based fields were deliberately excluded from this migration, kept strictly out of scope for Stage 3, and reserved for their own dedicated migration in Stage 4 (RBAC) — keeping each migration focused on exactly one stage's concern.

**Migration workflow followed (same pattern established in Stage 2):**
1. Added the `User` class to `models.py`.
2. Updated `alembic/env.py`'s import line to include `User` alongside the existing `Dataset` import — necessary because Alembic's autogenerate only detects model classes that have actually been imported somewhere and thus registered on the shared `Base.metadata`; simply defining a class in `models.py` isn't enough on its own.
3. Ran `alembic revision --autogenerate -m "add users table"`, which correctly detected only the new `users` table and its three indexes, leaving the existing `datasets` table untouched.
4. Reviewed the generated migration script before applying it (standard practice with autogenerate, since it's not infallible).
5. Ran `alembic upgrade head` to apply it.
6. Verified the live schema directly via `psql` (`docker exec -it ddas_postgres psql -U ddas_user -d ddas_db -c "\d users"`), confirming all five columns, the primary key, and both unique indexes exist exactly as modeled.

### 9.4 `.env` Change

Added `JWT_SECRET_KEY` alongside the existing `DATABASE_URL`, following the identical loading pattern (`load_dotenv()` + `os.getenv()`) already established in `database.py` — no second, inconsistent configuration system was introduced. The key itself was generated with Python's `secrets` module (`secrets.token_hex(32)`, producing a cryptographically random 64-character hex string) rather than typed manually, since a guessable or weak secret key would undermine the entire point of signing tokens — anyone who could guess or brute-force the key could forge valid tokens for any user. `.env` was reconfirmed as gitignored before committing, so neither the database password nor the new JWT secret enters version control.

### 9.5 Issues Encountered and Resolved

| Issue | Cause | Resolution |
|---|---|---|
| `ImportError: cannot import name 'Dataset' from 'app.models'` when running `alembic revision --autogenerate` | The `User` class was pasted into `models.py` in a way that overwrote the existing `Dataset` class entirely, rather than being added alongside it | Rewrote `models.py` to contain both classes |
| `psycopg2.OperationalError: connection to server ... Connection refused` during the same command | The Stage 2 Postgres Docker container (`ddas_postgres`) was not running at the time | Started it with `docker compose up -d`, confirmed via `docker ps` that port 5432 was listening before retrying |
| PowerShell `RedirectionNotSupported` error when running a `docker exec ... psql` command | Command was copy-pasted with literal angle-bracket placeholders (e.g. `<postgres_container_name>`) instead of substituting real values; PowerShell interprets `<` as a reserved redirection operator | Retrieved actual container name via `docker ps` and actual DB user/name from `docker-compose.yml`, substituted real values |
| VS Code showed "import 'dotenv' could not be resolved" on a working line of code | Pylance (VS Code's Python language server) was not pointed at the project's venv interpreter — a cosmetic editor issue rather than a real missing dependency, confirmed working at runtime since `database.py` already relied on the same import successfully | Not yet fixed at time of writing; identified fix is VS Code's "Python: Select Interpreter" command, not yet performed |

### 9.6 Verified Working (as of end of this session)

1. `users` table exists in Postgres with the exact schema modeled in `models.py`, confirmed via direct `psql` inspection.
2. `security.py`'s `SECRET_KEY` loads correctly from `.env` at runtime (confirmed by printing it via a direct Python one-liner — a real 64-character value, not `None`).
3. Argon2 hashing/verification functions and JWT creation/decoding functions are written and import cleanly, but not yet exercised end-to-end through an actual HTTP request (no endpoints wired up yet).

### 9.7 Remaining Stage 3 Work — Completed

All items previously tracked here are now done and verified end-to-end:

- `auth.py` implemented with `/auth/signup` and `/auth/login`, following the inline-Pydantic-model convention (no separate `schemas.py`).
- Signup returns distinct `HTTPException` messages for a taken username vs. a taken email.
- Login accepts a single `identifier` field (username or email, resolved via SQLAlchemy `or_()`) and returns a signed JWT.
- `get_current_user` dependency implemented via plain `Header(None)` parsing (not `OAuth2PasswordBearer`) — decodes the `Authorization: Bearer <token>` header and loads the corresponding user.
- Applied to `/datasets/upload`, requiring a logged-in user.
- Frontend `AuthContext` built (localStorage-backed token state — flagged as a **deliberate, temporary** choice; migrating to in-memory/React-state-only before deployment remains an open XSS-hardening item), with `App.jsx` restructured into `AuthProvider → AuthenticationPage → UploadPanel`.
- Upload requests attach the `Authorization: Bearer` header automatically and auto-logout on `401`.
- Manually verified end-to-end: signup (auto-login) → login → protected upload with valid token succeeds → protected upload without a token / with an invalid token is rejected.

**Debugging chain resolved during this stage** (kept here for interview-recall purposes):
- Router-include-before-app-defined ordering bug.
- Dropped lines in `upload_dataset` during an earlier edit.
- `main.py` was mistakenly placed inside `app/` instead of at the `backend/` root — caused a silent `"could not import module main"` failure with no useful traceback, since uvicorn's module resolution depends on `main.py`'s exact location relative to the working directory.
- A Swagger UI header-input bug (testing the `Authorization` header manually through `/docs`).
- A stale-token-across-server-restart issue, caused by `--reload` restarting the app process (and thus its in-memory JWT secret handling) without the frontend re-authenticating.

### 9.8 Animated Authentication UI — Scoped Styling Exception

Although the project's styling work is formally deferred to Stage 14 (Advanced UI/Animation), a **one-time, explicitly scoped exception** was made to build a full cinematic auth experience — covering only the pre-login screen (background + modal), not the rest of the app.

**Components built:**
- `AuthenticationPage.jsx` — hard-gates the upload UI behind authentication (no dismissible overlay); bypasses entirely once `isAuthenticated` is true.
- `AuthTrigger.jsx` — an animated lock icon (Motion) that "unlocks" (shackle animates open) on click before triggering the modal.
- `AuthModal.jsx` — login/signup form with a Motion `layoutId`-based shared-element transform from the trigger, a spring-animated login/signup mode pill, animated field transitions, and a cyan/black "secure access" visual language.
- `CyberBackground.jsx` — composited background, iterated significantly over the stage:
  - **Initial version:** four independent layers — Unsplash-image parallax, an Anime.js SVG fluid-blob morph, a `@react-three/fiber`/drei WebGL wireframe geometry field (7 independently animated shapes), and a canvas-based particle/network system.
  - **Current version (after iteration):** simplified to two layers — `MatrixSky` (a CSS/DOM digit-rain effect) and `TurbulentFlowingGrid` (a single `@react-three/fiber` wireframe plane whose vertices are displaced each frame via a sine/cosine function of position and time, and which tilts based on whether the modal is open), plus a centered `DDAS` branding panel. The four-layer version was judged too visually busy; this was a deliberate simplification, not a regression.
- `FormField.jsx` — shared input component used by the modal (password visibility toggle, label styling).

**New dependencies introduced:** `motion` (not the deprecated `framer-motion` package — per project convention), `animejs`, `three`, `@react-three/fiber`, `@react-three/drei`.

**Outcome:** the auth UI was reviewed and explicitly accepted as final for now — no further visual iteration planned on this screen. The rest of the application (upload panel, future dashboards) remains unstyled, intentionally, until Stage 14.

**Known open item carried forward:** the continuous-animation layers in `CyberBackground.jsx` (`MatrixSky`, `TurbulentFlowingGrid`) do not currently check `prefers-reduced-motion`, unlike the accessibility goal stated in the spec for Stage 14. To be addressed in a dedicated reduced-motion pass later, alongside the rest of the app's animations.

---

## 10. Stage 4 — RBAC (Role-Based Access Control) — Complete

### 10.1 Project Structure Change

```
backend/
├── app/
│   ├── main.py             ← Stage 4: /datasets/upload now depends on require_permission()
│   ├── database.py         ← unchanged this stage
│   ├── models.py           ← Stage 4: added Role, Permission, role_permissions join table;
│   │                          User gained role_id (FK) + role relationship;
│   │                          Dataset gained classification column (unused so far)
│   ├── auth.py              ← Stage 4: signup() now explicitly assigns the STUDENT role
│   ├── authorization.py    ← Stage 4 (new): user_has_permission() + require_permission()
│   └── security.py         ← unchanged this stage
├── alembic/
│   └── versions/
│       └── ef72dd21ef93_add_rbac_tables.py   ← Stage 4: roles/permissions/role_permissions
│                                                  tables, users.role_id, datasets.classification,
│                                                  seed data, existing-user backfill
```

### 10.2 Concept: Why Permissions, Not Hardcoded Role Checks

The naive approach — `if user.role == "admin"` scattered through route handlers — was deliberately avoided. Instead, RBAC here is built as a **permission-matrix lookup**:

- A **role** (`ADMIN`, `FACULTY`, `RESEARCHER`, `STUDENT`, `GUEST`) is just a named bundle of **permissions** (`dataset:view`, `dataset:upload`, `audit:view`, `user:manage`, etc.).
- Routes never reference role names directly. A route declares the *permission* it requires (e.g. `dataset:upload`), and a single reusable dependency checks whether the current user's role grants that permission.
- This means changing what a role can do is a **data change** (editing rows in `role_permissions`), not a **code change** — and adding an entirely new role later requires no route code to be touched at all.

This design matches the spec's explicit RBAC section (roles + permissions + a `role_permissions` join table, rather than a single `role` string column on `users`), chosen deliberately over the simpler string-column approach for a stronger interview story ("I implemented RBAC as a permission lookup, not role comparisons").

### 10.3 Database Design

Four schema changes, in one migration:

- **`roles`** — `id`, `name` (unique), `description`. Seeded with `ADMIN`, `FACULTY`, `RESEARCHER`, `STUDENT`, `GUEST`.
- **`permissions`** — `id`, `name` (unique), `description`. Seeded with `dataset:view`, `dataset:download`, `dataset:upload`, `dataset:delete`, `dataset:modify`, `dataset:manage_access`, `audit:view`, `security:view`, `user:manage`, `alert:manage`.
- **`role_permissions`** — pure join table (`role_id`, `permission_id` composite primary key), no extra columns. Modeled in SQLAlchemy as a plain `Table`, not a mapped class, since it carries no data of its own beyond the two foreign keys.
- **`users.role_id`** — new foreign key to `roles.id`. Added as **nullable** initially, backfilled to STUDENT for all pre-existing rows, then altered to `NOT NULL` — necessary ordering, since adding a `NOT NULL` column directly against a table with existing rows would fail immediately.
- **`datasets.classification`** — added now (nullable, unused) to avoid a second migration when Stage 5 introduces classification-based access rules (`PUBLIC` / `INTERNAL` / `RESTRICTED` / `CONFIDENTIAL`, per the spec's Dataset Classification section). No enforcement logic reads this column yet.

**Seeded role → permission mapping** (a reasonable default, not spec-mandated):

| Role | Permissions |
|---|---|
| ADMIN | all ten |
| FACULTY | `dataset:view`, `dataset:download`, `dataset:upload`, `dataset:modify`, `audit:view` |
| RESEARCHER | `dataset:view`, `dataset:download`, `dataset:upload` |
| STUDENT | `dataset:view`, `dataset:download`, `dataset:upload` |
| GUEST | `dataset:view` only |

New signups default to `STUDENT`. Promotion to other roles is manual (direct DB update) for now — no self-service role picker at signup, and no admin UI for role management yet (that's a later-stage concern).

### 10.4 `app/authorization.py` (New)

Two functions:
- `user_has_permission(user, permission)` — checks whether `permission` is present in `user.role.permissions` (a lazy-loaded SQLAlchemy relationship).
- `require_permission(permission)` — a **dependency factory**: takes a permission string and returns a FastAPI dependency that wraps `get_current_user`, checks the permission, raises `403` if missing, and otherwise returns the user — making it a drop-in replacement for `get_current_user` on any route that needs a specific permission rather than just "logged in."

Applied to `/datasets/upload` as `Depends(require_permission("dataset:upload"))`, replacing the plain `Depends(get_current_user)` used since Stage 3.

**Mechanical note:** `require_permission`'s inner check accesses `current_user.role.permissions` *after* `get_current_user` has already returned — this works without an extra explicit `db` dependency because FastAPI caches `Depends(get_db)` per-request, so `get_current_user` and the permission check share the same open SQLAlchemy session, allowing the lazy relationship load to succeed.

### 10.5 Migration Workflow

Same pattern as Stage 2/3, with one addition — seed data and a backfill step, since autogenerate only detects schema shape, not data:

1. Added `Role`, `Permission`, `role_permissions`, and the `User.role_id` / `Dataset.classification` changes to `models.py`.
2. Ran `alembic revision --autogenerate -m "add rbac tables"`, reviewed the generated script.
3. **Manually added** (autogenerate does not produce this): seed inserts for the five roles and ten permissions, the role→permission mapping inserts, and an `UPDATE users SET role_id = <student_id>` backfill — executed *before* `op.alter_column('users', 'role_id', nullable=False)`, so the ordering never violates the not-null constraint against existing rows.
4. Ran `alembic upgrade head`.
5. Verified directly via `psql` (`docker exec -it ddas_postgres psql -U ddas_user -d ddas_db`): confirmed 5 roles, 10 permissions, the full role→permission join, and all pre-existing users backfilled to STUDENT's `role_id`.

### 10.6 Issues Encountered and Resolved

| Issue | Cause | Resolution |
|---|---|---|
| `alembic` not recognized as a command | The project's venv wasn't activated in the current PowerShell session | Activated venv (`.\venv\Scripts\Activate.ps1`); confirmed `python -m alembic ...` as a PATH-independent fallback |
| `NameError: name 'Table' is not defined` when running `alembic revision --autogenerate` | `models.py`'s top-level `sqlalchemy` import wasn't updated to include `Table` and `ForeignKey` when the new `Role`/`Permission`/join-table code was added | Updated the import line to include `ForeignKey, Table`, plus `from sqlalchemy.orm import relationship` |
| Browser showed generic `"Failed to fetch"` on signup, with no HTTP status | Backend traceback (visible in the uvicorn terminal, not the browser) revealed the real cause below — the browser's `fetch()` never got a response because the backend process crashed handling the request | See below |
| `psycopg2.errors.NotNullViolation: null value in column "role_id"` on every new signup | The migration correctly backfilled *existing* users to STUDENT, but `auth.py`'s `signup()` function was never updated to set `role_id` when constructing a **new** `User` — so every new signup attempted to insert a null into a NOT NULL column | Updated `signup()` to look up the `STUDENT` role and pass `role_id=student_role.id` explicitly when constructing the new user |
| `ImportError: cannot import name 'User' from partially initialized module 'app.models' (circular import)` | A `from app.models import User, Role` line — intended for `auth.py` (which needed `Role` to look up the default role) — was instead pasted into `models.py` itself, causing `models.py` to try importing from itself | Removed the stray line from `models.py`; confirmed the correct import exists in `auth.py` instead |

**Debugging insight worth keeping:** the `"Failed to fetch"` browser error was a red herring on its own — it only means the network request never completed, and gives no indication of *why*. The real diagnostic signal was the backend's own terminal output (the unhandled exception traceback from uvicorn), not anything visible in the browser. This is a useful pattern to remember for future stages: when the frontend shows a generic network failure, check the backend terminal before the browser console.

### 10.7 Verified Working (end-to-end)

1. Migration applied cleanly; `roles`, `permissions`, `role_permissions` tables confirmed correct via direct `psql` inspection; all pre-existing users confirmed backfilled to STUDENT.
2. **Normal path:** a STUDENT-role user can sign up, log in, and successfully upload a file — `require_permission("dataset:upload")` allows the request through, response unchanged from Stage 3's behavior.
3. **Enforcement path:** the same authenticated user, demoted to GUEST directly in the database (no logout/re-login needed), is correctly **blocked** — `/datasets/upload` returns `403` with `"Missing required permission: dataset:upload"`. Confirms permission checks are evaluated fresh from the database on every request rather than cached in the JWT.
4. Confirms the authorization layer is real enforcement, not just schema scaffolding.

### 10.8 Not Yet Done / Deferred

- Classification-based access enforcement (`datasets.classification` column exists but nothing reads it yet) — completed in Stage 5.
- Admin UI for managing roles/permissions or reassigning users — role changes remain a manual DB operation for now.
- Audit event creation on a `403` denial (spec's RBAC flow diagram includes "Deny + Audit Event") — audit logging itself is Stage 10; this stage only implements the deny, not the logging of it.
- Self-service role requests or a role selector at signup — explicitly out of scope; new users always default to STUDENT.

---

## 11. Stage 5 — Content-Addressable Storage (CAS), Duplicate Refinement & Classification RBAC — Complete

### 11.1 Project Structure Change

```
backend/
├── app/
│   ├── main.py             ← Stage 5: Rich duplicate response, CAS integration, GET /datasets with classification filtering, GET /datasets/{id}/download
│   ├── storage.py          ← Stage 5 (new): StorageProvider interface & LocalContentAddressableStorage implementation
│   ├── models.py           ← Stage 5: Dataset updated with uploader_id, storage_path, download_count, description; User.datasets relationship
│   ├── authorization.py    ← Stage 5: Classification hierarchy & clearance enforcement (can_user_access_classification)
│   ├── database.py         ← unchanged
│   ├── auth.py              ← unchanged
│   └── security.py         ← unchanged
├── storage/
│   └── cas/                ← Stage 5 (new): Sharded physical file directory (cas/{hash[:2]}/{hash[2:4]}/{hash})
├── alembic/
│   └── versions/
│       └── 35b83eeb6210_add_storage_and_metadata_to_datasets.py   ← Stage 5: schema updates for storage & metadata
frontend/
└── src/
    └── App.jsx             ← Stage 5: Refined duplicate alert card with side-by-side comparison, "Use Existing vs. Proceed Anyway", classification picker, and dataset inventory table with authenticated downloads
```

### 11.2 Architectural Decisions

1. **Content-Addressable Storage (CAS):**
   - Rather than storing duplicate file bytes on disk or in object storage when users upload identical content, the physical file is stored keyed by its SHA-256 hash in a two-tier directory shard (`storage/cas/{sha256[:2]}/{sha256[2:4]}/{sha256}`).
   - Writing is atomic (writes to temporary file first, then `os.replace` to prevent race conditions).
   - If an identical file is uploaded or force-uploaded, CAS avoids redundant I/O and disk consumption (Single-Instance Storage).
   - Abstract `StorageProvider` base class allows transparent transition to S3/MinIO in the future without changing route logic.

2. **Refined Duplicate Resolution Workflow:**
   - **Canonical Detection:** When a hash collision is detected, the API returns `duplicate: true` along with rich metadata of the existing canonical record (`id`, `filename`, `sha256`, `size_bytes`, `uploaded_at`, `classification`, `uploader_username`, `download_count`).
   - **Use Existing (Acknowledge):** User can directly utilize or download the canonical file without redundant registration.
   - **Proceed Anyway (Force Upload / Alias):** If the user passes `force=true`, the system registers a distinct `Dataset` row (preserving their chosen filename, owner, description, classification) while pointing to the identical CAS storage path.

3. **Classification-Based RBAC Enforcement:**
   - Spec hierarchy: `PUBLIC (0)` < `INTERNAL (1)` < `RESTRICTED (2)` < `CONFIDENTIAL (3)`.
   - Role clearance limits:
     - `ADMIN`: Level 3 (`PUBLIC`, `INTERNAL`, `RESTRICTED`, `CONFIDENTIAL`)
     - `FACULTY` & `RESEARCHER`: Level 2 (`PUBLIC`, `INTERNAL`, `RESTRICTED`)
     - `STUDENT`: Level 1 (`PUBLIC`, `INTERNAL`)
     - `GUEST`: Level 0 (`PUBLIC` only)
   - `GET /datasets` filters out datasets exceeding the caller's clearance level.
   - `GET /datasets/{id}/download` validates both `dataset:download` permission and security clearance, raising `403 Forbidden` if clearance is insufficient.

### 11.3 Database Schema & Migration (`35b83eeb6210`)

- `datasets.uploader_id` — `Integer`, Foreign Key to `users.id` (nullable).
- `datasets.storage_path` — `String` (nullable).
- `datasets.download_count` — `Integer`, `server_default='0'`, `nullable=False`.
- `datasets.description` — `String` (nullable).
- `datasets.sha256` index — updated from `unique=True` to `unique=False` (enabling alias records for force-uploads).
- Existing rows backfilled with `classification = 'INTERNAL'`.

### 11.4 Verified Working (End-to-End)

Verified via automated test script (`backend/test_stage5.py`) and UI workflow:
1. **Signup & Login:** Authenticated session established with JWT.
2. **Unique Upload:** File bytes stored in sharded CAS path; database record created with `uploader_id`, `storage_path`, and `download_count=0`.
3. **Duplicate Alert Refinement:** Re-uploading identical bytes returned `duplicate: true` with rich canonical metadata (filename, uploader name, upload date, classification).
4. **Force Upload / Alias Registration:** Force upload created a distinct dataset ID while sharing the existing CAS storage file.
5. **Dataset Inventory Listing:** `GET /datasets` returns active inventory sorted by newest first.
6. **Authenticated Streaming Download:** `GET /datasets/{id}/download` streams exact binary bytes with `Content-Disposition: attachment` and increments `download_count`.
7. **Classification Security Gate:** A `CONFIDENTIAL` dataset is automatically hidden from `STUDENT` listings and returns `403 Forbidden` when a student attempts direct download.

### 11.5 Not Yet Done / Deferred

- Stage 6: Metadata similarity matching (beyond exact content hash).
- Stage 7–9: Near-duplicate detection algorithms (TF-IDF, MinHash/SimHash, LSH).
- Stage 10: Audit logging on access denials and download events.
