---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
lastStep: 8
status: 'complete'
completedAt: '2026-03-25'
v2EditedAt: '2026-03-27'
v2EditSummary: 'Extended architecture for V2 Leftovers module (FR44-FR57, NFR23)'
v4EditedAt: '2026-04-03'
v4EditSummary: 'Stripped offline/PowerSync (cancelled). Extended architecture for V4 Language Learning module (FR100-FR115, NFR27-NFR30). Added Pi session service, WebSocket, TTS/STT, Claude OAuth onboarding.'
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

**Functional Requirements:** 121 total (FR1–FR121). V1 shipped (FR1–FR57). V4 scope covers FR100–FR115.

Twelve capability areas:
1. Identity & Access Management (FR1–FR4) — Google Sign-In, profile linking, admin invitation, maid revocation
2. Profile Management (FR5–FR8) — CRUD with name/avatar, profiles decoupled from accounts
3. Vacation Management (FR9–FR15) — full CRUD, lifecycle, household-wide pinning
4. Booking Tasks (FR16–FR21) — auto-generated tasks, document check with child task generation, urgency sorting
5. Packing List (FR22–FR27) — six-status items, quantity, profile assignment, real-time sync
6. Categories/Tags/Templates (FR28–FR33) — user-defined vocab, reusable templates with participant filtering
7. Dashboard (FR34–FR36) — pinned widgets, booking task urgency, leftovers widget, meal plan widget
8. Real-time Sync & OTA (FR37–FR40) — Supabase Realtime, last-write-wins, OTA check
9. Data Privacy (FR41–FR43) — RLS-enforced privacy (V6+)
10. Leftovers Management (FR44–FR57) — leftover CRUD with dose tracking, eaten/thrown-out counters, per-item configurable expiry (default 5 days), auto-close on zero remaining, expired item visual flagging, dashboard widget, full list with active/closed sorting, infinite scroll
11. **(V4) Language Learning (FR100–FR115)** — Pi-side session service (start/resume/end/status), per-user WebSocket routing, TTS playback (el-GR double-speak), STT voice input (mic as keyboard replacement), skill system (learn/review/vocab/writing/speaking/reading/progress), onboarding gate (/setup), Claude OAuth via WebView, connection status, skill-complete signals
12. Future modules (FR116–FR121) — V5 Recipes, V6 Finances, V7 Maid

**Non-Functional Requirements:** 30 total (NFR1–NFR30). Key architectural drivers:
- Cold start <2s, real-time sync <3s (NFR1–NFR4)
- TLS 1.2+, secure credential storage, RLS-enforced privacy (NFR5–NFR11)
- Last-write-wins produces valid state, APK sideload on API 26+ (NFR12–NFR13)
- Repository pattern — all external services behind swappable interface (NFR17)
- No onboarding wizard (NFR22)
- Expiry calculations correct on device-local time (NFR23)
- (V4) Session service <5s, TTS <500ms, STT <2s, double-speak timing 0.8s/1.2s (NFR27–NFR30)

**Scale & Complexity:**

- Primary domain: Android-first cross-platform mobile, full-stack client-heavy
- Complexity level: **Low-Medium** — small user base, no regulatory overhead — with V4 introducing a second backend (Raspberry Pi) and WebSocket bridge
- Estimated architectural components: ~14 (Auth, Supabase Client, Realtime, Profile/Vacation/Packing/Leftovers/Shopping/MealPlan repositories, OTA check, Pi Session Service, Pi WebSocket Server, TTS Engine, STT Engine)

---

### Technical Constraints & Dependencies

| Constraint | Source | Impact |
|---|---|---|
| Supabase (PostgreSQL, free tier) | Confirmed | Backend, auth, RLS, realtime |
| Google Sign-In | Confirmed | Auth provider — no passwords stored |
| Repository pattern (mandatory) | NFR21 | Every external service behind swappable module interface |
| Android-first, APK sideload | PRD | Private keystore, no Play Store |
| Real-time sync between admins | FR27, NFR3 (<3s) | Supabase Realtime subscription required |
| OTA update check | FR40 | Version manifest or Expo EAS Update |
| Flutter / React Native / Expo | **Resolved — Expo SDK 55** | Determines M3 path, OTA, APK toolchain |
| Material Design 3 | UX Spec | Flutter native M3 or `react-native-paper` |
| WCAG AA, TalkBack | UX Spec | Semantic grouping, 48dp touch targets, no colour-only status |
| Minimum Android 8.0 (API 26) | PRD | Modern crypto APIs available |
| RLS enforcement | NFR9–NFR10, FR41–FR43 | Privacy at DB layer — V6+ required, V1 schema must anticipate |
| Raspberry Pi (session service + WebSocket) | V4 | Second backend — Claude Code sessions, Greek TTS relay |
| Tailscale VPN | V4 | Private networking between phone and Pi — no public IP |
| expo-speech (el-GR TTS) | V4 | Greek text-to-speech with double-speak pattern |
| expo-speech-recognition (el-GR STT) | V4 | Mic as keyboard replacement — voice input for Greek |
| RECORD_AUDIO permission | V4 | Required for STT — requested on first mic tap |

---

### Cross-Cutting Concerns Identified

1. **Real-time sync between admins** — Supabase Realtime pushes changes from one admin's device to the other. All list-based modules (packing, shopping, leftovers, meal plan) subscribe to Realtime channels for live updates. No offline-first layer — the app requires network connectivity.

2. **Repository pattern enforcement** — Every service (Supabase, Google Sign-In, Pi session service, future Drive/Calendar/AI) lives behind a typed interface. Business logic has zero direct dependency on any vendor SDK. This is an architecture-level constraint affecting folder structure and module boundaries.

3. **Profile ↔ Account decoupling** — Aurora and Isabel exist as Profiles without accounts. The data model must separate `profile` (name, avatar, family membership) from `user_account` (Google ID, email, role). Profiles are referenced by packing items, templates, etc.

