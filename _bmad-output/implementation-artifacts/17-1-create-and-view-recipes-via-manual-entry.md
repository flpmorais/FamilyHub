# Story 17.1: Create and View Recipes via Manual Entry

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an admin,
I want to create recipes with structured ingredients, steps, and metadata, and see them in a list,
so that I can build a personal recipe collection from scratch.

## Acceptance Criteria

1. When the admin opens the Recipes module for the first time, an empty state is displayed with a prompt to add the first recipe
2. When the admin taps "Add Recipe" and selects "Manual Entry", the form displays fields for: name, type (dropdown: meal/main/side/soup/dessert/other), servings (default 4), prep time (minutes), cook time (minutes), cost (free text), image (camera capture or gallery picker), an ingredients section with add/remove/reorder rows (each row: name + quantity), and a steps section with add/remove/reorder rows (each row: single text input) (FR129)
3. When the admin fills in all required fields (name, type, at least one ingredient, at least one step) and taps "Save", the recipe is created in Supabase (`recipes` + `recipe_steps` + `recipe_ingredients` tables) and appears in the recipe list grouped under its type (FR116)
4. When the admin taps a recipe in the list, the recipe detail screen loads displaying all fields: name, type, image, servings, prep time, cook time, cost, ingredients with quantities, numbered steps
5. Recipe type is a static enum: meal, main, side, soup, dessert, other — defined at development time, not user-configurable (FR119)
6. The Supabase migration creates `recipes`, `recipe_steps`, and `recipe_ingredients` tables with RLS policies scoped to `family_id`, indexes, and `updated_at` triggers
7. `IRecipeRepository` interface and Supabase implementation exist and are registered in `RepositoryContext`
8. `recipe.types.ts` contains `Recipe`, `RecipeStep`, `RecipeIngredient`, `RecipeType`, `RecipeImportMethod`, and input DTOs
9. `recipesStore` Zustand store exists with UI state for filters and scroll position
10. Route group `(recipes)/` exists with `index.tsx`, `new.tsx`, and `[recipeId]/index.tsx` screens
11. `expo-image-picker` is installed
12. Sidebar navigation includes a "Receitas" entry linking to the recipes module

## Tasks / Subtasks

