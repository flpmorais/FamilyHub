---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
inputDocuments:
  - '_bmad-output/planning-artifacts/prd/index.md'
  - '_bmad-output/planning-artifacts/prd/functional-requirements.md'
  - '_bmad-output/planning-artifacts/prd/non-functional-requirements.md'
  - '_bmad-output/planning-artifacts/prd/user-journeys.md'
  - '_bmad-output/planning-artifacts/prd/product-scope.md'
  - '_bmad-output/planning-artifacts/prd/success-criteria.md'
  - '_bmad-output/planning-artifacts/prd/project-scoping-phased-development.md'
  - '_bmad-output/planning-artifacts/ux-design-specification.md'
  - '_bmad-output/planning-artifacts/product-brief-FamilyHub-2026-03-24.md'
  - '_bmad-output/planning-artifacts/architecture/index.md'
  - '_bmad-output/planning-artifacts/architecture/core-architectural-decisions.md'
  - '_bmad-output/planning-artifacts/architecture/project-structure-boundaries.md'
  - '_bmad-output/planning-artifacts/epics-v4-language-learning.md'
  - 'fluent/README.md'
  - 'fluent/LEARNING_SYSTEM.md'
  - 'fluent/CLAUDE.md'
  - 'fluent/AGENTS.md'
workflowType: 'architecture'
project_name: 'FamilyHub'
module: 'V4 Language Learning'
user_name: 'Fmorais'
date: '2026-05-01'
lastStep: 8
status: 'complete'
completedAt: '2026-05-02'
---

# Architecture Decision Document — V4 Language Learning

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

_This is a standalone architecture for the V4 Language Learning module, replacing the previous architecture documented in section 1c of the main FamilyHub architecture document._

## Project Context Analysis

### Requirements Overview

**Functional Requirements (19 FRs, FR100-FR118):**

| Category | FRs | Architectural Implication |
|---|---|---|
| Harness API | FR100-FR104 | Server-side session service with start/resume/end/status lifecycle. Streaming responses with structured events. Requires persistent stateful backend. |
| Chat Interface & TTS | FR105-FR107 | Chat UI (bubbles), Greek TTS with double-speak timing (0.8s repeat pause, 1.2s phrase pause). Client-side audio queue management. |
| Voice Input | FR108-FR109 | Android STT (el-GR) as input method. Transcript sent as plain text — agent unaware of input source. |
| Skill System | FR110-FR111 | Skill selection screen (8 skills), one session at a time, skill switching kills existing, resume within same skill only. |
| API Key Configuration | FR112-FR114 | First-use gate — user enters LLM API key, harness validates, provisions isolated data directory. No SSH/terminal required. |
| User Isolation & Lifecycle | FR115-FR118 | Per-user data directories, connection status display, skill-complete auto-end, first-use auto-starts Setup skill. |

**Non-Functional Requirements (7 NFRs, NFR27-NFR33):**

| NFR | Constraint | Architecture Impact |
|---|---|---|
| NFR27 | Harness API responds within 5s | Session start/resume must be fast — pre-warm agents or lightweight initialization |
| NFR28 | TTS playback begins within 500ms of message arrival | Streaming parse + TTS enqueue must be low-latency; no buffering |
| NFR29 | STT transcription sent within 2s | Native STT with minimal post-processing |
| NFR30 | TTS double-speak timing: 0.8s repeat, 1.2s phrase | Client-side timing constants, serial playback queue |
| NFR31 | API keys transmitted over HTTPS only | Cloudflare Tunnel or direct TLS; never plaintext |
| NFR32 | API keys isolated per-user at application level | Per-user storage, file permissions, zero cross-read |
| NFR33 | First streamed token within 3s of user message | Streaming response architecture (SSE/WebSocket chunks, not batch) |

**Scale & Complexity:**

- Primary domain: **Mobile client + containerised backend**
- Complexity level: **Medium-high** — real-time streaming, stateful sessions with checkpointing, multi-modal I/O (TTS + STT), external LLM API orchestration, per-user data isolation
- Estimated architectural components: **12-15** (session service, WebSocket server, streaming proxy, TTS engine, STT handler, session store, learner data manager, API key manager, chat UI, skill selector, connection manager, learning profile repo)

### Technical Constraints & Dependencies

1. **Expo SDK 55 (React Native)** — Must use libraries compatible with Expo managed workflow. Native modules require `expo-dev-client` or config plugins.
2. **Android only** — No iOS consideration. STT via Android's built-in speech recognition.
3. **Supabase existing infrastructure** — Auth, PostgreSQL, Realtime already in place. V4 adds **zero Supabase footprint** — all learning state lives in the harness container.
4. **Fluent system integration** — The `fluent/` directory contains a Claude Code plugin with 8 skills, 6 JSON databases, SM-2 spaced repetition, Python hook scripts. The harness must adapt this CLI-first system into a server-side API.
5. **Containerised deployment** — Podman on Raspberry Pi (prod) and dev machine. Must work within container resource constraints (Pi 4GB RAM).
6. **Cloudflare Tunnel** — No VPN, no public IP. TLS terminated by Cloudflare. Domain: `fh-morais.party`.
7. **Per-user API keys** — Each admin provides their own LLM API key. Cost tracking per user.
8. **No offline support** — Language learning requires active connection to the harness. Unlike other modules (Supabase Realtime), there is no offline fallback.
9. **Family scale** — Maximum 2 concurrent users. No horizontal scaling concerns.

### Cross-Cutting Concerns Identified

