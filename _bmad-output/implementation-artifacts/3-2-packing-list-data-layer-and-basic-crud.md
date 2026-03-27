# Story 3.2: Packing List Data Layer & Basic CRUD

Status: review

## Story

As an Admin,
I want to add, edit, and delete packing items on a vacation's list,
so that the list reflects everything that needs to be packed, assigned to the right person.

## Acceptance Criteria

1. **Given** Supabase migration is applied
   **When** the schema is inspected
   **Then** a `packing_items` table exists with: `id`, `vacation_id`, `family_id`, `title`, `status` (`'new'|'buy'|'ready'|'issue'|'last_minute'|'packed'`), `profile_id` (nullable), `quantity` (integer, default 1), `notes` (nullable), `created_at`, `updated_at`
   **And** RLS policies are applied with `family_id` enforcement
   **And** `utils/powersync.schema.ts` is updated to include `packing_items`

2. **Given** an Admin views a vacation's packing list screen
   **When** they tap the FAB
   **Then** an add-item bottom sheet opens with: Nome (required, auto-focused), Categoria (nullable — categories added in Epic 4), Pessoa (profile selector, nullable), Quantidade (default 1), Estado (default `'new'`)
   **And** the sheet stays open after saving so multiple items can be added in sequence
   **And** the last-used Pessoa and Categoria values pre-populate on subsequent entries

3. **Given** an Admin taps an existing packing item
   **When** the item detail bottom sheet opens
   **Then** all fields are editable: Nome, Categoria, Pessoa, Quantidade, Estado, Notas
   **And** on save, `PackingItemRepository.update()` is called and the list updates immediately

4. **Given** an Admin long-presses a packing item
   **When** the context menu appears
   **Then** an "Eliminar" option is shown
   **And** tapping "Eliminar" shows an `AlertDialog` with the item name
   **And** on confirm, `PackingItemRepository.delete()` is called and the item is removed

## Tasks / Subtasks

- [x] Task 1: Create Supabase migration for `packing_items` table (AC: 1)
  - [x] 1.1 Create migration file in `supabase/migrations/` with next timestamp
  - [x] 1.2 Table: `packing_items` with columns: `id` (uuid PK default gen_random_uuid()), `vacation_id` (uuid FK→vacations NOT NULL), `family_id` (uuid FK→families NOT NULL), `title` (text NOT NULL), `status` (text NOT NULL DEFAULT 'new' CHECK status IN values), `profile_id` (uuid FK→profiles SET NULL), `quantity` (integer NOT NULL DEFAULT 1), `notes` (text), `created_at` (timestamptz DEFAULT now()), `updated_at` (timestamptz DEFAULT now())
  - [x] 1.3 Add RLS: enable on table, policy "family members can manage packing items" using `family_id = (SELECT family_id FROM user_accounts WHERE id = auth.uid())`
  - [x] 1.4 Add index: `idx_packing_items_vacation_id` on `vacation_id`

- [x] Task 2: Update PowerSync schema (AC: 1)
  - [x] 2.1 Add `packingItemsTable` to `src/utils/powersync.schema.ts` with all columns (matching DB snake_case)
  - [x] 2.2 Add table to `POWERSYNC_SCHEMA` array

- [x] Task 3: Implement `PackingItemRepository` CRUD methods (AC: 1, 2, 3, 4)
  - [x] 3.1 Implement `getPackingItems(vacationId)` — SELECT with `vacation_id` filter, ordered by `created_at`
  - [x] 3.2 Implement `createPackingItem(data)` — INSERT with snake_case mapping, return mapped item
  - [x] 3.3 Implement `updatePackingItem(id, data)` — UPDATE partial fields with camelCase→snake_case conversion
  - [x] 3.4 Implement `deletePackingItem(id)` — DELETE by id
  - [x] 3.5 Leave `bulkUpdateStatus` as stub (Story 3.3)

- [x] Task 4: Create packing list screen with FAB and add-item bottom sheet (AC: 2)
  - [x] 4.1 Create `src/app/(app)/vacations/[id]/index.tsx` — packing list screen
  - [x] 4.2 Load items via `packingItemRepository.getPackingItems(vacationId)`
  - [x] 4.3 FAB (56dp, bottom-right) opens add-item bottom sheet (Modal)
  - [x] 4.4 Add-item sheet fields: Nome (required, auto-focused), Pessoa (profile selector from family profiles, nullable), Quantidade (default 1), Estado (default 'new')
  - [x] 4.5 Sheet stays open after save — clears Nome but retains last Pessoa selection
  - [x] 4.6 Categoria field present but disabled with placeholder "(Épica 4)" — not functional yet

