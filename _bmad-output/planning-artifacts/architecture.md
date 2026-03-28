---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
lastStep: 8
status: 'complete'
completedAt: '2026-03-25'
v2EditedAt: '2026-03-27'
v2EditSummary: 'Extended architecture for V2 Leftovers module (FR44-FR57, NFR23)'
inputDocuments: ['_bmad-output/planning-artifacts/prd.md', '_bmad-output/planning-artifacts/ux-design-specification.md', '_bmad-output/planning-artifacts/product-brief-FamilyHub-2026-03-24.md']
workflowType: 'architecture'
project_name: 'FamilyHub'
user_name: 'Filipe'
date: '2026-03-25'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

---

## Project Context Analysis

### Requirements Overview

**Functional Requirements:** 65 total (FR1–FR65). V1 scope covers FR1–FR40. V2 scope covers FR44–FR57.

Ten capability areas:
1. Identity & Access Management (FR1–FR4) — Google Sign-In, profile linking, admin invitation, maid revocation
2. Profile Management (FR5–FR8) — CRUD with name/avatar, profiles decoupled from accounts
3. Vacation Management (FR9–FR15) — full CRUD, lifecycle, household-wide pinning
4. Booking Tasks (FR16–FR21) — auto-generated tasks, document check with child task generation, urgency sorting
5. Packing List (FR22–FR27) — six-status items, quantity, profile assignment, real-time sync
6. Categories/Tags/Templates (FR28–FR33) — user-defined vocab, reusable templates with participant filtering
7. Dashboard (FR34–FR36) — pinned widgets, booking task urgency, leftovers widget (V2)
8. Data Sync & Offline (FR37–FR40) — offline-first, sync queue, last-write-wins, OTA check
9. Data Privacy (FR41–FR43) — RLS-enforced privacy (V4+)
10. **(V2) Leftovers Management (FR44–FR57)** — leftover CRUD with dose tracking, eaten/thrown-out counters, per-item configurable expiry (default 5 days), auto-close on zero remaining, expired item visual flagging, dashboard widget (meals + doses + nearest expiry), full list with active/closed sorting, infinite scroll, offline sync
11. Future modules (FR58–FR65) — V3–V6 shopping, finances, maid, recipes

**Non-Functional Requirements:** 23 total (NFR1–NFR23). Key architectural drivers:
- Cold start <2s, offline load <1s, real-time sync <3s (NFR1–NFR5)
- TLS 1.2+, secure credential storage, RLS-enforced privacy (NFR6–NFR12)
- Sync queue survives app restarts, no silent data loss (NFR13–NFR15)
- Repository pattern — all external services behind swappable interface (NFR21)
- No onboarding wizard (NFR22)
- (V2) Expiry calculations correct on device-local time, including offline (NFR23)

**Scale & Complexity:**

- Primary domain: Android-first cross-platform mobile, full-stack client-heavy
- Complexity level: **Low-Medium** — small user base, no regulatory overhead — with two hard technical constraints: offline-first + real-time sync simultaneously, and framework selection as a V1 blocker
- Estimated architectural components: ~8 (Auth, Local DB, Sync Engine, Supabase Client, Realtime, Profile/Vacation/Packing repositories, OTA check)

---

### Technical Constraints & Dependencies

| Constraint | Source | Impact |
|---|---|---|
| Supabase (PostgreSQL, free tier) | Confirmed | Backend, auth, RLS, realtime |
| Google Sign-In | Confirmed | Auth provider — no passwords stored |
| Repository pattern (mandatory) | NFR21 | Every external service behind swappable module interface |
| Android-first, APK sideload | PRD | Private keystore, no Play Store |
| Offline-first, last-write-wins | FR37–FR39, NFR13–NFR15 | Local DB + sync queue + conflict resolution from day 1 |
| Real-time sync between admins | FR27, NFR3 (<3s) | Supabase Realtime subscription required |
| OTA update check | FR40 | Version manifest or Expo EAS Update |
| Flutter / React Native / Expo | **Open — V1 blocker** | Determines offline library, M3 path, OTA, APK toolchain |
| Material Design 3 | UX Spec | Flutter native M3 or `react-native-paper` |
| WCAG AA, TalkBack | UX Spec | Semantic grouping, 48dp touch targets, no colour-only status |
| Minimum Android 8.0 (API 26) | PRD | SQLite guaranteed, modern crypto APIs available |
| RLS enforcement | NFR10–NFR11, FR41–FR43 | Privacy at DB layer — V4+ required, V1 schema must anticipate |

---

### Cross-Cutting Concerns Identified

1. **Offline-first + real-time sync coexistence** — Local SQLite must be the UI source of truth while Supabase Realtime pushes changes from other devices. The sync engine must reconcile both directions. PowerSync or a custom layer built on Supabase Realtime + SQLite are the two candidate approaches.

2. **Repository pattern enforcement** — Every service (Supabase, Google Sign-In, future Drive/Calendar/AI) lives behind a typed interface. Business logic has zero direct dependency on any vendor SDK. This is an architecture-level constraint affecting folder structure and module boundaries.

