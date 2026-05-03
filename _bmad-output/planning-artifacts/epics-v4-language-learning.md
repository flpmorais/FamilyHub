---
stepsCompleted: [1, 2, 3, 4]
status: 'complete'
completedAt: '2026-05-02'
inputDocuments:
  - '_bmad-output/planning-artifacts/prd/functional-requirements.md'
  - '_bmad-output/planning-artifacts/prd/non-functional-requirements.md'
  - '_bmad-output/planning-artifacts/prd/user-journeys.md'
  - '_bmad-output/planning-artifacts/ux-design-specification.md'
  - '_bmad-output/planning-artifacts/architecture-v4-language-learning.md'
scope: 'V4 Language Learning'
---

# FamilyHub V4 Language Learning - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for FamilyHub V4 Language Learning, decomposing the requirements from the PRD, UX Design, and Architecture into implementable stories.

## Requirements Inventory

### Functional Requirements

- **FR100:** App can start a new learning session by calling the harness API with a userId and skill parameter — the API creates a LangGraph state machine for the specified Fluent skill, loads the user's learner data, and returns a session token (V4)
- **FR101:** App can resume an existing session for a user by calling the harness API — the API rehydrates the LangGraph state from the checkpoint and returns the session token (V4)
- **FR102:** App can end an active session by calling the harness API — the API persists final learner data (Fluent's 6 JSON databases), writes a session result file, and terminates the session (V4)
- **FR103:** App can query session status for a user — the API returns whether an active session exists and which skill is running (V4)
- **FR104:** App sends user messages to the harness API and receives streamed responses — each response contains the agent's reply text and optional structured events (e.g., speak, skill-complete) (V4)
- **FR105:** App displays the learning session as a chat interface — the agent's messages appear as chat bubbles, the user's typed or spoken input appears as user bubbles (V4)
- **FR106:** When the agent's response contains Greek text, the app speaks each phrase aloud twice via TTS (el-GR) with a 0.8-second pause between repetitions and a 1.2-second pause between distinct phrases; multiple phrases in a single response are spoken in sequence (V4)
- **FR107:** App displays Greek text in a visually distinct area alongside TTS playback so the user can read while listening (V4)
- **FR108:** App provides a mic button that captures spoken Greek via Android's built-in speech-to-text (el-GR locale), transcribes it, and sends the transcript as a user message to the harness API — no enter key required (V4)
- **FR109:** The harness receives voice-originated text identically to keyboard-originated text — the input method is invisible to the Fluent skill (V4)
- **FR110:** App presents a skill selection screen with available Fluent learning skills: Setup (one-time onboarding), Learn (default), Review, Vocab, Writing, Speaking, Reading, Progress — each starts a new session with the corresponding skill parameter (V4)
- **FR111:** Only one session per user is active at any time — selecting a different skill ends the existing session and starts a fresh one; resume is only offered within the same skill (V4)
- **FR112:** When a user enters the Language Learning module and their learning profile does not have `api_key_configured` set to true, the app presents an API key setup screen — the user cannot access the skill menu or start a session until the key is configured (V4)
- **FR113:** App provides an input for the user to enter their GLM 5.1 API key; on submission, the app sends the key to the harness API over HTTPS (`POST /auth/configure`), which validates the key by making a test API call, stores the key per-user within the container, and provisions the user's isolated data directory (Fluent's 6 JSON databases + session results) — no SSH or terminal access required (V4)
- **FR114:** Once the API key is validated and the user's data directory is provisioned, the harness API returns success; the app navigates the user to the skill selection screen (V4)
- **FR115:** Each admin has an isolated data directory within the container containing their own Fluent learner data (6 JSON databases), session results, and API key — one user's learning data, session history, and API key are never visible to another user (V4)
- **FR116:** App displays connection status to the harness API — connected, disconnected, or reconnecting — so the user knows immediately if the service is unreachable (V4)
- **FR117:** When the harness sends a skill-complete event in the streamed response, the app automatically calls the session end endpoint and returns the user to the skill selection screen (V4)
- **FR118:** On first use, the app auto-starts a session with the Setup skill — no other skills are available until setup completes and the learner profile is created in Fluent's database (V4)

