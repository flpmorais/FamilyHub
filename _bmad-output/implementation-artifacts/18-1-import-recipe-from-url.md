# Story 18.1: Import Recipe from URL

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an admin,
I want to paste a recipe URL and have the system extract the recipe automatically,
so that I can quickly add recipes I find online without typing everything manually.

## Acceptance Criteria

1. When the admin taps the FAB (+) on the recipe list, an action sheet appears with options: "Entrada Manual" and "Importar de URL" (FR122)
2. When the admin selects "Importar de URL", a screen with a URL text input and "Importar" button appears (FR122)
3. When the admin pastes a URL and taps "Importar", the system fetches the page HTML via a Supabase Edge Function and sends it to the LLM for extraction, showing a loading indicator during extraction (FR122)
4. When the LLM extraction completes successfully within 10 seconds (NFR31), the import review screen displays the extracted recipe fields: name, type, ingredients (with quantities), steps, servings, prep time, cook time — all editable by the admin before saving (FR123)
5. When the admin reviews and adjusts the extracted recipe and taps "Save", the recipe is saved with `import_method: 'url'` and `source_url` set to the original URL (FR122)
6. When the LLM extraction fails or returns incomplete data, the admin is informed with a clear Portuguese error message and offered the option to retry or enter the recipe manually (FR123)
7. A Supabase Edge Function `extract-recipe` exists that accepts a URL, fetches the HTML, sends it to the LLM, and returns structured recipe JSON (FR122)
8. The Edge Function reuses the same LLM provider pattern as `classify-item` (Haiku/Gemini configurable) (NFR37)

## Tasks / Subtasks