3. **Profile ↔ Account decoupling** — Aurora and Isabel exist as Profiles without accounts. The data model must separate `profile` (name, avatar, family membership) from `user_account` (Google ID, email, role). Profiles are referenced by packing items, templates, etc.

4. **RLS design from V1** — Private envelopes and maid isolation are V4/V5 concerns but the Supabase schema and RLS policies must be designed with those boundaries in mind from V1. Retrofitting RLS is painful.

5. **Framework selection** — Flutter vs Expo/React Native determines: offline library, M3 implementation path, OTA mechanism, APK build toolchain, and sync engine options. First architectural decision to resolve.

6. **Custom component layer** — 6 bespoke UI components (SwipeableItemWrapper, PackingItemCard, StatusCountPill, StatusBadge, PackingCompletionState, CategoryCompletionIndicator) define the interaction contract used across all list-based modules V1–V6.

7. **(V2) Expiry calculation locality** — leftover expiry dates are computed as `date_added + expiry_days`. Visual flagging (expired = red) must evaluate against device-local time, not server time. This must work correctly offline (NFR23). The calculation is pure — no server round-trip needed.

---

## Starter Template Evaluation

### Primary Technology Domain

Cross-platform mobile app — Android-first, private APK sideload, offline-first with real-time sync.

### Framework Decision: Expo vs Flutter

| Factor | Expo (React Native) | Flutter |
|---|---|---|
| Language | TypeScript (web-familiar) | Dart (new language to learn) |
| M3 implementation | `react-native-paper` v5 — full M3 ✓ | Native Flutter M3 — first-class ✓ |
| Offline-first (PowerSync) | `@powersync/react-native` v1.29.0 ✓ | `powersync` Flutter v1.17.0 ✓ |
| OTA updates | **EAS Update (native to Expo)** — JS layer, no APK rebuild | Custom version manifest only |
| Private APK | EAS Build `"distribution": "internal"` ✓ | `flutter build apk` ✓ |
| Supabase SDK | `@supabase/supabase-js` v2 — primary SDK, best maintained ✓ | Flutter SDK — good but secondary |
| Solo dev speed | Fastest bootstrap, large ecosystem | Steeper initial setup |

### Selected Starter: Expo SDK 55 + TypeScript

**Rationale:** EAS Update is native to Expo and the cleanest OTA solution for sideloaded APKs. PowerSync React Native SDK (v1.29.0) is the most documented path for offline-first Supabase apps. TypeScript aligns with JavaScript-adjacent prior experience. Flutter's M3 is marginally more native but the Expo path is lower-risk for a solo developer.

**Initialization Command:**

```bash
npx create-expo-app@latest familyhub --template blank-typescript
```

**Core packages to add immediately:**

```bash
npx expo install expo-router expo-secure-store expo-updates
npx expo install @supabase/supabase-js @react-native-google-signin/google-signin
npx expo install @powersync/react-native react-native-gesture-handler react-native-reanimated
npm install react-native-paper react-native-safe-area-context
```

**Architectural Decisions Provided by Starter:**

**Language & Runtime:** TypeScript strict mode — React Native via Expo Managed Workflow SDK 55

**Routing:** Expo Router (file-based routing, recommended for SDK 55+)

**OTA Updates:** `expo-updates` + EAS Update — JS bundle updates without APK rebuild

**Build/APK:** EAS Build with `"distribution": "internal"`, `"buildType": "apk"` for private sideload

**Styling/UI:** `react-native-paper` v5 — full Material Design 3 implementation

**Offline Sync:** PowerSync `@powersync/react-native` v1.29.0 — offline-first with Supabase backend

**Backend:** `@supabase/supabase-js` v2

**Auth:** `@react-native-google-signin/google-signin` + Supabase Auth

**Secure Storage:** `expo-secure-store` (session tokens, private keystore)

**Gestures:** `react-native-gesture-handler` + `react-native-reanimated` (required for `SwipeableItemWrapper`)

**Testing:** Jest (included in Expo template)

**Code Organisation:** Feature-based folders under `src/` with repository pattern service modules

**Note:** Project initialisation using the above commands is the first implementation story (Epic 0 / Story 1).

---

## Core Architectural Decisions

### 1. Data Architecture

**Local Database — SQLite Adapter: `@op-engineering/op-sqlite`**

Chosen over `expo-sqlite` for PowerSync compatibility and significantly better performance on Android (JSI-based, no bridge overhead). PowerSync requires a compatible SQLite adapter — `@op-engineering/op-sqlite` is the recommended adapter in PowerSync React Native documentation.

**Sync Engine: PowerSync `@powersync/react-native` v1.29.0**

PowerSync manages the full offline-first sync cycle: local SQLite as the UI source of truth, sync queue that survives app restarts, and automatic reconciliation with Supabase PostgreSQL. Conflict resolution strategy: **last-write-wins** based on `updated_at` timestamp (FR38–FR39). PowerSync handles the Supabase Realtime subscription internally — no manual Supabase Realtime wiring required.