### NonFunctional Requirements

- **NFR27:** Harness API endpoints (start/resume/end/status) must respond within 5 seconds — session start includes LangGraph state creation and Fluent learner data loading (V4)
- **NFR28:** Greek text in the agent's streamed response must begin TTS playback within 500ms of message arrival on the phone (V4)
- **NFR29:** Android STT transcription must complete and send the transcript to the harness API within 2 seconds of the user finishing speech (V4)
- **NFR30:** TTS double-speak must play each phrase twice with a 0.8-second pause between repetitions and a 1.2-second pause between distinct phrases, matching the Fluent skill speak timing (V4)
- **NFR31:** API keys submitted through the app must be transmitted over HTTPS (Cloudflare Tunnel) — the key never travels over an unencrypted connection (V4)
- **NFR32:** API keys stored in the container must be isolated per-user at the application level — one user's API key must never be accessible by another user's session (V4)
- **NFR33:** The harness agent's first streamed token must arrive within 3 seconds of receiving a user message (V4)

### Additional Requirements

- Harness lives in `harness/` within the FamilyHub repo — Python backend alongside the React Native mobile app
- FastAPI (Python) + uvicorn, single Podman container, port 8000
- Supabase JWT passthrough for auth — harness verifies JWT using SUPABASE_JWT_SECRET
- SSE-only communication (no WebSocket) — 5 event types: token, speak, skill-complete, error, done
- LangGraph + SqliteSaver for session checkpointing (shared checkpoints.db)
- Zero Supabase footprint — no `learning_profiles` table, no migrations
- Fluent data stored as files per user via FLUENT_DATA_DIR — zero changes to Fluent scripts
- 8 harness API endpoints: GET /health, POST /auth/configure, GET /auth/status, POST /session/start, POST /session/resume, POST /session/end, GET /session/status, POST /session/message
- GET /auth/status returns `{ configured: bool, setupComplete: bool }`
- POST /session/resume returns JSON `{ messages: ChatMessage[] }` with history from checkpoint
- Mobile additions: 4 screens, 5 components, 4 hooks, 1 service, 1 store, 1 repository interface
- All user-facing error messages in Portuguese

### UX Design Requirements

- V4 inherits the shared UX design language: Material Design via React Native Paper, one-handed use, Android touch-only
- Chat interface follows UX spec interaction patterns: real-time streaming text, distinct Greek text styling, mic button alongside keyboard input
- Connection status bar follows the existing pattern for contextual status indicators
- Skill selection uses card-based layout consistent with other module selection patterns

### FR Coverage Map

| FR | Epic | Description |
|---|---|---|
| FR100 | Epic 14 | Start new learning session via harness API |
| FR101 | Epic 14 | Resume existing session from LangGraph checkpoint |
| FR102 | Epic 14 | End active session, persist learner data |
| FR103 | Epic 14 | Query session status (active, skill) |
| FR104 | Epic 14 | Send message and receive streamed SSE response |
| FR105 | Epic 15 | Chat interface with agent/user bubbles |
| FR106 | Epic 15 | TTS double-speak for Greek text (0.8s/1.2s timing) |
| FR107 | Epic 15 | Greek text displayed visually distinct |
| FR108 | Epic 15 | Mic button captures Greek speech via STT |
| FR109 | Epic 15 | Voice input invisible to Fluent agent |
| FR110 | Epic 14 | Skill selection screen (8 Fluent skills) |
| FR111 | Epic 14 | One session at a time, skill switching kills existing |
| FR112 | Epic 13 | API key gate on module entry |
| FR113 | Epic 13 | API key validation, per-user provisioning |
| FR114 | Epic 13 | Post-configure navigation to skill menu |
| FR115 | Epic 13 | Per-user data isolation in container |
| FR116 | Epic 13 | Connection status display (connected/disconnected/reconnecting) |
| FR117 | Epic 14 | Skill-complete event auto-ends session |
| FR118 | Epic 14 | First-use auto-starts Setup skill |

