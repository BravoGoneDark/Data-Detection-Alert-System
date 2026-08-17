# DDAS — Detailed Technical Progress Log

**Project:** Secure Data Download Duplication & Anomaly Detection System (DDAS)
**Date:** August 17–18, 2026
**Covers:** Stage 1 (Core Duplicate Detection) and Stage 2 (PostgreSQL Persistence)

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

## 8. Not Yet Started

**Stage 3 — Authentication** is next in the roadmap:
`Core DDAS → PostgreSQL → Authentication → RBAC → Duplicate Alerts → Metadata Similarity → TF-IDF/Cosine → MinHash/SimHash → LSH → Audit Logging → Bulk Download Detection → DLP → Security Dashboard → Advanced UI/Animation → C++ Optimization`

No authentication-related code, dependencies, or concepts have been introduced yet.
