# Story 18.3: Import Recipe from Photo (OCR)

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an admin,
I want to take a photo of a printed or handwritten recipe and have the system extract it,
so that I can digitize family recipes and recipes from books or magazines.

## Acceptance Criteria

1. When the admin taps the FAB (+), the action sheet includes a third option: "Importar de Foto" alongside "Entrada Manual" and "Importar de URL" (FR127)
2. When the admin selects "Importar de Foto", they can choose to capture a photo (camera) or select from gallery — using `expo-image-picker` already installed (FR127)
3. The system requests CAMERA permission on first camera capture, not at module entry (FR127)
4. After the image is captured/selected, the system sends the image to an LLM with vision capabilities for recipe extraction, showing a loading indicator (FR127)
5. The import review screen displays the extracted recipe fields for review and editing — same review flow as URL and YouTube import (FR128)
6. The full image → LLM pipeline completes within 10 seconds (NFR33)
7. When the LLM produces incomplete or garbled extraction, the admin can correct errors in the review screen before saving (FR128)
8. The recipe is saved with `import_method: 'ocr'` (FR128)
9. A Supabase Edge Function `extract-recipe-photo` accepts base64 image data and uses LLM vision (Gemini Flash or Claude) to extract recipe fields directly from the image — no separate OCR step needed

## Tasks / Subtasks

