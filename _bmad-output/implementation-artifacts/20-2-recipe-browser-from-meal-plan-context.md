# Story 20.2: Recipe Browser from Meal Plan Context

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an admin,
I want the recipe browser to open filtered to relevant recipe types when I'm linking from a meal plan slot,
so that I can quickly find the right recipe for each part of a meal.

## Acceptance Criteria

1. When the admin taps "Associar Receita" from a meal plan slot, the recipe browser opens displaying the full recipe collection with type filter tabs (FR140)
2. The admin can browse, search, and filter recipes using the same controls as the Recipes module — type tabs and name search (FR140)
3. When the admin selects a recipe, it is linked to the meal slot and the browser closes (FR140)
4. The slot displays the newly linked recipe (FR140)

## Tasks / Subtasks

- [x] Task 1: Recipe browser modal already created in Story 20.1 (AC: #1, #2, #3, #4)
  - [x] `recipe-browser-modal.tsx` exists with type filter tabs, name search, and recipe selection
  - [x] Integrated into `linked-recipes-section.tsx` which is used in `meal-edit-form.tsx`
  - [x] On select: recipe is linked via `mealPlanRepo.linkRecipe()` and section refreshes
  - [x] Linked recipe names displayed in meal plan grid
- [x] Task 2: Verify all ACs are met (AC: #1, #2, #3, #4)
  - [x] Confirm recipe browser opens on "Associar Receita" tap
  - [x] Confirm type filter tabs work
  - [x] Confirm name search works
  - [x] Confirm recipe selection links and closes modal
  - [x] Confirm linked recipe appears in slot

## Dev Notes

### Implementation Status

Story 20.1 (Link Recipes to Meal Plan Slots) already implemented the complete recipe browser modal:
- `src/components/meal-plan/recipe-browser-modal.tsx` — bottom sheet with type tabs, name search, selectable list
- `src/components/meal-plan/linked-recipes-section.tsx` — displays linked recipes, opens browser via "Associar Receita"
- Integration in `meal-edit-form.tsx` for `home_cooked` meals
- Linked recipe chips shown in meal plan grid

All 4 acceptance criteria for Story 20.2 are already satisfied by the Story 20.1 implementation.

### What This Story Does NOT Include

- Full filter panel (categories, tags, ingredients, time) from Epic 19 in the meal plan browser — the simplified type tabs + name search is sufficient for meal plan context where the admin is typically looking for a specific recipe by name or type

### References

- [Source: _bmad-output/planning-artifacts/epics-v5-recipes.md — Epic 4, Story 4.2]
- [Source: _bmad-output/planning-artifacts/prd.md — FR140]
- [Source: _bmad-output/implementation-artifacts/20-1-link-recipes-to-meal-plan-slots.md — Recipe browser already implemented]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

No implementation needed — all ACs covered by Story 20.1.

### Completion Notes List

- Task 1: Already complete from Story 20.1 — recipe browser modal with type tabs, search, and recipe selection exists at `src/components/meal-plan/recipe-browser-modal.tsx`
- Task 2: All ACs verified as met by existing implementation

### Change Log

- 2026-04-06: Story 20.2 — no new code needed, all ACs satisfied by Story 20.1 implementation. Completes Epic 20 (Meal Plan Recipe Integration).

### File List

No new or modified files — all functionality delivered in Story 20.1.
