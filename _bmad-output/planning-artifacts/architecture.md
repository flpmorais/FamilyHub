---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
lastStep: 8
status: 'complete'
completedAt: '2026-03-25'
v2EditedAt: '2026-03-27'
v2EditSummary: 'Extended architecture for V2 Leftovers module (FR44-FR57, NFR23)'
v4EditedAt: '2026-04-03'
v4EditSummary: 'Stripped offline/PowerSync (cancelled). Extended architecture for V4 Language Learning module (FR100-FR115, NFR27-NFR30). Added Pi session service, WebSocket, TTS/STT, Claude OAuth onboarding.'
v5EditedAt: '2026-04-04'
v5EditSummary: 'Extended architecture for V5 Recipes module (FR116-FR149, NFR31-NFR37). Added recipes/recipe_ingredients/recipe_steps tables, LLM import pipeline (URL/YouTube/OCR), recipe scaling, meal plan multi-recipe slots, shopping list generation, PDF export. New repositories, store, hooks, components, route group.'
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

**Functional Requirements:** 153 total (FR1–FR153). V1 shipped (FR1–FR57). V4 scope covers FR100–FR115. V5 scope covers FR116–FR149.

Thirteen capability areas:
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
12. **(V5) Recipe Management (FR116–FR149)** — recipe CRUD (name, type, steps, ingredients+quantities, servings, prep/cook time, cost, categories, tags, image), static recipe types (meal/main/side/soup/dessert/other shared with meal plan), import from URL (LLM extraction), YouTube (transcript via Data API + LLM), photo OCR (camera + LLM), manual entry, user-defined categories and tags, browse by type with filters, ingredient search, servings scaling, meal plan integration (multiple recipes per slot, per-recipe servings, free-text fallback), shopping list generation (ingredient aggregation, quantity summing, review screen with checkboxes, dedup merge into shopping list), PDF share via Android share sheet, real-time sync
13. Future modules (FR150–FR153) — V6 Finances, V7 Maid

**Non-Functional Requirements:** 37 total (NFR1–NFR37). Key architectural drivers:
- Cold start <2s, real-time sync <3s (NFR1–NFR4)
- TLS 1.2+, secure credential storage, RLS-enforced privacy (NFR5–NFR11)
- Last-write-wins produces valid state, APK sideload on API 26+ (NFR12–NFR13)
- Repository pattern — all external services behind swappable interface (NFR17)
- No onboarding wizard (NFR22)
- Expiry calculations correct on device-local time (NFR23)
- (V4) Session service <5s, TTS <500ms, STT <2s, double-speak timing 0.8s/1.2s (NFR27–NFR30)
- (V5) URL import <10s, YouTube import <15s, OCR import <10s, search <300ms, shopping list gen <3s, PDF gen <3s, LLM cost <€2/month (NFR31–NFR37)

**Scale & Complexity:**

- Primary domain: Android-first cross-platform mobile, full-stack client-heavy
- Complexity level: **Low-Medium** — small user base, no regulatory overhead — with V4 introducing a second backend (Raspberry Pi) and WebSocket bridge, V5 adding LLM-based import pipelines
- Estimated architectural components: ~18 (Auth, Supabase Client, Realtime, Profile/Vacation/Packing/Leftovers/Shopping/MealPlan/Recipe repositories, OTA check, Pi Session Service, Pi WebSocket Server, TTS Engine, STT Engine, Recipe Import Service, PDF Generator)

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
| LLM API (recipe extraction) | V5 | Reuses V2 LLM provider via repository pattern — URL, YouTube, OCR extraction |
| YouTube Data API | V5 | Transcript retrieval for recipe import — API key required |
| OCR (on-device) | V5 | Text extraction from recipe photos — `react-native-mlkit-ocr` or `expo-camera` + cloud OCR |
| PDF generation (on-device) | V5 | Recipe export — `react-native-html-to-pdf` or similar |
| CAMERA (extended) | V5 | Recipe photo OCR capture — permission requested on first photo import |

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

10. **(V5) LLM reuse across modules** — V2 Shopping introduced LLM-based AI categorisation. V5 Recipes reuses the same LLM provider (via repository pattern) for recipe extraction from HTML, YouTube transcripts, and OCR text. The `ILlmRepository` interface serves both modules — same cost monitoring, same fallback strategy, same swappable provider.

11. **(V5) Meal plan ↔ Recipes integration** — V5 enhances V3 meal plan slots to support multiple linked recipes. This requires a junction table (`meal_slot_recipes`) and changes to the meal plan data flow. The meal plan store and repository must be extended — not replaced — to support recipe linking alongside the existing free-text fallback.