4. **RLS design from V1** — Private envelopes and maid isolation are V6/V7 concerns but the Supabase schema and RLS policies must be designed with those boundaries in mind from V1. Retrofitting RLS is painful.

5. **Custom component layer** — Bespoke UI components (SwipeableItemWrapper, PackingItemCard, StatusCountPill, StatusBadge, etc.) define the interaction contract used across list-based modules.

6. **Expiry calculation locality** — leftover expiry dates are computed as `date_added + expiry_days`. Visual flagging (expired = red) must evaluate against device-local time, not server time (NFR23). The calculation is pure — no server round-trip needed.

7. **(V4) Pi as second backend** — Language Learning introduces a Raspberry Pi as an external service alongside Supabase. The Pi runs Claude Code sessions via tmux, relays Greek text via WebSocket, and manages session lifecycle via HTTP REST. The phone treats the Pi with the same isolation principle as Supabase — all access through repository interfaces and a dedicated WebSocket service.

8. **(V4) Connection reliability** — The Pi is a home device, not a cloud service. Tailscale VPN must be active on both phone and Pi. Connection status (FR114) must be prominent in the UI. Auto-reconnect with exponential backoff handles transient disconnections.

9. **(V4) Per-user isolation on Pi** — Each admin is a separate Linux user on the Pi. Separate tmux sessions, separate Claude credentials, separate WebSocket message routing. Zero cross-talk between users (FR104).

---

## Starter Template Evaluation

### Primary Technology Domain

Cross-platform mobile app — Android-first, private APK sideload, real-time sync via Supabase Realtime.

### Framework Decision: Expo vs Flutter

| Factor | Expo (React Native) | Flutter |
|---|---|---|
| Language | TypeScript (web-familiar) | Dart (new language to learn) |
| M3 implementation | `react-native-paper` v5 — full M3 ✓ | Native Flutter M3 — first-class ✓ |
| Supabase SDK | `@supabase/supabase-js` v2 — primary SDK, best maintained ✓ | Flutter SDK — good but secondary |
| OTA updates | **EAS Update (native to Expo)** — JS layer, no APK rebuild | Custom version manifest only |
| Private APK | EAS Build `"distribution": "internal"` ✓ | `flutter build apk` ✓ |
| Solo dev speed | Fastest bootstrap, large ecosystem | Steeper initial setup |

### Selected Starter: Expo SDK 55 + TypeScript

**Rationale:** EAS Update is native to Expo and the cleanest OTA solution for sideloaded APKs. `@supabase/supabase-js` is the primary and best-maintained Supabase client SDK. TypeScript aligns with JavaScript-adjacent prior experience. Flutter's M3 is marginally more native but the Expo path is lower-risk for a solo developer.

**Initialization Command:**

```bash
npx create-expo-app@latest familyhub --template blank-typescript
```

**Core packages to add immediately:**

```bash
npx expo install expo-router expo-secure-store expo-updates expo-dev-client
npx expo install @supabase/supabase-js @react-native-google-signin/google-signin
npx expo install react-native-gesture-handler react-native-reanimated
npm install react-native-paper react-native-safe-area-context zustand
```

**V4 Language Learning packages:**

```bash
npx expo install expo-speech expo-speech-recognition react-native-webview
```

**Architectural Decisions Provided by Starter:**

**Language & Runtime:** TypeScript strict mode — React Native via Expo Managed Workflow SDK 55

**Routing:** Expo Router (file-based routing, recommended for SDK 55+)

**OTA Updates:** `expo-updates` + EAS Update — JS bundle updates without APK rebuild

**Build/APK:** EAS Build with `"distribution": "internal"`, `"buildType": "apk"` for private sideload

**Styling/UI:** `react-native-paper` v5 — full Material Design 3 implementation

**Backend:** `@supabase/supabase-js` v2 — direct queries + Supabase Realtime for live updates

**Auth:** `@react-native-google-signin/google-signin` + Supabase Auth

**Secure Storage:** `expo-secure-store` (session tokens, private keystore)

**Gestures:** `react-native-gesture-handler` + `react-native-reanimated` (required for `SwipeableItemWrapper`)

**Testing:** Jest (included in Expo template)

**Code Organisation:** Feature-based folders under `src/` with repository pattern service modules

**Note:** Project initialisation using the above commands is the first implementation story (Epic 0 / Story 1).

---

## Core Architectural Decisions

### 1. Data Architecture

**Direct Supabase Queries + Realtime Subscriptions**

All data access is via `@supabase/supabase-js` v2 — direct `.select()`, `.insert()`, `.update()`, `.delete()` calls. No local database, no offline cache. Real-time sync between admins is handled by Supabase Realtime channel subscriptions — components subscribe to table changes and re-render when data arrives. Conflict resolution strategy: **last-write-wins** based on `updated_at` timestamp.

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

---

### 1c. (V4) Language Learning Data Architecture

**`learning_profiles` table — Supabase PostgreSQL:**

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | Default `gen_random_uuid()` |
| `family_id` | `uuid` FK → `families.id` | RLS-enforced, same pattern as all tables |
| `user_account_id` | `uuid` FK → `user_accounts.id` | One profile per admin |
| `setup_complete` | `boolean` NOT NULL DEFAULT `false` | Gating flag for skill menu (FR111) |
| `claude_authenticated` | `boolean` NOT NULL DEFAULT `false` | Gating flag for OAuth (FR112) |
| `goals` | `text` | e.g., "read, write, speak" — set during `/setup` |
| `preferred_input_method` | `text` NOT NULL DEFAULT `'keyboard_and_mic'` | `'keyboard_and_mic'` or `'mic_only'` (FR113) |
| `level` | `text` NOT NULL DEFAULT `'beginner'` | Set during `/setup` |
| `created_at` | `timestamptz` NOT NULL DEFAULT `now()` | Standard audit column |
| `updated_at` | `timestamptz` NOT NULL DEFAULT `now()` | Standard audit column, trigger-updated |

