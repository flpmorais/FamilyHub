# Story 10.2: Enable a Skipped Slot for a Specific Week

Status: done

## Story

As an Admin,
I want to enable a normally-skipped slot for a specific week,
so that I can plan a meal on a public holiday or special occasion.

## Acceptance Criteria

1. A config-skipped slot (greyed out) in the week grid can be tapped to enable it for that week
2. Tapping a config-skipped slot shows a confirmation: "Este horário está marcado como saltar. Quer ativá-lo para esta semana?"
3. On confirmation, the slot becomes plannable — opens the MealAddForm with config default participants
4. The enable is week-specific — the same slot in other weeks remains skipped
5. The enabled slot is implemented by creating a meal entry with `is_slot_skipped = false` (overrides config)
6. No migration needed — `is_slot_skipped` and `is_slot_overridden` already exist on `meal_entries`

## Tasks / Subtasks

- [x] Task 1: Update grid to allow tapping config-skipped slots (AC: #1, #2)
  - [x] Config-skipped cells tappable (`disabled={!!skippedByEntry}` — only entry-skipped is disabled)
  - [x] `handleSlotPress` detects config-skipped slots and shows Alert confirmation in Portuguese
- [x] Task 2: On confirmation, open add form (AC: #3, #5)
  - [x] Alert "Ativar" button calls `setAddSlot` → opens MealAddForm normally
  - [x] Created entry has `is_slot_skipped = false` (default) — overrides config skip for this week
- [x] Task 3: Verify week isolation (AC: #4)
  - [x] Config skip applies to other weeks — only the week with a new entry is affected (entry existence overrides config)

## Dev Notes

### Implementation Approach

The key insight: a config-skipped slot with NO entry shows as skipped. A config-skipped slot WITH an entry (where `is_slot_skipped = false`) shows the meal — the entry overrides the config. No special flag manipulation needed beyond creating a normal meal entry.

The grid already renders entry data over config skip: `skippedByConfig = !entry && isSlotSkippedByConfig(...)`. If an entry exists, it's shown regardless of config.

So the implementation is simple:
1. Allow tapping config-skipped empty slots
2. Show confirmation Alert
3. On confirm, open MealAddForm normally
4. The created entry naturally overrides the config skip for that week

### Grid Cell Changes

```typescript
// Current: disabled for all skipped
disabled={!!skipped}

// New: disabled only for entry-skipped, tappable for config-skipped
disabled={!!skippedByEntry}
```

Update `handleSlotPress`:
```typescript
if (!entry && isSlotSkippedByConfig(dayOfWeek, slot)) {
  Alert.alert(
    'Ativar horário',
    'Este horário está marcado como saltar. Quer ativá-lo para esta semana?',
    [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Ativar', onPress: () => { if (profileIds.length > 0) setAddSlot({ dayOfWeek, mealSlot: slot }); } },
    ]
  );
  return;
}
```

### What NOT to Do

- **DO NOT** modify the config table — this is a per-week override via entry creation
- **DO NOT** add new columns or migrations
- **DO NOT** implement disable (Story 10.3)

### Project Structure Notes

| File | Path | Action |
|------|------|--------|
| Meal plan screen | `src/app/(app)/(meal-plan)/index.tsx` | Modify (update grid tapping + handleSlotPress) |

1 file modified.

### References

- [Source: _bmad-output/planning-artifacts/prd.md#Meal Plan Management (V3) — FR93]
- [Source: _bmad-output/planning-artifacts/epics-v3-meal-plan.md#Epic 10, Story 10.2]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

- TypeScript compilation: zero errors

### Completion Notes List

- Added `Alert` import to meal plan screen
- `handleSlotPress` now has 3 branches: entry exists (edit), no entry + config-skipped (Alert → enable), no entry + active (add)
- Config-skipped cells tappable but still visually greyed — Alert explains what's happening
- Entry creation naturally overrides config skip (grid checks `!entry && isSlotSkippedByConfig`)
- Minimal change — 1 import added, 1 function updated, 1 prop changed on TouchableOpacity

### Change Log

- 2026-04-02: Story 10.2 implemented — all 3 tasks complete

### File List

**Modified files:**
- `src/app/(app)/(meal-plan)/index.tsx` (Alert import, handleSlotPress 3-branch logic, disabled prop change)