12. **(V5) Shopping list generation pipeline** — The "Generate Shopping List" button in the meal plan triggers a client-side aggregation: read all linked recipes for the week → scale ingredients to per-slot servings → sum quantities by ingredient name (exact match) → present review screen → merge checked items into the shopping list (dedup against existing items). This is a read-heavy, compute-light operation that runs entirely client-side.

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

**V5 Recipes packages:**

```bash
npx expo install expo-image-picker expo-camera
npm install react-native-mlkit-ocr react-native-html-to-pdf react-native-share
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

---

### 1d. (V5) Recipes Data Architecture

**`recipes` table — Supabase PostgreSQL:**

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | Default `gen_random_uuid()` |
| `family_id` | `uuid` FK → `families.id` | RLS-enforced, same pattern as all tables |
| `name` | `text` NOT NULL | e.g., "Bacalhau à Brás" |
| `type` | `text` NOT NULL | Static enum: `'meal'`, `'main'`, `'side'`, `'soup'`, `'dessert'`, `'other'` — shared with meal plan |
| `servings` | `integer` NOT NULL DEFAULT 4 | Base servings count for scaling |
| `prep_time_minutes` | `integer` | Nullable — not all recipes have prep time |
| `cook_time_minutes` | `integer` | Nullable — not all recipes have cook time |
| `cost` | `text` | Manual entry, free-text (e.g., "€8", "~€5") |
| `image_url` | `text` | Local file URI or extracted URL |
| `source_url` | `text` | Original URL if imported from web/YouTube |
| `import_method` | `text` | `'manual'`, `'url'`, `'youtube'`, `'ocr'` — tracks how recipe was created |
| `created_by` | `uuid` FK → `user_accounts.id` | Which admin created it |
| `created_at` | `timestamptz` NOT NULL DEFAULT `now()` | Standard audit column |
| `updated_at` | `timestamptz` NOT NULL DEFAULT `now()` | Standard audit column, trigger-updated |

**Constraints:**
- `CHECK (type IN ('meal', 'main', 'side', 'soup', 'dessert', 'other'))`
- `CHECK (servings > 0)`
- `CHECK (prep_time_minutes >= 0)` (when not null)
- `CHECK (cook_time_minutes >= 0)` (when not null)
- `CHECK (import_method IN ('manual', 'url', 'youtube', 'ocr'))`

**`recipe_steps` table:**

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | Default `gen_random_uuid()` |
| `recipe_id` | `uuid` FK → `recipes.id` ON DELETE CASCADE | |
| `step_number` | `integer` NOT NULL | 1-based, determines display order |
| `instruction` | `text` NOT NULL | Single step text |

**Constraints:**
- `UNIQUE (recipe_id, step_number)` — no duplicate step numbers per recipe

**`recipe_ingredients` table:**

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | Default `gen_random_uuid()` |
| `recipe_id` | `uuid` FK → `recipes.id` ON DELETE CASCADE | |
| `name` | `text` NOT NULL | Ingredient name (e.g., "potatoes", "olive oil") |
| `quantity` | `text` NOT NULL | Free-text with unit (e.g., "600g", "3", "q.b.", "2 cloves") |
| `sort_order` | `integer` NOT NULL DEFAULT 0 | Display order |

**Design decision — quantity as text:** Ingredient quantities in recipes are inherently varied ("600g", "2 cloves", "a pinch", "q.b."). Structured parsing (amount + unit) adds complexity with little benefit at family scale. Scaling uses the numeric portion extracted at runtime (regex pattern: leading digits/decimals). Non-numeric quantities (e.g., "q.b.") are displayed as-is when scaled.

**`recipe_categories` table:**

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | Default `gen_random_uuid()` |
| `family_id` | `uuid` FK → `families.id` | User-defined, same pattern as packing categories |
| `name` | `text` NOT NULL | e.g., "Portuguese", "Greek", "Baking" |
| `icon` | `text` | Optional icon identifier |
| `created_at` | `timestamptz` NOT NULL DEFAULT `now()` | |

**Constraints:**
- `UNIQUE (family_id, name)` — no duplicate category names per family

**`recipe_tags` table:**

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | Default `gen_random_uuid()` |
| `family_id` | `uuid` FK → `families.id` | User-defined, same pattern as packing tags |
| `name` | `text` NOT NULL | e.g., "Quick", "Family Favourite", "Weekend Project" |
| `created_at` | `timestamptz` NOT NULL DEFAULT `now()` | |

**Constraints:**
- `UNIQUE (family_id, name)` — no duplicate tag names per family

**`recipe_category_assignments` table (junction):**

| Column | Type | Notes |
|---|---|---|
| `recipe_id` | `uuid` FK → `recipes.id` ON DELETE CASCADE | |
| `category_id` | `uuid` FK → `recipe_categories.id` ON DELETE CASCADE | |

**Constraints:**
- `PRIMARY KEY (recipe_id, category_id)`

**`recipe_tag_assignments` table (junction):**

| Column | Type | Notes |
|---|---|---|
| `recipe_id` | `uuid` FK → `recipes.id` ON DELETE CASCADE | |
| `tag_id` | `uuid` FK → `recipe_tags.id` ON DELETE CASCADE | |

**Constraints:**
- `PRIMARY KEY (recipe_id, tag_id)`

**`meal_slot_recipes` table (V5 enhancement on V3 meal plan):**

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | Default `gen_random_uuid()` |
| `meal_slot_id` | `uuid` FK → `meal_slots.id` ON DELETE CASCADE | Links to existing V3 meal plan slot |
| `recipe_id` | `uuid` FK → `recipes.id` ON DELETE RESTRICT | Cannot delete a recipe linked to a meal plan |
| `servings_override` | `integer` NOT NULL | Servings for this specific meal — used for scaling |
| `sort_order` | `integer` NOT NULL DEFAULT 0 | Display order within the slot (soup first, main, side, dessert) |

**Constraints:**
- `UNIQUE (meal_slot_id, recipe_id)` — same recipe not linked twice to the same slot
- `CHECK (servings_override > 0)`

**V3 → V5 meal plan enhancement:** The existing V3 `meal_slots` table retains its `name` (free text) and `meal_type` columns. V5 adds `meal_slot_recipes` as an optional junction — a slot can have linked recipes, free text, or both (FR138). The `name` field becomes the free-text fallback when no recipe is linked.

**Migration:** `supabase/migrations/YYYYMMDD000000_recipes_module.sql`
- Creates all 7 tables above with columns, constraints, and foreign keys
- Adds RLS policies: admins in the same `family_id` can read/write all recipe data
- Adds indexes: `idx_recipes_family_id_type` (browse by type), `idx_recipe_ingredients_recipe_id` (ingredient lookups), `idx_meal_slot_recipes_meal_slot_id` (meal plan recipe links)
- `ON DELETE CASCADE` on recipe_steps, recipe_ingredients, recipe_category_assignments, recipe_tag_assignments — deleting a recipe cleans up all related data
- `ON DELETE RESTRICT` on meal_slot_recipes.recipe_id — prevents deleting a recipe that's linked to a meal plan (must unlink first)

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
| `recipesStore` | **(V5)** Recipe list data, active filters (type, categories, tags, time, ingredients), import state (isImporting, importProgress), shopping list generation state |

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
    recipe.repository.interface.ts               ← (V5) IRecipeRepository
    recipe-category.repository.interface.ts      ← (V5) IRecipeCategoryRepository
    recipe-tag.repository.interface.ts           ← (V5) IRecipeTagRepository
    recipe-import.repository.interface.ts        ← (V5) IRecipeImportRepository
    llm.repository.interface.ts                  ← (V5) ILlmRepository (shared with V2 categorization)
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
    recipe.repository.ts            ← (V5) implements IRecipeRepository
    recipe-category.repository.ts   ← (V5) implements IRecipeCategoryRepository
    recipe-tag.repository.ts        ← (V5) implements IRecipeTagRepository
    recipe-import.repository.ts     ← (V5) implements IRecipeImportRepository (URL fetch, YouTube API, OCR)
    llm.repository.ts               ← (V5) implements ILlmRepository (LLM extraction calls)
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

**V5 Communication Layer:**

V5 introduces an LLM-based import pipeline that reuses the same LLM provider pattern from V2 (AI categorisation):

| Service | Protocol | Purpose |
|---|---|---|
| LLM API | HTTP REST | Recipe extraction from HTML, YouTube transcripts, OCR text (FR122–FR128) |
| YouTube Data API | HTTP REST | Video transcript retrieval (FR124–FR126) |

**`ILlmRepository`** wraps LLM API calls — shared between V2 (shopping categorisation) and V5 (recipe extraction). Different prompt templates, same provider.

**`IRecipeImportRepository`** orchestrates the import pipeline:
- URL import: fetch HTML → pass to `ILlmRepository` with extraction prompt → return structured recipe
- YouTube import: call YouTube Data API for transcript → pass to `ILlmRepository` → return structured recipe; fallback: fetch top-level comments → pass to LLM
- OCR import: capture photo via `expo-camera`/`expo-image-picker` → extract text via `react-native-mlkit-ocr` → pass to `ILlmRepository` → return structured recipe

All import paths return the same `RecipeImportResult` type — the admin always reviews and confirms before saving (FR123, FR128).

**PDF generation** — on-device via `react-native-html-to-pdf`. The recipe is rendered as HTML template → converted to PDF → shared via `react-native-share` (Android share sheet). No network call.

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

**V5 Environment Configuration:**

New env vars (all `.env.*` files):

```
LLM_API_URL=https://...                  # LLM provider endpoint (shared with V2 categorization)
LLM_API_KEY=sk-...                       # LLM provider API key
YOUTUBE_DATA_API_KEY=AIza...             # YouTube Data API key for transcript retrieval
```

Injected via `app.config.ts` → `expo-constants`, same pattern as above.

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

**(V5) Recipe import pipeline:**
- All import paths (URL, YouTube, OCR) follow the same flow: extract raw content → send to LLM → present structured result for review → save on admin confirmation
- Import is async with loading state in `recipesStore` — UI shows progress indicator
- LLM failures are non-blocking — admin is informed and can retry or enter manually (FR126)
- YouTube transcript fallback to comments is automatic — no user intervention needed (FR125)

**(V5) Servings scaling:**
- Scaling is a pure function: `scaleQuantity(originalQty, originalServings, targetServings)`
- Extracts numeric portion from free-text quantity via regex (`/^(\d+\.?\d*)/`)
- Non-numeric quantities (e.g., "q.b.", "a pinch") are returned unchanged
- Scaling is view-time only — original recipe data is never modified (FR135)
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
14. **(V5)** All recipe imports go through `IRecipeImportRepository` → `ILlmRepository` — never call LLM APIs directly
15. **(V5)** Recipe scaling is a pure function — never modify original recipe data, always compute at view-time
16. **(V5)** Shopping list generation runs client-side — no Supabase Edge Function or server-side aggregation
17. **(V5)** Request `CAMERA` permission on first photo OCR import, not at module entry

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
├── .env.development            ← SUPABASE_URL, SUPABASE_ANON_KEY, PI_SESSION_URL, PI_WEBSOCKET_URL, LLM_API_URL, LLM_API_KEY, YOUTUBE_DATA_API_KEY
├── .env.preview                ← SUPABASE_URL, SUPABASE_ANON_KEY, PI_SESSION_URL, PI_WEBSOCKET_URL, LLM_API_URL, LLM_API_KEY, YOUTUBE_DATA_API_KEY
├── .env.production             ← SUPABASE_URL, SUPABASE_ANON_KEY, PI_SESSION_URL, PI_WEBSOCKET_URL, LLM_API_URL, LLM_API_KEY, YOUTUBE_DATA_API_KEY
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
│   │       ├── (recipes)/                             ← (V5) Recipes module
│   │       │   ├── index.tsx                         ← Recipe list, browse by type, filters (FR130–FR133)
│   │       │   ├── new.tsx                           ← Add recipe: import method picker → import/manual flow (FR122–FR129)
│   │       │   ├── [recipeId]/
│   │       │   │   ├── index.tsx                     ← Recipe detail with scaling (FR134–FR135)
│   │       │   │   └── edit.tsx                      ← Edit recipe (FR117)
│   │       │   └── import-review.tsx                 ← Review imported recipe before saving (FR123, FR128)
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
│   │   ├── recipes/                   ← (V5) Recipe components
│   │   │   ├── recipe-card.tsx              ← List card with type badge, image, times (FR130)
│   │   │   ├── recipe-type-filter.tsx       ← Type tab bar (meal/main/side/soup/dessert/other)
│   │   │   ├── recipe-filter-panel.tsx      ← Category, tag, ingredient, time filters (FR131–FR133)
│   │   │   ├── ingredient-row.tsx           ← Single ingredient input (name + quantity) for form/edit
│   │   │   ├── step-row.tsx                 ← Single step input for form/edit (reorderable)
│   │   │   ├── servings-scaler.tsx          ← Servings +/- control with scaled ingredients display (FR134)
│   │   │   ├── recipe-import-picker.tsx     ← Import method selector: URL, YouTube, Photo, Manual (FR122–FR129)
│   │   │   ├── shopping-list-review.tsx     ← Ingredient review screen with checkboxes (FR143–FR144)
│   │   │   ├── recipe-pdf-preview.tsx       ← Preview before share (optional)
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
│   │   │   ├── learning-profile.repository.interface.ts ← (V4) ILearningProfileRepository (FR111–FR113)
│   │   │   ├── recipe.repository.interface.ts           ← (V5) IRecipeRepository (FR116–FR121, FR134–FR135, FR149)
│   │   │   ├── recipe-category.repository.interface.ts  ← (V5) IRecipeCategoryRepository (FR120)
│   │   │   ├── recipe-tag.repository.interface.ts       ← (V5) IRecipeTagRepository (FR121)
│   │   │   ├── recipe-import.repository.interface.ts    ← (V5) IRecipeImportRepository (FR122–FR129)
│   │   │   └── llm.repository.interface.ts              ← (V5) ILlmRepository (shared V2 categorization + V5 extraction)
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
│   │   │   ├── learning-profile.repository.ts   ← (V4) Supabase CRUD for learning_profiles
│   │   │   ├── recipe.repository.ts             ← (V5) Supabase CRUD for recipes + steps + ingredients + junction tables
│   │   │   ├── recipe-category.repository.ts    ← (V5) Supabase CRUD for recipe_categories
│   │   │   ├── recipe-tag.repository.ts         ← (V5) Supabase CRUD for recipe_tags
│   │   │   ├── recipe-import.repository.ts      ← (V5) URL fetch, YouTube API, OCR orchestration
│   │   │   └── llm.repository.ts                ← (V5) LLM API calls (extraction + V2 categorization)
│   │   ├── repository.context.tsx       ← React Context — provides all repositories
│   │   └── index.ts                     ← Barrel: exports all interfaces
│   │
│   ├── services/                        ← Long-lived connection managers + utility services
│   │   ├── websocket.service.ts         ← (V4) Pi WebSocket connection manager
│   │   ├── websocket.context.tsx        ← (V4) React Context provider for WebSocketService
│   │   ├── recipe-scaling.service.ts    ← (V5) Pure scaling functions (scaleQuantity, scaleIngredients)
│   │   ├── shopping-list-generator.service.ts ← (V5) Aggregate ingredients from meal plan recipes
│   │   └── recipe-pdf.service.ts        ← (V5) HTML template → PDF generation → share
│   │
│   ├── stores/
│   │   ├── auth.store.ts       ← Session, UserAccount, isLoading, error
│   │   ├── vacation.store.ts   ← Vacation data, activeVacationId, isPinned state
│   │   ├── packing.store.ts    ← Packing data, activeStatusFilters, selectedItemId
│   │   ├── leftovers.store.ts  ← Leftover data, pagination cursor
│   │   ├── shopping.store.ts   ← Shopping list data, category filters
│   │   ├── meal-plan.store.ts  ← Meal plan data, active week, navigation state
│   │   ├── language-learning.store.ts ← (V4) connectionStatus, activeSession, ttsQueue, terminalOutput
│   │   ├── recipes.store.ts          ← (V5) recipe list, filters (type, categories, tags, time, ingredients), import state
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
│   │   ├── use-learning-profile.ts ← (V4) Profile CRUD + onboarding gate logic
│   │   ├── use-recipes.ts          ← (V5) Recipe CRUD + filter/search via IRecipeRepository
│   │   ├── use-recipe-import.ts    ← (V5) Import orchestration (URL/YouTube/OCR) via IRecipeImportRepository
│   │   ├── use-recipe-scaling.ts   ← (V5) Scaling state management (target servings, scaled ingredients)
│   │   └── use-shopping-list-generator.ts ← (V5) Meal plan → ingredient aggregation → shopping list merge
│   │
│   ├── types/
│   │   ├── vacation.types.ts   ← Vacation, VacationLifecycle, BookingTask, BookingTaskType
│   │   ├── packing.types.ts    ← PackingItem, PackingStatus, Category, Tag, Template
│   │   ├── profile.types.ts    ← Profile, UserAccount, UserRole, Family
│   │   ├── leftover.types.ts   ← Leftover, LeftoverStatus, LeftoverWidgetData
│   │   ├── shopping.types.ts   ← ShoppingItem, ShoppingCategory
│   │   ├── meal-plan.types.ts  ← MealPlan, MealSlot, MealType, MealPlanConfig
│   │   ├── language-learning.types.ts ← (V4) Session, LearningProfile, PiWebSocketMessage, LearningSkill
│   │   └── recipe.types.ts           ← (V5) Recipe, RecipeStep, RecipeIngredient, RecipeType, RecipeImportMethod, RecipeImportResult, RecipeCategory, RecipeTag, MealSlotRecipe, ShoppingListGenerationItem
│   │
│   ├── constants/
│   │   ├── status-colours.ts    ← PackingStatus → { bg, text, border } colour tokens
│   │   ├── booking-deadlines.ts ← FLIGHTS_DAYS=90, HOTEL_DAYS=60, CAR_DAYS=30, INSURANCE_DAYS=14
│   │   ├── leftover-defaults.ts ← DEFAULT_EXPIRY_DAYS=5, PAGINATION_PAGE_SIZE
│   │   ├── shopping-defaults.ts ← Shopping list constants
│   │   ├── language-learning-defaults.ts ← (V4) TTS_REPEAT_PAUSE=800, TTS_PHRASE_PAUSE=1200, SKILLS list
│   │   ├── recipe-types.ts              ← (V5) RECIPE_TYPES array, type labels, type icons
│   │   ├── recipe-defaults.ts           ← (V5) DEFAULT_SERVINGS=4, YOUTUBE_API_KEY env ref, LLM prompts
│   │   └── recipe-pdf-template.ts       ← (V5) HTML template string for PDF generation
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
│       ├── YYYYMMDD000000_language_learning_module.sql ← (V4) learning_profiles + RLS
│       └── YYYYMMDD000000_recipes_module.sql          ← (V5) recipes, recipe_steps, recipe_ingredients, recipe_categories, recipe_tags, junction tables, meal_slot_recipes, RLS + indexes
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

**V5 Recipe import data flow:**
```
User pastes URL (or YouTube link, or takes photo)
  → Component calls useRecipeImport().importFromUrl(url)
  → IRecipeImportRepository.importFromUrl(url)
  → Fetch HTML (or YouTube transcript via Data API, or OCR text)
  → ILlmRepository.extractRecipe(content, method)
  → LLM API call → returns RecipeImportResult
  → Component displays import-review screen
  → Admin reviews, edits, confirms
  → IRecipeRepository.create(recipe) → Supabase insert (recipes + steps + ingredients + junctions)
  → recipesStore updated → UI refreshes
