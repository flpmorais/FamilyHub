# Story 14.5: Skill Selection Screen

Status: done
branch: feature/14-5-skill-selection-screen

## ARCHITECTURE MANDATES — NON-NEGOTIABLE

1. **Zero Supabase footprint** — No learning data in Supabase. All data lives in the harness container filesystem.
2. **SSE-only communication** — No WebSocket. HTTP + SSE for all client-harness communication.
3. **All harness API calls through `ISessionRepository`** — Never raw fetch in mobile screens/hooks.
4. **`languageLearningStore` for all learning UI state** — no local `useState` for connection status, session state, or active session.
5. **All timing constants from `language-learning-defaults.ts`** — no inline values in components.
6. **All harness API calls require Supabase JWT** in `Authorization: Bearer` header.
7. **All user-facing error messages in Portuguese** — never show technical error codes or English messages.
8. **`snake_case` JSON from harness** → **`camelCase` TypeScript** — always map at the repository boundary.
9. **Repository DI pattern** — `ISessionRepository` registered in `RepositoryContext`, consumed via `useRepository("session")`.
10. **No React Native Paper `Card` component** — this project uses custom `TouchableOpacity`/`View` for all card UIs.

## Story

As an admin,
I want to see all available learning skills and select one to start a session,
so that I can choose what type of practice I want.

## Acceptance Criteria

1. **AC-1: Skill grid for configured+setup user** — Given the admin opens Language Learning and has a configured API key, When `GET /auth/status` returns `{ configured: true, setupComplete: true }`, Then the app shows the skill selection screen with 8 skill cards: Setup, Learn, Review, Vocab, Writing, Speaking, Reading, Progress (FR110).

2. **AC-2: Auto-start Setup when not complete** — Given the admin opens Language Learning with a configured API key but setup not complete, When `GET /auth/status` returns `{ configured: true, setupComplete: false }`, Then the app auto-starts a session with the Setup skill (FR118) And only the Setup skill card is shown (other skills disabled or hidden).

3. **AC-3: Start new session on tap** — Given the admin taps a skill card (e.g., "Learn"), When no active session exists for this skill, Then `ISessionRepository.startSession("learn")` is called And the app navigates to the session screen.

4. **AC-4: Resume badge on active session** — Given the admin taps a skill card with an active session in that skill, When `GET /session/status` returns `{ active: true, skill: "learn" }`, Then the skill card shows a "Resume" badge And tapping it calls `ISessionRepository.resumeSession()` And the chat history from the response populates the store.

5. **AC-5: Switch skills ends existing session** — Given the admin taps a different skill card while a session is active, When the active skill is "learn" and the admin taps "Vocab", Then the harness ends the existing "learn" session and starts a "vocab" session (FR111).

## Tasks / Subtasks

