# Story 2.3: Booking Task Timeline

Status: review

## Story

As an Admin,
I want standard booking tasks auto-generated when I create a vacation, with urgency deadlines I can track,
So that I never miss a flight booking or hotel deadline because it wasn't on my radar.

## Acceptance Criteria

1. **Given** the migration is applied
   **When** the schema is inspected
   **Then** a `booking_tasks` table exists with: `id` (uuid PK), `vacation_id` (FK→vacations), `family_id` (FK→families), `title` (text NOT NULL), `task_type` (text: `'flights'|'hotel'|'car'|'insurance'|'document_check'|'custom'`), `deadline_days` (integer nullable), `due_date` (date nullable), `is_complete` (boolean default false), `parent_task_id` (FK→booking_tasks nullable), `profile_id` (FK→profiles nullable), `created_at`, `updated_at`
   **And** RLS enforces `family_id = current_user_family_id()`
   **And** `powersync.schema.ts` includes `booking_tasks`

2. **Given** a new vacation is created
   **When** `createVacation()` completes
   **Then** three standard booking tasks are auto-generated: Voos (`deadline_days: 90`), Hotel (`deadline_days: 60`), Rent-a-car (`deadline_days: 30`)
   **And** `due_date` = `departure_date − deadline_days` for each task

3. **Given** booking tasks exist for a vacation
   **When** an Admin taps "Tarefas" on a vacation
   **Then** incomplete tasks are sorted by `due_date` ascending (most urgent first)
   **And** each row shows title, due date, and days remaining
   **And** completed tasks appear with strikethrough at the bottom

4. **Given** an Admin taps a task to mark it complete
   **When** the action completes
   **Then** `is_complete` is set to `true` and the task moves to the completed section

5. **Given** an Admin taps "Adicionar tarefa"
   **When** they enter a title and due date
   **Then** a new `booking_task` row is created with `task_type: 'custom'` and `deadline_days: null`

## Tasks / Subtasks

- [x] Task 1: Database migration (AC: 1)
  - [x]Create `booking_task_types` lookup table (`flights`, `hotel`, `car`, `insurance`, `document_check`, `custom`)
  - [x]Create `booking_tasks` table with all columns, FK to `booking_task_types`, trigger, RLS
  - [x]Create indexes on `vacation_id`, `family_id`
  - [x]Push migration

- [x] Task 2: Update PowerSync schema (AC: 1)
  - [x]Add `bookingTasksTable` to `powersync.schema.ts`

- [x] Task 3: Fix booking task types (AC: 1, 2, 3)
  - [x]Update `BookingTaskType` to: `'flights' | 'hotel' | 'car' | 'insurance' | 'document_check' | 'custom'`
  - [x]Replace `BookingTaskStatus` with `isComplete: boolean` on `BookingTask` interface
  - [x]Add `deadlineDays`, `parentTaskId`, `profileId` fields to `BookingTask`
  - [x]Update `CreateBookingTaskInput` accordingly

- [x] Task 4: Implement booking task repository methods (AC: 2, 3, 4, 5)
  - [x]Implement `getBookingTasks(vacationId)` — query ordered by `is_complete ASC, due_date ASC`
  - [x]Implement `createBookingTask(data)` — insert single task row
  - [x]Implement `updateBookingTask(id, data)` — update title/dueDate/isComplete
  - [x]Implement `deleteBookingTask(id)` — delete row
  - [x]Add auto-generation logic: after creating a vacation, auto-create 3 standard tasks with calculated due dates

- [x] Task 5: Create booking tasks screen (AC: 3, 4, 5)
  - [x]Create `src/app/(app)/vacations/[id]/` folder with `_layout.tsx` and `tasks.tsx`
  - [x] Task list: incomplete first (sorted by due_date), completed at bottom (strikethrough)
  - [x]Each row: title, due date (DD/MM/YYYY), days remaining badge
  - [x]Tap task → toggle `is_complete`
  - [x]"Adicionar tarefa" button → bottom sheet with title + date picker
  - [x]Back button to vacation list

- [x] Task 6: Add "Tarefas" navigation from vacation edit (AC: 3)
  - [x]Add "Tarefas" button in the vacation edit bottom sheet (only in edit mode)
  - [x]Tapping closes the sheet and navigates to `/(app)/vacations/<id>/tasks`

- [x] Task 7: Verify (AC: 1, 2, 3, 4, 5)
  - [x]`npm run type-check` — zero errors
  - [x]`npm run lint` — zero errors
  - [x]Build: `npx expo run:android`
  - [x]Create a vacation → 3 tasks auto-generated
  - [x]View tasks → sorted by urgency
  - [x]Mark task complete → moves to bottom with strikethrough
  - [x]Add custom task → appears in list
  - [x]Delete task → removed