```

**V5 Shopping list generation data flow:**
```
Admin taps "Generate Shopping List" in meal plan
  → useShoppingListGenerator().generate(weekId)
  → Read all meal_slot_recipes for the week via IRecipeRepository
  → For each: fetch recipe ingredients, apply servings scaling
  → Aggregate: group by ingredient name (case-insensitive), sum numeric quantities
  → Return ShoppingListGenerationItem[] → display review screen
  → Admin checks items, taps "Add to Shopping List"
  → IShoppingRepository.mergeItems(checkedItems)
    → For each item: check existing → untick/update qty or create new
  → shoppingStore updated → UI refreshes
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
| FR116–FR121 · **(V5)** Recipe CRUD & Types | `(recipes)/new.tsx`, `(recipes)/[recipeId]/index.tsx`, `(recipes)/[recipeId]/edit.tsx`, `recipe.repository.ts`, `recipe-category.repository.ts`, `recipe-tag.repository.ts`, `stores/recipes.store.ts`, `types/recipe.types.ts` |
| FR122–FR129 · **(V5)** Recipe Import | `(recipes)/new.tsx`, `(recipes)/import-review.tsx`, `recipe-import.repository.ts`, `llm.repository.ts`, `hooks/use-recipe-import.ts`, `components/recipes/recipe-import-picker.tsx` |
| FR130–FR133 · **(V5)** Browse & Search | `(recipes)/index.tsx`, `components/recipes/recipe-type-filter.tsx`, `components/recipes/recipe-filter-panel.tsx`, `hooks/use-recipes.ts` |
| FR134–FR135 · **(V5)** Scaling | `(recipes)/[recipeId]/index.tsx`, `components/recipes/servings-scaler.tsx`, `services/recipe-scaling.service.ts`, `hooks/use-recipe-scaling.ts` |
| FR136–FR140 · **(V5)** Meal Plan Integration | `(meal-plan)/index.tsx` (enhanced), `meal-plan.repository.ts` (extended), `recipe.repository.ts`, `stores/meal-plan.store.ts` (extended) |
| FR141–FR146 · **(V5)** Shopping List Generation | `(meal-plan)/index.tsx`, `components/recipes/shopping-list-review.tsx`, `services/shopping-list-generator.service.ts`, `hooks/use-shopping-list-generator.ts`, `shopping.repository.ts` |
| FR147–FR148 · **(V5)** Recipe Sharing | `(recipes)/[recipeId]/index.tsx`, `services/recipe-pdf.service.ts`, `constants/recipe-pdf-template.ts` |
| FR149 · **(V5)** Recipe Sync | `recipe.repository.ts` (Supabase Realtime subscription), `stores/recipes.store.ts` |

