---
stepsCompleted: [1, 2, 3, 4]
inputDocuments: ['_bmad-output/planning-artifacts/prd.md', '_bmad-output/planning-artifacts/architecture.md']
scope: 'V4 Language Learning'
---

# FamilyHub V4 Language Learning - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for FamilyHub V4 Language Learning, decomposing the V4 requirements (FR100-FR115, NFR27-NFR30) into implementable stories. Continues from Epic 12 (V3 Meal Plan Dashboard Widget). Next epic number: 13.

## Requirements Inventory

### Functional Requirements

**Session Service**
FR100: App can start a new learning session on the Pi by calling the session service with a userId and skill parameter — the service creates a tmux session under the user's Linux account, launches Claude Code with the specified skill, and returns success
FR101: App can resume an existing tmux session for a user by calling the session service — the service reattaches to the tmux session and returns success
FR102: App can end an active session by calling the session service — the service terminates the tmux session and returns success
FR103: App can query session status for a user — the service returns whether a tmux session exists and which skill is running

**WebSocket & TTS**
FR104: App connects to the Pi's WebSocket server with a userId parameter and receives only messages routed to that user — zero cross-talk between users
FR105: When the app receives Greek text via WebSocket, it speaks each phrase aloud twice via TTS (el-GR) with a pause between repetitions; multiple phrases received in a single message are spoken in sequence
FR106: App displays received Greek text on screen alongside TTS playback so the user can read while listening

**Voice Input**
FR107: App provides a mic button that captures spoken Greek via Android's built-in speech-to-text (el-GR locale), transcribes it, and sends the transcript to the terminal session as text input — no enter key required
FR108: Claude receives voice-originated text input identically to keyboard-originated text input — the input method is invisible to Claude

**Skill System**
FR109: App presents a skill selection screen with available learning skills: Learn (default), Review, Vocab, Writing, Speaking, Reading, Progress — each starts a new session with the corresponding skill parameter
FR110: Only one session per user is active at any time — selecting a different skill kills the existing session and starts a fresh one; resume is only offered within the same skill

**Onboarding**
FR111: On first launch, the app checks Supabase for a setup-complete flag for the user; if absent, the app auto-starts a session with the `/setup` skill — no other skills are available until setup completes
FR112: For users who have not authenticated Claude on the Pi, the app triggers `claude login` via the session service, captures the OAuth URL, and opens it in an in-app WebView — the user sees a standard login screen with no terminal or SSH visible; one-time setup per user

**Learning Profiles**
FR113: Each admin's learning profile (goals, preferred input method, level) is stored per-user and determines the app's input mode — keyboard+mic for read/write/speak learners, mic-only for speak-only learners

**Connection & Signals**
FR114: App displays connection status to the Pi — connected, disconnected, or reconnecting — so the user knows immediately if the Pi is unreachable
FR115: When Claude sends a skill-complete signal via WebSocket, the app automatically calls the session end endpoint and returns the user to the skill selection screen

### NonFunctional Requirements

NFR27: Session service endpoints (start/resume/end/status) must respond within 5 seconds — session start includes tmux creation and Claude launch
NFR28: Greek text received via WebSocket must begin TTS playback within 500ms of message arrival on the phone
NFR29: Android STT transcription must complete and send the transcript to the terminal within 2 seconds of the user finishing speech
NFR30: TTS double-speak must play each phrase twice with a 0.8-second pause between repetitions and a 1.2-second pause between distinct phrases, matching the Pi-side speak-greek.sh timing

### Additional Requirements

- `learning_profiles` Supabase table + RLS + migration (family_id, user_account_id, setup_complete, claude_authenticated, goals, preferred_input_method, level)
- `ISessionRepository` interface + implementation wrapping Pi HTTP REST (start/resume/end/status/auth)
- `ILearningProfileRepository` interface + implementation for Supabase learning_profiles CRUD
- `WebSocketService` class + React Context provider in src/services/ (long-lived connection, not repository pattern)
- Zustand store: languageLearningStore (connectionStatus, activeSession, ttsQueue, terminalOutput, isSpeaking, isListening)
- Expo Router screens under src/app/(app)/(language-learning)/
- New packages: expo-speech, expo-speech-recognition, react-native-webview
- Environment config: PI_SESSION_URL, PI_WEBSOCKET_URL in .env files + app.config.ts
- Types: LearningProfile, PiWebSocketMessage (discriminated union), LearningSkill, SessionStatus
- Constants: language-learning-defaults.ts (TTS_REPEAT_PAUSE=800, TTS_PHRASE_PAUSE=1200, SKILLS list)
- Pi-side code is a separate repository — this epic covers only phone-side implementation
- RECORD_AUDIO permission required for STT — request on first mic tap, not at app launch

