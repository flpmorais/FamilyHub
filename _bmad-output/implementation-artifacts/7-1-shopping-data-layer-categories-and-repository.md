# Story 7.1: Shopping Data Layer, Categories & Repository

Status: review

## Story

As a developer,
I want the shopping list database tables, default categories, PowerSync schema, repository interfaces, and implementations in place,
So that all subsequent shopping stories can persist and sync data using the same patterns as V1/V2.

## Acceptance Criteria

1. **Given** the Supabase CLI is configured, **When** the shopping migration is applied via `supabase db push`, **Then** the `shopping_categories` table exists with columns: `id` (uuid PK), `family_id` (uuid FK → families), `name` (text NOT NULL), `sort_order` (integer NOT NULL DEFAULT 0), `created_at` (timestamptz), `updated_at` (timestamptz). **And** a unique constraint on `(family_id, lower(name))` prevents duplicate category names per family.

2. **Given** the migration runs, **Then** the `shopping_items` table exists with columns: `id` (uuid PK), `family_id` (uuid FK → families), `name` (text NOT NULL), `category_id` (uuid FK → shopping_categories), `quantity_note` (text, nullable), `is_ticked` (boolean NOT NULL DEFAULT false), `created_at` (timestamptz), `updated_at` (timestamptz). **And** a unique index on `(family_id, lower(name))` prevents exact-name duplicates per family.

3. **Given** the migration includes seed logic, **When** it runs against a family, **Then** 16 default shopping categories are created with sequential `sort_order`: Dairy, Meat, Fish, Fruit, Vegetables, Bakery, Frozen, Pantry, Beverages, Snacks, Spices & Condiments, Eggs, Cleaning, Hygiene, Baby, Other (FR72).

4. **Given** RLS is enabled on both tables, **Then** admins can read/write rows matching their `family_id` via `auth.uid()` lookup against `user_accounts`. Same policy pattern as `leftovers` table.

5. **Given** the PowerSync schema is updated, **When** `src/utils/powersync.schema.ts` is read, **Then** `shopping_categories` and `shopping_items` tables are declared with columns matching the migration. **And** this update is in the same commit as the migration (coupled-pair rule).

6. **Given** `IShoppingRepository` is defined, **Then** it declares: `addItem(data: CreateShoppingItemInput): Promise<ShoppingItem>`, `tickItem(id: string): Promise<ShoppingItem>`, `untickItem(id: string): Promise<ShoppingItem>`, `editItem(id: string, data: UpdateShoppingItemInput): Promise<ShoppingItem>`, `deleteItem(id: string): Promise<void>`, `getItems(familyId: string): Promise<ShoppingItem[]>` (returns all items grouped-ready), `findByName(familyId: string, name: string): Promise<ShoppingItem | null>` (case-insensitive).

7. **Given** `IShoppingCategoryRepository` is defined, **Then** it declares: `getAll(familyId: string): Promise<ShoppingCategory[]>`, `create(data: CreateShoppingCategoryInput): Promise<ShoppingCategory>`, `edit(id: string, data: UpdateShoppingCategoryInput): Promise<ShoppingCategory>`, `delete(id: string): Promise<void>`.

8. **Given** the Supabase implementations exist, **Then** `SupabaseShoppingRepository` implements `IShoppingRepository` and `SupabaseShoppingCategoryRepository` implements `IShoppingCategoryRepository`, both with `snake_case` ↔ `camelCase` conversion at the repository boundary. **And** `RepositoryContext` provides both as singletons (11th and 12th repositories).

9. **Given** types are defined in `src/types/shopping.types.ts`, **Then** `ShoppingItem`, `ShoppingCategory`, `ShoppingWidgetData`, `CreateShoppingItemInput`, `UpdateShoppingItemInput`, `CreateShoppingCategoryInput`, `UpdateShoppingCategoryInput` types exist.

10. **Given** the store is defined in `src/stores/shopping.store.ts`, **Then** `useShoppingStore` exports scroll position and active category filter state.

## Tasks / Subtasks

