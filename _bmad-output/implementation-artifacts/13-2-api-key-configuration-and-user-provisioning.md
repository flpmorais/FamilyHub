# Story 13.2: API Key Configuration & User Provisioning

Status: done

branch: feature/13-2-api-key-configuration

## ARCHITECTURE MANDATES — NON-NEGOTIABLE

1. **Zero Supabase footprint** — No learning data in Supabase. All data lives in the harness container filesystem.
2. **SSE-only communication** — No WebSocket. HTTP + SSE for all client-harness communication.
3. **All harness API calls through `ISessionRepository`** — Never raw fetch in mobile screens/hooks.
4. **Per-user data isolation** — Each user's data directory and API key isolated by path and file permissions (NFR32).
5. **API keys transmitted over HTTPS only** — Cloudflare Tunnel TLS termination (NFR31).
6. **`snake_case` for Python** identifiers, `camelCase` for TypeScript — never mix.
7. **FastAPI default error format** `{ "detail": "..." }` — no custom wrapper.
8. **All user-facing error messages in Portuguese** — never show technical error codes or English messages.
9. **Harness code lives in `harness/`** — Python backend alongside the React Native mobile app.

## Story

As an admin,
I want to configure my LLM API key through the app so that the harness can run learning sessions on my behalf,
without needing SSH or terminal access to the server.

## Acceptance Criteria

1. **AC-1: Successful API key configuration** — Given a user with a valid JWT but no configured API key, When `POST /auth/configure` is called with `{ api_key: "sk-..." }`, Then the harness validates the key by making a test API call to the LLM provider, creates the directory `/data/users/{userId}/` with subdirectories `fluent/` and `results/`, copies Fluent data templates into the `fluent/` directory (6 JSON databases), writes `/data/users/{userId}/api_key.json` with chmod 600 permissions, and returns `{ provisioned: true }` with HTTP 200.

2. **AC-2: Invalid API key rejection** — Given an invalid API key, When `POST /auth/configure` is called, Then the test API call fails and the harness responds with HTTP 400 and `{ detail: "API key validation failed" }`.

3. **AC-3: Auth status — configured user** — Given a user with an already configured API key, When `GET /auth/status` is called, Then the harness returns `{ configured: true, setup_complete: false }` (setup not yet run).

4. **AC-4: Auth status — unconfigured user** — Given a user with no configured API key, When `GET /auth/status` is called, Then the harness returns `{ configured: false, setup_complete: false }`.

5. **AC-5: Auth status — setup complete** — Given a user whose Fluent `learner-profile.json` exists, When `GET /auth/status` is called, Then the harness returns `{ configured: true, setup_complete: true }`.

6. **AC-6: Per-user data isolation** — Given two different users (filipe and angela), When each configures their API key, Then each user's data directory is completely isolated — filipe cannot read angela's `api_key.json` or Fluent data (NFR32).

## Tasks / Subtasks

