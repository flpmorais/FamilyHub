# Story 12.3: Planning Reminder for Next Week

Status: done

## Story

As an Admin,
I want to see a reminder on Sunday if next week has no meals planned,
so that I'm nudged to plan ahead before the week starts.

## Acceptance Criteria

1. **Given** it is Sunday
   **When** the following week has zero meal entries
   **Then** the widget displays a planning reminder (e.g., "No meals planned for next week")

2. **Given** it is Sunday
   **When** the following week has at least one meal entry
   **Then** no planning reminder is shown

3. **Given** it is any day other than Sunday
   **When** the admin views the dashboard
   **Then** no planning reminder for next week is shown, regardless of next week's state

## Tasks / Subtasks

- [x] Task 1: Add next-week check to dashboard (AC: #1, #2, #3)
  - [x] 1.1 Checks `now.getDay() === 0` (Sunday) before fetching next week
  - [x] 1.2 Fetches next week via `mealPlanRepo.getWeek(familyId, addWeeks(weekStart, 1))`
  - [x] 1.3 Filters skipped entries: `nextWeekEntries.filter((e) => !e.isSlotSkipped)`
  - [x] 1.4 Sets `showPlanningReminder` true only when Sunday AND zero planned meals

- [x] Task 2: Add planning reminder display to widget (AC: #1)
  - [x] 2.1 Added `showPlanningReminder: boolean` prop
  - [x] 2.2 Shows "Sem refeições planeadas para a próxima semana" with calendar-alert icon
  - [x] 2.3 Uses #1976D2 info blue to distinguish from #F59300 warnings

## Dev Notes

- Uses `addWeeks()` from meal-plan store to compute next week's Monday
- Only fetches next week data on Sundays (no unnecessary queries on other days)
- Skipped entries (`_skipped` sentinel) should not count as planned meals

### References
- [Source: _bmad-output/planning-artifacts/epics-v3-meal-plan.md#Epic 12]
- [Source: _bmad-output/planning-artifacts/prd.md#FR99]

## Dev Agent Record

### Agent Model Used
### Debug Log References
### Completion Notes List
### File List
### Change Log
- 2026-04-02: Story created
