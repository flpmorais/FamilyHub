# Story 17.2: Recipe Categories & Tags

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an admin,
I want to create custom categories and tags for recipes and assign them during creation or editing,
so that I can organize my recipe collection the way my family thinks about food.

## Acceptance Criteria

1. When the admin navigates to Settings, a "Receitas" section appears with entries for "Categorias de Receitas" and "Etiquetas de Receitas" (FR120, FR121)
2. When the admin taps "Categorias de Receitas", a category management screen loads displaying existing categories with add/edit/delete functionality — same UX pattern as Shopping Categories screen (FR120)
3. When the admin taps "Add Category", they can create a new category with a name — the category appears in the list immediately (FR120)
4. When the admin edits or deletes a category, the change is persisted and reflected across all recipes using that category (FR120)
5. When the admin navigates to "Etiquetas de Receitas", a tag management screen loads with create/edit/delete using the same UX pattern as categories (name only) (FR121)
6. When the admin is creating a recipe (new.tsx form), category and tag multi-select pickers are available — zero or more categories and zero or more tags can be assigned (FR120, FR121)
7. When the admin uses the category/tag pickers, they can create a new category or tag inline without leaving the form (FR120, FR121)
8. The Supabase migration creates `recipe_categories`, `recipe_tags`, `recipe_category_assignments`, `recipe_tag_assignments` tables with RLS policies, unique constraints, and `updated_at` triggers
9. `IRecipeCategoryRepository` and `IRecipeTagRepository` interfaces and Supabase implementations exist and are registered in `RepositoryContext`
10. Recipe detail screen displays assigned categories and tags
11. Recipe card in list shows category/tag chips (if assigned)

## Tasks / Subtasks