---

## Architecture Validation Results

### Coherence Validation ✅

**Decision Compatibility:** All library versions are mutually compatible. `@supabase/supabase-js` v2, `react-native-paper` v5, `react-native-gesture-handler`, `react-native-reanimated`, and Zustand v5 are all Expo SDK 55 compatible. V4 additions: `expo-speech`, `expo-speech-recognition` v3.0.1, and `react-native-webview` are all verified compatible with Expo SDK 55.

> ⚠️ **Critical implementation note:** `expo-dev-client` is required. **Expo Go cannot be used for this project.** Development requires a development build — either `expo run:android` (local) or EAS Build `development` profile. This must be the first thing any implementing agent knows.

**Pattern Consistency:** Repository pattern applied uniformly across all domains. The `snake_case` ↔ `camelCase` conversion boundary exists in exactly one place (repository layer). V4's `ISessionRepository` wraps Pi HTTP calls with the same interface pattern as Supabase repositories. `WebSocketService` is correctly placed in `src/services/` (not repositories) because it manages a long-lived connection. No contradictory decisions found.

**Structure Alignment:** Expo Router `(auth)` / `(app)` group structure maps exactly to the auth boundary decisions. `RepositoryContext` at root `_layout.tsx` provides singleton injection to the full app tree. V4's `WebSocketService` context is scoped to `(language-learning)/_layout.tsx` — correctly limited to the module that needs it.

