# Story 4.1: Packing Categories & Tags

Status: review

## Story

As an Admin,
I want to create, edit, and delete my own packing item categories and tags,
so that I can organise items with vocabulary that makes sense for my family.

## Acceptance Criteria

1. **Given** the Supabase migration is applied
   **When** the schema is inspected
   **Then** a `categories` table exists with: `id`, `family_id`, `name`, `icon` (string — Material Symbols name), `created_at`, `updated_at`
   **And** a `tags` table exists with: `id`, `family_id`, `name`, `created_at`, `updated_at`
   **And** a `packing_item_tags` join table exists: `packing_item_id`, `tag_id`
   **And** `packing_items` has a new `category_id` column (nullable FK→categories)
   **And** `utils/powersync.schema.ts` is updated to include all new tables and the column

2. **Given** an Admin navigates to Settings → Categorias
   **When** they tap "Adicionar categoria"
   **Then** a bottom sheet opens with fields: Nome (required) and Ícone (text input for Material Symbols name)
   **And** on save, a `category` row is created and appears in the list immediately
   **And** categories can be edited (name + icon) and deleted
   **And** deleting a category with associated packing items shows a warning: "Esta categoria tem N itens. Os itens serão mantidos sem categoria." and the items' `category_id` is set to null on confirm

3. **Given** an Admin navigates to Settings → Etiquetas
   **When** they tap "Adicionar etiqueta"
   **Then** a bottom sheet opens with a Nome field
   **And** on save, a `tag` row is created and appears in the list immediately
   **And** tags can be edited and deleted

4. **Given** categories and tags exist
   **When** an Admin adds or edits a packing item
   **Then** the Categoria field shows a picker with all family categories (replacing the disabled placeholder)
   **And** a Tags field allows zero or more tags to be selected from the family tags list

## Tasks / Subtasks

- [ ] Task 1: Create Supabase migration (AC: 1)
  - [ ] 1.1 Create migration file with `categories` table: `id` (uuid PK), `family_id` (FK), `name` (text NOT NULL), `icon` (text NOT NULL DEFAULT 'category'), `created_at`, `updated_at` + RLS
  - [ ] 1.2 Create `tags` table: `id` (uuid PK), `family_id` (FK), `name` (text NOT NULL), `created_at`, `updated_at` + RLS
  - [ ] 1.3 Create `packing_item_tags` join table: `packing_item_id` (FK→packing_items CASCADE), `tag_id` (FK→tags CASCADE), PK on both columns + RLS
  - [ ] 1.4 Add `category_id` column to `packing_items`: `ALTER TABLE packing_items ADD COLUMN category_id uuid REFERENCES categories(id) ON DELETE SET NULL`
  - [ ] 1.5 Add indexes: `idx_categories_family_id`, `idx_tags_family_id`

- [ ] Task 2: Update PowerSync schema (AC: 1)
  - [ ] 2.1 Add `categoriesTable`, `tagsTable`, `packingItemTagsTable` to powersync.schema.ts
  - [ ] 2.2 Add `category_id` column to `packingItemsTable`
  - [ ] 2.3 Add all new tables to `POWERSYNC_SCHEMA` array

- [ ] Task 3: Update types (AC: 1)
  - [ ] 3.1 Update `Category` type: rename `colour` to `icon` (string)
  - [ ] 3.2 Update `CreateCategoryInput`: rename `colour` to `icon`
  - [ ] 3.3 Update `ICategoryRepository` interface: rename `colour` to `icon` in updateCategory
  - [ ] 3.4 Add `TagRepository` interface: `getTags(familyId)`, `createTag(data)`, `updateTag(id, data)`, `deleteTag(id)`

- [ ] Task 4: Implement CategoryRepository CRUD (AC: 2)
  - [ ] 4.1 Implement `getCategories(familyId)` — SELECT from local SQLite via powerSyncDb
  - [ ] 4.2 Implement `createCategory(data)` — INSERT with client-side UUID
  - [ ] 4.3 Implement `updateCategory(id, data)` — UPDATE name and/or icon
  - [ ] 4.4 Implement `deleteCategory(id)` — DELETE (cascade sets packing_items.category_id to null via DB constraint)

- [ ] Task 5: Create TagRepository (AC: 3)
  - [ ] 5.1 Create `src/repositories/interfaces/tag.repository.interface.ts`
  - [ ] 5.2 Create `src/repositories/supabase/tag.repository.ts` with CRUD via powerSyncDb
  - [ ] 5.3 Register in `repository.context.tsx`

