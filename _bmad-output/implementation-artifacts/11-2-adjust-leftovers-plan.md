# Story 11.2: Adjust the Meal Plan When Leftovers Don't Match Expectations

Status: done

## Story

As an Admin,
I want to adjust leftovers entries when reality doesn't match the plan,
so that the meal plan stays accurate (e.g., not enough leftovers, or unexpected surplus).

## Acceptance Criteria

1. **Given** a slot is set as "leftovers" linked to a previous meal
   **When** the admin determines there aren't enough leftovers
   **Then** they can unlink the leftovers entry and replace it with a new meal (any type)

2. **Given** a meal was planned as home-cooked
   **When** there is unexpected surplus
   **Then** the admin can create a new leftovers entry in a subsequent slot and link it to that meal

3. **Given** a leftovers entry is unlinked
   **When** the admin replaces it with a new meal
   **Then** the source meal is unaffected — only the leftovers slot changes

## Tasks / Subtasks

- [x] Task 1: Verify existing unlink flow works correctly (AC: #1, #3)
  - [x] 1.1 Verified: `handleTypeChange()` clears linkedMealId when type !== 'leftovers'; `handleSave()` sends `isLeftovers ? linkedMealId : null`
  - [x] 1.2 Verified: `update()` only touches edited entry; DB has `ON DELETE SET NULL` — source meal never modified
  - [x] 1.3 Verified: Name TextInput is always editable regardless of meal type

- [x] Task 2: Add explicit "Desassociar" (unlink) action for leftovers in edit form (AC: #1)
  - [x] 2.1 Added "Desassociar restos" button with link-off icon below linked meal display, visible when linkedMealId is set
  - [x] 2.2 On confirm: clears linkedMealId, linkedMealName, linkedMealMeta, and switches mealType to 'home_cooked'
  - [x] 2.3 Alert confirmation: "Desassociar restos" / "A refeição ficará sem ligação aos restos. Continuar?"

- [x] Task 3: Verify surplus flow works correctly (AC: #2)
  - [x] 3.1 Verified: Add form shows LinkedMealPicker when leftovers type selected (from story 11-1)
  - [x] 3.2 Verified: No unique constraint on linked_meal_id — multiple leftovers can link to same source
  - [x] 3.3 Verified: `mealPlanRepo.create()` only inserts new row — source meal unaffected

## Dev Notes

### What's Already Implemented (from Story 11-1)

Most of this story's functionality exists from story 11-1:

| Flow | Status | How It Works |
|------|--------|--------------|
| Change leftovers type → clears linkedMealId | Done | `handleTypeChange()` in both forms clears linkedMealId when type !== 'leftovers' |
| Create new leftovers in any slot | Done | Add form with leftovers type + LinkedMealPicker |
| Multiple leftovers linking to same source | Done | No unique constraint on `linked_meal_id` in DB |
| Source meal unaffected on edit/delete | Done | DB `ON DELETE SET NULL`, `update()` only touches edited entry |

### What Needs to Be ADDED

1. **Explicit "Desassociar" button** in edit form — makes the unlink action discoverable without requiring the user to know they can change the meal type to unlink

### Architecture Compliance

- Follow existing edit form patterns — alert confirmation before destructive action (Portuguese)
- No new repository methods needed — existing `update()` handles clearing linkedMealId
- No new types, no migrations, no store changes

### File Structure

```
src/
  components/meal-plan/
    meal-edit-form.tsx    ← MODIFY: Add "Desassociar" button for leftovers entries
```

### Previous Story Intelligence (from Story 11-1)

**Key patterns established:**
- `handleTypeChange()` clears linkedMealId/linkedMealName/linkedMealMeta when switching away from leftovers
- Edit form has linked meal display section with `pot-steam` icon, name, and meta (day/slot)
- Alert confirmations use Portuguese text with destructive style
- `linkedMealId` is passed through `onSave` as 7th positional parameter
- Leftovers type is dynamically disabled when no linkable meals available (`linkableMeals.length === 0`)

**Code review deferred items (context, don't fix here):**
- onSave has 7 positional parameters — fragile but consistent with existing pattern
- Nested Modal rendering — pre-existing pattern from participant picker

### Scope Boundary

**In scope (Story 11.2):** Unlink leftovers with explicit action, verify surplus flow works
**Out of scope:** Changes to LinkedMealPicker, changes to grid display, new repository methods

### Testing Requirements

- Verify unlinking via type change: edit leftovers → change type to home_cooked → save → linkedMealId is null in DB
- Verify unlinking via "Desassociar" button: edit leftovers → tap button → confirm → type changes to home_cooked, linkedMealId cleared
- Verify source meal unaffected: after unlink, source meal still exists with original data
- Verify surplus flow: create leftovers in new slot linking to existing home-cooked meal → both entries coexist
- Verify multiple links: link two leftovers entries to same source → both persist

### References

- [Source: _bmad-output/planning-artifacts/epics-v3-meal-plan.md#Epic 11]
- [Source: _bmad-output/planning-artifacts/prd.md#FR96]
- [Source: _bmad-output/implementation-artifacts/11-1-link-meal-slot-to-leftovers.md]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

- TypeScript compilation: 0 errors in meal plan files

### Completion Notes List

- Tasks 1 & 3: Verification-only — confirmed existing flows from story 11-1 satisfy ACs
- Task 2: Added "Desassociar restos" button with link-off icon and Alert confirmation in meal-edit-form.tsx
- Unlink action clears linkedMealId, name, meta and switches type to home_cooked
- Minimal code change — 1 file modified with ~30 lines added (handler + button + styles)

### File List

- src/components/meal-plan/meal-edit-form.tsx (MODIFIED — added handleUnlinkPress, unlink button UI, unlinkButton/unlinkText styles)

### Change Log
- 2026-04-02: Story created by create-story workflow — lightweight story, most functionality already exists from 11-1
- 2026-04-02: Implementation complete — added explicit unlink action, verified existing flows satisfy all ACs