### UX Design Requirements

No UX design specification available for V4. Stories will reference existing app patterns and Material Design 3 conventions.

### FR Coverage Map

| FR | Epic | Description |
|---|---|---|
| FR100 | 13 | Start learning session on Pi |
| FR101 | 13 | Resume existing tmux session |
| FR102 | 13 | End active session |
| FR103 | 13 | Query session status |
| FR104 | 13 | WebSocket connection with userId routing |
| FR105 | 15 | TTS double-speak playback (el-GR) |
| FR106 | 15 | Display Greek text alongside TTS |
| FR107 | 16 | Mic button + STT capture (el-GR) |
| FR108 | 16 | Transparent input method (Claude unaware) |
| FR109 | 14 | Skill selection screen |
| FR110 | 14 | One session at a time, skill switching kills existing |
| FR111 | 14 | Setup gate on first launch |
| FR112 | 14 | Claude OAuth via in-app WebView |
| FR113 | 14 | Learning profile storage and input mode |
| FR114 | 13 | Pi connection status display |
| FR115 | 15 | Skill-complete signal handling |

## Epic List

### Epic 13: Language Learning — Data Layer & Pi Connection
Admin can open the Language Learning module, see whether the Pi is reachable, and manage learning sessions (start, resume, end, check status) through the session service.
**FRs covered:** FR100, FR101, FR102, FR103, FR104, FR114

### Epic 14: Language Learning — Onboarding & Skill Selection
Admin can authenticate Claude on the Pi, complete their learning profile setup on first launch, and choose which skill to practice from a selection screen.
**FRs covered:** FR109, FR110, FR111, FR112, FR113

### Epic 15: Language Learning — TTS Playback & Terminal Display
During a session, Greek text arrives via WebSocket, is displayed on screen, and spoken aloud twice per phrase. Skill-complete signals return the user to the skill menu.
**FRs covered:** FR105, FR106, FR115

### Epic 16: Language Learning — Voice Input
Admin can speak Greek into the phone's mic as an alternative to typing — the transcript is sent to the terminal as text input, invisible to Claude.
**FRs covered:** FR107, FR108

---

## Epic 13: Language Learning — Data Layer & Pi Connection

Admin can open the Language Learning module, see whether the Pi is reachable, and manage learning sessions (start, resume, end, check status) through the session service.

### Story 13.1: Language Learning Foundation — Migration, Repositories, Store & Route Shell

As an admin,
I want the Language Learning module's data layer and route to exist,
So that future stories can build session management, WebSocket, and UI on top of a working foundation.

**Acceptance Criteria:**

**Given** the app starts
**When** navigating to Language Learning
**Then** the `(language-learning)` route group loads with a placeholder screen

**Given** the Supabase schema
**When** the migration runs
**Then** `learning_profiles` table exists with all columns (`id`, `family_id`, `user_account_id`, `setup_complete`, `claude_authenticated`, `goals`, `preferred_input_method`, `level`, `created_at`, `updated_at`), constraints (`UNIQUE(user_account_id)`, `CHECK(preferred_input_method IN ('keyboard_and_mic', 'mic_only'))`), and RLS policy (admins read/write own profile within family)

**Given** the codebase
**When** I inspect repositories
**Then** `ISessionRepository` (Pi HTTP: start/resume/end/status/auth) and `ILearningProfileRepository` (Supabase CRUD) interfaces + implementations exist and are registered in `RepositoryContext`

**Given** the codebase
**When** I inspect types
**Then** `LearningProfile`, `PiWebSocketMessage` (discriminated union with `speak`, `signal`, `terminal`), `LearningSkill`, and `SessionStatus` types exist in `language-learning.types.ts`

**Given** the codebase
**When** I inspect stores
**Then** `languageLearningStore` exists with `connectionStatus`, `activeSession`, `ttsQueue`, `terminalOutput`, `isSpeaking`, `isListening`

**Given** the codebase
**When** I inspect constants
**Then** `language-learning-defaults.ts` exists with `TTS_REPEAT_PAUSE=800`, `TTS_PHRASE_PAUSE=1200`, and `SKILLS` list

