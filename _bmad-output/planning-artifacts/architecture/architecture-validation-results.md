# Architecture Validation Results

## Coherence Validation ✅

**Decision Compatibility:** All library versions are mutually compatible. `@supabase/supabase-js` v2, `react-native-paper` v5, `react-native-gesture-handler`, `react-native-reanimated`, and Zustand v5 are all Expo SDK 55 compatible. V4 additions: `expo-speech`, `expo-speech-recognition` v3.0.1 are all verified compatible with Expo SDK 55.

> ⚠️ **Critical implementation note:** `expo-dev-client` is required. **Expo Go cannot be used for this project.** Development requires a development build — either `expo run:android` (local) or EAS Build `development` profile. This must be the first thing any implementing agent knows.

**Pattern Consistency:** Repository pattern applied uniformly across all domains. The `snake_case` ↔ `camelCase` conversion boundary exists in exactly one place (repository layer). V4's `ISessionRepository` wraps Pi HTTP calls with the same interface pattern as Supabase repositories. `WebSocketService` is correctly placed in `src/services/` (not repositories) because it manages a long-lived connection. No contradictory decisions found.

**Structure Alignment:** Expo Router `(auth)` / `(app)` group structure maps exactly to the auth boundary decisions. `RepositoryContext` at root `_layout.tsx` provides singleton injection to the full app tree. V4's `WebSocketService` context is scoped to `(language-learning)/_layout.tsx` — correctly limited to the module that needs it.

---

## Requirements Coverage Validation ✅

**Functional Requirements — V1 shipped (FR1–FR57) + V4 (FR100–FR116) + V5 (FR117–FR150) covered:**

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
| FR111–FR113 · **(V4)** API Key Configuration | API key setup screen + ISessionRepository.configure() + per-user provisioning + learning profile creation ✅ |
| FR114 · **(V4)** User Isolation | Per-user Linux accounts on Pi, per-user auth.json, per-user home directories ✅ |
| FR115 · **(V4)** Connection Status | connectionStatus in store + connection status bar component ✅ |
| FR116 · **(V4)** Skill-Complete Signal | Signal handler in WebSocket service → auto-calls session end ✅ |
| FR117–FR121 · **(V5)** Recipe CRUD & Types | `RecipeRepository` + recipe screens + `recipesStore` + category/tag repos ✅ |
| FR123–FR129 · **(V5)** Recipe Import | `RecipeImportRepository` + `LlmRepository` + import-review screen + `use-recipe-import` hook ✅ |
| FR131–FR133 · **(V5)** Browse & Search | Recipe list screen + type filter + filter panel + `use-recipes` hook ✅ |
| FR135–FR136 · **(V5)** Scaling | `recipe-scaling.service.ts` (pure functions) + `servings-scaler` component + `use-recipe-scaling` hook ✅ |
| FR137–FR141 · **(V5)** Meal Plan Integration | `meal_slot_recipes` junction table + extended meal plan repository/store + recipe browser ✅ |
| FR142–FR147 · **(V5)** Shopping List Gen | `shopping-list-generator.service.ts` + review screen + `IShoppingRepository.mergeItems()` ✅ |
| FR148–FR149 · **(V5)** Recipe Sharing | `recipe-pdf.service.ts` + `react-native-html-to-pdf` + `react-native-share` ✅ |
| FR150 · **(V5)** Recipe Sync | Supabase Realtime subscription in `recipe.repository.ts` → `recipesStore` ✅ |

**Non-Functional Requirements:**