1. **Streaming architecture** — The agent's responses must stream to the client in real-time (NFR33: first token in 3s). This affects the entire communication layer: how the harness calls the LLM API, how it relays chunks to the phone, and how the phone parses and renders them.
2. **Session state persistence** — Sessions must survive app closes and phone reboots (FR101: resume). The harness must checkpoint LangGraph state and be able to rehydrate it.
3. **WebSocket lifecycle** — Connect on entering `(language-learning)` route group, disconnect on leaving. Reconnection with exponential backoff. Connection status visible to user (FR116).
4. **TTS/STT timing** — TTS double-speak requires precise timing (NFR30). STT transcription latency must be under 2s (NFR29). Both are client-side concerns that affect the audio subsystem design.
5. **Security model split** — FamilyHub auth (Google OAuth → Supabase JWT) for app access, plus per-user LLM API keys for the harness. Two separate authentication contexts that must be correlated (userId maps Supabase user to harness data directory).
6. **Fluent adaptation** — Fluent was designed as a Claude Code CLI plugin (skills are SKILL.md prompt files, hooks are Python scripts, data is 6 JSON files). The harness must bridge between this file-based system and a stateful HTTP/WebSocket API.

## Starter Template Evaluation

### Primary Technology Domain

**Brownfield mobile app (client) + greenfield containerised API (server).**

Client-side technology is locked in: Expo SDK 55, TypeScript, React Native Paper, Supabase client, Zustand, Expo Router. V4 adds screens, components, hooks, and stores to the existing app.

Server-side is the new component: a containerised harness API that wraps the Fluent language learning system and serves the mobile app.

### Starter Options Considered

| Option | Pros | Cons |
|---|---|---|
| **Express.js + ws** (previous arch) | Well-understood, lightweight, good REST + WebSocket support | Requires subprocess calls to Python (Fluent scripts), Node.js ↔ Python bridge complexity, two separate processes |
| **Fastify + ws** | Faster than Express, schema validation, plugin architecture | Same Python bridge problem as Express |
| **FastAPI (Python)** | Direct import of Fluent's Python scripts, LangChain/LangGraph native, async streaming, WebSocket built-in, single language backend | Less familiar to Node.js ecosystem, Python dependency management in containers |
| **Hono + ws** | Ultra-lightweight, edge-first, TypeScript-native | Same Python bridge problem, less ecosystem support for LangChain |

### Selected Starter: FastAPI (Python)

**Rationale for Selection:**

The Fluent system is Python-native: hooks (`read-db.py`, `update-db.py`, `validate-data.py`, `session-start.py`, `session-end.py`), SM-2 algorithm, data management — all Python. LangChain and LangGraph are Python-first frameworks with the most complete SDK support. Choosing FastAPI eliminates the Node.js ↔ Python bridge entirely: the harness can import Fluent's modules directly, invoke LangGraph agents natively, and serve both REST and WebSocket from a single async Python process.

**Architectural Decisions Provided by This Choice:**

- **Language & Runtime:** Python 3.11+ with type hints, uvicorn ASGI server
- **Framework:** FastAPI with async route handlers
- **Streaming:** SSE (Server-Sent Events) via `StreamingResponse` for agent response streaming (FR104)
- **WebSocket:** FastAPI's built-in `WebSocket` support in the same process — no separate ws server
- **Agent framework:** LangChain + LangGraph (Python) for ReAct agent with Fluent skills as tools
- **Container:** Single Podman container (unified — previous arch had two separate Node.js containers)
- **LLM integration:** LangChain ChatModel abstraction with per-user API key injection
- **Data management:** Direct Python imports of Fluent's `read-db.py` and `update-db.py` modules

**Key departure from previous architecture:** The previous architecture specified two separate Node.js services (Express session service on port 3000 + ws WebSocket server on port 3001). FastAPI unifies everything into a single Python process with SSE-only communication (no WebSocket at all), simplifying deployment and reducing Pi resource usage.

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Block Implementation):**
- Data architecture: Fluent file-based storage, SqliteSaver for session checkpoints
- Communication: SSE-only with HTTP POST for user messages (no WebSocket)
- Authentication: Supabase JWT passthrough to harness
- Zero Supabase footprint for learning data

**Important Decisions (Shape Architecture):**
- Chat bubble UI (not terminal display)
- TTS triggered by SSE structured events
- Per-user directory isolation in single container
- Health check endpoint for connection status

**Deferred Decisions (Post-MVP):**
- LLM provider flexibility (currently GLM 5.1, may change)
- Multi-language support (currently Greek only)
- Session result browsing in-app (currently file-based, admin can SSH to read)

### 1. Data Architecture

**Zero Supabase footprint.** All learning data lives inside the harness container. No `learning_profiles` table, no Supabase migrations for V4. The mobile app uses Supabase only for auth (JWT) and its existing V1-V3 data.

**Fluent data storage — file system per user:**

Fluent's 6 JSON databases are stored as-is on the container's filesystem, one directory per user. The harness sets `FLUENT_DATA_DIR` to the user's directory when loading Fluent's Python modules. This means zero changes to Fluent's data access layer — `read-db.py` and `update-db.py` work unmodified.

```
/data/users/{userId}/
├── fluent/
│   ├── learner-profile.json
│   ├── progress-db.json
│   ├── mistakes-db.json
│   ├── mastery-db.json
│   ├── spaced-repetition.json
│   └── session-log.json
└── results/
    ├── learn-session-001.md
    ├── vocab-session-002.md
    └── ...
```

**Session state — LangGraph SqliteSaver:**

A single shared `checkpoints.db` SQLite file stores LangGraph session checkpoints. When a user sends a message, the agent's LangGraph state is rehydrated from the checkpoint. This persists across container restarts and supports FR101 (resume).

```
/data/checkpoints.db    ← Shared SQLite for all sessions
```

**API key storage — file per user:**

```
/data/users/{userId}/api_key.json    ← chmod 600, container process owner only
```

Contains `{"api_key": "..."}`. Strict file permissions ensure per-user isolation (NFR32). At family scale (2 users in a single container), OS-level file permissions are sufficient.

### 2. Authentication & Security

**Supabase JWT passthrough:**

The mobile app sends its Supabase session JWT in the `Authorization: Bearer {token}` header with every request to the harness API. FastAPI middleware verifies the JWT using the `SUPABASE_JWT_SECRET` environment variable (obtained from the Supabase project settings).

