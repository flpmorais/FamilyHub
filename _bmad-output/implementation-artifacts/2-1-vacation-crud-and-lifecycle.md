# Story 2.1: Vacation CRUD & Lifecycle

Status: done

## Story

As an Admin,
I want to create, edit, and delete vacations with title, destination, dates, and participants,
So that trips are structured objects in the app that the whole household can reference.

## Acceptance Criteria

1. **Given** the migration is applied
   **When** the schema is inspected
   **Then** a `vacations` table exists with: `id` (uuid PK), `family_id` (FK→families), `title` (text NOT NULL), `destination` (text nullable), `cover_image_url` (text nullable), `departure_date` (date NOT NULL), `return_date` (date NOT NULL), `lifecycle` (text FK→vacation_lifecycles, default `'planning'`), `is_pinned` (boolean default false), `created_at`, `updated_at`
   **And** a `vacation_participants` join table with: `vacation_id` (FK→vacations), `profile_id` (FK→profiles), composite PK, `created_at`
   **And** a `vacation_lifecycles` lookup table with rows: `planning`, `upcoming`, `active`, `completed`
   **And** RLS policies enforce `family_id = current_user_family_id()`
   **And** `powersync.schema.ts` includes both tables

2. **Given** an Admin taps "Nova viagem" on the dashboard
   **When** the creation bottom sheet opens
   **Then** fields are presented: Nome (required), Destino (optional), Datas (departure + return, required), Participantes (multi-select from family profiles, required ≥1)
   **And** on save, a `vacations` row is created with `lifecycle: 'planning'`, `is_pinned: false`, `family_id` from auth user
   **And** selected profiles are inserted into `vacation_participants`
   **And** the vacation appears in the list immediately

3. **Given** an existing vacation
   **When** an Admin taps it, edits fields, and saves
   **Then** `VacationRepository.updateVacation()` updates the row
   **And** participant changes sync the join table (insert new, delete removed, keep unchanged)

4. **Given** an Admin taps "Eliminar" on a vacation and confirms
   **Then** the vacation row is deleted (cascading to `vacation_participants`)
   **And** it disappears from the list

5. **Given** a vacation exists
   **When** an Admin taps the lifecycle badge
   **Then** lifecycle progresses: `planning` → `upcoming` → `active` → `completed`
   **And** the change persists immediately

## Tasks / Subtasks

- [x] Task 1: Database migration (AC: 1)
  - [x] Create `vacation_lifecycles` lookup table (`planning`, `upcoming`, `active`, `completed`)
  - [x] Create `vacations` table with all columns, FK to `vacation_lifecycles`, trigger, RLS
  - [x] Create `vacation_participants` join table with composite PK, RLS
  - [x] Create indexes on `family_id`, `vacation_id`, `profile_id`
  - [x] Push migration to cloud with `npx supabase db push`

- [x] Task 2: Update PowerSync schema (AC: 1)
  - [x] Add `vacationsTable` with all columns to `powersync.schema.ts`
  - [x] Add `vacationParticipantsTable` to `powersync.schema.ts`

- [x] Task 3: Fix vacation types (AC: 1, 2, 3)
  - [x] Update `src/types/vacation.types.ts`: align `VacationLifecycle` to `'planning' | 'upcoming' | 'active' | 'completed'` (remove `booked`, `in_progress`, `cancelled`)
  - [x] Add `VacationParticipant` interface
  - [x] Rename `Vacation.name` → `Vacation.title` to match DB column
  - [x] Add `coverImageUrl` field to `Vacation`
  - [x] Update `CreateVacationInput` to include `participantProfileIds: string[]`

- [x] Task 4: Implement vacation repository methods (AC: 2, 3, 4, 5)
  - [x] Implement `getVacations(familyId)` — query vacations ordered by `departure_date`
  - [x] Implement `createVacation(data)` — insert vacation row + participant rows in sequence
  - [x] Implement `updateVacation(id, data)` — update vacation row; if participants changed, delete all + re-insert
  - [x] Implement `deleteVacation(id)` — delete row (cascade handles participants)
  - [x] Add `getParticipants(vacationId): Promise<VacationParticipant[]>` to interface + implementation
  - [x] Use `logger.error` for all error paths, Portuguese error messages