**Constraints:**
- `UNIQUE (user_account_id)` — one learning profile per user
- `CHECK (preferred_input_method IN ('keyboard_and_mic', 'mic_only'))`

**Migration:** `supabase/migrations/YYYYMMDD000000_language_learning_module.sql`
- Creates `learning_profiles` table with all columns and constraints above
- Adds RLS policy: admins in the same `family_id` can read/write their own learning profile

**Minimal Supabase footprint** — all learning content and session state lives on the Pi. Supabase only stores the onboarding flags and profile preferences.

**Pi-Side Infrastructure (separate repository):**

The Pi hosts two Node.js services managed by pm2:

**Session Service (HTTP REST, port 3000):**

| Endpoint | Method | Purpose |
|---|---|---|
| `/session/start` | POST | `?userId=X&skill=Y` — creates tmux session under Linux user, launches Claude Code |
| `/session/resume` | POST | `?userId=X` — reattaches to existing tmux session |
| `/session/end` | POST | `?userId=X` — kills tmux session |
| `/session/status` | GET | `?userId=X` — returns `{ active: bool, skill: string }` |
| `/auth/login` | POST | `?userId=X` — triggers `claude login`, returns OAuth URL |

Implementation: Express.js. Each endpoint shells out to `tmux` commands under the target Linux user via `sudo -u {linuxUser}`. User mapping: `filipe` → Linux user `filipe`, `angela` → Linux user `angela`.

**WebSocket Server (port 3001):**

Accepts connections at `ws://pi:3001?userId=X`. Routes messages only to the matching userId — zero cross-talk (FR104). Claude's `speak-greek.sh` script sends messages to this server. The server relays them to the correct phone.

Implementation: `ws` library (bare WebSocket, no Socket.io overhead).

**Process Management:** pm2 with auto-start on boot. Both services in a single `ecosystem.config.js`.

**Networking:** Tailscale VPN. Pi has a stable Tailscale IP. No public IP, no port forwarding, no TLS needed (Tailscale encrypts traffic end-to-end).

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

**Zustand + Supabase Realtime Subscriptions**

- **Supabase Realtime**: Components subscribe to table changes via Supabase Realtime channels. When data changes on another device, the subscription callback updates the Zustand store, triggering re-renders. Used for all shared data (packing items, vacations, shopping list, meal plan, leftovers).
- **Zustand stores**: Both data state and UI state. Stores hold the fetched data from Supabase, plus UI-only state (selected filters, active vacation ID, auth session, loading/error flags). Repositories fetch data and stores hold it.
- No Redux, no Context API for data flow. Context API only for dependency injection (repository instances, WebSocket service).

**Store boundaries:**

| Store | Responsibility |
|---|---|
| `authStore` | Session, user profile, loading/error state |
| `vacationStore` | Active vacation selection, filter state, vacation data |
| `packingStore` | Status filter toggles, active item selection, packing data |
| `uiStore` | Global UI flags (sync indicator) |
| `leftoversStore` | Leftover list data, pagination cursor |
| `shoppingStore` | Shopping list data, category filters |
| `mealPlanStore` | Meal plan data, active week, navigation state |
| `languageLearningStore` | **(V4)** Connection status, active session/skill, TTS queue, terminal output, isSpeaking, isListening |

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
    ota.repository.interface.ts
    leftover.repository.interface.ts
    shopping.repository.interface.ts
    meal-plan.repository.interface.ts
    session.repository.interface.ts              ← (V4) ISessionRepository
    learning-profile.repository.interface.ts     ← (V4) ILearningProfileRepository
  supabase/
    auth.repository.ts          ← implements IAuthRepository
    profile.repository.ts       ← implements IProfileRepository
    vacation.repository.ts      ← implements IVacationRepository
    packing-item.repository.ts  ← implements IPackingItemRepository
    category.repository.ts      ← implements ICategoryRepository
    template.repository.ts      ← implements ITemplateRepository
    ota.repository.ts           ← implements IOtaRepository
    leftover.repository.ts      ← implements ILeftoverRepository
    shopping.repository.ts      ← implements IShoppingRepository
    meal-plan.repository.ts     ← implements IMealPlanRepository
    session.repository.ts       ← (V4) implements ISessionRepository (HTTP to Pi)
    learning-profile.repository.ts ← (V4) implements ILearningProfileRepository
```

Supabase client instance is created once and injected into repository implementations. Repositories are never instantiated more than once — singleton pattern via Context provider at app root.

**Real-time: Supabase Realtime Channels**

Repositories subscribe to Supabase Realtime channels for table changes. When a remote change arrives, the repository callback updates the relevant Zustand store. All list-based modules (packing, shopping, leftovers, meal plan) use this pattern for live sync between admins (NFR3 <3s).

**V4 Communication Layer:**

V4 introduces two new communication patterns alongside Supabase:

| Service | Protocol | Purpose |
|---|---|---|
| Pi Session Service | HTTP REST | Session lifecycle (start/resume/end/status) + Claude OAuth |
| Pi WebSocket Server | WebSocket | Greek text relay, signals (setup-complete, skill-complete), terminal output |

**`ISessionRepository`** wraps the Pi HTTP REST calls — same repository pattern as Supabase (NFR17). Base URL from env config (`PI_SESSION_URL`).

**`WebSocketService`** manages the persistent WebSocket connection to the Pi. Not a repository (long-lived connection, not request-response). Provided via React Context at the `(language-learning)` layout level.

**WebSocket message types (discriminated union):**

```ts
type PiWebSocketMessage =
  | { type: 'speak'; phrases: string[] }        // Greek text for TTS
  | { type: 'signal'; name: 'setup-complete' }   // Setup finished
  | { type: 'signal'; name: 'skill-complete' }   // Skill finished
  | { type: 'terminal'; content: string }         // Terminal output for display