- [x] Task 5: Edit-item bottom sheet (AC: 3)
  - [x] 5.1 Tapping an item opens edit bottom sheet with all fields pre-populated
  - [x] 5.2 Editable fields: Nome, Pessoa, Quantidade, Estado (picker with 6 statuses), Notas
  - [x] 5.3 On save, call `packingItemRepository.updatePackingItem()` and refresh list

- [x] Task 6: Delete with confirmation (AC: 4)
  - [x] 6.1 Long-press on item shows Alert dialog with "Eliminar [item name]?"
  - [x] 6.2 Confirm calls `packingItemRepository.deletePackingItem()` and refreshes list

- [x] Task 7: Verify (AC: 1, 2, 3, 4)
  - [x] 7.1 `npm run type-check` — zero errors
  - [x] 7.2 `npm run lint` — zero errors

## Dev Notes

### Type Mismatch: `title` vs `name`

The epics AC specifies the DB column as `title`. The existing `PackingItem` type in `packing.types.ts` uses `name`. **The DB column MUST be `title`** (matching the AC). The repository mapper must convert `title` (DB) ↔ `name` (TypeScript domain type). Do NOT rename the TypeScript type — it's already in use by the interface and types. Just map in the repository:

```typescript
// DB → domain
name: row.title,

// domain → DB
title: data.name,
```

