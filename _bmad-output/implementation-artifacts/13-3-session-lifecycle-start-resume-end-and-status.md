# Story 13.3: Session Lifecycle — Start, Resume, End & Status

Status: done

## Story

As an admin,
I want to start, resume, end, and check the status of learning sessions on the Pi,
so that I can control my learning experience from the phone.

## Acceptance Criteria

1. When the Pi is connected, calling `ISessionRepository.start(userId, skill)` sends `POST /session/start?userId=X&skill=Y` and sets `languageLearningStore.activeSession` with the skill name on success (FR100)
2. Calling `ISessionRepository.resume(userId)` sends `POST /session/resume?userId=X` to reattach an existing tmux session (FR101)
3. Calling `ISessionRepository.end(userId)` sends `POST /session/end?userId=X`, kills the tmux session, and sets `activeSession` to `null` (FR102)
4. Calling `ISessionRepository.status(userId)` sends `GET /session/status?userId=X` and returns `{ active: boolean, skill: string }` (FR103)
5. If a session service call fails or takes >5s, an error is shown to the user and `activeSession` is not modified (NFR27)
6. When the WebSocket reconnects after a disconnection, `ISessionRepository.status()` is called automatically to verify whether the session is still active

## Tasks / Subtasks

- [x] Task 1: Create `useSession` hook (AC: #1, #2, #3, #4, #5)
  - [x] Create `src/hooks/use-session.ts`
  - [x] Get `session` repository from `useRepository('session')`
  - [x] Get `userId` from `useAuthStore(s => s.userAccount?.id)`
  - [x] Expose `startSession(skill: LearningSkill)`:
    - Call `session.start(userId, skill)`
    - On success: `store.setActiveSession({ skill })`
    - On error: set `error` state, do NOT modify `activeSession`
  - [x] Expose `resumeSession()`:
    - Call `session.resume(userId)`
    - On error: set `error` state
  - [x] Expose `endSession()`:
    - Call `session.end(userId)`
    - On success: `store.setActiveSession(null)`
    - On error: set `error` state
  - [x] Expose `checkStatus()`:
    - Call `session.status(userId)`
    - On success: update `store.activeSession` based on response (`active=true` → set skill, `active=false` → set null)
    - On error: set `error` state
  - [x] Expose `isLoading: boolean` and `error: string | null` state
  - [x] All methods are no-ops if `userId` is undefined
- [x] Task 2: Auto-check session status on WebSocket reconnect (AC: #6)
  - [x] In `WebSocketProvider` (`src/services/websocket.context.tsx`), detect when `connectionStatus` transitions from `'reconnecting'` to `'connected'`
  - [x] When this transition occurs, call `ISessionRepository.status(userId)` and update `activeSession` accordingly
  - [x] Use the `session` repository from `RepositoryContext` (not from `useRepository` — provider is not a hook consumer pattern)
- [x] Task 3: Error display for session operations (AC: #5)
  - [x] Create `src/components/language-learning/session-error-toast.tsx`
  - [x] Read `error` from `useSession` hook
  - [x] Show a Snackbar (from `react-native-paper`) with the error message in Portuguese
  - [x] Auto-dismiss after 4 seconds
  - [x] Render in `(language-learning)/index.tsx` (placeholder screen, will be replaced by skill selection in Story 14.3)

### Review Findings

- [x] [Review][Decision] Reconnect status check swallows errors silently (AC5) — Fixed: added `sessionError` field to Zustand store, reconnect handler sets it on failure, index.tsx toast reads from both hook error and store sessionError.
- [x] [Review][Patch] `resumeSession` does not update `activeSession` in store — Fixed: calls `session.status()` after successful resume to sync store.
- [x] [Review][Patch] `repos` missing from useEffect dependency array in WebSocketProvider — Fixed: added `repos` to deps.

## Dev Notes

### useSession Hook Design

`src/hooks/use-session.ts` — custom hook that wraps `ISessionRepository` calls with store updates and error handling. Follows the project's hook pattern (`use-repository.ts`, `use-auth-guard.ts`).

```typescript
// Key API shape
function useSession() {
  return {
    startSession: (skill: LearningSkill) => Promise<void>,
    resumeSession: () => Promise<void>,
    endSession: () => Promise<void>,
    checkStatus: () => Promise<void>,
    isLoading: boolean,
    error: string | null,
    clearError: () => void,
  };
}
```

**Error handling pattern:** All repository calls are wrapped in try/catch. Errors are stored in local `useState` — NOT in the Zustand store (the store has no error field for session operations). Error messages must be plain Portuguese strings (architecture enforcement rule).

**Loading state:** Single `isLoading` boolean. Only one session operation can be in-flight at a time (no concurrent start+end).

**The 5-second timeout (NFR27)** is already implemented in `SessionRepository` (`SESSION_TIMEOUT = 5000` with `AbortController`). The hook does NOT need a separate timeout — it relies on the repository's built-in timeout. When the repository throws `RepositoryError`, the hook catches it and sets the error state.

### WebSocket Reconnect → Status Check

When the WebSocket reconnects (status goes from `'reconnecting'` to `'connected'`), the app must verify whether the Pi-side tmux session is still alive. This is because the Pi may have rebooted during the disconnection, killing the tmux session.

**Implementation approach:** In `WebSocketProvider`, track the previous connection status. When `onStatusChange` fires with `'connected'` and the previous status was `'reconnecting'`, call `session.status(userId)`.

The provider needs access to `ISessionRepository`. Since the provider is inside `RepositoryProvider` (which wraps the entire app at root `_layout.tsx`), it can import `RepositoryContext` and use `useContext(RepositoryContext)` to get the session repository. Alternatively, accept the repository as a prop — but using context is cleaner and matches the project pattern.

```typescript
// In WebSocketProvider, add:
const { session } = useContext(RepositoryContext)!;

// Track previous status to detect reconnection
const prevStatusRef = useRef<ConnectionStatus>('disconnected');

// Modified onStatusChange callback:
const handleStatusChange = (status: ConnectionStatus) => {
  const wasReconnecting = prevStatusRef.current === 'reconnecting';
  prevStatusRef.current = status;
  setConnectionStatus(status);
  if (status === 'connected' && wasReconnecting && userId) {
    session.status(userId).then((result) => {
      const store = useLanguageLearningStore.getState();
      if (result.active && result.skill) {
        store.setActiveSession({ skill: result.skill });
      } else {
        store.setActiveSession(null);
      }
    }).catch((err) => {
      logger.warn('ws', 'Failed to check session status after reconnect', err);
    });
  }
};
```

### Session Error Toast

Simple Snackbar from `react-native-paper`. Read error from `useSession()`, display when non-null, auto-dismiss.

```typescript
// src/components/language-learning/session-error-toast.tsx
export function SessionErrorToast({ error, onDismiss }: { error: string | null; onDismiss: () => void }) {
  return (
    <Snackbar visible={!!error} onDismiss={onDismiss} duration={4000}>
      {error}
    </Snackbar>
  );
}
```

### Error Messages (Portuguese)

Map `RepositoryError` messages to user-facing Portuguese strings:
- Session start failed: "Não foi possível iniciar a sessão"
- Session resume failed: "Não foi possível retomar a sessão"
- Session end failed: "Não foi possível terminar a sessão"
- Status check failed: "Não foi possível verificar o estado da sessão"
- Timeout: "O Pi não respondeu a tempo"

### Existing Infrastructure (from Stories 13.1 and 13.2)

**ISessionRepository** (`src/repositories/interfaces/session.repository.interface.ts`):
- `start(userId, skill)`, `resume(userId)`, `end(userId)`, `status(userId)`, `authLogin(userId)`
- Already implemented in `src/repositories/supabase/session.repository.ts` with 5s timeout

**SessionRepository** (`src/repositories/supabase/session.repository.ts`):
- Uses `fetch()` with `AbortController` and `SESSION_TIMEOUT = 5000`
- Throws `RepositoryError` on HTTP errors, timeouts, and network failures
- Base URL from `Constants.expoConfig?.extra?.piSessionUrl`

**languageLearningStore** (`src/stores/language-learning.store.ts`):
- `activeSession: { skill: LearningSkill } | null` + `setActiveSession()`
- `connectionStatus` + `setConnectionStatus()`

**WebSocketProvider** (`src/services/websocket.context.tsx`):
- Manages connection lifecycle, dispatches messages
- Uses `useState` for service instance
- Already imports `useLanguageLearningStore`

**useRepository** hook (`src/hooks/use-repository.ts`):
- `useRepository('session')` returns `ISessionRepository`

Do NOT modify the store or the `SessionRepository` — use them as-is.

### Architecture Compliance

- **Rule 9:** Never call Pi session service directly in screens or hooks — only through `ISessionRepository` (via `useRepository`)
- **NFR27:** 5s timeout is in the repository layer — hook does NOT add its own timeout
- **Portuguese strings:** All user-facing error messages in `pt-PT`
- **Loading/error naming:** `isLoading: boolean`, `error: string | null` (enforcement rule from architecture)

### File Structure

New files:
```
src/hooks/use-session.ts                              ← Session lifecycle hook
src/components/language-learning/session-error-toast.tsx ← Error Snackbar
```

Files to modify:
```
src/services/websocket.context.tsx      ← Add reconnect → status check
src/app/(app)/(language-learning)/index.tsx  ← Add error toast rendering
```

### What This Story Does NOT Include

- No skill selection UI (Story 14.3)
- No onboarding/setup gate (Stories 14.1, 14.2)
- No TTS/STT (Epics 15-16)
- No session screen UI — this story creates the hook and reconnect logic, not the screens

### Previous Story Intelligence (13.2)

- `WebSocketProvider` uses `useState` (not `useRef`) for the service — context value triggers re-renders correctly
- `dispatchMessage` has exhaustive type check (`const _exhaustive: never = msg`)
- Max reconnect attempts = 5, then transitions to `'disconnected'`
- Deferred: unbounded terminal output (Story 15.2 should cap it)
- The provider already imports `useAuthStore` and `useLanguageLearningStore` — adding `RepositoryContext` import is consistent

### References

- [Source: _bmad-output/planning-artifacts/architecture.md — §4 V4 Communication Layer, ISessionRepository]
- [Source: _bmad-output/planning-artifacts/architecture.md — Process Patterns, V4 Session lifecycle]
- [Source: _bmad-output/planning-artifacts/architecture.md — Enforcement Summary, rule 9]
- [Source: _bmad-output/planning-artifacts/epics-v4-language-learning.md — Story 13.3]
- [Source: _bmad-output/planning-artifacts/prd.md — FR100-FR103, NFR27]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

### Completion Notes List

- `useSession` hook wraps all 4 ISessionRepository methods (start/resume/end/status) with Zustand store updates, Portuguese error messages, and isLoading/error state
- WebSocketProvider enhanced with reconnect→status check: tracks previous connection status via useRef, calls session.status() when transitioning from 'reconnecting' to 'connected'
- SessionErrorToast component using react-native-paper Snackbar with 4s auto-dismiss
- index.tsx placeholder screen updated to render error toast
- No test framework configured — tests not authored
- TypeScript compilation clean (zero errors in src/)

### File List

- src/hooks/use-session.ts (new)
- src/components/language-learning/session-error-toast.tsx (new)
- src/services/websocket.context.tsx (modified)
- src/app/(app)/(language-learning)/index.tsx (modified)