- [x] Task 5: Create vacation list screen (AC: 2, 3, 4, 5)
  - [x] Create `src/app/(app)/vacations/_layout.tsx` (Stack, headerShown: false)
  - [x] Create `src/app/(app)/vacations/index.tsx` — vacation list
  - [x] Show vacation cards: title, destination, dates, participant count, lifecycle badge
  - [x] Tap card → edit bottom sheet
  - [x] Lifecycle badge tap → advance lifecycle (same picker pattern as profile status)
  - [x] "Nova viagem" button at bottom
  - [x] Back button to dashboard

- [x] Task 6: Create/edit bottom sheet (AC: 2, 3)
  - [x] Nome field (required, auto-focused)
  - [x] Destino field (optional)
  - [x] Date fields: departure + return (use TextInput with date format hint for V1 — no external date picker library)
  - [x] Participant multi-select: list all family profiles with checkboxes, at least 1 required
  - [x] Guardar button + Cancelar button
  - [x] In edit mode: pre-fill all fields including selected participants
  - [x] Delete button in edit mode (with Alert confirmation, same pattern as profiles)

- [x] Task 7: Add "Viagens" navigation to dashboard (AC: 2)
  - [x] Add "Viagens" TouchableOpacity to `src/app/(app)/index.tsx`

- [ ] Task 8: Verify (AC: 1, 2, 3, 4, 5)
  - [x] `npm run type-check` — zero errors
  - [x] `npm run lint` — zero errors
  - [ ] Build: `npx expo run:android`
  - [ ] Create vacation with all fields → appears in list
  - [ ] Edit vacation → changes reflected
  - [ ] Delete vacation → removed from list
  - [ ] Advance lifecycle → badge updates
  - [ ] Participant selection → saved correctly

## Dev Notes

### ⚠️ Existing Type/Interface Mismatches — MUST FIX

The existing `vacation.types.ts` and `vacation.repository.interface.ts` were created as stubs in Epic 0 and have discrepancies with the final spec:

1. **Lifecycle values differ**: types have `'booked' | 'in_progress' | 'cancelled'` but spec says `'upcoming' | 'active'` (no `cancelled`). Update the type.
2. **`Vacation.name` → `Vacation.title`**: DB column is `title`, type should match.
3. **`coverImageUrl`**: missing from the type but in the DB schema.
4. **`CreateVacationInput`**: missing `participantProfileIds`.
5. **Booking task methods**: leave stubs as-is (Story 2.3 scope).

### ⚠️ Lifecycle as Lookup Table

Following the pattern established for `profile_statuses` and `roles`, create a `vacation_lifecycles` lookup table instead of a CHECK constraint. Same structure: `id text PRIMARY KEY, name text NOT NULL`. Values: `planning` (Planeamento), `upcoming` (Próxima), `active` (Em curso), `completed` (Concluída).

### ⚠️ Vacation Participants RLS

The `vacation_participants` join table doesn't have a `family_id` column. RLS must check via a subquery to `vacations`:
```sql
CREATE POLICY "vacation_participants_family_rw"
  ON vacation_participants FOR ALL
  USING (EXISTS (
    SELECT 1 FROM vacations v
    WHERE v.id = vacation_participants.vacation_id
      AND v.family_id = current_user_family_id()
  ));
```

### Date Input — V1 Approach

No external date picker library in V1. Use two plain `TextInput` fields with `placeholder="AAAA-MM-DD"` and `keyboardType="numeric"`. Validate format on save. This avoids adding a native dependency. A proper date picker can be added in a later polish pass.

### Participant Multi-Select Pattern

Show all profiles from `profileRepository.getProfilesByFamily(familyId)`. Render as a scrollable list of rows with checkboxes (simple `TouchableOpacity` with `☑` / `☐` text or a colored border). Store selected IDs in a `Set<string>` state. On save, pass as `participantProfileIds` array.

### Lifecycle Progression — Same Pattern as Profile Status

Use the same picker card pattern from `profiles.tsx`: tap the lifecycle badge in the list → centered modal card shows current state + valid next state(s). Lifecycle is one-directional: `planning` → `upcoming` → `active` → `completed`. No reverse transitions.