## Dev Notes

### ⚠️ Type Alignment Required

Existing types have discrepancies with the spec:
- `BookingTaskType`: add `'document_check'` and `'custom'`, remove `'visa'` and `'other'`
- `BookingTaskStatus` (`'pending' | 'done'`): replace with `isComplete: boolean` to match DB column `is_complete`
- Add missing fields: `deadlineDays: number | null`, `parentTaskId: string | null`, `profileId: string | null`

### ⚠️ Booking Task Types as Lookup Table

Following the pattern for `profile_statuses`, `roles`, `vacation_lifecycles`: create `booking_task_types` lookup table instead of a CHECK constraint.

### Auto-Generation on Vacation Create

After `createVacation()` inserts the vacation row and participants, auto-create 3 tasks:
```typescript
const STANDARD_TASKS = [
  { title: 'Voos', taskType: 'flights', deadlineDays: 90 },
  { title: 'Hotel', taskType: 'hotel', deadlineDays: 60 },
  { title: 'Rent-a-car', taskType: 'car', deadlineDays: 30 },
];
```

Calculate `due_date` by subtracting `deadline_days` from the vacation's `departure_date`.

### Days Remaining Display

Show days remaining as a colour-coded badge:
- Red: ≤ 7 days or overdue
- Orange: 8–30 days
- Grey: > 30 days

For overdue tasks, show "Atrasado" instead of days count.

### Screen Navigation

`src/app/(app)/vacations/[id]/tasks.tsx` is a dynamic route. Access via:
```typescript
router.push(`/(app)/vacations/${vacationId}/tasks`);
```

Read the vacation ID with:
```typescript
const { id } = useLocalSearchParams<{ id: string }>();
```

### Repository — No `.single()` on Mutations

Same pattern as vacation repository: use `.select()` without `.single()`, check `rows[0]`.

### Learnings from Previous Stories

- **No `--clear` flag**: `npx expo run:android` only
- **Prettier before lint**: `npx prettier --write <files>`
- **No screen flicker**: `loadData()` without `setIsLoading(true)` for post-mutation reloads
- **`compressAvatar`** can also be used for cover images (general purpose)
- **`useFocusEffect`** for dashboard refresh on navigation back
- **Country codes are now ISO3** (PRT, ESP) — `countryIso2()` converts to ISO2 for flag emoji

### References

- Epic 2 Story 2.3 — `_bmad-output/planning-artifacts/epics.md`
- Existing booking task stubs — `familyhub/src/repositories/supabase/vacation.repository.ts`
- Vacation types — `familyhub/src/types/vacation.types.ts`
- Vacation repository interface — `familyhub/src/repositories/interfaces/vacation.repository.interface.ts`

## Dev Agent Record

### Agent Model Used

claude-opus-4-6

### Debug Log References

### Completion Notes List

- Migration 018: `booking_task_types` lookup + `booking_tasks` table with FK, RLS, trigger, indexes
- Types aligned: `BookingTaskType` now includes `document_check` + `custom`; replaced `BookingTaskStatus` with `isComplete: boolean`; added `deadlineDays`, `parentTaskId`, `profileId`
- Auto-generation: `createVacation` now auto-creates 3 standard booking tasks (Voos 90d, Hotel 60d, Rent-a-car 30d) with calculated due dates
- All 4 booking task repository methods implemented (get, create, update, delete)
- Booking tasks screen: `vacations/[id]/tasks.tsx` with incomplete tasks first (sorted by due_date), completed at bottom with strikethrough, days-remaining colour-coded badge (red ≤7d, orange 8-30d, grey >30d), "Atrasado" for overdue
- Add custom task via bottom sheet with title + native date picker
- "Tarefas" button in vacation edit sheet navigates to tasks screen

### File List

- `familyhub/supabase/migrations/20260326220000_booking_tasks.sql` (new)
- `familyhub/src/utils/powersync.schema.ts` (modified)
- `familyhub/src/types/vacation.types.ts` (modified)
- `familyhub/src/repositories/interfaces/vacation.repository.interface.ts` (modified)
- `familyhub/src/repositories/supabase/vacation.repository.ts` (modified)
- `familyhub/src/app/(app)/vacations/[id]/_layout.tsx` (new)
- `familyhub/src/app/(app)/vacations/[id]/tasks.tsx` (new)
- `familyhub/src/app/(app)/vacations/index.tsx` (modified — Tarefas button)