```

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

**V4 Environment Configuration:**

New env vars (all `.env.*` files):

```
PI_SESSION_URL=http://100.x.x.x:3000    # Tailscale IP
PI_WEBSOCKET_URL=ws://100.x.x.x:3001    # Tailscale IP
```

Injected via `app.config.ts` → `expo-constants`, same pattern as `SUPABASE_URL`.

**V4 Pi Deployment:**

Pi-side code lives in a **separate repository** — different runtime (Node.js on Raspberry Pi), different deployment (pm2), different concerns. The mobile app treats the Pi as an external service.

| Component | Technology | Management |
|---|---|---|
| Session Service | Express.js, port 3000 | pm2 auto-start |
| WebSocket Server | ws library, port 3001 | pm2 auto-start |
| Process Manager | pm2 | `ecosystem.config.js` |
| Networking | Tailscale | Stable IP, E2E encrypted |

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

### Process Patterns

**Auth guard:** Single `useAuthGuard()` hook at the layout level for `(app)` route group. Never duplicate auth checks in individual screens.

**Console logging:** `if (__DEV__) console.error(...)` — never in production paths.

**User-facing error messages:** Plain Portuguese strings — not technical error codes. Errors displayed in UI are always localized.

**(V4) Pi connection lifecycle:**
- WebSocket connects on entering `(language-learning)` route group
- Auto-reconnect with exponential backoff (1s, 2s, 4s, max 10s)
- `connectionStatus` in `languageLearningStore` reflects state at all times (FR114)
- Disconnect on leaving `(language-learning)` route group

**(V4) Session lifecycle:**
- `start` → session active → `end` (or killed by starting a different skill)
- Resume offered only for the same skill (FR110)
- Skill-complete signal auto-calls `end` and returns to skill selection (FR115)

**(V4) Onboarding gate:**
- On entering Language Learning, check `learning_profiles.setup_complete` from Supabase
- If `false` or no record: auto-start `/setup` skill, show terminal (FR111)
- If `claude_authenticated = false`: redirect to onboarding WebView first (FR112)
- After setup completes (signal received): update Supabase flag, unlock skill menu

**(V4) TTS queue:**
- Messages arrive asynchronously from WebSocket — each `speak` message may contain multiple phrases
- Playback is serial: speak phrase → 0.8s pause → speak same phrase again → 1.2s pause → next phrase (NFR30)
- No concurrent speech — queue processes one phrase at a time

**(V4) WebSocket message handling:**
- All messages use discriminated union pattern — `switch (message.type)`
- No string comparisons scattered across components

---

### Enforcement Summary

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
12. **(V4)** Pi-side code lives in a **separate repository** — never add Pi Node.js service code to the FamilyHub mobile repo
13. **(V4)** Request `RECORD_AUDIO` permission on first mic tap, not at app launch or module entry

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
├── .env.development            ← SUPABASE_URL, SUPABASE_ANON_KEY, PI_SESSION_URL, PI_WEBSOCKET_URL
├── .env.preview                ← SUPABASE_URL, SUPABASE_ANON_KEY, PI_SESSION_URL, PI_WEBSOCKET_URL
├── .env.production             ← SUPABASE_URL, SUPABASE_ANON_KEY, PI_SESSION_URL, PI_WEBSOCKET_URL
├── .env.example                ← Template committed to git (actual .env.* files git-ignored)
├── .gitignore
├── README.md
│
├── src/
│   │
│   ├── app/                    ← Expo Router file-based routing
│   │   ├── _layout.tsx         ← Root layout: RepositoryProvider
│   │   ├── (auth)/
│   │   │   ├── _layout.tsx     ← Redirect to (app) if session already exists
│   │   │   └── sign-in.tsx     ← Google Sign-In screen (FR1–FR3)
│   │   └── (app)/
│   │       ├── _layout.tsx     ← useAuthGuard + sidebar menu + FAB
│   │       ├── (home)/
│   │       │   └── index.tsx   ← Dashboard screen (FR34–FR36)
│   │       ├── (vacations)/
│   │       │   ├── index.tsx   ← Vacation list screen (FR9–FR11)
│   │       │   ├── new.tsx     ← Create vacation + template picker (FR9, FR29–FR33)
│   │       │   └── [vacationId]/
│   │       │       ├── index.tsx         ← Packing list screen (FR22–FR27)
│   │       │       ├── edit.tsx          ← Edit vacation (FR10)
│   │       │       └── booking-tasks.tsx ← Booking task timeline (FR16–FR21)
│   │       ├── (leftovers)/
│   │       │   └── index.tsx          ← Full leftovers list with infinite scroll (FR54–FR56)
│   │       ├── (shopping)/
│   │       │   └── index.tsx          ← Shopping list (FR58–FR80)
│   │       ├── (meal-plan)/
│   │       │   └── index.tsx          ← Weekly meal plan grid (FR81–FR99)
│   │       ├── (language-learning)/           ← (V4) Language Learning module
│   │       │   ├── _layout.tsx               ← WebSocketService provider + connection status bar
│   │       │   ├── index.tsx                 ← Skill selection screen + onboarding gate (FR109, FR111)
│   │       │   ├── session.tsx               ← Terminal display + TTS + mic (FR100–FR108)
│   │       │   └── onboarding.tsx            ← Claude OAuth WebView (FR112)
│   │       └── (settings)/
│   │           └── index.tsx   ← Profile management + admin invite (FR5–FR8, FR3–FR4)
│   │
│   ├── components/
│   │   ├── common/
│   │   │   ├── sync-indicator.tsx      ← Driven by uiStore.syncStatus
│   │   │   ├── sidebar-menu.tsx        ← Module navigation sidebar
│   │   │   ├── page-header.tsx         ← Shared screen header
│   │   │   └── index.ts
│   │   ├── vacation/
│   │   │   ├── vacation-card.tsx       ← List card with lifecycle badge + pinned state
│   │   │   ├── vacation-lifecycle-badge.tsx
│   │   │   ├── booking-task-row.tsx    ← Row with urgency indicator (FR18–FR21)
│   │   │   └── index.ts
│   │   ├── packing/                   ← Custom components from UX spec
│   │   │   ├── swipeable-item-wrapper.tsx   ← Gesture handler wrap (FR23)
│   │   │   ├── packing-item-card.tsx        ← Card with StatusBadge + profile chip (FR22–FR24)
│   │   │   ├── status-count-pill.tsx        ← Header quick-filter pill (FR27)
│   │   │   ├── status-badge.tsx             ← Inline status indicator (FR22)
│   │   │   ├── packing-completion-state.tsx ← Empty/complete states (FR22)
│   │   │   ├── category-completion-indicator.tsx ← Category-level progress (FR28)
│   │   │   └── index.ts
│   │   ├── leftovers/
│   │   │   ├── leftover-item-card.tsx       ← Card with dose counters, eaten/throw-out buttons (FR46–FR47)
│   │   │   ├── leftovers-widget.tsx          ← Dashboard widget (FR53)
│   │   │   ├── leftover-add-form.tsx         ← Name, doses, expiry days input (FR44)
│   │   │   └── index.ts
│   │   ├── shopping/                  ← Shopping list components
│   │   │   └── index.ts
│   │   ├── meal-plan/                 ← Meal plan components
│   │   │   └── index.ts
│   │   └── language-learning/         ← (V4) Language Learning components
│   │       ├── terminal-display.tsx         ← Scrollable terminal output view (FR106)
│   │       ├── mic-button.tsx               ← STT capture toggle (FR107)
│   │       ├── skill-card.tsx               ← Skill selection button with resume badge (FR109)
│   │       ├── connection-status-bar.tsx    ← Pi connection indicator (FR114)
│   │       ├── tts-indicator.tsx            ← Visual feedback during TTS playback
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
│   │   │   ├── ota.repository.interface.ts           ← IOtaRepository (FR40)
│   │   │   ├── leftover.repository.interface.ts      ← ILeftoverRepository (FR44–FR57)
│   │   │   ├── shopping.repository.interface.ts      ← IShoppingRepository (FR58–FR80)
│   │   │   ├── meal-plan.repository.interface.ts     ← IMealPlanRepository (FR81–FR99)
│   │   │   ├── session.repository.interface.ts       ← (V4) ISessionRepository (FR100–FR103, FR112)
│   │   │   └── learning-profile.repository.interface.ts ← (V4) ILearningProfileRepository (FR111–FR113)
│   │   ├── supabase/
│   │   │   ├── supabase.client.ts   ← Single Supabase client instance (created once)
│   │   │   ├── auth.repository.ts
│   │   │   ├── profile.repository.ts
│   │   │   ├── vacation.repository.ts   ← Also handles BookingTask CRUD
│   │   │   ├── packing-item.repository.ts
│   │   │   ├── category.repository.ts
│   │   │   ├── template.repository.ts
│   │   │   ├── ota.repository.ts        ← Calls expo-updates checkForUpdate
│   │   │   ├── leftover.repository.ts
│   │   │   ├── shopping.repository.ts
│   │   │   ├── meal-plan.repository.ts
│   │   │   ├── session.repository.ts            ← (V4) HTTP calls to Pi session service
│   │   │   └── learning-profile.repository.ts   ← (V4) Supabase CRUD for learning_profiles
│   │   ├── repository.context.tsx       ← React Context — provides all repositories
│   │   └── index.ts                     ← Barrel: exports all interfaces
│   │
│   ├── services/                        ← (V4) Long-lived connection managers
│   │   ├── websocket.service.ts         ← Pi WebSocket connection manager
│   │   └── websocket.context.tsx        ← React Context provider for WebSocketService
│   │
│   ├── stores/
│   │   ├── auth.store.ts       ← Session, UserAccount, isLoading, error
│   │   ├── vacation.store.ts   ← Vacation data, activeVacationId, isPinned state
│   │   ├── packing.store.ts    ← Packing data, activeStatusFilters, selectedItemId
│   │   ├── leftovers.store.ts  ← Leftover data, pagination cursor
│   │   ├── shopping.store.ts   ← Shopping list data, category filters
│   │   ├── meal-plan.store.ts  ← Meal plan data, active week, navigation state
│   │   ├── language-learning.store.ts ← (V4) connectionStatus, activeSession, ttsQueue, terminalOutput
│   │   ├── icon.store.ts       ← Icon library state
│   │   └── ui.store.ts         ← syncStatus, globalError
│   │
│   ├── hooks/
│   │   ├── use-auth-guard.ts       ← Redirects unauthenticated users to (auth)/sign-in
│   │   ├── use-repository.ts       ← Typed hook: pulls repositories from Context
│   │   ├── use-current-profile.ts  ← Current user's profile
│   │   ├── use-family.ts           ← Family data
│   │   ├── use-session.ts          ← (V4) Session lifecycle via ISessionRepository
│   │   ├── use-tts-queue.ts        ← (V4) Serial TTS playback with double-speak
│   │   ├── use-stt.ts              ← (V4) Mic capture → transcript → send to Pi
│   │   └── use-learning-profile.ts ← (V4) Profile CRUD + onboarding gate logic
│   │
│   ├── types/
│   │   ├── vacation.types.ts   ← Vacation, VacationLifecycle, BookingTask, BookingTaskType
│   │   ├── packing.types.ts    ← PackingItem, PackingStatus, Category, Tag, Template
│   │   ├── profile.types.ts    ← Profile, UserAccount, UserRole, Family
│   │   ├── leftover.types.ts   ← Leftover, LeftoverStatus, LeftoverWidgetData
│   │   ├── shopping.types.ts   ← ShoppingItem, ShoppingCategory
│   │   ├── meal-plan.types.ts  ← MealPlan, MealSlot, MealType, MealPlanConfig
│   │   └── language-learning.types.ts ← (V4) Session, LearningProfile, PiWebSocketMessage, LearningSkill
│   │
│   ├── constants/
│   │   ├── status-colours.ts    ← PackingStatus → { bg, text, border } colour tokens
│   │   ├── booking-deadlines.ts ← FLIGHTS_DAYS=90, HOTEL_DAYS=60, CAR_DAYS=30, INSURANCE_DAYS=14
│   │   ├── leftover-defaults.ts ← DEFAULT_EXPIRY_DAYS=5, PAGINATION_PAGE_SIZE
│   │   ├── shopping-defaults.ts ← Shopping list constants
│   │   └── language-learning-defaults.ts ← (V4) TTS_REPEAT_PAUSE=800, TTS_PHRASE_PAUSE=1200, SKILLS list
│   │
│   ├── theme/                   ← Material Design 3 theme configuration
│   │
│   └── utils/
│       ├── date.utils.ts           ← pt-PT formatting, ISO 8601 ↔ Date conversion
│       ├── image.utils.ts          ← Image manipulation utilities
│       ├── logger.ts               ← Dev-only logging utility
│       ├── uuid.ts                 ← UUID generation
│       └── repository.error.ts     ← RepositoryError class
│
├── supabase/
│   ├── config.toml             ← Supabase CLI project config
│   ├── seed.sql                ← Initial family + profile rows (Filipe, Angela, Aurora, Isabel)
│   └── migrations/
│       ├── ...                             ← 50+ existing migrations (V1–V3)
│       └── YYYYMMDD000000_language_learning_module.sql ← (V4) learning_profiles + RLS
│
└── assets/
    ├── icon.png
    ├── splash.png
    └── adaptive-icon.png
```