Similarly, `assignedProfileId` in the domain type maps to `profile_id` in DB, and `categoryId` maps to `category_id` (which won't exist in the DB yet — Epic 4).

### Existing Stubs to Implement

The following files already exist with stub implementations:
- `src/repositories/supabase/packing-item.repository.ts` — all methods throw "not implemented (Story 3.2)"
- `src/repositories/interfaces/packing-item.repository.interface.ts` — interface is fully defined
- `src/types/packing.types.ts` — `PackingItem`, `CreatePackingItemInput`, `PackingStatus` already defined
- `src/hooks/use-packing-items.ts` — stub returning empty array
- `src/repositories/repository.context.tsx` — `packingItem` already registered in context

**Do NOT create new files for these — implement in the existing stubs.**

### DB Column Mapping Reference

| TypeScript (camelCase) | PostgreSQL (snake_case) |
|---|---|
| `id` | `id` |
| `vacationId` | `vacation_id` |
| `familyId` | `family_id` |
| `name` | `title` |
| `status` | `status` |
| `assignedProfileId` | `profile_id` |
| `quantity` | `quantity` |
| `notes` | `notes` |
| `categoryId` | — (Epic 4, not in migration) |
| `createdAt` | `created_at` |
| `updatedAt` | `updated_at` |

### PowerSync Schema Pattern

Follow the exact pattern from existing tables in `powersync.schema.ts`:

```typescript
const packingItemsTable = new Table({
  name: 'packing_items',
  columns: [
    new Column({ name: 'vacation_id', type: ColumnType.TEXT }),
    new Column({ name: 'family_id', type: ColumnType.TEXT }),
    new Column({ name: 'title', type: ColumnType.TEXT }),
    new Column({ name: 'status', type: ColumnType.TEXT }),
    new Column({ name: 'profile_id', type: ColumnType.TEXT }),
    new Column({ name: 'quantity', type: ColumnType.INTEGER }),
    new Column({ name: 'notes', type: ColumnType.TEXT }),
    new Column({ name: 'created_at', type: ColumnType.TEXT }),
    new Column({ name: 'updated_at', type: ColumnType.TEXT }),
  ],
});
```

Note: `id` is implicit in PowerSync — do NOT include it. Use `ColumnType.INTEGER` for `quantity` (not TEXT).

### Packing List Screen Route

Create at `src/app/(app)/vacations/[id]/index.tsx`. This is the default screen when navigating to `/vacations/[id]`. The existing `_layout.tsx` at `[id]/` uses a `Stack` with `headerShown: false`.

### Profile Selector for "Pessoa" Field

To populate the profile dropdown, fetch vacation participants then resolve their profile names. Use the existing `vacationRepository.getParticipants(vacationId)` to get participant profile IDs, then load profiles. Alternatively, query profiles directly filtered by the participant IDs.

### UI Patterns from Story 2.3 (booking tasks)

The tasks screen at `[id]/tasks.tsx` uses these patterns — reuse them:
- `Modal` with `animationType="slide"` and transparent overlay for bottom sheets
- `DateTimePicker` from `@react-native-community/datetimepicker` for dates
- `useRepository('vacation')` hook pattern for repository access — use `useRepository('packingItem')`
- `loadTasks()` pattern for data fetching with loading/error states
- Back button with `router.back()`
- Terracotta `#B5451B` for primary action buttons

### RLS Policy Pattern

Follow the pattern from existing migrations. The `booking_tasks` migration uses:
```sql
CREATE POLICY "family members can manage booking tasks"
  ON booking_tasks FOR ALL
  USING (family_id = (SELECT family_id FROM user_accounts WHERE id = auth.uid()));
```

### Previous Story Learnings (3.1)

- `PaperProvider` is now active — Paper components (FAB, Modal, etc.) can be used but the existing screens still use raw RN components. For consistency with the existing codebase, continue using raw RN components (TouchableOpacity, Modal, StyleSheet) rather than Paper components. Paper component migration is a separate concern.
- Theme colours are available via `useAppTheme()` but existing screens use hardcoded colours. Keep consistent with existing code style.

### What NOT To Do

- Do NOT add `category_id` column to the migration — categories come in Epic 4
- Do NOT implement `bulkUpdateStatus` — that's Story 3.3
- Do NOT add swipe gestures — that's Story 3.3
- Do NOT add filter system — that's Story 3.4
- Do NOT convert existing screens to Paper components — out of scope
- Do NOT add real-time sync handling — that's Story 3.5
- Do NOT use `.single()` on insert/update mutations (learnings from Story 2.3)

### File Locations

| File | Action |
|---|---|
| `supabase/migrations/[timestamp]_packing_items.sql` | **CREATE** — migration |
| `src/utils/powersync.schema.ts` | **MODIFY** — add packing_items table |
| `src/repositories/supabase/packing-item.repository.ts` | **MODIFY** — implement CRUD stubs |
| `src/app/(app)/vacations/[id]/index.tsx` | **CREATE** — packing list screen |
| `src/hooks/use-packing-items.ts` | **MODIFY** — wire up to repository (optional, can stay stub if screen calls repo directly) |

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 3.2] — Acceptance criteria
- [Source: _bmad-output/planning-artifacts/architecture.md#Data Architecture] — PowerSync schema, migration strategy
- [Source: _bmad-output/planning-artifacts/architecture.md#Implementation Patterns] — Naming conventions, snake_case↔camelCase boundary
- [Source: _bmad-output/planning-artifacts/architecture.md#API & Communication] — Repository pattern, Context injection
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Experience Mechanics] — FAB 56dp bottom-right, bottom sheet for add item

## Dev Agent Record

### Agent Model Used

claude-opus-4-6

### Debug Log References

### Completion Notes List

- Created Supabase migration `20260326230000_packing_items.sql` with `packing_items` table, RLS policy, and vacation_id index
- Added `packingItemsTable` to PowerSync schema with correct column types (TEXT for UUIDs/dates, INTEGER for quantity)
- Implemented all 4 CRUD methods in `SupabasePackingItemRepository`: getPackingItems, createPackingItem, updatePackingItem, deletePackingItem. Maps `title` (DB) ↔ `name` (domain), `profile_id` ↔ `assignedProfileId`. `bulkUpdateStatus` left as stub for Story 3.3.
- Created packing list screen at `src/app/(app)/vacations/[id]/index.tsx`:
  - Flat list with 4dp status colour strip per item
  - FAB (56dp, terracotta, bottom-right) opens add-item bottom sheet
  - Add sheet: Nome (auto-focus), Pessoa (profile chip selector), Quantidade, disabled Categoria placeholder
  - Sheet stays open after save for sequential adds; retains last-used Pessoa
  - Edit sheet (tap item): all fields pre-populated including Estado picker and Notas
  - Delete (long-press): Alert confirmation dialog, then removes item
- Profile selector loads all family profiles via `profileRepo.getProfilesByFamily()`
- `type-check` and `lint` both pass with zero errors

### File List

- `familyhub/supabase/migrations/20260326230000_packing_items.sql` — **CREATED** — packing_items table, RLS, index
- `familyhub/src/utils/powersync.schema.ts` — **MODIFIED** — added packingItemsTable
- `familyhub/src/repositories/supabase/packing-item.repository.ts` — **MODIFIED** — implemented CRUD methods
- `familyhub/src/app/(app)/vacations/[id]/index.tsx` — **CREATED** — packing list screen with add/edit/delete
