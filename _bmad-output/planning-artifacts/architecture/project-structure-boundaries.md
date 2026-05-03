# Project Structure & Boundaries

## Complete Project Directory Structure

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
│   │       │   ├── new.tsx                           ← Add recipe: import method picker → import/manual flow (FR123–FR130)
│   │       │   ├── [recipeId]/
│   │       │   │   ├── index.tsx                     ← Recipe detail with scaling (FR135–FR136)
│   │       │   │   └── edit.tsx                      ← Edit recipe (FR118)
│   │       │   └── import-review.tsx                 ← Review imported recipe before saving (FR124, FR129)
│   │       ├── (language-learning)/           ← (V4) Language Learning module
│   │       │   ├── _layout.tsx               ← WebSocketService provider + connection status bar
│   │       │   ├── index.tsx                 ← Skill selection screen + API key gate (FR109, FR111)
│   │       │   ├── session.tsx               ← Terminal display + TTS + mic (FR100–FR108)
│   │       │   └── api-key-setup.tsx           ← API key configuration screen (FR111-FR113)
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
│   │   │   ├── servings-scaler.tsx          ← Servings +/- control with scaled ingredients display (FR135)
│   │   │   ├── recipe-import-picker.tsx     ← Import method selector: URL, YouTube, Photo, Manual (FR123–FR130)
│   │   │   ├── shopping-list-review.tsx     ← Ingredient review screen with checkboxes (FR143–FR144)
│   │   │   ├── recipe-pdf-preview.tsx       ← Preview before share (optional)
│   │   │   └── index.ts
│   │   └── language-learning/         ← (V4) Language Learning components
│   │       ├── terminal-display.tsx         ← Scrollable terminal output view (FR106)
│   │       ├── mic-button.tsx               ← STT capture toggle (FR107)
│   │       ├── skill-card.tsx               ← Skill selection button with resume badge (FR109)
│   │       ├── connection-status-bar.tsx    ← Pi connection indicator (FR115)
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
│   │   │   ├── recipe.repository.interface.ts           ← (V5) IRecipeRepository (FR117–FR121, FR135–FR136, FR150)
│   │   │   ├── recipe-category.repository.interface.ts  ← (V5) IRecipeCategoryRepository (FR121)
│   │   │   ├── recipe-tag.repository.interface.ts       ← (V5) IRecipeTagRepository (FR122)
│   │   │   ├── recipe-import.repository.interface.ts    ← (V5) IRecipeImportRepository (FR123–FR130)
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
│   │   ├── use-learning-profile.ts ← (V4) Profile CRUD + API key gate logic
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

## Architectural Boundaries

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
User enters API key
  → Component calls ISessionRepository.configure(userId, apiKey)
  → HTTP POST to Pi /auth/configure endpoint
  → Pi validates key, writes per-user auth.json, provisions environment
  → Pi returns success
  → Learning profile updated: api_key_configured = true

User taps skill
  → Component calls useSession().start(skill)
  → ISessionRepository.start(userId, skill)
  → HTTP POST to Pi session service
  → Pi starts OpenCode process under user's home directory with Fluent skill
  → Pi returns success

OpenCode (Fluent skill) sends Greek text
  → Pi WebSocket server routes to userId
  → WebSocketService receives message
  → languageLearningStore.ttsQueue updated
  → useTtsQueue hook speaks via expo-speech (double-speak)
  → Terminal display shows text (FR106)

User taps mic
  → useStt hook starts expo-speech-recognition (el-GR)
  → Transcript sent to Pi via WebSocket
  → OpenCode receives plain text (FR108)
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
- Pi-side code lives in `harness/` within the FamilyHub repo, deployed separately via Podman

---

## FR Categories → Directory Mapping

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
| FR111–FR113 · **(V4)** API Key Configuration | `hooks/use-learning-profile.ts`, `(language-learning)/index.tsx`, `(language-learning)/api-key-setup.tsx` |
| FR114 · **(V4)** User Isolation | Per-user Linux accounts, per-user auth.json |
| FR115 · **(V4)** Connection Status | `components/language-learning/connection-status-bar.tsx`, `stores/language-learning.store.ts` |
| FR116 · **(V4)** Skill-Complete Signal | `services/websocket.service.ts`, `stores/language-learning.store.ts` |
| FR117–FR121 · **(V5)** Recipe CRUD & Types | `(recipes)/new.tsx`, `(recipes)/[recipeId]/index.tsx`, `(recipes)/[recipeId]/edit.tsx`, `recipe.repository.ts`, `recipe-category.repository.ts`, `recipe-tag.repository.ts`, `stores/recipes.store.ts`, `types/recipe.types.ts` |
| FR123–FR129 · **(V5)** Recipe Import | `(recipes)/new.tsx`, `(recipes)/import-review.tsx`, `recipe-import.repository.ts`, `llm.repository.ts`, `hooks/use-recipe-import.ts`, `components/recipes/recipe-import-picker.tsx` |
| FR131–FR133 · **(V5)** Browse & Search | `(recipes)/index.tsx`, `components/recipes/recipe-type-filter.tsx`, `components/recipes/recipe-filter-panel.tsx`, `hooks/use-recipes.ts` |
| FR135–FR136 · **(V5)** Scaling | `(recipes)/[recipeId]/index.tsx`, `components/recipes/servings-scaler.tsx`, `services/recipe-scaling.service.ts`, `hooks/use-recipe-scaling.ts` |
| FR137–FR141 · **(V5)** Meal Plan Integration | `(meal-plan)/index.tsx` (enhanced), `meal-plan.repository.ts` (extended), `recipe.repository.ts`, `stores/meal-plan.store.ts` (extended) |
| FR142–FR147 · **(V5)** Shopping List Generation | `(meal-plan)/index.tsx`, `components/recipes/shopping-list-review.tsx`, `services/shopping-list-generator.service.ts`, `hooks/use-shopping-list-generator.ts`, `shopping.repository.ts` |
| FR148–FR149 · **(V5)** Recipe Sharing | `(recipes)/[recipeId]/index.tsx`, `services/recipe-pdf.service.ts`, `constants/recipe-pdf-template.ts` |
| FR150 · **(V5)** Recipe Sync | `recipe.repository.ts` (Supabase Realtime subscription), `stores/recipes.store.ts` |

---