The JWT's `sub` claim contains the Supabase user ID, which becomes the `userId` for all harness operations. This eliminates the need for a separate auth system on the harness.

**Security layers:**
1. **Cloudflare Tunnel** — TLS termination, no public IP, domain-based routing (NFR31)
2. **Supabase JWT verification** — Only authenticated FamilyHub users can call the harness
3. **Per-user data isolation** — Each user's data directory and API key are isolated by path and file permissions (NFR32)

**JWT verification implementation:**
- FastAPI dependency (`get_current_user`) that decodes and validates the JWT
- Extracts `sub` (user ID) and `email` from the token
- Returns a `UserContext` object used by route handlers
- Token expiry handled by Supabase's JWT expiry (1 hour by default)

### 3. API & Communication Patterns

**SSE-only architecture — no WebSocket:**

All communication between the mobile app and harness uses HTTP. There is no WebSocket connection. This eliminates the WebSocket lifecycle complexity entirely (no connect/disconnect, no reconnection logic, no `WebSocketService`).

**Harness API endpoints:**

| Endpoint | Method | Purpose |
|---|---|---|
| `GET /health` | GET | Health check — returns `{ status: "ok" }`. Mobile app uses this for connection status (FR116). |
| `POST /auth/configure` | POST | Validate and store per-user API key. Provisions user directory. Body: `{ api_key: string }`. Returns `{ provisioned: true }`. (FR113) |
| `GET /auth/status` | GET | Check if user has API key configured and setup is complete. Returns `{ configured: bool, setupComplete: bool }`. (FR112 gate, FR118) |
| `POST /session/start` | POST | Start a new session. Body: `{ skill: string }`. Returns SSE stream. (FR100) |
| `POST /session/resume` | POST | Resume existing session. Returns JSON `{ messages: ChatMessage[] }` with chat history from LangGraph checkpoint. (FR101) |
| `POST /session/end` | POST | End active session. Persists learner data, writes result file. (FR102) |
| `GET /session/status` | GET | Check if user has an active session. Returns `{ active: bool, skill: string \| null }`. (FR103) |
| `POST /session/message` | POST | Send a user message to the active session. Returns SSE stream. (FR104) |

**SSE event types (structured stream):**

The SSE stream emits events with the following types:

```
event: token
data: { "content": "Καλημέρα!" }

event: speak
data: { "phrases": ["Καλημέρα", "Με λένε Φίλιππε"] }

event: skill-complete
data: { "skill": "learn" }

event: error
data: { "message": "LLM API error: rate limit exceeded" }

event: done
data: {}
```

- `token` — Incremental text chunk from the agent's response. Appended to the current chat bubble in real-time.
- `speak` — Greek text for TTS playback. Triggers the TTS double-speak queue (NFR28, NFR30).
- `skill-complete` — Session should end automatically (FR117).
- `error` — Terminal error. Displayed to user.
- `done` — Stream complete. No more events.

**Connection status via HTTP health check:**

Instead of a WebSocket connection status, the mobile app determines connectivity by calling `GET /health` when entering the `(language-learning)` route group. If the request succeeds, status is `connected`. If it fails, status is `disconnected`. A periodic retry (every 10s) transitions to `reconnecting` when the health check is failing but retrying.

### 4. Frontend Architecture

**Chat bubble interface:**

The learning session is displayed as a chat interface (FR105). Agent messages appear as bot chat bubbles with real-time streaming (text appears token by token). User messages (typed or voice-transcribed) appear as user bubbles. Greek text within bubbles is visually distinct (larger font, different color).

**Components removed from previous architecture:**
- `terminal-display.tsx` → replaced by chat bubble list
- `connection-status-bar.tsx` → simplified HTTP health check indicator
- `WebSocketService` / `WebSocketContext` → eliminated entirely
- `tts-indicator.tsx` → replaced by inline playback indicator in chat bubbles

**Components added/changed:**
- `chat-bubble.tsx` — Agent or user message bubble with streaming support
- `chat-input.tsx` — Text input + mic button combo (FR108)
- `tts-queue.tsx` — Visual indicator for TTS playback state
- `skill-card.tsx` — Skill selection button (unchanged)
- `connection-status-bar.tsx` — Simplified: HTTP health check result

**TTS queue management:**

When the SSE stream emits a `speak` event, the phrases are enqueued into the TTS queue. The `useTtsQueue` hook plays them serially with double-speak timing:
- Each phrase spoken twice via `expo-speech` (el-GR locale)
- 0.8s pause between repetitions (NFR30)
- 1.2s pause between distinct phrases (NFR30)

**STT integration:**

`expo-speech-recognition` captures Greek speech (el-GR locale). When the user taps the mic button and speaks, the transcript becomes the text for the next `POST /session/message` call. The transcript is sent as plain text — the agent is unaware of input method (FR109).

**State management — `languageLearningStore` (Zustand):**

| Field | Type | Purpose |
|---|---|---|
| `connectionStatus` | `'connected' \| 'disconnected' \| 'reconnecting'` | HTTP health check result (FR116) |
| `activeSession` | `{ id: string, skill: string } \| null` | Current session info |
| `messages` | `ChatMessage[]` | Chat history for current session |
| `isStreaming` | `boolean` | Whether an SSE response is in progress |
| `ttsQueue` | `string[]` | Phrases awaiting TTS playback |
| `isSpeaking` | `boolean` | TTS currently playing |
| `isListening` | `boolean` | STT currently recording |

No `terminalOutput` field — replaced by the structured `messages` array.

### 5. Infrastructure & Deployment

**Single container — FastAPI + uvicorn:**

```
Podman container (single)
├── FastAPI app (uvicorn, port 8000)
├── LangGraph agent runtime
├── Fluent Python modules (imported directly)
└── Per-user data directories (/data/users/)
```

**Networking:**

```
Mobile app → Cloudflare Tunnel → https://api.fh-morais.party → FastAPI (port 8000)
```

