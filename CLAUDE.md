# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What Is This

FamilyHub is a family management mobile app built with React Native (Expo 55) targeting Android. It uses Supabase (PostgreSQL + Auth + Storage + Realtime + Edge Functions) as the backend. The UI is Portuguese-language throughout.

## Commands

```bash
# Development
npm start                        # Start Expo dev server
npm run android                  # Run on Android device/emulator
npm run lint                     # ESLint
npm run lint:fix                 # ESLint with auto-fix
npm run format                   # Prettier
npm run type-check               # TypeScript type checking (tsc --noEmit)

# Building (EAS cloud builds)
npm run build:dev                # Development APK (debug, dev client)
npm run build:preview            # Preview APK
npm run build:production         # Production APK

# Database (Supabase CLI)
supabase start                   # Start local Supabase stack
supabase db push                 # Apply migrations to linked remote project
supabase db reset                # Reset local DB (migrations + seed)
```

## Database Migrations

- Before running `supabase db push`, always verify which project is linked by running `supabase projects list` and confirming the linked project is the **dev** environment (`familyhub-dev` / `vblyzgjvseodveypmxdz`). Never push migrations to production without explicit user confirmation.
- Migration files live in `supabase/migrations/` and are applied in filename order.
- Edge Functions live in `supabase/functions/` (recipe import: URL, YouTube, photo extraction).

## Architecture

### Layers

```
Routes (Expo Router)  →  Hooks  →  Stores (Zustand) + Repositories  →  Supabase
                                         ↕
                                     Services
```

- **Expo Router** (`src/app/`): File-based routing. `(app)/` contains authenticated tab screens, `(auth)/` has sign-in. Route groups map to feature modules: `(home)`, `(meal-plan)`, `(shopping)`, `(leftovers)`, `(recipes)`, `(vacations)`, `(settings)`.
- **Repository pattern** (`src/repositories/`): Interfaces in `interfaces/`, Supabase implementations in `supabase/`. All repositories are provided via React Context (`repository.context.tsx`). Access them with `useRepository()` hook.
- **Zustand stores** (`src/stores/`): Lightweight client state per domain (auth, recipes, shopping, meal-plan, etc.). No persistence layer — state resets on app restart.
- **Services** (`src/services/`): Stateless business logic — recipe scaling, shopping list generation/merge, PDF export.
- **Types** (`src/types/`): TypeScript interfaces for all domain models.
- **Hooks** (`src/hooks/`): `use-auth-guard`, `use-current-profile`, `use-family`, `use-recipe-realtime`, `use-repository`.

### Authentication Flow

Google OAuth → Supabase Auth → session stored in `expo-secure-store` (encrypted on-device) → hydrated on cold launch via `supabase.client.ts` custom storage adapter.

### Key Configuration

- `app.config.ts`: Dynamic Expo config. Reads `APP_ENV` to switch between dev/prod icons and app names. Injects Supabase URL, anon key, and Google Web Client ID from env vars at build time.
- `eas.json`: Three build profiles (development, preview, production) each with their own env vars.
- Path alias: `@/*` maps to `src/*` (configured in `tsconfig.json`).
- UI framework: React Native Paper (Material Design).

### Feature Modules

| Module | Routes | Key Entities |
|--------|--------|-------------|
| Recipes | `(recipes)/` | recipes, recipe_categories, recipe_tags, recipe_ratings, ingredients |
| Meal Plan | `(meal-plan)/` | meal_entries (links recipes to weekly slots) |
| Shopping | `(shopping)/` | shopping_items, shopping_categories, shopping_list_items |
| Leftovers | `(leftovers)/` | leftovers (with type tracking) |
| Vacations | `(vacations)/` | vacations, packing_items, booking_tasks, templates |
| Settings | `(settings)/` | profiles, categories, tags, templates config |

### Supabase Storage Buckets

`avatars`, `family-banners`, `vacation-covers` — all public, authenticated access.

<!-- code-review-graph MCP tools -->
## MCP Tools: code-review-graph

**IMPORTANT: This project has a knowledge graph. ALWAYS use the
code-review-graph MCP tools BEFORE using Grep/Glob/Read to explore
the codebase.** The graph is faster, cheaper (fewer tokens), and gives
you structural context (callers, dependents, test coverage) that file
scanning cannot.

### When to use graph tools FIRST

- **Exploring code**: `semantic_search_nodes` or `query_graph` instead of Grep
- **Understanding impact**: `get_impact_radius` instead of manually tracing imports
- **Code review**: `detect_changes` + `get_review_context` instead of reading entire files
- **Finding relationships**: `query_graph` with callers_of/callees_of/imports_of/tests_for
- **Architecture questions**: `get_architecture_overview` + `list_communities`

Fall back to Grep/Glob/Read **only** when the graph doesn't cover what you need.

### Key Tools

| Tool | Use when |
|------|----------|
| `detect_changes` | Reviewing code changes — gives risk-scored analysis |
| `get_review_context` | Need source snippets for review — token-efficient |
| `get_impact_radius` | Understanding blast radius of a change |
| `get_affected_flows` | Finding which execution paths are impacted |
| `query_graph` | Tracing callers, callees, imports, tests, dependencies |
| `semantic_search_nodes` | Finding functions/classes by name or keyword |
| `get_architecture_overview` | Understanding high-level codebase structure |
| `refactor_tool` | Planning renames, finding dead code |

### Workflow

1. The graph auto-updates on file changes (via hooks).
2. Use `detect_changes` for code review.
3. Use `get_affected_flows` to understand impact.
4. Use `query_graph` pattern="tests_for" to check coverage.