**Schema Strategy: `family_id` on every table + RLS from V1**

Every table carries a `family_id` foreign key. RLS policies enforced at the PostgreSQL layer from the first migration. V1 policies are permissive (admin-only family), but the policy structure anticipates V4 private envelopes and V5 maid isolation — retrofitting RLS is far more painful than designing for it upfront.

**Migrations: Supabase CLI (`supabase/migrations/`)**

All schema changes via `supabase migration new` → apply with `supabase db push`. Migration files committed to git. No manual schema edits in the Supabase dashboard.

---

### 1b. (V2) Leftovers Data Architecture

**`leftovers` table — Supabase PostgreSQL:**

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | Default `gen_random_uuid()` |
| `family_id` | `uuid` FK → `families.id` | RLS-enforced, same pattern as all V1 tables |
| `name` | `text` NOT NULL | e.g., "Lasagna", "Coq au vin" |
| `total_doses` | `integer` NOT NULL | Set at creation, editable while active |
| `doses_eaten` | `integer` NOT NULL DEFAULT 0 | Incremented one at a time (FR46) |
| `doses_thrown_out` | `integer` NOT NULL DEFAULT 0 | Set to remaining on throw-out (FR47) |
| `expiry_days` | `integer` NOT NULL DEFAULT 5 | Configurable per item (FR44) |
| `date_added` | `timestamptz` NOT NULL | Auto-set to `now()` on creation (FR45) |
| `expiry_date` | `timestamptz` NOT NULL | Computed: `date_added + expiry_days * interval '1 day'` (FR45) |
| `status` | `text` NOT NULL DEFAULT 'active' | `'active'` or `'closed'` — check constraint |
| `created_at` | `timestamptz` NOT NULL DEFAULT `now()` | Standard audit column |
| `updated_at` | `timestamptz` NOT NULL DEFAULT `now()` | Standard audit column, trigger-updated |

**Constraints:**
- `CHECK (doses_eaten + doses_thrown_out <= total_doses)` (FR48)
- `CHECK (total_doses > 0)`
- `CHECK (expiry_days > 0)`
- `CHECK (status IN ('active', 'closed'))`

**Auto-close logic (FR49):** When `doses_eaten + doses_thrown_out = total_doses`, `status` is set to `'closed'`. This is enforced in the repository layer (not a database trigger) — the repository sets `status = 'closed'` in the same write that updates the dose counters.

**Expiry flagging (FR52, NFR23):** Evaluated client-side by comparing `expiry_date` against device-local `Date.now()`. No server-side cron or trigger. Works offline by design.

**Migration: `supabase/migrations/20260327000001_leftovers_module.sql`**
- Creates `leftovers` table with all columns and constraints above
- Adds RLS policy: admins in the same `family_id` can read/write all leftovers
- Adds index: `idx_leftovers_family_id_status` for dashboard widget queries

**PowerSync schema update:** Add `leftovers` table to `utils/powersync.schema.ts` in the same commit as the migration (existing coupled-pair rule applies).

---

### 2. Auth & Security

**Auth Flow: Google Sign-In → Supabase Auth → expo-secure-store**

1. `@react-native-google-signin/google-signin` handles the Google OAuth flow
2. Google ID token passed to `supabase.auth.signInWithIdToken()` — Supabase issues a JWT session
3. Session stored in `expo-secure-store` (encrypted, not AsyncStorage)
4. `AuthRepository` interface wraps the entire flow — zero direct SDK calls in business logic

**Profile ↔ Account Decoupling:**

- `user_account` table: `id`, `google_id`, `email`, `role` (admin | maid), `family_id`
- `profile` table: `id`, `display_name`, `avatar_url`, `family_id` — no `user_account` reference required
- Aurora and Isabel exist as Profiles without accounts. When they eventually get accounts, a `user_account.profile_id` foreign key links them — no data migration needed.

---

### 3. State Management

**Zustand + PowerSync `useQuery` hooks**

- **PowerSync `useQuery`**: Reactive SQLite queries — the component re-renders when underlying data changes (from local writes or synced remote changes). Used for all list and detail data (packing items, vacations, booking tasks).
- **Zustand stores**: UI state and non-persisted session state (selected filters, active vacation ID, auth session, loading/error flags). Stores do not duplicate data already in SQLite — they hold only what PowerSync doesn't manage.
- No Redux, no Context API for data flow. Context API only for dependency injection (repository instances).

**Store boundaries:**

| Store | Responsibility |
|---|---|
| `authStore` | Session, user profile, loading/error state |
| `vacationStore` | Active vacation selection, filter state |
| `packingStore` | Status filter toggles, active item selection |
| `uiStore` | Global UI flags (offline banner, sync indicator) |
| `leftoversStore` | **(V2)** Active list scroll position, pagination cursor |

---

### 4. API & Communication

**Repository Pattern — Mandatory (NFR21)**

Every external service is accessed exclusively through a typed TypeScript interface. Implementations are injected via React Context — never imported directly in screens or hooks.