**Given** the env config
**When** I inspect `.env.example`
**Then** `PI_SESSION_URL` and `PI_WEBSOCKET_URL` are documented

**Given** the codebase
**When** I inspect packages
**Then** `expo-speech`, `expo-speech-recognition`, and `react-native-webview` are installed

---

### Story 13.2: WebSocket Service & Connection Status

As an admin,
I want to see whether my phone can reach the Pi,
So that I know immediately if language learning is available before starting a session.

**Acceptance Criteria:**

**Given** the user enters the `(language-learning)` route group
**When** the layout mounts
**Then** `WebSocketService` connects to `PI_WEBSOCKET_URL` with the current user's userId parameter

**Given** the WebSocket connects successfully
**When** the connection is established
**Then** `languageLearningStore.connectionStatus` is set to `'connected'` and the connection status bar shows a green connected indicator

**Given** the Pi is unreachable
**When** the WebSocket fails to connect
**Then** `connectionStatus` is `'disconnected'` and the status bar shows a red disconnected indicator

**Given** the WebSocket disconnects unexpectedly
**When** the connection drops
**Then** `connectionStatus` is `'reconnecting'` and the service retries with exponential backoff (1s, 2s, 4s, max 10s)

**Given** the WebSocket receives a message
**When** the message arrives
**Then** it is parsed as `PiWebSocketMessage` and dispatched via the discriminated union switch pattern (`speak`, `signal`, `terminal`)

**Given** the user leaves the `(language-learning)` route group
**When** the layout unmounts
**Then** the WebSocket connection is closed cleanly

---

### Story 13.3: Session Lifecycle — Start, Resume, End & Status

As an admin,
I want to start, resume, end, and check the status of learning sessions on the Pi,
So that I can control my learning experience from the phone.

**Acceptance Criteria:**

**Given** the Pi is connected
**When** the app calls `ISessionRepository.start(userId, skill)`
**Then** a POST to `/session/start?userId=X&skill=Y` is made and `languageLearningStore.activeSession` is set with the skill name on success (FR100)

**Given** an active tmux session exists for the user
**When** the app calls `ISessionRepository.resume(userId)`
**Then** a POST to `/session/resume?userId=X` reattaches the session (FR101)

**Given** an active session
**When** the app calls `ISessionRepository.end(userId)`
**Then** a POST to `/session/end?userId=X` kills the tmux session and `activeSession` is set to null (FR102)

**Given** any state
**When** the app calls `ISessionRepository.status(userId)`
**Then** a GET to `/session/status?userId=X` returns `{ active: boolean, skill: string }` (FR103)

**Given** a session service call fails or takes >5s
**When** the timeout is exceeded
**Then** an error is shown to the user and `activeSession` is not modified (NFR27)

**Given** the WebSocket reconnects after a disconnection
**When** the connection is restored
**Then** `ISessionRepository.status()` is called automatically to verify whether the session is still active

---

## Epic 14: Language Learning — Onboarding & Skill Selection

Admin can authenticate Claude on the Pi, complete their learning profile setup on first launch, and choose which skill to practice from a selection screen.

### Story 14.1: Claude OAuth Onboarding via WebView

As an admin,
I want to authenticate Claude on the Pi through a familiar login screen on my phone,
So that I never have to SSH into the Pi or touch a terminal to set up my account.

**Acceptance Criteria:**

**Given** the user opens Language Learning and `learning_profiles.claude_authenticated` is `false` (or no profile exists)
**When** the module loads
**Then** the app shows an "Authenticate Claude" screen instead of the skill menu (FR112)

**Given** the onboarding screen
**When** the user taps "Connect your account"
**Then** the app calls `POST /auth/login?userId=X` on the Pi session service and receives an OAuth URL

**Given** an OAuth URL is returned
**When** the URL is received
**Then** a `<WebView>` opens displaying the standard Claude login page — no terminal or SSH is visible to the user

**Given** the user completes OAuth in the WebView
**When** authentication succeeds
**Then** the app updates `learning_profiles.claude_authenticated = true` in Supabase and dismisses the WebView

**Given** the user cancels or closes the WebView
**When** they return to the onboarding screen
**Then** `claude_authenticated` remains `false` and they can retry

