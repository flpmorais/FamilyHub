# Story 19.3: Share Recipe as PDF

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an admin,
I want to share a recipe as a formatted PDF via WhatsApp, email, or any other app,
so that I can send recipes to family and friends who don't use FamilyHub.

## Acceptance Criteria

1. When the admin is viewing a recipe detail screen, a "Partilhar" (Share) button is visible (FR147)
2. When the admin taps "Partilhar", the system generates a PDF on-device containing: recipe name, image, type, ingredients with quantities, steps, servings, prep time, cook time, and cost (FR147)
3. PDF generation completes within 3 seconds (NFR36)
4. After PDF generation, the Android share sheet opens immediately, allowing the admin to send the PDF via any installed app (WhatsApp, email, etc.) (FR148)
5. The PDF is formatted attractively with the FamilyHub brand color and clean typography
6. The entire flow runs on-device — no network call required

## Tasks / Subtasks

- [x] Task 1: Install PDF and share dependencies (AC: #6)
  - [x] Run `npx expo install expo-print expo-sharing`
  - [x] Note: Using Expo's built-in `expo-print` (printToFileAsync) and `expo-sharing` instead of `react-native-html-to-pdf` and `react-native-share` — better Expo SDK 55 compatibility, no native linking needed
- [x] Task 2: Create recipe PDF HTML template (AC: #2, #5)
  - [x] Create `src/constants/recipe-pdf-template.ts`
  - [x] Export `buildRecipePdfHtml(recipe: RecipeWithDetails): string` function
  - [x] HTML template includes: recipe name, type badge, image (if exists, as base64 data URI or skip), servings, prep time, cook time, cost, ingredients table, numbered steps
  - [x] Styled with inline CSS using FamilyHub brand color (#B5451B), clean sans-serif typography
  - [x] A4 page format
- [x] Task 3: Create recipe PDF service (AC: #2, #3)
  - [x] Create `src/services/recipe-pdf.service.ts`
  - [x] `generateRecipePdf(recipe: RecipeWithDetails): Promise<string>` — returns file URI
  - [x] Uses `expo-print` `printToFileAsync({ html, width, height })` to generate PDF
  - [x] Returns the local file URI of the generated PDF
- [x] Task 4: Add Share button to detail screen (AC: #1, #4)
  - [x] In `[recipeId]/index.tsx`, add a "Partilhar" floating button next to "Editar"
  - [x] On press: call `generateRecipePdf(recipe)`, then `Sharing.shareAsync(fileUri)` to open share sheet
  - [x] Show brief loading indicator during generation
  - [x] On error: Snackbar with Portuguese error message

## Dev Notes

### Expo Print + Sharing (instead of react-native-html-to-pdf + react-native-share)

The original spec mentions `react-native-html-to-pdf` and `react-native-share`, but Expo provides built-in alternatives with better compatibility:
- **`expo-print`**: `printToFileAsync({ html })` generates a PDF file from HTML — same functionality, zero native linking
- **`expo-sharing`**: `shareAsync(fileUri)` opens the native share sheet — works on Android and iOS

Both are part of the Expo ecosystem and guaranteed compatible with SDK 55.

### PDF HTML Template

```typescript
export function buildRecipePdfHtml(recipe: RecipeWithDetails): string {
  const ingredients = recipe.ingredients
    .map((ing) => `<tr><td>${ing.ingredientName}</td><td>${ing.quantity ?? ''}</td></tr>`)
    .join('');

  const steps = recipe.steps
    .map((step) => `<li>${step.stepText}</li>`)
    .join('');

  const meta = [
    recipe.servings ? `${recipe.servings} porções` : null,
    recipe.prepTimeMinutes ? `Prep: ${recipe.prepTimeMinutes} min` : null,
    recipe.cookTimeMinutes ? `Cozinhar: ${recipe.cookTimeMinutes} min` : null,
    recipe.cost ? `Custo: ${recipe.cost}` : null,
  ].filter(Boolean).join(' · ');

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>
  body { font-family: sans-serif; margin: 40px; color: #1A1A1A; }
  h1 { color: #B5451B; margin-bottom: 4px; }
  .meta { color: #888; font-size: 14px; margin-bottom: 20px; }
  .type { display: inline-block; background: #B5451B; color: white; padding: 2px 10px; border-radius: 10px; font-size: 12px; font-weight: bold; }
  table { width: 100%; border-collapse: collapse; margin: 16px 0; }
  td { padding: 6px 8px; border-bottom: 1px solid #eee; }
  td:last-child { text-align: right; color: #888; }
  h2 { color: #1A1A1A; font-size: 16px; margin-top: 24px; }
  ol { padding-left: 20px; }
  li { margin-bottom: 8px; line-height: 1.5; }
  .footer { margin-top: 32px; text-align: center; color: #ccc; font-size: 11px; }
</style></head>
<body>
  <h1>${recipe.name}</h1>
  <span class="type">${RECIPE_TYPES[recipe.type]}</span>
  <p class="meta">${meta}</p>
  <h2>Ingredientes</h2>
  <table>${ingredients}</table>
  <h2>Preparação</h2>
  <ol>${steps}</ol>
  <p class="footer">Gerado pelo FamilyHub</p>
</body>
</html>`;
}
```

### PDF Service

```typescript
import * as Print from 'expo-print';

export async function generateRecipePdf(recipe: RecipeWithDetails): Promise<string> {
  const html = buildRecipePdfHtml(recipe);
  const { uri } = await Print.printToFileAsync({ html });
  return uri;
}
```

### Share Integration

```typescript
import * as Sharing from 'expo-sharing';

async function handleShare() {
  try {
    setIsSharing(true);
    const fileUri = await generateRecipePdf(recipe);
    await Sharing.shareAsync(fileUri, {
      mimeType: 'application/pdf',
      dialogTitle: recipe.name,
    });
  } catch (err) {
    showError('Não foi possível partilhar a receita');
  } finally {
    setIsSharing(false);
  }
}
```

### Detail Screen Button Placement

Add "Partilhar" as a floating pill button. Place it between the back button and the edit button, or as a third button:

```
[← Voltar]                    [Partilhar 📤] [Editar ✎]
```

### Error Messages (Portuguese)

- Share failed: "Não foi possível partilhar a receita"
- Generating: "A gerar PDF..."

### Architecture Compliance

- **On-device only**: No network calls — PDF generated locally via `expo-print`
- **No new native linking**: `expo-print` and `expo-sharing` are Expo-managed
- **Service pattern**: `generateRecipePdf()` is a pure service function in `recipe-pdf.service.ts`

### Previous Story Intelligence

- Detail screen has floating back and edit buttons — add share button alongside
- Detail screen has `RecipeWithDetails` data — all fields needed for PDF are available
- `RECIPE_TYPES` constant has Portuguese type labels for the PDF

### Project Structure Notes

New files:
```
src/constants/recipe-pdf-template.ts
src/services/recipe-pdf.service.ts
```

Files to modify:
```
src/app/(app)/(recipes)/[recipeId]/index.tsx  (add Share button and share handler)
package.json                                  (expo-print, expo-sharing added by npx expo install)
```

### Codebase Patterns to Follow

| Pattern | Reference File |
|---------|---------------|
| Recipe detail screen | `src/app/(app)/(recipes)/[recipeId]/index.tsx` |
| Recipe types/constants | `src/constants/recipe-defaults.ts` |
| Service pattern | `src/services/recipe-scaling.service.ts` |

### References

- [Source: _bmad-output/planning-artifacts/epics-v5-recipes.md — Epic 3, Story 3.3]
- [Source: _bmad-output/planning-artifacts/prd.md — FR147, FR148, NFR36]
- [Source: _bmad-output/planning-artifacts/architecture.md — PDF generation, on-device]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

No issues encountered during implementation.

### Completion Notes List

- Task 1: Installed `expo-print` and `expo-sharing` via npx expo install. Added `expo-sharing` plugin to `app.config.ts`.
- Task 2: Created `recipe-pdf-template.ts` with `buildRecipePdfHtml()` — HTML template with FamilyHub brand color (#B5451B), ingredients table, numbered steps, meta line (servings/prep/cook/cost), footer. All content HTML-escaped.
- Task 3: Created `recipe-pdf.service.ts` with `generateRecipePdf()` — uses `expo-print` `printToFileAsync` to generate PDF from HTML, returns local file URI.
- Task 4: Added "Partilhar" floating pill button on detail screen next to "Editar". Calls `generateRecipePdf()` then `Sharing.shareAsync()` to open native share sheet. Shows "A gerar..." during PDF generation. Error handling via Snackbar.

### Change Log

- 2026-04-06: Story 19.3 implementation complete — 4 tasks (dependencies, HTML template, PDF service, share button). Completes Epic 19 (Recipe Discovery, Scaling & Sharing).

### File List

New files:
- src/constants/recipe-pdf-template.ts
- src/services/recipe-pdf.service.ts

Modified files:
- src/app/(app)/(recipes)/[recipeId]/index.tsx (added Share button, share handler, refactored floating buttons to row layout)
- app.config.ts (added expo-sharing plugin)
- package.json (expo-print, expo-sharing added)
- package-lock.json (expo-print, expo-sharing dependencies)