| NFR | Architectural Support |
|---|---|
| NFR1–NFR4 · Performance | Direct Supabase queries, Realtime for live updates ✅ |
| NFR5–NFR11 · Security | `expo-secure-store` for session tokens, RLS enforced, no passwords stored ✅ |
| NFR12 · Last-write-wins | `updated_at`-based conflict resolution ✅ |
| NFR17 · Repository pattern | Typed interfaces + Context injection — zero direct SDK calls in business logic ✅ |
| NFR22 · No onboarding wizard | `(auth)/sign-in.tsx` routes directly to dashboard ✅ |
| NFR23 · Expiry calculation locality | Computed client-side from `expiry_date` vs `Date.now()` ✅ |
| NFR27 · **(V4)** Session service <5s | Direct HTTPS to Pi via Cloudflare Tunnel — low latency ✅ |
| NFR28 · **(V4)** TTS <500ms | `expo-speech` starts immediately from queue — no network hop ✅ |
| NFR29 · **(V4)** STT <2s | `expo-speech-recognition` runs on-device — Android native STT ✅ |
| NFR30 · **(V4)** TTS double-speak timing | Constants in `language-learning-defaults.ts`, enforced by `use-tts-queue` ✅ |
| NFR31 · **(V4)** API key HTTPS transmission | Cloudflare Tunnel provides TLS — API key never travels unencrypted ✅ |
| NFR32 · **(V4)** API key file permissions | Per-user auth.json with owner-only file permissions on Pi ✅ |
| NFR33 · **(V5)** URL import <10s | `IRecipeImportRepository` + `ILlmRepository` — fetch + LLM call within budget ✅ |
| NFR34 · **(V5)** YouTube import <15s | YouTube Data API transcript + LLM — longer budget for API hop ✅ |
| NFR35 · **(V5)** OCR import <10s | On-device OCR (mlkit) + LLM — OCR is fast, LLM is the bottleneck ✅ |
| NFR36 · **(V5)** Search/filter <300ms | Supabase queries with indexes on `family_id` + `type` — client-side filtering for tags/ingredients ✅ |
| NFR37 · **(V5)** Shopping list gen <3s | Client-side aggregation — read recipes + scale + sum — no complex queries ✅ |
| NFR38 · **(V5)** PDF gen <3s | On-device `react-native-html-to-pdf` — no network ✅ |
| NFR39 · **(V5)** LLM cost <€2/month | Cheap model, low volume (few imports/week), shared with V2 — monitored ✅ |

---

## Gap Analysis Results

**V4-specific gaps — document before first V4 implementation story:**

1. **Pi session service must validate userId** — the service must verify that the requested userId maps to a valid Linux user with a provisioned OpenCode environment and auth.json. Invalid userIds must return a clear error, not attempt to run OpenCode under an arbitrary user. The `/auth/configure` endpoint provisions Linux accounts and writes per-user auth.json — this must be atomic and idempotent.

2. **WebSocket reconnection after Pi reboot** — if the Pi reboots (Podman restarts containers), existing WebSocket connections drop. The auto-reconnect pattern handles this, but the session may or may not still exist. The `session/status` endpoint should be called after reconnection to determine if the session is still active.

3. **TTS voice availability** — `expo-speech` el-GR may not be available on all Android devices. First launch of the Language Learning module should check voice availability and prompt the user to install Google TTS engine if no Greek voice is found.

4. **Pi-side repository setup** — The Pi session service and WebSocket server need their own repository with setup documentation. This is a separate project — not part of the FamilyHub mobile app codebase.

**V5-specific gaps — document before first V5 implementation story:**

5. **LLM prompt engineering** — Recipe extraction prompts (URL HTML, YouTube transcript, OCR text) need to be tested against real-world inputs. The prompt must return a consistent JSON structure matching `RecipeImportResult`. Prompt templates should live in `src/constants/recipe-defaults.ts` for easy iteration.

6. **YouTube Data API quota** — The YouTube Data API has a daily quota (10,000 units/day for free tier). Each transcript request costs ~1-5 units. At family scale this is negligible, but the quota should be monitored. If exceeded, the import should fail gracefully with a clear error.

7. **Quantity scaling edge cases** — The scaling regex (`/^(\d+\.?\d*)/`) handles "600g" → "900g" but not "1/2 cup" (fractions) or "2-3 cloves" (ranges). These should be returned unchanged rather than incorrectly scaled. Document this as a known limitation.

