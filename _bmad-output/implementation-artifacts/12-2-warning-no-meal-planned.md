# Story 12.2: Warning When No Meal Is Planned

Status: done

## Story

As an Admin,
I want to see a warning when the next meal slot has nothing planned,
so that I know I need to decide what to eat.

## Acceptance Criteria

1. **Given** the next upcoming active slot has no meal set
   **When** the admin views the dashboard
   **Then** the widget displays a warning (e.g., "No meal planned for tonight's dinner")

2. **Given** the next slot is skipped (don't plan / disabled)
   **When** the system evaluates the warning
   **Then** skipped slots do not trigger a warning — only active, empty slots do

## Tasks / Subtasks

- [x] Task 1: Add next-empty-slot detection logic (AC: #1, #2)
  - [x] 1.1 Created `getNextActiveEmptySlot(entries, configs, now)` returning `{ dayOfWeek, mealSlot } | null`
  - [x] 1.2 Reuses same skip detection logic (entry-level and config-level skips)

- [x] Task 2: Add warning display to MealPlanWidget (AC: #1)
  - [x] 2.1 Added `emptySlot` prop to widget
  - [x] 2.2 Shows warning "Sem refeição para {day} {slot}" with slot context
  - [x] 2.3 Uses alert-circle icon with #F59300 warning color

- [x] Task 3: Wire empty slot detection in dashboard (AC: #1)
  - [x] 3.1 Calls `getNextActiveEmptySlot()` in `loadNextMeal()` and passes to widget

## Dev Notes

- Extends MealPlanWidget from story 12-1
- `getNextActiveEmptySlot` uses same iteration pattern as `getNextMeal` but returns first active slot WITHOUT an entry
- Warning only shows when there IS an active empty slot (not when all remaining slots are skipped)

### References
- [Source: _bmad-output/planning-artifacts/epics-v3-meal-plan.md#Epic 12]
- [Source: _bmad-output/planning-artifacts/prd.md#FR98]

## Dev Agent Record

### Agent Model Used
### Debug Log References
### Completion Notes List
### File List
### Change Log
- 2026-04-02: Story created
