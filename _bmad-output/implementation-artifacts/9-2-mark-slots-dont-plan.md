# Story 9.2: Mark Slots as "Don't Plan"

Status: review

## Story

As an Admin,
I want to mark certain meal slots as "don't plan" by default,
so that slots where the family doesn't eat together are automatically skipped.

## Acceptance Criteria

1. The config screen (Settings > Refeições) shows a toggle or switch per slot to mark it as "don't plan"
2. When a slot is marked "don't plan", it is saved with `is_skip = true` via `upsertConfig`
3. When a slot is marked "don't plan", the participant picker is hidden or disabled for that slot (no point configuring participants for a skipped slot)
4. In the meal plan week grid, slots with `is_skip = true` in config appear greyed out by default for new/unedited weeks
5. A slot marked "don't plan" in config can still be overridden for a specific week (Epic 10, Story 10.2 — not implemented here, but grid must not hard-block)
6. No new migration needed — `is_skip` column already exists from Story 9.1
7. Toggling "don't plan" off restores the slot to plannable with its configured participants

## Tasks / Subtasks

- [x] Task 1: Add "don't plan" toggle to config screen (AC: #1, #2, #3)
  - [x] Added eye/eye-off icon button per row for skip toggle
  - [x] When toggled on: calls `upsertConfig` with `isSkip = true`, row greys out, shows "Saltar"
  - [x] When toggled off: calls `upsertConfig` with `isSkip = false`, restores participant display
  - [x] Profile picker blocked for skipped slots (early return in `openPicker`)
- [x] Task 2: Apply config skip to meal plan grid (AC: #4)
  - [x] Added `isSlotSkippedByConfig` helper checking `slotConfigs`
  - [x] Grid cells with config `isSkip = true` and no entry render as greyed/skipped (dash, not tappable)
  - [x] Distinguishes entry-level skip (`isSlotSkipped`) from config-level skip
- [x] Task 3: Verify toggle restore (AC: #7)
  - [x] Toggling off restores slot to plannable in config screen (shows participants) and grid (shows "+" tappable)

## Dev Notes

### Story 9.1 Learnings

- Config screen at `src/app/(app)/(settings)/meal-plan-config.tsx` — lists slots by lunch/dinner sections with day rows
- `upsertConfig` already accepts `isSkip` parameter — just need to pass `true`/`false`
- `slotConfigs` already loaded in meal plan screen (`src/app/(app)/(meal-plan)/index.tsx`)
- Code review fix: `getDefaultParticipants` now checks config existence (not array length)

### Implementation Approach

**Config screen changes:**
Add a "Saltar" switch or icon button to each slot row. When active:
- Row appears greyed out
- Participant text shows "Saltar" in italic
- Tapping the row toggles skip instead of opening the picker

Pattern — use a small icon button on the right side of each row:
```tsx
<TouchableOpacity onPress={() => toggleSkip(day, slot)}>
  <Icon source={isSkip ? 'eye-off' : 'eye'} size={20} color={isSkip ? '#BBB' : '#888'} />
</TouchableOpacity>
```

Or use the existing row tap behavior: if skipped, tapping the row toggles skip off. If not skipped, tapping opens the picker.

**Grid changes:**
In the meal plan screen's grid rendering, before checking for an entry, check if the config says `isSkip`:
```typescript
function isSlotSkippedByConfig(dayOfWeek: number, mealSlot: MealSlot): boolean {
  const config = slotConfigs.find((c) => c.dayOfWeek === dayOfWeek && c.mealSlot === mealSlot);
  return config?.isSkip ?? false;
}
```

Then in the cell render: if `isSlotSkippedByConfig` and no entry exists, render as skipped (grey, dash, not tappable).

### What NOT to Do

- **DO NOT** create a new migration — `is_skip` already exists
- **DO NOT** implement per-week slot overrides — that's Epic 10 (Stories 10.2, 10.3)
- **DO NOT** add PowerSync

### Project Structure Notes

| File | Path | Action |
|------|------|--------|
| Config screen | `src/app/(app)/(settings)/meal-plan-config.tsx` | Modify (add skip toggle) |
| Meal plan screen | `src/app/(app)/(meal-plan)/index.tsx` | Modify (respect config skip in grid) |

No new files.

### References

- [Source: _bmad-output/planning-artifacts/prd.md#Meal Plan Management (V3) — FR82]
- [Source: _bmad-output/planning-artifacts/epics-v3-meal-plan.md#Epic 9, Story 9.2]
- [Previous: _bmad-output/implementation-artifacts/9-1-configure-default-participants.md — learnings]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

- TypeScript compilation: zero errors

### Completion Notes List

- Config screen: split each row into tappable content area (opens picker) + skip toggle icon (eye/eye-off)
- Skip toggle calls `upsertConfig` with flipped `isSkip`, preserving existing participants
- Skipped rows show "Saltar" in italic, greyed background, picker disabled
- `toggleSkip` preserves participants when toggling — toggling off restores previous profile selection
- Grid: new `isSlotSkippedByConfig` helper checks config for skip flag
- Grid distinguishes `skippedByEntry` (entry-level, from Epic 10) vs `skippedByConfig` (config-level default)
- Both skip types render identically (greyed, dash, not tappable) — consistent UX
- No migration needed — `is_skip` column existed from Story 9.1

### Change Log

- 2026-04-01: Story 9.2 implemented — all 3 tasks complete

### File List

**Modified files:**
- `src/app/(app)/(settings)/meal-plan-config.tsx` (skip toggle, row layout split, styles)
- `src/app/(app)/(meal-plan)/index.tsx` (isSlotSkippedByConfig, dual skip logic in grid)