8. **Meal plan schema enhancement** — The `meal_slot_recipes` junction table adds a new relationship to the existing V3 `meal_slots` table. The migration must handle existing meal plan data gracefully — existing free-text entries continue to work unchanged.

9. **`react-native-mlkit-ocr` compatibility** — Verify compatibility with Expo SDK 55 managed workflow. If incompatible, fallback options: `expo-camera` + Google Cloud Vision API (adds cost), or defer OCR to a later V5 patch and ship with URL/YouTube/manual only.

---

## Architecture Completeness Checklist

**✅ Requirements Analysis**
- [x] 154 FRs + 39 NFRs analyzed — V1 shipped (FR1–FR57), V4 (FR100–FR116), V5 (FR117–FR150) fully mapped
- [x] Scale and complexity assessed — Low-Medium, solo developer, small fixed user base
- [x] 17 technical constraints identified and resolved (framework, RLS, OTA, M3, Android min, Pi, Cloudflare Tunnel, TTS/STT, LLM, YouTube API, OCR, PDF gen, CAMERA)
- [x] 13 cross-cutting concerns mapped to specific architectural decisions (V4: Pi as second backend, connection reliability, per-user isolation, API key configuration; V5: LLM reuse, meal plan integration, shopping list pipeline)

**✅ Architectural Decisions**
- [x] Framework: Expo SDK 55 + TypeScript
- [x] Data access: Direct Supabase queries + Supabase Realtime subscriptions
- [x] State management: Zustand stores for data + UI state
- [x] Auth: Google Sign-In → Supabase Auth → `expo-secure-store`
- [x] Repository pattern: typed interfaces for all external services (Supabase + Pi)
- [x] Schema: `family_id` on every table + RLS from V1
- [x] Environments: 3 EAS profiles (development / preview / production)
- [x] OTA: EAS Update (JS bundle, no APK rebuild)
- [x] (V4) Pi Session Service: Express.js HTTP REST, port 3000, Podman-managed
- [x] (V4) Pi WebSocket Server: ws library, port 3001, userId-based routing
- [x] (V4) TTS: expo-speech el-GR with double-speak pattern
- [x] (V4) STT: expo-speech-recognition el-GR, mic as keyboard replacement
- [x] (V4) Networking: Cloudflare Tunnel (api.fh-morais.party / wss://ws.fh-morais.party)
- [x] (V4) API key configuration: per-user OpenCode Zen/Go key, in-app submission, session service validation and provisioning
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
- [x] (V4) API key gate: api_key_configured check before skill menu, ISessionRepository.configure() for setup
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
- [x] All FR categories mapped to specific directories (V4: FR100–FR116; V5: FR117–FR150 mapped)
- [x] Canonical data flows documented (V1–V3 + V4 Language Learning + V5 Recipe import + V5 Shopping list generation)

---

## Architecture Readiness Assessment

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

## Implementation Handoff

**AI Agent Guidelines:**
- Follow all architectural decisions exactly as documented — no vendor SDK calls outside repositories
- Use `snake_case` ↔ `camelCase` conversion exclusively in the repository layer
- Use Zustand stores for all state; Supabase Realtime subscriptions for live updates
- (V4) Never call Pi session service directly — only through `ISessionRepository`
- (V4) Use WebSocketService via context — handle all messages with discriminated union switch
- (V4) Harness code lives in `harness/` within the FamilyHub repo
- (V5) All recipe imports go through `IRecipeImportRepository` → `ILlmRepository` — never call LLM APIs directly
- (V5) Recipe scaling is a pure function — never modify original recipe data
- (V5) Shopping list generation runs client-side — no Supabase Edge Functions
- (V5) Request `CAMERA` permission on first photo OCR import, not at module entry

**V4 Implementation Packages:**
```bash
npx expo install expo-speech expo-speech-recognition
```

**V5 Implementation Packages:**
```bash
npx expo install expo-image-picker expo-camera
npm install react-native-mlkit-ocr react-native-html-to-pdf react-native-share
```