---

### Requirements Coverage Validation ✅

**Functional Requirements — V1 shipped (FR1–FR57) + V4 (FR100–FR115) + V5 (FR116–FR149) covered:**

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
| FR116–FR121 · **(V5)** Recipe CRUD & Types | `RecipeRepository` + recipe screens + `recipesStore` + category/tag repos ✅ |
| FR122–FR129 · **(V5)** Recipe Import | `RecipeImportRepository` + `LlmRepository` + import-review screen + `use-recipe-import` hook ✅ |
| FR130–FR133 · **(V5)** Browse & Search | Recipe list screen + type filter + filter panel + `use-recipes` hook ✅ |
| FR134–FR135 · **(V5)** Scaling | `recipe-scaling.service.ts` (pure functions) + `servings-scaler` component + `use-recipe-scaling` hook ✅ |
| FR136–FR140 · **(V5)** Meal Plan Integration | `meal_slot_recipes` junction table + extended meal plan repository/store + recipe browser ✅ |
| FR141–FR146 · **(V5)** Shopping List Gen | `shopping-list-generator.service.ts` + review screen + `IShoppingRepository.mergeItems()` ✅ |
| FR147–FR148 · **(V5)** Recipe Sharing | `recipe-pdf.service.ts` + `react-native-html-to-pdf` + `react-native-share` ✅ |
| FR149 · **(V5)** Recipe Sync | Supabase Realtime subscription in `recipe.repository.ts` → `recipesStore` ✅ |

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
| NFR31 · **(V5)** URL import <10s | `IRecipeImportRepository` + `ILlmRepository` — fetch + LLM call within budget ✅ |
| NFR32 · **(V5)** YouTube import <15s | YouTube Data API transcript + LLM — longer budget for API hop ✅ |
| NFR33 · **(V5)** OCR import <10s | On-device OCR (mlkit) + LLM — OCR is fast, LLM is the bottleneck ✅ |
| NFR34 · **(V5)** Search/filter <300ms | Supabase queries with indexes on `family_id` + `type` — client-side filtering for tags/ingredients ✅ |
| NFR35 · **(V5)** Shopping list gen <3s | Client-side aggregation — read recipes + scale + sum — no complex queries ✅ |
| NFR36 · **(V5)** PDF gen <3s | On-device `react-native-html-to-pdf` — no network ✅ |
| NFR37 · **(V5)** LLM cost <€2/month | Cheap model, low volume (few imports/week), shared with V2 — monitored ✅ |

