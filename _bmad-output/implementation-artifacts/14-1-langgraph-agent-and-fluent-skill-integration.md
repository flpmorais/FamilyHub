# Story 14.1: LangGraph Agent & Fluent Skill Integration

Status: done

branch: feature/14-1-langgraph-agent-fluent-skill-integration

## ARCHITECTURE MANDATES — NON-NEGOTIABLE

1. **Zero Supabase footprint** — No learning data in Supabase. All data lives in the harness container filesystem.
2. **SSE-only communication** — No WebSocket. HTTP + SSE for all client-harness communication.
3. **`snake_case` for Python** identifiers, `camelCase` for TypeScript — never mix.
4. **FastAPI default error format** `{ "detail": "..." }` — no custom wrapper.
5. **All user-facing error messages in Portuguese** — never show technical error codes or English messages.
6. **Harness code lives in `harness/`** — Python backend alongside the React Native mobile app.
7. **Fluent remains unmodified** — the harness adapts it, never changes it. Import Fluent's Python modules directly — no CLI invocations, no subprocess calls.
8. **Single-language backend** — Python throughout. LangChain + LangGraph are Python-first. Fluent's hooks are Python.
9. **`FLUENT_DATA_DIR` per-user** — set `FLUENT_DATA_DIR=/data/users/{userId}/fluent/` when loading Fluent's Python modules so `read-db.py` and `update-db.py` work unmodified.
10. **LangGraph checkpointing via SqliteSaver** — shared `/data/checkpoints.db` for all sessions.
11. **Per-user API key injection** — each user's LLM calls use their own API key stored in `/data/users/{userId}/api_key.json`.
12. **All harness API calls require Supabase JWT** — via `get_current_user` dependency.

## Story

As an admin,
I want the harness to create a LangGraph agent that runs Fluent learning skills,
so that I can have interactive language learning sessions.

## Acceptance Criteria

1. **AC-1: Agent creation with Fluent skill prompt** — Given a user with a configured API key, When the session manager creates a new agent for the "learn" skill, Then a LangGraph ReAct agent is initialized with the Fluent Learn SKILL.md as the system prompt, And Fluent's Python tools (read-db, update-db) are registered as LangChain tools, And the agent uses the user's API key for LLM calls, And the user's `FLUENT_DATA_DIR` is set to `/data/users/{userId}/fluent/`.

2. **AC-2: Fluent data accessibility** — Given the agent is created, When the user's Fluent data is loaded, Then all 6 JSON databases are accessible to the agent via read-db tools.

3. **AC-3: Checkpointing** — Given a LangGraph agent completes a message turn, When the agent produces output, Then the output is checkpointed to SqliteSaver (`/data/checkpoints.db`).

## Tasks / Subtasks