```
src/repositories/
  interfaces/
    auth.repository.interface.ts
    profile.repository.interface.ts
    vacation.repository.interface.ts
    packing-item.repository.interface.ts
    category.repository.interface.ts
    template.repository.interface.ts
    sync.repository.interface.ts
    ota.repository.interface.ts
    leftover.repository.interface.ts      ← (V2) ILeftoverRepository
  supabase/
    auth.repository.ts          ← implements IAuthRepository
    profile.repository.ts       ← implements IProfileRepository
    vacation.repository.ts      ← implements IVacationRepository
    packing-item.repository.ts  ← implements IPackingItemRepository
    category.repository.ts      ← implements ICategoryRepository
    template.repository.ts      ← implements ITemplateRepository
    sync.repository.ts          ← implements ISyncRepository
    ota.repository.ts           ← implements IOtaRepository
    leftover.repository.ts      ← (V2) implements ILeftoverRepository
```

Supabase client instance is created once and injected into repository implementations. Repositories are never instantiated more than once — singleton pattern via Context provider at app root. V2 adds `ILeftoverRepository` (9th repository) — same injection pattern.

**Real-time: PowerSync-managed**

PowerSync handles Supabase Realtime subscriptions internally. No manual `supabase.channel()` subscriptions needed. Packing list real-time sync (FR27, NFR3 <3s) and leftover sync (FR57, V2) are both covered by PowerSync's sync layer.

---

### 5. Infrastructure & Deployment

**Environments: Three EAS profiles**

| Profile | `eas.json` name | Backend | Notes |
|---|---|---|---|
| Development | `development` | Local / Supabase dev project | Expo Go / development build |
| Preview | `preview` | Supabase dev project | Internal APK for Angela to test |
| Production | `production` | Supabase prod project | Sideloaded APK, EAS Update channel |

Environment variables via `.env` files (`.env.development`, `.env.preview`, `.env.production`) + `app.config.ts` (dynamic config). Supabase URL and anon key are the only secrets required client-side — stored in `.env`, never hardcoded.

**OTA: EAS Update**

JS bundle updates pushed via `eas update --branch production` — no APK rebuild required for logic/UI changes. Native module changes (new Expo SDK version, new native dependency) still require a full EAS Build.

**CI/CD: Manual in V1**

No automated pipeline. Build and deploy commands run manually. This is revisited when the development cadence warrants automation.

**APK Distribution: Direct sideload**

`eas build --profile production --platform android` produces an `.apk`. Distributed to Angela via direct file transfer (no Play Store, no TestFlight). Private keystore managed by EAS (stored in EAS servers, backed up separately).

---

## Implementation Patterns & Consistency Rules

### Naming Patterns

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

### Structure Patterns

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

### Format Patterns

**Status / lifecycle string literals — canonical values:**