---

### Architectural Boundaries

**Canonical data flow (V1–V3 modules):**
```
User action
  → Component (useStore for reads / useRepository for writes)
  → IRepository interface
  → Supabase implementation (snake_case ↔ camelCase conversion boundary)
  → PostgreSQL (RLS enforced, family_id on every row)

Remote change (Angela's device writes)
  → Supabase PostgreSQL
  → Supabase Realtime channel
  → Repository subscription callback
  → Zustand store update → component re-renders
```

**V4 Language Learning data flow:**
```
User taps skill
  → Component calls useSession().start(skill)
  → ISessionRepository.start(userId, skill)
  → HTTP POST to Pi session service
  → Pi creates tmux session, launches Claude Code
  → Pi returns success

Claude sends Greek text
  → Pi WebSocket server routes to userId
  → WebSocketService receives message
  → languageLearningStore.ttsQueue updated
  → useTtsQueue hook speaks via expo-speech (double-speak)
  → Terminal display shows text (FR106)

User taps mic
  → useStt hook starts expo-speech-recognition (el-GR)
  → Transcript sent to Pi via WebSocket
  → Claude receives plain text (FR108)
```

**Auth boundary:**
- `(auth)` group: accessible only without session → auto-redirected out if session exists
- `(app)` group: `useAuthGuard` in root `_layout.tsx` → redirects to `(auth)/sign-in` if no session