- [x] Add Pydantic request/response models (AC: #1-#5)
  - [x] `models/requests.py` — `ConfigureApiKeyRequest` with `api_key: str` field
  - [x] `models/responses.py` — `AuthStatusResponse(configured: bool, setup_complete: bool)`, `ConfigureResponse(provisioned: bool)`
- [x] Implement `services/user_provisioner.py` (AC: #1, #2, #6)
  - [x] `provision_user(user_id: str, api_key: str) -> bool` — main provisioning function
  - [x] Create `/data/users/{userId}/fluent/` and `/data/users/{userId}/results/` directories
  - [x] Copy 6 Fluent template JSON files from `fluent/data-examples/*-template.json` to `/data/users/{userId}/fluent/` (stripping `-template` suffix)
  - [x] Write `api_key.json` with `{"api_key": "..."}` and chmod 600
  - [x] Return True on success
- [x] Implement API key validation in `services/user_provisioner.py` (AC: #1, #2)
  - [x] `validate_api_key(api_key: str) -> bool` — make a test API call to the LLM provider (GLM/zhipuai) to verify the key works
  - [x] On failure: raise an appropriate exception that maps to HTTP 400
- [x] Implement auth status check in `services/user_provisioner.py` (AC: #3-#5)
  - [x] `get_auth_status(user_id: str) -> AuthStatusResponse` — check if `api_key.json` exists and if `learner-profile.json` exists
  - [x] Return configured/setup_complete based on file existence
- [x] Update `routers/auth.py` with new endpoints (AC: #1-#5)
  - [x] `POST /auth/configure` — accepts `ConfigureApiKeyRequest`, calls `validate_api_key` then `provision_user`, returns `ConfigureResponse`
  - [x] `GET /auth/status` — replace placeholder with call to `get_auth_status`, returns `AuthStatusResponse`
- [x] Add `httpx` to core dependencies in `pyproject.toml` (needed for API key validation test call)
- [x] Verify with manual testing (AC: #1-#6)
  - [x] Test `POST /auth/configure` with valid key → 200 + provisioned
  - [x] Test `POST /auth/configure` with invalid key → 400
  - [x] Test `GET /auth/status` for new user → `{ configured: false, setup_complete: false }`
  - [x] Test `GET /auth/status` after configure → `{ configured: true, setup_complete: false }`
  - [x] Test `GET /auth/status` after learner-profile exists → `{ configured: true, setup_complete: true }`
  - [x] Test two users → isolated directories

## Dev Notes

### Existing Code from Story 13-1

Story 13-1 created the FastAPI skeleton with JWT auth. The following files already exist and are relevant:

| File | Current State | Action for 13-2 |
|---|---|---|
| `harness/routers/auth.py` | Placeholder `GET /auth/status` returning userId/email | Replace with real implementation |
| `harness/services/user_provisioner.py` | `# placeholder — story 13.2` | Full implementation |
| `harness/models/requests.py` | Empty | Add `ConfigureApiKeyRequest` |
| `harness/models/responses.py` | Only `HealthResponse` | Add `AuthStatusResponse`, `ConfigureResponse` |
| `harness/dependencies.py` | Working `get_current_user` with `UserContext` | No changes needed |
| `harness/config.py` | `Settings` with `SUPABASE_JWT_SECRET`, `FLUENT_DATA_DIR`, `LOG_LEVEL` | No changes needed |
| `harness/main.py` | FastAPI app with CORS, health + auth routers | No changes needed |

### Key Design Decisions

**API key validation approach:** Make a minimal test call to the LLM API (e.g., a models list or a tiny completion request) to verify the key works. Use `httpx` (async) for this call. The LLM provider is GLM (zhipuai). The test call should be lightweight — a models list endpoint or a 1-token completion. If the test call fails with auth error (401/403), return 400 to the client. Other errors (network, rate limit) should be handled gracefully.

**Fluent template files:** 6 template JSON files exist at `fluent/data-examples/` in the repo root (sibling to `harness/`):
- `learner-profile-template.json` → `learner-profile.json`
- `progress-db-template.json` → `progress-db.json`
- `mistakes-db-template.json` → `mistakes-db.json`
- `mastery-db-template.json` → `mastery-db.json`
- `spaced-repetition-template.json` → `spaced-repetition.json`
- `session-log-template.json` → `session-log.json`

The templates contain `{PLACEHOLDER}` values (like `{YOUR_NAME}`, `{YOUR_NATIVE_LANGUAGE}`) but for provisioning, they should be copied as-is. The Setup skill (story 14.x) will populate them interactively.

**Directory structure per user:**
```
{FLUENT_DATA_DIR}/{userId}/
├── fluent/
│   ├── learner-profile.json
│   ├── progress-db.json
│   ├── mistakes-db.json
│   ├── mastery-db.json
│   ├── spaced-repetition.json
│   └── session-log.json
├── results/
└── api_key.json          ← chmod 600
```

**`setup_complete` detection:** Check if `{FLUENT_DATA_DIR}/{userId}/fluent/learner-profile.json` exists AND contains a non-placeholder value (e.g., `learner.name` is not `{YOUR_NAME}`). For MVP, just check file existence — the Setup skill (Epic 14) will modify it. The architecture gap analysis resolved this: "The harness checks for the existence of `learner-profile.json`."

### API Endpoint Specifications

**`POST /auth/configure`**
- Auth: Required (JWT)
- Request body: `{ "api_key": "sk-..." }`
- Success response: 200 `{ "provisioned": true }`
- Error responses: 400 `{ "detail": "API key validation failed" }`, 401 (JWT)

**`GET /auth/status`**
- Auth: Required (JWT)
- Success response: 200 `{ "configured": bool, "setup_complete": bool }`
- Error responses: 401 (JWT)

### Dependencies

Add `httpx>=0.28.0` to core dependencies in `pyproject.toml` (currently only in `[dev]`). It's needed for the async API key validation test call.

### Per-User Isolation (NFR32)

At family scale (2 users in a single container), file permissions are sufficient:
- `api_key.json` written with chmod 600 (owner read/write only)
- Each user's data directory is path-isolated by userId
- The harness reads only the requesting user's data (userId from JWT)

### What This Story Does NOT Include

- Mobile app screens (API key setup screen → Story 13.4)
- Mobile route shell and connection status → Story 13.3
- Session management → Epic 14
- LLM API integration beyond key validation → Story 14.1
- Fluent skill execution → Epic 14
- Template placeholder substitution → Setup skill in Epic 14

### Testing Approach

Manual verification via curl/Podman. No automated test suite. Verify:
1. `POST /auth/configure` with valid key → directories created, templates copied, api_key.json with chmod 600
2. `POST /auth/configure` with invalid key → 400
3. `GET /auth/status` for new user → `{ configured: false, setup_complete: false }`
4. `GET /auth/status` after configure → `{ configured: true, setup_complete: false }`
5. Two different JWT users → separate directories, no cross-read

### Project Structure Notes

- All files are in `harness/` directory within the FamilyHub repo
- Python naming: `snake_case` files/functions/variables, `PascalCase` classes/Pydantic models, `SCREAMING_SNAKE_CASE` constants
- The `fluent/` directory is a sibling to `harness/` in the repo, not inside it
- Template files are at `fluent/data-examples/*-template.json` relative to repo root

### References

- [Source: epics-v4-language-learning.md — Story 13.2 acceptance criteria]
- [Source: architecture-v4-language-learning.md — Section 1 (Data Architecture), Section 2 (Auth & Security), Section 3 (API & Communication), Implementation Patterns, Project Structure & Boundaries]
- [Source: architecture-v4-language-learning.md — Gap Analysis: FR118 resolved via GET /auth/status returning setupComplete]
- [Source: prd/functional-requirements.md — FR113, FR115]
- [Source: prd/non-functional-requirements.md — NFR31, NFR32]
- [Source: harness/dependencies.py — UserContext, get_current_user (from story 13-1)]
- [Source: harness/config.py — Settings with FLUENT_DATA_DIR (from story 13-1)]
- [Source: fluent/data-examples/ — 6 template JSON files]

## Dev Agent Record

### Agent Model Used

glm-5.1

### Debug Log References

- All 12 tests pass (pytest asyncio with httpx ASGITransport)
- Mock patch path needed to target `routers.auth.validate_api_key` (not `services.user_provisioner`) because the function is imported into the router module
- config.py needed `extra: "ignore"` to avoid rejecting env vars from the parent project's `.env` file

### Completion Notes List

- Implemented `POST /auth/configure` — validates API key via GLM test call, provisions per-user directory with 6 Fluent templates, writes api_key.json with chmod 600
- Implemented `GET /auth/status` — returns `{configured, setup_complete}`; setup_complete checks if learner-profile.json has non-placeholder name (template has `{YOUR_NAME}`)
- `setup_complete` detection checks `learner.name` for non-placeholder value instead of just file existence, since the template is copied during provisioning
- Added `httpx>=0.28.0` to core deps for async API key validation
- Config `extra: "ignore"` added to prevent pydantic-settings from rejecting unknown env vars
- 12 tests cover all 6 ACs: health check, unconfigured/configured/setup-complete status, valid/invalid key, per-user isolation, JWT auth rejection, empty key validation

### File List

- harness/models/requests.py (modified)
- harness/models/responses.py (modified)
- harness/services/user_provisioner.py (modified)
- harness/routers/auth.py (modified)
- harness/pyproject.toml (modified)
- harness/config.py (modified)
- harness/tests/conftest.py (new)
- harness/tests/test_auth_provisioning.py (new)

## Review Findings

### Decision Needed

- [x] [Review][Decision → Patch] Re-provisioning silently overwrites user data — Resolved: reject re-provisioning with 409 if api_key.json already exists. [blind+edge]
- [x] [Review][Decision → Patch] Error messages in English vs Portuguese — Resolved: translated all error messages to Portuguese per Mandate #8. [auditor]

### Patch

- [x] [Review][Patch] Path traversal via unsanitized `user_id` [`harness/dependencies.py`, `harness/services/user_provisioner.py`] — Fixed: validate user_id matches safe pattern in dependency layer (HTTP 400) + defense-in-depth in service. [blind+edge]
- [x] [Review][Patch] Network/rate-limit errors treated as invalid API key [`harness/services/user_provisioner.py`] — Fixed: `KeyValidationResult` enum distinguishes VALID/INVALID/UNAVAILABLE. Router returns 400 for invalid, 503 for unavailable. [blind+edge+auditor]
- [x] [Review][Patch] Synchronous blocking I/O in async handler [`harness/routers/auth.py`] — Fixed: wrapped `provision_user` in `asyncio.to_thread()`. [blind]
- [x] [Review][Patch] Fluent data files and user directory lack restrictive permissions [`harness/services/user_provisioner.py`] — Fixed: `chmod 700` on user dir, `chmod 600` on all Fluent data files. [auditor]
- [x] [Review][Patch] Fragile setup_complete placeholder detection [`harness/services/user_provisioner.py`] — Fixed: now checks `"{YOUR_NAME}" not in name` instead of `not name.startswith("{")`. [blind+edge+auditor]
- [x] [Review][Patch] chmod failure propagates as unhandled 500 [`harness/services/user_provisioner.py`] — Fixed: wrapped in try/except with warning log. [edge]
- [x] [Review][Patch] provision_user always returns True, never signals failure [`harness/services/user_provisioner.py`] — Fixed: now raises `FileExistsError`, `FileNotFoundError`, or `OSError` with meaningful messages. Router catches each. [blind]
- [x] [Review][Patch] Half-provisioned user appears "configured" [`harness/services/user_provisioner.py`] — Fixed: `configured` now requires both `api_key.json` existence AND fluent directory existence. [edge]

### Deferred

- [x] [Review][Defer] Wildcard CORS on authenticated API [`harness/main.py:27-31`] — deferred, pre-existing from 13-1 skeleton. Containerized behind Cloudflare Tunnel mitigates risk.
- [x] [Review][Defer] No JWT audience/issuer validation [`harness/dependencies.py:26-30`] — deferred, pre-existing from 13-1 skeleton. Story explicitly noted "No changes needed" for dependencies.py.
- [x] [Review][Defer] Race condition on concurrent provisioning [`harness/services/user_provisioner.py:57-78`] — deferred, family scale (2 users) makes this practically impossible.
- [x] [Review][Defer] FLUENT_DATA_DIR missing/unwritable gives cryptic 500 [`harness/services/user_provisioner.py:62`] — deferred, environment configuration issue.

### Dismissed (4)

- Module-level `Settings()` crashes on missing config — standard Python pattern, conftest.py handles it correctly.
- `email` None coerced to empty string — latent defect, no current consumer of `user.email`.
- API key stored in plaintext on disk — spec explicitly states "At family scale (2 users in a single container), file permissions are sufficient."
- `validate_api_key` makes real paid API call — by design per AC-1: "validates the key by making a test API call to the LLM provider."

## Change Log

- 2026-05-03: Implemented Story 13.2 — API Key Configuration & User Provisioning (POST /auth/configure, GET /auth/status, per-user directory provisioning with Fluent templates, 12 tests all passing)
- 2026-05-03: Code review — 2 decision-needed, 8 patch, 4 deferred, 4 dismissed
- 2026-05-03: All patches applied — 15 tests passing. Story → done.