```ts
type PackingStatus = 'new' | 'buy' | 'ready' | 'issue' | 'last_minute' | 'packed';
type VacationLifecycle = 'planning' | 'upcoming' | 'active' | 'completed';
type LeftoverStatus = 'active' | 'closed';  // (V2)
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

### Communication Patterns

**State management boundary:**

| Data type | Where it lives | Access pattern |
|---|---|---|
| List/detail data (items, vacations) | PowerSync SQLite | `useQuery()` hook |
| UI state (filters, selection) | Zustand store | `useStore()` selector |
| Auth session | Zustand `authStore` | `useAuthStore()` |
| Global UI flags | Zustand `uiStore` | `useUiStore()` |

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

### Process Patterns

**Offline writes:** All writes go to SQLite first via PowerSync — never block UI on network. PowerSync queues sync automatically. Optimistic updates always.

**Auth guard:** Single `useAuthGuard()` hook at the layout level for `(app)` route group. Never duplicate auth checks in individual screens.

**Console logging:** `if (__DEV__) console.error(...)` — never in production paths.

**User-facing error messages:** Plain Portuguese strings — not technical error codes. Errors displayed in UI are always localized.

---

### Enforcement Summary

All agents implementing FamilyHub MUST:

1. Use `snake_case` for all database identifiers; `camelCase` for all TypeScript identifiers
2. Never call Supabase SDK directly in screens, hooks, or stores — only through repository interfaces
3. Perform all `snake_case` ↔ `camelCase` conversion exclusively in the repository layer
4. Use PowerSync `useQuery` for all reactive data; Zustand for UI state only
5. Store all status/lifecycle/role values as lowercase string literals — no integer codes
6. Co-locate tests with source files — no `__tests__/` root directory
7. Use `pt-PT` locale for all date/time display in the UI
8. Place all colour constants and deadline values in `src/constants/` — no inline values in components

---

## Project Structure & Boundaries

### Complete Project Directory Structure

```
familyhub/
├── app.config.ts               ← Dynamic Expo config (reads .env, injects into app.json)
├── app.json                    ← Static Expo metadata (name, slug, icon, permissions)
├── eas.json                    ← EAS Build/Update profiles (development/preview/production)
├── package.json
├── tsconfig.json               ← Strict TypeScript config
├── babel.config.js
├── .env.development            ← SUPABASE_URL + SUPABASE_ANON_KEY for dev project
├── .env.preview                ← SUPABASE_URL + SUPABASE_ANON_KEY for dev project
├── .env.production             ← SUPABASE_URL + SUPABASE_ANON_KEY for prod project
├── .env.example                ← Template committed to git (actual .env.* files git-ignored)
├── .gitignore
├── README.md
│
├── src/
│   │
│   ├── app/                    ← Expo Router file-based routing
│   │   ├── _layout.tsx         ← Root layout: RepositoryProvider + PowerSync provider
│   │   ├── (auth)/
│   │   │   ├── _layout.tsx     ← Redirect to (app) if session already exists
│   │   │   └── sign-in.tsx     ← Google Sign-In screen (FR1–FR3)
│   │   └── (app)/
│   │       ├── _layout.tsx     ← useAuthGuard + offline banner + FAB
│   │       ├── index.tsx       ← Dashboard screen (FR34–FR36)
│   │       ├── vacations/
│   │       │   ├── index.tsx   ← Vacation list screen (FR9–FR11)
│   │       │   ├── new.tsx     ← Create vacation + template picker (FR9, FR29–FR33)
│   │       │   └── [vacationId]/
│   │       │       ├── index.tsx         ← Packing list screen (FR22–FR27)
│   │       │       ├── edit.tsx          ← Edit vacation (FR10)
│   │       │       └── booking-tasks.tsx ← Booking task timeline (FR16–FR21)
│   │       ├── leftovers/              ← (V2) Leftovers module
│   │       │   └── index.tsx          ← Full leftovers list with infinite scroll (FR54–FR56)
│   │       └── settings/
│   │           └── index.tsx   ← Profile management + admin invite (FR5–FR8, FR3–FR4)
│   │
│   ├── components/
│   │   ├── common/
│   │   │   ├── offline-banner.tsx      ← Driven by uiStore.isOffline (FR37)
│   │   │   ├── sync-indicator.tsx      ← Driven by uiStore.syncStatus (FR37–FR38)
│   │   │   └── index.ts
│   │   ├── vacation/
│   │   │   ├── vacation-card.tsx       ← List card with lifecycle badge + pinned state
│   │   │   ├── vacation-lifecycle-badge.tsx
│   │   │   ├── booking-task-row.tsx    ← Row with urgency indicator (FR18–FR21)
│   │   │   └── index.ts
│   │   ├── packing/                   ← 6 custom components from UX spec
│   │   │   ├── swipeable-item-wrapper.tsx   ← Gesture handler wrap (FR23)
│   │   │   ├── packing-item-card.tsx        ← Card with StatusBadge + profile chip (FR22–FR24)
│   │   │   ├── status-count-pill.tsx        ← Header quick-filter pill (FR27)
│   │   │   ├── status-badge.tsx             ← Inline status indicator (FR22)
│   │   │   ├── packing-completion-state.tsx ← Empty/complete states (FR22)
│   │   │   ├── category-completion-indicator.tsx ← Category-level progress (FR28)
│   │   │   └── index.ts
│   │   └── leftovers/                 ← (V2) Leftovers components
│   │       ├── leftover-item-card.tsx       ← Card with dose counters, eaten/throw-out buttons (FR46–FR47)
│   │       ├── leftovers-widget.tsx          ← Dashboard widget: meals + doses + nearest expiry (FR53)
│   │       ├── leftover-add-form.tsx         ← Name, doses, expiry days input (FR44)
│   │       └── index.ts
│   │
│   ├── repositories/
│   │   ├── interfaces/
│   │   │   ├── auth.repository.interface.ts          ← IAuthRepository (FR1–FR4)
│   │   │   ├── profile.repository.interface.ts       ← IProfileRepository (FR5–FR8)
│   │   │   ├── vacation.repository.interface.ts      ← IVacationRepository (FR9–FR15)
│   │   │   ├── packing-item.repository.interface.ts  ← IPackingItemRepository (FR22–FR27)
│   │   │   ├── category.repository.interface.ts      ← ICategoryRepository (FR28–FR30)
│   │   │   ├── template.repository.interface.ts      ← ITemplateRepository (FR31–FR33)
│   │   │   ├── sync.repository.interface.ts          ← ISyncRepository (FR37–FR39)
│   │   │   ├── ota.repository.interface.ts           ← IOtaRepository (FR40)
│   │   │   └── leftover.repository.interface.ts     ← (V2) ILeftoverRepository (FR44–FR57)
│   │   ├── supabase/
│   │   │   ├── supabase.client.ts   ← Single Supabase client instance (created once)
│   │   │   ├── auth.repository.ts
│   │   │   ├── profile.repository.ts
│   │   │   ├── vacation.repository.ts   ← Also handles BookingTask CRUD
│   │   │   ├── packing-item.repository.ts
│   │   │   ├── category.repository.ts
│   │   │   ├── template.repository.ts
│   │   │   ├── sync.repository.ts       ← Starts/stops PowerSync connector
│   │   │   ├── ota.repository.ts        ← Calls expo-updates checkForUpdate
│   │   │   └── leftover.repository.ts   ← (V2) implements ILeftoverRepository
│   │   ├── repository.context.tsx       ← React Context — provides all 9 repositories (V2: +leftover)
│   │   └── index.ts                     ← Barrel: exports all interfaces
│   │
│   ├── stores/
│   │   ├── auth.store.ts       ← Session, UserAccount, isLoading, error
│   │   ├── vacation.store.ts   ← activeVacationId, isPinned state
│   │   ├── packing.store.ts    ← activeStatusFilters, selectedItemId
│   │   ├── leftovers.store.ts  ← (V2) pagination cursor, scroll position
│   │   └── ui.store.ts         ← isOffline, syncStatus, globalError
│   │
│   ├── hooks/
│   │   ├── use-auth-guard.ts       ← Redirects unauthenticated users to (auth)/sign-in
│   │   ├── use-repository.ts       ← Typed hook: pulls repositories from Context
│   │   ├── use-vacations.ts        ← PowerSync useQuery: vacation list
│   │   ├── use-packing-items.ts    ← PowerSync useQuery: items by vacation + filters
│   │   ├── use-booking-tasks.ts    ← PowerSync useQuery: tasks by vacation, sorted urgency
│   │   ├── use-leftovers.ts       ← (V2) PowerSync useQuery: active leftovers + widget aggregates
│   │   └── use-leftover-list.ts   ← (V2) PowerSync useQuery: all items with pagination (infinite scroll)
│   │
│   ├── types/
│   │   ├── vacation.types.ts   ← Vacation, VacationLifecycle, BookingTask, BookingTaskType
│   │   ├── packing.types.ts    ← PackingItem, PackingStatus, Category, Tag, Template
│   │   ├── profile.types.ts    ← Profile, UserAccount, UserRole, Family
│   │   ├── leftover.types.ts   ← (V2) Leftover, LeftoverStatus, LeftoverWidgetData
│   │   └── sync.types.ts       ← SyncStatus, PowerSync table schema types
│   │
│   ├── constants/
│   │   ├── status-colours.ts    ← PackingStatus → { bg, text, border } colour tokens
│   │   ├── booking-deadlines.ts ← FLIGHTS_DAYS=90, HOTEL_DAYS=60, CAR_DAYS=30, INSURANCE_DAYS=14
│   │   └── leftover-defaults.ts ← (V2) DEFAULT_EXPIRY_DAYS=5, PAGINATION_PAGE_SIZE
│   │
│   └── utils/
│       ├── date.utils.ts           ← pt-PT formatting, ISO 8601 ↔ Date conversion
│       ├── powersync.schema.ts     ← PowerSync SQLite schema (table definitions)
│       └── repository.error.ts     ← RepositoryError class
│
├── supabase/
│   ├── config.toml             ← Supabase CLI project config
│   ├── seed.sql                ← Initial family + profile rows (Filipe, Angela, Aurora, Isabel)
│   └── migrations/
│       ├── 20260325000001_initial_schema.sql   ← families, user_accounts, profiles + RLS
│       ├── 20260325000002_vacation_module.sql  ← vacations, booking_tasks + RLS
│       ├── 20260325000003_packing_module.sql   ← packing_items, categories, tags, templates + RLS
│       └── 20260327000001_leftovers_module.sql ← (V2) leftovers table + RLS + index
│
└── assets/
    ├── icon.png
    ├── splash.png
    └── adaptive-icon.png
