# Story 10.1: Override Participants for a Specific Meal

Status: review

## Story

As an Admin,
I want to add or remove participants from a specific meal without changing the defaults,
so that I can reflect who is actually eating that meal (e.g., Aurora sleeping at a friend's house).

## Acceptance Criteria

1. The meal edit form shows the current participants for the meal with a tappable profile picker
2. The admin can add or remove profiles from the meal's participant list
3. Saving with changed participants persists the override and sets `is_slot_overridden = true`
4. The global defaults remain unchanged — only the specific meal entry is modified
5. Overridden participants persist across screen navigations (not reset to defaults on reload)
6. The meal plan grid shows a visual hint when a meal has overridden participants (e.g., small people icon)

## Tasks / Subtasks

- [x] Task 1: Add participant section to MealEditForm (AC: #1, #2)
  - [x] Show current meal participants as profile name chips below the meal type selector
  - [x] account-edit icon opens profile checkbox modal (centered overlay)
  - [x] Modal shows all family profiles with current meal participants pre-checked
  - [x] Toggle updates local participant state immediately
- [x] Task 2: Update edit form save to include participants (AC: #3, #4)
  - [x] Updated `onSave` callback to pass participants and isSlotOverridden
  - [x] Override detection: compares sorted participant arrays to detect changes
  - [x] Screen's `handleEditMeal` passes participants and isSlotOverridden to repository
- [x] Task 3: Show override indicator in grid (AC: #6)
  - [x] `account-edit` icon (10px, accent color) shown in grid cell when `isSlotOverridden = true`
- [x] Task 4: Verify persistence (AC: #5)
  - [x] Participants stored in JSONB column, persisted through repository update, survives reload

## Dev Notes

### Previous Story Learnings

- Story 9.1: profile picker modal pattern works well (checkbox list + save button)
- Story 9.2: config skip toggle + dual skip logic in grid
- Code reviews: guard against empty profileIds, check config skip in handleSlotPress
- `is_slot_overridden` column exists in `meal_entries` from Story 8.1 migration — no new migration

### Current Edit Form Signature

```typescript
// Current (Story 8.3):
onSave: (id: string, name: string, mealType: MealType, detail: string | null) => Promise<void>;

// After (Story 10.1):
onSave: (id: string, name: string, mealType: MealType, detail: string | null, participants: string[], isSlotOverridden: boolean) => Promise<void>;
```

### Participant Display in Edit Form

Show participants as a row of name chips below the type selector:

```tsx
<Text style={styles.label}>Participantes</Text>
<View style={styles.participantRow}>
  {participantNames.map((name, i) => (
    <View key={i} style={styles.participantChip}>
      <Text style={styles.participantChipText}>{name}</Text>
    </View>
  ))}
  <TouchableOpacity onPress={() => setShowParticipantPicker(true)}>
    <Icon source="account-edit" size={20} color="#888" />
  </TouchableOpacity>
</View>
```

### Override Detection

Compare meal participants with config defaults to determine `isSlotOverridden`:

```typescript
function areParticipantsOverridden(
  mealParticipants: string[],
  configParticipants: string[]
): boolean {
  if (mealParticipants.length !== configParticipants.length) return true;
  const sorted1 = [...mealParticipants].sort();
  const sorted2 = [...configParticipants].sort();
  return sorted1.some((id, i) => id !== sorted2[i]);
}
```

The screen needs to pass `slotConfigs` context to the edit form (or compute override at the screen level).

### Props Changes

**MealEditForm** needs additional props:
- `profiles: Profile[]` — to display profile names and power the picker
- `onSave` updated signature (adds participants + isSlotOverridden)

The screen should pass profiles and handle override detection in `handleEditMeal`.

### Grid Override Indicator

Small icon in the grid cell when `isSlotOverridden`:
```tsx
{entry.isSlotOverridden && <Icon source="account-edit" size={10} color="#B5451B" />}
```

### What NOT to Do

- **DO NOT** create new migrations — `is_slot_overridden` already exists
- **DO NOT** implement slot enable/disable (Stories 10.2, 10.3)
- **DO NOT** modify `MealAddForm` — new meals use config defaults, not overrides
- **DO NOT** add PowerSync

### Project Structure Notes

| File | Path | Action |
|------|------|--------|
| Edit form | `src/components/meal-plan/meal-edit-form.tsx` | Modify (add participant picker) |
| Meal plan screen | `src/app/(app)/(meal-plan)/index.tsx` | Modify (pass profiles, update handler, grid indicator) |

No new files.

### References

- [Source: _bmad-output/planning-artifacts/prd.md#Meal Plan Management (V3) — FR92]
- [Source: _bmad-output/planning-artifacts/epics-v3-meal-plan.md#Epic 10, Story 10.1]
- [Pattern: src/app/(app)/(settings)/meal-plan-config.tsx — profile picker modal]
- [Previous: _bmad-output/implementation-artifacts/9-2-mark-slots-dont-plan.md — learnings]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

- TypeScript compilation: zero errors

### Completion Notes List

- MealEditForm: added `profiles` prop, participant chips row with account-edit button, nested Modal for profile picker
- Participant picker: checkbox list with "Concluído" button, toggles update local state
- Override detection in handleSave: compares sorted arrays to detect if participants changed from meal's original
- `isSlotOverridden` set to true if participants changed OR was already true
- Screen: stores full `Profile[]` alongside `profileIds`, passes to MealEditForm
- `handleEditMeal` now passes `participants` and `isSlotOverridden` to repository update
- Grid: account-edit icon (10px, #B5451B) shown for overridden meals between type icon and detail text
- No new files, no migrations — uses existing `participants` JSONB and `is_slot_overridden` boolean from Story 8.1

### Change Log

- 2026-04-01: Story 10.1 implemented — all 4 tasks complete

### File List

**Modified files:**
- `src/components/meal-plan/meal-edit-form.tsx` (participant chips, picker modal, updated onSave signature)
- `src/app/(app)/(meal-plan)/index.tsx` (profiles state, updated handler, override indicator in grid)