- [x] Task 1: Create `extract-recipe-photo` Edge Function (AC: #4, #6, #9)
  - [x] Create `supabase/functions/extract-recipe-photo/index.ts`
  - [x] Accept `{ imageBase64: string, mimeType: string }` in request body
  - [x] Send image + recipe extraction prompt to LLM with vision capabilities
  - [x] Gemini: use `inlineData` with base64 image in `contents.parts`
  - [x] Haiku: use `image` content block with `base64` source in messages
  - [x] Same recipe JSON output format as `extract-recipe`
  - [x] LLM timeout: 8 seconds (NFR33 requires total <10s)
  - [x] Return structured recipe JSON or `{ error }` on failure
- [x] Task 2: Extend recipe import repository (AC: #4)
  - [x] Add `extractFromPhoto(imageBase64: string, mimeType: string): Promise<ExtractedRecipe>` to `IRecipeImportRepository`
  - [x] Implement in `SupabaseRecipeImportRepository` — calls `supabase.functions.invoke('extract-recipe-photo', { body: { imageBase64, mimeType } })`
  - [x] Same response mapping as other extract methods
- [x] Task 3: Add "Importar de Foto" to FAB action sheet (AC: #1)
  - [x] In `src/app/(app)/(recipes)/index.tsx`, add third option to Alert: "Importar de Foto" → navigates to `/(app)/(recipes)/import-photo`
- [x] Task 4: Create photo import screen (AC: #2, #3, #4, #5, #7, #8)
  - [x] Create `src/app/(app)/(recipes)/import-photo.tsx`
  - [x] On mount, immediately show image source picker (camera vs gallery) via Alert or inline buttons
  - [x] Use `expo-image-picker` (`launchCameraAsync` / `launchImageLibraryAsync`) — already installed
  - [x] Request CAMERA permission only when camera is selected (not on gallery)
  - [x] After image selected, read as base64 via `FileSystem.readAsStringAsync` with base64 encoding
  - [x] Call `recipeImportRepo.extractFromPhoto(base64, mimeType)`, show loading
  - [x] On success, navigate to `/(app)/(recipes)/import-review` with `importMethod: 'ocr'` param
  - [x] On error, show Snackbar with retry option
  - [x] Show image preview while extracting

## Dev Notes

### Architecture Decision: LLM Vision Instead of OCR

The original spec mentions `react-native-mlkit-ocr` for on-device OCR. However:
- `react-native-mlkit-ocr` may have Expo SDK 55 compatibility issues (noted in epics)
- Both Gemini Flash and Claude Haiku support multimodal vision input
- Sending the image directly to the LLM is **more accurate** than OCR → text → LLM (eliminates OCR error propagation)
- Simpler architecture: no additional native dependency, runs entirely via Edge Function
- Stays within 10s NFR33 budget

This is a deliberate architectural improvement over the original spec while preserving the user-facing behavior. The `import_method` remains `'ocr'` for consistency with the PRD.

### Edge Function: LLM Vision API

**Gemini with image:**
```typescript
const response = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    contents: [{
      parts: [
        { inlineData: { mimeType, data: imageBase64 } },
        { text: recipeExtractionPrompt },
      ],
    }],
    generationConfig: { temperature: 0, maxOutputTokens: 2000 },
  }),
});
```

**Claude Haiku with image:**
```typescript
const response = await fetch(ANTHROPIC_URL, {
  method: "POST",
  headers: { ... },
  body: JSON.stringify({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 2000,
    messages: [{
      role: "user",
      content: [
        {
          type: "image",
          source: { type: "base64", media_type: mimeType, data: imageBase64 },
        },
        {
          type: "text",
          text: recipeExtractionPrompt,
        },
      ],
    }],
  }),
});
```

### Image Capture and Base64 Conversion

```typescript
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';

// Capture or pick image
const result = await ImagePicker.launchCameraAsync({
  allowsEditing: true,
  quality: 0.8,
});

if (!result.canceled) {
  const uri = result.assets[0].uri;
  const mimeType = result.assets[0].mimeType ?? 'image/jpeg';

  // Read as base64
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  // Send to Edge Function
  const extracted = await recipeImportRepo.extractFromPhoto(base64, mimeType);
}
```

**Note:** `expo-file-system` is already included in Expo SDK 55 (no install needed).

### Photo Import Screen Flow

```
[Importar de Foto]
  ↓
[Camera / Galeria buttons]
  ↓ (user picks image)
[Image preview + loading spinner]
  ↓ (LLM extraction)
[Navigate to import-review.tsx with extracted data + importMethod='ocr']
```

### Import Review Screen — OCR Import Method

The existing `import-review.tsx` needs a minor update to support `importMethod` from route params:
- Currently hardcodes `importMethod: 'url'`
- Should accept `importMethod` param (default: `'url'`) and pass it to `recipeRepo.create()`
- For photo imports, pass `importMethod: 'ocr'` via route params

### Error Messages (Portuguese)

- Photo loading: "A extrair receita da foto..."
- Photo extraction failed: "Não foi possível extrair a receita da foto. Tente com uma foto mais nítida."
- No recipe in photo: "Não foi encontrada nenhuma receita nesta foto."
- Camera permission denied: "Permissão da câmara necessária para tirar fotos"

### Architecture Compliance

- **Repository pattern**: `extractFromPhoto()` added to `IRecipeImportRepository`
- **Edge Function**: Same LLM provider pattern, CORS headers
- **No new native dependencies**: Uses `expo-image-picker` (already installed) + `expo-file-system` (built into Expo)
- **Reuses import-review.tsx**: Same review flow as URL and YouTube

### Previous Story Intelligence (18.1, 18.2)

- FAB action sheet already has "Entrada Manual" and "Importar de URL" — add "Importar de Foto"
- `import-review.tsx` already pre-populates from extracted data — needs `importMethod` param support
- `IRecipeImportRepository` already has `extractFromUrl()` and `extractFromYoutube()` — add `extractFromPhoto()`
- `extract-recipe` Edge Function has the LLM and response patterns to reuse

### Project Structure Notes

New files:
```
supabase/functions/extract-recipe-photo/index.ts
src/app/(app)/(recipes)/import-photo.tsx
```

Files to modify:
```
src/repositories/interfaces/recipe-import.repository.interface.ts  (add extractFromPhoto method)
src/repositories/supabase/recipe-import.repository.ts              (implement extractFromPhoto)
src/app/(app)/(recipes)/index.tsx                                  (add "Importar de Foto" to FAB action sheet)
src/app/(app)/(recipes)/import-review.tsx                          (accept importMethod from route params)
```

### What This Story Does NOT Include

- No on-device OCR library (`react-native-mlkit-ocr`) — LLM vision replaces it
- No recipe filtering (Epic 19)
- No batch photo import (single image at a time)

### Codebase Patterns to Follow

| Pattern | Reference File |
|---------|---------------|
| Edge Function (LLM call) | `supabase/functions/extract-recipe/index.ts` |
| Import repository | `src/repositories/supabase/recipe-import.repository.ts` |
| Image picker usage | `src/app/(app)/(recipes)/new.tsx` (pickImage/takePhoto functions) |
| Import review screen | `src/app/(app)/(recipes)/import-review.tsx` |
| FAB action sheet | `src/app/(app)/(recipes)/index.tsx` |

### References

- [Source: _bmad-output/planning-artifacts/epics-v5-recipes.md — Epic 2, Story 2.3]
- [Source: _bmad-output/planning-artifacts/prd.md — FR127, FR128, NFR33]
- [Source: _bmad-output/planning-artifacts/architecture.md — OCR, LLM import pipeline]
- [Source: _bmad-output/implementation-artifacts/18-1-import-recipe-from-url.md]
- [Source: _bmad-output/implementation-artifacts/18-2-import-recipe-from-youtube.md]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

- Fixed TS error: `FileSystem.EncodingType.Base64` not exported from expo-file-system main index — used string literal `'base64'` instead.

### Completion Notes List

- Task 1: Created `extract-recipe-photo` Edge Function — accepts `imageBase64` + `mimeType`, sends to LLM with vision capabilities (Gemini `inlineData` / Claude `image` content block), same recipe JSON output format and response handling as `extract-recipe`. 8s LLM timeout.
- Task 2: Extended `IRecipeImportRepository` with `extractFromPhoto(imageBase64, mimeType)`. Implemented in `SupabaseRecipeImportRepository` — calls Edge Function, maps response, Portuguese error messages.
- Task 3: Added "Importar de Foto" as third option in FAB action sheet on recipe list screen.
- Task 4: Created `import-photo.tsx` screen — camera/gallery picker buttons, captures image via `expo-image-picker`, reads as base64 via `expo-file-system`, calls `recipeImportRepo.extractFromPhoto()`, shows image preview with loading overlay during extraction, navigates to `import-review` with `importMethod: 'ocr'`. Updated `import-review.tsx` to accept `importMethod` from route params instead of hardcoding `'url'`.

### Change Log

- 2026-04-06: Story 18.3 implementation complete — 4 tasks (photo Edge Function with LLM vision, repository extension, FAB update, photo import screen). Completes Epic 18 (Smart Recipe Import).

### File List

New files:
- supabase/functions/extract-recipe-photo/index.ts
- src/app/(app)/(recipes)/import-photo.tsx

Modified files:
- src/repositories/interfaces/recipe-import.repository.interface.ts (added extractFromPhoto method)
- src/repositories/supabase/recipe-import.repository.ts (implemented extractFromPhoto)
- src/app/(app)/(recipes)/index.tsx (added "Importar de Foto" to FAB action sheet)
- src/app/(app)/(recipes)/import-review.tsx (accept importMethod from route params)