Single domain, single port. No separate WebSocket endpoint or domain.

**Environment variables:**

```
SUPABASE_JWT_SECRET=...          # For JWT verification
FLUENT_DATA_DIR=/data/users      # Base path for per-user directories
LOG_LEVEL=info                    # Python logging level
```

**Health check:**

`GET /health` returns `{ status: "ok" }`. Used by:
- Mobile app for connection status (FR116)
- Podman health check (`HEALTHCHECK` in Containerfile)

**Logging:**

Python `logging` module with structured JSON output to stdout. Captured by Podman container logs. No external aggregation at family scale.

### Decision Impact Analysis

**Implementation Sequence:**

1. Harness API foundation (FastAPI app skeleton, JWT auth middleware, health check)
2. Per-user directory provisioning (API key configuration endpoint)
3. LangGraph agent integration (Fluent skill loading, agent creation)
4. Session lifecycle endpoints (start/resume/end/status)
5. SSE streaming (message endpoint with structured events)
6. Mobile client: route group + connection status
7. Mobile client: API key setup screen
8. Mobile client: skill selection screen
9. Mobile client: chat interface (SSE consumption + bubble rendering)
10. Mobile client: TTS queue
11. Mobile client: STT voice input

**Cross-Component Dependencies:**

- JWT auth is required by all harness endpoints (step 1 blocks everything)
- Per-user provisioning is required before sessions can start (step 2 blocks steps 3-5)
- LangGraph agent integration is required before SSE streaming works (step 3 blocks step 4-5)
- Chat interface requires SSE streaming to be working (step 9 blocks on step 5)
- TTS and STT are independent of each other (steps 10-11 can be parallel)

## Implementation Patterns & Consistency Rules

### Naming Patterns

**Harness API (Python / FastAPI):**

| Element | Convention | Example |
|---|---|---|
| Files | `snake_case` | `session_router.py`, `auth_dependency.py` |
| Classes | `PascalCase` | `UserContext`, `SessionManager`, `FluentAgent` |
| Functions | `snake_case` | `get_current_user`, `start_session`, `stream_response` |
| Variables | `snake_case` | `user_id`, `active_session`, `tts_phrases` |
| Constants | `SCREAMING_SNAKE_CASE` | `TTS_REPEAT_PAUSE_MS`, `MAX_RETRY_ATTEMPTS` |
| API routes | `kebab-case` paths | `/session/start`, `/auth/configure` |
| Pydantic models | `PascalCase` | `MessageRequest`, `SessionStatusResponse`, `SSEEvent` |

**Mobile Client (TypeScript / React Native) — follows existing FamilyHub patterns:**

| Element | Convention | Example |
|---|---|---|
| Files | `kebab-case` | `chat-bubble.tsx`, `use-session.ts` |
| Components | `PascalCase` | `ChatBubble`, `SkillCard`, `ChatInput` |
| Hooks | `use-kebab-case` | `useSession`, `useTtsQueue`, `useStt` |
| Interfaces | `I` prefix | `ISessionRepository` |
| Types | `PascalCase`, no prefix | `ChatMessage`, `SSEEvent`, `LearningSkill` |
| Zustand store | `{domain}Store` | `languageLearningStore` |
| Constants | `SCREAMING_SNAKE_CASE` | `TTS_REPEAT_PAUSE`, `TTS_PHRASE_PAUSE`, `SKILLS` |

### Structure Patterns

**Harness (Python) project organization:**

```
harness/
├── main.py                     ← FastAPI app entry point, router registration
├── dependencies.py             ← Auth dependency (get_current_user)
├── routers/
│   ├── health.py               ← GET /health
│   ├── auth.py                 ← POST /auth/configure, GET /auth/status
│   └── session.py              ← POST /session/start|resume|end|message, GET /session/status
├── services/
│   ├── session_manager.py      ← Session lifecycle, LangGraph agent creation
│   ├── fluent_loader.py        ← Load Fluent skills as LangGraph tools
│   └── user_provisioner.py     ← Per-user directory + API key provisioning
├── models/
│   ├── requests.py             ← Pydantic request models
│   ├── responses.py            ← Pydantic response models
│   └── events.py               ← SSE event types
├── config.py                   ← Environment variable loading (pydantic-settings)
├── Containerfile               ← Podman build
└── pyproject.toml              ← Python dependencies
```

**Mobile client additions — follow existing FamilyHub structure:**

```
src/
├── app/(app)/(language-learning)/
│   ├── _layout.tsx              ← Connection status check on mount
│   ├── index.tsx                ← API key gate → skill selection
│   ├── api-key-setup.tsx        ← API key input + validation
│   └── session.tsx              ← Chat interface + TTS + mic
├── components/language-learning/
│   ├── chat-bubble.tsx
│   ├── chat-input.tsx
│   ├── skill-card.tsx
│   ├── connection-status-bar.tsx
│   └── index.ts
├── repositories/
│   ├── interfaces/
│   │   └── session.repository.interface.ts   ← ISessionRepository
│   └── supabase/
│       └── session.repository.ts             ← HTTP calls to harness (not Supabase)
├── services/
│   └── sse-client.ts            ← SSE stream parser for React Native
├── stores/
│   └── language-learning.store.ts
├── hooks/
│   ├── use-session.ts
│   ├── use-tts-queue.ts
│   ├── use-stt.ts
│   └── use-learning-connection.ts  ← Health check polling
├── types/
│   └── language-learning.types.ts
└── constants/
    └── language-learning-defaults.ts
```

### Format Patterns

**API request/response format (JSON):**

```json
// Request: POST /session/message
{ "content": "Με λένε Φίλιππε" }

// Response: POST /session/start (non-SSE)
{ "session_id": "uuid", "skill": "learn" }

// Response: GET /session/status
{ "active": true, "skill": "learn" }

// Response: GET /auth/status
{ "configured": true }

// Error response (all endpoints)
{ "detail": "LLM API error: rate limit exceeded" }
```

