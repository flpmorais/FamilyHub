# Story 13.4: Mobile API Key Setup Screen

Status: done

branch: feature/13-4-api-key-setup-screen

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
I want to enter my LLM API key on a setup screen when I first open Language Learning,
so that I can start learning without needing terminal access.

## Acceptance Criteria

1. **AC-1: API key gate on module entry** — Given the admin navigates to the Language Learning module for the first time, When `GET /auth/status` returns `{ configured: false }`, Then the app shows the API key setup screen instead of the skill menu (FR112).

2. **AC-2: API key submission** — Given the admin is on the API key setup screen, When they enter their API key and tap submit, Then the app calls `ISessionRepository.configureApiKey(key)` and shows a loading indicator during validation.

3. **AC-3: Success navigation** — Given the API key is validated successfully, When the harness returns `{ provisioned: true }`, Then the app navigates to the skill selection screen (FR114).

4. **AC-4: Error handling with retry** — Given the API key validation fails, When the harness returns an error, Then the app displays a Portuguese error message (e.g., "A chave API é inválida. Tente novamente.") and stays on the setup screen for retry.

5. **AC-5: Already configured bypass** — Given the admin navigates to the Language Learning module with an already configured API key, When `GET /auth/status` returns `{ configured: true }`, Then the app skips the setup screen and shows the skill selection screen directly.

## Tasks / Subtasks

