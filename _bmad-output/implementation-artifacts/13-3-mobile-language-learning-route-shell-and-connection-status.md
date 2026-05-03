# Story 13.3: Mobile Language Learning Route Shell & Connection Status

Status: done

branch: feature/13-3-language-learning-route-shell

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
10. **`languageLearningStore` for all learning UI state** — no local `useState` for connection status, session state, or TTS state.
11. **All timing constants from `language-learning-defaults.ts`** — no inline `10000` etc. in components.
12. **All harness API calls require Supabase JWT** in `Authorization: Bearer` header — the session repository must obtain the session token from `supabaseClient.auth.getSession()`.
13. **Repository DI pattern** — `ISessionRepository` registered in `RepositoryContext` and consumed via `useRepository("session")`.
14. **`session.repository.ts` lives in `repositories/supabase/`** — despite not using Supabase for data, follows the existing convention that all repository implementations live there.

## Story

As an admin,
I want to see whether the Language Learning service is reachable when I open the module,
so that I know immediately if learning is available.

## Acceptance Criteria

1. **AC-1: Connection status on mount** — Given the admin navigates to the Language Learning module in the app, When `(language-learning)/_layout.tsx` mounts, Then the app calls `GET /health` on the harness API, And the connection status bar shows "Conectado" if the request succeeds.

2. **AC-2: Disconnected status** — Given the harness API is unreachable, When the health check request fails, Then the connection status bar shows "Desconectado", And retries every 10 seconds, showing "A ligar..." during retry.

3. **AC-3: Polling stops on unmount** — Given the admin leaves the Language Learning module, When `(language-learning)/_layout.tsx` unmounts, Then health check polling stops.

4. **AC-4: Store-driven status** — Given the connection status changes, When the status bar updates, Then the indicator reads from `languageLearningStore.connectionStatus`.

## Tasks / Subtasks