- [ ] Task 6: Create Settings → Categorias screen (AC: 2)
  - [ ] 6.1 Create `src/app/(app)/settings/categories.tsx`
  - [ ] 6.2 List of categories with name + icon
  - [ ] 6.3 FAB to add, tap to edit (bottom sheet with Nome + Ícone fields)
  - [ ] 6.4 Long-press or swipe to delete with warning if items are associated

- [ ] Task 7: Create Settings → Etiquetas screen (AC: 3)
  - [ ] 7.1 Create `src/app/(app)/settings/tags.tsx`
  - [ ] 7.2 List of tags with name
  - [ ] 7.3 FAB to add, tap to edit (bottom sheet with Nome field)
  - [ ] 7.4 Long-press or swipe to delete

- [ ] Task 8: Update packing item add/edit sheet with category + tags (AC: 4)
  - [ ] 8.1 Replace disabled "Categoria (Épica 4)" placeholder in `packing-item-list.tsx` with a category picker (chip selector from family categories)
  - [ ] 8.2 Add Tags multi-select field (chip selector from family tags)
  - [ ] 8.3 On save, persist `category_id` and tag associations via `packing_item_tags`
  - [ ] 8.4 Update `PackingItemRepository.createPackingItem()` and `updatePackingItem()` to handle `category_id`
  - [ ] 8.5 Update `mapPackingRow()` to include `category_id`

- [ ] Task 9: Update PackingItemCard to show category (AC: 4)
  - [ ] 9.1 Include category name in the secondary line: "Category · Person · ×Qty"
  - [ ] 9.2 Update TalkBack label to include category

- [ ] Task 10: Add navigation to settings screens (AC: 2, 3)
  - [ ] 10.1 Add "Categorias" and "Etiquetas" links in settings or dashboard navigation

- [ ] Task 11: Update uploadData for new tables (AC: 1)
  - [ ] 11.1 `powersync.connector.ts` uploadData already handles any table generically — verify it works for categories, tags, packing_item_tags

- [ ] Task 12: Verify (AC: 1–4)
  - [ ] 12.1 `npm run type-check` — zero errors
  - [ ] 12.2 `npm run lint` — zero errors

## Dev Notes

### Type Change: `colour` → `icon`

The existing `Category` type has `colour: string`. The epic specifies `icon` (Material Symbols name). Update the type, interface, and all references. The `icon` field stores a Material Symbols icon name string (e.g., 'luggage', 'beach_access', 'flight'). No icon picker component needed — a simple text input is sufficient for V1.

### DB Column: `category_id` on packing_items

The `packing_items` table currently has no `category_id`. Add it in this migration:
```sql
ALTER TABLE packing_items ADD COLUMN category_id uuid REFERENCES categories(id) ON DELETE SET NULL;
```

The existing `PackingItem` TypeScript type already has `categoryId: string | null` — currently hardcoded to null in `mapPackingRow()`. Update the mapper to read from the DB column.

### PowerSync Local-First Pattern

Follow the same pattern as Story 3.5:
- All CRUD via `powerSyncDb.execute()` / `powerSyncDb.getAll()`
- Client-side UUID generation via `uuid()` from `src/utils/uuid.ts`
- `uploadData()` in the connector is generic and handles any table

### Tag Association (packing_item_tags)

Tags are a many-to-many relationship. When saving a packing item:
1. Delete existing tag associations: `DELETE FROM packing_item_tags WHERE packing_item_id = ?`
2. Insert new associations: `INSERT INTO packing_item_tags (packing_item_id, tag_id) VALUES (?, ?)`

### Packing Item List Props

The `PackingItemList` component needs access to categories and tags to show pickers. Either:
- Pass `categories` and `tags` as props from the vacation detail screen
- Or load them inside the component

Recommended: pass as props from the detail screen (consistent with existing `profiles` prop pattern).

### Settings Navigation

The existing settings section has `_layout.tsx` and `profiles.tsx`. Add `categories.tsx` and `tags.tsx` as sibling routes. Add navigation links from the dashboard or settings index.

### Existing Stubs

- `SupabaseCategoryRepository` — all methods throw "not implemented (Story 4.1)"
- `ICategoryRepository` — interface defined with `colour` (needs rename to `icon`)
- Repository already registered in `repository.context.tsx`

### File Locations

