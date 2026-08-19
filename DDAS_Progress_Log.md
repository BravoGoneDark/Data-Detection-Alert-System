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

## 8. Roadmap

`Core DDAS → PostgreSQL → Authentication → RBAC → Duplicate Alerts → Metadata Similarity → TF-IDF/Cosine → MinHash/SimHash → LSH → Audit Logging → Bulk Download Detection → DLP → Security Dashboard → Advanced UI/Animation → C++ Optimization`

Stage 3 (Authentication) is now in progress — see Section 9.

---

## 9. Stage 3 — Authentication (In Progress)

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

### 9.7 Not Yet Done (remaining Stage 3 work)

- `auth.py` — actual `/auth/signup` and `/auth/login` FastAPI route endpoints, following the same inline-Pydantic-model convention established in `main.py` (no separate `schemas.py` file introduced yet).
- Signup validation returning distinct `HTTPException` messages for a taken username vs. a taken email.
- Login endpoint accepting a single identifier field (username or email) and returning a signed JWT on success.
- A `get_current_user` FastAPI dependency that decodes the JWT from the `Authorization: Bearer <token>` header, for use in protecting routes.
- Applying that dependency to `/datasets/upload`, making it require a logged-in user.
- Frontend login/signup UI and token storage/attachment to requests.
- Manual end-to-end verification: signup → login → receive token → call protected upload endpoint with and without a valid token.
- Commit made for the completed portion of this work; the remainder above will follow in a subsequent commit once implemented.