**All 19 FRs covered. All 7 NFRs distributed across epics.**

## Epic List

### Epic 13: Service Connection & API Key Setup

Users open the Language Learning module and see the service is connected. On first use, they configure their LLM API key through an in-app setup screen. The harness API is running, authenticated via Supabase JWT, and provisions per-user isolated data directories.

**FRs covered:** FR112, FR113, FR114, FR115, FR116
**NFRs covered:** NFR27, NFR31, NFR32

### Epic 14: Learning Sessions & Skill Selection

Users start learning sessions by selecting from 8 Fluent skills. Sessions stream agent responses via SSE. The first session auto-starts the Setup skill for onboarding. Sessions persist across app closes and can be resumed. Skill-complete events return users to the skill menu.

**FRs covered:** FR100, FR101, FR102, FR103, FR104, FR110, FR111, FR117, FR118
**NFRs covered:** NFR27, NFR33

### Epic 15: Interactive Learning — Voice & Audio

Users hear Greek pronunciation via TTS double-speak with precise timing. Greek text is displayed in a visually distinct style. Users can speak Greek back via the mic button (STT), with the input method invisible to the agent.

**FRs covered:** FR105, FR106, FR107, FR108, FR109
**NFRs covered:** NFR28, NFR29, NFR30

## Epic 13: Service Connection & API Key Setup

Users open the Language Learning module and see the service is connected. On first use, they configure their LLM API key through an in-app setup screen. The harness API is running, authenticated via Supabase JWT, and provisions per-user isolated data directories.

### Story 13.1: Harness API Foundation

As an admin,
I want the Language Learning harness API to be running and accessible,
so that my phone can connect to the learning service.

**Acceptance Criteria:**

**Given** the harness API is deployed in a Podman container
**When** a request is sent to `GET /health`
**Then** the API responds with `{ status: "ok" }` and HTTP 200

**Given** a request to any harness endpoint without an Authorization header
**When** the request is received
**Then** the API responds with HTTP 401 and `{ detail: "Not authenticated" }`

**Given** a request with a valid Supabase JWT in the Authorization header
**When** the request is received
**Then** the API extracts the userId from the JWT `sub` claim and makes it available to the route handler

**Given** a request with an expired or invalid JWT
**When** the request is received
**Then** the API responds with HTTP 401 and `{ detail: "Invalid token" }`

**Repo:** FamilyHub (`harness/`)
**Files:** `main.py`, `config.py`, `dependencies.py`, `routers/health.py`, `Containerfile`, `pyproject.toml`
**Architecture ref:** Section 2 (Auth & Security), Section 5 (Infrastructure)

### Story 13.2: API Key Configuration & User Provisioning

As an admin,
I want to configure my LLM API key through the app so that the harness can run learning sessions on my behalf,
without needing SSH or terminal access to the server.

**Acceptance Criteria:**

**Given** a user with a valid JWT but no configured API key
**When** `POST /auth/configure` is called with `{ api_key: "sk-..." }`
**Then** the harness validates the key by making a test API call to the LLM provider
**And** creates the directory `/data/users/{userId}/` with subdirectories `fluent/` and `results/`
**And** copies Fluent data templates into the `fluent/` directory (6 JSON databases)
**And** writes `/data/users/{userId}/api_key.json` with chmod 600 permissions
**And** returns `{ provisioned: true }` with HTTP 200

**Given** an invalid API key
**When** `POST /auth/configure` is called
**Then** the test API call fails and the harness responds with HTTP 400 and `{ detail: "API key validation failed" }`

**Given** a user with an already configured API key
**When** `GET /auth/status` is called
**Then** the harness returns `{ configured: true, setupComplete: false }` (setup not yet run)

**Given** a user with no configured API key
**When** `GET /auth/status` is called
**Then** the harness returns `{ configured: false, setupComplete: false }`

