# Story 13.1: Harness API Foundation

Status: done

## Story

As an admin,
I want the Language Learning harness API to be running and accessible,
so that my phone can connect to the learning service.

## Acceptance Criteria

1. **AC-1: Health endpoint** — Given the harness API is deployed in a Podman container, When a request is sent to `GET /health`, Then the API responds with `{ status: "ok" }` and HTTP 200.

2. **AC-2: Unauthenticated request rejection** — Given a request to any harness endpoint without an Authorization header, When the request is received, Then the API responds with HTTP 401 and `{ detail: "Not authenticated" }`.

3. **AC-3: Valid JWT extraction** — Given a request with a valid Supabase JWT in the Authorization header, When the request is received, Then the API extracts the userId from the JWT `sub` claim and makes it available to the route handler.

4. **AC-4: Invalid/expired JWT rejection** — Given a request with an expired or invalid JWT, When the request is received, Then the API responds with HTTP 401 and `{ detail: "Invalid token" }`.

## Tasks / Subtasks

- [x] Initialize `harness/` project skeleton within FamilyHub repo (AC: #1-#4)
  - [x] Create `harness/` directory in repo root with full directory structure from architecture
  - [x] Create `pyproject.toml` with dependencies: `fastapi`, `uvicorn[standard]`, `pyjwt`, `pydantic`, `pydantic-settings`
  - [x] Create `config.py` with `pydantic-settings` loading `SUPABASE_JWT_SECRET`, `FLUENT_DATA_DIR`, `LOG_LEVEL`
  - [x] Create `main.py` with FastAPI app, CORS middleware, router registration, lifespan handler
  - [x] Create empty `routers/__init__.py`, `services/__init__.py`, `models/__init__.py`
- [x] Implement JWT auth middleware (AC: #2-#4)
  - [x] Create `models/responses.py` with Pydantic models (not yet all, just foundation)
  - [x] Create `dependencies.py` with `get_current_user` dependency
  - [x] Decode JWT using `SUPABASE_JWT_SECRET`, extract `sub` and `email`
  - [x] Return `UserContext` dataclass with `user_id` and `email`
  - [x] Handle missing Authorization header → HTTP 401 `"Not authenticated"`
  - [x] Handle expired/invalid JWT → HTTP 401 `"Invalid token"`
- [x] Implement health endpoint (AC: #1)
  - [x] Create `routers/health.py` with `GET /health` returning `{ status: "ok" }`
  - [x] Health endpoint is UNAUTHENTICATED (no `get_current_user` dependency)
- [x] Create Containerfile (AC: #1)
  - [x] Python 3.11 base image, `uv` for dependency installation
  - [x] `HEALTHCHECK CMD curl -f http://localhost:8000/health`
  - [x] Expose port 8000, CMD `uvicorn main:app --host 0.0.0.0 --port 8000`
- [x] Create `.env.example` with `SUPABASE_JWT_SECRET=`, `FLUENT_DATA_DIR=/data/users`, `LOG_LEVEL=info`
- [x] Verify with local Podman build and run (AC: #1-#4)
  - [x] `podman build -t familyhub-harness .` (from `harness/` directory)
  - [x] `podman run -p 8000:8000 --env-file .env familyhub-harness`
  - [x] Test `GET /health` → 200
  - [x] Test unauthenticated `GET /auth/status` → 401
  - [x] Test with valid Supabase JWT → userId extracted
  - [x] Test with expired JWT → 401

## Dev Notes

### Repository Location

The harness lives in `harness/` within the FamilyHub repo. This is a Python/FastAPI backend alongside the React Native mobile app. Create all harness files under `harness/` in the repo root (sibling to `src/`, `supabase/`, `app.config.ts`, etc.).

### Target Directory Structure

```
harness/                               ← Within FamilyHub repo root
├── main.py                          ← FastAPI app, router registration, CORS, lifespan
├── config.py                        ← pydantic-settings: SUPABASE_JWT_SECRET, FLUENT_DATA_DIR, LOG_LEVEL
├── dependencies.py                  ← get_current_user (JWT verification)
├── routers/
│   ├── __init__.py
│   ├── health.py                    ← GET /health (UNAUTHENTICATED)
│   ├── auth.py                      ← (Story 13.2 — placeholder only)
│   └── session.py                   ← (Story 14.2 — placeholder only)
├── services/
│   ├── __init__.py
│   ├── user_provisioner.py          ← (Story 13.2 — placeholder only)
│   ├── session_manager.py           ← (Epic 14 — placeholder only)
│   ├── fluent_loader.py             ← (Epic 14 — placeholder only)
│   └── sse_streamer.py              ← (Epic 14 — placeholder only)
├── models/
│   ├── __init__.py
│   ├── requests.py                  ← Pydantic request models
│   ├── responses.py                 ← HealthResponse, etc.
│   └── events.py                    ← (Epic 14 — placeholder only)
├── fluent/                          ← (Epic 14 — git submodule or copy)
├── tests/                           ← pytest
├── Containerfile                    ← Podman build: Python 3.11, uv
├── pyproject.toml                   ← Dependencies
├── .env.example                     ← Template
└── README.md
```

### Tech Stack

| Component | Technology | Detail |
|---|---|---|
| Language | Python 3.11+ | Type hints required |
| Framework | FastAPI | Async route handlers |
| ASGI Server | uvicorn | With `--host 0.0.0.0 --port 8000` |
| Settings | pydantic-settings | Env var loading |
| JWT | PyJWT | Decode/verify Supabase JWTs |
| Validation | Pydantic | Request/response models |

### JWT Auth Implementation

The mobile app sends its Supabase session JWT in `Authorization: Bearer {token}`. The harness verifies using `SUPABASE_JWT_SECRET` (from Supabase project settings → API → JWT Secret). Extract `sub` claim as userId and `email`. Return a `UserContext` object for route handlers.

Three security layers (from architecture):
1. **Cloudflare Tunnel** — TLS termination, no public IP (NFR31)
2. **Supabase JWT verification** — Only authenticated FamilyHub users
3. **Per-user data isolation** — Path-based + file permissions (NFR32, Story 13.2)

```python
# dependencies.py pattern
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt

security = HTTPBearer(auto_error=True)

class UserContext:
    def __init__(self, user_id: str, email: str):
        self.user_id = user_id
        self.email = email

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> UserContext:
    token = credentials.credentials
    try:
        payload = jwt.decode(token, settings.SUPABASE_JWT_SECRET, algorithms=["HS256"])
        user_id: str = payload.get("sub")
        email: str = payload.get("email")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        return UserContext(user_id=user_id, email=email)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Invalid token")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
```

### API Conventions

- Route paths: `kebab-case` (`/session/start`, `/auth/configure`)
- Error format: FastAPI default `{ "detail": "..." }` — no custom wrapper
- Response payloads: `snake_case` JSON keys (Python convention)
- Health endpoint: UNAUTHENTICATED — no `Depends(get_current_user)`
- All other endpoints: authenticated via `Depends(get_current_user)`

### Environment Variables

```
SUPABASE_JWT_SECRET=...          # From Supabase project settings → API → JWT Secret
FLUENT_DATA_DIR=/data/users      # Base path for per-user directories
LOG_LEVEL=info                    # Python logging level
```

### CORS Configuration

The mobile app will call the harness from a different origin (via Cloudflare Tunnel). Configure CORS in `main.py` to allow the app's origin. For development, allow `*`.

### Containerfile

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv
COPY pyproject.toml .
RUN uv pip install --system -r pyproject.toml
COPY . .
HEALTHCHECK CMD curl -f http://localhost:8000/health || exit 1
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### What This Story Does NOT Include

- Auth routes (`/auth/configure`, `/auth/status`) → Story 13.2
- Session routes (`/session/*`) → Epic 14
- SSE streaming → Story 14.3
- LangGraph agent integration → Story 14.1
- Per-user directory provisioning → Story 13.2
- Mobile app changes → Stories 13.3, 13.4
- Any Supabase migrations (zero Supabase footprint for V4)

### Dependencies on This Story

Story 13.2 (API Key Config), 13.3 (Mobile Route Shell), and all of Epic 14 depend on this story. The FastAPI app skeleton, JWT middleware, and health endpoint must be working before any other harness story can proceed.

### Testing Approach

Manual verification via curl/Podman. No automated test suite required for this story (pytest can be added later). Verify:
1. `curl http://localhost:8000/health` → `{"status":"ok"}` (200)
2. `curl http://localhost:8000/auth/status` → `{"detail":"Not authenticated"}` (401)
3. `curl -H "Authorization: Bearer <valid-jwt>" http://localhost:8000/auth/status` → userId extracted (endpoint returns 403 or stub response since auth routes are Story 13.2)
4. `curl -H "Authorization: Bearer <expired-jwt>" http://localhost:8000/auth/status` → `{"detail":"Invalid token"}` (401)

### Project Structure Notes

- Harness code lives in `harness/` within the FamilyHub repo — Python backend alongside the React Native mobile app
- Python naming: `snake_case` files/functions/variables, `PascalCase` classes/Pydantic models, `SCREAMING_SNAKE_CASE` constants
- No Supabase migrations needed — all learning data lives inside the harness container filesystem
- The harness only knows about Supabase JWT — no Supabase SDK, no database queries

### References

- [Source: epics-v4-language-learning.md — Story 13.1 acceptance criteria]
- [Source: architecture-v4-language-learning.md — Section 2 (Auth & Security), Section 5 (Infrastructure), Implementation Patterns, Project Structure & Boundaries]
- [Source: prd/functional-requirements.md — FR112-FR116]
- [Source: prd/non-functional-requirements.md — NFR27, NFR31, NFR32]
- [Source: supabase/functions/sync-categories/index.ts — JWT auth pattern reference]

## Dev Agent Record

### Agent Model Used

glm-5.1

### Debug Log References

- All 4 ACs verified locally via httpx/ASGITransport and inside Podman container
- External host → container port 8000 had connection reset (Podman networking/firewall on dev host); internal exec tests all pass

### Completion Notes List

- Created `harness/` directory with full structure matching architecture spec
- Implemented FastAPI app with CORS middleware (`allow_origins=["*"]` for dev), lifespan handler, router registration
- JWT auth via `dependencies.py` using `HTTPBearer(auto_error=False)` to return 401 (not 403) on missing auth header
- `UserContext` dataclass with `user_id` and `email` extracted from JWT `sub` and `email` claims
- Health endpoint at `GET /health` returns `{"status":"ok"}` — unauthenticated
- Auth placeholder at `GET /auth/status` for JWT verification testing (returns user context)
- Containerfile using Python 3.11-slim + `uv` for deps, HEALTHCHECK, port 8000
- All 4 ACs verified: health (200), no-auth (401), valid JWT (200 + userId), expired JWT (401)

### File List

- harness/pyproject.toml (new)
- harness/config.py (new)
- harness/main.py (new)
- harness/dependencies.py (new)
- harness/routers/__init__.py (new)
- harness/routers/health.py (new)
- harness/routers/auth.py (new)
- harness/routers/session.py (new)
- harness/services/__init__.py (new)
- harness/services/user_provisioner.py (new)
- harness/services/session_manager.py (new)
- harness/services/fluent_loader.py (new)
- harness/services/sse_streamer.py (new)
- harness/models/__init__.py (new)
- harness/models/requests.py (new)
- harness/models/responses.py (new)
- harness/models/events.py (new)
- harness/tests/__init__.py (new)
- harness/Containerfile (new)
- harness/.env.example (new)

### Review Findings

- [x] [Review][Patch] HEALTHCHECK uses `curl` which is not in python:3.11-slim [Containerfile:12] — replaced with Python-based check
- [x] [Review][Patch] `SUPABASE_JWT_SECRET` defaults to empty string allowing token forgery [config.py:5] — added model_validator to reject empty secret at startup
- [x] [Review][Patch] CORS `allow_credentials=True` with `allow_origins=["*"]` is invalid per spec [main.py:28-33] — removed `allow_credentials`
- [x] [Review][Patch] JWT `sub` claim can be empty string passing `is not None` check [dependencies.py:39] — changed to `if not user_id`
- [x] [Review][Defer] `/auth/status` response shape is placeholder — story 13.2 will implement [routers/auth.py:10] — deferred, pre-existing
- [x] [Review][Defer] `UserContext` is dataclass not Pydantic — placeholder endpoint, story 13.2 will revisit [dependencies.py:12] — deferred, pre-existing

## Change Log

- 2026-05-02: Implemented Story 13.1 — Harness API Foundation (FastAPI skeleton, JWT auth middleware, health endpoint, Containerfile, all ACs verified)
- 2026-05-03: Code review — 4 patches applied (HEALTHCHECK curl, JWT secret validation, CORS credentials, empty sub check), 2 deferred to story 13.2
