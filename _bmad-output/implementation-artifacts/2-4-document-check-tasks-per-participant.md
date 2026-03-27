# Story 2.4: Document Check Tasks per Participant

Status: review

## Story

As an Admin,
I want one document check task per trip participant, which I can mark complete or extend with child tasks,
So that each family member's documents are tracked individually and I can add a renewal task if needed.

## Acceptance Criteria

1. **Given** a new vacation is created with participants (e.g., Filipe, Angela, Aurora, Isabel)
   **When** `createVacation()` completes
   **Then** one `document_check` booking task is auto-generated per participant: "Verificar documentos — [Nome]" with `task_type: 'document_check'` and `profile_id` set to each participant's profile ID
   **And** these tasks appear alongside the 3 standard tasks, sorted by `due_date`

2. **Given** a document check task exists for Angela
   **When** an Admin marks it complete
   **Then** `is_complete: true` is set on that task only
   **And** the task moves to the completed section

3. **Given** a document check task exists and a participant's passport needs renewal
   **When** an Admin taps "Subtarefa" on the document check task
   **Then** a bottom sheet opens with fields: Título and Data limite
   **And** on save, a child task is created with `parent_task_id` pointing to the parent document check task

4. **Given** child tasks exist under a document check task
   **When** an Admin views the booking task list
   **Then** child tasks appear indented under their parent task
   **And** each child task has its own complete/incomplete state

## Tasks / Subtasks

- [x] Task 1: Auto-generate document check tasks on vacation create (AC: 1)
  - [x] In `createVacation()` in `vacation.repository.ts`, after inserting the 3 standard tasks, insert one `document_check` task per participant with title `"Verificar documentos — {displayName}"`, `profile_id` set, `due_date` = `departure_date - 14` (14 days before departure)
  - [x] Need to resolve profile display names — query profiles table by the participant IDs

- [x] Task 2: Add `profileId` and `parentTaskId` to `CreateBookingTaskInput` (AC: 1, 3)
  - [x] Add `profileId?: string | null` to `CreateBookingTaskInput`
  - [x] Add `parentTaskId?: string | null` to `CreateBookingTaskInput`
  - [x] Update `createBookingTask()` to include `profile_id` and `parent_task_id` in the INSERT

- [x] Task 3: Update tasks screen — child task support (AC: 3, 4)
  - [x] Group tasks: top-level tasks (parentTaskId = null) shown normally; child tasks indented under their parent
  - [x] Add "Subtarefa" button on `document_check` tasks (and only those)
  - [x] "Subtarefa" opens the add-task bottom sheet with `parentTaskId` pre-set
  - [x] Child tasks rendered with left indent/margin

- [x] Task 4: Verify (AC: 1, 2, 3, 4)
  - [x] `npm run type-check` — zero errors
  - [x] `npm run lint` — zero errors
  - [ ] Build: `npx expo run:android`
  - [ ] Create vacation with 4 participants → 3 standard tasks + 4 document check tasks appear
  - [ ] Mark a document check task complete → moves to bottom
  - [ ] Add subtask to a document check → appears indented under parent
  - [ ] Subtask has independent complete state

## Dev Notes

### ⚠️ No Migration Needed

The `booking_tasks` table already has `parent_task_id` (FK→booking_tasks, CASCADE) and `profile_id` (FK→profiles, SET NULL). The `document_check` type already exists in `booking_task_types`. No schema changes required.

### Auto-Generation Logic

In `createVacation()`, after the 3 standard tasks, add document check tasks. Need profile names for the titles:

```typescript
// Fetch profile display names for participants
const { data: profileRows } = await this.client
  .from('profiles')
  .select('id, display_name')
  .in('id', input.participantProfileIds);

const docCheckTasks = (profileRows ?? []).map((p) => ({
  vacation_id: vacation.id,
  family_id: input.familyId,
  title: `Verificar documentos — ${p.display_name}`,
  task_type: 'document_check',
  deadline_days: 14,
  due_date: subtractDays(input.departureDate, 14),
  is_complete: false,
  profile_id: p.id,
}));

if (docCheckTasks.length > 0) {
  await this.client.from('booking_tasks').insert(docCheckTasks);
}
```

### Child Task Grouping in UI

The tasks screen should render:
1. **Top-level incomplete** tasks (parentTaskId = null, isComplete = false) sorted by due_date
2. Under each document_check task: its **child tasks** (parentTaskId = task.id), indented
3. **Top-level completed** tasks at the bottom with strikethrough

Build a grouped structure from the flat task list:
```typescript
const topLevel = tasks.filter(t => !t.parentTaskId);
const childrenOf = (parentId: string) => tasks.filter(t => t.parentTaskId === parentId);
```

### "Subtarefa" Button

Only shown on `document_check` tasks. Opens the same add-task bottom sheet but with `parentTaskId` pre-set to the document check task's ID.

### Learnings from Story 2.3

- `getBookingTasks` already orders by `is_complete ASC, due_date ASC`
- `createBookingTask` already accepts `taskType` — just need to add `profileId` and `parentTaskId`
- Native date picker works well for due dates
- No `.single()` on mutations

### References

- Epic 2 Story 2.4 — `_bmad-output/planning-artifacts/epics.md`
- Booking tasks screen — `familyhub/src/app/(app)/vacations/[id]/tasks.tsx`
- Vacation repository — `familyhub/src/repositories/supabase/vacation.repository.ts`
- Vacation types — `familyhub/src/types/vacation.types.ts`

## Dev Agent Record

### Agent Model Used

claude-opus-4-6

### Debug Log References

### Completion Notes List

- Added `profileId` and `parentTaskId` optional fields to `CreateBookingTaskInput` type
- Updated `createBookingTask()` repository method to persist `profile_id` and `parent_task_id` columns
- Added document check task auto-generation in `createVacation()` — queries profiles by participant IDs, creates one task per participant with title "Verificar documentos — {name}" and due_date = departure - 14 days
- Refactored tasks screen to group tasks by parent/child hierarchy — top-level tasks shown normally, children indented under parent
- Added "Subtarefa" button on `document_check` tasks only — opens bottom sheet with `parentTaskId` pre-set
- Child tasks render with independent complete/incomplete state and indented styling
- Bottom sheet title adapts: "Nova subtarefa" when adding child task, "Nova tarefa" otherwise
- `type-check` and `lint` both pass with zero errors
- Manual build/functional testing deferred to user (requires device/emulator)

### File List

- `familyhub/src/types/vacation.types.ts` — added `profileId`, `parentTaskId` to `CreateBookingTaskInput`
- `familyhub/src/repositories/supabase/vacation.repository.ts` — added doc check task generation in `createVacation()`, added `profile_id`/`parent_task_id` to `createBookingTask()` INSERT
- `familyhub/src/app/(app)/vacations/[id]/tasks.tsx` — child task grouping, "Subtarefa" button, indented child rendering, parent-aware bottom sheet