- [x] Implement `SessionRepository.configureApiKey()` (AC: #2, #3, #4)
  - [x] Replace placeholder in `src/repositories/supabase/session.repository.ts`
  - [x] `POST /auth/configure` with `{ api_key }` body and JWT Authorization header
  - [x] Map error responses to Portuguese user-facing messages
- [x] Implement `SessionRepository.getAuthStatus()` (AC: #1, #5)
  - [x] Replace placeholder in `src/repositories/supabase/session.repository.ts`
  - [x] `GET /auth/status` with JWT Authorization header
  - [x] Map `setup_complete` (snake_case) → `setupComplete` (camelCase)
- [x] Add auth state to `languageLearningStore` (AC: #1, #2)
  - [x] `authStatus: { configured: boolean; setupComplete: boolean } | null`
  - [x] `isConfiguring: boolean`
  - [x] `authError: string | null`
  - [x] `setAuthStatus`, `setConfiguring`, `setAuthError` actions
- [x] Create `src/app/(app)/(language-learning)/api-key-setup.tsx` (AC: #2, #3, #4)
  - [x] API key TextInput (secure text entry, masked)
  - [x] Submit button with loading state
  - [x] Error message display
  - [x] Call `sessionRepo.configureApiKey(key)` on submit
  - [x] On success: `router.replace("../")` to re-trigger gate logic
  - [x] On failure: show Portuguese error from store
- [x] Rewrite `src/app/(app)/(language-learning)/index.tsx` gate logic (AC: #1, #5)
  - [x] Call `sessionRepo.getAuthStatus()` on focus
  - [x] Store result in `languageLearningStore.authStatus`
  - [x] If `!configured` → redirect to `api-key-setup` screen
  - [x] If `configured && !setupComplete` → placeholder for story 14.5 (auto-start Setup skill)
  - [x] If `configured && setupComplete` → placeholder for story 14.5 (skill selection)

## Dev Notes

### Existing Code from Story 13.3

Story 13.3 created the entire mobile infrastructure this story builds on. Key files already exist:

| File | Status | What This Story Changes |
|---|---|---|
| `repositories/supabase/session.repository.ts` | Exists with placeholders | Implement `configureApiKey()` and `getAuthStatus()` |
| `repositories/interfaces/session.repository.interface.ts` | Complete | No changes needed — signatures already match |
| `stores/language-learning.store.ts` | Exists | Add auth-related state fields |
| `app/(app)/(language-learning)/index.tsx` | Placeholder ("Idiomas" text) | Rewrite with gate logic |
| `app/(app)/(language-learning)/_layout.tsx` | Complete | No changes — health check + connection status already wired |
| `components/language-learning/index.ts` | Exists | Add any new component exports if needed |

### Harness API Contract (Already Implemented in Stories 13.1 & 13.2)

**`POST /auth/configure`** — `harness/routers/auth.py:18-45`

Request body: `{ "api_key": "sk-..." }` (see `harness/models/requests.py`)
Response success: `{ "provisioned": true }` (see `harness/models/responses.py`)
Error responses (all use FastAPI default `{ "detail": "..." }` format):
- `400` — `"Falha na validação da chave API"` (invalid key)
- `409` — `"Chave API já configurada para este utilizador"` (duplicate)
- `500` — `"Erro ao provisionar utilizador: ..."` (filesystem error)
- `503` — `"Serviço de validação indisponível, tente novamente"` (LLM API unreachable)

**`GET /auth/status`** — `harness/routers/auth.py:48-52`

Response: `{ "configured": true, "setup_complete": false }` (see `harness/models/responses.py`)

**IMPORTANT:** The harness returns `setup_complete` (snake_case Python). The TypeScript interface expects `setupComplete` (camelCase). The repository implementation MUST map this.

### Key Architecture Decisions for This Story

**Auth check happens on `index.tsx` focus (not mount).** Use `useFocusEffect` so that returning from `api-key-setup.tsx` after successful configuration re-triggers the auth status check and navigates correctly. The `_layout.tsx` health check uses `useEffect` (runs on mount only) — that's different because connection status should persist for the whole route group lifecycle, whereas auth status may change when the user configures their key.

**Navigation flow:**
```
index.tsx (gate)
  ├── configured=false → router.replace("api-key-setup")
  ├── configured=true, setupComplete=false → [Story 14.5: auto-start Setup skill]
  └── configured=true, setupComplete=true → [Story 14.5: skill selection]

api-key-setup.tsx
  └── on success → router.replace("../") → re-triggers index.tsx gate → now configured=true
```

**Why `router.replace` not `router.push`:** Using `replace` prevents the user from pressing back to return to the setup screen after configuration. The gate in `index.tsx` will handle routing them to the correct next screen.

**API key input is secure:** The TextInput for the API key must use `secureTextEntry={true}` since it's a secret credential (NFR31). The submit button should be disabled while the input is empty or while submission is in progress.

**Error message mapping:** The harness already returns Portuguese error messages in its `detail` field. The repository should extract and surface these directly. For network errors (fetch failure), display a generic Portuguese fallback like "Erro de ligação. Verifique a sua conexão."

**Auth check only runs when connected.** If `connectionStatus !== 'connected'`, the gate should not call `getAuthStatus()` — it will fail anyway. Show a "waiting for connection" state or just let the connection status bar communicate the issue.

### What This Story Does NOT Include

- Skill selection screen → Story 14.5
- Auto-start Setup skill logic → Story 14.5 (FR118)
- Chat interface → Story 14.6
- SSE streaming → Stories 14.3, 14.4
- TTS/STT → Epic 15
- Any Supabase migrations or tables — zero Supabase footprint for V4

### File-by-File Guide

#### `src/repositories/supabase/session.repository.ts` — Implement Two Methods

Replace the two placeholder methods. Both require JWT in the `Authorization: Bearer` header. Follow the existing pattern from `healthCheck()` — use `fetch` with the base URL and get the token from `this.getToken()`.

```ts
async getAuthStatus(): Promise<{ configured: boolean; setupComplete: boolean }> {
  const token = await this.getToken();
  if (!token) throw new Error("Not authenticated");
  const response = await fetch(`${this.baseUrl}/auth/status`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error("Failed to get auth status");
  const data = await response.json();
  return {
    configured: data.configured,
    setupComplete: data.setup_complete,
  };
}
```

```ts
async configureApiKey(apiKey: string): Promise<void> {
  const token = await this.getToken();
  if (!token) throw new Error("Not authenticated");
  const response = await fetch(`${this.baseUrl}/auth/configure`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ api_key: apiKey }),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.detail ?? "Erro ao configurar a chave API");
  }
}
```

**Key detail:** `configureApiKey` throws with the harness's Portuguese `detail` message on error. The screen catches this and displays it. The repository does NOT need a timeout here — the harness validates the key by making a test LLM API call, which may take a few seconds. Let it complete naturally.

#### `src/stores/language-learning.store.ts` — Add Auth Fields

Add to the `LanguageLearningState` interface and initial state:

```ts
authStatus: { configured: boolean; setupComplete: boolean } | null;
isConfiguring: boolean;
authError: string | null;
setAuthStatus: (status: { configured: boolean; setupComplete: boolean } | null) => void;
setConfiguring: (isConfiguring: boolean) => void;
setAuthError: (error: string | null) => void;
```

Initial values: `authStatus: null`, `isConfiguring: false`, `authError: null`.

#### `src/app/(app)/(language-learning)/index.tsx` — Gate Logic

Replace the current placeholder. This screen is the traffic controller:

```tsx
export default function LanguageLearningScreen() {
  const sessionRepo = useRepository("session");
  const setAuthStatus = useLanguageLearningStore((s) => s.setAuthStatus);
  const setAuthError = useLanguageLearningStore((s) => s.setAuthError);
  const authStatus = useLanguageLearningStore((s) => s.authStatus);
  const connectionStatus = useLanguageLearningStore((s) => s.connectionStatus);

  useFocusEffect(
    useCallback(() => {
      if (connectionStatus !== "connected") return;
      (async () => {
        try {
          const status = await sessionRepo.getAuthStatus();
          setAuthStatus(status);
          setAuthError(null);
        } catch (e: any) {
          setAuthError(e.message ?? "Erro ao verificar estado");
        }
      })();
    }, [connectionStatus]),
  );

  useEffect(() => {
    if (!authStatus) return;
    if (!authStatus.configured) {
      router.replace("api-key-setup");
    }
    // Story 14.5 will handle:
    // else if (!authStatus.setupComplete) → auto-start Setup skill
    // else → show skill selection
  }, [authStatus]);

  // Loading / waiting state while auth status is being checked
  return <View style={s.container}><Text>Idiomas</Text></View>;
}
```

**Important:** Use `useFocusEffect` for the auth check (re-runs on every focus), but `useEffect` for the navigation decision (only when `authStatus` changes). This prevents navigation loops.

#### `src/app/(app)/(language-learning)/api-key-setup.tsx` — New Screen

This is the main new file. Key elements:
- `TextInput` with `secureTextEntry={true}` for the API key
- Submit `Button` disabled while empty or submitting
- `ActivityIndicator` during submission
- Error `HelperText` or `Text` below the input
- On submit: call `sessionRepo.configureApiKey(key)`, wrapped in try/catch
- On success: set `authStatus` to `{ configured: true, setupComplete: false }` in store, then `router.replace("../")`
- On failure: set `authError` in store, stay on screen

Use React Native Paper components (`TextInput`, `Button`, `HelperText`) consistent with the rest of the app. Portuguese labels:
- Title: "Configurar Chave API"
- Input label: "Chave API"
- Submit button: "Configurar"
- Loading text: "A validar chave..."
- Placeholder: "sk-..."

### UI Pattern Reference

Follow the existing FamilyHub screen patterns:
- Use `react-native-paper` components (`TextInput`, `Button`, `HelperText`)
- Portuguese labels throughout
- Consistent padding (16px horizontal)
- Primary action button uses `mode="contained"`
- Error text below input in red

### Dependencies

No new npm packages required. Uses:
- `expo-router` (already installed) — `useFocusEffect`, `router`
- `react-native-paper` (already installed) — `TextInput`, `Button`
- `zustand` (already installed) — `useLanguageLearningStore`
- Existing `useRepository` hook and `ISessionRepository` interface

### Testing Approach

No automated test runner exists. Manual verification:
1. With harness running, navigate to "Aprender Grego" from sidebar
2. If API key not configured → should show setup screen
3. Enter invalid key → should show error in Portuguese
4. Enter valid key → should navigate away (currently back to placeholder since skill selection is story 14.5)
5. Navigate away and back → should NOT show setup screen again (already configured)
6. With harness stopped → connection status shows "Desconectado", gate does not attempt auth check

### References

- [Source: epics-v4-language-learning.md — Story 13.4 acceptance criteria, FRs FR112/FR114]
- [Source: architecture-v4-language-learning.md — Section 3 (API endpoints: POST /auth/configure, GET /auth/status), Section 4 (Frontend Architecture — API key configuration gate pattern), Implementation Patterns (Process Patterns — API key configuration gate)]
- [Source: architecture-v4-language-learning.md — Section 2 (Auth — JWT passthrough), FR-to-directory mapping: FR112 → index.tsx, FR113 → session.repository.ts + api-key-setup.tsx, FR114 → api-key-setup.tsx]
- [Source: harness/routers/auth.py — exact endpoint implementations, error messages in Portuguese]
- [Source: harness/models/responses.py — AuthStatusResponse (configured, setup_complete), ConfigureResponse (provisioned)]
- [Source: harness/models/requests.py — ConfigureApiKeyRequest (api_key field)]
- [Source: src/repositories/supabase/session.repository.ts — existing placeholders to implement]
- [Source: src/stores/language-learning.store.ts — existing store to extend]
- [Source: src/app/(app)/(language-learning)/index.tsx — current placeholder to rewrite]
- [Source: src/app/(app)/(language-learning)/_layout.tsx — existing layout with connection status]
- [Source: story 13-3 — previous story learnings, established patterns]

## Dev Agent Record

### Agent Model Used

glm-5.1

### Debug Log References

- All new/modified files pass ESLint (0 errors)
- No new TypeScript type errors introduced (pre-existing Deno errors only)
- Prettier formatting applied — all files formatted correctly

### Completion Notes List

- Implemented `SessionRepository.configureApiKey()`: POST /auth/configure with JWT Bearer token, extracts Portuguese `detail` from error responses, falls back to generic Portuguese error
- Implemented `SessionRepository.getAuthStatus()`: GET /auth/status with JWT Bearer token, maps `setup_complete` (snake_case) → `setupComplete` (camelCase)
- Added `authStatus`, `isConfiguring`, `authError` fields to `languageLearningStore` with corresponding setters
- Created `api-key-setup.tsx`: secure TextInput for API key, submit button with loading state, HelperText for error display, on success sets authStatus and replaces navigation back to gate
- Rewrote `index.tsx` with gate logic: useFocusEffect triggers getAuthStatus on every focus when connected, useEffect navigates to api-key-setup when not configured, shows ActivityIndicator during loading, "A aguardar ligação..." when disconnected, error text on auth failure

### File List

- src/repositories/supabase/session.repository.ts (modified — implemented configureApiKey and getAuthStatus)
- src/stores/language-learning.store.ts (modified — added authStatus, isConfiguring, authError with setters)
- src/app/(app)/(language-learning)/api-key-setup.tsx (new — API key setup screen)
- src/app/(app)/(language-learning)/index.tsx (modified — gate logic replacing placeholder)

## Review Findings

### Decision Needed

- [x] [Review][Decision→Patch] App dead-ends on spinner after successful API key config — Resolved: added placeholder "Configuração concluída!" message for configured=true state in index.tsx
- [x] [Review][Decision→Patch] No retry mechanism on error screen — Resolved: added "Tentar novamente" button in index.tsx error view

### Patches

- [x] [Review][Patch] English error messages shown to users [session.repository.ts] — Fixed: all errors now Portuguese, network errors use "Erro de ligação. Verifique a sua conexão."
- [x] [Review][Patch] No fetch timeout on configureApiKey/getAuthStatus [session.repository.ts] — Fixed: extracted fetchWithTimeout helper, all methods use AbortController with HEALTH_CHECK_TIMEOUT_MS
- [x] [Review][Patch] No response body validation in getAuthStatus [session.repository.ts] — Fixed: uses !!data?.configured and !!data?.setup_complete
- [x] [Review][Patch] configureApiKey doesn't verify provisioned: true [session.repository.ts] — Fixed: reads response body and checks data?.provisioned
- [x] [Review][Patch] Missing screen title "Configurar Chave API" [api-key-setup.tsx] — Fixed: added title Text element
- [x] [Review][Patch] Missing loading text "A validar chave..." [api-key-setup.tsx] — Fixed: shows when isConfiguring is true
- [x] [Review][Patch] Hardcoded 8000ms timeout instead of constant [session.repository.ts] — Fixed: uses HEALTH_CHECK_TIMEOUT_MS from language-learning-defaults.ts

### Deferred

- [x] [Review][Defer] Relative navigation path `router.replace("../")` is fragile [api-key-setup.tsx:26] — deferred, maintainability concern not a bug
- [x] [Review][Defer] Stale authStatus persists across disconnection/reconnection [index.tsx] — deferred, self-corrects on reconnection
- [x] [Review][Defer] No cancellation guard on api-key-setup async flow [api-key-setup.tsx:20-31] — deferred, router.replace is global
- [x] [Review][Defer] Transient state inconsistency on connectionStatus change mid-flight [index.tsx:17-30] — deferred, self-corrects
- [x] [Review][Defer] Navigation useEffect ignores connectionStatus guard [index.tsx:37-42] — deferred, authStatus only set when connected via useFocusEffect guard

## Change Log

- 2026-05-03: Implemented Story 13.4 — Mobile API Key Setup Screen. Implemented configureApiKey and getAuthStatus in session repository, added auth state to languageLearningStore, created api-key-setup screen with secure input and Portuguese error messages, rewrote index.tsx with auth gate logic. All lint/type-check pass.
- 2026-05-03: Code review patches — Fixed 9 findings: Portuguese error messages (Mandate #8), fetchWithTimeout helper with AbortController for all methods, response body validation, provisioned check, screen title, loading text, HEALTH_CHECK_TIMEOUT_MS constant, placeholder message for configured state, retry button on error.