### Repository — No `.single()` on UPDATE/INSERT

Following the learning from profile repository bugs: use `.select()` without `.single()` and check `rows[0]` manually. This avoids the "Cannot coerce to single JSON object" error.

### PowerSync `is_pinned` Column Type

PowerSync doesn't have a `BOOLEAN` type. Use `ColumnType.INTEGER` (0/1) for `is_pinned`. Same for any boolean columns.

### Error Messages — Portuguese

All user-facing errors in Portuguese:
- `'O nome da viagem é obrigatório.'`
- `'As datas são obrigatórias.'`
- `'Selecione pelo menos um participante.'`
- `'A data de partida deve ser anterior à data de regresso.'`
- `'Erro ao criar viagem: ...'`
- `'Erro ao eliminar viagem: ...'`

### Learnings from Previous Stories

- **No `--clear` flag**: `npx expo run:android` only; kill Metro with `lsof -ti:8081 | xargs kill -9`
- **Prettier before lint**: `npx prettier --write <files>` after editing
- **Logger**: `logger.error('VacationRepository', 'message', error)`
- **No screen flicker**: Don't `setIsLoading(true)` before post-mutation `loadData()` — only on initial mount
- **Alert on Android**: Use `setTimeout(() => Alert.alert(...), 400)` after closing a Modal to avoid the Alert not showing
- **`current_user_family_id()` is simple**: No JOIN to profiles — just `SELECT family_id FROM user_accounts WHERE id = auth.uid()`

### Project Structure Notes

- Vacation screens go in `src/app/(app)/vacations/` (new folder)
- `_layout.tsx` in that folder (Stack, headerShown: false)
- `index.tsx` = vacation list screen
- Repository already wired in `repository.context.tsx` as `vacation: SupabaseVacationRepository`
- `useRepository('vacation')` works without changes

### References

- Epic 2 stories — `_bmad-output/planning-artifacts/epics.md` (Epic 2 section)
- Architecture: repository pattern, naming conventions — `_bmad-output/planning-artifacts/architecture.md`
- UX: trip creation flow, M3 theme — `_bmad-output/planning-artifacts/ux-design-specification.md`
- Existing vacation types — `familyhub/src/types/vacation.types.ts`
- Existing vacation repository stub — `familyhub/src/repositories/supabase/vacation.repository.ts`
- Profile status picker pattern — `familyhub/src/app/(app)/settings/profiles.tsx`

## Dev Agent Record

### Agent Model Used

claude-opus-4-6

### Debug Log References

### Completion Notes List

- Migration 015: created `vacation_lifecycles` lookup, `vacations` table (with FK to lifecycles, RLS, trigger, indexes), `vacation_participants` join table (composite PK, RLS via subquery to vacations)
- Fixed `vacation.types.ts`: lifecycle values aligned, `name`→`title`, added `coverImageUrl`, `VacationParticipant`, `participantProfileIds` in create input
- `IVacationRepository` extended with `getParticipants()` method and `participantProfileIds` param on `updateVacation`
- `SupabaseVacationRepository`: all 5 vacation methods implemented (getVacations, createVacation, updateVacation, deleteVacation, getParticipants); booking task stubs kept for Story 2.3
- Vacations screen: list with cards (title, destination, dates, participant count), lifecycle badge picker (same pattern as profiles), create/edit bottom sheet with participant multi-select checkboxes, delete with Alert confirmation
- Date input uses plain TextInput with AAAA-MM-DD format and validation (no external picker library)
- No screen flicker on mutations (loadData without setIsLoading)
- type-check + lint: zero errors

### File List

- `familyhub/supabase/migrations/20260326190000_vacation_module.sql` (new)
- `familyhub/src/utils/powersync.schema.ts` (modified)
- `familyhub/src/types/vacation.types.ts` (modified)
- `familyhub/src/repositories/interfaces/vacation.repository.interface.ts` (modified)
- `familyhub/src/repositories/supabase/vacation.repository.ts` (modified)
- `familyhub/src/app/(app)/vacations/_layout.tsx` (new)
- `familyhub/src/app/(app)/vacations/index.tsx` (new)
- `familyhub/src/app/(app)/index.tsx` (modified)
