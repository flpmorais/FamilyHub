# Story 14.1: Claude OAuth Onboarding via WebView

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an admin,
I want to authenticate Claude on the Pi through a familiar login screen on my phone,
so that I never have to SSH into the Pi or touch a terminal to set up my account.

## Acceptance Criteria

1. When the user opens Language Learning and `learning_profiles.claude_authenticated` is `false` (or no profile exists), the app shows an "Authenticate Claude" screen instead of the skill menu (FR112)
2. When the user taps "Connect your account", the app calls `POST /auth/login?userId=X` on the Pi session service via `ISessionRepository.authLogin(userId)` and receives an OAuth URL
3. When the OAuth URL is received, a `<WebView>` opens displaying the standard Claude login page — no terminal or SSH is visible to the user
4. When the user completes OAuth in the WebView, the app updates `learning_profiles.claude_authenticated = true` in Supabase via `ILearningProfileRepository.update()` and dismisses the WebView
5. When the user cancels or closes the WebView, `claude_authenticated` remains `false` and they can retry
6. When `claude_authenticated` is already `true`, the OAuth screen is never shown — the user proceeds directly to setup or skill selection

## Tasks / Subtasks

- [ ] Task 1: Create `useLearningProfile` hook (AC: #1, #6)
  - [ ] Create `src/hooks/use-learning-profile.ts`
  - [ ] Get `learningProfile` repository from `useRepository('learningProfile')`
  - [ ] Get `userId` from `useAuthStore(s => s.userAccount?.id)`
  - [ ] Expose `profile: LearningProfile | null`, `isLoading: boolean`, `error: string | null`
  - [ ] Expose `fetchProfile()` — calls `learningProfile.getByUserId(userId)`, stores result
  - [ ] Expose `updateProfile(data)` — calls `learningProfile.update(profile.id, data)`, refreshes local state
  - [ ] `fetchProfile()` on mount via `useEffect`
  - [ ] Handle "no profile exists" case: return `null` (not error) — profile creation happens in setup flow
- [ ] Task 2: Create onboarding gate in `index.tsx` (AC: #1, #6)
  - [ ] Modify `src/app/(app)/(language-learning)/index.tsx`
  - [ ] Use `useLearningProfile()` to check auth state on mount
  - [ ] If `profile === null` or `profile.claudeAuthenticated === false` → `router.push('/(language-learning)/onboarding')`
  - [ ] If `profile.claudeAuthenticated === true` and `profile.setupComplete === false` → show placeholder (Story 14.2 will handle setup gate)
  - [ ] If both `true` → show placeholder skill selection (Story 14.3 will replace)
  - [ ] Show loading spinner while profile is being fetched
- [ ] Task 3: Create onboarding screen (AC: #1, #2, #3, #4, #5)
  - [ ] Create `src/app/(app)/(language-learning)/onboarding.tsx`
  - [ ] Screen layout: centered card with Claude/Language Learning branding
  - [ ] Title: "Autenticação Claude" (Portuguese)
  - [ ] Explanatory text: "Para usar o Language Learning, precisa de autenticar a sua conta Claude no Pi."
  - [ ] Primary button: "Ligar a conta" (`Button` from react-native-paper)
  - [ ] On tap: call `handleStartOAuth()`
  - [ ] Show loading state while waiting for Pi response
  - [ ] Error handling: if Pi is unreachable or returns error, show Snackbar with Portuguese message
- [ ] Task 4: Implement OAuth flow with WebView (AC: #2, #3, #4, #5)
  - [ ] When "Ligar a conta" tapped: call `sessionRepository.authLogin(userId)` to get OAuth URL
  - [ ] On success: set state `oauthUrl` and render `<WebView source={{ uri: oauthUrl }} />`
  - [ ] WebView fills most of the screen (leave status bar visible)
  - [ ] Add a close/cancel button (X icon) in a header bar above the WebView
  - [ ] Detect OAuth completion: listen for `onNavigationStateChange` — when URL matches a success callback pattern (e.g., contains `/oauth/callback` or the Pi returns a redirect to a known success URL), treat as complete
  - [ ] Alternative completion detection: Pi may send a WebSocket `{ type: 'signal', name: 'oauth-complete' }` — listen for this in the WebSocket message handler
  - [ ] On completion: call `learningProfileRepository.update(profile.id, { claudeAuthenticated: true })`, then `router.back()` to return to index
  - [ ] On cancel (X button): set `oauthUrl` to `null`, return to onboarding card view
- [ ] Task 5: Handle edge cases (AC: #5, #6)
  - [ ] Pi disconnected: disable "Ligar a conta" button, show connection status message
  - [ ] OAuth URL fetch timeout: show "O Pi nao respondeu a tempo" error
  - [ ] WebView load failure: show error state with retry option
  - [ ] Profile fetch error: show error with retry option
  - [ ] Back navigation: if user navigates back from onboarding, they leave the language-learning module entirely (expected — they can't proceed without auth)

## Dev Notes

### Onboarding Gate Logic

The `index.tsx` screen acts as the entry point and gate for the entire Language Learning module. The gating order across stories is:

1. **Claude OAuth** (this story): `claude_authenticated === false` → redirect to `/onboarding`
2. **Setup** (Story 14.2): `setup_complete === false` → auto-start `/setup` skill session
3. **Skill Selection** (Story 14.3): both `true` → show skill menu

For this story, only implement the OAuth gate (#1). When `claudeAuthenticated` is true but `setupComplete` is false, just show a placeholder message — Story 14.2 will replace it.

### useLearningProfile Hook Design

```typescript
// src/hooks/use-learning-profile.ts
function useLearningProfile() {
  return {
    profile: LearningProfile | null,
    isLoading: boolean,
    error: string | null,
    fetchProfile: () => Promise<void>,
    updateProfile: (data: Partial<...>) => Promise<void>,
  };
}
```

This hook follows the same pattern as `useSession` (Story 13.3):
- Gets repository from `useRepository('learningProfile')`
- Gets userId from `useAuthStore`
- Local `useState` for loading/error (NOT Zustand store)
- All methods are no-ops if `userId` is undefined

### WebView OAuth Flow

The Pi session service `POST /auth/login?userId=X` runs `claude login` under the user's Linux account and captures the OAuth URL from Claude's stdout. The returned JSON is `{ url: string }`.

```typescript
// Flow in onboarding.tsx
const handleStartOAuth = async () => {
  setIsLoading(true);
  try {
    const oauthUrl = await sessionRepository.authLogin(userId);
    setOauthUrl(oauthUrl);  // triggers WebView render
  } catch (err) {
    setError('Nao foi possivel iniciar a autenticacao');
  } finally {
    setIsLoading(false);
  }
};
```

### OAuth Completion Detection

Two possible detection mechanisms (implement both, first one that fires wins):

1. **URL-based**: `onNavigationStateChange` in WebView — watch for a URL pattern indicating success. The exact callback URL depends on Claude's OAuth flow. Check if the URL contains `success`, `callback`, or redirects back to a known domain.

2. **WebSocket signal**: The Pi may send `{ type: 'signal', name: 'oauth-complete' }` when `claude login` completes successfully. Listen for this in the existing WebSocket message dispatcher (`dispatchMessage` in `WebSocketProvider`).

**Important**: The Pi-side implementation determines which signal is used. For robustness, implement URL watching first (it's client-controlled), and add WebSocket signal as a fallback enhancement if available.

When completion is detected:
```typescript
const handleOAuthComplete = async () => {
  try {
    await learningProfileRepository.update(profile.id, { claudeAuthenticated: true });
    router.back();  // returns to index.tsx, which re-checks and proceeds
  } catch (err) {
    setError('Nao foi possivel atualizar o perfil');
  }
};
```

### WebView Component Pattern

```typescript
import { WebView } from 'react-native-webview';

{oauthUrl && (
  <View style={{ flex: 1 }}>
    <Appbar.Header>
      <Appbar.Action icon="close" onPress={() => setOauthUrl(null)} />
      <Appbar.Content title="Autenticacao Claude" />
    </Appbar.Header>
    <WebView
      source={{ uri: oauthUrl }}
      onNavigationStateChange={handleNavStateChange}
      onError={() => setWebViewError(true)}
      startInLoadingState={true}
      renderLoading={() => <ActivityIndicator />}
    />
  </View>
)}
```

### Error Messages (Portuguese)

All user-facing strings in `pt-PT`:
- OAuth start failed: "Nao foi possivel iniciar a autenticacao"
- Pi unreachable: "O Pi nao esta acessivel"
- Pi timeout: "O Pi nao respondeu a tempo"
- Profile update failed: "Nao foi possivel atualizar o perfil"
- WebView load error: "Erro ao carregar a pagina de autenticacao"
- Connection required: "E necessaria ligacao ao Pi para autenticar"

### Existing Infrastructure (from Epic 13)

**ISessionRepository** (`src/repositories/interfaces/session.repository.interface.ts`):
- `authLogin(userId: string): Promise<string>` — already defined, returns OAuth URL
- Implemented in `src/repositories/supabase/session.repository.ts` with 5s timeout

**ILearningProfileRepository** (`src/repositories/interfaces/learning-profile.repository.interface.ts`):
- `getByUserId(userId: string): Promise<LearningProfile | null>`
- `update(id: string, data: Partial<...>): Promise<LearningProfile>`

**languageLearningStore** (`src/stores/language-learning.store.ts`):
- `connectionStatus` — use this to check Pi connectivity in onboarding screen

**WebSocketProvider** (`src/services/websocket.context.tsx`):
- Already dispatches messages by type
- May need to add `'oauth-complete'` to `PiWebSocketMessage` signal union if Pi sends it

**useRepository hook** (`src/hooks/use-repository.ts`):
- `useRepository('session')` returns `ISessionRepository`
- `useRepository('learningProfile')` returns `ILearningProfileRepository`

**Route shell** (`src/app/(app)/(language-learning)/`):
- `_layout.tsx` — Stack layout with WebSocketProvider
- `index.tsx` — currently placeholder, will be modified

### Connection Status Integration

The onboarding screen reads `connectionStatus` from `useLanguageLearningStore()` to disable the OAuth button when the Pi is unreachable:

```typescript
const connectionStatus = useLanguageLearningStore(s => s.connectionStatus);
const isPiConnected = connectionStatus === 'connected';
```

The WebSocket connection is managed by the `_layout.tsx` provider — it starts when entering the route group and persists across `index.tsx` and `onboarding.tsx`.

### Architecture Compliance

- **Rule 9**: Never call Pi session service directly — only through `ISessionRepository` via `useRepository`
- **NFR27**: 5s timeout in repository layer — no additional timeout in screen
- **Repository pattern (NFR17)**: Zero Supabase calls outside repositories
- **Portuguese strings**: All user-facing messages in `pt-PT`
- **File naming**: kebab-case (`use-learning-profile.ts`, `onboarding.tsx`)
- **Component naming**: PascalCase functions (`OnboardingScreen`)
- **Loading/error naming**: `isLoading: boolean`, `error: string | null`
- **snake_case/camelCase boundary**: conversion in repository only

### Project Structure Notes

New files:
```
src/hooks/use-learning-profile.ts           <- Learning profile hook
src/app/(app)/(language-learning)/onboarding.tsx  <- OAuth WebView screen
```

Files to modify:
```
src/app/(app)/(language-learning)/index.tsx  <- Add onboarding gate logic
src/types/language-learning.types.ts         <- Add 'oauth-complete' to signal union (if needed)
```

### What This Story Does NOT Include

- No setup flow or setup gate (Story 14.2)
- No skill selection UI (Story 14.3)
- No TTS/STT (Epics 15-16)
- No learning profile creation — if no profile exists, the onboarding gate blocks and redirects. Profile creation happens when setup completes (Story 14.2)
- No Pi-side `POST /auth/login` endpoint implementation (separate repo)

### Previous Story Intelligence (13.3)

Key learnings from the most recent completed story:
- `useSession` hook pattern: local `useState` for loading/error, repository calls via `useRepository`, no-op if userId undefined — follow this exact pattern for `useLearningProfile`
- Error messages must be plain Portuguese strings (architecture enforcement)
- Reconnect status check was added to WebSocketProvider — the provider already accesses `RepositoryContext` directly
- `SessionErrorToast` uses `react-native-paper` Snackbar with 4s auto-dismiss — reuse same pattern for onboarding errors
- Review found that `resumeSession` wasn't updating store — always verify state is synced after async operations

### Git Intelligence

Recent commits show V4 Language Learning bmad-output artifacts were added. No V4 implementation code has been committed yet — Epic 13 stories (13-2, 13-3) are marked done but story 13-1 foundation is still in-progress. **Verify that all Epic 13 foundation code exists before implementing this story** (repositories, types, store, route shell, packages).

### References

- [Source: _bmad-output/planning-artifacts/epics-v4-language-learning.md — Story 14.1: Claude OAuth Onboarding via WebView]
- [Source: _bmad-output/planning-artifacts/epics-v4-language-learning.md — FR112: Claude OAuth via in-app WebView]
- [Source: _bmad-output/planning-artifacts/architecture.md — §4 V4 Communication Layer, ISessionRepository.authLogin]
- [Source: _bmad-output/planning-artifacts/architecture.md — Process Patterns, V4 Onboarding gate]
- [Source: _bmad-output/planning-artifacts/architecture.md — Enforcement Summary, rule 9 (repository pattern)]
- [Source: _bmad-output/implementation-artifacts/13-1-language-learning-foundation-migration-repositories-store-and-route-shell.md — Foundation types, repositories, store]
- [Source: _bmad-output/implementation-artifacts/13-3-session-lifecycle-start-resume-end-and-status.md — useSession hook pattern, error handling]

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
