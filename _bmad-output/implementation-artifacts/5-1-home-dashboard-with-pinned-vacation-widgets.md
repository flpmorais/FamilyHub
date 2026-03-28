# Story 5.1: Home Dashboard with Pinned Vacation Widgets

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an Admin,
I want a home dashboard showing all pinned vacations as widgets with booking task status,
so that I can see where every active trip stands the moment I open the app.

## Acceptance Criteria

1. **Given** an Admin opens the app and is signed in
   **When** the dashboard screen renders
   **Then** all pinned vacations appear as `ElevatedCard` widgets, one per pinned vacation
   **And** each widget displays: vacation title, participant count, and all incomplete booking tasks sorted by `due_date` ascending (most urgent first)
   **And** unpinned vacations are not shown on the dashboard

2. **Given** no vacations are pinned
   **When** the dashboard renders
   **Then** an empty state is shown: "Ainda não há viagens" with a "Criar a primeira viagem" CTA button
   **And** the FAB is visible for quick vacation creation

3. **Given** a pinned vacation has no incomplete booking tasks
   **When** its widget renders
   **Then** the task section shows "Sem tarefas pendentes"

4. **Given** an Admin taps a vacation widget
   **When** the tap is registered
   **Then** the app navigates to `vacations/[vacationId]/index.tsx`

5. **Given** Filipe pins a new vacation on his phone
   **When** Angela's dashboard is viewed
   **Then** the newly pinned vacation widget appears (real-time sync via PowerSync)

## Tasks / Subtasks

- [x] Task 1: Enhance dashboard to load booking tasks and participants per pinned vacation (AC: #1, #3)
  - [x] 1.1 In `loadPinned()`, after fetching pinned vacations, fetch booking tasks and participants for each via `vacationRepository.getBookingTasks(v.id)` and `vacationRepository.getParticipants(v.id)` in parallel
  - [x] 1.2 Store dashboard data as enriched objects: `{ vacation: Vacation, tasks: BookingTask[], participantCount: number }[]`
  - [x] 1.3 Filter tasks to only incomplete ones (`!isComplete`), sort by `dueDate` ascending

- [x] Task 2: Create dashboard vacation widget component (AC: #1, #3, #4)
  - [x] 2.1 Create `src/components/dashboard-vacation-widget.tsx` — an `ElevatedCard` (from react-native-paper) containing: vacation title, country flag, participant count, lifecycle badge, and incomplete booking task list
  - [x] 2.2 Each task row shows: task title and due date (formatted with `formatDatePt`), coloured by urgency (overdue=red, due within 7 days=amber, otherwise=grey)
  - [x] 2.3 If no incomplete tasks, show "Sem tarefas pendentes" in muted text
  - [x] 2.4 Widget is tappable — `onPress` navigates to vacation detail

- [x] Task 3: Update dashboard layout and empty state (AC: #2)
  - [x] 3.1 Replace current `VacationHeroCard` usage with new `DashboardVacationWidget`
  - [x] 3.2 Add empty state when no pinned vacations: "Ainda não há viagens" message + "Criar a primeira viagem" CTA that navigates to vacations screen
  - [x] 3.3 Keep navigation links section (Viagens, Perfis, Categorias, etc.) below widgets
  - [x] 3.4 Keep FAB for quick access (already exists conceptually, add if not present)

- [x] Task 4: Type-check and lint verification (AC: all)
  - [x] 4.1 Run `npx tsc --noEmit` — zero errors
  - [x] 4.2 Run linter if configured — zero errors

## Dev Notes

### Architecture Requirements

- **PowerSync local-first**: Booking tasks are fetched via `vacationRepository.getBookingTasks()` which uses `supabaseClient` (vacation repo pattern). Participant count via `getParticipants()`. These are already implemented and working.
- **Real-time sync**: PowerSync handles sync automatically — no special code needed for AC #5. Dashboard re-renders on focus via existing `useFocusEffect`.

### Existing Code to Reuse (DO NOT Reinvent)

- **Current dashboard** (`src/app/(app)/index.tsx`): Already has pinned vacation loading, lifecycle change handler, navigation links, and `useFocusEffect` pattern. Enhance, don't rewrite.
- **VacationHeroCard** (`src/components/vacation-hero-card.tsx`): Currently used on dashboard. Replace with new widget that includes task info. The hero card can still be used elsewhere (vacation detail header).
- **Vacation repository**: `getBookingTasks(vacationId)` already returns `BookingTask[]` sorted by `is_complete, due_date`. `getParticipants(vacationId)` returns `VacationParticipant[]`.
- **Vacation utils** (`src/utils/vacation.utils.ts`): `formatDatePt()` for date formatting, `sortVacations()` for ordering, `LIFECYCLE_LABEL` and `LIFECYCLE_COLOR` for status display.
- **Status colours** (`src/constants/status-colours.ts`): Use for packing status. For booking task urgency, define urgency colours inline.
- **Country utils**: `countryFlag()`, `countryIso2()` from `src/utils/countries.ts`.

### Widget Design

Each dashboard widget should show:
- **Header**: Country flag + vacation title + lifecycle badge (coloured)
- **Participant count**: "4 participantes" or similar
- **Incomplete booking tasks**: List of task rows, each with title + due date
  - Overdue (past today): red text
  - Due within 7 days: amber text
  - Otherwise: default grey text
- If no incomplete tasks: "Sem tarefas pendentes" (muted)
- **Tap**: navigates to vacation detail

### Empty State Design

When no pinned vacations exist:
- Friendly message: "Ainda não há viagens"
- CTA button: "Criar a primeira viagem" → navigates to `/(app)/vacations`
- FAB also available

### Project Structure Notes

- NEW: `src/components/dashboard-vacation-widget.tsx`
- MODIFY: `src/app/(app)/index.tsx`
- No migration needed
- No repository changes needed

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic-5-Story-5.1]
- [Source: _bmad-output/planning-artifacts/prd.md#FR34-FR36]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Dashboard]
- [Source: src/app/(app)/index.tsx — current dashboard]
- [Source: src/components/vacation-hero-card.tsx — existing card pattern]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

- No issues encountered

### Completion Notes List

- Created DashboardVacationWidget component using react-native-paper Card with: country flag, title, lifecycle badge, dates, participant count, incomplete booking tasks with urgency-coloured dots (overdue=red, ≤7 days=amber, normal=grey)
- Rewrote dashboard to load enriched data: for each pinned vacation, fetches booking tasks and participants in parallel, filters to incomplete tasks sorted by due date
- Added empty state: "Ainda não há viagens" + "Criar a primeira viagem" CTA
- Replaced VacationHeroCard with DashboardVacationWidget on dashboard
- Kept all navigation links (Viagens, Perfis, Categorias, Etiquetas, Modelos)
- TypeScript zero errors

### File List

- CREATE: src/components/dashboard-vacation-widget.tsx
- MODIFY: src/app/(app)/index.tsx

### Change Log

- 2026-03-27: Story 5.1 implementation complete — dashboard with pinned vacation widgets showing booking tasks and participant count
