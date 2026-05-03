# Story 20.1: Link Recipes to Meal Plan Slots

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an admin,
I want to link recipes to my meal plan slots and set servings for each,
so that I know exactly what I'm cooking and in what quantity for each meal.

## Acceptance Criteria

1. When the admin is viewing/editing a meal plan slot, a "Associar Receita" (Link Recipe) button is available (FR136)
2. When the admin taps "Associar Receita", a recipe browser modal opens showing the recipe collection with type filter tabs and search — they can select a recipe to link (FR136, FR140)
3. When the admin links a recipe, it appears in the slot with its name and type, alongside any free-text name (FR136, FR138)
4. The admin can link multiple recipes to a single slot (e.g., canja as soup + salad as side) (FR136)
5. Each linked recipe has an independent servings override control (default: recipe's base servings) (FR137)
6. The admin can remove a linked recipe from a slot without affecting the recipe itself (FR139)
7. Free-text name on `meal_entries` continues to work as before — a slot can have free text, linked recipes, or both (FR138)
8. The Supabase migration creates `meal_entry_recipes` junction table with RLS, RESTRICT on recipe deletion, UNIQUE constraint, and servings override
9. `IMealPlanRepository` is extended with `linkRecipe`, `unlinkRecipe`, `updateLinkedServings`, and `getLinkedRecipes` methods

## Tasks / Subtasks

- [x] Task 1: Create Supabase migration for junction table (AC: #8)
  - [x] Create `supabase/migrations/20260406300000_meal_entry_recipes.sql`
  - [x] `meal_entry_recipes` table: `id` (uuid PK), `meal_entry_id` (uuid FK → meal_entries ON DELETE CASCADE), `recipe_id` (uuid FK → recipes ON DELETE RESTRICT), `servings_override` (integer NOT NULL), `sort_order` (integer NOT NULL DEFAULT 0)
  - [x] UNIQUE constraint: `(meal_entry_id, recipe_id)` — same recipe not linked twice
  - [x] CHECK constraint: `servings_override > 0`
  - [x] Enable RLS — same family policy pattern as meal_entries
  - [x] Index: `meal_entry_recipes(meal_entry_id)` for joins
  - [x] `created_at`, `updated_at` with trigger
- [x] Task 2: Create types for linked recipes (AC: #5, #9)
  - [x] Add to `src/types/meal-plan.types.ts`:
    - `MealEntryLinkedRecipe` interface: `id`, `mealEntryId`, `recipeId`, `recipeName`, `recipeType`, `servingsOverride`, `sortOrder`
    - `MealEntryWithRecipes` extending `MealEntry` with `linkedRecipes: MealEntryLinkedRecipe[]`
- [x] Task 3: Extend meal plan repository (AC: #9)
  - [x] Add methods to `IMealPlanRepository`:
    - `linkRecipe(mealEntryId: string, recipeId: string, servingsOverride: number): Promise<MealEntryLinkedRecipe>`
    - `unlinkRecipe(linkId: string): Promise<void>`
    - `updateLinkedServings(linkId: string, servings: number): Promise<void>`
    - `getLinkedRecipes(mealEntryId: string): Promise<MealEntryLinkedRecipe[]>`
  - [x] Implement in `SupabaseMealPlanRepository`
  - [x] `linkRecipe()`: insert into `meal_entry_recipes`, set `servings_override` to recipe's default servings
  - [x] `getLinkedRecipes()`: join `meal_entry_recipes` with `recipes` to get name and type
  - [x] `unlinkRecipe()`: delete from `meal_entry_recipes`
  - [x] `updateLinkedServings()`: update `servings_override` on `meal_entry_recipes`
- [x] Task 4: Create recipe browser modal (AC: #2)
  - [x] Create `src/components/meal-plan/recipe-browser-modal.tsx`
  - [x] Modal/bottom sheet overlay
  - [x] Reuses `RecipeTypeFilter` component from Epic 19
  - [x] Shows recipe list with type filter and ingredient search
  - [x] Loads recipes via `recipeRepo.getByFamilyId(familyId)`
  - [x] `onSelect(recipe: Recipe)` callback — returns selected recipe and closes modal
  - [x] Header with "Escolher Receita" title and close button
- [x] Task 5: Create linked recipes section in meal form (AC: #1, #3, #4, #5, #6, #7)
  - [x] Create `src/components/meal-plan/linked-recipes-section.tsx`
  - [x] Props: `mealEntryId: string`, `linkedRecipes: MealEntryLinkedRecipe[]`, `onChanged: () => void`
  - [x] Displays each linked recipe as a card with: recipe name, type badge, servings +/- control, remove button
  - [x] "Associar Receita" button opens recipe browser modal
  - [x] On recipe selected: call `mealPlanRepo.linkRecipe()`, refresh
  - [x] On servings change: call `mealPlanRepo.updateLinkedServings()`
  - [x] On remove: call `mealPlanRepo.unlinkRecipe()`, refresh
- [x] Task 6: Integrate into meal plan edit form (AC: #1, #3, #7)
  - [x] In `meal-edit-form.tsx`, add `LinkedRecipesSection` below existing fields
  - [x] Load linked recipes when meal entry is opened for editing
  - [x] Linked recipes section is only visible for `home_cooked` meal type (linking recipes to eating_out/takeaway/leftovers doesn't make sense)
  - [x] Free-text name field continues to work alongside linked recipes
- [x] Task 7: Display linked recipes in meal plan grid (AC: #3)
  - [x] In the meal plan grid/card view, show linked recipe names below the meal name
  - [x] Each linked recipe shows as a small chip with recipe name and type

## Dev Notes

### Important: Table Name Correction

The architecture doc references `meal_slots` but the actual V3 table is **`meal_entries`**. The junction table should be named `meal_entry_recipes` (not `meal_slot_recipes`) to match the actual schema.

### Database Schema

```sql
CREATE TABLE meal_entry_recipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_entry_id uuid NOT NULL REFERENCES meal_entries(id) ON DELETE CASCADE,
  recipe_id uuid NOT NULL REFERENCES recipes(id) ON DELETE RESTRICT,
  servings_override integer NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_meal_entry_recipe UNIQUE (meal_entry_id, recipe_id),
  CONSTRAINT chk_servings_positive CHECK (servings_override > 0)
);
```

**ON DELETE RESTRICT** on `recipe_id` — prevents deleting a recipe that's linked to a meal plan. This is the enforcement mechanism for Story 17.3's defensive RESTRICT handling.

### MealEntryLinkedRecipe Type

```typescript
export interface MealEntryLinkedRecipe {
  id: string;
  mealEntryId: string;
  recipeId: string;
  recipeName: string;
  recipeType: RecipeType;
  servingsOverride: number;
  sortOrder: number;
}
```

### Repository Join Pattern

```typescript
async getLinkedRecipes(mealEntryId: string): Promise<MealEntryLinkedRecipe[]> {
  const { data, error } = await this.client
    .from('meal_entry_recipes')
    .select('id, meal_entry_id, recipe_id, servings_override, sort_order, recipes(name, type)')
    .eq('meal_entry_id', mealEntryId)
    .order('sort_order', { ascending: true });

  return (data ?? []).map((row: any) => ({
    id: row.id,
    mealEntryId: row.meal_entry_id,
    recipeId: row.recipe_id,
    recipeName: row.recipes?.name ?? '',
    recipeType: row.recipes?.type ?? 'other',
    servingsOverride: row.servings_override,
    sortOrder: row.sort_order,
  }));
}
```

### Recipe Browser Modal

Reuses `RecipeTypeFilter` from Story 19.1. Simplified version of the recipe list — shows recipes as selectable rows without category/tag filtering (keep it simple for meal plan context).

### Linked Recipes Section in Edit Form

```
┌─ Receitas Associadas ──────────────────────────┐
│ 🥣 Canja de Galinha  [4 porções]  [-][+]  [✕]  │
│ 🥗 Salada Verde      [4 porções]  [-][+]  [✕]  │
│                                                  │
│ [+ Associar Receita]                             │
└──────────────────────────────────────────────────┘
```

### Error Messages (Portuguese)

- Link failed: "Não foi possível associar a receita"
- Unlink failed: "Não foi possível remover a associação"
- Update servings failed: "Não foi possível atualizar as porções"
- Already linked: "Esta receita já está associada a esta refeição"
- Choose recipe: "Escolher Receita"
- Link recipe button: "Associar Receita"

### Architecture Compliance

- **Repository pattern**: New methods on `IMealPlanRepository` — no direct Supabase calls in components
- **ON DELETE RESTRICT**: Enforces recipe deletion protection at DB level
- **V3 backward compatibility**: Existing free-text `name` field on `meal_entries` continues to work. Linked recipes are additive — not a replacement.

### Previous Story Intelligence

- Meal plan edit form at `src/components/meal-plan/meal-edit-form.tsx` — add linked recipes section here
- Meal plan grid at `src/app/(app)/(meal-plan)/index.tsx` — show linked recipe names
- `RecipeTypeFilter` component from Story 19.1 — reuse in recipe browser modal
- Recipe RESTRICT handling in Story 17.3 detail screen — now enforced by `meal_entry_recipes` FK

### Project Structure Notes

New files:
```
supabase/migrations/20260406300000_meal_entry_recipes.sql
src/components/meal-plan/recipe-browser-modal.tsx
src/components/meal-plan/linked-recipes-section.tsx
```

Files to modify:
```
src/types/meal-plan.types.ts                              (add MealEntryLinkedRecipe, MealEntryWithRecipes)
src/repositories/interfaces/meal-plan.repository.interface.ts  (add link/unlink/updateServings/getLinkedRecipes)
src/repositories/supabase/meal-plan.repository.ts         (implement new methods)
src/components/meal-plan/meal-edit-form.tsx                (add LinkedRecipesSection)
src/app/(app)/(meal-plan)/index.tsx                       (show linked recipe names in grid)
```

### Codebase Patterns to Follow

| Pattern | Reference File |
|---------|---------------|
| Meal plan repository | `src/repositories/supabase/meal-plan.repository.ts` |
| Meal plan types | `src/types/meal-plan.types.ts` |
| Meal edit form | `src/components/meal-plan/meal-edit-form.tsx` |
| Recipe type filter | `src/components/recipes/recipe-type-filter.tsx` |
| Recipe list query | `src/repositories/supabase/recipe.repository.ts` |

### References

- [Source: _bmad-output/planning-artifacts/epics-v5-recipes.md — Epic 4, Story 4.1]
- [Source: _bmad-output/planning-artifacts/prd.md — FR136, FR137, FR138, FR139, FR140]
- [Source: _bmad-output/planning-artifacts/architecture.md — meal_slot_recipes junction, ON DELETE RESTRICT]
- [Source: supabase/migrations/20260402000000_meal_plan_module.sql — V3 meal_entries schema]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

No issues encountered during implementation.

### Completion Notes List

- Task 1: Created migration `20260406300000_meal_entry_recipes.sql` — junction table with ON DELETE CASCADE on meal_entry, ON DELETE RESTRICT on recipe, UNIQUE constraint, CHECK servings > 0, RLS, updated_at trigger, index.
- Task 2: Added `MealEntryLinkedRecipe` interface to `meal-plan.types.ts` with recipeId, recipeName, recipeType, servingsOverride, sortOrder.
- Task 3: Extended `IMealPlanRepository` with `linkRecipe`, `unlinkRecipe`, `updateLinkedServings`, `getLinkedRecipes`. Implemented all 4 methods in `SupabaseMealPlanRepository` with Supabase joins to get recipe name/type.
- Task 4: Created `recipe-browser-modal.tsx` — bottom sheet modal with search, type filter tabs, selectable recipe list. Loads recipes on open, returns selected recipe via callback.
- Task 5: Created `linked-recipes-section.tsx` — displays linked recipe cards with type badge, servings +/- control, remove button, and "Associar Receita" button that opens browser modal.
- Task 6: Integrated `LinkedRecipesSection` into `meal-edit-form.tsx` — visible only for `home_cooked` type, loads linked recipes when form opens, refreshes on link/unlink/servings change.
- Task 7: Added linked recipe name chips to meal plan grid — batch loads linked recipes for all entries on week load, displays small chips below meal name.

### Change Log

- 2026-04-06: Story 20.1 implementation complete — 7 tasks (migration, types, repository, recipe browser modal, linked recipes section, edit form integration, grid display)

### File List

New files:
- supabase/migrations/20260406300000_meal_entry_recipes.sql
- src/components/meal-plan/recipe-browser-modal.tsx
- src/components/meal-plan/linked-recipes-section.tsx

Modified files:
- src/types/meal-plan.types.ts (added MealEntryLinkedRecipe)
- src/repositories/interfaces/meal-plan.repository.interface.ts (added 4 new methods)
- src/repositories/supabase/meal-plan.repository.ts (implemented linkRecipe, unlinkRecipe, updateLinkedServings, getLinkedRecipes)
- src/components/meal-plan/meal-edit-form.tsx (added LinkedRecipesSection for home_cooked meals)
- src/app/(app)/(meal-plan)/index.tsx (batch load linked recipes, display chips in grid)