**Given** `claude_authenticated` is already `true`
**When** the user opens Language Learning
**Then** the OAuth screen is never shown — the user proceeds directly to setup or skill selection

---

### Story 14.2: First-Launch Setup Gate & Learning Profile

As an admin,
I want the app to guide me through an initial learning profile setup the first time I use Language Learning,
So that Claude knows my goals, level, and preferred input method before lessons begin.

**Acceptance Criteria:**

**Given** the user has `claude_authenticated = true` but `setup_complete = false`
**When** they enter Language Learning
**Then** the app auto-starts a session with `skill=setup` — no other skills are available (FR111)

**Given** the `/setup` session is active
**When** Claude sends terminal output via WebSocket
**Then** the terminal output is displayed on the session screen so the user can interact with the setup flow

**Given** Claude sends a `{ type: 'signal', name: 'setup-complete' }` via WebSocket
**When** the signal is received
**Then** the app calls `ISessionRepository.end(userId)`, updates `learning_profiles.setup_complete = true` in Supabase, and navigates to the skill selection screen

**Given** the setup completes
**When** the learning profile is updated
**Then** `goals`, `preferred_input_method`, and `level` fields are populated in `learning_profiles` from the data Claude collected during setup (FR113)

**Given** `preferred_input_method` is `'mic_only'`
**When** the user enters a future session
**Then** the keyboard input is hidden and only the mic button is shown (FR113)

**Given** `setup_complete = true`
**When** the user opens Language Learning in the future
**Then** the setup flow is never triggered again — the user goes straight to skill selection

---

### Story 14.3: Skill Selection Screen with Resume

As an admin,
I want to choose which learning skill to practice and resume where I left off,
So that I can focus on the aspect of Greek that matters to me right now.

**Acceptance Criteria:**

**Given** `setup_complete = true` and the Pi is connected
**When** the skill selection screen loads
**Then** it displays skill cards for: Learn (default, highlighted), Review, Vocab, Writing, Speaking, Reading, Progress (FR109)

**Given** no active session exists
**When** the user taps a skill card
**Then** the app calls `ISessionRepository.start(userId, skill)` and navigates to the session screen

**Given** an active session exists for the same skill (from `ISessionRepository.status()`)
**When** the skill selection screen loads
**Then** that skill card shows a "Resume" badge (FR110)

**Given** a skill card has a "Resume" badge
**When** the user taps it
**Then** the app offers "Resume" or "New Session" — Resume calls `ISessionRepository.resume(userId)`, New Session calls `end` then `start` (FR101, FR110)

**Given** an active session exists for a different skill
**When** the user taps a new skill
**Then** the existing session is killed via `ISessionRepository.end()` before starting the new one — no confirmation needed (FR110)

**Given** the Pi is disconnected
**When** the skill selection screen loads
**Then** all skill cards are disabled and the connection status bar shows the Pi is unreachable

---

## Epic 15: Language Learning — TTS Playback & Terminal Display

During a session, Greek text arrives via WebSocket, is displayed on screen, and spoken aloud twice per phrase. Skill-complete signals return the user to the skill menu.

### Story 15.1: TTS Queue with Double-Speak Pattern

As an admin,
I want to hear Greek phrases spoken aloud twice each on my phone,
So that I can learn pronunciation through repeated audio exposure.

**Acceptance Criteria:**

**Given** a WebSocket message `{ type: 'speak', phrases: ['Καλημέρα'] }` arrives
**When** the message is processed
**Then** `expo-speech` speaks "Καλημέρα" in el-GR, pauses 0.8s, speaks "Καλημέρα" again (NFR30, FR105)

**Given** a message with multiple phrases `{ type: 'speak', phrases: ['Καλημέρα', 'Με λένε'] }`
**When** processed
**Then** each phrase is double-spoken in sequence: "Καλημέρα" → 0.8s → "Καλημέρα" → 1.2s → "Με λένε" → 0.8s → "Με λένε" (NFR30)

**Given** multiple `speak` messages arrive in quick succession
**When** the TTS queue processes them
**Then** they are played in order — no concurrent speech, no skipped messages

**Given** a `speak` message arrives
**When** TTS begins
**Then** `languageLearningStore.isSpeaking` is set to `true`; when the queue empties, it is set to `false`

**Given** a `speak` message arrives
**When** TTS starts
**Then** playback begins within 500ms of message arrival (NFR28)

**Given** `isSpeaking` is `true`
**When** the `tts-indicator` component renders
**Then** a visual indicator shows that audio is playing