**Given** a user whose Fluent learner-profile.json exists
**When** `GET /auth/status` is called
**Then** the harness returns `{ configured: true, setupComplete: true }`

**Given** two different users (filipe and angela)
**When** each configures their API key
**Then** each user's data directory is completely isolated — filipe cannot read angela's api_key.json or Fluent data (NFR32)

**Repo:** FamilyHub (`harness/`)
**Files:** `routers/auth.py`, `services/user_provisioner.py`, `models/requests.py`, `models/responses.py`
**FRs:** FR113, FR115
**NFRs:** NFR31, NFR32

### Story 13.3: Mobile Language Learning Route Shell & Connection Status

As an admin,
I want to see whether the Language Learning service is reachable when I open the module,
so that I know immediately if learning is available.

**Acceptance Criteria:**

**Given** the admin navigates to the Language Learning module in the app
**When** the `(language-learning)/_layout.tsx` mounts
**Then** the app calls `GET /health` on the harness API
**And** the connection status bar shows "Connected" if the request succeeds

**Given** the harness API is unreachable
**When** the health check request fails
**Then** the connection status bar shows "Disconnected"
**And** retries every 10 seconds, showing "Reconnecting" during retry

**Given** the admin leaves the Language Learning module
**When** the `(language-learning)/_layout.tsx` unmounts
**Then** health check polling stops

**Given** the connection status changes
**When** the status bar updates
**Then** the indicator uses the `languageLearningStore.connectionStatus` field

**Repo:** FamilyHub mobile
**Files:** `app/(app)/(language-learning)/_layout.tsx`, `hooks/use-learning-connection.ts`, `components/language-learning/connection-status-bar.tsx`, `stores/language-learning.store.ts`, `types/language-learning.types.ts`, `constants/language-learning-defaults.ts`, `repositories/interfaces/session.repository.interface.ts`, `repositories/supabase/session.repository.ts`
**FRs:** FR116

### Story 13.4: Mobile API Key Setup Screen

As an admin,
I want to enter my LLM API key on a setup screen when I first open Language Learning,
so that I can start learning without needing terminal access.

**Acceptance Criteria:**

**Given** the admin navigates to the Language Learning module for the first time
**When** `GET /auth/status` returns `{ configured: false }`
**Then** the app shows the API key setup screen instead of the skill menu (FR112)

**Given** the admin is on the API key setup screen
**When** they enter their API key and tap submit
**Then** the app calls `ISessionRepository.configureApiKey(key)`
**And** shows a loading indicator during validation

**Given** the API key is validated successfully
**When** the harness returns `{ provisioned: true }`
**Then** the app navigates to the skill selection screen (FR114)

**Given** the API key validation fails
**When** the harness returns an error
**Then** the app displays a Portuguese error message (e.g., "A chave API é inválida. Tente novamente.")
**And** stays on the setup screen for retry

**Repo:** FamilyHub mobile
**Files:** `app/(app)/(language-learning)/api-key-setup.tsx`, `app/(app)/(language-learning)/index.tsx` (gate logic)
**FRs:** FR112, FR114

## Epic 14: Learning Sessions & Skill Selection

Users start learning sessions by selecting from 8 Fluent skills. Sessions stream agent responses via SSE. The first session auto-starts the Setup skill for onboarding. Sessions persist across app closes and can be resumed. Skill-complete events return users to the skill menu.

### Story 14.1: LangGraph Agent & Fluent Skill Integration

As an admin,
I want the harness to create a LangGraph agent that runs Fluent learning skills,
so that I can have interactive language learning sessions.

**Acceptance Criteria:**

**Given** a user with a configured API key
**When** the session manager creates a new agent for the "learn" skill
**Then** a LangGraph ReAct agent is initialized with the Fluent Learn SKILL.md as the system prompt
**And** Fluent's Python tools (read-db, update-db) are registered as LangChain tools
**And** the agent uses the user's API key for LLM calls
**And** the user's FLUENT_DATA_DIR is set to `/data/users/{userId}/fluent/`