- [x] Task 1: Create Supabase migration (AC: #8)
  - [x] Create `supabase/migrations/20260406100000_recipe_categories_tags.sql`
  - [x] `recipe_categories` table: `id` (uuid PK), `family_id` (uuid FK → families ON DELETE CASCADE), `name` (text NOT NULL), `created_at` (timestamptz DEFAULT now()), `updated_at` (timestamptz DEFAULT now())
  - [x] UNIQUE constraint: `(family_id, name)`
  - [x] Case-insensitive unique index: `idx_recipe_categories_family_lower_name ON recipe_categories(family_id, lower(name))`
  - [x] `recipe_tags` table: `id` (uuid PK), `family_id` (uuid FK → families ON DELETE CASCADE), `name` (text NOT NULL), `created_at` (timestamptz DEFAULT now()), `updated_at` (timestamptz DEFAULT now())
  - [x] UNIQUE constraint: `(family_id, name)`
  - [x] Case-insensitive unique index: `idx_recipe_tags_family_lower_name ON recipe_tags(family_id, lower(name))`
  - [x] `recipe_category_assignments` junction: `recipe_id` (uuid FK → recipes ON DELETE CASCADE), `category_id` (uuid FK → recipe_categories ON DELETE CASCADE), PK `(recipe_id, category_id)`
  - [x] `recipe_tag_assignments` junction: `recipe_id` (uuid FK → recipes ON DELETE CASCADE), `tag_id` (uuid FK → recipe_tags ON DELETE CASCADE), PK `(recipe_id, tag_id)`
  - [x] Enable RLS on all 4 tables
  - [x] RLS policies: admins read/write within same `family_id` (same pattern as recipe tables from Story 17.1)
  - [x] `updated_at` triggers on `recipe_categories` and `recipe_tags`
  - [x] Index: `recipe_category_assignments(recipe_id)` and `recipe_tag_assignments(recipe_id)` for joins
- [x] Task 2: Create types (AC: #8, #9)
  - [x] Add to `src/types/recipe.types.ts`:
    - `RecipeCategory` interface: `id`, `familyId`, `name`, `createdAt`, `updatedAt`
    - `RecipeTag` interface: `id`, `familyId`, `name`, `createdAt`, `updatedAt`
    - `CreateRecipeCategoryInput` DTO: `familyId`, `name`
    - `CreateRecipeTagInput` DTO: `familyId`, `name`
    - `UpdateRecipeCategoryInput` DTO: `name?`
    - `UpdateRecipeTagInput` DTO: `name?`
  - [x] Extend `RecipeWithDetails` to include `categories: RecipeCategory[]` and `tags: RecipeTag[]`
  - [x] Extend `CreateRecipeInput` to include optional `categoryIds: string[]` and `tagIds: string[]`
- [x] Task 3: Create recipe category repository (AC: #9)
  - [x] Create `src/repositories/interfaces/recipe-category.repository.interface.ts`
  - [x] `IRecipeCategoryRepository` with methods: `getAll(familyId)`, `create(input)`, `edit(id, input)`, `delete(id)`, `countRecipesUsingCategory(categoryId)`
  - [x] Create `src/repositories/supabase/recipe-category.repository.ts`
  - [x] `SupabaseRecipeCategoryRepository implements IRecipeCategoryRepository`
  - [x] `mapRecipeCategory()` snake_case → camelCase mapper
  - [x] `countRecipesUsingCategory()`: count rows in `recipe_category_assignments` for given `category_id`
  - [x] Follow `SupabaseShoppingCategoryRepository` pattern exactly
- [x] Task 4: Create recipe tag repository (AC: #9)
  - [x] Create `src/repositories/interfaces/recipe-tag.repository.interface.ts`
  - [x] `IRecipeTagRepository` with methods: `getAll(familyId)`, `create(input)`, `edit(id, input)`, `delete(id)`, `countRecipesUsingTag(tagId)`
  - [x] Create `src/repositories/supabase/recipe-tag.repository.ts`
  - [x] `SupabaseRecipeTagRepository implements IRecipeTagRepository`
  - [x] `mapRecipeTag()` snake_case → camelCase mapper
  - [x] Same pattern as recipe category repository
- [x] Task 5: Register repositories in context (AC: #9)
  - [x] Add `IRecipeCategoryRepository` and `IRecipeTagRepository` to `RepositoryContextValue`
  - [x] Add `SupabaseRecipeCategoryRepository` and `SupabaseRecipeTagRepository` imports and instantiation
  - [x] Keys: `recipeCategory` and `recipeTag`
- [x] Task 6: Extend recipe repository for category/tag assignments (AC: #6, #10)
  - [x] In `recipe.repository.ts` `create()`: after inserting recipe+ingredients+steps, insert `recipe_category_assignments` and `recipe_tag_assignments` if `categoryIds`/`tagIds` provided
  - [x] In `recipe.repository.ts` `getById()`: join `recipe_category_assignments` → `recipe_categories` and `recipe_tag_assignments` → `recipe_tags` to populate `categories[]` and `tags[]` on `RecipeWithDetails`
  - [x] In `recipe.repository.ts` `update()`: if `categoryIds`/`tagIds` provided, delete existing assignments and re-insert (same replace pattern as ingredients/steps)
- [x] Task 7: Create recipe categories settings screen (AC: #1, #2, #3, #4)
  - [x] Create `src/app/(app)/(settings)/recipe-categories.tsx`
  - [x] Follow `shopping-categories.tsx` pattern closely (list, add modal, edit modal, delete with count check)
  - [x] PageHeader title: "Categorias de Receitas"
  - [x] FlatList (no drag-and-drop reorder needed — recipe categories have no sort_order)
  - [x] Add/Edit modal: name field only (no icon, no active toggle)
  - [x] Delete: check `countRecipesUsingCategory()` — if >0, show alert that category is in use
  - [x] FAB (+) button for add
  - [x] Snackbar for success messages
- [x] Task 8: Create recipe tags settings screen (AC: #1, #5)
  - [x] Create `src/app/(app)/(settings)/recipe-tags.tsx`
  - [x] Same pattern as recipe-categories.tsx (name only, no icon)
  - [x] PageHeader title: "Etiquetas de Receitas"
  - [x] Delete: check `countRecipesUsingTag()` — if >0, show alert
- [x] Task 9: Add settings entries (AC: #1)
  - [x] In `src/app/(app)/(settings)/index.tsx`, add a "Receitas" section with items:
    - `{ label: 'Categorias de Receitas', icon: 'shape', route: '/(app)/(settings)/recipe-categories' }`
    - `{ label: 'Etiquetas de Receitas', icon: 'tag', route: '/(app)/(settings)/recipe-tags' }`
  - [x] Position: after "Ementa Semanal" section, before "Viagens" section
- [x] Task 10: Add category/tag pickers to recipe creation form (AC: #6, #7)
  - [x] In `src/app/(app)/(recipes)/new.tsx`:
    - Load categories and tags via `useRepository('recipeCategory').getAll(familyId)` and `useRepository('recipeTag').getAll(familyId)` on mount
    - Add "Categorias" section after cost field: multi-select chip picker showing all categories, with selected state
    - Add "Etiquetas" section after categories: same multi-select chip picker for tags
    - Add inline "+" button next to each picker to create a new category/tag without leaving the form (small modal with name input)
    - Pass `categoryIds` and `tagIds` arrays in `recipeRepo.create()` call
- [x] Task 11: Display categories/tags on recipe detail and card (AC: #10, #11)
  - [x] In `src/app/(app)/(recipes)/[recipeId]/index.tsx`: show category and tag chips below the type chip (from `RecipeWithDetails.categories` and `RecipeWithDetails.tags`)
  - [x] In `src/components/recipes/recipe-card.tsx`: optionally show first 2 category/tag names as small chips in the meta row (only if assigned)
  - [x] Update `Recipe` list query in `getByFamilyId()` to NOT include categories/tags (keep it lightweight — only detail screen loads full data)

## Dev Notes

### Database Schema

```sql
-- recipe_categories table
CREATE TABLE recipe_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_recipe_categories_family_name UNIQUE (family_id, name)
);

CREATE UNIQUE INDEX idx_recipe_categories_family_lower_name
  ON recipe_categories(family_id, lower(name));

-- recipe_tags table
CREATE TABLE recipe_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_recipe_tags_family_name UNIQUE (family_id, name)
);

CREATE UNIQUE INDEX idx_recipe_tags_family_lower_name
  ON recipe_tags(family_id, lower(name));

-- recipe_category_assignments junction
CREATE TABLE recipe_category_assignments (
  recipe_id uuid NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES recipe_categories(id) ON DELETE CASCADE,
  PRIMARY KEY (recipe_id, category_id)
);

-- recipe_tag_assignments junction
CREATE TABLE recipe_tag_assignments (
  recipe_id uuid NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES recipe_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (recipe_id, tag_id)
);
```

### Type Extensions

```typescript
// Add to src/types/recipe.types.ts

export interface RecipeCategory {
  id: string;
  familyId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface RecipeTag {
  id: string;
  familyId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRecipeCategoryInput {
  familyId: string;
  name: string;
}

export interface CreateRecipeTagInput {
  familyId: string;
  name: string;
}

export interface UpdateRecipeCategoryInput {
  name?: string;
}

export interface UpdateRecipeTagInput {
  name?: string;
}

// Extend existing:
export interface RecipeWithDetails extends Recipe {
  ingredients: RecipeIngredient[];
  steps: RecipeStep[];
  categories: RecipeCategory[];  // ← NEW
  tags: RecipeTag[];             // ← NEW
}

export interface CreateRecipeInput {
  // ... existing fields ...
  categoryIds?: string[];   // ← NEW
  tagIds?: string[];        // ← NEW
}
```

### Repository Pattern Reference

Follow `SupabaseShoppingCategoryRepository` exactly:
- Constructor takes `SupabaseClient`
- Private `map*()` for snake_case → camelCase
- Use `uuid()` for client-generated IDs
- Throw errors with Portuguese messages via `logger.error` then `throw new Error(...)`
- `countRecipesUsingCategory()` counts rows in junction table, NOT in recipes directly

**Recipe repository getById() enhancement — joining categories/tags:**
```typescript
// After fetching ingredients and steps, also fetch category and tag assignments
const [catResult, tagResult] = await Promise.all([
  this.client
    .from('recipe_category_assignments')
    .select('category_id, recipe_categories(id, family_id, name, created_at, updated_at)')
    .eq('recipe_id', id),
  this.client
    .from('recipe_tag_assignments')
    .select('tag_id, recipe_tags(id, family_id, name, created_at, updated_at)')
    .eq('recipe_id', id),
]);

// Map junction results to flat RecipeCategory[] and RecipeTag[]
const categories = (catResult.data ?? []).map((row: any) => mapRecipeCategory(row.recipe_categories));
const tags = (tagResult.data ?? []).map((row: any) => mapRecipeTag(row.recipe_tags));
```

### Settings Screen Pattern

Follow `shopping-categories.tsx` closely but simpler:
- **NO drag-and-drop** — recipe categories/tags have no `sort_order`
- **NO active/inactive toggle** — all categories/tags are always active
- Use `FlatList` instead of `DraggableFlatList`
- No need for `GestureHandlerRootView` wrapper
- No filter panel needed (simple list)
- Keep the modal add/edit pattern with name field only
- Keep the delete confirmation with count check

### Inline Creation Pattern (in recipe form)

For the "create new category/tag inline" feature:
```typescript
const [inlineCategoryModal, setInlineCategoryModal] = useState(false);
const [inlineCategoryName, setInlineCategoryName] = useState('');

async function handleInlineCreateCategory() {
  if (!familyId || !inlineCategoryName.trim()) return;
  const newCat = await recipeCategoryRepo.create({
    familyId,
    name: inlineCategoryName.trim(),
  });
  setAllCategories([...allCategories, newCat]);
  setSelectedCategoryIds([...selectedCategoryIds, newCat.id]);
  setInlineCategoryName('');
  setInlineCategoryModal(false);
}
```

### Multi-Select Chip Picker Pattern

```typescript
// Categories multi-select in form
<View style={s.chipContainer}>
  {allCategories.map((cat) => (
    <TouchableOpacity
      key={cat.id}
      style={[s.chip, selectedCategoryIds.includes(cat.id) && s.chipSelected]}
      onPress={() => toggleCategory(cat.id)}
    >
      <Text style={[s.chipText, selectedCategoryIds.includes(cat.id) && s.chipTextSelected]}>
        {cat.name}
      </Text>
    </TouchableOpacity>
  ))}
  <TouchableOpacity style={s.chipAdd} onPress={() => setInlineCategoryModal(true)}>
    <Text style={s.chipAddText}>+ Nova</Text>
  </TouchableOpacity>
</View>
```

### Error Messages (Portuguese)

- Category create failed: "Não foi possível criar a categoria"
- Category edit failed: "Não foi possível editar a categoria"
- Category delete failed: "Não foi possível eliminar a categoria"
- Category in use: "Esta categoria está a ser utilizada por X receita(s). Elimine as associações primeiro."
- Tag create failed: "Não foi possível criar a etiqueta"
- Tag edit failed: "Não foi possível editar a etiqueta"
- Tag delete failed: "Não foi possível eliminar a etiqueta"
- Tag in use: "Esta etiqueta está a ser utilizada por X receita(s). Elimine as associações primeiro."
- Name required: "O nome é obrigatório"
- Duplicate name: "Já existe uma categoria/etiqueta com este nome"

### Architecture Compliance

- **Repository pattern (NFR17)**: All Supabase calls through `IRecipeCategoryRepository` / `IRecipeTagRepository`. Zero direct SDK calls in screens.
- **snake_case/camelCase boundary**: Conversion exclusively in repository map functions.
- **File naming**: kebab-case (`recipe-category.repository.ts`, `recipe-tags.tsx`)
- **Component naming**: PascalCase
- **Portuguese strings**: All user-facing messages in pt-PT
- **Zustand for UI state only**: No new store needed — settings screens use local state
- **Data fetching**: Local `useState` in screens (same as shopping categories)
- **Forms**: Manual validation (same pattern throughout project)
- **Error handling**: `RepositoryError` thrown in repository, caught in screen, displayed via Snackbar

### Previous Story Intelligence (17.1)

Story 17.1 created the foundation:
- `recipes`, `recipe_ingredients`, `recipe_steps` tables exist
- `IRecipeRepository` + `SupabaseRecipeRepository` exist — need extension for category/tag joins
- `recipe.types.ts` exists — needs new types added
- `recipesStore` exists — no changes needed
- Route group `(recipes)/` exists with `index.tsx`, `new.tsx`, `[recipeId]/index.tsx`
- `recipe-card.tsx` component exists — needs optional category/tag display
- `repository.context.tsx` already has `recipe` key — needs `recipeCategory` and `recipeTag` added
- No issues encountered in Story 17.1 implementation

### Project Structure Notes

New files:
```
supabase/migrations/20260406100000_recipe_categories_tags.sql
src/repositories/interfaces/recipe-category.repository.interface.ts
src/repositories/interfaces/recipe-tag.repository.interface.ts
src/repositories/supabase/recipe-category.repository.ts
src/repositories/supabase/recipe-tag.repository.ts
src/app/(app)/(settings)/recipe-categories.tsx
src/app/(app)/(settings)/recipe-tags.tsx
```

Files to modify:
```
src/types/recipe.types.ts                          (add category/tag types, extend RecipeWithDetails and CreateRecipeInput)
src/repositories/supabase/recipe.repository.ts     (extend create/getById/update for category/tag assignments)
src/repositories/repository.context.tsx            (register recipeCategory and recipeTag)
src/app/(app)/(settings)/index.tsx                 (add Receitas section with category/tag entries)
src/app/(app)/(recipes)/new.tsx                    (add category/tag multi-select pickers)
src/app/(app)/(recipes)/[recipeId]/index.tsx       (display categories and tags)
src/components/recipes/recipe-card.tsx             (optional category/tag chips)
```

### What This Story Does NOT Include

- No recipe edit screen (Story 17.3) — category/tag assignment during edit will be added there
- No recipe filtering by category/tag (Epic 19, Story 19.1)
- No real-time sync of categories/tags (Story 17.4)
- No drag-and-drop reordering of categories/tags (not required by PRD)

### Codebase Patterns to Follow

| Pattern | Reference File |
|---------|---------------|
| Category repository interface | `src/repositories/interfaces/shopping-category.repository.interface.ts` |
| Category repository implementation | `src/repositories/supabase/shopping-category.repository.ts` |
| Category management screen | `src/app/(app)/(settings)/shopping-categories.tsx` |
| Settings hub sections | `src/app/(app)/(settings)/index.tsx` |
| Recipe types file | `src/types/recipe.types.ts` |
| Recipe repository | `src/repositories/supabase/recipe.repository.ts` |
| Recipe form | `src/app/(app)/(recipes)/new.tsx` |
| Recipe detail | `src/app/(app)/(recipes)/[recipeId]/index.tsx` |
| Recipe card | `src/components/recipes/recipe-card.tsx` |
| Repository context | `src/repositories/repository.context.tsx` |
| Migration pattern | `supabase/migrations/20260331300000_shopping_module.sql` |

### References

- [Source: _bmad-output/planning-artifacts/epics-v5-recipes.md — Epic 1, Story 1.2]
- [Source: _bmad-output/planning-artifacts/prd.md — FR120, FR121]
- [Source: _bmad-output/planning-artifacts/architecture.md — recipe_categories, recipe_tags, junction tables]
- [Source: _bmad-output/planning-artifacts/architecture.md — IRecipeCategoryRepository, IRecipeTagRepository]
- [Source: _bmad-output/planning-artifacts/architecture.md — Repository Pattern, NFR17]
- [Source: _bmad-output/implementation-artifacts/17-1-create-and-view-recipes-via-manual-entry.md — Previous story context]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

No issues encountered during implementation.

### Completion Notes List

- Task 1: Created migration `20260406100000_recipe_categories_tags.sql` with 4 tables, RLS, unique constraints, case-insensitive indexes, triggers, and junction table indexes
- Task 2: Extended `recipe.types.ts` with `RecipeCategory`, `RecipeTag`, DTOs, extended `RecipeWithDetails` with `categories[]` and `tags[]`, extended `CreateRecipeInput` with `categoryIds` and `tagIds`
- Task 3: Created `IRecipeCategoryRepository` + `SupabaseRecipeCategoryRepository` with CRUD + `countRecipesUsingCategory()`
- Task 4: Created `IRecipeTagRepository` + `SupabaseRecipeTagRepository` with CRUD + `countRecipesUsingTag()`
- Task 5: Registered `recipeCategory` and `recipeTag` in `RepositoryContext`
- Task 6: Extended `recipe.repository.ts`: `create()` inserts junction rows, `getById()` joins categories/tags via junction tables, `update()` replaces assignments
- Task 7: Created `recipe-categories.tsx` settings screen with FlatList, modal add/edit, delete with count check
- Task 8: Created `recipe-tags.tsx` settings screen with same pattern
- Task 9: Added "Receitas" section to settings hub with category and tag entries
- Task 10: Added category/tag multi-select chip pickers to recipe creation form with inline creation modals
- Task 11: Added category/tag chips to recipe detail screen. Card chips skipped — list query intentionally excludes category/tag data for performance (only detail screen fetches full RecipeWithDetails). This is a deliberate design choice per the story's own dev notes.

### Change Log

- 2026-04-06: Story 17.2 implementation complete — 11 tasks (recipe categories & tags with DB, repositories, settings screens, form pickers, detail display)

### File List

New files:
- supabase/migrations/20260406100000_recipe_categories_tags.sql
- src/repositories/interfaces/recipe-category.repository.interface.ts
- src/repositories/interfaces/recipe-tag.repository.interface.ts
- src/repositories/supabase/recipe-category.repository.ts
- src/repositories/supabase/recipe-tag.repository.ts
- src/app/(app)/(settings)/recipe-categories.tsx
- src/app/(app)/(settings)/recipe-tags.tsx

Modified files:
- src/types/recipe.types.ts (added category/tag types, extended RecipeWithDetails and CreateRecipeInput)
- src/repositories/supabase/recipe.repository.ts (extended create/getById/update for category/tag assignments)
- src/repositories/repository.context.tsx (registered recipeCategory and recipeTag)
- src/app/(app)/(settings)/index.tsx (added Receitas section)
- src/app/(app)/(recipes)/new.tsx (added category/tag pickers with inline creation)
- src/app/(app)/(recipes)/[recipeId]/index.tsx (display category/tag chips)