**Repository boundary:**
- Zero Supabase SDK calls outside `src/repositories/supabase/`
- All repository interfaces defined in `src/repositories/interfaces/`
- `RepositoryContext` provides singleton instances — never instantiate repositories in components
- **(V4)** Zero Pi session service calls outside `src/repositories/supabase/session.repository.ts`

**Pi boundary (V4):**
- Pi is treated as an external service — same isolation principle as Supabase
- `ISessionRepository` wraps all HTTP calls to the Pi session service
- `WebSocketService` is the only code that opens a WebSocket to the Pi
- Pi-side code is a separate repository, separate deployment

---

### FR Categories → Directory Mapping

| FR Category | Primary Locations |
|---|---|
| FR1–FR4 · Identity & Access | `(auth)/sign-in.tsx`, `repositories/supabase/auth.repository.ts`, `stores/auth.store.ts` |
| FR5–FR8 · Profile Management | `(settings)/index.tsx`, `repositories/supabase/profile.repository.ts`, `types/profile.types.ts` |
| FR9–FR15 · Vacation Management | `(vacations)/index.tsx`, `(vacations)/new.tsx`, `(vacations)/[vacationId]/index.tsx`, `vacation.repository.ts`, `stores/vacation.store.ts` |
| FR16–FR21 · Booking Tasks | `(vacations)/[vacationId]/booking-tasks.tsx`, `vacation.repository.ts`, `components/vacation/booking-task-row.tsx`, `constants/booking-deadlines.ts` |
| FR22–FR27 · Packing List | `(vacations)/[vacationId]/index.tsx`, `packing-item.repository.ts`, `stores/packing.store.ts`, `components/packing/` |
| FR28–FR33 · Categories/Tags/Templates | `category.repository.ts`, `template.repository.ts`, `(vacations)/new.tsx`, `types/packing.types.ts` |
| FR34–FR36 · Dashboard | `(home)/index.tsx`, `components/vacation/vacation-card.tsx` |
| FR37–FR40 · Sync & OTA | `ota.repository.ts`, `stores/ui.store.ts`, Supabase Realtime subscriptions in repositories |
| FR44–FR57 · Leftovers | `(leftovers)/index.tsx`, `leftover.repository.ts`, `stores/leftovers.store.ts`, `components/leftovers/`, `types/leftover.types.ts`, `constants/leftover-defaults.ts` |
| FR58–FR80 · Shopping | `(shopping)/index.tsx`, `shopping.repository.ts`, `stores/shopping.store.ts`, `components/shopping/`, `types/shopping.types.ts` |
| FR81–FR99 · Meal Plan | `(meal-plan)/index.tsx`, `meal-plan.repository.ts`, `stores/meal-plan.store.ts`, `components/meal-plan/`, `types/meal-plan.types.ts` |
| FR100–FR103 · **(V4)** Session Service | `session.repository.ts`, `hooks/use-session.ts`, `(language-learning)/index.tsx`, `(language-learning)/session.tsx` |
| FR104–FR106 · **(V4)** WebSocket & TTS | `services/websocket.service.ts`, `hooks/use-tts-queue.ts`, `components/language-learning/terminal-display.tsx`, `constants/language-learning-defaults.ts` |
| FR107–FR108 · **(V4)** Voice Input | `hooks/use-stt.ts`, `components/language-learning/mic-button.tsx` |
| FR109–FR110 · **(V4)** Skill System | `(language-learning)/index.tsx`, `components/language-learning/skill-card.tsx`, `hooks/use-session.ts` |
| FR111–FR112 · **(V4)** Onboarding | `hooks/use-learning-profile.ts`, `(language-learning)/index.tsx`, `(language-learning)/onboarding.tsx` |
| FR113 · **(V4)** Learning Profiles | `learning-profile.repository.ts`, `hooks/use-learning-profile.ts`, `types/language-learning.types.ts` |
| FR114–FR115 · **(V4)** Connection & Signals | `components/language-learning/connection-status-bar.tsx`, `services/websocket.service.ts`, `stores/language-learning.store.ts` |