**Given** the agent is created
**When** the user's Fluent data is loaded
**Then** all 6 JSON databases are accessible to the agent via read-db tools

**Given** a LangGraph agent completes a message turn
**When** the agent produces output
**Then** the output is checkpointed to SqliteSaver (`/data/checkpoints.db`)

**Repo:** FamilyHub (`harness/`)
**Files:** `services/session_manager.py`, `services/fluent_loader.py`
**FRs:** FR100 (agent creation)

### Story 14.2: Session Lifecycle Endpoints

As an admin,
I want the harness to manage session lifecycle (start, resume, end, status),
so that my learning sessions persist and I can resume where I left off.

**Acceptance Criteria:**

**Given** a user with no active session
**When** `POST /session/start` is called with `{ skill: "learn" }`
**Then** the harness creates a LangGraph agent for the specified skill, loads the user's Fluent data, and returns `{ session_id: "...", skill: "learn" }` within 5 seconds (NFR27)

**Given** a user with no active session
**When** `POST /session/start` is called
**Then** the harness responds within 5 seconds (NFR27)

**Given** a user with an active "learn" session
**When** `GET /session/status` is called
**Then** the harness returns `{ active: true, skill: "learn" }`

**Given** a user with no active session
**When** `GET /session/status` is called
**Then** the harness returns `{ active: false, skill: null }`

**Given** a user with an active "learn" session
**When** `POST /session/resume` is called
**Then** the harness rehydrates the LangGraph state from SqliteSaver
**And** returns `{ messages: ChatMessage[] }` with the chat history from the checkpoint (FR101)

**Given** a user with an active session
**When** `POST /session/end` is called
**Then** the harness persists the final Fluent data (6 JSON databases via update-db)
**And** writes a session result file to `/data/users/{userId}/results/`
**And** clears the active session

**Given** a user with an active "learn" session
**When** `POST /session/start` is called with `{ skill: "vocab" }`
**Then** the harness ends the existing "learn" session first (persisting data)
**And** starts a new "vocab" session (FR111 — one session at a time)

**Repo:** FamilyHub (`harness/`)
**Files:** `routers/session.py` (start/resume/end/status), `services/session_manager.py` (lifecycle methods)
**FRs:** FR100, FR101, FR102, FR103, FR111
**NFRs:** NFR27

### Story 14.3: SSE Streaming & Event Emission

As an admin,
I want the agent's responses to stream to my phone in real-time,
so that I see the learning content appear immediately as the agent generates it.

**Acceptance Criteria:**

**Given** a user with an active session
**When** `POST /session/message` is called with `{ content: "Γεια σου" }`
**Then** the harness sends the message to the LangGraph agent
**And** returns an SSE stream

**Given** the agent generates text output
**When** the LLM streams a token
**Then** the harness emits `event: token\ndata: { "content": "..." }\n\n`

**Given** the agent calls its speak tool with Greek phrases
**When** the speak tool output is detected
**Then** the harness emits `event: speak\ndata: { "phrases": ["Καλημέρα", "Με λένε"] }\n\n`

**Given** the agent signals skill completion
**When** the skill-complete condition is met
**Then** the harness emits `event: skill-complete\ndata: { "skill": "learn" }\n\n`

**Given** an error occurs during LLM generation
**When** the error is caught
**Then** the harness emits `event: error\ndata: { "message": "..." }\n\n`

**Given** the agent finishes generating
**When** the stream is complete
**Then** the harness emits `event: done\ndata: {}\n\n` and closes the stream

**Given** a user sends a message
**When** the first SSE token event arrives
**Then** it arrives within 3 seconds of the user's request (NFR33)

**Repo:** FamilyHub (`harness/`)
**Files:** `services/sse_streamer.py`, `routers/session.py` (message endpoint)
**FRs:** FR104, FR117
**NFRs:** NFR33

### Story 14.4: Mobile SSE Client & Session Hooks