- [x] Task 1: Create `extract-recipe` Supabase Edge Function (AC: #7, #8)
  - [x] Create `supabase/functions/extract-recipe/index.ts`
  - [x] Accept `{ url: string }` in request body
  - [x] Fetch the URL HTML content (with timeout, User-Agent header)
  - [x] Strip HTML to text (remove scripts, styles, nav — keep article/recipe content)
  - [x] Truncate to ~4000 chars to fit LLM context
  - [x] Build LLM prompt requesting JSON output: `{ name, type, ingredients: [{ name, quantity }], steps: [string], servings, prepTimeMinutes, cookTimeMinutes }`
  - [x] Call LLM (same Haiku/Gemini provider pattern as `classify-item`)
  - [x] Parse JSON response, return structured recipe data
  - [x] On failure, return `{ error: string }` with descriptive message
  - [x] LLM timeout: 8 seconds (NFR31 requires total <10s)
- [x] Task 2: Create recipe import repository (AC: #3)
  - [x] Create `src/repositories/interfaces/recipe-import.repository.interface.ts`
  - [x] `IRecipeImportRepository` with method: `extractFromUrl(url: string): Promise<ExtractedRecipe>`
  - [x] Create `src/repositories/supabase/recipe-import.repository.ts`
  - [x] `SupabaseRecipeImportRepository` calls `supabase.functions.invoke('extract-recipe', { body: { url } })`
  - [x] Maps response to `ExtractedRecipe` type
  - [x] Register in `RepositoryContext` with key `recipeImport`
- [x] Task 3: Create types for import (AC: #4)
  - [x] Add to `src/types/recipe.types.ts`:
    - `ExtractedRecipe` interface: `name`, `type` (RecipeType), `ingredients: { name: string; quantity: string | null }[]`, `steps: string[]`, `servings: number | null`, `prepTimeMinutes: number | null`, `cookTimeMinutes: number | null`
- [x] Task 4: Change FAB to action sheet (AC: #1)
  - [x] In `src/app/(app)/(recipes)/index.tsx`, change FAB onPress to show `Alert.alert` action sheet with two options:
    - "Entrada Manual" → navigates to `/(app)/(recipes)/new`
    - "Importar de URL" → navigates to `/(app)/(recipes)/import-url`
  - [x] Add "Cancelar" cancel button
- [x] Task 5: Create URL import screen (AC: #2, #3, #6)
  - [x] Create `src/app/(app)/(recipes)/import-url.tsx`
  - [x] Header: "Importar Receita" with back button
  - [x] URL TextInput with placeholder "Cole o URL da receita"
  - [x] "Importar" button (disabled if URL empty)
  - [x] On press: call `recipeImportRepo.extractFromUrl(url)`, show loading indicator
  - [x] On success: navigate to `/(app)/(recipes)/import-review` passing extracted data via route params (JSON-serialized)
  - [x] On error: show Snackbar with error message, offer "Tentar novamente" and "Entrada manual" buttons
- [x] Task 6: Create import review screen (AC: #4, #5)
  - [x] Create `src/app/(app)/(recipes)/import-review.tsx`
  - [x] Receives extracted recipe data from route params
  - [x] Pre-populates the same form layout as `new.tsx`: name, type, servings, prep time, cook time, ingredients (dynamic rows), steps (dynamic rows)
  - [x] All fields editable — admin can correct LLM mistakes
  - [x] Category/tag pickers available (load from repos, same as `new.tsx`)
  - [x] Image section: no image from URL extraction (admin can add manually)
  - [x] "Guardar Receita" button calls `recipeRepo.create()` with `importMethod: 'url'` and `sourceUrl` from original URL
  - [x] On success: navigate back to recipe list
  - [x] On error: Snackbar with Portuguese error message

## Dev Notes

### Edge Function Architecture

The `extract-recipe` edge function follows the same pattern as `classify-item`:
- Same LLM provider switching (Haiku/Gemini via `LLM_PROVIDER` env var)
- Same `callHaiku()` / `callGemini()` helper functions
- Same CORS headers
- Different prompt and response shape

**HTML Fetching Strategy:**

```typescript
// Fetch with timeout and User-Agent
const response = await fetch(url, {
  headers: { 'User-Agent': 'Mozilla/5.0 FamilyHub Recipe Importer' },
  signal: AbortSignal.timeout(3000),
});
const html = await response.text();

// Strip HTML to relevant text
const text = html
  .replace(/<script[\s\S]*?<\/script>/gi, '')
  .replace(/<style[\s\S]*?<\/style>/gi, '')
  .replace(/<nav[\s\S]*?<\/nav>/gi, '')
  .replace(/<header[\s\S]*?<\/header>/gi, '')
  .replace(/<footer[\s\S]*?<\/footer>/gi, '')
  .replace(/<[^>]+>/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()
  .slice(0, 4000);
```

**LLM Prompt:**

```
Extract a recipe from the following web page text. Return ONLY a JSON object (no markdown, no backticks):

{"name": "<recipe name>", "type": "<one of: meal, main, side, soup, dessert, other>", "ingredients": [{"name": "<ingredient>", "quantity": "<amount or null>"}], "steps": ["<step 1>", "<step 2>", ...], "servings": <number or null>, "prepTimeMinutes": <number or null>, "cookTimeMinutes": <number or null>}

If the text does not contain a recipe, return {"error": "No recipe found"}.

Web page text:
{text}
```

**LLM Config:**
- Max tokens: 2000 (recipes are longer than category classification)
- Timeout: 8 seconds (leaves 2s for HTML fetch within the 10s NFR31 budget)
- Temperature: 0 (deterministic extraction)

### ExtractedRecipe Type

```typescript
export interface ExtractedRecipe {
  name: string;
  type: RecipeType;
  ingredients: { name: string; quantity: string | null }[];
  steps: string[];
  servings: number | null;
  prepTimeMinutes: number | null;
  cookTimeMinutes: number | null;
}
```

### Route Params for Import Review

Since Expo Router uses URL-based params, pass the extracted recipe as JSON string:

```typescript
// Navigate to review
router.push({
  pathname: '/(app)/(recipes)/import-review',
  params: {
    extractedJson: JSON.stringify(extracted),
    sourceUrl: url,
  },
});

// Receive in review screen
const { extractedJson, sourceUrl } = useLocalSearchParams<{ extractedJson: string; sourceUrl: string }>();
const extracted: ExtractedRecipe = JSON.parse(extractedJson);
```

### FAB Action Sheet Pattern

```typescript
function handleFabPress() {
  Alert.alert('Adicionar Receita', 'Como quer adicionar?', [
    { text: 'Entrada Manual', onPress: () => router.push('/(app)/(recipes)/new' as any) },
    { text: 'Importar de URL', onPress: () => router.push('/(app)/(recipes)/import-url' as any) },
    { text: 'Cancelar', style: 'cancel' },
  ]);
}
```

### Error Messages (Portuguese)

- Import loading: "A extrair receita..."
- Import failed: "Não foi possível extrair a receita. Verifique o URL e tente novamente."
- No recipe found: "Não foi encontrada nenhuma receita neste URL."
- Network error: "Erro de rede. Verifique a ligação e tente novamente."
- Manual entry fallback: "Entrada manual"
- Retry: "Tentar novamente"

### Architecture Compliance

- **Repository pattern**: `IRecipeImportRepository` wraps the Edge Function call. Zero direct `functions.invoke` in screens.
- **Edge Function pattern**: Same structure as `classify-item` — shared LLM provider, CORS headers, JSON response.
- **File naming**: kebab-case (`recipe-import.repository.ts`, `import-url.tsx`, `import-review.tsx`)
- **Portuguese strings**: All user-facing text in pt-PT
- **No new env vars on mobile**: The Edge Function uses server-side env vars (`ANTHROPIC_API_KEY`, `GEMINI_API_KEY`, `LLM_PROVIDER`) already configured for `classify-item`

### Previous Story Intelligence (Epic 17)

- `recipe.repository.ts` `create()` already accepts `importMethod` and `sourceUrl` fields
- `new.tsx` form pattern is the template for `import-review.tsx` — same ingredients/steps dynamic rows, category/tag pickers, validation
- FAB on recipe list currently navigates directly to `new.tsx` — needs to become action sheet
- `classify-item` Edge Function is the reference pattern for `extract-recipe`

### Project Structure Notes

New files:
```
supabase/functions/extract-recipe/index.ts
src/repositories/interfaces/recipe-import.repository.interface.ts
src/repositories/supabase/recipe-import.repository.ts
src/app/(app)/(recipes)/import-url.tsx
src/app/(app)/(recipes)/import-review.tsx
```

Files to modify:
```
src/types/recipe.types.ts                     (add ExtractedRecipe type)
src/repositories/repository.context.tsx       (register recipeImport)
src/app/(app)/(recipes)/index.tsx             (FAB → action sheet)
```

### What This Story Does NOT Include

- No YouTube import (Story 18.2)
- No OCR/photo import (Story 18.3)
- No image extraction from URL (images stored locally only — admin can add manually)
- No recipe filtering/search (Epic 19)

### Codebase Patterns to Follow

| Pattern | Reference File |
|---------|---------------|
| Edge Function (LLM call) | `supabase/functions/classify-item/index.ts` |
| Classification repository | `src/repositories/supabase/classification.repository.ts` |
| Repository interface | `src/repositories/interfaces/classification.repository.interface.ts` |
| Repository context registration | `src/repositories/repository.context.tsx` |
| Recipe creation form | `src/app/(app)/(recipes)/new.tsx` |
| Recipe types | `src/types/recipe.types.ts` |
| Route params pattern | Expo Router `useLocalSearchParams` |

### References

- [Source: _bmad-output/planning-artifacts/epics-v5-recipes.md — Epic 2, Story 2.1]
- [Source: _bmad-output/planning-artifacts/prd.md — FR122, FR123, NFR31, NFR37]
- [Source: _bmad-output/planning-artifacts/architecture.md — IRecipeImportRepository, ILlmRepository, LLM reuse]
- [Source: supabase/functions/classify-item/index.ts — LLM provider pattern]
- [Source: _bmad-output/implementation-artifacts/17-1-create-and-view-recipes-via-manual-entry.md — Recipe form pattern]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

No issues encountered during implementation.

### Completion Notes List

- Task 1: Created `extract-recipe` Edge Function — fetches URL HTML, strips to text (~4000 chars), sends to LLM (Haiku/Gemini configurable, same pattern as `classify-item`), returns structured recipe JSON. Timeouts: 3s fetch, 8s LLM (within 10s NFR31 budget). Handles markdown code fences in LLM output.
- Task 2: Created `IRecipeImportRepository` + `SupabaseRecipeImportRepository` — wraps Edge Function call, validates response type, maps to `ExtractedRecipe`, Portuguese error messages. Registered in `RepositoryContext` as `recipeImport`.
- Task 3: Added `ExtractedRecipe` interface to `recipe.types.ts`.
- Task 4: Changed FAB on recipe list from direct navigation to `Alert.alert` action sheet with "Entrada Manual", "Importar de URL", and "Cancelar".
- Task 5: Created `import-url.tsx` screen — URL input, "Importar" button with loading state, calls `recipeImportRepo.extractFromUrl()`, navigates to review screen with extracted JSON via route params. Error Snackbar with retry and manual entry fallback.
- Task 6: Created `import-review.tsx` screen — full editable form pre-populated from LLM extraction, same layout as `new.tsx` with category/tag pickers and inline creation modals. Saves with `importMethod: 'url'` and `sourceUrl`. Source URL shown in header bar. Uses `router.dismiss(2)` to skip back to recipe list on save.

### Change Log

- 2026-04-06: Story 18.1 implementation complete — 6 tasks (Edge Function, import repository, types, FAB action sheet, URL import screen, import review screen)

### File List

New files:
- supabase/functions/extract-recipe/index.ts
- src/repositories/interfaces/recipe-import.repository.interface.ts
- src/repositories/supabase/recipe-import.repository.ts
- src/app/(app)/(recipes)/import-url.tsx
- src/app/(app)/(recipes)/import-review.tsx

Modified files:
- src/types/recipe.types.ts (added ExtractedRecipe interface)
- src/repositories/repository.context.tsx (registered recipeImport)
- src/app/(app)/(recipes)/index.tsx (FAB → action sheet)