FastAPI's default error format (`{ "detail": "..." }`) is used. No custom wrapper.

**SSE event format:**

```
event: {event_type}
data: {json_payload}

```

Always `event:` + `data:` lines. Blank line separates events. JSON payloads use `snake_case` keys (Python convention).

**Chat message type (TypeScript):**

```ts
type ChatMessage = {
  id: string;
  role: 'user' | 'agent';
  content: string;
  timestamp: number;
};
```

**SSE event type (TypeScript):**

```ts
type SSEEvent =
  | { type: 'token'; content: string }
  | { type: 'speak'; phrases: string[] }
  | { type: 'skill-complete'; skill: string }
  | { type: 'error'; message: string }
  | { type: 'done' };
```

Discriminated union — always switch on `event.type`. No string comparisons outside the type guard.

**Date / time:** No dates exchanged between client and harness for V4. Session timestamps use Unix epoch milliseconds (TypeScript `Date.now()`) if needed for message ordering.

### Communication Patterns

**HTTP client pattern (mobile → harness):**

All harness API calls go through `ISessionRepository` — the same repository pattern used for Supabase in other modules. Zero raw `fetch` calls in screens or hooks.

```ts
interface ISessionRepository {
  healthCheck(): Promise<boolean>;
  configureApiKey(apiKey: string): Promise<void>;
  getAuthStatus(): Promise<{ configured: boolean }>;
  startSession(skill: string): Promise<void>;
  resumeSession(): Promise<void>;
  endSession(): Promise<void>;
  getSessionStatus(): Promise<{ active: boolean; skill: string | null }>;
  sendMessage(content: string): Promise<AsyncIterable<SSEEvent>>;
}
```

The `sendMessage` method returns an `AsyncIterable<SSEEvent>` — the consumer (chat screen) iterates over the stream, dispatching events to the store.

**SSE consumption pattern:**