As an admin,
I want the mobile app to consume the SSE stream and manage session state,
so that I can interact with the learning agent through the app.

**Acceptance Criteria:**

**Given** the app is on the session screen
**When** the user types a message and taps send
**Then** `ISessionRepository.sendMessage(content)` is called
**And** the returned SSE stream is consumed by `sse-client.ts`
**And** each `token` event appends text to the current agent chat bubble in real-time
**And** each `speak` event enqueues phrases into `languageLearningStore.ttsQueue`
**And** each `skill-complete` event triggers `ISessionRepository.endSession()` and navigates to the skill menu (FR117)

**Given** the SSE stream starts
**When** the first `token` event arrives
**Then** `languageLearningStore.isStreaming` is set to `true`

**Given** the SSE stream ends with a `done` event
**When** the event is processed
**Then** `languageLearningStore.isStreaming` is set to `false`

**Given** an `error` SSE event arrives
**When** the event is processed
**Then** a Portuguese error message is displayed to the user

**Given** the SSE stream connection fails
**When** a network error occurs
**Then** a Portuguese error message is shown and the user can retry

**Repo:** FamilyHub mobile
**Files:** `services/sse-client.ts`, `hooks/use-session.ts`, `stores/language-learning.store.ts` (updated with messages, isStreaming)
**FRs:** FR104, FR117

### Story 14.5: Skill Selection Screen

As an admin,
I want to see all available learning skills and select one to start a session,
so that I can choose what type of practice I want.

**Acceptance Criteria:**

**Given** the admin opens Language Learning and has a configured API key
**When** `GET /auth/status` returns `{ configured: true, setupComplete: true }`
**Then** the app shows the skill selection screen with 8 skill cards: Setup, Learn, Review, Vocab, Writing, Speaking, Reading, Progress (FR110)

**Given** the admin opens Language Learning with a configured API key but setup not complete
**When** `GET /auth/status` returns `{ configured: true, setupComplete: false }`
**Then** the app auto-starts a session with the Setup skill (FR118)
**And** only the Setup skill card is shown (other skills disabled or hidden)

**Given** the admin taps a skill card (e.g., "Learn")
**When** no active session exists for this skill
**Then** `ISessionRepository.startSession("learn")` is called
**And** the app navigates to the session screen

**Given** the admin taps a skill card with an active session in that skill
**When** `GET /session/status` returns `{ active: true, skill: "learn" }`
**Then** the skill card shows a "Resume" badge
**And** tapping it calls `ISessionRepository.resumeSession()`
**And** the chat history from the response populates the store

**Given** the admin taps a different skill card while a session is active
**When** the active skill is "learn" and the admin taps "Vocab"
**Then** the harness ends the existing "learn" session and starts a "vocab" session (FR111)

**Repo:** FamilyHub mobile
**Files:** `app/(app)/(language-learning)/index.tsx`, `components/language-learning/skill-card.tsx`
**FRs:** FR110, FR118

### Story 14.6: Chat Interface

As an admin,
I want to see my learning session as a chat conversation,
so that I can follow along with the agent's teaching.

**Acceptance Criteria:**

**Given** a learning session is active
**When** the session screen loads
**Then** the app displays a scrollable list of chat messages
**And** agent messages appear as bot-aligned chat bubbles
**And** user messages appear as user-aligned chat bubbles

**Given** the agent is generating a response
**When** `token` SSE events arrive
**Then** the current agent bubble updates in real-time with streaming text

**Given** the user types a message and taps send
**When** the message is submitted
**Then** a user bubble appears immediately in the chat
**And** `ISessionRepository.sendMessage(content)` is called
**And** a new agent bubble begins streaming the response

**Given** a session is resumed
**When** the chat screen loads with history
**Then** all previous messages from the resume response are rendered as chat bubbles

**Given** a resumed session has many messages
**When** the chat screen loads
**Then** the view scrolls to the bottom (most recent message)

