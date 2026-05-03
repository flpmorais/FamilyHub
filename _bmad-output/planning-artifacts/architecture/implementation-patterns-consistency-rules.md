# Implementation Patterns & Consistency Rules

## Naming Patterns

**Database (PostgreSQL / Supabase):**

| Element | Convention | Example |
|---|---|---|
| Tables | `snake_case`, plural | `packing_items`, `user_accounts`, `booking_tasks` |
| Columns | `snake_case` | `family_id`, `updated_at`, `display_name` |
| Foreign keys | `{referenced_singular}_id` | `vacation_id`, `profile_id`, `family_id` |
| Timestamps | Always `created_at`, `updated_at` | Never `ts`, `date`, `createdAt` |
| Indexes | `idx_{table}_{column(s)}` | `idx_packing_items_vacation_id` |
| Enum types | `snake_case` | `packing_status`, `vacation_lifecycle` |

**TypeScript / React Native:**

| Element | Convention | Example |
|---|---|---|
| Files | `kebab-case` | `packing-item.repository.ts`, `vacation-card.tsx` |
| Components | `PascalCase` | `PackingItemCard`, `StatusCountPill` |
| Functions/variables | `camelCase` | `getPackingItems`, `activeVacationId` |
| Interfaces | `I` prefix | `IPackingItemRepository`, `IAuthRepository` |
| Types | `PascalCase`, no prefix | `PackingItem`, `VacationLifecycle` |
| Constants | `SCREAMING_SNAKE_CASE` | `BOOKING_DEADLINES`, `STATUS_COLOURS` |
| Zustand stores | `{domain}Store` | `packingStore`, `authStore`, `vacationStore` |

**Expo Router:**

| Element | Convention | Example |
|---|---|---|
| Route files | `kebab-case` | `packing-list.tsx`, `booking-tasks.tsx` |
| Route groups | `(group-name)` | `(auth)`, `(app)` |
| Dynamic segments | `[paramName].tsx` | `[vacationId].tsx` |

---

## Structure Patterns

**Tests:** Co-located with source files as `{filename}.test.ts` — no `__tests__/` root directory.

**Repository interface + implementation:**
```
src/repositories/
  interfaces/auth.repository.interface.ts    ← defines IAuthRepository
  supabase/auth.repository.ts                ← implements IAuthRepository
```
Never import a Supabase implementation directly — always inject via Context.

**Components:** One component per file. Component file contains the component, its local types, and its local styles (extract to `.styles.ts` only if styles exceed ~50 lines). Barrel exports via `index.ts` in each feature folder.

**Constants:** All `PackingStatus` → colour mappings in `src/constants/status-colours.ts`. All booking deadline values in `src/constants/booking-deadlines.ts`. No inline magic numbers or colour hex strings in component files.

---

## Format Patterns

**Status / lifecycle string literals — canonical values:**

```ts
type PackingStatus = 'new' | 'buy' | 'ready' | 'issue' | 'last_minute' | 'packed';
type VacationLifecycle = 'planning' | 'upcoming' | 'active' | 'completed';
type LeftoverStatus = 'active' | 'closed';  // (V2)
type RecipeType = 'meal' | 'main' | 'side' | 'soup' | 'dessert' | 'other';  // (V5) — shared with MealType
type RecipeImportMethod = 'manual' | 'url' | 'youtube' | 'ocr';  // (V5)
type UserRole = 'admin' | 'maid';
```

Stored as-is in PostgreSQL (`text` with check constraint or PostgreSQL enum). No integer codes anywhere.

**Date / time:**
- Storage: `timestamptz` ISO 8601 strings in PostgreSQL
- In-app: JavaScript `Date` objects — conversion at repository boundary (parse on read, serialize on write)
- Display: `Intl.DateTimeFormat` with `pt-PT` locale
- Never store Unix epoch integers in PostgreSQL

**snake_case ↔ camelCase boundary:** PostgreSQL columns are `snake_case`. TypeScript domain types are `camelCase`. Conversion happens exclusively in the repository layer — `snake_case` never leaks into stores or components.

**Error type thrown by repositories:**
```ts
class RepositoryError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly cause?: unknown
  ) { super(message); }
}
```
Repositories throw `RepositoryError` — never return `null` for errors, never leak raw Supabase error objects.

**Supabase response handling:**
```ts
const { data, error } = await supabase.from('packing_items').select(...);
if (error) throw new RepositoryError(error.message, error.code, error);
return mapToDomain(data);  // snake_case → camelCase conversion here
```

---

## Communication Patterns

**State management boundary:**

| Data type | Where it lives | Access pattern |
|---|---|---|
| List/detail data (items, vacations) | Zustand store (fetched from Supabase) | `useStore()` selector |
| Real-time updates | Supabase Realtime → Zustand store | Subscription callback updates store |
| UI state (filters, selection) | Zustand store | `useStore()` selector |
| Auth session | Zustand `authStore` | `useAuthStore()` |
| Global UI flags | Zustand `uiStore` | `useUiStore()` |
| **(V4)** Pi connection, TTS, terminal | Zustand `languageLearningStore` | `useLanguageLearningStore()` |
| **(V4)** WebSocket messages | `WebSocketService` via context | `useWebSocket()` hook |

**Zustand update pattern:** Always immutable — `set(state => ({ ...state, field: value }))`. Never mutate state directly.

**Loading / error state naming (consistent across all stores):**
```ts
isLoading: boolean;    // NOT loading, isFetching, pending
error: string | null;  // NOT errorMessage, err, hasError
```

