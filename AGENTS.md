<!-- code-review-graph MCP tools -->
# code-review-graph
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
---
#FamilyHub
## What Is This
FamilyHub is a family management mobile app built with React Native (Expo 55) targeting **Android only**. It uses Supabase (PostgreSQL + Auth + Storage + Realtime + Edge Functions) as the backend. The UI is **Portuguese-language** throughout.
## References
Architecture: _bmad-output/planning-artifacts/architecture/index.md
PRD: _bmad-output/planning-artifacts/prd/index.md
## Commands
```bash
# Development
npm start                        # Start Expo dev server
npm run android                  # Run on Android device/emulator
npm run lint                     # ESLint (src/ only)
npm run lint:fix                 # ESLint with auto-fix
npm run format                   # Prettier
npm run type-check               # TypeScript (tsc --noEmit)

# Building (EAS cloud builds)
npm run build:dev                # Development APK (debug, dev client)
npm run build:preview            # Preview APK
npm run build:production         # Production APK

# OTA Updates (EAS Update) — message is the first positional arg
npm run ota:dev "fix: login crash"
npm run ota:production "feat: new recipe import"

# Database (Supabase CLI)
supabase start                   # Start local Supabase stack
supabase db push                 # Apply migrations to linked remote project
supabase db reset                # Reset local DB (migrations + seed)
```
## Architecture
```
Routes (Expo Router) → Hooks → Stores (Zustand) + Repositories → Supabase
                                         ↕
                                     Services
```
- **Expo Router** (`src/app/`): File-based routing. `(app)/` contains authenticated tab screens, `(auth)/` has sign-in. Route groups map to feature modules: `(home)`, `(meal-plan)`, `(shopping)`, `(leftovers)`, `(recipes)`, `(suggestions)`, `(vacations)`, `(settings)`.
- **Repository pattern** (`src/repositories/`): Interfaces in `interfaces/`, Supabase implementations in `supabase/`. All repositories are provided via React Context (`repository.context.tsx`). Access them with `useRepository()` hook.
- **Zustand stores** (`src/stores/`): Lightweight client state per domain. No persistence — state resets on app restart.
- **Services** (`src/services/`): Stateless business logic — recipe scaling, shopping list generation/merge, PDF export.
- **Path alias**: `@/*` maps to `src/*`.
### Authentication Flow
Google OAuth → Supabase Auth → session stored in `expo-secure-store` (encrypted on-device) → hydrated on cold launch via `supabase.client.ts` custom storage adapter.
## Database & Backend
- **Migrations**: `supabase/migrations/` — applied in filename order. There is no test suite; verify migrations by running `supabase db reset` locally.
- **Before `supabase db push`**: Always run `supabase projects list` and confirm the linked project is the **dev** environment (`familyhub-dev` / `vblyzgjvseodveypmxdz`). Never push to production without explicit user confirmation.
- **Edge Functions**: `supabase/functions/` — recipe import (URL, YouTube, photo extraction), item classification, sync handlers.
- **Local stack ports**: API 54321, DB 54322, Studio 54323, Inbucket 54324.
- **Seed data**: `supabase/seed.sql` runs automatically on `supabase db reset`.
## Build & Deploy Quirks
- **Android only**: `platforms: ['android']` in `app.config.ts`. No iOS build config.
- **Dynamic config**: `app.config.ts` reads `APP_ENV` to switch app name, package, scheme, and icons between dev/prod. Static `app.json` is the base.
- **Env sourcing for OTA**: `ota:dev` and `ota:production` scripts source `.env.development` / `.env.production` via bash to load env vars before invoking `eas update`.
- **`.env` is a symlink** to `.env.development`. Do not edit `.env` directly; edit the target file.
- **Metro workaround**: `metro.config.js` redirects `@powersync/op-sqlite` and its internal `.js` imports to the CommonJS build because Metro cannot resolve its ESM exports.
- **Three EAS profiles** with different Supabase projects and Google Web Client IDs:
  - `development` / `preview` → dev Supabase (`vblyzgjvseodveypmxdz`)
  - `production` → prod Supabase (`xedvtgdcnnsgpqixrzib`)
## Style & Conventions
- **UI framework**: React Native Paper (Material Design).
- **ESLint**: Uses `eslint-config-expo/flat` + `eslint-plugin-prettier/recommended`.
- **No tests exist** in this repo. There is no Jest, Vitest, or other test runner configured.
- **Language**: All user-facing strings are Portuguese.
## Supabase Storage Buckets
`avatars`, `family-banners`, `vacation-covers` — all public, authenticated access.

# Behavioral guidelines 
## 1. Think Before Coding
**Don't assume. Don't hide confusion. Surface tradeoffs.**
Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.
## 2. Simplicity First
**Minimum code that solves the problem. Nothing speculative.**
- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.
Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.
## 3. Surgical Changes
**Touch only what you must. Clean up only your own mess.**
When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.
When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.
The test: Every changed line should trace directly to the user's request.
## 4. Goal-Driven Execution
**Define success criteria. Loop until verified.**
Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"
For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```
Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.
# MANDATES — NON-NEGOTIABLE
1. Architecture Mandates Must Be NON-NEGOTIABLE in Story Files
Story files need a section at the very top — before acceptance criteria — called: ## ARCHITECTURE MANDATES — NON-NEGOTIABLE
2. When creating the story, validate the architecture file and fill the architecture mandates according to the architecture
3. When developing, STOP: If the architecture or the prd says X and you want to do Y, DO NOT PROCEED. Ask.
4. When code reviewing, STOP: if the story file or the architecture are not aligned with the code reviewed. Highlight and notify the user immediately.
# GIT WORKFLOW
1. When creating a story, always create a branch. Set the branch name in the story file at the very top as branch:<branchidentifier>.
2. MANDATORY ALWAYS: After marking story as done, commit, merge the branch with the current initialized repository, and then commit the repository and push to remote.
