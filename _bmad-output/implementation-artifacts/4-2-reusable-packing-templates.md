# Story 4.2: Reusable Packing Templates

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an Admin,
I want to create reusable templates with items that carry optional profile, category, and tag filters,
so that the right items are automatically added to any trip that matches those filters.

## Acceptance Criteria

1. **Given** a new Supabase migration is applied
   **When** the schema is inspected
   **Then** a `templates` table exists with: `id`, `family_id`, `name`, `created_at`, `updated_at`
   **And** a `template_items` table exists with: `id`, `template_id`, `family_id`, `title`, `profile_id` (nullable), `category_id` (nullable), `quantity` (integer, default 1)
   **And** a `template_item_tags` join table exists: `template_item_id`, `tag_id`
   **And** `utils/powersync.schema.ts` is updated to include all three template tables
   **And** RLS policies enforce `family_id` filtering on all three tables

2. **Given** an Admin navigates to Settings and taps "Modelos"
   **When** the templates screen opens
   **Then** a list of existing templates is displayed (name only)
   **And** an empty state is shown when no templates exist
   **And** a FAB button allows creating a new template

3. **Given** an Admin taps "Criar modelo" (FAB)
   **When** the template form opens
   **Then** fields are: Nome do modelo (required) and an item list (initially empty)
   **And** items can be added with: Titulo (required), Perfil (optional — picker from family profiles), Categoria (optional — picker from family categories), Quantidade (default 1), Etiquetas (optional, multi-select from family tags)
   **And** on save, the template and all its items (including tag associations) are persisted

4. **Given** a template item has no profile set (`profile_id` is null)
   **When** that item is later injected into a trip (Story 4.3)
   **Then** one packing item is generated per trip participant

5. **Given** a template item has a specific profile set (e.g., Filipe)
   **When** that item is later injected into a trip where Filipe is a participant (Story 4.3)
   **Then** one packing item is generated assigned to Filipe only

6. **Given** a template exists
   **When** an Admin edits it
   **Then** they can add, remove, or edit template items and update the template name
   **And** changes are persisted immediately on save

7. **Given** a template exists
   **When** an Admin taps "Eliminar" on the template
   **Then** an `AlertDialog` confirms deletion
   **And** on confirm, the template and its items are deleted (existing packing items already generated are unaffected)

## Tasks / Subtasks