- [x] Create `src/components/language-learning/skill-card.tsx` — skill selection button (AC: #1, #3, #4)
  - [x] Props: `skill: LearningSkill`, `isActive: boolean`, `hasResume: boolean`, `disabled: boolean`, `onPress: () => void`
  - [x] Custom `TouchableOpacity` card (NOT React Native Paper `Card`) with skill name and optional resume badge
  - [x] Disabled state visual (grayed out, no press)
  - [x] Portuguese labels for each skill
- [x] Update barrel export in `src/components/language-learning/index.ts` (AC: #1)
  - [x] Export `SkillCard`
- [x] Add skill display labels to `src/constants/language-learning-defaults.ts` (AC: #1)
  - [x] `SKILL_LABELS` map: `Record<LearningSkill, string>` with Portuguese display names
- [x] Update `src/app/(app)/(language-learning)/index.tsx` — replace placeholder with skill selection (AC: #1–#5)
  - [x] When `authStatus.configured === true && authStatus.setupComplete === true`: show all 8 skill cards in a grid
  - [x] When `authStatus.configured === true && authStatus.setupComplete === false`: auto-start Setup session, show only Setup card
  - [x] On skill card tap: check `getSessionStatus()` for active session
  - [x] If same skill active → resume session, navigate to session screen
  - [x] If different skill active → start new session (harness auto-ends old one per FR111)
  - [x] If no active session → start new session, navigate to session screen
  - [x] Loading states during session start/resume
  - [x] Portuguese error messages for failures
- [x] Verify end-to-end skill selection flow (AC: #1–#5)

## Dev Notes

### Existing Code

This story modifies the existing `index.tsx` (currently an auth gate + placeholder) and adds the skill card component. Key files:

| File | What Exists | What This Story Changes |
|---|---|---|
| `src/app/(app)/(language-learning)/index.tsx` | Auth gate: checks `getAuthStatus()`, redirects to `api-key-setup` if not configured. Shows "Configuração concluída!" placeholder when configured. | Replace placeholder with skill selection grid. Add auto-start for Setup when `setupComplete === false`. |
| `src/types/language-learning.types.ts` | `LearningSkill` union type: 8 skill names | No changes |
| `src/constants/language-learning-defaults.ts` | `SKILLS: LearningSkill[]` array | Add `SKILL_LABELS` map |
| `src/stores/language-learning.store.ts` | `setActiveSession`, `addMessage`, `clearSession`, auth state | No changes — use existing actions |
| `src/components/language-learning/index.ts` | Exports `ConnectionStatusBar` | Add `SkillCard` export |
| `src/app/(app)/(language-learning)/_layout.tsx` | Health check, `ConnectionStatusBar`, `Stack` navigator | No changes — but the `Stack` must have a `session` route defined for navigation |
| `src/hooks/use-session.ts` (story 14.4) | `startSession`, `resumeSession`, `endSession`, `getSessionStatus`, `sendMessage` | This story depends on this hook existing. If not yet implemented, call `ISessionRepository` methods directly via `useRepository("session")`. |

### Critical: Card Component Pattern

This project does **not** use React Native Paper's `Card` component. All card UIs are custom-built from primitives (`TouchableOpacity`, `View`, `Text`) with `StyleSheet.create()`. Follow the established conventions:

- **Floating card style** (like `LeftoverItemCard`): `borderRadius: 12`, `elevation: 1`, `marginBottom: 12`, `borderWidth: 1`, `borderColor: "#F0F0F0"`
- **Press handling**: `TouchableOpacity` with `activeOpacity={0.7}`
- **Text colors**: `#1A1A1A` primary, `#888888` secondary
- **Background**: `#FFFFFF`, disabled: `#FAFAFA`
- **Accent**: `#B5451B` (burnt orange) for active/primary indicators
- **Named export**, props interface at top, `const s = StyleSheet.create(...)` at bottom

For a skill grid (8 cards in a 2-column layout), use `FlatList` with `numColumns={2}` or a `View` wrapping two `FlatList` columns. `FlatList` with `numColumns={2}` is the simpler approach.

### Critical: Skill Labels in Portuguese

The skill names from the harness are English identifiers (`setup`, `learn`, `review`, etc.). The UI must display Portuguese labels. Add a `SKILL_LABELS` constant:

```typescript
export const SKILL_LABELS: Record<LearningSkill, string> = {
  setup: "Configuração",
  learn: "Aprender",
  review: "Revisão",
  vocab: "Vocabulário",
  writing: "Escrita",
  speaking: "Conversação",
  reading: "Leitura",
  progress: "Progresso",
};
```

### Critical: index.tsx Flow

The current `index.tsx` handles the auth gate. When `authStatus.configured === true`, it currently shows a placeholder. This must be replaced with the skill selection logic:

```
On mount / focus:
1. If connectionStatus !== "connected" → show waiting state
2. Call getAuthStatus()
3. If !configured → redirect to api-key-setup
4. If configured && !setupComplete → auto-start Setup skill, navigate to session screen
5. If configured && setupComplete → check getSessionStatus() for active session
6. Show skill grid with resume badge on active skill
```

**Auto-start Setup flow (AC-2):** When `setupComplete === false`, automatically call `startSession("setup")` and navigate to the session screen. The user should not see the skill grid — they go directly into the Setup skill. If start fails, show Portuguese error.

**Resume detection (AC-4):** On mount, call `getSessionStatus()`. If `active === true` and `skill` matches a skill in the grid, show a "Retomar" badge on that skill card.

**Skill switching (AC-5):** The harness handles ending the existing session when starting a new one (FR111, implemented in story 14-2's `create_agent` which calls `end_session` on replacement). The mobile app just calls `startSession(newSkill)` — no need to explicitly call `endSession()` first.

### Critical: Session Screen Navigation

The session screen (`session.tsx`) will be created in story 14.6. For this story, navigating to it should use:

```typescript
router.push("session");
```

or

```typescript
router.replace("session");
```

The route must be registered in the `Stack` navigator in `_layout.tsx`. If `session.tsx` doesn't exist yet, the navigation will fail at runtime. Two options:
1. Create a minimal placeholder `session.tsx` that shows "Session screen placeholder"
2. Skip navigation in this story and add it in 14.6

**Recommendation:** Create a minimal placeholder so the skill selection flow is testable end-to-end. The placeholder can just show the session info and a "Back" button.

### Skill Card Visual Design

Each skill card should show:
- Skill Portuguese name (large, primary color)
- Optional "Retomar" badge if the session is active for that skill
- Disabled visual if `setupComplete === false` and skill is not "setup"
- Loading indicator on the card when starting/resuming

Example layout (2-column grid):

```
┌─────────────┐  ┌─────────────┐
│ Configuração │  │  Aprender   │
│   ✓ Feito    │  │  Retomar    │
└─────────────┘  └─────────────┘
┌─────────────┐  ┌─────────────┐
│   Revisão   │  │ Vocabulário │
└─────────────┘  └─────────────┘
...
```

### Error Handling

- `startSession` fails → Portuguese error message, stay on skill grid
- `resumeSession` fails → Portuguese error message, stay on skill grid
- `getSessionStatus` fails → don't show resume badge, still show grid
- Network error → `"Erro de ligação. Verifique a sua conexão."`

### What This Story Does NOT Include

- Chat interface (session screen) → Story 14.6 (only create placeholder if needed)
- SSE stream consumption → Story 14.4
- TTS/STT → Epic 15
- API key setup → Already implemented in story 13.4
- Connection status → Already implemented in story 13.3

### Project Structure Notes

New files:
- `src/components/language-learning/skill-card.tsx` — Skill selection card component

Modified files:
- `src/app/(app)/(language-learning)/index.tsx` — Replace placeholder with skill selection grid
- `src/constants/language-learning-defaults.ts` — Add `SKILL_LABELS`
- `src/components/language-learning/index.ts` — Export `SkillCard`

Possibly new (placeholder):
- `src/app/(app)/(language-learning)/session.tsx` — Minimal placeholder for navigation testing

### References

- [Source: epics-v4-language-learning.md — Story 14.5 acceptance criteria, FR110, FR118]
- [Source: architecture-v4-language-learning.md — Skill selection screen spec, FR-to-directory mapping]
- [Source: architecture-v4-language-learning.md — Enforcement summary]
- [Source: src/app/(app)/(language-learning)/index.tsx — Current auth gate + placeholder to replace]
- [Source: src/types/language-learning.types.ts — LearningSkill type with 8 skill names]
- [Source: src/constants/language-learning-defaults.ts — SKILLS array to use for grid]
- [Source: src/stores/language-learning.store.ts — setActiveSession, clearSession, auth state actions]
- [Source: src/components/language-learning/connection-status-bar.tsx — Component pattern to follow]
- [Source: src/components/leftovers/leftover-item-card.tsx — Floating card style pattern (borderRadius: 12, elevation: 1)]
- [Source: _bmad-output/implementation-artifacts/13-4-mobile-api-key-setup-screen.md — Previous story on index.tsx auth gate]
- [Source: _bmad-output/implementation-artifacts/14-4-mobile-sse-client-and-session-hooks.md — useSession hook that this story depends on]

## Dev Agent Record

### Agent Model Used

glm-5.1

### Debug Log References

### Completion Notes List

- Created `SkillCard` component with TouchableOpacity, resume badge, loading indicator, disabled state — follows established card pattern (borderRadius: 12, elevation: 1)
- Added `SKILL_LABELS` Portuguese display names constant to language-learning-defaults.ts
- Replaced placeholder in index.tsx with full skill selection grid using FlatList numColumns={2}
- AC-1: Shows 8 skill cards when configured && setupComplete
- AC-2: Auto-starts Setup session when setupComplete === false, navigates to session screen
- AC-3: Calls sessionRepo.startSession(skill) on tap, navigates to session screen
- AC-4: Checks getSessionStatus() on focus, shows "Retomar" badge on active skill, resumes on tap
- AC-5: Tapping different skill calls startSession(newSkill) — harness auto-ends old session
- Created minimal session.tsx placeholder for navigation testing
- All lint and type-check pass (no new errors)

### File List

- `src/components/language-learning/skill-card.tsx` — NEW: Skill selection card component
- `src/components/language-learning/index.ts` — MODIFIED: Added SkillCard export
- `src/constants/language-learning-defaults.ts` — MODIFIED: Added SKILL_LABELS constant
- `src/app/(app)/(language-learning)/index.tsx` — MODIFIED: Replaced placeholder with skill selection grid and all AC logic
- `src/app/(app)/(language-learning)/session.tsx` — NEW: Minimal placeholder for navigation testing

### Review Findings

- [x] [Review][Patch] Mandate 4 violation: `loadingSkill` and `activeSkill` use local `useState` instead of `languageLearningStore` [index.tsx:28-29] — Mandate says "no local useState for session state or active session." Both must move to the store.
- [x] [Review][Patch] `handleSkillPress` error escalates to global `authError`, wiping the skill grid [index.tsx:138] — Transient per-skill failure shows error screen instead of staying on grid. Should use a per-skill/local error or separate store field.
- [x] [Review][Patch] `loadingSkill` leaks after successful navigation or auto-setup cancellation [index.tsx:85-101] — `mounted.current` becomes false on blur, `finally` skips clearing. Fix: clear `loadingSkill` unconditionally in cleanup, or use per-callback cancelled flag for the finally guard.
- [x] [Review][Patch] Rapid tap on skill card fires duplicate concurrent sessions [index.tsx:122] — `disabled` prop allows re-tapping the loading skill itself. Add re-entry guard at top of `handleSkillPress`.
- [x] [Review][Patch] `addMessage` called in tight loop causes N sequential store mutations [index.tsx:127-129] — Batch messages into single store update when resuming.
- [x] [Review][Patch] `handleSkillPress` state updates and navigation fire without mount guard after await [index.tsx:130-136] — Add `mounted.current` check after each await before calling setState/router.
- [x] [Review][Defer] Unsafe `as LearningSkill` type assertion in session.tsx placeholder [session.tsx:15] — deferred, placeholder file replaced in story 14.6
- [x] [Review][Defer] No error boundary for async errors in skill press handler [index.tsx:122-144] — deferred, pre-existing architectural concern

### Change Log

- 2026-05-04: Implemented skill selection screen (Story 14-5) — all 5 ACs satisfied
- 2026-05-04: Code review — 6 patches, 2 deferred, 1 dismissed