---

### Story 15.2: Terminal Display — Greek Text Alongside Audio

As an admin,
I want to read the Greek text on screen while hearing it spoken,
So that I can associate the written form with the pronunciation.

**Acceptance Criteria:**

**Given** a WebSocket message `{ type: 'terminal', content: '...' }` arrives
**When** the message is processed
**Then** the content is appended to `languageLearningStore.terminalOutput` and displayed in the `terminal-display` component (FR106)

**Given** terminal output accumulates
**When** the display updates
**Then** it auto-scrolls to the bottom to show the latest content

**Given** a `speak` message arrives
**When** the phrases are added to the TTS queue
**Then** the same phrases are displayed in a visually distinct area (e.g., highlighted card or banner) alongside the terminal so the user can read while listening (FR106)

**Given** the session screen is active
**When** the user scrolls the terminal display
**Then** auto-scroll pauses until the user scrolls back to the bottom

**Given** the session ends or the user navigates away
**When** they return to skill selection
**Then** the terminal output is cleared from the store

---

### Story 15.3: Skill-Complete Signal Handling

As an admin,
I want the app to automatically close my session when Claude signals the skill is done,
So that I'm returned to the skill menu without manual intervention.

**Acceptance Criteria:**

**Given** an active session
**When** a `{ type: 'signal', name: 'skill-complete' }` WebSocket message arrives
**Then** the app calls `ISessionRepository.end(userId)` (FR115)

**Given** the session end call succeeds
**When** the session is terminated
**Then** `languageLearningStore.activeSession` is set to null and the app navigates to the skill selection screen (FR115)

**Given** the TTS queue still has phrases playing when skill-complete arrives
**When** the signal is processed
**Then** TTS playback completes the current phrase (not the full queue) before navigating away

**Given** a `{ type: 'signal', name: 'setup-complete' }` arrives
**When** the signal is processed
**Then** it is handled by the onboarding flow (Story 14.2) — not by this skill-complete handler

---

## Epic 16: Language Learning — Voice Input

Admin can speak Greek into the phone's mic as an alternative to typing — the transcript is sent to the terminal as text input, invisible to Claude.

### Story 16.1: Mic Button & Speech-to-Text Capture

As an admin,
I want to tap a mic button and speak Greek instead of typing,
So that I can practice pronunciation and interact hands-free.

**Acceptance Criteria:**

**Given** the session screen is active
**When** the screen renders
**Then** a mic button is visible (positioned for easy thumb access)

**Given** `preferred_input_method` is `'mic_only'` (FR113)
**When** the session screen renders
**Then** the mic button is prominently displayed and no keyboard input is shown

**Given** the user taps the mic button for the first time
**When** the app does not yet have `RECORD_AUDIO` permission
**Then** the Android permission dialog is shown — permission is not requested at app launch or module entry

**Given** `RECORD_AUDIO` is granted
**When** the user taps the mic button
**Then** `expo-speech-recognition` starts listening in el-GR locale and `languageLearningStore.isListening` is set to `true`

**Given** STT is listening
**When** the user finishes speaking
**Then** the transcript is produced within 2 seconds (NFR29), `isListening` is set to `false`, and the mic button returns to its idle state

**Given** STT is active
**When** the user taps the mic button again
**Then** listening stops and any partial transcript is discarded

**Given** `RECORD_AUDIO` is denied
**When** the user taps the mic button
**Then** a message explains that the mic requires permission and offers to open app settings

---

### Story 16.2: Transcript Delivery to Terminal

As an admin,
I want my spoken Greek to arrive in Claude's terminal exactly as if I typed it,
So that Claude evaluates my answer without knowing how I entered it.

**Acceptance Criteria:**

**Given** STT produces a transcript
**When** the transcript is ready
**Then** it is sent to the Pi via WebSocket as a plain text message — no metadata about input method is included (FR108)

**Given** the transcript is sent
**When** Claude receives it
**Then** it is indistinguishable from keyboard-typed text — no enter key, no special formatting (FR107, FR108)

**Given** the TTS queue is currently speaking when the user taps mic
**When** STT starts
**Then** TTS continues playing — mic and speaker work concurrently (the user can speak while audio plays)

**Given** the WebSocket is disconnected when STT produces a transcript
**When** the transcript is ready
**Then** an error toast is shown and the transcript is not silently dropped