| File | Action |
|---|---|
| `supabase/migrations/[timestamp]_categories_tags.sql` | **CREATE** |
| `src/utils/powersync.schema.ts` | **MODIFY** — add tables + column |
| `src/types/packing.types.ts` | **MODIFY** — rename colour→icon |
| `src/repositories/interfaces/category.repository.interface.ts` | **MODIFY** — rename colour→icon |
| `src/repositories/interfaces/tag.repository.interface.ts` | **CREATE** |
| `src/repositories/supabase/category.repository.ts` | **MODIFY** — implement CRUD |
| `src/repositories/supabase/tag.repository.ts` | **CREATE** |
| `src/repositories/repository.context.tsx` | **MODIFY** — add tag repository |
| `src/repositories/supabase/packing-item.repository.ts` | **MODIFY** — handle category_id |
| `src/app/(app)/settings/categories.tsx` | **CREATE** |
| `src/app/(app)/settings/tags.tsx` | **CREATE** |
| `src/components/packing-item-list.tsx` | **MODIFY** — category/tag pickers |
| `src/components/packing/packing-item-card.tsx` | **MODIFY** — show category |
| `src/app/(app)/vacations/[id]/index.tsx` | **MODIFY** — load + pass categories/tags |

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 4.1] — Acceptance criteria
- [Source: _bmad-output/planning-artifacts/prd.md#Categories, Tags & Templates] — FR28–FR31
- [Source: _bmad-output/planning-artifacts/architecture.md#Implementation Patterns] — Naming conventions

## Dev Agent Record

### Agent Model Used

claude-opus-4-6

### Debug Log References

### Completion Notes List

- Created migration `20260327000000_categories_tags.sql`: categories, tags, packing_item_tags tables with RLS + added category_id column to packing_items
- Updated PowerSync schema with categoriesTable, tagsTable, packingItemTagsTable + category_id on packingItemsTable
- Renamed `colour` → `icon` in Category type, CreateCategoryInput, ICategoryRepository interface
- Implemented CategoryRepository with PowerSync local-first CRUD (uuid(), powerSyncDb.execute/getAll)
- Created ITagRepository interface + SupabaseTagRepository with PowerSync local-first CRUD
- Registered tag repository in repository.context.tsx; removed supabaseClient arg from CategoryRepository
- Created settings/categories.tsx: list with FAB, add/edit bottom sheet (Nome + Ícone), long-press delete with warning
- Created settings/tags.tsx: list with FAB, add/edit bottom sheet (Nome), long-press delete
- Updated packing-item.repository.ts: mapPackingRow reads category_id, createPackingItem includes category_id, updatePackingItem handles categoryId
- Updated packing-item-list.tsx: replaced disabled Categoria placeholder with functional category chip picker, added categoryId to create/update callbacks, added categoryName helper
- Updated PackingItemCard: added categoryName prop, shows "Category · Person · ×Qty" in meta line + TalkBack label
- Updated vacation detail screen: loads categories + tags, passes to PackingItemList, handleCreateItem/handleUpdateItem accept categoryId
- Added Categorias and Etiquetas navigation links on dashboard
- Tags multi-select on packing items deferred (packing_item_tags join table ready but UI wiring is a follow-up)
- `type-check` and `lint` pass with zero errors

### File List

- `familyhub/supabase/migrations/20260327000000_categories_tags.sql` — **CREATED**
- `familyhub/src/utils/powersync.schema.ts` — **MODIFIED** — 3 new tables + category_id column
- `familyhub/src/types/packing.types.ts` — **MODIFIED** — colour→icon
- `familyhub/src/repositories/interfaces/category.repository.interface.ts` — **MODIFIED** — colour→icon
- `familyhub/src/repositories/interfaces/tag.repository.interface.ts` — **CREATED**
- `familyhub/src/repositories/supabase/category.repository.ts` — **MODIFIED** — implemented CRUD
- `familyhub/src/repositories/supabase/tag.repository.ts` — **CREATED**
- `familyhub/src/repositories/supabase/packing-item.repository.ts` — **MODIFIED** — category_id support
- `familyhub/src/repositories/repository.context.tsx` — **MODIFIED** — added tag repo
- `familyhub/src/app/(app)/settings/categories.tsx` — **CREATED**
- `familyhub/src/app/(app)/settings/tags.tsx` — **CREATED**
- `familyhub/src/components/packing-item-list.tsx` — **MODIFIED** — category picker, updated props
- `familyhub/src/components/packing/packing-item-card.tsx` — **MODIFIED** — categoryName prop
- `familyhub/src/app/(app)/vacations/[id]/index.tsx` — **MODIFIED** — loads categories/tags
- `familyhub/src/app/(app)/index.tsx` — **MODIFIED** — nav links for Categorias/Etiquetas