---

### Gap Analysis Results

**V4-specific gaps — document before first V4 implementation story:**

1. **Pi session service must validate userId** — the service must verify that the requested userId maps to a valid Linux user. Invalid userIds must return a clear error, not attempt `sudo -u` with an arbitrary string. Security at the Pi boundary.

2. **WebSocket reconnection after Pi reboot** — if the Pi reboots (pm2 restarts services), existing WebSocket connections drop. The auto-reconnect pattern handles this, but the session may or may not still exist in tmux. The `session/status` endpoint should be called after reconnection to determine if the session is still active.

3. **TTS voice availability** — `expo-speech` el-GR may not be available on all Android devices. First launch of the Language Learning module should check voice availability and prompt the user to install Google TTS engine if no Greek voice is found.

4. **Pi-side repository setup** — The Pi session service and WebSocket server need their own repository with setup documentation. This is a separate project — not part of the FamilyHub mobile app codebase.

**V5-specific gaps — document before first V5 implementation story:**

5. **LLM prompt engineering** — Recipe extraction prompts (URL HTML, YouTube transcript, OCR text) need to be tested against real-world inputs. The prompt must return a consistent JSON structure matching `RecipeImportResult`. Prompt templates should live in `src/constants/recipe-defaults.ts` for easy iteration.

