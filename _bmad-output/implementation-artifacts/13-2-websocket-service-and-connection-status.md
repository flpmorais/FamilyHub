# Story 13.2: WebSocket Service & Connection Status

Status: done

## Story

As an admin,
I want to see whether my phone can reach the Pi,
so that I know immediately if language learning is available before starting a session.

## Acceptance Criteria

1. When the `(language-learning)` layout mounts, `WebSocketService` connects to `PI_WEBSOCKET_URL` with the current user's `userId` parameter
2. On successful connection, `languageLearningStore.connectionStatus` is set to `'connected'` and a green indicator is shown
3. When the Pi is unreachable, `connectionStatus` is `'disconnected'` and a red indicator is shown
4. On unexpected disconnect, `connectionStatus` is `'reconnecting'` and the service retries with exponential backoff (1s, 2s, 4s, max 10s)
5. Incoming messages are parsed as `PiWebSocketMessage` and dispatched via discriminated union switch (`speak`, `signal`, `terminal`)
6. When the user leaves `(language-learning)`, the WebSocket connection is closed cleanly

## Tasks / Subtasks

- [x] Task 1: Create `WebSocketService` class (AC: #1, #2, #3, #4, #5, #6)
  - [x] Create `src/services/websocket.service.ts`
  - [x] Constructor takes `url: string` and `userId: string`
  - [x] Connect to `ws://{PI_WEBSOCKET_URL}?userId={userId}`
  - [x] Parse incoming messages as JSON → `PiWebSocketMessage` discriminated union
  - [x] Dispatch parsed messages via a callback: `onMessage: (msg: PiWebSocketMessage) => void`
  - [x] Track connection state and call `onStatusChange: (status: ConnectionStatus) => void`
  - [x] Auto-reconnect on unexpected close with exponential backoff (1s, 2s, 4s, max 10s)
  - [x] Expose `connect()`, `close()`, `send(data: string)` methods
  - [x] `close()` must suppress reconnect (set a `disposed` flag)
- [x] Task 2: Create `WebSocketContext` provider (AC: #1, #6)
  - [x] Create `src/services/websocket.context.tsx`
  - [x] Provide `WebSocketService` instance via React Context
  - [x] Expose `useWebSocket()` hook that returns the service instance
  - [x] Context value includes the service and a `send(data: string)` shortcut
- [x] Task 3: Wire provider into `(language-learning)/_layout.tsx` (AC: #1, #6)
  - [x] Wrap `<Stack>` with `<WebSocketProvider>`
  - [x] Get `userId` from `useAuthStore` (`userAccount.id`)
  - [x] Get `piWebsocketUrl` from `Constants.expoConfig?.extra?.piWebsocketUrl`
  - [x] On mount: create `WebSocketService` and connect
  - [x] On unmount: call `close()` to disconnect cleanly
  - [x] Wire `onStatusChange` to `useLanguageLearningStore.setConnectionStatus`
  - [x] Wire `onMessage` to the message dispatcher (Task 4)
- [x] Task 4: Create message dispatcher (AC: #5)
  - [x] In the provider or a dedicated function, implement the switch handler:
    - `speak` → `store.enqueueTts(msg.phrases)`
    - `signal` → (no-op for now — handlers added in Stories 14.2 and 15.3)
    - `terminal` → `store.appendTerminalOutput(msg.content)`
  - [x] Log unknown message types with `logger.warn`
- [x] Task 5: Create `ConnectionStatusBar` component (AC: #2, #3, #4)
  - [x] Create `src/components/language-learning/connection-status-bar.tsx`
  - [x] Read `connectionStatus` from `useLanguageLearningStore`
  - [x] Green dot + "Ligado" when `connected`
  - [x] Red dot + "Desligado" when `disconnected`
  - [x] Orange dot + "A reconectar..." when `reconnecting`
  - [x] Render at top of `_layout.tsx` (above `<Stack>`)
- [x] Task 6: Reset store on unmount (AC: #6)
  - [x] Call `useLanguageLearningStore.getState().reset()` when `_layout.tsx` unmounts

### Review Findings

- [x] [Review][Decision] Pi-unreachable shows "reconnecting" forever, never "disconnected" (AC3) — Fixed: added MAX_RECONNECT_ATTEMPTS=5, transitions to 'disconnected' after exhausting retries.
- [x] [Review][Patch] Context value is `null` permanently — `useWebSocket()` always throws [src/services/websocket.context.tsx] — Fixed: replaced `useRef` with `useState` so context re-renders with service instance.
- [x] [Review][Patch] Missing exhaustive type check in switch [src/services/websocket.context.tsx] — Fixed: added `const _exhaustive: never = msg` in default branch.
- [x] [Review][Defer] Unbounded terminal output accumulation [src/stores/language-learning.store.ts] — deferred, Story 15.2 terminal display should address max-length cap

## Dev Notes

### WebSocketService Class Design

`src/services/websocket.service.ts` — a plain TypeScript class (NOT a React component). It manages the raw WebSocket connection lifecycle. The architecture explicitly says this is NOT a repository (it's a long-lived connection, not request-response), so it lives in `src/services/`, not `src/repositories/`.

```typescript
// Key API shape
class WebSocketService {
  constructor(url: string, userId: string);
  onMessage: ((msg: PiWebSocketMessage) => void) | null;
  onStatusChange: ((status: ConnectionStatus) => void) | null;
  connect(): void;
  close(): void;           // sets disposed=true, suppresses reconnect
  send(data: string): void; // used later by STT (Story 16.2)
}
```

**Reconnect logic:** On `onclose` (if not disposed), wait `delay` ms then reconnect. Delay doubles each attempt: 1000 → 2000 → 4000 → cap at 10000. Reset delay to 1000 on successful `onopen`.

**Connection URL:** `ws://{piWebsocketUrl}?userId={userId}` — the Pi's WebSocket server routes messages by userId (FR104). No TLS — Tailscale encrypts end-to-end.

**Message parsing:** `JSON.parse(event.data)` → cast to `PiWebSocketMessage`. If parse fails, log warning and ignore. The `PiWebSocketMessage` type is already defined in `src/types/language-learning.types.ts` (created in Story 13.1).

### WebSocket Context Provider

`src/services/websocket.context.tsx` — React Context that holds the `WebSocketService` instance. Scoped to the `(language-learning)` layout level per architecture.

```typescript
// Pattern
const WebSocketContext = createContext<WebSocketService | null>(null);

export function WebSocketProvider({ children }: { children: ReactNode }) {
  // Create service in useRef (not useState — avoid re-render on service creation)
  // Connect in useEffect, close on cleanup
}

export function useWebSocket(): WebSocketService {
  const ctx = useContext(WebSocketContext);
  if (!ctx) throw new Error('useWebSocket must be inside <WebSocketProvider>');
  return ctx;
}
```

### _layout.tsx Changes

Current `_layout.tsx` is a simple Stack wrapper. It needs to:
1. Wrap children with `<WebSocketProvider>`
2. Render `<ConnectionStatusBar>` above the Stack
3. Get userId from `useAuthStore(s => s.userAccount?.id)`
4. Get WebSocket URL from `Constants.expoConfig?.extra?.piWebsocketUrl`

```typescript
// Updated _layout.tsx structure
export default function LanguageLearningLayout() {
  return (
    <WebSocketProvider>
      <ConnectionStatusBar />
      <Stack screenOptions={{ headerShown: false }} />
    </WebSocketProvider>
  );
}
```

The `WebSocketProvider` handles all connection/disconnection logic internally.

### ConnectionStatusBar Component

`src/components/language-learning/connection-status-bar.tsx` — simple horizontal bar with a colored dot and status text.

Status labels in Portuguese (user-facing):
- `connected` → green dot, "Ligado"
- `disconnected` → red dot, "Desligado"
- `reconnecting` → orange dot, "A reconectar..."

Use Material Design 3 theme colors from `react-native-paper` where possible. Keep the component minimal — it's a status indicator, not an interactive element.

### Types Already Available (from Story 13.1)

These types exist in `src/types/language-learning.types.ts` — do NOT recreate:
- `PiWebSocketMessage` (discriminated union: `speak`, `signal`, `terminal`)
- `ConnectionStatus` (`'connected' | 'disconnected' | 'reconnecting'`)
- `LearningSkill`

### Store Already Available (from Story 13.1)

`src/stores/language-learning.store.ts` already has all required fields and actions:
- `connectionStatus` + `setConnectionStatus()`
- `enqueueTts()`, `appendTerminalOutput()`
- `reset()`

Do NOT modify the store — use it as-is.

### Enforcement Rules (from Architecture)

- **Rule 10:** Use `WebSocketService` via context — never instantiate raw WebSocket connections in components
- **Rule 11:** Handle all WebSocket messages through the discriminated union switch pattern
- No string comparisons scattered across components
- Context API is for DI only — state lives in Zustand store, not in context value
- Console logging: `if (__DEV__) console.error(...)` — never in production paths. Use the project's `logger` utility from `src/utils/logger.ts`

### File Structure

New files to create:
```
src/services/                              ← NEW directory
  websocket.service.ts                     ← WebSocket connection manager
  websocket.context.tsx                    ← React Context provider + useWebSocket hook
src/components/language-learning/          ← NEW directory
  connection-status-bar.tsx                ← Pi connection indicator
```

Files to modify:
```
src/app/(app)/(language-learning)/_layout.tsx  ← Wrap with provider, add status bar
```

### What This Story Does NOT Include

- No TTS playback (Story 15.1) — `enqueueTts` is called but queue is not consumed yet
- No signal handlers (Stories 14.2, 15.3) — signals are dispatched but no-op
- No session lifecycle UI (Story 13.3)
- No `send()` usage (Story 16.2 — voice input sends transcript to Pi)

### Previous Story Intelligence (13.1)

- All types, store, repository interfaces/impls, and route shell are in place
- Package `react-native-webview` is installed (not needed for this story but available)
- `app.config.ts` already exposes `piWebsocketUrl` via `Constants.expoConfig?.extra?.piWebsocketUrl`
- `useAuthStore` provides `userAccount.id` for the userId parameter
- `RepositoryError` in `src/utils/repository.error.ts` is for repository errors — WebSocket errors should use plain `logger.warn`/`logger.error`, not `RepositoryError`

### Project Structure Notes

- `src/services/` is a new directory — architecture designates it for long-lived connection managers
- `src/components/language-learning/` is a new directory — architecture designates it for module-specific components
- Follows existing naming: `kebab-case` filenames, `PascalCase` exports
- No barrel `index.ts` needed for `src/services/` yet (only 2 files)

### References

- [Source: _bmad-output/planning-artifacts/architecture.md — §4 V4 Communication Layer, WebSocketService]
- [Source: _bmad-output/planning-artifacts/architecture.md — Process Patterns, V4 Pi connection lifecycle]
- [Source: _bmad-output/planning-artifacts/architecture.md — Enforcement Summary, rules 10-11]
- [Source: _bmad-output/planning-artifacts/architecture.md — Project Structure, src/services/]
- [Source: _bmad-output/planning-artifacts/epics-v4-language-learning.md — Story 13.2]
- [Source: _bmad-output/planning-artifacts/prd.md — FR104, FR114]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

### Completion Notes List

- WebSocketService class implements full lifecycle: connect, auto-reconnect with exponential backoff (1s→2s→4s→10s cap), disposed flag to suppress reconnect on intentional close, send method for future STT use
- WebSocketProvider creates service on mount (useEffect), wires onStatusChange → Zustand store, onMessage → dispatchMessage, closes + resets store on unmount
- Message dispatcher uses discriminated union switch: speak→enqueueTts, terminal→appendTerminalOutput, signal→log only (no-op for now)
- ConnectionStatusBar reads connectionStatus from store, renders colored dot + Portuguese label (Ligado/Desligado/A reconectar...)
- Layout wraps Stack with WebSocketProvider and renders ConnectionStatusBar above it
- No test framework configured in project — tests not authored (no jest/vitest in dependencies)
- TypeScript compilation clean (zero errors in src/)

### File List

- src/services/websocket.service.ts (new)
- src/services/websocket.context.tsx (new)
- src/components/language-learning/connection-status-bar.tsx (new)
- src/app/(app)/(language-learning)/_layout.tsx (modified)
