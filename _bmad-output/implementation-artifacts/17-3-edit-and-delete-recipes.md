# Story 17.3: Edit and Delete Recipes

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an admin,
I want to edit any recipe's fields and delete recipes I no longer want,
so that I can keep my collection accurate and up to date.

## Acceptance Criteria

1. When the admin is viewing a recipe detail screen, "Editar" and "Eliminar" buttons are visible (FR117, FR118)
2. When the admin taps "Editar", the edit form loads pre-populated with all current recipe data: name, type, ingredients (with quantities and order), steps (with order), servings, prep time, cook time, cost, image, categories, tags (FR117)
3. When the admin modifies any fields and taps "Save", the recipe is updated in Supabase (including any added/removed/reordered ingredients, steps, and category/tag assignments) and the detail screen reflects the changes immediately (FR117)
4. When the admin taps "Eliminar" on the detail screen and confirms the deletion dialog, the recipe and all related data (steps, ingredients, category/tag assignments) are deleted via CASCADE, and the admin is navigated back to the recipe list (FR118)
5. When the admin attempts to delete a recipe that is linked to a meal plan slot (future Epic 20), the system blocks deletion and informs the admin — but until `meal_slot_recipes` table exists, deletion always succeeds (FR118)
6. The edit screen route is `(recipes)/[recipeId]/edit.tsx`
7. The edit form reuses the same UI pattern as `new.tsx` (same field layout, ingredient/step dynamic rows, category/tag pickers, image picker) but pre-populated with existing data

## Tasks / Subtasks