6. **YouTube Data API quota** — The YouTube Data API has a daily quota (10,000 units/day for free tier). Each transcript request costs ~1-5 units. At family scale this is negligible, but the quota should be monitored. If exceeded, the import should fail gracefully with a clear error.

7. **Quantity scaling edge cases** — The scaling regex (`/^(\d+\.?\d*)/`) handles "600g" → "900g" but not "1/2 cup" (fractions) or "2-3 cloves" (ranges). These should be returned unchanged rather than incorrectly scaled. Document this as a known limitation.

8. **Meal plan schema enhancement** — The `meal_slot_recipes` junction table adds a new relationship to the existing V3 `meal_slots` table. The migration must handle existing meal plan data gracefully — existing free-text entries continue to work unchanged.

9. **`react-native-mlkit-ocr` compatibility** — Verify compatibility with Expo SDK 55 managed workflow. If incompatible, fallback options: `expo-camera` + Google Cloud Vision API (adds cost), or defer OCR to a later V5 patch and ship with URL/YouTube/manual only.

---

### Architecture Completeness Checklist

**✅ Requirements Analysis**
- [x] 153 FRs + 37 NFRs analyzed — V1 shipped (FR1–FR57), V4 (FR100–FR115), V5 (FR116–FR149) fully mapped
- [x] Scale and complexity assessed — Low-Medium, solo developer, small fixed user base
- [x] 17 technical constraints identified and resolved (framework, RLS, OTA, M3, Android min, Pi, Tailscale, TTS/STT, LLM, YouTube API, OCR, PDF gen, CAMERA)
- [x] 12 cross-cutting concerns mapped to specific architectural decisions (V4: Pi as second backend, connection reliability, per-user isolation; V5: LLM reuse, meal plan integration, shopping list pipeline)

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
- [x] (V5) Recipe data: 7 tables (recipes, steps, ingredients, categories, tags, 2 junctions + meal_slot_recipes)
- [x] (V5) Import pipeline: IRecipeImportRepository + ILlmRepository (URL/YouTube/OCR → LLM → review → save)
- [x] (V5) Scaling: pure service functions, view-time only, regex-based quantity extraction
- [x] (V5) Meal plan integration: meal_slot_recipes junction, multiple recipes per slot, free-text fallback
- [x] (V5) Shopping list generation: client-side aggregation, review screen, dedup merge into shopping list
- [x] (V5) PDF sharing: on-device HTML-to-PDF, Android share sheet
- [x] (V5) Env config: LLM_API_URL, LLM_API_KEY, YOUTUBE_DATA_API_KEY

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
- [x] (V5) Import pipeline: async with loading state, LLM failure non-blocking, YouTube fallback automatic
- [x] (V5) Scaling: pure function, regex extraction, non-numeric quantities unchanged
- [x] (V5) Shopping list generation: client-side, week-scoped, exact name match, dedup against existing
- [x] (V5) PDF sharing: HTML template in constants, on-device generation, share sheet
- [x] (V5) CAMERA permission: requested on first OCR import, not at module entry