The `sse-client.ts` service handles the EventSource polyfill for React Native (since native EventSource doesn't support custom headers). It:
1. Creates a `fetch` request with `Authorization` header
2. Reads the response body as a stream
3. Parses SSE text format (`event:` / `data:` lines)
4. Emits typed `SSEEvent` objects via an async generator

**Health check pattern:**

`useLearningConnection` hook:
- Calls `ISessionRepository.healthCheck()` on mount
- Polls every 10s while the `(language-learning)` route group is mounted
- Updates `languageLearningStore.connectionStatus`
- Unmount cancels polling

### Process Patterns

**Error handling (harness):**

FastAPI HTTP exceptions for client-facing errors:
```python
raise HTTPException(status_code=401, detail="Invalid JWT")
raise HTTPException(status_code=403, detail="API key not configured")
raise HTTPException(status_code=500, detail="LLM API error: rate limit exceeded")
```

LLM API errors during streaming are emitted as `error` SSE events (not HTTP errors) — the stream stays open so the agent can potentially recover.

**Error handling (mobile):**

`RepositoryError` thrown by `ISessionRepository` implementations — same pattern as Supabase repositories. Screens catch and display user-facing Portuguese messages.

**Loading states — consistent with existing stores:**

```ts
isLoading: boolean;    // NOT loading, isFetching, pending
error: string | null;  // NOT errorMessage, err, hasError
isStreaming: boolean;   // NEW for V4 — SSE stream active
```

**TTS queue processing:**

Serial, non-preemptive. When a `speak` event arrives:
1. Phrases appended to `ttsQueue` in store
2. `useTtsQueue` processes one phrase at a time:
   - Speak phrase via `expo-speech` (el-GR)
   - Await completion → wait 0.8s → speak same phrase again
   - Await completion → wait 1.2s → dequeue next phrase
3. No concurrent speech — queue is a FIFO pipeline

**STT flow:**

1. User taps mic button → `isListening = true`
2. `expo-speech-recognition` starts (el-GR locale)
3. On result: transcript string → `isListening = false`
4. Transcript sent via `ISessionRepository.sendMessage(transcript)`
5. If error: display Portuguese error message, `isListening = false`

**API key configuration gate:**

On entering `(language-learning)/index.tsx`:
1. Call `ISessionRepository.getAuthStatus()`
2. If `configured === false`: navigate to `api-key-setup.tsx`
3. User enters key → `ISessionRepository.configureApiKey(key)`
4. On success: navigate to skill selection
5. On failure: display Portuguese error, stay on setup screen

**Session lifecycle:**

1. Skill selection → `ISessionRepository.startSession(skill)`
2. Chat screen mounts → subscribe to message stream
3. User types/speaks → `ISessionRepository.sendMessage(content)` → SSE stream
4. Stream events dispatched: `token` → append to chat, `speak` → TTS queue, `skill-complete` → auto-end
5. Skill-complete: `ISessionRepository.endSession()` → navigate to skill selection
6. App backgrounded / route left: session remains active on harness (can resume)
7. Resume: `ISessionRepository.getSessionStatus()` → if active, offer resume

### Enforcement Summary

**All agents implementing V4 Language Learning MUST:**

1. Use `snake_case` for all Python identifiers (harness) and `camelCase` for all TypeScript identifiers (mobile) — never mix
2. Never call the harness API directly from screens — only through `ISessionRepository`
3. Handle all SSE events through the discriminated union switch pattern — no raw string parsing in components
4. Place all timing constants in `src/constants/language-learning-defaults.ts` — no inline `800`, `1200`, `10000` in components
5. Use `languageLearningStore` for all learning UI state — no local `useState` for connection status, session state, or TTS state
6. Request `RECORD_AUDIO` permission on first mic tap — not at app launch or module entry
7. Harness code lives in `harness/` within the FamilyHub repo — Python backend alongside the React Native mobile app
8. Emit SSE events using the 5 defined types only (`token`, `speak`, `skill-complete`, `error`, `done`) — never add event types without updating the TypeScript discriminated union
9. Never store learning data in Supabase — all learning state lives in the harness container filesystem
10. Display all user-facing error messages in Portuguese — never show technical error codes or English messages

## Project Structure & Boundaries

### Complete Project Directory Structure

**Harness API (within FamilyHub repo at `harness/`):**

```
harness/
├── main.py                          ← FastAPI app, router registration, CORS, lifespan
├── config.py                        ← pydantic-settings: SUPABASE_JWT_SECRET, FLUENT_DATA_DIR, LOG_LEVEL
├── dependencies.py                  ← get_current_user (JWT verification)
├── routers/
│   ├── __init__.py
│   ├── health.py                    ← GET /health
│   ├── auth.py                      ← POST /auth/configure, GET /auth/status
│   └── session.py                   ← POST /session/start|resume|end|message, GET /session/status
├── services/
│   ├── __init__.py
│   ├── session_manager.py           ← Session lifecycle, LangGraph agent creation, checkpoint load/save
│   ├── fluent_loader.py             ← Load Fluent SKILL.md files as prompt templates, register tools
│   ├── user_provisioner.py          ← Create /data/users/{userId}/, write api_key.json, init Fluent data
│   └── sse_streamer.py              ← Async generator: LangGraph tokens → SSE events
├── models/
│   ├── __init__.py
│   ├── requests.py                  ← MessageRequest, StartSessionRequest, ConfigureApiKeyRequest
│   ├── responses.py                 ← SessionStatusResponse, AuthStatusResponse, HealthResponse
│   └── events.py                    ← SSEEvent discriminated union (token, speak, skill-complete, error, done)
├── fluent/                          ← Fluent system (git submodule or copy)
│   ├── .claude/skills/              ← 8 SKILL.md files (setup, learn, review, vocab, writing, speaking, reading, progress)
│   ├── .claude/hooks/               ← Python scripts (read-db.py, update-db.py, validate-data.py, etc.)
│   ├── data-examples/               ← Template JSON files for new user provisioning
│   └── ...
├── tests/                           ← pytest (when added)
├── Containerfile                    ← Podman build: Python 3.11, uv, dependencies
├── pyproject.toml                   ← Python dependencies: fastapi, uvicorn, langchain, langgraph, pyjwt
├── .env.example                     ← Template for environment variables
└── README.md
```

**Mobile Client additions (within existing `familyhub/` repo) — only V4 new files:**

```
familyhub/src/
├── app/(app)/(language-learning)/
│   ├── _layout.tsx                  ← Health check on mount, connection status provider
│   ├── index.tsx                    ← API key gate → skill selection screen (FR110, FR112, FR118)
│   ├── api-key-setup.tsx            ← API key input, validation, provisioning (FR113, FR114)
│   └── session.tsx                  ← Chat interface, TTS, mic button (FR105-FR109)
├── components/language-learning/
│   ├── chat-bubble.tsx              ← Agent/user message bubble with streaming text
│   ├── chat-input.tsx               ← TextInput + mic button combo
│   ├── skill-card.tsx               ← Skill button with resume badge
│   ├── connection-status-bar.tsx    ← HTTP health check indicator
│   └── index.ts                     ← Barrel exports
├── repositories/
│   ├── interfaces/
│   │   └── session.repository.interface.ts   ← ISessionRepository
│   └── supabase/
│       └── session.repository.ts             ← HTTP + SSE client to harness API
├── services/
│   └── sse-client.ts                ← SSE stream parser for React Native (fetch-based)
├── stores/
│   └── language-learning.store.ts   ← Zustand: connectionStatus, activeSession, messages, ttsQueue, etc.
├── hooks/
│   ├── use-session.ts               ← Session lifecycle via ISessionRepository
│   ├── use-tts-queue.ts             ← Serial TTS double-speak playback
│   ├── use-stt.ts                   ← expo-speech-recognition (el-GR)
│   └── use-learning-connection.ts   ← Health check polling (10s interval)
├── types/
│   └── language-learning.types.ts   ← ChatMessage, SSEEvent, LearningSkill, SessionInfo
└── constants/
    └── language-learning-defaults.ts ← TTS_REPEAT_PAUSE=800, TTS_PHRASE_PAUSE=1200, SKILLS list, HEALTH_CHECK_INTERVAL=10000

familyhub/
├── .env.development                 ← Add: HARNESS_URL=https://api.fh-morais.party
├── .env.preview                     ← Add: HARNESS_URL=https://api.fh-morais.party
├── .env.production                  ← Add: HARNESS_URL=https://api.fh-morais.party
└── app.config.ts                    ← Add: extra.harnessUrl from HARNESS_URL env
```

### Architectural Boundaries

**Harness API boundary:**
- Zero knowledge of Supabase internals — only verifies JWT signature and extracts `sub` claim
- Zero knowledge of mobile app internals — communicates only via HTTP REST + SSE
- Owns all learning data lifecycle (Fluent JSON files, checkpoints, API keys, results)
- Treats the LLM API as an external service via per-user API keys

**Mobile client boundary:**
- Zero knowledge of harness internals (Python, LangGraph, Fluent, file structure)
- All harness communication goes through `ISessionRepository` — never raw fetch in screens/hooks
- SSE parsing isolated in `services/sse-client.ts` — components receive typed `SSEEvent` objects
- No Supabase tables for learning data — all learning state in harness or Zustand store

**Repository boundary:**
- `ISessionRepository` is the only code that makes HTTP calls to the harness
- Injected via existing `RepositoryContext` — same DI pattern as Supabase repositories
- Implementation (`session.repository.ts`) lives in `repositories/supabase/` directory despite not using Supabase — follows the existing convention that all repository implementations live there

**Fluent boundary:**
- Harness imports Fluent's Python modules directly — no CLI invocations, no subprocess calls
- Fluent's data access layer (`read-db.py`, `update-db.py`) operates on files in the per-user `FLUENT_DATA_DIR`
- Fluent's skill files (`.claude/skills/*/SKILL.md`) are read as prompt templates by `fluent_loader.py`
- Fluent remains unmodified — the harness adapts it, never changes it

### Data Flow

```
First use — API key configuration:
  User enters API key on mobile
    → ISessionRepository.configureApiKey(key)
    → POST /auth/configure (Bearer JWT)
    → harness: verify JWT → extract userId → validate key with LLM API test call
    → harness: create /data/users/{userId}/ (fluent/, results/, api_key.json)
    → harness: return { provisioned: true }
    → mobile: navigate to skill selection

Start learning session:
  User taps skill on mobile
    → ISessionRepository.startSession(skill)
    → POST /session/start { skill: "learn" } (Bearer JWT)
    → harness: verify JWT → extract userId → load api_key.json
    → harness: create LangGraph agent with Fluent skill prompt + tools
    → harness: load user's Fluent data (6 JSON files) via read-db.py
    → harness: return SSE stream with greeting
    → mobile: sse-client.ts parses stream → store updates → chat renders

User sends message (typing or voice):
  User types or speaks on mobile
    → [if voice] useStt: capture el-GR → transcript
    → ISessionRepository.sendMessage(content)
    → POST /session/message { content: "..." } (Bearer JWT)
    → harness: verify JWT → extract userId → load LangGraph checkpoint
    → harness: invoke agent with user message → stream LLM response
    → harness: emit SSE events (token, speak, skill-complete, done)
    → mobile: sse-client.ts parses stream
      → token event → append to current chat bubble (real-time)
      → speak event → enqueue phrases in ttsQueue → useTtsQueue plays double-speak
      → skill-complete event → auto-call endSession → navigate to skill selection
      → done event → set isStreaming = false

Resume session:
  User opens Language Learning on mobile
    → ISessionRepository.getSessionStatus()
    → GET /session/status (Bearer JWT)
    → harness: return { active: true, skill: "learn" }
    → mobile: show "Resume" badge on Learn skill card
    → User taps Resume → ISessionRepository.resumeSession()
    → POST /session/resume (Bearer JWT)
    → harness: load LangGraph checkpoint → emit greeting SSE stream
    → mobile: load chat history from store → continue session
```

### FR Categories → Directory Mapping

| FR Category | Harness Location | Mobile Location |
|---|---|---|
| FR100 · Start session | `routers/session.py`, `services/session_manager.py` | `hooks/use-session.ts`, `session.tsx` |
| FR101 · Resume session | `routers/session.py`, `services/session_manager.py` (SqliteSaver) | `hooks/use-session.ts`, `index.tsx` |
| FR102 · End session | `routers/session.py`, `services/session_manager.py` | `hooks/use-session.ts` |
| FR103 · Session status | `routers/session.py` | `hooks/use-session.ts` |
| FR104 · Send message + stream | `routers/session.py`, `services/sse_streamer.py` | `repositories/supabase/session.repository.ts`, `services/sse-client.ts` |
| FR105 · Chat interface | — | `session.tsx`, `components/language-learning/chat-bubble.tsx` |
| FR106 · TTS double-speak | — | `hooks/use-tts-queue.ts`, `constants/language-learning-defaults.ts` |
| FR107 · Greek text display | — | `components/language-learning/chat-bubble.tsx` |
| FR108 · Mic + STT | — | `components/language-learning/chat-input.tsx`, `hooks/use-stt.ts` |
| FR109 · Input method invisible | `services/session_manager.py` (agent receives plain text) | `hooks/use-stt.ts` (sends transcript as message) |
| FR110 · Skill selection | — | `index.tsx`, `components/language-learning/skill-card.tsx` |
| FR111 · One session at a time | `services/session_manager.py` | `hooks/use-session.ts` |
| FR112 · API key gate | `routers/auth.py` | `index.tsx`, `hooks/use-session.ts` |
| FR113 · API key configure | `routers/auth.py`, `services/user_provisioner.py` | `api-key-setup.tsx`, `hooks/use-session.ts` |
| FR114 · Post-configure nav | `routers/auth.py` (returns success) | `api-key-setup.tsx` (navigates to skill menu) |
| FR115 · Per-user isolation | `services/user_provisioner.py`, `services/session_manager.py` | — (handled by harness) |
| FR116 · Connection status | `routers/health.py` | `hooks/use-learning-connection.ts`, `components/language-learning/connection-status-bar.tsx` |
| FR117 · Skill-complete auto-end | `services/sse_streamer.py` (emits event) | `hooks/use-session.ts` (handles event) |
| FR118 · First-use Setup auto-start | `routers/auth.py` (returns setupComplete flag) | `index.tsx` (if configured but !setupComplete → auto-start Setup) |

## Architecture Validation Results

### Coherence Validation

**Decision Compatibility: PASS**
- FastAPI (Python) + LangChain/LangGraph (Python) + Fluent (Python) — single-language backend, zero bridge overhead
- SSE-only communication eliminates WebSocket complexity — one protocol for all agent output
- Supabase JWT passthrough works with FastAPI's dependency injection — clean auth layer
- SqliteSaver + file-based Fluent data — no conflicting storage engines
- Single container reduces operational complexity — one process, one port, one domain

**Pattern Consistency: PASS**
- Python harness uses PEP 8 (`snake_case`) consistently across all files
- Mobile client follows existing FamilyHub TypeScript conventions (camelCase, kebab-case files, PascalCase components)
- SSE event types match TypeScript discriminated union — no mismatch possible
- Repository pattern maintained — `ISessionRepository` follows the same DI approach as other modules

**Structure Alignment: PASS**
- Harness directory structure maps cleanly to FastAPI conventions (routers, services, models)
- Mobile additions fit into existing FamilyHub directory structure without conflicts
- FR-to-directory mapping covers all 19 functional requirements

### Requirements Coverage Validation

**Functional Requirements — all 19 FRs covered:**

| FR | Status | Architectural Support |
|---|---|---|
| FR100 | COVERED | `POST /session/start` → session_manager creates LangGraph agent |
| FR101 | COVERED | `POST /session/resume` → SqliteSaver rehydrates, returns message history |
| FR102 | COVERED | `POST /session/end` → persist Fluent data, write result file |
| FR103 | COVERED | `GET /session/status` → returns active state + skill |
| FR104 | COVERED | `POST /session/message` → SSE stream with structured events |
| FR105 | COVERED | Chat bubble UI in `session.tsx` |
| FR106 | COVERED | `useTtsQueue` with timing constants from `language-learning-defaults.ts` |
| FR107 | COVERED | Greek text styling in `chat-bubble.tsx` |
| FR108 | COVERED | `useStt` hook + mic button in `chat-input.tsx` |
| FR109 | COVERED | Agent receives plain text — input method invisible at harness level |
| FR110 | COVERED | Skill selection screen in `index.tsx` with 8 skill cards |
| FR111 | COVERED | session_manager enforces one session per user |
| FR112 | COVERED | `GET /auth/status` → gate in `index.tsx` |
| FR113 | COVERED | `POST /auth/configure` + user_provisioner |
| FR114 | COVERED | On success → navigate to skill selection |
| FR115 | COVERED | Per-user directories, api_key.json chmod 600 |
| FR116 | COVERED | `GET /health` polling + connection-status-bar |
| FR117 | COVERED | `skill-complete` SSE event → auto-end → navigate |
| FR118 | COVERED | `GET /auth/status` returns `setupComplete` → auto-start Setup if false |

**Non-Functional Requirements — all 7 NFRs addressed:**

| NFR | Status | Architectural Support |
|---|---|---|
| NFR27 | ADDRESSED | Single process, direct Python imports, no subprocess overhead — 5s target achievable |
| NFR28 | ADDRESSED | SSE events parsed immediately, no buffering between receipt and TTS enqueue |
| NFR29 | ADDRESSED | expo-speech-recognition native Android STT |
| NFR30 | ADDRESSED | Timing constants in `language-learning-defaults.ts`, serial queue in `useTtsQueue` |
| NFR31 | ADDRESSED | Cloudflare Tunnel provides TLS termination |
| NFR32 | ADDRESSED | Per-user api_key.json with chmod 600, per-user data directories |
| NFR33 | ADDRESSED | SSE streaming from LangGraph — first token emitted as soon as LLM responds |

### Gap Analysis Results

**Gaps found and resolved during validation:**

1. **FR118 — Setup completion check (RESOLVED):** Extended `GET /auth/status` to return `{ configured: bool, setupComplete: bool }`. The harness checks for the existence of `learner-profile.json` in the user's Fluent data directory to determine setup completion.

2. **FR101 — Chat history on resume (RESOLVED):** `POST /session/resume` returns a JSON body with `{ messages: ChatMessage[] }` extracted from the LangGraph checkpoint state. This differs from `POST /session/start` which returns an SSE stream immediately. The mobile app populates the store from this response before the user interacts.

3. **SSE client for React Native (IMPLEMENTATION DETAIL):** Native `EventSource` doesn't support custom Authorization headers. `services/sse-client.ts` implements a fetch-based SSE parser. Not an architectural gap — handled at implementation level.

**No critical gaps remain. All 19 FRs and 7 NFRs are architecturally supported.**

### Architecture Completeness Checklist

- [x] Project context analyzed (19 FRs, 7 NFRs, 9 constraints)
- [x] Scale and complexity assessed (medium-high, mobile + backend)
- [x] Starter template evaluated (FastAPI selected over Express/Fastify/Hono)
- [x] Data architecture decided (file-based Fluent, SqliteSaver, zero Supabase)
- [x] Authentication decided (Supabase JWT passthrough)
- [x] Communication pattern decided (SSE-only, no WebSocket)
- [x] Frontend architecture decided (chat bubble UI, TTS queue, STT)
- [x] Infrastructure decided (single container, Cloudflare Tunnel)
- [x] Implementation patterns defined (naming, structure, format, communication, process)
- [x] Project structure defined (harness + mobile client additions)
- [x] FR-to-directory mapping complete (all 19 FRs mapped)
- [x] All validation gaps resolved

### Architecture Readiness Assessment

**Overall Status: READY FOR IMPLEMENTATION**

**Confidence Level: HIGH**

**Key Strengths:**
- Single-language backend (Python) eliminates bridge complexity with Fluent
- SSE-only architecture is significantly simpler than the previous WebSocket approach
- Zero Supabase footprint reduces migration risk and deployment coupling
- LangGraph checkpointing provides session persistence out of the box
- FastAPI's async nature handles streaming and concurrent users on Pi hardware

**Areas for Future Enhancement:**
- Multi-language support (currently Greek only — Fluent supports any language)
- LLM provider flexibility (currently GLM 5.1 — LangChain abstraction supports swapping)
- In-app session result browsing (currently file-based on harness)
- Token usage tracking per user (API key isolation enables this, but no dashboard yet)

### Implementation Handoff

**AI Agent Guidelines:**

1. Follow the implementation sequence (steps 1-11) — each step has clear dependencies
2. Harness code goes in `harness/` directory within the FamilyHub repo
3. Mobile additions go in the existing FamilyHub repo — follow existing conventions
4. All harness API calls through `ISessionRepository` — never raw fetch
5. All SSE events through discriminated union — never raw string parsing
6. All timing constants from `language-learning-defaults.ts` — never inline

**First Implementation Priority:**
1. Harness: FastAPI skeleton + JWT auth middleware + health check endpoint
2. Harness: User provisioning (API key validation + directory creation)
3. Harness: LangGraph agent integration with Fluent skills
4. Mobile: Route group + connection status
5. Mobile: API key setup screen
6. Mobile: Skill selection
7. Mobile: Chat interface with SSE
8. Mobile: TTS queue
9. Mobile: STT voice input