- [x] Add Python dependencies to `harness/pyproject.toml` (AC: #1)
  - [x] Add `langchain>=0.3.0`, `langgraph>=0.2.0`, `langchain-openai>=0.3.0` (or `langchain-community` for GLM compatibility)
  - [x] Add `langgraph-checkpoint-sqlite>=2.0.0` for SqliteSaver
- [x] Implement `harness/services/fluent_loader.py` — Fluent skill & tool loader (AC: #1, #2)
  - [x] Function to discover all 8 SKILL.md files from `fluent/.claude/skills/` (using the `fluent/` dir relative to harness)
  - [x] Function to load a specific SKILL.md content as the system prompt for a given skill name
  - [x] Function to create LangChain `@tool` wrappers around Fluent's `read-db.py` and `update-db.py` functions
  - [x] `read_db_tool`: calls `read-db.py`'s `main()` or `load_json` functions with `FLUENT_DATA_DIR` set to the user's data directory, returns all 6 databases as structured data
  - [x] `update_db_tool`: accepts a session report JSON, calls `update-db.py`'s update functions directly (not subprocess), with `FLUENT_DATA_DIR` set
  - [x] Handle `FLUENT_DATA_DIR` environment variable scoping per-user (set before calling Fluent functions, restore after)
- [x] Implement `harness/services/session_manager.py` — Session & agent lifecycle (AC: #1, #3)
  - [x] `SessionManager` class: holds active sessions per user, creates/destroys LangGraph agents
  - [x] `create_agent(user_id, skill, api_key)` method:
    - Loads the SKILL.md prompt for the given skill via `fluent_loader`
    - Creates a LangGraph ReAct agent with the loaded tools (read-db, update-db, + speak tool)
    - Configures the LLM (GLM via OpenAI-compatible API) with the user's per-user API key
    - Sets up SqliteSaver checkpointing on `/data/checkpoints.db`
    - Stores the agent in an in-memory dict keyed by user_id
  - [x] `get_agent(user_id)` method: returns the active agent for a user, or None
  - [x] `destroy_agent(user_id)` method: cleans up the agent, persists final Fluent data
  - [x] `load_user_fluent_data(user_id)` method: sets FLUENT_DATA_DIR and reads all 6 DBs for agent context
- [x] Add `speak` tool to agent (AC: #1)
  - [x] LangChain `@tool` that accepts Greek phrases and marks them for TTS emission
  - [x] This tool's output is intercepted by the SSE streamer (story 14.3) to emit `speak` events
  - [x] For now: the tool stores phrases in the agent's state for later extraction
- [x] Update `harness/models/events.py` — SSE event types (AC: #1, #3)
  - [x] Define Python enum/dataclasses for the 5 SSE event types: `token`, `speak`, `skill-complete`, `error`, `done`
- [x] Update `harness/models/requests.py` — session request models (AC: #1)
  - [x] `StartSessionRequest` with `skill: str` field (validated against available skills)
- [x] Update `harness/models/responses.py` — session response models (AC: #1, #3)
  - [x] `SessionStartResponse` with `session_id: str` and `skill: str`
  - [x] `SessionStatusResponse` with `active: bool` and `skill: str | None`
- [x] Update `harness/Containerfile` if needed for new deps (AC: #1)
- [x] Verify agent creation works end-to-end with a test script (AC: #1, #2, #3)

### Review Findings

- [x] [Review][Patch] Silent session eviction — add log warning before replacing existing agent for same user_id (`session_manager.py:52-53`)
- [x] [Review][Patch] Switch `_import_fluent_update_functions()` to lazy import — import on first `create_*_tool` call instead of at module level, improving testability and resilience (`fluent_loader.py:48`)
- [x] [Review][Dismiss] `destroy_agent` persisting — agent already persists Fluent data incrementally via `update_learner_data` tool during the ReAct loop; no explicit persist needed at destroy time (`session_manager.py:97-99`)
- [x] [Review][Patch] `json.loads` crash on non-JSON input in `update_learner_data` — LLM output may not be valid JSON; no try/except around `json.loads(session_report_json)` (`fluent_loader.py:127`)
- [x] [Review][Patch] `_load_json` crashes on corrupt JSON file — `json.load` will raise `JSONDecodeError` on malformed files, unlike `load_user_fluent_data` which catches it (`fluent_loader.py:81-82`)
- [x] [Review][Patch] `user_data_dir` may not exist when writing — `_save_json` opens a file in a directory that may not have been created yet (`fluent_loader.py:86-92`)
- [x] [Review][Patch] `SKILL.md` / `LEARNING_SYSTEM.md` unreadable — `read_text()` raises `OSError`/`PermissionError` with no handling (`fluent_loader.py:71-73`)
- [x] [Review][Patch] `__import__("datetime")` inline import — bypasses static analysis and is unconventional; should be a top-level `import datetime` (`fluent_loader.py:108`)
- [x] [Review][Patch] `_FLUENT_DB_FILES` list duplicated in `load_user_fluent_data` — same 6 filenames hardcoded twice; drift risk (`session_manager.py:107-113` vs `fluent_loader.py:22-29`)
- [x] [Review][Patch] `sys.path` leak from `update-db.py` import — `update-db.py` itself inserts `HOOKS_DIR` at `sys.path[0]` during its import; the parent's `finally` only pops one copy, leaving a permanent entry (`fluent_loader.py:48` + `update-db.py:24`)
- [x] [Review][Patch] `session['date']` format not validated — Fluent's `parse_date` expects YYYY-MM-DD but only key presence is checked; malformed date crashes update functions (`fluent_loader.py:129`)
- [x] [Review][Patch] `read_db` tool doesn't import from `read-db.py` as spec requires — uses local `_load_json` instead of importing `load_json` from Fluent (`fluent_loader.py:81-84` vs spec: "import load_json from read-db.py and construct paths manually")
- [x] [Review][Patch] LLM output KeyErrors in update functions — `update_learner_profile`, `update_progress_db`, `update_mistakes_db`, `update_spaced_repetition` all expect specific keys (e.g. `correct`, `pattern_id`, `item_id`) that LLM output may omit (`fluent_loader.py:152-157`)
- [x] [Review][Patch] Partial multi-file write with no backup — 6 JSON files written sequentially; crash mid-write leaves inconsistent state across databases (`fluent_loader.py:160-161`)
- [x] [Review][Defer] Model and base_url hardcoded — `glm-4-flash` and `https://open.bigmodel.cn/api/paas/v4` are hardcoded in `create_agent`; not specified as configurable in this story (`session_manager.py:59-62`) — deferred, future enhancement
- [x] [Review][Defer] `sys.path` thread-safety — theoretical race during `sys.path.insert/pop` in async server; GIL makes this practically impossible (`fluent_loader.py:36`) — deferred, theoretical concern

## Dev Notes

### Existing Code from Stories 13.1–13.4

This story builds entirely on the harness infrastructure created in Epic 13. Key existing files:

| File | Status | What This Story Changes |
|---|---|---|
| `harness/services/fluent_loader.py` | Placeholder (`# placeholder — epic 14`) | Full implementation — skill loading, tool creation |
| `harness/services/session_manager.py` | Placeholder (`# placeholder — epic 14`) | Full implementation — agent lifecycle, checkpointing |
| `harness/models/events.py` | Placeholder (`# placeholder — epic 14`) | Define SSE event type dataclasses |
| `harness/models/requests.py` | Has `ConfigureApiKeyRequest` only | Add `StartSessionRequest` |
| `harness/models/responses.py` | Has `HealthResponse`, `AuthStatusResponse`, `ConfigureResponse` | Add `SessionStartResponse`, `SessionStatusResponse` |
| `harness/services/sse_streamer.py` | Placeholder (`# placeholder — epic 14`) | Leave for story 14.3 |
| `harness/main.py` | Has health + auth routers | Add session router in story 14.2 |
| `harness/config.py` | Has `SUPABASE_JWT_SECRET`, `FLUENT_DATA_DIR`, `LOG_LEVEL` | May add `CHECKPOINTS_DB_PATH` |
| `harness/pyproject.toml` | Has fastapi, uvicorn, pyjwt, pydantic, httpx | Add langchain, langgraph, langgraph-checkpoint-sqlite |

### Fluent System Architecture — How to Integrate

The Fluent system is a Claude Code plugin designed for CLI use. The harness must adapt it to a server-side API. **CRITICAL: Do NOT call Fluent scripts as subprocesses. Import their Python functions directly.**

**Fluent's Python modules (to import directly):**

| File | Functions to Import | What It Does |
|---|---|---|
| `fluent/.claude/hooks/read-db.py` | `main()`, `load_json()`, `FILES` dict | Reads all 6 JSON DBs, outputs combined JSON with computed fields (due_reviews_count, streak_active, etc.) |
| `fluent/.claude/hooks/update-db.py` | `main()`, `update_learner_profile()`, `update_progress_db()`, `update_mistakes_db()`, `update_mastery_db()`, `update_spaced_repetition()`, `update_session_log()`, `calculate_sm2()` | Updates all 6 JSON DBs from a session report (JSON via stdin in CLI mode) |
| `fluent/.claude/hooks/fluent_paths.py` | `data_dir()`, `ensure_data_dir()` | Resolves FLUENT_DATA_DIR from env var |

**Fluent's data directory per-user:**
```
/data/users/{userId}/fluent/
├── learner-profile.json
├── progress-db.json
├── mistakes-db.json
├── mastery-db.json
├── spaced-repetition.json
└── session-log.json
```

**The key integration challenge:** Fluent's scripts use `FLUENT_DATA_DIR` environment variable to find the data directory. When creating tools, you must temporarily set `os.environ["FLUENT_DATA_DIR"]` to the user's directory before calling Fluent functions, then restore it. This is because `fluent_paths.py` uses `os.environ.get("FLUENT_DATA_DIR")`.

**Better approach:** Instead of relying on env vars, refactor the tool wrappers to call Fluent's internal functions directly with explicit paths:
- `read-db.py`: import `load_json()` and `FILES` dict, construct paths manually pointing to `/data/users/{userId}/fluent/`
- `update-db.py`: import the `update_*` functions and `save_json()`, pass the user's data paths explicitly

This avoids environment variable race conditions in a multi-user scenario.

### Fluent Skills — SKILL.md Files

8 skill files in `fluent/.claude/skills/`:

| Skill | Directory | Purpose |
|---|---|---|
| setup | `setup/SKILL.md` | First-use onboarding — creates learner profile |
| learn | `learn/SKILL.md` | Main adaptive session — interleaved exercises |
| review | `review/SKILL.md` | Spaced repetition review |
| vocab | `vocab/SKILL.md` | Vocabulary flashcard drills |
| writing | `writing/SKILL.md` | Writing practice |
| speaking | `speaking/SKILL.md` | Conversation practice |
| reading | `reading/SKILL.md` | Reading comprehension |
| progress | `progress/SKILL.md` | Statistics dashboard |

The `fluent_loader.py` should read each SKILL.md file and use its content as the system prompt for the LangGraph agent when that skill is selected. The SKILL.md files contain detailed instructions that tell the LLM how to behave as a language tutor.

### LangGraph Agent Architecture

**ReAct Agent Pattern:**

The agent follows the ReAct (Reasoning + Acting) loop:
1. Agent receives the user message + system prompt (SKILL.md)
2. Agent decides which tools to call (read-db, update-db, speak)
3. Agent calls tools and gets results
4. Agent reasons about results and generates a response
5. Response is streamed as SSE tokens

**Tool Design for the Agent:**

The agent needs these LangChain tools:

1. **`read_learner_data`** — Reads all 6 Fluent JSON databases for the current user
   - Input: none (user context is implicit)
   - Output: all 6 databases as structured JSON
   - Implementation: import from `read-db.py`, call with user's data path

2. **`update_learner_data`** — Updates Fluent databases with session results
   - Input: session report JSON (matching `update-db.py` schema)
   - Output: success confirmation with stats
   - Implementation: import update functions from `update-db.py`, call with user's data path

3. **`speak_phrases`** — Marks Greek phrases for TTS playback
   - Input: list of Greek phrases
   - Output: confirmation (the SSE streamer will emit `speak` events based on this)
   - Implementation: store phrases in agent state or a side channel

**GLM 5.1 LLM Configuration:**

The user's API key (stored at `/data/users/{userId}/api_key.json`) is used to create a LangChain ChatModel. GLM uses an OpenAI-compatible API:

```python
from langchain_openai import ChatOpenAI

llm = ChatOpenAI(
    model="glm-4-flash",  # or the model specified by the user
    api_key=user_api_key,
    base_url="https://open.bigmodel.cn/api/paas/v4",
)
```

The API key is already validated during provisioning (story 13.2 via `validate_api_key()`).

**SqliteSaver Checkpointing:**

```python
from langgraph.checkpoint.sqlite import SqliteSaver

checkpointer = SqliteSaver.from_conn_string("/data/checkpoints.db")
```

The checkpointer stores LangGraph state after each message turn, enabling session resume (story 14.2).

### Key Architecture Decisions for This Story

**Direct Python imports, not subprocesses.** The harness imports Fluent's Python modules directly. This is the core architectural decision that led to choosing FastAPI (Python) over Node.js. Import `load_json`, `save_json`, and the `update_*` functions directly. The `FLUENT_DATA_DIR` environment variable approach from Fluent is a CLI convention — for the harness, pass paths explicitly.

**One agent per user in memory.** The `SessionManager` holds agents in a dict `{user_id: agent}`. At family scale (2 users), this is trivially manageable. No need for Redis or external state.

**No session router in this story.** Story 14.2 will create `routers/session.py` and wire it to `main.py`. This story focuses on the service layer: `fluent_loader.py`, `session_manager.py`, and the models they need.

**SSE event types are defined but streaming is not implemented.** `models/events.py` gets the type definitions so `session_manager.py` can reference them. The actual SSE streaming logic goes in `services/sse_streamer.py` (story 14.3).

**The `speak` tool is a placeholder mechanism.** The agent calls the `speak_phrases` tool with Greek text. For now, the tool simply stores the phrases. Story 14.3's SSE streamer will intercept these to emit `speak` events. The mechanism can be as simple as storing phrases in the agent's state or a queue that the streamer reads.

### What This Story Does NOT Include

- Session router (`routers/session.py`) → Story 14.2
- SSE streaming implementation → Story 14.3
- Mobile client changes → Stories 14.4, 14.5, 14.6
- TTS/STT → Epic 15
- Any Supabase migrations or tables — zero Supabase footprint for V4

### Dependencies to Add

```toml
# harness/pyproject.toml additions
"langchain>=0.3.0",
"langgraph>=0.2.0",
"langchain-openai>=0.3.0",
"langgraph-checkpoint-sqlite>=2.0.0",
```

**Note:** `langchain-openai` works with GLM because GLM exposes an OpenAI-compatible API at `https://open.bigmodel.cn/api/paas/v4`. Use `ChatOpenAI` with `base_url` parameter.

### File-by-File Guide

#### `harness/services/fluent_loader.py` — Full Implementation

This is the bridge between the harness and Fluent. Key functions:

1. `discover_skills() -> dict[str, Path]` — Scans `fluent/.claude/skills/*/SKILL.md`, returns `{skill_name: path}`. The 8 learner-facing skills are: setup, learn, review, vocab, writing, speaking, reading, progress.

2. `load_skill_prompt(skill_name: str) -> str` — Reads the SKILL.md file content for the given skill. Returns the full markdown content as the system prompt. Also prepend the `LEARNING_SYSTEM.md` content as additional context.

3. `create_read_db_tool(user_data_dir: Path) -> Tool` — Creates a LangChain `@tool` that reads all 6 Fluent JSON databases. Import `load_json` from `read-db.py`. Construct the file paths manually: `{user_data_dir}/learner-profile.json`, etc. Return structured data.

4. `create_update_db_tool(user_data_dir: Path) -> Tool` — Creates a LangChain `@tool` that updates all 6 Fluent databases. Import the `update_*` functions and `save_json` from `update-db.py`. The tool accepts a session report JSON string matching the update-db schema. Call each update function with the correct paths.

5. `create_speak_tool() -> Tool` — Creates a LangChain `@tool` that accepts a list of Greek phrases and returns them for TTS emission. This is how the agent signals that certain text should be spoken aloud.

**Fluent path resolution:** The harness knows the user's data directory from `user_provisioner.py` (`/data/users/{userId}/fluent/`). Pass this path explicitly to the tool factory functions. Do NOT rely on the `FLUENT_DATA_DIR` env var inside the tools — construct paths directly.

**Fluent's `fluent_paths.py` uses `@lru_cache`** on `data_dir()`. If you set `FLUENT_DATA_DIR` env var and then call `data_dir()`, it caches the result. For multi-user scenarios, you must either:
- (a) Clear the cache between users: `data_dir.cache_clear()` before each call
- (b) Avoid using `fluent_paths.py` entirely and construct paths manually (RECOMMENDED)

Go with option (b). Import `load_json` and `save_json` from the Fluent scripts, but construct the file paths yourself using the user's data directory.

#### `harness/services/session_manager.py` — Full Implementation

```python
class SessionManager:
    def __init__(self):
        self._agents: dict[str, CompiledGraph] = {}  # user_id -> agent
        self._sessions: dict[str, SessionInfo] = {}   # user_id -> session info
        self._skills = discover_skills()

    async def create_agent(self, user_id: str, skill: str, api_key: str) -> SessionInfo:
        # 1. Validate skill exists
        # 2. Load SKILL.md prompt
        # 3. Create LLM with user's API key
        # 4. Create tools (read-db, update-db, speak) with user's data dir
        # 5. Create LangGraph ReAct agent with tools + checkpointer
        # 6. Store in self._agents[user_id]
        # 7. Return SessionInfo

    def get_agent(self, user_id: str) -> CompiledGraph | None:
        return self._agents.get(user_id)

    def get_session_info(self, user_id: str) -> SessionInfo | None:
        return self._sessions.get(user_id)

    async def destroy_agent(self, user_id: str) -> None:
        # 1. Persist final Fluent data (call update-db with session summary)
        # 2. Remove from self._agents and self._sessions
```

**SqliteSaver initialization:** Create the checkpointer once in `__init__` and share it across all agents. The `checkpoints.db` file is shared for all users — LangGraph uses thread_id (which will be the user_id) to partition state.

**Agent creation:** Use `langgraph.prebuilt.create_react_agent` for the standard ReAct pattern:

```python
from langgraph.prebuilt import create_react_agent

agent = create_react_agent(
    model=llm,
    tools=[read_db_tool, update_db_tool, speak_tool],
    prompt=system_prompt,
    checkpointer=checkpointer,
)
```

The agent is a compiled LangGraph graph that can be invoked with messages and will automatically checkpoint state.

#### `harness/models/events.py` — SSE Event Types

```python
from dataclasses import dataclass
from typing import Literal

@dataclass
class SSEEvent:
    type: str

@dataclass
class TokenEvent(SSEEvent):
    type: Literal["token"] = "token"
    content: str = ""

@dataclass
class SpeakEvent(SSEEvent):
    type: Literal["speak"] = "speak"
    phrases: list[str] = field(default_factory=list)

@dataclass
class SkillCompleteEvent(SSEEvent):
    type: Literal["skill-complete"] = "skill-complete"
    skill: str = ""

@dataclass
class ErrorEvent(SSEEvent):
    type: Literal["error"] = "error"
    message: str = ""

@dataclass
class DoneEvent(SSEEvent):
    type: Literal["done"] = "done"
```

#### `harness/models/requests.py` — Add StartSessionRequest

```python
class StartSessionRequest(BaseModel):
    skill: str = Field(..., min_length=1)
```

#### `harness/models/responses.py` — Add Session Responses

```python
class SessionStartResponse(BaseModel):
    session_id: str
    skill: str

class SessionStatusResponse(BaseModel):
    active: bool
    skill: str | None = None
```

### Testing Approach

No automated test runner configured for harness yet (pytest is in dev dependencies). Manual verification:

1. Start the harness locally: `cd harness && uvicorn main:app --reload`
2. Verify health check still works: `curl http://localhost:8000/health`
3. Create a test script that:
   - Provisions a test user (or uses an existing one)
   - Creates an agent for the "learn" skill
   - Sends a test message to the agent
   - Verifies the agent responds with tutoring content
   - Verifies checkpoint is created in `/data/checkpoints.db`
4. Verify Fluent data is read correctly by the agent's tools
5. Verify the agent uses the user's API key for LLM calls

### References

- [Source: epics-v4-language-learning.md — Story 14.1 acceptance criteria, FR100 (agent creation)]
- [Source: architecture-v4-language-learning.md — Section 1 (Data Architecture — Fluent file storage, SqliteSaver), Section 3 (API patterns — SSE event types), Section 4 (Frontend Architecture — not directly, but TTS speak event design), Section 5 (Infrastructure — single container), Implementation Patterns (naming, structure, format, communication, process patterns)]
- [Source: architecture-v4-language-learning.md — Project Structure: harness/services/session_manager.py, harness/services/fluent_loader.py, harness/models/events.py]
- [Source: architecture-v4-language-learning.md — Enforcement Summary: snake_case Python, no raw string parsing, timing constants, languageLearningStore, RECORD_AUDIO permission (not this story)]
- [Source: architecture-v4-language-learning.md — FR-to-directory mapping: FR100 → routers/session.py + services/session_manager.py]
- [Source: fluent/.claude/skills/learn/SKILL.md — Learn skill system prompt (the primary skill to test with)]
- [Source: fluent/.claude/skills/setup/SKILL.md — Setup skill for first-use onboarding]
- [Source: fluent/.claude/hooks/read-db.py — Python functions to import: load_json(), FILES dict, main()]
- [Source: fluent/.claude/hooks/update-db.py — Python functions to import: update_learner_profile(), update_progress_db(), update_mistakes_db(), update_mastery_db(), update_spaced_repetition(), update_session_log(), save_json(), calculate_sm2()]
- [Source: fluent/.claude/hooks/fluent_paths.py — Path resolution (recommend NOT using this — construct paths manually)]
- [Source: fluent/LEARNING_SYSTEM.md — Complete teaching methodology, SM-2 algorithm, exercise generation, feedback format]
- [Source: harness/services/user_provisioner.py — _fluent_dir(), _api_key_path(), existing user directory structure]
- [Source: harness/config.py — settings.FLUENT_DATA_DIR = "/data/users"]
- [Source: harness/dependencies.py — UserContext with user_id and email]
- [Source: harness/pyproject.toml — existing deps, add langchain/langgraph]
- [Source: story 13-4 — previous story patterns, Portuguese error messages, file organization]

## Dev Agent Record

### Agent Model Used

glm-5.1

### Debug Log References

### Completion Notes List

- Added langchain, langgraph, langchain-openai, langgraph-checkpoint-sqlite deps to pyproject.toml
- Implemented fluent_loader.py: skill discovery (8 learner-facing skills), prompt loading with LEARNING_SYSTEM.md prepended, read_db/update_db/speak LangChain tools
- Used importlib to import update-db module (hyphenated filename) with temporary FLUENT_DATA_DIR env var to avoid module-level side effects
- Tools construct user data paths explicitly (no FLUENT_DATA_DIR env var at runtime), avoiding lru_cache race conditions
- Implemented session_manager.py: SessionManager with SqliteSaver checkpointing (via ExitStack context manager), create_react_agent from langgraph.prebuilt
- Added CHECKPOINTS_DB_PATH to config.py for configurable checkpoint storage
- Defined 5 SSE event dataclasses (TokenEvent, SpeakEvent, SpeakEvent, ErrorEvent, DoneEvent)
- Added StartSessionRequest, SessionStartResponse, SessionStatusResponse models
- Containerfile unchanged — existing `uv pip install -r pyproject.toml` picks up new deps
- All 3 ACs verified end-to-end: agent creation with learn skill prompt, 6 DB accessibility, SqliteSaver checkpointing
- All 15 existing tests pass with no regressions

### File List

- `harness/pyproject.toml` — added langchain, langgraph, langchain-openai, langgraph-checkpoint-sqlite dependencies
- `harness/config.py` — added CHECKPOINTS_DB_PATH setting
- `harness/models/events.py` — defined 5 SSE event dataclasses (TokenEvent, SpeakEvent, SkillCompleteEvent, ErrorEvent, DoneEvent)
- `harness/models/requests.py` — added StartSessionRequest model
- `harness/models/responses.py` — added SessionStartResponse, SessionStatusResponse models
- `harness/services/fluent_loader.py` — full implementation: discover_skills, load_skill_prompt, create_read_db_tool, create_update_db_tool, create_speak_tool
- `harness/services/session_manager.py` — full implementation: SessionManager with agent lifecycle, checkpointing, fluent data loading