- [x] Task 1: Create Supabase migration for template tables (AC: #1)
  - [x] 1.1 Create migration file with `templates` table (id, family_id, name, created_at, updated_at)
  - [x] 1.2 Create `template_items` table (id, template_id, family_id, title, profile_id nullable, category_id nullable, quantity default 1, created_at, updated_at)
  - [x] 1.3 Create `template_item_tags` join table (template_item_id, tag_id) with composite PK
  - [x] 1.4 Add RLS policies for all three tables (family_id based, matching existing pattern)
  - [x] 1.5 Add indexes: idx_template_items_template_id, idx_template_item_tags_template_item_id

- [x] Task 2: Update PowerSync schema (AC: #1)
  - [x] 2.1 Add `templatesTable` definition to powersync.schema.ts (family_id, name, created_at, updated_at)
  - [x] 2.2 Add `templateItemsTable` definition (template_id, family_id, title, profile_id, category_id, quantity as INTEGER, created_at, updated_at)
  - [x] 2.3 Add `templateItemTagsTable` definition (template_item_id, tag_id)
  - [x] 2.4 Register all three tables in POWERSYNC_SCHEMA array

- [x] Task 3: Update TypeScript types (AC: #1, #3)
  - [x] 3.1 Update `TemplateItem` interface in packing.types.ts: add `profileId`, `familyId`, `createdAt`, `updatedAt` fields; keep existing `categoryId`; rename `name` to `title` if mismatched with DB column
  - [x] 3.2 Update `Template` interface: ensure `items` field is `TemplateItem[]`
  - [x] 3.3 Update `CreateTemplateInput`: ensure `items` includes profileId, categoryId, quantity, and tagIds per item
  - [x] 3.4 Add `TemplateItemTag` type: `{ templateItemId: string; tagId: string }`

- [x] Task 4: Expand ITemplateRepository interface (AC: #2, #3, #6, #7)
  - [x] 4.1 Add `updateTemplate(id: string, name: string): Promise<Template>` method
  - [x] 4.2 Add `addTemplateItem(templateId: string, item: CreateTemplateItemInput): Promise<TemplateItem>` method
  - [x] 4.3 Add `updateTemplateItem(id: string, data: Partial<...>): Promise<TemplateItem>` method
  - [x] 4.4 Add `removeTemplateItem(id: string): Promise<void>` method
  - [x] 4.5 Add `getTemplateWithItems(templateId: string): Promise<Template>` method

- [x] Task 5: Implement SupabaseTemplateRepository (AC: #2, #3, #6, #7)
  - [x] 5.1 Replace stub with PowerSync-based implementation (NOT Supabase client — follow category.repository.ts pattern)
  - [x] 5.2 Implement `getTemplates`: query templates table, for each load items + item tags via JOINs
  - [x] 5.3 Implement `createTemplate`: insert template row, then insert all template_items rows, then insert template_item_tags rows — all using powerSyncDb.execute()
  - [x] 5.4 Implement `updateTemplate`: update template name
  - [x] 5.5 Implement `addTemplateItem` / `updateTemplateItem` / `removeTemplateItem`: CRUD for individual items with tag association management
  - [x] 5.6 Implement `deleteTemplate`: delete template_item_tags, then template_items, then template (cascade order)
  - [x] 5.7 Implement `getTemplateWithItems`: single template with all items and their tags loaded
  - [x] 5.8 Add `mapTemplate()` and `mapTemplateItem()` row mapper functions (snake_case → camelCase)
  - [x] 5.9 Error messages in Portuguese (pt-PT), matching category.repository.ts pattern

- [x] Task 6: Update RepositoryProvider (AC: #2)
  - [x] 6.1 Change SupabaseTemplateRepository instantiation: remove `supabaseClient` constructor arg (it will use powerSyncDb directly like CategoryRepository)
  - [x] 6.2 Verify template repository is still accessible via `useRepository<'template'>()`

- [x] Task 7: Create Settings → Modelos screen (AC: #2, #3, #6, #7)
  - [x] 7.1 Create `src/app/(app)/settings/templates.tsx` following categories.tsx layout pattern
  - [x] 7.2 Template list view: show template name + item count badge; empty state with "Crie o seu primeiro modelo" message
  - [x] 7.3 FAB button to open create template modal
  - [x] 7.4 Create/edit template bottom sheet: Nome do modelo (required, validated) + item list section
  - [x] 7.5 Add template item sub-form: Titulo (required), Perfil picker (from profiles), Categoria picker (from categories), Quantidade (numeric, default 1), Etiquetas multi-select (from tags)
  - [x] 7.6 Item list within template form: show added items with edit/remove capability
  - [x] 7.7 Save template: validate name, persist template + all items + tag associations in sequence
  - [x] 7.8 Edit template: load existing template with items, allow name change, add/edit/remove items
  - [x] 7.9 Delete template: AlertDialog confirmation, Portuguese text "Este modelo sera eliminado permanentemente. Os itens ja adicionados a viagens nao serao afetados."
  - [x] 7.10 Success snackbar notifications for create/edit/delete actions

- [x] Task 8: Add navigation link to templates screen (AC: #2)
  - [x] 8.1 Add "Modelos" link in settings screen navigation (alongside Categorias and Etiquetas)

- [x] Task 9: Update PowerSync uploadData connector (AC: #1)
  - [x] 9.1 Verify the PowerSync connector handles CRUD operations for templates, template_items, and template_item_tags tables — generic PUT/PATCH/DELETE handler covers all tables automatically
  - [x] 9.2 Add upload handlers if not automatically handled — not needed, generic handler sufficient

- [x] Task 10: Type-check and lint verification (AC: all)
  - [x] 10.1 Run `npx tsc --noEmit` — zero errors
  - [x] 10.2 Run linter if configured — zero errors

## Dev Notes

### Architecture Requirements

- **PowerSync local-first**: ALL template CRUD must use `powerSyncDb.execute()` / `powerSyncDb.getAll()` — NEVER use `supabaseClient` directly for data operations. The current stub wrongly takes `supabaseClient` in its constructor — this must change to match CategoryRepository/TagRepository pattern (no constructor args, import powerSyncDb directly).
- **Repository pattern**: Interface → Implementation → Context injection. Template repository is already registered in `repository.context.tsx` but the implementation is a stub.
- **Coupled changes**: PowerSync schema + Supabase migration must be committed together (AR2).

### Existing Code to Reuse (DO NOT Reinvent)

- **CategoryRepository pattern** (`src/repositories/supabase/category.repository.ts`): Follow this exact pattern for PowerSync CRUD, row mapping, error handling, UUID generation, timestamp creation.
- **TagRepository** (`src/repositories/supabase/tag.repository.ts`): Same PowerSync pattern, reference for join table management (packing_item_tags).
- **Categories settings screen** (`src/app/(app)/settings/categories.tsx`, ~589 lines): Copy layout pattern for templates screen — FAB, bottom sheet modal, list view, delete confirmation, snackbar, loading/error states.
- **PowerSync database** import: `import { powerSyncDb } from '../../utils/powersync.database';`
- **UUID generation**: `import { uuid } from '../../utils/uuid';`
- **Logger**: `import { logger } from '../../utils/logger';`

### Current Type Gaps to Fix

The existing `TemplateItem` type in `packing.types.ts` is incomplete:
- Missing: `profileId`, `familyId`, `createdAt`, `updatedAt`
- Has `name` but DB column per epics spec is `title` — align with DB column name
- `CreateTemplateInput.items` needs `tagIds: string[]` per item for tag associations
- No `TemplateItemTag` type exists

### Database Schema Notes

- Template tables follow the same RLS pattern as categories/tags: `USING (family_id = (SELECT family_id FROM user_accounts WHERE id = auth.uid()))`
- `template_items.profile_id` references `profiles(id)` — allows assigning items to specific family members
- `template_items.category_id` references `categories(id) ON DELETE SET NULL` — category deletion doesn't break templates
- `template_item_tags` is a many-to-many join like `packing_item_tags` — when saving template item tags, delete existing rows then insert new ones

### UI/UX Requirements

- Template screen lives in settings alongside Categorias and Etiquetas
- Profile picker: load family profiles via `useRepository<'profile'>()` — show `displayName` with avatar
- Category picker: load family categories via `useRepository<'category'>()` — show `name` with `icon`
- Tags multi-select: load family tags via `useRepository<'tag'>()` — show as chips, toggle selection
- Item quantity: numeric input, minimum 1, default 1
- Form validation: template name required, each item needs at least a title
- The `applyTemplate` method is **NOT** part of this story — it belongs to Story 4.3

### Project Structure Notes

- New file: `src/app/(app)/settings/templates.tsx`
- Modified files: `powersync.schema.ts`, `packing.types.ts`, `template.repository.interface.ts`, `template.repository.ts`, `repository.context.tsx`
- New migration: `supabase/migrations/2026MMDD......_templates.sql`
- Settings navigation entry point depends on current settings screen layout — check `src/app/(app)/settings/index.tsx`

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic-4-Story-4.2]
- [Source: _bmad-output/planning-artifacts/architecture.md#Database-Schemas]
- [Source: _bmad-output/planning-artifacts/prd.md#FR30-FR31]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Journey-5-Templates]
- [Source: src/repositories/supabase/category.repository.ts — PowerSync CRUD pattern]
- [Source: src/app/(app)/settings/categories.tsx — Settings screen UI pattern]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

- TypeScript type errors fixed: `powerSyncDb.getAll()` returns `unknown[]`, required `as any[]` casts on iteration (matching pattern used in other repos)

### Completion Notes List

- Created Supabase migration 20260327200000_templates.sql with 3 tables (templates, template_items, template_item_tags), RLS policies, and indexes
- Updated PowerSync schema with 3 new table definitions (templatesTable, templateItemsTable, templateItemTagsTable)
- Expanded TemplateItem type with profileId, familyId, createdAt, updatedAt, tagIds; renamed name→title; added CreateTemplateItemInput and TemplateItemTag types
- Expanded ITemplateRepository with updateTemplate, addTemplateItem, updateTemplateItem, removeTemplateItem, getTemplateWithItems
- Full PowerSync-based SupabaseTemplateRepository implementation replacing stub — removed supabaseClient dependency, follows CategoryRepository pattern exactly
- Updated RepositoryProvider to instantiate SupabaseTemplateRepository without constructor args
- Created full templates settings screen (templates.tsx) with: template list + item count badge, empty state, FAB, full-screen create/edit form, item sub-form with profile/category/tag pickers and quantity, delete confirmation AlertDialog, snackbar notifications
- Added "Modelos" navigation link in dashboard
- PowerSync connector verified: generic uploadData handler covers new tables automatically
- TypeScript type-check passes with zero errors

### File List

- CREATE: supabase/migrations/20260327200000_templates.sql
- MODIFY: src/utils/powersync.schema.ts
- MODIFY: src/types/packing.types.ts
- MODIFY: src/repositories/interfaces/template.repository.interface.ts
- MODIFY: src/repositories/supabase/template.repository.ts
- MODIFY: src/repositories/repository.context.tsx
- CREATE: src/app/(app)/settings/templates.tsx
- MODIFY: src/app/(app)/index.tsx

### Change Log

- 2026-03-27: Story 4.2 implementation complete — full template CRUD with PowerSync local-first, settings UI, navigation integration