---

## Architecture Validation Results

### Coherence Validation ✅

**Decision Compatibility:** All library versions are mutually compatible. `@supabase/supabase-js` v2, `react-native-paper` v5, `react-native-gesture-handler`, `react-native-reanimated`, and Zustand v5 are all Expo SDK 55 compatible. V4 additions: `expo-speech`, `expo-speech-recognition` v3.0.1, and `react-native-webview` are all verified compatible with Expo SDK 55.

> ⚠️ **Critical implementation note:** `expo-dev-client` is required. **Expo Go cannot be used for this project.** Development requires a development build — either `expo run:android` (local) or EAS Build `development` profile. This must be the first thing any implementing agent knows.

**Pattern Consistency:** Repository pattern applied uniformly across all domains. The `snake_case` ↔ `camelCase` conversion boundary exists in exactly one place (repository layer). V4's `ISessionRepository` wraps Pi HTTP calls with the same interface pattern as Supabase repositories. `WebSocketService` is correctly placed in `src/services/` (not repositories) because it manages a long-lived connection. No contradictory decisions found.

**Structure Alignment:** Expo Router `(auth)` / `(app)` group structure maps exactly to the auth boundary decisions. `RepositoryContext` at root `_layout.tsx` provides singleton injection to the full app tree. V4's `WebSocketService` context is scoped to `(language-learning)/_layout.tsx` — correctly limited to the module that needs it.

---

### Requirements Coverage Validation ✅

**Functional Requirements — V1 shipped (FR1–FR57) + V4 (FR100–FR115) covered:**

| FR Group | Architectural Support |
|---|---|
| FR1–FR4 · IAM | `AuthRepository` + `(auth)/sign-in.tsx` + `authStore` ✅ |
| FR5–FR8 · Profiles | `ProfileRepository` + `(settings)/index.tsx` + `profile.types.ts` ✅ |
| FR9–FR15 · Vacations | `VacationRepository` + vacation screens + `vacationStore` ✅ |
| FR16–FR21 · Booking Tasks | `VacationRepository` + `booking-tasks.tsx` + `booking-deadlines.ts` ✅ |
| FR22–FR27 · Packing List | `PackingItemRepository` + packing screen + custom components + `packingStore` ✅ |
| FR28–FR33 · Categories/Tags/Templates | `CategoryRepository` + `TemplateRepository` + template picker ✅ |
| FR34–FR36 · Dashboard | `(home)/index.tsx` + widget components ✅ |
| FR37–FR40 · Sync & OTA | Supabase Realtime + `OtaRepository` + `uiStore` ✅ |
| FR44–FR57 · Leftovers | `LeftoverRepository` + leftovers screen + components + `leftoversStore` ✅ |
| FR100–FR103 · **(V4)** Session Service | `ISessionRepository` + Pi HTTP REST + `use-session` hook ✅ |
| FR104–FR106 · **(V4)** WebSocket & TTS | `WebSocketService` + `expo-speech` + `use-tts-queue` + `terminal-display` ✅ |
| FR107–FR108 · **(V4)** Voice Input | `expo-speech-recognition` + `use-stt` + `mic-button` ✅ |
| FR109–FR110 · **(V4)** Skill System | Skill selection screen + session lifecycle (one-at-a-time, kill on switch) ✅ |
| FR111–FR112 · **(V4)** Onboarding | Learning profile gate + Claude OAuth WebView ✅ |
| FR113 · **(V4)** Learning Profiles | `learning_profiles` table + `ILearningProfileRepository` ✅ |
| FR114–FR115 · **(V4)** Connection & Signals | `connectionStatus` in store + signal handler in WebSocket service ✅ |

**Non-Functional Requirements:**

| NFR | Architectural Support |
|---|---|
| NFR1–NFR4 · Performance | Direct Supabase queries, Realtime for live updates ✅ |
| NFR5–NFR11 · Security | `expo-secure-store` for session tokens, RLS enforced, no passwords stored ✅ |
| NFR12 · Last-write-wins | `updated_at`-based conflict resolution ✅ |
| NFR17 · Repository pattern | Typed interfaces + Context injection — zero direct SDK calls in business logic ✅ |
| NFR22 · No onboarding wizard | `(auth)/sign-in.tsx` routes directly to dashboard ✅ |
| NFR23 · Expiry calculation locality | Computed client-side from `expiry_date` vs `Date.now()` ✅ |
| NFR27 · **(V4)** Session service <5s | Direct HTTP to Pi over Tailscale — low latency LAN ✅ |
| NFR28 · **(V4)** TTS <500ms | `expo-speech` starts immediately from queue — no network hop ✅ |
| NFR29 · **(V4)** STT <2s | `expo-speech-recognition` runs on-device — Android native STT ✅ |
| NFR30 · **(V4)** TTS double-speak timing | Constants in `language-learning-defaults.ts`, enforced by `use-tts-queue` ✅ |

