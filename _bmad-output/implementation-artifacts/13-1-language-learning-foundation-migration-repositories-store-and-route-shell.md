# Story 13.1: Language Learning Foundation — Migration, Repositories, Store & Route Shell

Status: ready-for-dev

## Story

As an admin,
I want the Language Learning module's data layer and route to exist,
so that future stories can build session management, WebSocket, and UI on top of a working foundation.

## Acceptance Criteria

1. Navigating to Language Learning loads the `(language-learning)` route group with a placeholder screen
2. Supabase migration creates `learning_profiles` table with all columns, constraints, and RLS policy
3. `ISessionRepository` (Pi HTTP) and `ILearningProfileRepository` (Supabase) interfaces + implementations exist and are registered in `RepositoryContext`
4. `LearningProfile`, `PiWebSocketMessage`, `LearningSkill`, `SessionStatus` types exist in `language-learning.types.ts`
5. `languageLearningStore` Zustand store exists with all required fields
6. `language-learning-defaults.ts` constants file exists with TTS timing and skills list
7. `.env.example` documents `PI_SESSION_URL` and `PI_WEBSOCKET_URL`
8. Packages `expo-speech`, `expo-speech-recognition`, and `react-native-webview` are installed

## Tasks / Subtasks

- [ ] Task 1: Install new packages (AC: #8)
  - [ ] `npx expo install expo-speech expo-speech-recognition react-native-webview`
- [ ] Task 2: Create Supabase migration (AC: #2)
  - [ ] Create `supabase/migrations/YYYYMMDD000000_language_learning_module.sql`
  - [ ] `learning_profiles` table with all columns (see schema below)
  - [ ] Constraints: `UNIQUE(user_account_id)`, `CHECK(preferred_input_method IN ('keyboard_and_mic', 'mic_only'))`
  - [ ] RLS policy: admins read/write own profile within same `family_id`
  - [ ] `updated_at` trigger (same pattern as existing tables)
- [ ] Task 3: Create types (AC: #4)
  - [ ] Create `src/types/language-learning.types.ts`
- [ ] Task 4: Create constants (AC: #6)
  - [ ] Create `src/constants/language-learning-defaults.ts`
- [ ] Task 5: Create repository interfaces (AC: #3)
  - [ ] Create `src/repositories/interfaces/session.repository.interface.ts`
  - [ ] Create `src/repositories/interfaces/learning-profile.repository.interface.ts`
- [ ] Task 6: Create repository implementations (AC: #3)
  - [ ] Create `src/repositories/supabase/session.repository.ts`
  - [ ] Create `src/repositories/supabase/learning-profile.repository.ts`
- [ ] Task 7: Register repositories in context (AC: #3)
  - [ ] Add `ISessionRepository` and `ILearningProfileRepository` to `src/repositories/repository.context.tsx`
- [ ] Task 8: Create Zustand store (AC: #5)
  - [ ] Create `src/stores/language-learning.store.ts`
- [ ] Task 9: Create route shell (AC: #1)
  - [ ] Create `src/app/(app)/(language-learning)/_layout.tsx` with Stack wrapper
  - [ ] Create `src/app/(app)/(language-learning)/index.tsx` placeholder screen
  - [ ] Add sidebar menu entry for Language Learning in `src/components/sidebar-menu.tsx`
- [ ] Task 10: Update env config (AC: #7)
  - [ ] Add `PI_SESSION_URL` and `PI_WEBSOCKET_URL` to `.env.example`
  - [ ] Add to `app.config.ts` extra config (same pattern as `SUPABASE_URL`)

## Dev Notes

### Database Schema

```sql
CREATE TABLE learning_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL REFERENCES families(id),
  user_account_id uuid NOT NULL REFERENCES user_accounts(id),
  setup_complete boolean NOT NULL DEFAULT false,
  claude_authenticated boolean NOT NULL DEFAULT false,
  goals text,
  preferred_input_method text NOT NULL DEFAULT 'keyboard_and_mic',
  level text NOT NULL DEFAULT 'beginner',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_account_id),
  CHECK (preferred_input_method IN ('keyboard_and_mic', 'mic_only'))
);

-- RLS
ALTER TABLE learning_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage own learning profile"
  ON learning_profiles FOR ALL
  USING (family_id = (SELECT family_id FROM user_accounts WHERE id = auth.uid()))
  WITH CHECK (family_id = (SELECT family_id FROM user_accounts WHERE id = auth.uid()));

-- updated_at trigger (reuse existing function)
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON learning_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

### Types to Create

```typescript
// src/types/language-learning.types.ts

export type LearningSkill = 'learn' | 'review' | 'vocab' | 'writing' | 'speaking' | 'reading' | 'progress' | 'setup';

export type InputMethod = 'keyboard_and_mic' | 'mic_only';

export type ConnectionStatus = 'connected' | 'disconnected' | 'reconnecting';

export interface LearningProfile {
  id: string;
  familyId: string;
  userAccountId: string;
  setupComplete: boolean;
  claudeAuthenticated: boolean;
  goals: string | null;
  preferredInputMethod: InputMethod;
  level: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SessionStatus {
  active: boolean;
  skill: LearningSkill | null;
}

export type PiWebSocketMessage =
  | { type: 'speak'; phrases: string[] }
  | { type: 'signal'; name: 'setup-complete' | 'skill-complete' }
  | { type: 'terminal'; content: string };
```

### Constants to Create

```typescript
// src/constants/language-learning-defaults.ts

export const TTS_REPEAT_PAUSE = 800;   // ms between double-speak repetitions
export const TTS_PHRASE_PAUSE = 1200;  // ms between distinct phrases
export const DEFAULT_LEVEL = 'beginner';
export const DEFAULT_INPUT_METHOD = 'keyboard_and_mic';

export const SKILLS: { key: LearningSkill; label: string }[] = [
  { key: 'learn', label: 'Aprender' },
  { key: 'review', label: 'Rever' },
  { key: 'vocab', label: 'Vocabulário' },
  { key: 'writing', label: 'Escrita' },
  { key: 'speaking', label: 'Falar' },
  { key: 'reading', label: 'Leitura' },
  { key: 'progress', label: 'Progresso' },
];
```

### ISessionRepository Interface

Wraps Pi HTTP REST calls. Base URL from `PI_SESSION_URL` env var.

```typescript
// src/repositories/interfaces/session.repository.interface.ts

export interface ISessionRepository {
  start(userId: string, skill: LearningSkill): Promise<void>;
  resume(userId: string): Promise<void>;
  end(userId: string): Promise<void>;
  status(userId: string): Promise<SessionStatus>;
  authLogin(userId: string): Promise<string>; // returns OAuth URL
}
```

Implementation: HTTP fetch calls to Pi endpoints. NOT Supabase — this talks to the Pi session service directly.

```
POST /session/start?userId=X&skill=Y
POST /session/resume?userId=X
POST /session/end?userId=X
GET  /session/status?userId=X
POST /auth/login?userId=X  → returns { url: string }
```

### ILearningProfileRepository Interface

Standard Supabase CRUD — same pattern as all other repos.

```typescript
// src/repositories/interfaces/learning-profile.repository.interface.ts

export interface ILearningProfileRepository {
  getByUserId(userId: string): Promise<LearningProfile | null>;
  create(familyId: string, userAccountId: string): Promise<LearningProfile>;
  update(id: string, data: Partial<Pick<LearningProfile, 'setupComplete' | 'claudeAuthenticated' | 'goals' | 'preferredInputMethod' | 'level'>>): Promise<LearningProfile>;
}
```

### Zustand Store

```typescript
// src/stores/language-learning.store.ts

interface LanguageLearningState {
  connectionStatus: ConnectionStatus;
  activeSession: { skill: LearningSkill } | null;
  ttsQueue: string[];
  terminalOutput: string[];
  isSpeaking: boolean;
  isListening: boolean;
  // actions
  setConnectionStatus: (status: ConnectionStatus) => void;
  setActiveSession: (session: { skill: LearningSkill } | null) => void;
  enqueueTts: (phrases: string[]) => void;
  dequeueTts: () => string | undefined;
  clearTtsQueue: () => void;
  appendTerminalOutput: (content: string) => void;
  clearTerminalOutput: () => void;
  setIsSpeaking: (value: boolean) => void;
  setIsListening: (value: boolean) => void;
}
```

### Repository Registration Pattern

Follow exact pattern in `src/repositories/repository.context.tsx`:
1. Import the interface type and implementation class
2. Add to `RepositoryContextValue` type
3. Instantiate in `RepositoryProvider` using `useMemo`
4. Add to context value object

### Route Shell Pattern

The `(language-learning)` group uses a Stack layout (not Tabs), same as `(vacations)`:

```typescript
// src/app/(app)/(language-learning)/_layout.tsx
import { Stack } from 'expo-router';
export default function LanguageLearningLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
```

Placeholder `index.tsx` — simple screen with "Language Learning" title, will be replaced in Story 14.3.

### Sidebar Menu Entry

Add to `src/components/sidebar-menu.tsx` following existing pattern (Shopping, Meal Plan entries). Use icon `translate` or `school` from react-native-paper icons. Route: `/(language-learning)`.

### Environment Config Pattern

In `app.config.ts`, add to the `extra` object:

```typescript
extra: {
  ...existing,
  piSessionUrl: process.env.PI_SESSION_URL,
  piWebsocketUrl: process.env.PI_WEBSOCKET_URL,
}
```

Access in code via `Constants.expoConfig?.extra?.piSessionUrl`.

### Architecture Compliance

- **snake_case ↔ camelCase boundary**: `learning_profiles` columns are `snake_case` in DB, `camelCase` in TypeScript types. Conversion happens in `learning-profile.repository.ts` only.
- **Repository pattern (NFR17)**: Zero Pi/Supabase calls outside repositories.
- **File naming**: All files `kebab-case` (e.g., `session.repository.ts`, `language-learning.types.ts`).
- **No `src/services/` folder yet** — that's created in Story 13.2 (WebSocket service). Don't create it here.

### What This Story Does NOT Include

- No WebSocket service (Story 13.2)
- No session lifecycle UI (Story 13.3)
- No onboarding screens (Epic 14)
- No TTS/STT (Epics 15–16)
- No Pi-side code (separate repo entirely)

### Project Structure Notes

- All paths follow existing conventions in `src/`
- Route group `(language-learning)` follows pattern of `(leftovers)`, `(shopping)`, `(meal-plan)`
- Repository context is the single registration point — no other DI mechanism

### References

- [Source: _bmad-output/planning-artifacts/architecture.md — §1c V4 Language Learning Data Architecture]
- [Source: _bmad-output/planning-artifacts/architecture.md — §4 API & Communication, V4 Communication Layer]
- [Source: _bmad-output/planning-artifacts/epics-v4-language-learning.md — Story 13.1]
- [Source: _bmad-output/planning-artifacts/prd.md — FR100-FR103, FR114]

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