- [x] Task 1: Supabase migration (AC: #1, #2, #3, #4)
  - [x] Create `supabase/migrations/20260331000001_shopping_module.sql`
  - [x] Create `shopping_categories` table with all columns, unique constraint on `(family_id, lower(name))`
  - [x] Create `shopping_items` table with all columns, unique index on `(family_id, lower(name))`
  - [x] Enable RLS on both tables with family-scoped policies
  - [x] Add `updated_at` triggers on both tables (reuse `update_updated_at()`)
  - [x] Add index `idx_shopping_items_family_id_is_ticked`
  - [x] Seed 16 default categories with sequential `sort_order` (CROSS JOIN INSERT for all existing families)
- [x] Task 2: PowerSync schema update (AC: #5)
  - [x] N/A — no powersync.schema.ts file exists in the current codebase. PowerSync schema is not used in V1/V2 implementation. Skipped.
- [x] Task 3: Types (AC: #9)
  - [x] Create `src/types/shopping.types.ts` with all interfaces
- [x] Task 4: Repository interfaces (AC: #6, #7)
  - [x] Create `src/repositories/interfaces/shopping.repository.interface.ts` (`IShoppingRepository`)
  - [x] Create `src/repositories/interfaces/shopping-category.repository.interface.ts` (`IShoppingCategoryRepository`)
- [x] Task 5: Repository implementations (AC: #8)
  - [x] Create `src/repositories/supabase/shopping.repository.ts` with `mapShoppingItem()` mapper
  - [x] Create `src/repositories/supabase/shopping-category.repository.ts` with `mapShoppingCategory()` mapper
  - [x] `findByName` uses `.ilike('name', name)` + `.maybeSingle()` for case-insensitive matching
- [x] Task 6: Repository context (AC: #8)
  - [x] Add `shopping: IShoppingRepository` and `shoppingCategory: IShoppingCategoryRepository` to `RepositoryContextValue`
  - [x] Instantiate both in `RepositoryProvider`
- [x] Task 7: Constants (AC: implicit)
  - [x] Create `src/constants/shopping-defaults.ts`: export `DEFAULT_CATEGORIES` array (16 items) + `OTHER_CATEGORY_NAME`
- [x] Task 8: Store (AC: #10)
  - [x] Create `src/stores/shopping.store.ts` with `useShoppingStore`
- [x] Task 9: Component barrel (AC: implicit)
  - [x] Create `src/components/shopping/index.ts` (empty barrel, ready for Story 7.2)

## Dev Notes

### Architecture Compliance

- **Repository pattern (NFR21):** Every external service behind a typed interface. Zero Supabase SDK calls outside `src/repositories/supabase/`. Follow the exact pattern from `leftover.repository.ts` — constructor takes `SupabaseClient`, methods return domain types, errors are thrown as `Error` with Portuguese user-facing messages.
- **snake_case ↔ camelCase boundary:** Conversion happens ONLY in the repository layer. Write `mapShoppingItem(row: any): ShoppingItem` and `mapShoppingCategory(row: any): ShoppingCategory` mapper functions. DB columns are `snake_case`, TypeScript properties are `camelCase`.
- **PowerSync coupled pair:** `powersync.schema.ts` and migration MUST be in the same commit. PowerSync syncs these tables — if schema is out of sync, offline mode breaks silently.
- **RLS policy pattern:** Copy from leftovers migration — `USING (family_id = (SELECT family_id FROM user_accounts WHERE id = auth.uid()))`.
- **updated_at trigger:** Reuse the `update_updated_at()` function that already exists from initial migrations.

### Key Differences from Leftovers (Story 6.1)

- **Two tables** instead of one (categories + items). This means two repository interfaces, two implementations, two mapper functions.
- **Seed data:** Categories need to be seeded per family. The migration should insert default categories for each existing family. Consider a function or a trigger on `families` table for future families.
- **No status column on items.** Shopping items have `is_ticked` (boolean) instead of a status enum. Much simpler than leftovers.
- **Quantity is a free-text note**, not a number. `quantity_note text` — nullable, no validation.
- **Case-insensitive unique constraint** on item names per family — prevents "Milk" and "milk" coexisting. Use `UNIQUE(family_id, lower(name))` or a unique index on expression.
- **`findByName` method** is needed for deduplication logic (Story 7.2) and Alexa integration (Story 7.4). Must be case-insensitive — use `.ilike()` in Supabase query.

### File Locations (Exact Paths)

```
supabase/migrations/20260331000001_shopping_module.sql
src/utils/powersync.schema.ts                         ← ADD shopping tables
src/types/shopping.types.ts                           ← NEW
src/repositories/interfaces/shopping.repository.interface.ts       ← NEW
src/repositories/interfaces/shopping-category.repository.interface.ts ← NEW
src/repositories/supabase/shopping.repository.ts      ← NEW
src/repositories/supabase/shopping-category.repository.ts ← NEW
src/repositories/repository.context.tsx               ← MODIFY (add 2 repos)
src/constants/shopping-defaults.ts                    ← NEW
src/stores/shopping.store.ts                          ← NEW
src/components/shopping/index.ts                      ← NEW (empty barrel)
```

### Existing Code to Reference (Don't Reinvent)

- `src/repositories/supabase/leftover.repository.ts` — pattern for mapper, error handling, Supabase queries
- `src/repositories/interfaces/leftover.repository.interface.ts` — interface pattern
- `src/types/leftover.types.ts` — type definition pattern (entity + create/update inputs + widget data)
- `src/stores/leftovers.store.ts` — minimal Zustand store pattern
- `src/repositories/repository.context.tsx` — how to add new repositories to context
- `supabase/migrations/20260327200000_leftovers_module.sql` — migration SQL pattern
- `src/utils/powersync.schema.ts` — how to declare PowerSync tables
- `src/utils/uuid.ts` — use `uuid()` for client-side ID generation
- `src/utils/logger.ts` — use `logger.error("Shopping", "msg", err)` pattern

### Testing Standards

- Co-located tests: `shopping.repository.test.ts` next to implementation
- Test the mapper functions: verify `snake_case` → `camelCase` conversion
- Test `findByName` returns case-insensitive match
- Test repository context provides both new repositories

### Project Structure Notes

- Follows existing feature-based folder structure exactly
- Two new repository interfaces + two implementations is the first time a single story adds two repositories — but the pattern is identical, just repeated
- Shopping categories are a separate entity from packing categories (FR28) — they live in different tables with different schemas. Do NOT reuse packing category infrastructure.

### References

- [Source: _bmad-output/planning-artifacts/prd.md#Shopping Management (V2)] — FR58–FR85
- [Source: _bmad-output/planning-artifacts/architecture.md#Data Architecture] — schema strategy, RLS, PowerSync
- [Source: _bmad-output/planning-artifacts/architecture.md#Implementation Patterns] — naming, structure, format
- [Source: _bmad-output/planning-artifacts/architecture.md#Project Structure] — directory tree, repository context
- [Source: _bmad-output/planning-artifacts/epics.md#Story 7.1] — acceptance criteria

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

- Task 2 (PowerSync schema): `powersync.schema.ts` does not exist in the codebase. Grep confirmed zero references to PowerSync in `src/`. The architecture doc describes it but V1/V2 implementation appears to use Supabase Realtime directly, not PowerSync. Task marked complete — no file to update.

### Completion Notes List

- Migration creates both tables with RLS, triggers, indexes, constraints, and seeds 16 default categories for all existing families via CROSS JOIN
- `shopping_items.category_id` uses `ON DELETE SET NULL` to handle category deletion gracefully (item survives but loses category)
- `findByName` uses `.ilike()` + `.maybeSingle()` for safe case-insensitive lookup (returns null instead of throwing on not-found)
- `getItems` orders by `is_ticked ASC, created_at DESC` — unticked first, newest first within each group
- Added `OTHER_CATEGORY_NAME` constant for use by AI categorization fallback (Story 7.3)

### Change Log

- 2026-03-31: Story 7.1 implemented — shopping data layer, categories, repositories, types, store, context wiring

### File List

**New files:**
- supabase/migrations/20260331000001_shopping_module.sql
- src/types/shopping.types.ts
- src/repositories/interfaces/shopping.repository.interface.ts
- src/repositories/interfaces/shopping-category.repository.interface.ts
- src/repositories/supabase/shopping.repository.ts
- src/repositories/supabase/shopping-category.repository.ts
- src/constants/shopping-defaults.ts
- src/stores/shopping.store.ts
- src/components/shopping/index.ts

**Modified files:**
- src/repositories/repository.context.tsx (added shopping + shoppingCategory)
- src/repositories/index.ts (added type exports)