**Component prop naming:**
- Event handlers: `on{Event}` — `onStatusChange`, `onItemPress`, `onDelete`
- Boolean props: `is{State}` or `has{Feature}` — `isSelected`, `hasError`, `isPinned`

---

## Process Patterns

**Auth guard:** Single `useAuthGuard()` hook at the layout level for `(app)` route group. Never duplicate auth checks in individual screens.

**Console logging:** `if (__DEV__) console.error(...)` — never in production paths.

**User-facing error messages:** Plain Portuguese strings — not technical error codes. Errors displayed in UI are always localized.

**(V4) Pi connection lifecycle:**
- WebSocket connects on entering `(language-learning)` route group
- Auto-reconnect with exponential backoff (1s, 2s, 4s, max 10s)
- `connectionStatus` in `languageLearningStore` reflects state at all times (FR115)
- Disconnect on leaving `(language-learning)` route group

**(V4) Session lifecycle:**
- `start` → session active → `end` (or killed by starting a different skill)
- Resume offered only for the same skill (FR110)
- Skill-complete signal auto-calls `end` and returns to skill selection (FR116)

**(V4) API key configuration gate:**
- On entering Language Learning, check `learning_profiles.api_key_configured` from Supabase
- If `false` or no record: show API key setup screen — user enters their OpenCode Zen/Go API key
- On submission: `ISessionRepository.configure(userId, apiKey)` → Pi validates key, writes auth.json, provisions environment
- If `true`: proceed directly to skill selection
- After setup completes: create/update learning profile in Supabase with `api_key_configured = true`, navigate to skill menu

**(V4) TTS queue:**
- Messages arrive asynchronously from WebSocket — each `speak` message may contain multiple phrases
- Playback is serial: speak phrase → 0.8s pause → speak same phrase again → 1.2s pause → next phrase (NFR30)
- No concurrent speech — queue processes one phrase at a time

**(V4) WebSocket message handling:**
- All messages use discriminated union pattern — `switch (message.type)`
- No string comparisons scattered across components

**(V5) Recipe import pipeline:**
- All import paths (URL, YouTube, OCR) follow the same flow: extract raw content → send to LLM → present structured result for review → save on admin confirmation
- Import is async with loading state in `recipesStore` — UI shows progress indicator
- LLM failures are non-blocking — admin is informed and can retry or enter manually (FR127)
- YouTube transcript fallback to comments is automatic — no user intervention needed (FR126)

**(V5) Servings scaling:**
- Scaling is a pure function: `scaleQuantity(originalQty, originalServings, targetServings)`
- Extracts numeric portion from free-text quantity via regex (`/^(\d+\.?\d*)/`)
- Non-numeric quantities (e.g., "q.b.", "a pinch") are returned unchanged
- Scaling is view-time only — original recipe data is never modified (FR136)
- Applied both in recipe detail view and in shopping list generation

**(V5) Shopping list generation:**
- Triggered from meal plan view — reads all `meal_slot_recipes` for the displayed week
- For each linked recipe: fetch ingredients, apply servings scaling
- Aggregate by ingredient name (exact case-insensitive match) — sum numeric quantities
- Present review screen (all unchecked by default)
- On confirm: merge checked items into shopping list via `IShoppingRepository`
- Dedup logic: existing ticked → untick + update qty; existing unticked → update qty; not present → create new

**(V5) Recipe sharing (PDF):**
- HTML template rendered with recipe data → `react-native-html-to-pdf` → `react-native-share`
- Template is a single HTML string in `src/constants/recipe-pdf-template.ts` — no external dependencies
- Runs entirely on-device — no network call, no cost

**(V5) CAMERA permission:**
- Requested on first photo OCR import attempt — not at module entry or app launch
- Uses `expo-image-picker` for gallery selection (no permission needed) or `expo-camera` for capture (CAMERA permission required)

---

## Enforcement Summary

All agents implementing FamilyHub MUST:

1. Use `snake_case` for all database identifiers; `camelCase` for all TypeScript identifiers
2. Never call Supabase SDK directly in screens, hooks, or stores — only through repository interfaces
3. Perform all `snake_case` ↔ `camelCase` conversion exclusively in the repository layer
4. Use Zustand stores for all state; Supabase Realtime subscriptions for live updates
5. Store all status/lifecycle/role values as lowercase string literals — no integer codes
6. Co-locate tests with source files — no `__tests__/` root directory
7. Use `pt-PT` locale for all date/time display in the UI
8. Place all colour constants, deadline values, and TTS timing in `src/constants/` — no inline values in components
9. **(V4)** Never call Pi session service directly in screens or hooks — only through `ISessionRepository`
10. **(V4)** Use `WebSocketService` via context — never instantiate raw WebSocket connections
11. **(V4)** Handle all WebSocket messages through the discriminated union switch pattern
12. **(V4)** Harness code lives in `harness/` within the FamilyHub repo — Python backend alongside the React Native mobile app
13. **(V4)** Request `RECORD_AUDIO` permission on first mic tap, not at app launch or module entry
14. **(V4)** API keys submitted through the app are transmitted over HTTPS and stored in per-user auth.json files with owner-only permissions
15. **(V5)** All recipe imports go through `IRecipeImportRepository` → `ILlmRepository` — never call LLM APIs directly
15. **(V5)** Recipe scaling is a pure function — never modify original recipe data, always compute at view-time
16. **(V5)** Shopping list generation runs client-side — no Supabase Edge Function or server-side aggregation
17. **(V5)** Request `CAMERA` permission on first photo OCR import, not at module entry

---