---

### Gap Analysis Results

**V4-specific gaps — document before first V4 implementation story:**

1. **Pi session service must validate userId** — the service must verify that the requested userId maps to a valid Linux user. Invalid userIds must return a clear error, not attempt `sudo -u` with an arbitrary string. Security at the Pi boundary.

2. **WebSocket reconnection after Pi reboot** — if the Pi reboots (pm2 restarts services), existing WebSocket connections drop. The auto-reconnect pattern handles this, but the session may or may not still exist in tmux. The `session/status` endpoint should be called after reconnection to determine if the session is still active.

3. **TTS voice availability** — `expo-speech` el-GR may not be available on all Android devices. First launch of the Language Learning module should check voice availability and prompt the user to install Google TTS engine if no Greek voice is found.

4. **Pi-side repository setup** — The Pi session service and WebSocket server need their own repository with setup documentation. This is a separate project — not part of the FamilyHub mobile app codebase.

---

### Architecture Completeness Checklist

**✅ Requirements Analysis**
- [x] 121 FRs + 30 NFRs analyzed — V1 shipped (FR1–FR57), V4 scope (FR100–FR115) fully mapped
- [x] Scale and complexity assessed — Low-Medium, solo developer, small fixed user base
- [x] 12 technical constraints identified and resolved (framework, RLS, OTA, M3, Android min, Pi, Tailscale, TTS/STT)
- [x] 9 cross-cutting concerns mapped to specific architectural decisions (V4: Pi as second backend, connection reliability, per-user isolation)

**✅ Architectural Decisions**
- [x] Framework: Expo SDK 55 + TypeScript
- [x] Data access: Direct Supabase queries + Supabase Realtime subscriptions
- [x] State management: Zustand stores for data + UI state
- [x] Auth: Google Sign-In → Supabase Auth → `expo-secure-store`
- [x] Repository pattern: typed interfaces for all external services (Supabase + Pi)
- [x] Schema: `family_id` on every table + RLS from V1
- [x] Environments: 3 EAS profiles (development / preview / production)
- [x] OTA: EAS Update (JS bundle, no APK rebuild)
- [x] (V4) Pi Session Service: Express.js HTTP REST, port 3000, pm2-managed
- [x] (V4) Pi WebSocket Server: ws library, port 3001, userId-based routing
- [x] (V4) TTS: expo-speech el-GR with double-speak pattern
- [x] (V4) STT: expo-speech-recognition el-GR, mic as keyboard replacement
- [x] (V4) Networking: Tailscale VPN, no public IP
- [x] (V4) Claude OAuth: react-native-webview in-app

**✅ Implementation Patterns**
- [x] Naming: DB `snake_case`, TS `camelCase`, files `kebab-case`, components `PascalCase`
- [x] Structure: co-located tests, interface/implementation pairs, barrel exports
- [x] Format: status as string literals, dates as ISO `timestamptz`, `RepositoryError` type
- [x] Communication: Zustand immutable updates, Supabase Realtime for reactive data
- [x] Process: auth guard, dev-only logging, error handling
- [x] (V4) WebSocket: discriminated union message types, switch handler pattern
- [x] (V4) TTS queue: serial playback, 0.8s/1.2s timing in constants
- [x] (V4) Pi connection: exponential backoff reconnect, status always visible
- [x] (V4) Onboarding gate: setup-complete + claude-authenticated checks before skill menu

**✅ Project Structure**
- [x] Complete directory tree — every file named, located, and annotated with FR reference
- [x] All repository interfaces + implementations mapped (V4: +session, +learning-profile)
- [x] V4 components: terminal-display, mic-button, skill-card, connection-status-bar, tts-indicator
- [x] V4 hooks: use-session, use-tts-queue, use-stt, use-learning-profile
- [x] V4 service: WebSocketService + context provider
- [x] All FR categories mapped to specific directories (V4: FR100–FR115 mapped)
- [x] Canonical data flows documented (V1–V3 + V4 Language Learning)

---

### Architecture Readiness Assessment

**Overall Status: READY FOR IMPLEMENTATION**

**Confidence Level: High**

**Key Strengths:**
- Repository pattern provides clean vendor isolation — Supabase, Google Sign-In, and Pi services are all replaceable by rewriting one module each
- RLS + `family_id` schema designed for V6/V7 privacy requirements from V1 — no painful retrofit later
- V4 Pi integration follows the same isolation principle as all other external services — no architectural exceptions
- Complete FR → directory mapping means every agent working on any story knows exactly where their code lives before writing a single line
- WebSocket service correctly scoped to `(language-learning)` route group — no unnecessary connections in other modules

**Areas for Future Enhancement:**
- Automated CI/CD pipeline (EAS Build triggered on push to `main`)
- Push notifications infrastructure (V8+)
- Child account onboarding flow (long-horizon — Aurora/Isabel)
- Pi-side monitoring and health checks

### Implementation Handoff

**AI Agent Guidelines:**
- Follow all architectural decisions exactly as documented — no vendor SDK calls outside repositories
- Use `snake_case` ↔ `camelCase` conversion exclusively in the repository layer
- Use Zustand stores for all state; Supabase Realtime subscriptions for live updates
- (V4) Never call Pi session service directly — only through `ISessionRepository`
- (V4) Use WebSocketService via context — handle all messages with discriminated union switch
- (V4) Pi-side code lives in a separate repository — never mix with mobile app code

**V4 Implementation Packages:**
```bash
npx expo install expo-speech expo-speech-recognition react-native-webview
```