- [x] Task 1: Install expo-image-picker (AC: #11)
  - [x] Run `npx expo install expo-image-picker`
- [x] Task 2: Create Supabase migration (AC: #6)
  - [x] Create `supabase/migrations/YYYYMMDD000000_recipe_module.sql`
  - [x] `recipes` table: `id` (uuid PK), `family_id` (uuid FK → families), `name` (text NOT NULL), `type` (text NOT NULL CHECK IN enum), `servings` (int NOT NULL DEFAULT 4), `prep_time_minutes` (int), `cook_time_minutes` (int), `cost` (text), `image_url` (text), `import_method` (text NOT NULL DEFAULT 'manual' CHECK IN enum), `source_url` (text), `created_at` (timestamptz DEFAULT now()), `updated_at` (timestamptz DEFAULT now())
  - [x] `recipe_ingredients` table: `id` (uuid PK), `recipe_id` (uuid FK → recipes ON DELETE CASCADE), `ingredient_name` (text NOT NULL), `quantity` (text), `sort_order` (int NOT NULL DEFAULT 0), `created_at`, `updated_at`
  - [x] `recipe_steps` table: `id` (uuid PK), `recipe_id` (uuid FK → recipes ON DELETE CASCADE), `step_number` (int NOT NULL), `step_text` (text NOT NULL), `created_at`, `updated_at`
  - [x] Enable RLS on all 3 tables
  - [x] RLS policy per table: admins read/write within same `family_id` (same pattern as shopping/leftovers)
  - [x] `updated_at` trigger on all 3 tables (reuse `update_updated_at()` function)
  - [x] Index: `recipes(family_id, type)` for grouped-by-type queries
  - [x] Index: `recipe_ingredients(recipe_id)` and `recipe_steps(recipe_id)` for joins
- [x] Task 3: Create types (AC: #8)
  - [x] Create `src/types/recipe.types.ts`
  - [x] `RecipeType` literal union: `'meal' | 'main' | 'side' | 'soup' | 'dessert' | 'other'`
  - [x] `RecipeImportMethod` literal union: `'manual' | 'url' | 'youtube' | 'ocr'`
  - [x] `Recipe` interface with camelCase fields matching DB columns
  - [x] `RecipeIngredient` interface: `id`, `recipeId`, `ingredientName`, `quantity`, `sortOrder`
  - [x] `RecipeStep` interface: `id`, `recipeId`, `stepNumber`, `stepText`
  - [x] `CreateRecipeInput` DTO: name, familyId, type, servings, prepTimeMinutes, cookTimeMinutes, cost, imageUrl, importMethod, sourceUrl, ingredients (array of `{ ingredientName, quantity, sortOrder }`), steps (array of `{ stepNumber, stepText }`)
  - [x] `RecipeWithDetails` type combining Recipe + ingredients[] + steps[]
- [x] Task 4: Create constants (AC: #5)
  - [x] Create `src/constants/recipe-defaults.ts`
  - [x] `RECIPE_TYPES` map: `RecipeType` → Portuguese label (`{ meal: 'Refeicao', main: 'Prato Principal', side: 'Acompanhamento', soup: 'Sopa', dessert: 'Sobremesa', other: 'Outro' }`)
  - [x] `RECIPE_TYPE_LIST` array for dropdown/pickers (key + label)
  - [x] `DEFAULT_SERVINGS = 4`
- [x] Task 5: Create repository interface (AC: #7)
  - [x] Create `src/repositories/interfaces/recipe.repository.interface.ts`
  - [x] `IRecipeRepository` with methods:
    - `create(input: CreateRecipeInput): Promise<RecipeWithDetails>`
    - `getById(id: string): Promise<RecipeWithDetails | null>`
    - `getByFamilyId(familyId: string): Promise<Recipe[]>` (list without details)
    - `update(id: string, input: Partial<CreateRecipeInput>): Promise<RecipeWithDetails>`
    - `delete(id: string): Promise<void>`
- [x] Task 6: Create repository implementation (AC: #7)
  - [x] Create `src/repositories/supabase/recipe.repository.ts`
  - [x] `SupabaseRecipeRepository implements IRecipeRepository`
  - [x] Constructor takes `SupabaseClient`
  - [x] `mapRecipe()` function: snake_case DB row → camelCase `Recipe` (same pattern as `mapShoppingItem`)
  - [x] `mapIngredient()` and `mapStep()` mapper functions
  - [x] `create()`: insert into `recipes`, then batch insert `recipe_ingredients` and `recipe_steps` — all in a single transaction-like flow (insert recipe first to get ID, then children)
  - [x] `getById()`: select recipe + ingredients (ordered by sort_order) + steps (ordered by step_number)
  - [x] `getByFamilyId()`: select recipes only (no joins), ordered by `created_at DESC`
  - [x] `delete()`: delete from `recipes` (CASCADE handles children)
  - [x] Error handling: throw `RepositoryError` with Portuguese messages
- [x] Task 7: Register repository in context (AC: #7)
  - [x] Add `IRecipeRepository` import to `src/repositories/repository.context.tsx`
  - [x] Add `recipe: IRecipeRepository` to `RepositoryContextValue`
  - [x] Instantiate `SupabaseRecipeRepository` in `useMemo`
- [x] Task 8: Create Zustand store (AC: #9)
  - [x] Create `src/stores/recipes.store.ts`
  - [x] State: `scrollPosition: number`, `activeTypeFilter: RecipeType | null`, `searchTerm: string`
  - [x] Actions: `setScrollPosition`, `setActiveTypeFilter`, `setSearchTerm`, `reset`
  - [x] Follow exact pattern from `shopping.store.ts`
- [x] Task 9: Create route shell and layout (AC: #10)
  - [x] Create `src/app/(app)/(recipes)/_layout.tsx` with Stack (same pattern as `(shopping)/_layout.tsx`)
  - [x] Create `src/app/(app)/(recipes)/index.tsx` — recipe list screen
  - [x] Create `src/app/(app)/(recipes)/new.tsx` — manual entry form screen
  - [x] Create `src/app/(app)/(recipes)/[recipeId]/index.tsx` — recipe detail screen
- [x] Task 10: Create recipe list screen (AC: #1, #3)
  - [x] `index.tsx`: fetch recipes via `useRepository('recipe').getByFamilyId(familyId)`
  - [x] Get `familyId` from `useAuthStore(s => s.userAccount?.familyId)` or `useCurrentProfile`
  - [x] Group recipes by `type` using `SectionList` (same pattern as shopping categories)
  - [x] Section headers: Portuguese type labels from `RECIPE_TYPES` constant
  - [x] Each recipe card shows: name, type badge, prep+cook time, servings, thumbnail image
  - [x] Empty state: centered message "Ainda nao tem receitas" with prompt to add first recipe
  - [x] FAB (+) button bottom-right → navigates to `/(recipes)/new`
  - [x] Tap recipe → navigates to `/(recipes)/[recipeId]`
  - [x] `useFocusEffect` to reload on screen focus (same pattern as shopping `index.tsx`)
- [x] Task 11: Create recipe card component (AC: #1)
  - [x] Create `src/components/recipes/recipe-card.tsx`
  - [x] Displays: recipe name, type chip, prep+cook time, servings count, thumbnail
  - [x] Uses `Card` from react-native-paper
  - [x] `onPress` navigates to detail screen
- [x] Task 12: Create manual entry form screen (AC: #2, #3)
  - [x] `new.tsx`: full-screen form (not modal — too many fields for a bottom sheet)
  - [x] Fields: name (TextInput, required), type (dropdown/SegmentedButtons, required), servings (numeric input, default 4), prep time (numeric, optional), cook time (numeric, optional), cost (text, optional)
  - [x] Image picker: button to capture photo or select from gallery via `expo-image-picker` (`launchCameraAsync` / `launchImageLibraryAsync`)
  - [x] Ingredients section: dynamic list with add/remove rows. Each row: ingredient name (TextInput) + quantity (TextInput). "Adicionar ingrediente" button to add row. Minimum 1 row required.
  - [x] Steps section: dynamic list with add/remove rows. Each row: step text (TextInput). "Adicionar passo" button to add row. Minimum 1 row required.
  - [x] Validation: name required, type required, at least 1 ingredient with name, at least 1 step with text
  - [x] Save button: calls `recipeRepository.create(input)`, shows loading state, on success navigates back to list
  - [x] Error handling: Snackbar with Portuguese error messages
  - [x] ScrollView wrapping entire form for scrollability
  - [x] `KeyboardAvoidingView` for keyboard handling
- [x] Task 13: Create recipe detail screen (AC: #4)
  - [x] `[recipeId]/index.tsx`: fetch `recipeRepository.getById(recipeId)` on mount
  - [x] Display: recipe image (full width at top if exists), name, type chip, servings, prep time, cook time, cost
  - [x] Ingredients section: list with ingredient name and quantity per row
  - [x] Steps section: numbered list of steps
  - [x] Loading state while fetching
  - [x] Error state if recipe not found
  - [x] Back navigation to list
- [x] Task 14: Add sidebar menu entry (AC: #12)
  - [x] Add `{ label: 'Receitas', icon: 'book-open-variant', route: '/(app)/(recipes)' }` to `MENU_ITEMS` in `src/components/sidebar-menu.tsx`
  - [x] Position after "Restos" (leftovers) and before "Viagens" (vacations)

## Dev Notes

### Database Schema

```sql
-- recipes table
CREATE TABLE recipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL REFERENCES families(id),
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('meal', 'main', 'side', 'soup', 'dessert', 'other')),
  servings integer NOT NULL DEFAULT 4,
  prep_time_minutes integer,
  cook_time_minutes integer,
  cost text,
  image_url text,
  import_method text NOT NULL DEFAULT 'manual' CHECK (import_method IN ('manual', 'url', 'youtube', 'ocr')),
  source_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- recipe_ingredients table
CREATE TABLE recipe_ingredients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id uuid NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  ingredient_name text NOT NULL,
  quantity text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- recipe_steps table
CREATE TABLE recipe_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id uuid NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  step_number integer NOT NULL,
  step_text text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage family recipes"
  ON recipes FOR ALL
  USING (family_id = (SELECT family_id FROM user_accounts WHERE id = auth.uid()))
  WITH CHECK (family_id = (SELECT family_id FROM user_accounts WHERE id = auth.uid()));

CREATE POLICY "Admins manage recipe ingredients"
  ON recipe_ingredients FOR ALL
  USING (recipe_id IN (SELECT id FROM recipes WHERE family_id = (SELECT family_id FROM user_accounts WHERE id = auth.uid())))
  WITH CHECK (recipe_id IN (SELECT id FROM recipes WHERE family_id = (SELECT family_id FROM user_accounts WHERE id = auth.uid())));

CREATE POLICY "Admins manage recipe steps"
  ON recipe_steps FOR ALL
  USING (recipe_id IN (SELECT id FROM recipes WHERE family_id = (SELECT family_id FROM user_accounts WHERE id = auth.uid())))
  WITH CHECK (recipe_id IN (SELECT id FROM recipes WHERE family_id = (SELECT family_id FROM user_accounts WHERE id = auth.uid())));

-- Triggers
CREATE TRIGGER set_updated_at BEFORE UPDATE ON recipes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON recipe_ingredients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON recipe_steps
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Indexes
CREATE INDEX idx_recipes_family_type ON recipes(family_id, type);
CREATE INDEX idx_recipe_ingredients_recipe ON recipe_ingredients(recipe_id);
CREATE INDEX idx_recipe_steps_recipe ON recipe_steps(recipe_id);
```

### Type Definitions

```typescript
// src/types/recipe.types.ts

export type RecipeType = 'meal' | 'main' | 'side' | 'soup' | 'dessert' | 'other';
export type RecipeImportMethod = 'manual' | 'url' | 'youtube' | 'ocr';

export interface Recipe {
  id: string;
  familyId: string;
  name: string;
  type: RecipeType;
  servings: number;
  prepTimeMinutes: number | null;
  cookTimeMinutes: number | null;
  cost: string | null;
  imageUrl: string | null;
  importMethod: RecipeImportMethod;
  sourceUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RecipeIngredient {
  id: string;
  recipeId: string;
  ingredientName: string;
  quantity: string | null;
  sortOrder: number;
}

export interface RecipeStep {
  id: string;
  recipeId: string;
  stepNumber: number;
  stepText: string;
}

export interface RecipeWithDetails extends Recipe {
  ingredients: RecipeIngredient[];
  steps: RecipeStep[];
}

export interface CreateRecipeInput {
  familyId: string;
  name: string;
  type: RecipeType;
  servings: number;
  prepTimeMinutes?: number;
  cookTimeMinutes?: number;
  cost?: string;
  imageUrl?: string;
  importMethod?: RecipeImportMethod;
  sourceUrl?: string;
  ingredients: { ingredientName: string; quantity?: string; sortOrder: number }[];
  steps: { stepNumber: number; stepText: string }[];
}
```

### Repository Pattern Reference

Follow the `SupabaseShoppingRepository` pattern exactly:
- Constructor takes `SupabaseClient`
- Private `map*()` functions for snake_case → camelCase conversion
- Throw `RepositoryError` on failures (never return null for errors)
- Log errors via `logger` utility before throwing
- All queries filter by `family_id` (RLS handles it at DB level, but query explicitly for clarity)

**Create flow** (insert recipe, then children):
```typescript
async create(input: CreateRecipeInput): Promise<RecipeWithDetails> {
  // 1. Insert recipe row
  const { data: recipeRow, error } = await this.supabase
    .from('recipes')
    .insert({ family_id: input.familyId, name: input.name, type: input.type, ... })
    .select()
    .single();
  if (error) throw new RepositoryError(...);

  // 2. Insert ingredients with recipe_id
  const ingredientRows = input.ingredients.map(ing => ({
    recipe_id: recipeRow.id,
    ingredient_name: ing.ingredientName,
    quantity: ing.quantity ?? null,
    sort_order: ing.sortOrder,
  }));
  const { data: ingredients, error: ingError } = await this.supabase
    .from('recipe_ingredients')
    .insert(ingredientRows)
    .select();

  // 3. Insert steps with recipe_id
  const stepRows = input.steps.map(step => ({
    recipe_id: recipeRow.id,
    step_number: step.stepNumber,
    step_text: step.stepText,
  }));
  const { data: steps, error: stepError } = await this.supabase
    .from('recipe_steps')
    .insert(stepRows)
    .select();

  // 4. Return combined RecipeWithDetails
  return {
    ...mapRecipe(recipeRow),
    ingredients: (ingredients ?? []).map(mapIngredient),
    steps: (steps ?? []).map(mapStep),
  };
}
```

### Image Picker Pattern

```typescript
import * as ImagePicker from 'expo-image-picker';

const pickImage = async () => {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [16, 9],
    quality: 0.8,
  });
  if (!result.canceled) {
    setImageUri(result.assets[0].uri);
  }
};

const takePhoto = async () => {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status !== 'granted') {
    // Show permission denied message
    return;
  }
  const result = await ImagePicker.launchCameraAsync({
    allowsEditing: true,
    aspect: [16, 9],
    quality: 0.8,
  });
  if (!result.canceled) {
    setImageUri(result.assets[0].uri);
  }
};
```

**Note:** Image is stored as a local URI string in `image_url`. For V5 Story 17.1, images are stored locally only (no Supabase Storage upload). This keeps the story focused. If Supabase Storage is needed later, it can be added as an enhancement.

### Dynamic List Pattern (Ingredients/Steps)

For add/remove/reorder rows in the form:

```typescript
const [ingredients, setIngredients] = useState<{ name: string; quantity: string }[]>([
  { name: '', quantity: '' },  // Start with 1 empty row
]);

const addIngredientRow = () => {
  setIngredients([...ingredients, { name: '', quantity: '' }]);
};

const removeIngredientRow = (index: number) => {
  if (ingredients.length <= 1) return; // Keep minimum 1
  setIngredients(ingredients.filter((_, i) => i !== index));
};

const updateIngredient = (index: number, field: 'name' | 'quantity', value: string) => {
  const updated = [...ingredients];
  updated[index] = { ...updated[index], [field]: value };
  setIngredients(updated);
};
```

Same pattern for steps. Reorder can use simple move-up/move-down buttons for V1 simplicity.

### Recipe List Grouping Pattern

Follow the `SectionList` pattern from shopping (groups by category → groups by type):

```typescript
const sections = useMemo(() => {
  const grouped = recipes.reduce((acc, recipe) => {
    const type = recipe.type;
    if (!acc[type]) acc[type] = [];
    acc[type].push(recipe);
    return acc;
  }, {} as Record<RecipeType, Recipe[]>);

  return Object.entries(grouped).map(([type, data]) => ({
    title: RECIPE_TYPES[type as RecipeType],
    data,
  }));
}, [recipes]);
```

### Error Messages (Portuguese)

- Recipe create failed: "Nao foi possivel criar a receita"
- Recipe fetch failed: "Nao foi possivel carregar as receitas"
- Recipe not found: "Receita nao encontrada"
- Name required: "O nome e obrigatorio"
- Type required: "O tipo e obrigatorio"
- Ingredient required: "Adicione pelo menos um ingrediente"
- Step required: "Adicione pelo menos um passo"
- Image permission denied: "Permissao da camara necessaria para tirar fotos"

### Sidebar Menu Entry

Add to `MENU_ITEMS` array in `src/components/sidebar-menu.tsx`:
```typescript
{ label: 'Receitas', icon: 'book-open-variant', route: '/(app)/(recipes)' },
```
Position: after "Restos" (leftovers), before "Viagens" (vacations).

### Architecture Compliance

- **Repository pattern (NFR17)**: All Supabase calls go through `IRecipeRepository` only. Zero direct SDK calls in screens.
- **snake_case/camelCase boundary**: Conversion happens exclusively in `recipe.repository.ts` map functions.
- **File naming**: kebab-case (`recipe.repository.ts`, `recipe-card.tsx`, `recipe-defaults.ts`)
- **Component naming**: PascalCase (`RecipeCard`, `RecipeDetailScreen`)
- **Portuguese strings**: All user-facing messages in pt-PT
- **Loading/error naming**: `isLoading: boolean`, `error: string | null`
- **Zustand for UI state only**: Filters, scroll position — NOT data fetching state
- **Data fetching**: Local `useState` in screens with `useFocusEffect` reload pattern (same as shopping)
- **Forms**: Manual validation, not library-based (same as shopping add/edit forms)
- **Error handling**: `RepositoryError` thrown in repository, caught in screen, displayed via Snackbar

### Project Structure Notes

New files:
```
supabase/migrations/YYYYMMDD000000_recipe_module.sql
src/types/recipe.types.ts
src/constants/recipe-defaults.ts
src/repositories/interfaces/recipe.repository.interface.ts
src/repositories/supabase/recipe.repository.ts
src/stores/recipes.store.ts
src/app/(app)/(recipes)/_layout.tsx
src/app/(app)/(recipes)/index.tsx
src/app/(app)/(recipes)/new.tsx
src/app/(app)/(recipes)/[recipeId]/index.tsx
src/components/recipes/recipe-card.tsx
```

Files to modify:
```
src/repositories/repository.context.tsx  (register IRecipeRepository)
src/components/sidebar-menu.tsx          (add Receitas entry)
package.json                             (expo-image-picker added by npx expo install)
```

### What This Story Does NOT Include

- No recipe categories or tags (Story 17.2)
- No edit or delete screens (Story 17.3)
- No real-time sync (Story 17.4)
- No recipe import from URL/YouTube/OCR (Epic 18)
- No browsing filters or search (Epic 19, Story 19.1)
- No recipe scaling (Epic 19, Story 19.2)
- No PDF sharing (Epic 19, Story 19.3)
- No meal plan integration (Epic 20)
- No shopping list generation (Epic 21)
- No Supabase Storage image upload — images stored as local URIs only
- No `import-review.tsx` screen (Epic 18)
- No `[recipeId]/edit.tsx` screen (Story 17.3)

### Codebase Patterns to Follow

| Pattern | Reference File |
|---------|---------------|
| Repository interface | `src/repositories/interfaces/shopping.repository.interface.ts` |
| Repository implementation | `src/repositories/supabase/shopping.repository.ts` |
| Repository context registration | `src/repositories/repository.context.tsx` |
| Zustand store | `src/stores/shopping.store.ts` |
| Type definitions | `src/types/shopping.types.ts` |
| Constants | `src/constants/shopping-defaults.ts` |
| Screen layout | `src/app/(app)/(shopping)/_layout.tsx` |
| List screen with SectionList | `src/app/(app)/(shopping)/index.tsx` |
| Form pattern | `src/components/shopping/shopping-add-form.tsx` |
| Sidebar menu | `src/components/sidebar-menu.tsx` |
| Migration | `supabase/migrations/` (most recent file) |

### References

- [Source: _bmad-output/planning-artifacts/epics-v5-recipes.md — Epic 1, Story 1.1]
- [Source: _bmad-output/planning-artifacts/prd.md — FR116, FR119, FR129]
- [Source: _bmad-output/planning-artifacts/architecture.md — V5 Recipe Data Architecture, tables, RLS]
- [Source: _bmad-output/planning-artifacts/architecture.md — Repository Pattern, NFR17]
- [Source: _bmad-output/planning-artifacts/architecture.md — Expo Router, route groups]
- [Source: _bmad-output/planning-artifacts/architecture.md — V5 packages: expo-image-picker]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

No issues encountered during implementation.

### Completion Notes List

- Task 1: Installed `expo-image-picker` via `npx expo install`
- Task 2: Created Supabase migration `20260406000000_recipe_module.sql` with `recipes`, `recipe_ingredients`, `recipe_steps` tables, RLS policies, `updated_at` triggers, and indexes
- Task 3: Created `recipe.types.ts` with all types: `RecipeType`, `RecipeImportMethod`, `Recipe`, `RecipeIngredient`, `RecipeStep`, `RecipeWithDetails`, `CreateRecipeInput`
- Task 4: Created `recipe-defaults.ts` with `RECIPE_TYPES` map (Portuguese labels), `RECIPE_TYPE_LIST`, and `DEFAULT_SERVINGS`
- Task 5: Created `IRecipeRepository` interface with `create`, `getById`, `getByFamilyId`, `update`, `delete` methods
- Task 6: Created `SupabaseRecipeRepository` implementation following `SupabaseShoppingRepository` pattern — snake/camel mapping, `logger.error`, Portuguese error messages
- Task 7: Registered `IRecipeRepository` in `RepositoryContext` with `recipe` key
- Task 8: Created `recipesStore` Zustand store with `scrollPosition`, `activeTypeFilter`, `searchTerm`, and actions
- Task 9: Created `(recipes)/` route group with `_layout.tsx`, `index.tsx`, `new.tsx`, `[recipeId]/index.tsx`
- Task 10: Created recipe list screen with `SectionList` grouped by type, empty state, FAB, `useFocusEffect` reload, `PageHeader`
- Task 11: Created `RecipeCard` component with thumbnail, name, type chip, time, servings
- Task 12: Created manual entry form with all fields: name, type selector, servings/prep/cook time, cost, image picker (gallery + camera), dynamic ingredients/steps lists with add/remove/reorder, validation, save with loading state
- Task 13: Created recipe detail screen displaying image, name, type chip, meta row (servings/prep/cook/total time), cost, ingredients list, numbered steps
- Task 14: Added "Receitas" entry to sidebar menu after "Restos" and before "Viagens"

### Implementation Plan

Followed the story file tasks sequentially, implementing each layer bottom-up: migration → types → constants → repository interface → repository implementation → context registration → store → routes → screens → sidebar entry.

### Change Log

- 2026-04-06: Story 17.1 implementation complete — all 14 tasks implemented (recipe module foundation with CRUD, manual entry form, list screen, detail screen)

### File List

New files:
- supabase/migrations/20260406000000_recipe_module.sql
- src/types/recipe.types.ts
- src/constants/recipe-defaults.ts
- src/repositories/interfaces/recipe.repository.interface.ts
- src/repositories/supabase/recipe.repository.ts
- src/stores/recipes.store.ts
- src/app/(app)/(recipes)/_layout.tsx
- src/app/(app)/(recipes)/index.tsx
- src/app/(app)/(recipes)/new.tsx
- src/app/(app)/(recipes)/[recipeId]/index.tsx
- src/components/recipes/recipe-card.tsx

Modified files:
- src/repositories/repository.context.tsx (registered IRecipeRepository)
- src/components/sidebar-menu.tsx (added Receitas entry)
- package.json (expo-image-picker added)
- package-lock.json (expo-image-picker dependency)