**Repo:** FamilyHub mobile
**Files:** `app/(app)/(language-learning)/session.tsx`, `components/language-learning/chat-bubble.tsx`, `components/language-learning/chat-input.tsx`
**FRs:** FR105

## Epic 15: Interactive Learning — Voice & Audio

Users hear Greek pronunciation via TTS double-speak with precise timing. Greek text is displayed in a visually distinct style. Users can speak Greek back via the mic button (STT), with the input method invisible to the agent.

### Story 15.1: TTS Double-Speak Queue

As an admin,
I want the app to speak Greek phrases aloud twice so I can hear the correct pronunciation,
with pauses that help me process what I'm hearing.

**Acceptance Criteria:**

**Given** a `speak` SSE event arrives with phrases `["Καλημέρα", "Με λένε"]`
**When** the phrases are enqueued into the TTS queue
**Then** the app speaks "Καλημέρα" via expo-speech (el-GR)
**And** waits 0.8 seconds
**And** speaks "Καλημέρα" again
**And** waits 1.2 seconds
**And** speaks "Με λένε"
**And** waits 0.8 seconds
**And** speaks "Με λένε" again (NFR30)

**Given** a speak event arrives while TTS is already playing
**When** the phrases are enqueued
**Then** they wait in the queue until the current phrase finishes — no concurrent speech

**Given** a speak event arrives
**When** TTS playback begins
**Then** the first sound starts within 500ms of the SSE event arriving on the phone (NFR28)

**Given** TTS is playing
**When** the user views the chat
**Then** a visual indicator shows which phrase is currently being spoken

**Repo:** FamilyHub mobile
**Files:** `hooks/use-tts-queue.ts`, `constants/language-learning-defaults.ts` (TTS_REPEAT_PAUSE=800, TTS_PHRASE_PAUSE=1200)
**FRs:** FR106
**NFRs:** NFR28, NFR30

### Story 15.2: Greek Text Styling

As an admin,
I want Greek text in the chat to look visually distinct from other text,
so that I can easily identify the language content I need to focus on.

**Acceptance Criteria:**

**Given** an agent chat bubble contains Greek text
**When** the bubble is rendered
**Then** the Greek text is displayed with a larger font size and distinct color compared to other text in the bubble

**Given** the agent's response contains both Greek and non-Greek text
**When** the bubble is rendered
**Then** the Greek portion is visually distinct while the non-Greek portion uses standard styling

**Given** TTS is currently speaking a phrase
**When** the phrase corresponds to text in a chat bubble
**Then** the spoken text is highlighted or indicated in the bubble (FR107)

**Repo:** FamilyHub mobile
**Files:** `components/language-learning/chat-bubble.tsx` (updated with Greek detection + styling)
**FRs:** FR107

### Story 15.3: STT Voice Input

As an admin,
I want to tap a mic button and speak Greek so that my speech is transcribed and sent as a message,
without needing to type.

**Acceptance Criteria:**

**Given** the admin is on the session screen
**When** they tap the mic button for the first time
**Then** the app requests the RECORD_AUDIO permission
**And** if granted, starts listening via expo-speech-recognition with el-GR locale

**Given** the admin is recording
**When** they speak Greek and pause
**Then** the STT transcription completes within 2 seconds (NFR29)
**And** the transcript is sent via `ISessionRepository.sendMessage(transcript)` as plain text
**And** the agent receives it identically to a typed message — unaware of input method (FR109)

**Given** the admin is recording
**When** the mic button shows the listening state
**Then** `languageLearningStore.isListening` is `true` and the button shows a visual recording indicator

**Given** STT transcription completes
**When** the transcript is sent
**Then** a user chat bubble appears with the transcript
**And** `languageLearningStore.isListening` is set to `false`

**Given** RECORD_AUDIO permission is denied
**When** the admin taps the mic button
**Then** a Portuguese message explains the permission is needed

**Repo:** FamilyHub mobile
**Files:** `hooks/use-stt.ts`, `components/language-learning/chat-input.tsx` (mic button integration)
**FRs:** FR108, FR109
**NFRs:** NFR29