```

---

### Architectural Boundaries

**Canonical data flow:**
```
User action
  → Component (PowerSync useQuery for reads / useRepository for writes)
  → IRepository interface
  → Supabase implementation (snake_case ↔ camelCase conversion boundary)
  → PostgreSQL (RLS enforced, family_id on every row)

Remote change (Angela's device writes)
  → Supabase PostgreSQL
  → PowerSync sync engine
  → Local SQLite update
  → PowerSync useQuery re-renders affected component
```

**Auth boundary:**
- `(auth)` group: accessible only without session → auto-redirected out if session exists
- `(app)` group: `useAuthGuard` in root `_layout.tsx` → redirects to `(auth)/sign-in` if no session
- PowerSync connector receives Supabase JWT from `authStore` — sync starts only after sign-in

**Repository boundary:**
- Zero Supabase SDK calls outside `src/repositories/supabase/`
- All 9 repository interfaces defined in `src/repositories/interfaces/` (V2: +ILeftoverRepository)
- `RepositoryContext` provides singleton instances — never instantiate repositories in components

**Sync boundary:**
- All writes route through PowerSync-managed SQLite — never call `supabase.from(...).insert/update/delete` directly in packing/vacation features
- `SyncRepository.start()` called once at app boot post-auth
- `uiStore.isOffline` set by PowerSync connection status callback

---

### FR Categories → Directory Mapping

| FR Category | Primary Locations |
|---|---|
| FR1–FR4 · Identity & Access | `(auth)/sign-in.tsx`, `repositories/supabase/auth.repository.ts`, `stores/auth.store.ts`, `migration_001` |
| FR5–FR8 · Profile Management | `settings/index.tsx`, `repositories/supabase/profile.repository.ts`, `types/profile.types.ts` |
| FR9–FR15 · Vacation Management | `vacations/index.tsx`, `vacations/new.tsx`, `vacations/[vacationId]/index.tsx`, `vacation.repository.ts`, `stores/vacation.store.ts` |
| FR16–FR21 · Booking Tasks | `vacations/[vacationId]/booking-tasks.tsx`, `vacation.repository.ts` (booking methods), `components/vacation/booking-task-row.tsx`, `constants/booking-deadlines.ts` |
| FR22–FR27 · Packing List | `vacations/[vacationId]/index.tsx`, `packing-item.repository.ts`, `stores/packing.store.ts`, `components/packing/` (all 6) |
| FR28–FR33 · Categories/Tags/Templates | `category.repository.ts`, `template.repository.ts`, `vacations/new.tsx` (template picker), `types/packing.types.ts` |
| FR34–FR36 · Dashboard | `(app)/index.tsx`, `components/vacation/vacation-card.tsx` |
| FR37–FR40 · Sync & OTA | `utils/powersync.schema.ts`, `sync.repository.ts`, `ota.repository.ts`, `stores/ui.store.ts`, `hooks/use-*.ts` |
| FR44–FR57 · **(V2) Leftovers** | `leftovers/index.tsx`, `leftover.repository.ts`, `stores/leftovers.store.ts`, `components/leftovers/` (3), `hooks/use-leftovers.ts`, `hooks/use-leftover-list.ts`, `types/leftover.types.ts`, `constants/leftover-defaults.ts`, `migration_004` |

---

## Architecture Validation Results

### Coherence Validation ✅

**Decision Compatibility:** All library versions are mutually compatible. PowerSync v1.29.0 + Expo SDK 55 + `@op-engineering/op-sqlite` is a verified combination documented in PowerSync's own React Native guides. `react-native-paper` v5, `react-native-gesture-handler`, and `react-native-reanimated` are all Expo SDK 55 compatible. Expo Router v3 is the standard routing layer for SDK 55+.

> ⚠️ **Critical implementation note:** `@op-engineering/op-sqlite` is a native module. **Expo Go cannot be used for this project.** Development requires a development build — either `expo run:android` (local) or EAS Build `development` profile with `expo-dev-client`. This must be the first thing any implementing agent knows.

**Pattern Consistency:** Repository pattern applied uniformly across all 8 domains. The `snake_case` ↔ `camelCase` conversion boundary exists in exactly one place (repository layer). Zustand and PowerSync responsibilities are non-overlapping and clearly scoped. No contradictory decisions found.

**Structure Alignment:** Expo Router `(auth)` / `(app)` group structure maps exactly to the auth boundary decisions. `RepositoryContext` at root `_layout.tsx` provides singleton injection to the full app tree. `src/constants/` for colour tokens and deadline values is consistently referenced across patterns, structure, and component definitions.

---

### Requirements Coverage Validation ✅

**Functional Requirements — all 40 V1 FRs + 14 V2 FRs covered:**

| FR Group | Architectural Support |
|---|---|
| FR1–FR4 · IAM | `AuthRepository` + `(auth)/sign-in.tsx` + `authStore` + `migration_001` ✅ |
| FR5–FR8 · Profiles | `ProfileRepository` + `settings/index.tsx` + `profile.types.ts` ✅ |
| FR9–FR15 · Vacations | `VacationRepository` + vacation screens + `vacationStore` ✅ |
| FR16–FR21 · Booking Tasks | `VacationRepository` (booking methods) + `booking-tasks.tsx` + `booking-deadlines.ts` ✅ |
| FR22–FR27 · Packing List | `PackingItemRepository` + packing screen + 6 custom components + `packingStore` ✅ |
| FR28–FR33 · Categories/Tags/Templates | `CategoryRepository` + `TemplateRepository` + template picker in `vacations/new.tsx` ✅ |
| FR34–FR36 · Dashboard | `(app)/index.tsx` + `VacationCard` component ✅ |
| FR37–FR40 · Sync & OTA | PowerSync schema + `SyncRepository` + `OtaRepository` + `uiStore` ✅ |
| FR44–FR57 · **(V2) Leftovers** | `LeftoverRepository` + leftovers screen + 3 components + `leftoversStore` + `leftover-defaults.ts` + `migration_004` ✅ |

**Non-Functional Requirements:**

| NFR | Architectural Support |
|---|---|
| NFR1–NFR5 · Performance | PowerSync SQLite as local source of truth → offline load <1s; no network blocking on writes ✅ |
| NFR6–NFR12 · Security | `expo-secure-store` for session tokens, RLS enforced from `migration_001`, no passwords stored ✅ |
| NFR13–NFR15 · Sync resilience | PowerSync sync queue survives app restarts by design ✅ |
| NFR21 · Repository pattern | Typed interfaces + Context injection — zero direct SDK calls in business logic ✅ |
| NFR22 · No onboarding wizard | `(auth)/sign-in.tsx` routes directly to dashboard — no wizard screens in structure ✅ |
| NFR23 · **(V2)** Expiry calculation locality | Computed client-side from `expiry_date` vs `Date.now()` — no server dependency, works offline ✅ |

---

### Gap Analysis Results

**Important — document before first implementation story:**

1. **Development build required from day one** — `expo-dev-client` must be in `package.json`. First development command is `expo run:android`, not Expo Go. Add to Epic 0 / Story 1 acceptance criteria.

2. **PowerSync token provider** — `SyncRepository.start()` must pass a token provider callback to the PowerSync connector that retrieves the current Supabase JWT (and refreshes it if expired). Without this, sync silently fails after session expiry. `ISyncRepository` interface must include this in its contract.

3. **PowerSync schema ↔ Supabase migrations are a pair** — `utils/powersync.schema.ts` must declare exactly the tables and columns PowerSync syncs. When any migration adds or renames a column, the PowerSync schema file must be updated in the same commit. Implementing agents must treat these as a coupled pair.

**Nice-to-have (not blocking V1):**

4. ESLint + Prettier — `eslint-config-expo` as base config. Not architecturally required but agents will create conflicting configs if not specified. Add to Epic 0.

---

### Architecture Completeness Checklist

**✅ Requirements Analysis**
- [x] 65 FRs + 23 NFRs analyzed — V1 scope (FR1–FR40) + V2 scope (FR44–FR57) fully mapped
- [x] Scale and complexity assessed — Low-Medium, solo developer, small fixed user base
- [x] 6 technical constraints identified and resolved (framework, offline, RLS, OTA, M3, Android min)
- [x] 7 cross-cutting concerns mapped to specific architectural decisions (V2: expiry calculation locality)

**✅ Architectural Decisions**
- [x] Framework open decision resolved: Expo SDK 55 + TypeScript
- [x] Offline sync: PowerSync v1.29.0 + `@op-engineering/op-sqlite`
- [x] State boundaries: Zustand (UI) + PowerSync `useQuery` (data)
- [x] Auth: Google Sign-In → Supabase Auth → `expo-secure-store`
- [x] Repository pattern: 9 typed interfaces + 9 Supabase implementations (V2: +ILeftoverRepository)
- [x] Schema: `family_id` on every table + RLS from V1
- [x] Environments: 3 EAS profiles (development / preview / production)
- [x] OTA: EAS Update (JS bundle, no APK rebuild)

**✅ Implementation Patterns**
- [x] Naming: DB `snake_case`, TS `camelCase`, files `kebab-case`, components `PascalCase`
- [x] Structure: co-located tests, interface/implementation pairs, barrel exports
- [x] Format: status as string literals, dates as ISO `timestamptz`, `RepositoryError` type
- [x] Communication: Zustand immutable updates, PowerSync `useQuery` for reactive data
- [x] Process: error handling, auth guard, offline-first writes, dev-only logging

**✅ Project Structure**
- [x] Complete directory tree — every file named, located, and annotated with FR reference
- [x] All 9 repository interfaces + implementations mapped (V2: +leftover)
- [x] All 6 custom packing components + 3 V2 leftover components named and placed
- [x] All FR categories mapped to specific directories (V2: FR44–FR57 mapped)
- [x] All 4 Supabase migrations named and scoped (V2: +leftovers_module)
- [x] Canonical data flow and integration boundaries documented

---

### Architecture Readiness Assessment

**Overall Status: READY FOR IMPLEMENTATION**

**Confidence Level: High**

**Key Strengths:**
- Repository pattern provides clean vendor isolation — Supabase, PowerSync, and Google Sign-In are all replaceable by rewriting one module each
- RLS + `family_id` schema designed for V4/V5 privacy requirements from V1 — no painful retrofit later
- PowerSync eliminates the custom sync engine complexity that offline-first + real-time would otherwise require
- Complete FR → directory mapping means every agent working on any story knows exactly where their code lives before writing a single line

**Areas for Future Enhancement (post-V1):**
- Automated CI/CD pipeline (EAS Build triggered on push to `main`)
- Push notifications infrastructure (V7+)
- Child account onboarding flow (long-horizon — Aurora/Isabel)

### Implementation Handoff

**AI Agent Guidelines:**
- Follow all architectural decisions exactly as documented — no vendor SDK calls outside repositories
- Use `snake_case` ↔ `camelCase` conversion exclusively in the repository layer
- Use PowerSync `useQuery` for all reactive data — Zustand for UI state only
- Always update `utils/powersync.schema.ts` in the same commit as any Supabase migration

**First Implementation Story (Epic 0 / Story 1):**
```bash
npx create-expo-app@latest familyhub --template blank-typescript
npx expo install expo-router expo-secure-store expo-updates expo-dev-client
npx expo install @supabase/supabase-js @react-native-google-signin/google-signin
npx expo install @powersync/react-native @op-engineering/op-sqlite
npx expo install react-native-gesture-handler react-native-reanimated
npm install react-native-paper react-native-safe-area-context zustand
```