**✅ Project Structure**
- [x] Complete directory tree — every file named, located, and annotated with FR reference
- [x] All repository interfaces + implementations mapped (V4: +session, +learning-profile; V5: +recipe, +recipe-category, +recipe-tag, +recipe-import, +llm)
- [x] V4 components: terminal-display, mic-button, skill-card, connection-status-bar, tts-indicator
- [x] V5 components: recipe-card, recipe-type-filter, recipe-filter-panel, ingredient-row, step-row, servings-scaler, recipe-import-picker, shopping-list-review, recipe-pdf-preview
- [x] V4 hooks: use-session, use-tts-queue, use-stt, use-learning-profile
- [x] V5 hooks: use-recipes, use-recipe-import, use-recipe-scaling, use-shopping-list-generator
- [x] V4 service: WebSocketService + context provider
- [x] V5 services: recipe-scaling, shopping-list-generator, recipe-pdf
- [x] All FR categories mapped to specific directories (V4: FR100–FR115; V5: FR116–FR149 mapped)
- [x] Canonical data flows documented (V1–V3 + V4 Language Learning + V5 Recipe import + V5 Shopping list generation)

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
- V5 reuses existing patterns (repository, Zustand, Realtime, LLM) — no new architectural paradigms, just new tables and services
- Shopping list generation is a pure client-side operation — no server-side complexity, no edge functions

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
- (V5) All recipe imports go through `IRecipeImportRepository` → `ILlmRepository` — never call LLM APIs directly
- (V5) Recipe scaling is a pure function — never modify original recipe data
- (V5) Shopping list generation runs client-side — no Supabase Edge Functions
- (V5) Request `CAMERA` permission on first photo OCR import, not at module entry

**V4 Implementation Packages:**
```bash
npx expo install expo-speech expo-speech-recognition react-native-webview
```

**V5 Implementation Packages:**
```bash
npx expo install expo-image-picker expo-camera
npm install react-native-mlkit-ocr react-native-html-to-pdf react-native-share
```
