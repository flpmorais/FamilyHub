# Story 19.1: Browse and Filter Recipes

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an admin,
I want to browse my recipes by type and filter by categories, tags, ingredients, and cooking time,
so that I can quickly find the recipe I'm looking for.

## Acceptance Criteria

1. When the admin opens the recipe list and recipes exist, they are displayed grouped by type (meal, main, side, soup, dessert, other) with each section showing a recipe count (FR130)
2. A horizontal type filter tab bar appears below the header — tapping a type tab filters to show only recipes of that type; tapping "Todos" shows all (FR130)
3. A filter icon button opens a filter panel where the admin can filter by: categories (multi-select), tags (multi-select), ingredient name (text search), total time (max minutes), prep time (max minutes), cook time (max minutes) (FR131)
4. Filters are combinable — e.g., type "Sopa" + category "Portuguesa" + total time under 30 min (FR133)
5. When the admin types an ingredient name in the search field, the system matches against ingredient names across all recipes and returns matching recipes (FR132)
6. Filter results return within 300ms (NFR34) — all filtering is client-side after initial data load
7. When the admin clears all filters, the full recipe list grouped by type is restored (FR131)
8. The recipe list loads recipes with their ingredient names for ingredient search capability

## Tasks / Subtasks

- [x] Task 1: Extend recipe repository for ingredient-inclusive list query (AC: #5, #8)
  - [x] Add `getByFamilyIdWithIngredients(familyId: string): Promise<RecipeWithIngredientNames[]>` to `IRecipeRepository`
  - [x] Create `RecipeWithIngredientNames` type: `Recipe & { ingredientNames: string[] }`
  - [x] Implement: query recipes, then batch-query ingredient names per recipe, merge
  - [x] Alternative simpler approach: load all `recipe_ingredients` for the family's recipes in one query, group by recipe_id client-side
- [x] Task 2: Create type filter tab bar component (AC: #1, #2)
  - [x] Create `src/components/recipes/recipe-type-filter.tsx`
  - [x] Horizontal `ScrollView` with chip buttons: "Todos" + one per `RecipeType`
  - [x] Active chip highlighted in `#B5451B`, inactive in `#F5F5F5`
  - [x] `onSelect(type: RecipeType | null)` callback — `null` means "Todos"
  - [x] Show recipe count per type in chip label
- [x] Task 3: Create filter panel component (AC: #3, #5)
  - [x] Create `src/components/recipes/recipe-filter-panel.tsx`
  - [x] Modal/bottom sheet with filter sections:
    - Categories: multi-select chips (load from `recipeCategory.getAll`)
    - Tags: multi-select chips (load from `recipeTag.getAll`)
    - Ingredient search: text input matching ingredient names
    - Max total time: numeric input (minutes)
    - Max prep time: numeric input (minutes)
    - Max cook time: numeric input (minutes)
  - [x] "Aplicar" button applies filters and closes panel
  - [x] "Limpar" button resets all filters
  - [x] Show active filter count on the filter icon button
- [x] Task 4: Implement client-side filtering logic (AC: #4, #5, #6, #7)
  - [x] In recipe list screen, apply filters in sequence:
    - Type filter: `recipe.type === activeType` (if set)
    - Category filter: recipe has at least one of the selected category IDs (requires loading category assignments — or filter by loaded ingredient names pattern)
    - Tag filter: recipe has at least one of the selected tag IDs
    - Ingredient search: any `ingredientName` contains the search term (case-insensitive)
    - Time filters: `(prepTime + cookTime) <= maxTotalTime`, `prepTime <= maxPrepTime`, `cookTime <= maxCookTime`
  - [x] Use `useMemo` for filtering to ensure <300ms (NFR34)
  - [x] After filtering, group by type using existing `buildSections()`
- [x] Task 5: Update recipe list screen with filters (AC: #1, #2, #3, #7)
  - [x] Add type filter tab bar below `PageHeader`
  - [x] Add filter icon button (FAB-style, smaller, left of add FAB)
  - [x] Wire up `useRecipesStore` for `activeTypeFilter` and `searchTerm` persistence
  - [x] Load recipes with ingredient names on mount
  - [x] Apply all filters in `useMemo` before passing to `buildSections()`
  - [x] Update recipe count in section headers to reflect filtered count
- [x] Task 6: Load category/tag assignments for filtering (AC: #3, #4)
  - [x] For category/tag filtering, load `recipe_category_assignments` and `recipe_tag_assignments` alongside recipes
  - [x] Add `getAssignmentsByFamilyId(familyId)` to recipe repository (returns map of recipeId → categoryIds[] and recipeId → tagIds[])
  - [x] Or simpler: extend `getByFamilyIdWithIngredients` to also include categoryIds and tagIds per recipe

## Dev Notes

### Filtering Architecture

All filtering is **client-side** after the initial data load. The recipe list loads all recipes for the family (at family scale, <100 recipes expected), including ingredient names and category/tag assignments. Filters are applied via `useMemo` on every render — this is fast enough for <300ms (NFR34) at family scale.

**Data model for filtering:**
```typescript
interface RecipeForList extends Recipe {
  ingredientNames: string[];
  categoryIds: string[];
  tagIds: string[];
}
```

**Loading strategy:**
1. Load all recipes: `getByFamilyId(familyId)`
2. Load all ingredients: `SELECT recipe_id, ingredient_name FROM recipe_ingredients WHERE recipe_id IN (recipe_ids)`
3. Load all category/tag assignments: `SELECT recipe_id, category_id FROM recipe_category_assignments WHERE recipe_id IN (recipe_ids)` (same for tags)
4. Merge client-side into `RecipeForList[]`

This can be a single new repository method or done in the screen with parallel queries.

### Type Filter Tab Bar Pattern

```typescript
<ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.typeBar}>
  <TouchableOpacity
    style={[s.typeTab, !activeType && s.typeTabActive]}
    onPress={() => setActiveType(null)}
  >
    <Text style={[s.typeTabText, !activeType && s.typeTabTextActive]}>
      Todos ({recipes.length})
    </Text>
  </TouchableOpacity>
  {RECIPE_TYPE_LIST.map((t) => {
    const count = recipes.filter((r) => r.type === t.key).length;
    if (count === 0) return null;
    return (
      <TouchableOpacity
        key={t.key}
        style={[s.typeTab, activeType === t.key && s.typeTabActive]}
        onPress={() => setActiveType(t.key)}
      >
        <Text style={[s.typeTabText, activeType === t.key && s.typeTabTextActive]}>
          {t.label} ({count})
        </Text>
      </TouchableOpacity>
    );
  })}
</ScrollView>
```

### Filter Panel Pattern

Follow the `shopping-categories.tsx` filter panel approach — a `Modal` that slides in from the right side:

```typescript
<Modal visible={filterPanelVisible} animationType="slide" transparent>
  <View style={s.filterOverlay}>
    <TouchableOpacity style={s.filterOverlayTouch} onPress={closePanel} />
    <View style={s.filterPanel}>
      {/* Filter sections */}
    </View>
  </View>
</Modal>
```

### Ingredient Search

Ingredient search matches the search term (case-insensitive, partial match) against all ingredient names for each recipe:

```typescript
const matchesIngredient = !ingredientSearch || recipe.ingredientNames.some(
  (name) => name.toLowerCase().includes(ingredientSearch.toLowerCase()),
);
```

### Filter State

Use `useRecipesStore` Zustand store for `activeTypeFilter` and `searchTerm` (already defined). Add filter state locally in the screen for category/tag/time filters (these don't need to persist across navigation).

### Error Messages (Portuguese)

- No results: "Nenhuma receita encontrada com estes filtros"
- Clear filters: "Limpar filtros"
- Apply filters: "Aplicar"
- All types: "Todos"

### Architecture Compliance

- **Repository pattern**: New method `getByFamilyIdWithIngredients()` on `IRecipeRepository` for enriched list data
- **Client-side filtering**: `useMemo` for all filter logic — no additional Supabase queries during filter changes
- **Zustand**: Use existing `recipesStore` for type filter and search term persistence
- **<300ms filter response**: Guaranteed at family scale by keeping all data in memory

### Previous Story Intelligence

- Recipe list screen (`index.tsx`) already has `buildSections()`, `SectionList`, FAB, and Realtime hook
- `recipesStore` has `activeTypeFilter`, `searchTerm`, `setActiveTypeFilter`, `setSearchTerm` — already defined but unused
- `RecipeType` and `RECIPE_TYPES` constants exist
- Recipe categories and tags exist from Story 17.2 — `recipeCategory.getAll()` and `recipeTag.getAll()` available

### Project Structure Notes

New files:
```
src/components/recipes/recipe-type-filter.tsx
src/components/recipes/recipe-filter-panel.tsx
```

Files to modify:
```
src/types/recipe.types.ts                          (add RecipeForList type)
src/repositories/interfaces/recipe.repository.interface.ts  (add getByFamilyIdWithIngredients)
src/repositories/supabase/recipe.repository.ts     (implement enriched list query)
src/app/(app)/(recipes)/index.tsx                  (add type tabs, filter panel, client-side filtering)
```

### Codebase Patterns to Follow

| Pattern | Reference File |
|---------|---------------|
| Filter panel (modal) | `src/app/(app)/(settings)/shopping-categories.tsx` |
| Type constants | `src/constants/recipe-defaults.ts` |
| Zustand store | `src/stores/recipes.store.ts` |
| SectionList with grouping | `src/app/(app)/(recipes)/index.tsx` |
| Category/tag loading | `src/app/(app)/(recipes)/new.tsx` |

### References

- [Source: _bmad-output/planning-artifacts/epics-v5-recipes.md — Epic 3, Story 3.1]
- [Source: _bmad-output/planning-artifacts/prd.md — FR130, FR131, FR132, FR133, NFR34]
- [Source: _bmad-output/planning-artifacts/architecture.md — client-side filtering, recipe indexes]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

No issues encountered during implementation.

### Completion Notes List

- Task 1: Added `RecipeForList` type (Recipe + ingredientNames + categoryIds + tagIds). Added `getByFamilyIdForList()` to `IRecipeRepository` + implemented in `SupabaseRecipeRepository` — loads recipes + batch-loads ingredient names, category assignments, and tag assignments in 3 parallel queries, merges client-side.
- Task 2: Created `recipe-type-filter.tsx` — horizontal ScrollView with chip buttons "Todos" + per-type with counts. Hides types with zero recipes.
- Task 3: Created `recipe-filter-panel.tsx` — slide-in modal panel with sections for ingredient text search, category multi-select chips, tag multi-select chips, and three time filters (total, prep, cook). "Aplicar" + "Limpar" buttons. Exported `RecipeFilters` type, `EMPTY_FILTERS` constant, and `countActiveFilters()` helper.
- Task 4: Implemented all client-side filtering in recipe list screen via `useMemo` — type, categories, tags, ingredient search (case-insensitive partial match), and time filters all combinable.
- Task 5: Rewrote recipe list screen — type filter tab bar below header, filter icon FAB (with active filter count badge), enriched data loading via `getByFamilyIdForList()`, wired `useRecipesStore` for type filter persistence, "no results" state with "Limpar filtros" link.
- Task 6: Category/tag assignment loading handled within `getByFamilyIdForList()` — batch loads all assignments in parallel with ingredients and recipes.

### Change Log

- 2026-04-06: Story 19.1 implementation complete — 6 tasks (enriched list query, type filter tabs, filter panel, client-side filtering, screen integration)

### File List

New files:
- src/components/recipes/recipe-type-filter.tsx
- src/components/recipes/recipe-filter-panel.tsx

Modified files:
- src/types/recipe.types.ts (added RecipeForList type)
- src/repositories/interfaces/recipe.repository.interface.ts (added getByFamilyIdForList)
- src/repositories/supabase/recipe.repository.ts (implemented getByFamilyIdForList with batch loading)
- src/app/(app)/(recipes)/index.tsx (full rewrite: type tabs, filter panel, client-side filtering, filter FAB with badge)
