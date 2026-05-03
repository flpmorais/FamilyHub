# Story 21.1: Generate and Review Ingredient List

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an admin,
I want to generate a consolidated ingredient list from the week's meal plan,
so that I know exactly what I need to buy for the week's cooking.

## Acceptance Criteria

1. When the admin is viewing the meal plan for a week, a "Gerar Lista de Compras" button is visible (FR141)
2. When the admin taps "Gerar Lista de Compras", the system scans all linked recipes for the week, scales each recipe's ingredients to the specified servings for that meal slot, and sums quantities for the same ingredient across multiple recipes (case-insensitive exact name match) (FR141, FR142)
3. The generation completes within 3 seconds (NFR35)
4. The review screen displays each ingredient with its total quantity and a checkbox (unchecked by default) (FR143)
5. Free-text meal entries (meals without linked recipes) are excluded — only linked recipes contribute ingredients (FR146)
6. When no recipes are linked to any slot in the week, the admin is informed that there are no linked recipes to generate from (FR141)
7. The review screen is a new route `(recipes)/shopping-list-review` that receives the generated ingredient list

## Tasks / Subtasks

- [x] Task 1: Create shopping list generator service (AC: #2, #3, #5)
  - [x] Create `src/services/shopping-list-generator.service.ts`
  - [x] `generateShoppingList(linkedRecipesByEntry: Map<string, { recipeId: string; servingsOverride: number }[]>, recipeDetails: Map<string, RecipeWithDetails>): ShoppingListItem[]`
  - [x] For each linked recipe: scale ingredients using `scaleQuantity()` with the slot's servingsOverride vs recipe's base servings
  - [x] Aggregate: group by ingredient name (case-insensitive exact match), sum numeric quantities
  - [x] Return `ShoppingListItem[]`: `{ ingredientName: string; totalQuantity: string | null; checked: boolean }`
  - [x] Quantity summing: extract numeric portion from each scaled quantity, sum, reattach common unit suffix. For mixed units or non-numeric quantities, concatenate with " + "
- [x] Task 2: Create generated shopping list item type (AC: #4)
  - [x] Add to `src/types/recipe.types.ts`:
    - `GeneratedShoppingItem`: `{ ingredientName: string; totalQuantity: string | null; checked: boolean }`
- [x] Task 3: Add "Gerar Lista de Compras" button to meal plan screen (AC: #1, #6)
  - [x] In `src/app/(app)/(meal-plan)/index.tsx`, add button below the week navigation or as a secondary FAB
  - [x] On press: check if any entries have linked recipes (`linkedRecipesMap` is non-empty)
  - [x] If no linked recipes: show Snackbar "Não existem receitas associadas para gerar a lista"
  - [x] If linked recipes exist: load full recipe details for all linked recipeIds, run generator, navigate to review screen
- [x] Task 4: Create shopping list review screen (AC: #4, #7)
  - [x] Create `src/app/(app)/(recipes)/shopping-list-review.tsx`
  - [x] Receives generated items as JSON route param
  - [x] Displays each item as a row: checkbox + ingredient name + total quantity
  - [x] All checkboxes unchecked by default
  - [x] "Select All" / "Deselect All" toggle at top
  - [x] "Adicionar à Lista de Compras" button at bottom (disabled until at least 1 item checked) — this will be implemented in Story 21.2
  - [x] For now, the button shows a placeholder message "Funcionalidade em breve" (to be wired in 21.2)

## Dev Notes

### Shopping List Generator Logic

The generator is a pure client-side aggregation function:

```typescript
// 1. For each meal entry with linked recipes:
//    - Get the recipe's full ingredient list
//    - Scale each ingredient: scaleQuantity(qty, recipe.servings, link.servingsOverride)
// 2. Aggregate by ingredient name (case-insensitive):
//    - Same ingredient in multiple recipes → sum numeric quantities
// 3. Return flat list of { ingredientName, totalQuantity, checked: false }
```

**Quantity summing strategy:**
```typescript
// Extract numeric: "600g" → { num: 600, suffix: "g" }
// Sum matching suffixes: 600g + 300g = 900g
// Mixed suffixes: "600g" + "2 colheres" → "600g + 2 colheres"
// Non-numeric: "q.b." + "q.b." → "q.b." (deduplicate, don't sum)
```

### Data Flow

```
Meal Plan Screen
  → "Gerar Lista de Compras" button
  → Load full RecipeWithDetails for each unique recipeId linked in the week
  → Call generateShoppingList() with linked recipe data + recipe details
  → Navigate to shopping-list-review with generated items as JSON param
  → Review screen displays checkboxes
  → (Story 21.2) "Adicionar" merges into shopping list
```

### Loading Recipe Details

The meal plan screen already has `linkedRecipesMap` with recipeIds. To get full ingredient data:

```typescript
const uniqueRecipeIds = new Set<string>();
for (const links of linkedRecipesMap.values()) {
  for (const link of links) uniqueRecipeIds.add(link.recipeId);
}

const recipeDetails = new Map<string, RecipeWithDetails>();
await Promise.all(
  [...uniqueRecipeIds].map(async (recipeId) => {
    const recipe = await recipeRepo.getById(recipeId);
    if (recipe) recipeDetails.set(recipeId, recipe);
  }),
);
```

### Review Screen Layout

```
┌─ Lista de Compras Gerada ──────────────────────┐
│ [✓ Selecionar Todos]                             │
│                                                  │
│ [ ] Batatas         900g                         │
│ [ ] Ovos            9                            │
│ [ ] Azeite          q.b.                         │
│ [ ] Cebola          3                            │
│ [ ] Alho            4 dentes                     │
│ ...                                              │
│                                                  │
│ [Adicionar à Lista de Compras (0 selecionados)]  │
└──────────────────────────────────────────────────┘
```

### Error Messages (Portuguese)

- No linked recipes: "Não existem receitas associadas para gerar a lista"
- Generating: "A gerar lista de compras..."
- Generation failed: "Erro ao gerar a lista de compras"

### Architecture Compliance

- **Pure service function**: `generateShoppingList()` in `shopping-list-generator.service.ts` — no side effects
- **Reuses scaling**: Uses `scaleQuantity()` from `recipe-scaling.service.ts`
- **Client-side only**: No new Supabase queries beyond loading recipe details
- **<3s generation**: Guaranteed at family scale — pure client-side aggregation

### Previous Story Intelligence

- `linkedRecipesMap` in meal plan screen from Story 20.1 — contains recipeId and servingsOverride per meal entry
- `scaleQuantity()` from Story 19.2 — handles numeric scaling with suffix preservation
- `recipeRepo.getById()` returns `RecipeWithDetails` with ingredients

### Project Structure Notes

New files:
```
src/services/shopping-list-generator.service.ts
src/app/(app)/(recipes)/shopping-list-review.tsx
```

Files to modify:
```
src/types/recipe.types.ts                  (add GeneratedShoppingItem)
src/app/(app)/(meal-plan)/index.tsx        (add "Gerar Lista de Compras" button)
```

### Codebase Patterns to Follow

| Pattern | Reference File |
|---------|---------------|
| Scaling service | `src/services/recipe-scaling.service.ts` |
| Meal plan screen | `src/app/(app)/(meal-plan)/index.tsx` |
| Recipe repository | `src/repositories/supabase/recipe.repository.ts` |
| Route params (JSON) | `src/app/(app)/(recipes)/import-review.tsx` |

### References

- [Source: _bmad-output/planning-artifacts/epics-v5-recipes.md — Epic 5, Story 5.1]
- [Source: _bmad-output/planning-artifacts/prd.md — FR141, FR142, FR143, FR146, NFR35]
- [Source: _bmad-output/planning-artifacts/architecture.md — Shopping list generation pipeline]
- [Source: _bmad-output/implementation-artifacts/20-1-link-recipes-to-meal-plan-slots.md — linkedRecipesMap]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

No issues encountered during implementation.

### Completion Notes List

- Task 1: Created `shopping-list-generator.service.ts` — pure function that scales each linked recipe's ingredients, aggregates by name (case-insensitive), sums numeric quantities with matching suffixes, concatenates mixed/non-numeric. Sorted alphabetically.
- Task 2: Added `GeneratedShoppingItem` type to `recipe.types.ts`.
- Task 3: Added "Gerar Lista de Compras" cart-plus icon button to meal plan week navigation bar. On press: checks linkedRecipesMap, loads recipe details for all linked recipeIds, runs generator, navigates to review screen with JSON params. Shows Snackbar on empty/error.
- Task 4: Created `shopping-list-review.tsx` — review screen with checkbox rows, select all/deselect all toggle, item count, and "Adicionar à Lista de Compras" button (placeholder for Story 21.2).

### Change Log

- 2026-04-06: Story 21.1 implementation complete — 4 tasks (generator service, types, meal plan button, review screen)

### File List

New files:
- src/services/shopping-list-generator.service.ts
- src/app/(app)/(recipes)/shopping-list-review.tsx

Modified files:
- src/types/recipe.types.ts (added GeneratedShoppingItem)
- src/app/(app)/(meal-plan)/index.tsx (added generate button, recipeRepo, generateShoppingList integration)
