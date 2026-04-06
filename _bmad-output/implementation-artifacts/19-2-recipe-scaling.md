# Story 19.2: Recipe Scaling

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an admin,
I want to adjust a recipe's servings and see all ingredients scale proportionally,
so that I can cook for more or fewer people without doing mental math.

## Acceptance Criteria

1. When the admin is viewing a recipe detail screen, a servings adjuster (+/- buttons) is displayed next to the servings count (FR134)
2. When the admin adjusts servings (e.g., from 4 to 6), all ingredient quantities recalculate proportionally (e.g., "600g" → "900g", "6" → "9") and display inline (FR134)
3. When an ingredient has a non-numeric quantity (e.g., "q.b.", "a pinch", "a gosto"), the quantity is displayed unchanged when scaled (FR134)
4. When the admin navigates away and returns, the original servings and quantities are shown — scaling is view-time only, non-destructive (FR135)
5. A pure `scaleQuantity()` function exists in a service file for unit-testable scaling logic
6. The scaling UI shows the scaled quantity replacing the original, with the original servings visible for reference

## Tasks / Subtasks

- [x] Task 1: Create recipe scaling service (AC: #2, #3, #5)
  - [x] Create `src/services/recipe-scaling.service.ts`
  - [x] `scaleQuantity(originalQty: string | null, originalServings: number, targetServings: number): string | null`
  - [x] Extract numeric portion via regex `/^(\d+\.?\d*)/`
  - [x] If numeric found: scale by `(targetServings / originalServings)`, round to 1 decimal, reattach non-numeric suffix (e.g., "600g" → extract 600, scale, reattach "g")
  - [x] If no numeric portion (e.g., "q.b.", "a gosto"): return original unchanged
  - [x] If `originalQty` is null: return null
  - [x] If `originalServings === targetServings`: return original unchanged (no scaling needed)
- [x] Task 2: Create servings scaler component (AC: #1, #6)
  - [x] Create `src/components/recipes/servings-scaler.tsx`
  - [x] Props: `originalServings: number`, `targetServings: number`, `onChangeServings: (servings: number) => void`
  - [x] Displays: "−" button, current target servings, "+" button
  - [x] Minimum servings: 1
  - [x] Shows "de X porções" label when scaled (X = original), hidden when not scaled
- [x] Task 3: Integrate scaling into recipe detail screen (AC: #1, #2, #3, #4, #6)
  - [x] In `[recipeId]/index.tsx`, add `targetServings` state initialized to `recipe.servings`
  - [x] Replace static servings display with `ServingsScaler` component
  - [x] In ingredients section, display `scaleQuantity(ing.quantity, recipe.servings, targetServings)` instead of raw `ing.quantity`
  - [x] Reset `targetServings` to `recipe.servings` when recipe data reloads (useFocusEffect ensures non-destructive behavior)

## Dev Notes

### Scaling Service Logic

```typescript
const NUMERIC_REGEX = /^(\d+\.?\d*)\s*/;

export function scaleQuantity(
  originalQty: string | null,
  originalServings: number,
  targetServings: number,
): string | null {
  if (originalQty == null) return null;
  if (originalServings === targetServings) return originalQty;
  if (originalServings <= 0) return originalQty;

  const match = originalQty.match(NUMERIC_REGEX);
  if (!match) return originalQty; // non-numeric ("q.b.", "a gosto")

  const numericValue = parseFloat(match[1]);
  const scaled = (numericValue * targetServings) / originalServings;
  const rounded = Math.round(scaled * 10) / 10; // 1 decimal place
  const suffix = originalQty.slice(match[0].length); // "g", "ml", "kg", etc.

  // Remove trailing .0 for whole numbers
  const display = rounded % 1 === 0 ? String(Math.round(rounded)) : String(rounded);

  return display + suffix;
}
```

**Examples:**
- `scaleQuantity("600g", 4, 6)` → `"900g"`
- `scaleQuantity("6", 4, 6)` → `"9"`
- `scaleQuantity("1.5 dl", 4, 8)` → `"3 dl"`
- `scaleQuantity("q.b.", 4, 6)` → `"q.b."` (unchanged)
- `scaleQuantity("a gosto", 4, 6)` → `"a gosto"` (unchanged)
- `scaleQuantity(null, 4, 6)` → `null`

### Servings Scaler Component

```typescript
<View style={s.scalerRow}>
  <TouchableOpacity onPress={() => onChangeServings(Math.max(1, targetServings - 1))}>
    <View style={s.scalerBtn}><Text style={s.scalerBtnText}>−</Text></View>
  </TouchableOpacity>
  <Text style={s.scalerValue}>{targetServings}</Text>
  <TouchableOpacity onPress={() => onChangeServings(targetServings + 1)}>
    <View style={s.scalerBtn}><Text style={s.scalerBtnText}>+</Text></View>
  </TouchableOpacity>
</View>
{targetServings !== originalServings && (
  <Text style={s.scalerNote}>de {originalServings} porções</Text>
)}
```

### Integration in Detail Screen

Replace the static servings meta item:
```typescript
// Before (static)
<Text style={s.metaLabel}>Porções</Text>
<Text style={s.metaValue}>{recipe.servings}</Text>

// After (interactive)
<ServingsScaler
  originalServings={recipe.servings}
  targetServings={targetServings}
  onChangeServings={setTargetServings}
/>
```

Replace ingredient quantity display:
```typescript
// Before
<Text style={s.ingredientQty}>{ing.quantity}</Text>

// After
<Text style={s.ingredientQty}>
  {scaleQuantity(ing.quantity, recipe.servings, targetServings)}
</Text>
```

### Non-Destructive Reset

`targetServings` state resets to `recipe.servings` via `useEffect` when `recipe` changes (which happens on `useFocusEffect` reload). No explicit reset needed.

### Architecture Compliance

- **Pure service function**: `scaleQuantity()` is a pure function in `recipe-scaling.service.ts` — no side effects, easily testable
- **View-time only**: Scaling state lives in React local state, never persisted to Supabase
- **No new dependencies**: Uses only React Native built-in components

### Previous Story Intelligence

- Detail screen at `[recipeId]/index.tsx` has meta row with servings, ingredients section, useFocusEffect, Realtime subscription
- Ingredients displayed as `ing.quantity` in the ingredients section

### Project Structure Notes

New files:
```
src/services/recipe-scaling.service.ts
src/components/recipes/servings-scaler.tsx
```

Files to modify:
```
src/app/(app)/(recipes)/[recipeId]/index.tsx  (add scaling state, ServingsScaler component, scaled quantities)
```

### Codebase Patterns to Follow

| Pattern | Reference File |
|---------|---------------|
| Recipe detail screen | `src/app/(app)/(recipes)/[recipeId]/index.tsx` |
| Recipe types | `src/types/recipe.types.ts` |

### References

- [Source: _bmad-output/planning-artifacts/epics-v5-recipes.md — Epic 3, Story 3.2]
- [Source: _bmad-output/planning-artifacts/prd.md — FR134, FR135]
- [Source: _bmad-output/planning-artifacts/architecture.md — recipe scaling regex, non-destructive]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

No issues encountered during implementation.

### Completion Notes List

- Task 1: Created `recipe-scaling.service.ts` with pure `scaleQuantity()` function — regex extracts leading numeric portion, scales proportionally, rounds to 1 decimal, reattaches suffix. Non-numeric quantities (q.b., a gosto) returned unchanged. Null-safe.
- Task 2: Created `servings-scaler.tsx` component — +/- buttons around servings count, minimum 1, shows "de X porções" reference label when scaled.
- Task 3: Integrated into detail screen — `targetServings` state initialized from `recipe.servings`, resets on data reload (useFocusEffect + Realtime UPDATE). Static servings display replaced with `ServingsScaler`. Ingredient quantities passed through `scaleQuantity()`.

### Change Log

- 2026-04-06: Story 19.2 implementation complete — 3 tasks (scaling service, servings scaler component, detail screen integration)

### File List

New files:
- src/services/recipe-scaling.service.ts
- src/components/recipes/servings-scaler.tsx

Modified files:
- src/app/(app)/(recipes)/[recipeId]/index.tsx (added scaling state, ServingsScaler component, scaled ingredient quantities, reset on reload)
