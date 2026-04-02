# Story 10.3: Disable an Active Slot for a Specific Week

Status: done

## Story

As an Admin,
I want to disable a normally-active slot for a specific week,
so that I can skip a meal when plans change (e.g., family eating elsewhere).

## Acceptance Criteria

1. An active slot with a planned meal can be skipped for a specific week
2. Long-pressing (or via edit form action) a meal shows an option to skip this slot
3. Skipping removes the planned meal and marks the slot as skipped for this week
4. The skip is week-specific — the same slot in other weeks remains active
5. A skipped slot can be re-enabled by tapping it (reuses Story 10.2 flow)
6. Implementation: create/update a meal entry with `is_slot_skipped = true` and clear the meal data, OR delete the entry and create a skip marker

## Tasks / Subtasks

- [x] Task 5: Add repository method for creating skip marker (AC: #6) — done first as dependency
  - [x] Added `skipSlot` to interface and implementation
  - [x] Uses upsert on (family_id, week_start, day_of_week, meal_slot) — handles both fresh skip and replacing existing meal
- [x] Task 1: Add "skip slot" action to edit form (AC: #1, #2)
  - [x] "Saltar" button added alongside "Apagar" in edit form
  - [x] Portuguese confirmation Alert: "Quer saltar este horário esta semana? A refeição será removida."
- [x] Task 2: Implement skip action (AC: #3)
  - [x] `handleSkipMeal`: deletes existing entry, creates skip marker via `skipSlot`
  - [x] Grid refreshes after skip
- [x] Task 3: Handle empty slots — simplified
  - [x] Skipping only available from edit form (requires existing meal). Empty active slots open add form. Matches PRD flow.
- [x] Task 4: Re-enable skipped entry slots (AC: #5)
  - [x] Tapping entry-skipped slot shows "Reativar horário" Alert
  - [x] On confirm, deletes skip marker — slot reverts to empty/plannable
  - [x] All slots now tappable (no `disabled` prop) — handleSlotPress routes to correct action

## Dev Notes

### Implementation: Skip Marker Entries

A "skipped" slot for a specific week is represented as a meal entry with `is_slot_skipped = true`. This entry:
- Occupies the unique slot (family_id + week_start + day_of_week + meal_slot)
- Prevents the MealAddForm from opening (grid treats it as skipped)
- Is visually distinct (greyed, dash) — same as config-skipped
- Can be deleted to re-enable the slot

Skip marker entry:
```typescript
{
  name: '_skipped',
  mealType: 'home_cooked',
  participants: [],
  isSlotSkipped: true,
}
```

### Edit Form: Skip Button

Add between delete and cancel/save:
```tsx
<TouchableOpacity onPress={handleSkipPress}>
  <Text style={styles.skipText}>Saltar esta semana</Text>
</TouchableOpacity>
```

### Skip vs Delete

- **Delete**: removes the meal, slot becomes empty and plannable
- **Skip**: removes the meal, slot becomes skipped (greyed, not plannable unless re-enabled)

### Re-Enable Flow

Entry-skipped slots: tap → Alert "Quer reativar este horário?" → confirm → delete skip marker → slot becomes empty.

This reuses the same pattern as Story 10.2 (config-skipped enable) but with a different action (delete entry vs create entry).

### Grid Logic Update

```typescript
// Current: entry-skipped not tappable
disabled={!!skippedByEntry}

// New: entry-skipped is tappable (for re-enable flow)
// All slots are tappable — handleSlotPress routes to the right action
disabled={false}
```

Update `handleSlotPress` to handle all cases:
1. Entry exists + not skipped → edit form
2. Entry exists + skipped → re-enable confirmation
3. No entry + config-skipped → enable confirmation (Story 10.2)
4. No entry + not skipped → add form

### What NOT to Do

- **DO NOT** modify the config table
- **DO NOT** add new migrations
- **DO NOT** implement long-press for empty slot skip — just use the same flow as adding a meal but with a skip option. Keep it simple: empty active slots open the add form (not a skip action). Skipping is only available through the edit form for meals that exist.

Actually, reconsidering — Task 3 says "skip without existing meal". The simplest approach: add a small "skip" icon button on empty active slots, or let the user create a meal and then skip it. Let's keep it simple: **only allow skipping from the edit form** (requires a meal to exist first). Empty slots are for adding meals, not for skipping. This matches the user's described flow in the PRD.

### Project Structure Notes

| File | Path | Action |
|------|------|--------|
| Repo interface | `src/repositories/interfaces/meal-plan.repository.interface.ts` | Modify (add skipSlot) |
| Repo impl | `src/repositories/supabase/meal-plan.repository.ts` | Modify (add skipSlot) |
| Edit form | `src/components/meal-plan/meal-edit-form.tsx` | Modify (add skip button) |
| Meal plan screen | `src/app/(app)/(meal-plan)/index.tsx` | Modify (handle entry-skipped tap for re-enable) |

### References

- [Source: _bmad-output/planning-artifacts/prd.md#Meal Plan Management (V3) — FR94]
- [Source: _bmad-output/planning-artifacts/epics-v3-meal-plan.md#Epic 10, Story 10.3]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

- TypeScript compilation: zero errors

### Completion Notes List

- `skipSlot` repository method: upserts skip marker entry (`_skipped`, `is_slot_skipped = true`, empty participants) using onConflict on unique slot constraint
- Edit form: "Saltar" button with destructive Alert confirmation, calls `onSkip` prop
- Screen: `handleSkipMeal` deletes meal then creates skip marker, refreshes grid
- Entry-skipped slots now tappable — "Reativar horário" Alert → deletes skip marker
- `handleSlotPress` now handles 4 cases: entry (edit), entry-skipped (re-enable), config-skipped (enable via 3.2), empty (add)
- All cells tappable — removed `disabled` prop entirely
- Task 3 simplified: skip only available from edit form, not from empty slots (matches PRD user flow)

### Change Log

- 2026-04-02: Story 10.3 implemented — all 5 tasks complete

### File List

**Modified files:**
- `src/repositories/interfaces/meal-plan.repository.interface.ts` (added skipSlot)
- `src/repositories/supabase/meal-plan.repository.ts` (added skipSlot with upsert)
- `src/components/meal-plan/meal-edit-form.tsx` (added skip button + onSkip prop + styles)
- `src/app/(app)/(meal-plan)/index.tsx` (handleSkipMeal, entry-skipped re-enable, removed disabled prop)
