# Core Architectural Decisions

## 1. Data Architecture

**Direct Supabase Queries + Realtime Subscriptions**

All data access is via `@supabase/supabase-js` v2 — direct `.select()`, `.insert()`, `.update()`, `.delete()` calls. No local database, no offline cache. Real-time sync between admins is handled by Supabase Realtime channel subscriptions — components subscribe to table changes and re-render when data arrives. Conflict resolution strategy: **last-write-wins** based on `updated_at` timestamp.

**Schema Strategy: `family_id` on every table + RLS from V1**

Every table carries a `family_id` foreign key. RLS policies enforced at the PostgreSQL layer from the first migration. V1 policies are permissive (admin-only family), but the policy structure anticipates V4 private envelopes and V5 maid isolation — retrofitting RLS is far more painful than designing for it upfront.

**Migrations: Supabase CLI (`supabase/migrations/`)**

All schema changes via `supabase migration new` → apply with `supabase db push`. Migration files committed to git. No manual schema edits in the Supabase dashboard.

---

## 1b. (V2) Leftovers Data Architecture

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

## 1c. (V4) Language Learning Data Architecture

**`learning_profiles` table — Supabase PostgreSQL:**

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | Default `gen_random_uuid()` |
| `family_id` | `uuid` FK → `families.id` | RLS-enforced, same pattern as all tables |
| `user_account_id` | `uuid` FK → `user_accounts.id` | One profile per admin |
| `setup_complete` | `boolean` NOT NULL DEFAULT `false` | Set to true after /setup skill completes; skill menu gate is now api_key_configured |
| `api_key_configured` | `boolean` NOT NULL DEFAULT `false` | Gating flag for skill menu — user must submit OpenCode Zen/Go API key before accessing skills (FR111) |
| `goals` | `text` | e.g., "read, write, speak" — set during setup |
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

**Minimal Supabase footprint** — all learning content and session state lives on the Pi. Supabase only stores the API key configuration flag and profile preferences.

---

## 1d. (V5) Recipes Data Architecture

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

**V3 → V5 meal plan enhancement:** The existing V3 `meal_slots` table retains its `name` (free text) and `meal_type` columns. V5 adds `meal_slot_recipes` as an optional junction — a slot can have linked recipes, free text, or both (FR139). The `name` field becomes the free-text fallback when no recipe is linked.

**Migration:** `supabase/migrations/YYYYMMDD000000_recipes_module.sql`
- Creates all 7 tables above with columns, constraints, and foreign keys
- Adds RLS policies: admins in the same `family_id` can read/write all recipe data
- Adds indexes: `idx_recipes_family_id_type` (browse by type), `idx_recipe_ingredients_recipe_id` (ingredient lookups), `idx_meal_slot_recipes_meal_slot_id` (meal plan recipe links)
- `ON DELETE CASCADE` on recipe_steps, recipe_ingredients, recipe_category_assignments, recipe_tag_assignments — deleting a recipe cleans up all related data
- `ON DELETE RESTRICT` on meal_slot_recipes.recipe_id — prevents deleting a recipe that's linked to a meal plan (must unlink first)

**Pi-Side Infrastructure (within FamilyHub repo at `harness/`):**

The Pi hosts a single FastAPI service in a Podman container:

**Harness API (FastAPI, port 8000):**

| Endpoint | Method | Purpose |
|---|---|---|
| `/health` | GET | Health check — returns `{ status: "ok" }` |
| `/auth/configure` | POST | Validates API key, provisions per-user data directory, stores key with chmod 600 |
| `/auth/status` | GET | Returns `{ configured: bool, setupComplete: bool }` |
| `/session/start` | POST | Starts LangGraph agent with specified Fluent skill, returns SSE stream |
| `/session/resume` | POST | Resumes existing session from LangGraph checkpoint |
| `/session/end` | POST | Persists learner data, writes session result file, terminates session |
| `/session/status` | GET | Returns `{ active: bool, skill: string }` |
| `/session/message` | POST | Sends user message to agent, returns SSE stream |

Implementation: FastAPI (Python) in a single Podman container. Auth via Supabase JWT passthrough. Communication via SSE (Server-Sent Events) — no WebSocket. Per-user data isolation by directory path and file permissions (NFR32).

**Process Management:** Podman with auto-restart on boot. Single container with `--restart=always`.

**Networking:** Cloudflare Tunnel. `api.fh-morais.party` → FastAPI (port 8000). Single domain, single port. No VPN required on phone, no public IP, TLS terminated by Cloudflare.

---

## 2. Auth & Security

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

## 3. State Management

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

## 4. API & Communication

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
| Pi Session Service | HTTP REST | Session lifecycle (start/resume/end/status) + API key configuration |
| Pi WebSocket Server | WebSocket | Greek text relay, signals (setup-complete, skill-complete), terminal output |

**`ISessionRepository`** wraps the Pi HTTP REST calls — same repository pattern as Supabase (NFR17). Base URL from env config (`PI_SESSION_URL`).

**`WebSocketService`** manages the persistent WebSocket connection to the Pi. Not a repository (long-lived connection, not request-response). Provided via React Context at the `(language-learning)` layout level.

**V5 Communication Layer:**

V5 introduces an LLM-based import pipeline that reuses the same LLM provider pattern from V2 (AI categorisation):

| Service | Protocol | Purpose |
|---|---|---|
| LLM API | HTTP REST | Recipe extraction from HTML, YouTube transcripts, OCR text (FR123–FR129) |
| YouTube Data API | HTTP REST | Video transcript retrieval (FR125–FR127) |

**`ILlmRepository`** wraps LLM API calls — shared between V2 (shopping categorisation) and V5 (recipe extraction). Different prompt templates, same provider.

**`IRecipeImportRepository`** orchestrates the import pipeline:
- URL import: fetch HTML → pass to `ILlmRepository` with extraction prompt → return structured recipe
- YouTube import: call YouTube Data API for transcript → pass to `ILlmRepository` → return structured recipe; fallback: fetch top-level comments → pass to LLM
- OCR import: capture photo via `expo-camera`/`expo-image-picker` → extract text via `react-native-mlkit-ocr` → pass to `ILlmRepository` → return structured recipe

All import paths return the same `RecipeImportResult` type — the admin always reviews and confirms before saving (FR124, FR129).

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

## 5. Infrastructure & Deployment

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
PI_SESSION_URL=https://api.fh-morais.party    # Cloudflare Tunnel → session service
PI_WEBSOCKET_URL=wss://ws.fh-morais.party     # Cloudflare Tunnel → WebSocket server
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

Pi-side code lives in `harness/` within the FamilyHub repo — different runtime (Python/FastAPI on Raspberry Pi), different deployment (Podman), different concerns. The mobile app treats the harness as an external service.

| Component | Technology | Management |
|---|---|---|
| Session Service | Express.js, port 3000 | Podman container, auto-restart |
| WebSocket Server | ws library, port 3001 | Podman container, auto-restart |
| Process Manager | Podman | `--restart=always`, systemd integration |
| Networking | Cloudflare Tunnel | api.fh-morais.party / ws.fh-morais.party |

---