- [x] Task 1: Create edit screen route (AC: #6)
  - [x] Create `src/app/(app)/(recipes)/[recipeId]/edit.tsx`
  - [x] Receive `recipeId` from `useLocalSearchParams`
  - [x] Load recipe via `recipeRepo.getById(recipeId)` on mount
  - [x] Show loading state while fetching
  - [x] Show error state if recipe not found
- [x] Task 2: Pre-populate edit form (AC: #2, #7)
  - [x] Initialize all form fields from loaded `RecipeWithDetails`:
    - `name` from `recipe.name`
    - `type` from `recipe.type`
    - `servings` from `String(recipe.servings)`
    - `prepTime` from `recipe.prepTimeMinutes ? String(recipe.prepTimeMinutes) : ''`
    - `cookTime` from `recipe.cookTimeMinutes ? String(recipe.cookTimeMinutes) : ''`
    - `cost` from `recipe.cost ?? ''`
    - `imageUri` from `recipe.imageUrl`
    - `ingredients` from `recipe.ingredients.map(i => ({ name: i.ingredientName, quantity: i.quantity ?? '' }))`
    - `steps` from `recipe.steps.map(s => ({ text: s.stepText }))`
    - `selectedCategoryIds` from `recipe.categories.map(c => c.id)`
    - `selectedTagIds` from `recipe.tags.map(t => t.id)`
  - [x] Load all available categories and tags for the pickers (same as `new.tsx`)
  - [x] Reuse same form layout, field components, ingredient/step dynamic rows, category/tag chip pickers, and image picker as `new.tsx`
- [x] Task 3: Implement save (update) logic (AC: #3)
  - [x] Same validation as `new.tsx`: name required, at least 1 ingredient, at least 1 step
  - [x] Call `recipeRepo.update(recipeId, input)` with all fields
  - [x] On success, navigate back to detail screen (which will reload via `useEffect`)
  - [x] On error, show Snackbar with Portuguese error message
  - [x] Include `categoryIds` and `tagIds` in update input
- [x] Task 4: Add Edit and Delete buttons to detail screen (AC: #1)
  - [x] Add floating "Editar" button next to the back button on the detail screen
  - [x] Add "Eliminar" button at the bottom of the detail screen content
  - [x] "Editar" navigates to `/(app)/(recipes)/${recipeId}/edit`
- [x] Task 5: Implement delete with confirmation (AC: #4, #5)
  - [x] "Eliminar" button shows `Alert.alert` confirmation dialog
  - [x] On confirm: call `recipeRepo.delete(recipeId)`
  - [x] On success: navigate back to recipe list via `router.back()` (or `router.replace`)
  - [x] On error: if error message contains "RESTRICT" or "violates foreign key", show "Esta receita está associada a uma ementa semanal. Remova a associação primeiro."
  - [x] Otherwise show generic error: "Não foi possível eliminar a receita"
- [x] Task 6: Reload detail after edit (AC: #3)
  - [x] Convert detail screen to use `useFocusEffect` instead of `useEffect` so data reloads when navigating back from edit screen

## Dev Notes

### Edit Screen Architecture

The edit screen (`[recipeId]/edit.tsx`) is structurally identical to `new.tsx` with these differences:
1. Loads existing recipe on mount and pre-populates all fields
2. Calls `recipeRepo.update()` instead of `recipeRepo.create()`
3. Header says "Editar Receita" instead of "Nova Receita"
4. Save button says "Guardar Alterações" instead of "Guardar Receita"

**Do NOT refactor new.tsx and edit.tsx into a shared component.** Keep them as separate files with duplicated form code. This is intentional — the forms may diverge in future stories (e.g., import fields only on new, linked meal plan warnings only on edit). The duplication is manageable and avoids premature abstraction.

### Pre-population Pattern

```typescript
// After loading recipe
useEffect(() => {
  if (!recipe) return;
  setName(recipe.name);
  setType(recipe.type);
  setServings(String(recipe.servings));
  setPrepTime(recipe.prepTimeMinutes != null ? String(recipe.prepTimeMinutes) : '');
  setCookTime(recipe.cookTimeMinutes != null ? String(recipe.cookTimeMinutes) : '');
  setCost(recipe.cost ?? '');
  setImageUri(recipe.imageUrl);
  setIngredients(
    recipe.ingredients.map((i) => ({ name: i.ingredientName, quantity: i.quantity ?? '' })),
  );
  setSteps(recipe.steps.map((s) => ({ text: s.stepText })));
  setSelectedCategoryIds(recipe.categories.map((c) => c.id));
  setSelectedTagIds(recipe.tags.map((t) => t.id));
}, [recipe]);
```

### Update Call Pattern

```typescript
await recipeRepo.update(recipeId, {
  name: trimmedName,
  type,
  servings: parseInt(servings, 10) || DEFAULT_SERVINGS,
  prepTimeMinutes: prepTime ? parseInt(prepTime, 10) : undefined,
  cookTimeMinutes: cookTime ? parseInt(cookTime, 10) : undefined,
  cost: cost.trim() || undefined,
  imageUrl: imageUri ?? undefined,
  ingredients: validIngredients.map((ing, i) => ({
    ingredientName: ing.name.trim(),
    quantity: ing.quantity.trim() || undefined,
    sortOrder: i,
  })),
  steps: validSteps.map((step, i) => ({
    stepNumber: i + 1,
    stepText: step.text.trim(),
  })),
  categoryIds: selectedCategoryIds,
  tagIds: selectedTagIds,
});
```

### Delete with RESTRICT Handling

```typescript
async function handleDelete() {
  Alert.alert(
    'Eliminar receita',
    `Tem a certeza que quer eliminar "${recipe.name}"? Esta acção não pode ser desfeita.`,
    [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            await recipeRepo.delete(recipeId);
            router.back();
          } catch (err) {
            const msg = err instanceof Error ? err.message : '';
            if (msg.includes('RESTRICT') || msg.includes('violates foreign key')) {
              showError('Esta receita está associada a uma ementa semanal. Remova a associação primeiro.');
            } else {
              showError('Não foi possível eliminar a receita');
            }
          }
        },
      },
    ],
  );
}
```

**Note:** The `meal_slot_recipes` table with `ON DELETE RESTRICT` doesn't exist yet (Epic 20). Until then, deletion always succeeds. The RESTRICT handling is defensive code for forward compatibility.

### Detail Screen Buttons

Add "Editar" as a floating pill button next to the back button (top-right), following the `PageHeader` pattern:

```typescript
{/* Floating buttons */}
<TouchableOpacity style={s.floatingBack} onPress={() => router.back()}>
  <Text style={s.floatingBackText}>← Voltar</Text>
</TouchableOpacity>
<TouchableOpacity
  style={s.floatingEdit}
  onPress={() => router.push(`/(app)/(recipes)/${recipeId}/edit` as any)}
>
  <Text style={s.floatingEditText}>Editar ✎</Text>
</TouchableOpacity>
```

Add "Eliminar" as a red text button at the very bottom of the scrollable content.

### Detail Screen Reload

Change `useEffect` to `useFocusEffect` so the detail reloads when returning from the edit screen:

```typescript
import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';

useFocusEffect(
  useCallback(() => {
    if (!recipeId) return;
    setIsLoading(true);
    recipeRepo.getById(recipeId).then((data) => {
      if (!data) setError('Receita não encontrada');
      else setRecipe(data);
    }).catch((err) => {
      logger.error('RecipeDetailScreen', 'load failed', err);
      setError('Não foi possível carregar a receita');
    }).finally(() => setIsLoading(false));
  }, [recipeId, recipeRepo]),
);
```

### Error Messages (Portuguese)

- Delete confirmation title: "Eliminar receita"
- Delete confirmation body: "Tem a certeza que quer eliminar \"{name}\"? Esta acção não pode ser desfeita."
- Delete blocked (RESTRICT): "Esta receita está associada a uma ementa semanal. Remova a associação primeiro."
- Delete failed: "Não foi possível eliminar a receita"
- Update failed: "Não foi possível atualizar a receita"

### Architecture Compliance

- **Repository pattern**: Uses existing `recipeRepo.update()` and `recipeRepo.delete()` — no new repository methods needed
- **snake_case/camelCase boundary**: Already handled in `recipe.repository.ts`
- **File naming**: `edit.tsx` in `[recipeId]/` directory (kebab-case route group)
- **Portuguese strings**: All user-facing text in pt-PT
- **Data fetching**: `useFocusEffect` for reload pattern (same as recipe list, shopping)
- **No new dependencies**: Everything needed already exists

### Previous Story Intelligence (17.1, 17.2)

From Story 17.1:
- `new.tsx` form has all field components, ingredient/step dynamic rows, image picker, validation
- `recipe.repository.ts` already has `update()` and `delete()` methods
- Detail screen at `[recipeId]/index.tsx` already displays all recipe data

From Story 17.2:
- `new.tsx` now has category/tag chip pickers with inline creation modals
- `recipe.repository.ts` `update()` already handles `categoryIds` and `tagIds` replacement
- Detail screen already shows category/tag chips

### Project Structure Notes

New files:
```
src/app/(app)/(recipes)/[recipeId]/edit.tsx
```

Files to modify:
```
src/app/(app)/(recipes)/[recipeId]/index.tsx  (add Edit/Delete buttons, switch to useFocusEffect)
```

### What This Story Does NOT Include

- No real-time sync (Story 17.4)
- No recipe import (Epic 18)
- No recipe filtering/search (Epic 19)
- No meal plan integration or RESTRICT enforcement (Epic 20 — defensive code only)

### Codebase Patterns to Follow

| Pattern | Reference File |
|---------|---------------|
| Recipe creation form (copy for edit) | `src/app/(app)/(recipes)/new.tsx` |
| Recipe detail screen (modify) | `src/app/(app)/(recipes)/[recipeId]/index.tsx` |
| Recipe repository (update/delete) | `src/repositories/supabase/recipe.repository.ts` |
| Recipe types | `src/types/recipe.types.ts` |
| useFocusEffect reload | `src/app/(app)/(shopping)/index.tsx` |
| Floating button pattern | `src/components/page-header.tsx` |
| Delete confirmation Alert | `src/app/(app)/(settings)/recipe-categories.tsx` |

### References

- [Source: _bmad-output/planning-artifacts/epics-v5-recipes.md — Epic 1, Story 1.3]
- [Source: _bmad-output/planning-artifacts/prd.md — FR117, FR118]
- [Source: _bmad-output/planning-artifacts/architecture.md — Repository Pattern, ON DELETE CASCADE, ON DELETE RESTRICT]
- [Source: _bmad-output/implementation-artifacts/17-1-create-and-view-recipes-via-manual-entry.md — Previous story]
- [Source: _bmad-output/implementation-artifacts/17-2-recipe-categories-and-tags.md — Previous story]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

No issues encountered during implementation.

### Completion Notes List

- Tasks 1-3: Created `[recipeId]/edit.tsx` — full edit form screen that loads recipe via `getById()`, pre-populates all fields (name, type, servings, times, cost, image, ingredients, steps, categories, tags), validates, and calls `recipeRepo.update()`. Same form layout as `new.tsx` with "Editar Receita" header and "Guardar Alterações" button.
- Task 4: Added floating "Editar ✎" button (top-right) and "Eliminar Receita" button (bottom) to detail screen.
- Task 5: Delete shows `Alert.alert` confirmation, calls `recipeRepo.delete()`, navigates back on success. Defensive RESTRICT handling for future meal plan integration shows Portuguese error message.
- Task 6: Converted detail screen from `useEffect` to `useFocusEffect` so data reloads when returning from edit screen.

### Change Log

- 2026-04-06: Story 17.3 implementation complete — 6 tasks (edit screen, delete with confirmation, detail screen buttons and reload)

### File List

New files:
- src/app/(app)/(recipes)/[recipeId]/edit.tsx

Modified files:
- src/app/(app)/(recipes)/[recipeId]/index.tsx (added Edit/Delete buttons, useFocusEffect, delete confirmation with RESTRICT handling, Snackbar)