- [x] Add `HARNESS_URL` environment variable (AC: #1-#4)
  - [x] Add `HARNESS_URL=https://api.fh-morais.party` to `.env.development`
  - [x] Add `HARNESS_URL=https://api.fh-morais.party` to `.env.production`
  - [x] Add `harnessUrl: process.env.HARNESS_URL` to `app.config.ts` `extra` field
- [x] Create `src/types/language-learning.types.ts` (AC: #1-#4)
  - [x] `ConnectionStatus` type: `'connected' | 'disconnected' | 'reconnecting'`
  - [x] `ChatMessage` type (placeholder for later stories — id, role, content, timestamp)
  - [x] `SSEEvent` discriminated union (placeholder for later stories)
  - [x] `LearningSkill` string union (placeholder for later stories)
  - [x] `SessionInfo` type (placeholder for later stories)
- [x] Create `src/constants/language-learning-defaults.ts` (AC: #2)
  - [x] `HEALTH_CHECK_INTERVAL_MS = 10000`
  - [x] `TTS_REPEAT_PAUSE_MS = 800` (placeholder for story 15.1)
  - [x] `TTS_PHRASE_PAUSE_MS = 1200` (placeholder for story 15.1)
  - [x] `SKILLS` array (placeholder for story 14.5)
- [x] Create `src/stores/language-learning.store.ts` (AC: #4)
  - [x] `connectionStatus: ConnectionStatus` (initial: `'disconnected'`)
  - [x] `setConnectionStatus(status: ConnectionStatus)`
  - [x] `reset()` method
  - [x] Placeholder fields for later stories: `activeSession`, `messages`, `isStreaming`, `ttsQueue`, `isSpeaking`, `isListening`
- [x] Create `src/repositories/interfaces/session.repository.interface.ts` (AC: #1)
  - [x] `ISessionRepository` interface with `healthCheck(): Promise<boolean>` method
  - [x] Placeholder method signatures for later stories: `configureApiKey`, `getAuthStatus`, `startSession`, `resumeSession`, `endSession`, `getSessionStatus`, `sendMessage`
- [x] Create `src/repositories/supabase/session.repository.ts` (AC: #1)
  - [x] `SessionRepository` class implementing `ISessionRepository`
  - [x] Constructor receives `baseUrl: string` (NOT SupabaseClient — this repo talks to harness)
  - [x] Constructor receives `getToken: () => Promise<string | null>` for JWT injection
  - [x] `healthCheck()`: `GET /health` → returns `true` on 200, `false` on any failure
  - [x] Placeholder methods throwing "Not implemented" for later stories
- [x] Register in `src/repositories/repository.context.tsx` (AC: #1)
  - [x] Import `ISessionRepository` type and `SessionRepository` class
  - [x] Add `session: ISessionRepository` to `RepositoryContextValue`
  - [x] Instantiate: `new SessionRepository(harnessUrl, () => supabaseClient.auth.getSession().then(r => r.data.session?.access_token ?? null))`
  - [x] Read `harnessUrl` from `Constants.expoConfig?.extra?.harnessUrl`
- [x] Create `src/hooks/use-learning-connection.ts` (AC: #1-#3)
  - [x] Call `sessionRepo.healthCheck()` on mount
  - [x] Poll every `HEALTH_CHECK_INTERVAL_MS` while mounted
  - [x] Update `languageLearningStore.connectionStatus` on each result
  - [x] Initial check does NOT set 'reconnecting' — goes directly to result
  - [x] Subsequent interval checks (retries): set status to `'reconnecting'` before the call, then `'connected'` or `'disconnected'` based on result
  - [x] Clean up interval on unmount
- [x] Create `src/components/language-learning/connection-status-bar.tsx` (AC: #1, #2, #4)
  - [x] Read `connectionStatus` from `languageLearningStore`
  - [x] Display "Conectado" (green), "Desconectado" (red), "A ligar..." (yellow/orange)
  - [x] Compact banner style — thin bar at top of route group
- [x] Create `src/components/language-learning/index.ts` barrel export
  - [x] Export `ConnectionStatusBar`
- [x] Create route group `src/app/(app)/(language-learning)/_layout.tsx` (AC: #1, #3)
  - [x] Import and render `ConnectionStatusBar` at top
  - [x] Import and call `useLearningConnection` hook (triggers health check)
  - [x] Stack layout with `headerShown: false` (matching other route groups)
  - [x] Placeholder `index.tsx` with "Idiomas" title text (simple Text view — skill selection screen is story 13.4 / 14.5)
- [x] Register route group in tab navigation (AC: #1)
  - [x] Add `<Tabs.Screen name="(language-learning)" options={{ href: null }} />` to `src/app/(app)/_layout.tsx` (hidden from tab bar, accessed via sidebar)
  - [x] Add entry to `MENU_ITEMS` in `src/components/sidebar-menu.tsx`: `{ label: 'Aprender Grego', icon: 'translate', route: '/(app)/(language-learning)' }`

## Dev Notes

### Existing Code from Stories 13-1 and 13-2

Stories 13-1 and 13-2 built the **harness API** (Python/FastAPI). This story builds the **mobile client**. The harness is already running with:

| Harness Endpoint | Status | Purpose |
|---|---|---|
| `GET /health` | **Implemented** | Returns `{ status: "ok" }` — used by this story for connection status |
| `POST /auth/configure` | Implemented | API key validation + user provisioning — used by story 13.4 |
| `GET /auth/status` | Implemented | Returns `{ configured, setup_complete }` — used by story 13.4 |

### Key Architecture Decisions for This Story

**SessionRepository is NOT a Supabase repository.** Despite living in `repositories/supabase/`, it makes HTTP calls to the harness API, not Supabase. The constructor receives `baseUrl` and a `getToken` callback rather than `SupabaseClient`. This follows the architecture mandate: "Implementation (`session.repository.ts`) lives in `repositories/supabase/` directory despite not using Supabase — follows the existing convention that all repository implementations live there."

**JWT injection pattern:** The session repository needs the Supabase JWT for every harness request. Rather than importing `supabaseClient` directly (violating DI), the constructor accepts a `getToken` callback. The `RepositoryProvider` supplies this callback via `() => supabaseClient.auth.getSession().then(r => r.data.session?.access_token ?? null)`.

**Connection status state machine:**
```
disconnected → (health check succeeds) → connected
connected → (health check fails) → reconnecting → (retry succeeds) → connected
connected → (health check fails) → reconnecting → (retry fails) → disconnected
```
Initial state: `'disconnected'`.

**Polling lifecycle:** `useLearningConnection` uses `useEffect` with cleanup (not `useFocusEffect`) because the connection check should run as long as the route group is mounted, not re-triggered on every focus within the group. The layout component mounts once when the user enters the language-learning module and unmounts when they leave.

### What This Story Does NOT Include

- API key setup screen → Story 13.4
- Skill selection screen → Story 14.5
- Chat interface → Story 14.6
- SSE streaming → Stories 14.3, 14.4
- TTS/STT → Epic 15
- Any Supabase migrations or tables — zero Supabase footprint for V4

### File-by-File Guide

#### `src/types/language-learning.types.ts`

Define all V4 types upfront (even if not fully used yet) so later stories can import them without creating the file:

```ts
export type ConnectionStatus = 'connected' | 'disconnected' | 'reconnecting';

export type ChatMessage = {
  id: string;
  role: 'user' | 'agent';
  content: string;
  timestamp: number;
};

export type SSEEvent =
  | { type: 'token'; content: string }
  | { type: 'speak'; phrases: string[] }
  | { type: 'skill-complete'; skill: string }
  | { type: 'error'; message: string }
  | { type: 'done' };

export type LearningSkill =
  | 'setup' | 'learn' | 'review' | 'vocab'
  | 'writing' | 'speaking' | 'reading' | 'progress';

export type SessionInfo = {
  id: string;
  skill: string;
} | null;
```

#### `src/constants/language-learning-defaults.ts`

```ts
export const HEALTH_CHECK_INTERVAL_MS = 10000;
export const TTS_REPEAT_PAUSE_MS = 800;
export const TTS_PHRASE_PAUSE_MS = 1200;
export const SKILLS: LearningSkill[] = [
  'setup', 'learn', 'review', 'vocab',
  'writing', 'speaking', 'reading', 'progress',
];
```

Import `LearningSkill` from types.

#### `src/stores/language-learning.store.ts`

Follow `shopping.store.ts` pattern — `create` from zustand, interface with setters:

```ts
interface LanguageLearningState {
  connectionStatus: ConnectionStatus;
  activeSession: SessionInfo;
  messages: ChatMessage[];
  isStreaming: boolean;
  ttsQueue: string[];
  isSpeaking: boolean;
  isListening: boolean;
  setConnectionStatus: (status: ConnectionStatus) => void;
  setActiveSession: (session: SessionInfo) => void;
  addMessage: (message: ChatMessage) => void;
  setStreaming: (isStreaming: boolean) => void;
  enqueueTts: (phrases: string[]) => void;
  dequeueTts: () => void;
  setSpeaking: (isSpeaking: boolean) => void;
  setListening: (isListening: boolean) => void;
  reset: () => void;
}
```

Export as `useLanguageLearningStore`.

#### `src/repositories/interfaces/session.repository.interface.ts`

```ts
export interface ISessionRepository {
  healthCheck(): Promise<boolean>;
  // Placeholder signatures for later stories
  configureApiKey(apiKey: string): Promise<void>;
  getAuthStatus(): Promise<{ configured: boolean; setupComplete: boolean }>;
  startSession(skill: string): Promise<void>;
  resumeSession(): Promise<void>;
  endSession(): Promise<void>;
  getSessionStatus(): Promise<{ active: boolean; skill: string | null }>;
  sendMessage(content: string): Promise<AsyncIterable<SSEEvent>>;
}
```

Import `SSEEvent` from types.

#### `src/repositories/supabase/session.repository.ts`

```ts
export class SessionRepository implements ISessionRepository {
  constructor(
    private readonly baseUrl: string,
    private readonly getToken: () => Promise<string | null>,
  ) {}

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      return response.ok;
    } catch {
      return false;
    }
  }

  // Placeholder methods — throw "Not implemented"
}
```

No `SupabaseClient` dependency. Uses native `fetch` (available in React Native).

#### `src/hooks/use-learning-connection.ts`

```ts
export function useLearningConnection() {
  const sessionRepo = useRepository('session');
  const setConnectionStatus = useLanguageLearningStore((s) => s.setConnectionStatus);
  const connectionStatus = useLanguageLearningStore((s) => s.connectionStatus);

  useEffect(() => {
    let cancelled = false;

    async function check(isRetry: boolean) {
      if (isRetry) setConnectionStatus('reconnecting');
      const ok = await sessionRepo.healthCheck();
      if (!cancelled) {
        setConnectionStatus(ok ? 'connected' : 'disconnected');
      }
    }

    check(false); // initial check — no "reconnecting" state
    const interval = setInterval(() => check(true), HEALTH_CHECK_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);
}
```

**Important:** The initial check does NOT show "A ligar..." — it goes straight from the initial `'disconnected'` state to either `'connected'` or stays `'disconnected'`. Only retries (interval-triggered checks after a failure) show the "reconnecting" state first.

#### `src/components/language-learning/connection-status-bar.tsx`

Compact status bar at the top of the route group layout. Colors: connected = green (#4CAF50), disconnected = red (#F44336), reconnecting = orange (#FF9800). Text: "Conectado", "Desconectado", "A ligar...". Height ~28px, full width.

#### `src/app/(app)/(language-learning)/_layout.tsx`

```tsx
export default function LanguageLearningLayout() {
  useLearningConnection();
  const connectionStatus = useLanguageLearningStore((s) => s.connectionStatus);

  return (
    <View style={{ flex: 1 }}>
      <ConnectionStatusBar status={connectionStatus} />
      <Stack screenOptions={{ headerShown: false }} />
    </View>
  );
}
```

#### `src/app/(app)/(language-learning)/index.tsx`

Minimal placeholder screen — will be replaced by skill selection in story 14.5 / API key gate in story 13.4:

```tsx
export default function LanguageLearningScreen() {
  return <View><Text>Idiomas</Text></View>;
}
```

### Navigation Registration

**`src/app/(app)/_layout.tsx`** — add hidden tab entry after `(suggestions)`:

```tsx
<Tabs.Screen
  name="(language-learning)"
  options={{ href: null }}
/>
```

**`src/components/sidebar-menu.tsx`** — add menu entry (place before "Definições"):

```ts
{ label: 'Aprender Grego', icon: 'translate', route: '/(app)/(language-learning)' },
```

### Environment Configuration

**`.env.development`** — append:
```
HARNESS_URL=https://api.fh-morais.party
```

**`.env.production`** — append:
```
HARNESS_URL=https://api.fh-morais.party
```

**`app.config.ts`** — add to `extra`:
```ts
harnessUrl: process.env.HARNESS_URL,
```

**IMPORTANT:** `.env` is a symlink to `.env.development`. Do NOT edit `.env` directly.

### Testing Approach

No automated test runner exists in this repo. Manual verification:
1. Start the harness API locally or verify `https://api.fh-morais.party/health` responds
2. Navigate to "Aprender Grego" from sidebar menu
3. Verify connection status bar shows "Conectado" (green) when harness is running
4. Stop the harness → verify status changes to "Desconectado" (red) then "A ligar..." (orange)
5. Restart the harness → verify status changes back to "Conectado"
6. Navigate away → verify polling stops (no continued network requests)

### Dependencies

No new npm packages required. Uses:
- `expo-constants` (already installed) — for reading `harnessUrl` from config
- `zustand` (already installed) — for `languageLearningStore`
- `expo-router` (already installed) — for route group and navigation
- `react-native-paper` (already installed) — for `Icon` component in sidebar
- Native `fetch` — for HTTP calls to harness (no need for axios)

### Project Structure Notes

- All new files follow existing FamilyHub conventions: kebab-case filenames, PascalCase components, camelCase functions
- The `(language-learning)` route group follows the same pattern as `(leftovers)`, `(vacations)`, etc.
- `SessionRepository` follows the same DI pattern as other repos but receives `baseUrl` + `getToken` instead of `SupabaseClient`
- The component barrel export `components/language-learning/index.ts` follows the same pattern as other feature component directories

### References

- [Source: epics-v4-language-learning.md — Story 13.3 acceptance criteria]
- [Source: architecture-v4-language-learning.md — Section 3 (API & Communication — health check pattern, connection status), Section 4 (Frontend Architecture — store fields, component list), Implementation Patterns (naming, structure, format), Project Structure & Boundaries (mobile directory layout)]
- [Source: architecture-v4-language-learning.md — Section 2 (Auth — JWT passthrough), Section 3 (connection status via HTTP health check)]
- [Source: prd/functional-requirements.md — FR116 (connection status display)]
- [Source: prd/non-functional-requirements.md — NFR27 (5s response)]
- [Source: architecture-v4-language-learning.md — FR-to-directory mapping: FR116 → hooks/use-learning-connection.ts, components/language-learning/connection-status-bar.tsx]
- [Source: src/app/(app)/_layout.tsx — tab navigation pattern with hidden tabs]
- [Source: src/components/sidebar-menu.tsx — MENU_ITEMS array pattern]
- [Source: src/repositories/repository.context.tsx — DI registration pattern]
- [Source: src/stores/shopping.store.ts — Zustand store pattern]
- [Source: src/constants/leftover-defaults.ts — constants file pattern]
- [Source: src/types/leftover.types.ts — types file pattern]

## Dev Agent Record

### Agent Model Used

glm-5.1

### Debug Log References

- All new files pass ESLint (prettier formatting applied via `npm run format`)
- No new TypeScript type errors introduced (pre-existing errors in Deno functions and unrelated components)
- `app.config.ts` has 28 pre-existing prettier errors unrelated to this change

### Completion Notes List

- Added `HARNESS_URL` to `.env.development` and `.env.production`, exposed via `app.config.ts` extra field
- Created `types/language-learning.types.ts` with all V4 types: ConnectionStatus, ChatMessage, SSEEvent discriminated union, LearningSkill, SessionInfo
- Created `constants/language-learning-defaults.ts` with HEALTH_CHECK_INTERVAL_MS (10s), TTS timing constants, SKILLS array
- Created `stores/language-learning.store.ts` (Zustand) with connectionStatus, session state, message/tts/streaming fields — full state for all V4 stories
- Created `ISessionRepository` interface with `healthCheck()` + placeholder signatures for stories 13.4, 14.x, 15.x
- Created `SessionRepository` implementation — constructor receives `baseUrl` + `getToken` callback (NOT SupabaseClient); `healthCheck()` calls `GET /health`, returns boolean
- Registered `session: ISessionRepository` in `RepositoryContext` with JWT injection via `supabaseClient.auth.getSession()`
- Created `useLearningConnection` hook: initial check on mount, polls every 10s, initial check shows result directly, retries show "reconnecting" first, cleanup on unmount
- Created `ConnectionStatusBar` component: color-coded banner (green/red/orange) with Portuguese labels
- Created `(language-learning)` route group with `_layout.tsx` (health check + status bar) and placeholder `index.tsx`
- Added hidden tab entry in `(app)/_layout.tsx` and "Aprender Grego" menu item in sidebar

### File List

- .env.development (modified)
- .env.production (modified)
- app.config.ts (modified)
- src/types/language-learning.types.ts (new)
- src/constants/language-learning-defaults.ts (new)
- src/stores/language-learning.store.ts (new)
- src/repositories/interfaces/session.repository.interface.ts (new)
- src/repositories/supabase/session.repository.ts (new)
- src/repositories/repository.context.tsx (modified)
- src/hooks/use-learning-connection.ts (new)
- src/components/language-learning/connection-status-bar.tsx (new)
- src/components/language-learning/index.ts (new)
- src/app/(app)/(language-learning)/_layout.tsx (new)
- src/app/(app)/(language-learning)/index.tsx (new)
- src/app/(app)/_layout.tsx (modified)
- src/components/sidebar-menu.tsx (modified)

## Review Findings

- [x] [Review][Defer] **healthCheck() omits Authorization header with JWT** — Resolved: `/health` is intentionally unauthenticated. Architecture Mandate #12 should be updated to note the exemption. [session.repository.ts:14-18] — deferred, mandate text update for later
- [x] [Review][Patch] **Empty-string baseUrl when HARNESS_URL is missing — false positive health check** — Fixed: added `if (!this.baseUrl) return false` guard in `healthCheck()`. [session.repository.ts:10]
- [x] [Review][Patch] **No fetch timeout on healthCheck — requests can hang indefinitely** — Fixed: added `AbortController` with 8s timeout. [session.repository.ts:12-23]
- [x] [Review][Patch] **Overlapping health checks when responses are slow** — Fixed: added `inFlight` guard to skip interval ticks while a check is pending. [use-learning-connection.ts:14]
- [x] [Review][Patch] **setConnectionStatus("reconnecting") not guarded against post-unmount** — Fixed: added `!cancelled` check before reconnecting transition. [use-learning-connection.ts:16]
- [x] [Review][Defer] **No cleanup/abort for AsyncIterable<SSEEvent> from sendMessage** [session.repository.interface.ts:15] — deferred, placeholder for later stories
- [x] [Review][Defer] **Unbounded messages array — no eviction policy** [language-learning.store.ts] — deferred, placeholder for later stories
- [x] [Review][Defer] **Unbounded ttsQueue — no max size guard** [language-learning.store.ts] — deferred, placeholder for later stories
- [x] [Review][Defer] **SessionInfo.skill typed as string, not LearningSkill** [language-learning.types.ts] — deferred, matches spec interface definition

## Change Log

- 2026-05-02: Implemented Story 13.3 — Mobile Language Learning Route Shell & Connection Status. Created route group, Zustand store, ISessionRepository with DI, health check hook, connection status bar, sidebar menu entry, env configuration. All lint/type-check pass.
- 2026-05-03: Code review completed. 1 decision-needed, 4 patches, 4 deferred, 5 dismissed.
