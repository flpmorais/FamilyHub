# Story 8.3: Meal Types & Eating Out/Takeaway Details

Status: review

## Story

As an Admin,
I want to set a meal type (home-cooked, eating out, takeaway) and add details for eating out or takeaway meals,
so that the plan reflects different kinds of meals.

## Acceptance Criteria

1. When creating or editing a meal, the admin can select from meal types: home-cooked, eating out, takeaway
2. The "leftovers" type is visible but disabled in the type selector (enabled in Epic 4)
3. For "eating out" meals, an optional detail field is shown (e.g., restaurant name)
4. For "takeaway" meals, an optional detail field is shown (e.g., order description)
5. For "home-cooked" meals, no detail field is shown — only the meal name
6. The meal type and detail are persisted and displayed in the week grid
7. The week grid shows a visual indicator for eating out and takeaway meals (icon or label)
8. Existing meals created in Story 8.2 (defaulting to home_cooked) continue to work — no migration needed

## Tasks / Subtasks

- [x] Task 1: Update MealAddForm to include meal type and detail (AC: #1, #2, #3, #4, #5)
  - [x] Add meal type selector (chip row) with 4 options: Caseira, Fora, Takeaway, Restos (disabled)
  - [x] Show optional detail TextInput when type is "eating_out" or "takeaway"
  - [x] Default type to "home_cooked" on form open
  - [x] Update `onSave` callback to pass `mealType` and `detail`
- [x] Task 2: Update MealEditForm to include meal type and detail (AC: #1, #2, #3, #4, #5)
  - [x] Pre-fill meal type and detail from existing meal data
  - [x] Show/hide detail field based on selected type
  - [x] Update `onSave` callback to pass `mealType` and `detail`
- [x] Task 3: Update screen handlers to pass meal type and detail (AC: #6)
  - [x] Update `handleAddMeal` to include `mealType` and `detail` in create call
  - [x] Update `handleEditMeal` to include `mealType` and `detail` in update call
- [x] Task 4: Update week grid to show meal type indicators (AC: #7)
  - [x] Show small icon for eating_out (store) and takeaway (food-takeout-box) in grid cell
  - [x] Home-cooked meals show name only (no indicator)
  - [x] Detail text shown below name when present (truncated to 1 line)
- [x] Task 5: Verify backward compatibility (AC: #8)
  - [x] Existing home_cooked meals render correctly — no migration, no schema changes

## Dev Notes

### Story 8.2 Learnings (Previous Story)

- Forms use bottom-sheet Modal pattern with KeyboardAvoidingView
- `onSave` callbacks are async — forms handle isSaving state internally
- Code review found: need to guard against empty profileIds before allowing add (already fixed)
- Repository `create` already accepts optional `mealType` and `detail` fields
- Repository `update` already handles partial updates including `mealType` and `detail`
- No new repository methods needed — only form UI and screen handler changes

### Meal Type Labels (Portuguese)

```typescript
const MEAL_TYPE_LABELS: Record<MealType, string> = {
  home_cooked: 'Caseira',
  eating_out: 'Fora',
  takeaway: 'Takeaway',
  leftovers: 'Restos',
};
```

### Meal Type Selector Pattern

Use `react-native-paper` `SegmentedButtons` or a row of `Chip` components. Check existing usage in the codebase:

```typescript
import { SegmentedButtons } from 'react-native-paper';
// or
import { Chip } from 'react-native-paper';
```

If SegmentedButtons is not available or looks poor with 4 options, use a horizontal chip row:

```tsx
<View style={styles.typeRow}>
  {(['home_cooked', 'eating_out', 'takeaway', 'leftovers'] as MealType[]).map((type) => (
    <Chip
      key={type}
      selected={mealType === type}
      onPress={() => type !== 'leftovers' && setMealType(type)}
      disabled={type === 'leftovers'}
      style={[styles.typeChip, type === 'leftovers' && styles.disabledChip]}
    >
      {MEAL_TYPE_LABELS[type]}
    </Chip>
  ))}
</View>
```

### Detail Field Visibility

```typescript
const showDetail = mealType === 'eating_out' || mealType === 'takeaway';
```

When switching from eating_out/takeaway to home_cooked, clear the detail field.

### Updated Callback Signatures

**MealAddForm:**
```typescript
// Before (Story 8.2):
onSave: (name: string) => Promise<void>;

// After (Story 8.3):
onSave: (name: string, mealType: MealType, detail: string | null) => Promise<void>;
```

**MealEditForm:**
```typescript
// Before (Story 8.2):
onSave: (id: string, name: string) => Promise<void>;

// After (Story 8.3):
onSave: (id: string, name: string, mealType: MealType, detail: string | null) => Promise<void>;
```

### Grid Cell Indicator

For eating_out and takeaway meals, show a small icon below the name:
- eating_out: `silverware-fork-knife` or `store` icon (tiny, 12px)
- takeaway: `bag-carry-on` or `food-takeout-box` icon

```tsx
{entry.mealType === 'eating_out' && <Icon source="store" size={12} color="#888" />}
{entry.mealType === 'takeaway' && <Icon source="food-takeout-box" size={12} color="#888" />}
```

Also show the detail text if present (truncated to 1 line).

### What NOT to Do

- **DO NOT** enable the "leftovers" type — that's Epic 4
- **DO NOT** add new repository methods — create/update already handle mealType and detail
- **DO NOT** create new database migrations — the schema already supports all meal types
- **DO NOT** add PowerSync

### Project Structure Notes

| File | Path | Action |
|------|------|--------|
| Add form | `src/components/meal-plan/meal-add-form.tsx` | Modify (add type selector + detail) |
| Edit form | `src/components/meal-plan/meal-edit-form.tsx` | Modify (add type selector + detail) |
| Week grid screen | `src/app/(app)/(meal-plan)/index.tsx` | Modify (update handlers + grid indicators) |

No new files needed.

### References

- [Source: _bmad-output/planning-artifacts/prd.md#Meal Plan Management (V3) — FR89, FR90]
- [Source: _bmad-output/planning-artifacts/epics-v3-meal-plan.md#Story 8.3]
- [Pattern: src/components/meal-plan/meal-add-form.tsx — current form to modify]
- [Pattern: src/components/meal-plan/meal-edit-form.tsx — current form to modify]
- [Previous: _bmad-output/implementation-artifacts/8-2-create-edit-delete-meals.md — learnings]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

- TypeScript compilation: zero errors

### Completion Notes List

- MealAddForm: added chip-row type selector (Caseira/Fora/Takeaway/Restos-disabled), conditional detail field for eating_out ("Restaurante") and takeaway ("Encomenda"), updated onSave signature to include mealType and detail
- MealEditForm: same type selector and detail field, pre-fills from meal data, clears detail when switching to home_cooked, updated onSave signature
- Screen handlers updated: handleAddMeal and handleEditMeal now pass mealType and detail to repository
- Grid cells: show store icon for eating_out, food-takeout-box icon for takeaway, detail text below name when present
- No new files, no migrations, no schema changes — fully backward compatible
- Used custom TouchableOpacity chips (no SegmentedButtons or Chip from react-native-paper — simpler, consistent with existing style)

### Change Log

- 2026-04-01: Story 8.3 implemented — all 5 tasks complete

### File List

**Modified files:**
- `src/components/meal-plan/meal-add-form.tsx` (type selector, detail field, updated callback)
- `src/components/meal-plan/meal-edit-form.tsx` (type selector, detail field, updated callback)
- `src/app/(app)/(meal-plan)/index.tsx` (updated handlers, grid type indicators)
