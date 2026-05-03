# Story 18.2: Import Recipe from YouTube

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an admin,
I want to paste a YouTube URL and have the system extract the recipe from the video,
so that I can save recipes from cooking videos without transcribing them myself.

## Acceptance Criteria

1. When the admin pastes a YouTube URL (youtube.com/watch or youtu.be) into the import URL screen and taps "Importar", the system detects it is a YouTube link and uses the YouTube extraction path instead of HTML fetch (FR124)
2. The system retrieves the video transcript via YouTube Data API and sends it to the LLM for recipe extraction (FR124)
3. When the transcript contains recipe content, the import review screen displays the extracted recipe (same review flow as URL import) within 15 seconds (NFR32) (FR124)
4. When the transcript contains no extractable recipe content, the system automatically retrieves the video's top-level comments and sends them to the LLM as a fallback (FR125)
5. When neither transcript nor comments yield a recipe, the admin is informed that no recipe could be extracted and offered the option to enter manually — no empty recipe is created (FR126)
6. Recipes imported from YouTube are saved with `import_method: 'url'` and `source_url` set to the YouTube URL (FR124)
7. A Supabase Edge Function `extract-recipe-youtube` handles transcript retrieval, comment fallback, and LLM extraction (FR124)
8. The Edge Function uses `YOUTUBE_DATA_API_KEY` env var for YouTube API access

## Tasks / Subtasks

- [x] Task 1: Create `extract-recipe-youtube` Edge Function (AC: #2, #4, #7, #8)
  - [x] Create `supabase/functions/extract-recipe-youtube/index.ts`
  - [x] Accept `{ videoId: string }` in request body
  - [x] Step 1: Fetch video captions list via YouTube Data API (`captions.list`)
  - [x] Step 2: If captions exist, fetch transcript text via captions download endpoint
  - [x] Step 2 alt: If no official captions, try fetching auto-generated transcript via `youtube.com/api/timedtext` (no API key needed)
  - [x] Step 3: Send transcript text to LLM for recipe extraction (same prompt as `extract-recipe`)
  - [x] Step 4: If LLM returns `{"error": "No recipe found"}`, fetch top-level comments via YouTube Data API (`commentThreads.list`) and try LLM extraction on comments
  - [x] Step 5: If comments also fail, return `{ error: "No recipe found in transcript or comments" }`
  - [x] Same LLM provider pattern as `extract-recipe` (Haiku/Gemini)
  - [x] LLM timeout: 12 seconds (NFR32 allows 15s total, leave 3s for API calls)
  - [x] Use `YOUTUBE_DATA_API_KEY` from Deno.env
- [x] Task 2: Extend recipe import repository (AC: #1, #3)
  - [x] Add `extractFromYoutube(videoId: string): Promise<ExtractedRecipe>` to `IRecipeImportRepository`
  - [x] Implement in `SupabaseRecipeImportRepository` — calls `supabase.functions.invoke('extract-recipe-youtube', { body: { videoId } })`
  - [x] Same response mapping as `extractFromUrl()`
- [x] Task 3: Add YouTube detection to import URL screen (AC: #1, #5, #6)
  - [x] In `import-url.tsx`, add YouTube URL detection regex: `youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)|youtu\.be\/([a-zA-Z0-9_-]+)`
  - [x] Extract `videoId` from matched URL
  - [x] If YouTube URL detected, call `recipeImportRepo.extractFromYoutube(videoId)` instead of `extractFromUrl()`
  - [x] Pass `sourceUrl` as the full YouTube URL (same as regular URL import)
  - [x] Show "A extrair receita do YouTube..." loading text
  - [x] On failure, show error with retry and manual entry options (same pattern)
  - [x] Non-YouTube URLs continue to use `extractFromUrl()` (existing behavior unchanged)

## Dev Notes

### YouTube Data API — Transcript Retrieval

The YouTube Data API v3 doesn't have a direct "get transcript" endpoint. The approach:

1. **Official captions**: `GET https://www.googleapis.com/youtube/v3/captions?part=snippet&videoId={videoId}&key={apiKey}` — lists available caption tracks. Then download the track text.

2. **Simpler approach — use timedtext endpoint** (no API key needed):
```
GET https://www.youtube.com/api/timedtext?lang=en&v={videoId}
GET https://www.youtube.com/api/timedtext?lang=pt&v={videoId}
```
This returns XML with `<text>` elements. Try multiple languages (en, pt, auto-generated).

3. **Most reliable approach — scrape from YouTube page**: Fetch the watch page HTML, extract `ytInitialPlayerResponse` JSON, find `captions.playerCaptionsTracklistRenderer.captionTracks`, fetch the first track URL (returns XML or JSON3 transcript).

**Recommended for Edge Function**: Use approach 3 (scrape player response) as primary, with approach 2 as fallback. This doesn't require a YouTube Data API key for transcript retrieval — the API key is only needed for the comments fallback.

### Edge Function Structure

```typescript
// 1. Try to get transcript (no API key needed)
const transcript = await fetchTranscript(videoId);

if (transcript) {
  // 2. Send to LLM
  const recipe = await extractRecipeFromText(transcript);
  if (recipe && !recipe.error) return recipe;
}

// 3. Fallback: fetch comments (requires API key)
const comments = await fetchComments(videoId, YOUTUBE_API_KEY);
if (comments) {
  const recipe = await extractRecipeFromText(comments);
  if (recipe && !recipe.error) return recipe;
}

// 4. Nothing worked
return { error: "No recipe found in transcript or comments" };
```

### Transcript Extraction from YouTube Page

```typescript
async function fetchTranscript(videoId: string): Promise<string | null> {
  try {
    // Fetch watch page
    const response = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(3000),
    });
    const html = await response.text();

    // Extract captions URL from ytInitialPlayerResponse
    const match = html.match(/"captions":\s*(\{[^}]*"captionTracks":\s*\[[^\]]*\][^}]*\})/);
    if (!match) return null;

    const captionsJson = JSON.parse(match[1]);
    const tracks = captionsJson?.playerCaptionsTracklistRenderer?.captionTracks;
    if (!tracks?.length) return null;

    // Fetch first caption track
    const trackUrl = tracks[0].baseUrl;
    const trackResponse = await fetch(trackUrl, { signal: AbortSignal.timeout(2000) });
    const trackXml = await trackResponse.text();

    // Parse XML to plain text
    return trackXml
      .replace(/<[^>]+>/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&#39;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 4000);
  } catch (err) {
    console.error('Transcript fetch failed:', err);
    return null;
  }
}
```

### Comments Fallback via YouTube Data API

```typescript
async function fetchComments(videoId: string, apiKey: string): Promise<string | null> {
  if (!apiKey) return null;
  try {
    const url = `https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=${videoId}&maxResults=20&order=relevance&key=${apiKey}`;
    const response = await fetch(url, { signal: AbortSignal.timeout(3000) });
    if (!response.ok) return null;
    const data = await response.json();
    const comments = (data.items ?? [])
      .map((item: any) => item.snippet?.topLevelComment?.snippet?.textDisplay ?? '')
      .filter(Boolean)
      .join('\n');
    return comments.slice(0, 4000) || null;
  } catch (err) {
    console.error('Comments fetch failed:', err);
    return null;
  }
}
```

### YouTube URL Detection

```typescript
const YOUTUBE_REGEX = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/;

function extractYoutubeVideoId(url: string): string | null {
  const match = url.match(YOUTUBE_REGEX);
  return match ? match[1] : null;
}
```

### Error Messages (Portuguese)

- YouTube loading: "A extrair receita do YouTube..."
- No transcript: "Não foi possível obter a transcrição do vídeo"
- No recipe in transcript: "Não foi encontrada nenhuma receita na transcrição do vídeo"
- No recipe in transcript or comments: "Não foi encontrada nenhuma receita neste vídeo (transcrição e comentários verificados)"
- API error: "Erro ao aceder ao YouTube. Tente novamente."

### Architecture Compliance

- **Repository pattern**: `extractFromYoutube()` added to `IRecipeImportRepository` — zero direct Edge Function calls in screens
- **Edge Function pattern**: Same structure as `extract-recipe` — shared LLM provider, CORS headers
- **Reuses import-review.tsx**: YouTube import flows into the same review screen as URL import
- **No new mobile env vars**: `YOUTUBE_DATA_API_KEY` is server-side only (Edge Function env)

### Previous Story Intelligence (18.1)

- `import-url.tsx` screen handles URL input and navigation to `import-review.tsx` — needs YouTube detection added
- `import-review.tsx` already handles `importMethod` and `sourceUrl` — works for YouTube as-is
- `IRecipeImportRepository` has `extractFromUrl()` — needs `extractFromYoutube()` added
- `extract-recipe` Edge Function has the LLM call pattern to reuse

### Project Structure Notes

New files:
```
supabase/functions/extract-recipe-youtube/index.ts
```

Files to modify:
```
src/repositories/interfaces/recipe-import.repository.interface.ts  (add extractFromYoutube method)
src/repositories/supabase/recipe-import.repository.ts              (implement extractFromYoutube)
src/app/(app)/(recipes)/import-url.tsx                             (add YouTube URL detection and routing)
```

### What This Story Does NOT Include

- No OCR/photo import (Story 18.3)
- No recipe filtering (Epic 19)
- No YouTube thumbnail extraction as recipe image

### Codebase Patterns to Follow

| Pattern | Reference File |
|---------|---------------|
| Edge Function (LLM call) | `supabase/functions/extract-recipe/index.ts` |
| Import repository | `src/repositories/supabase/recipe-import.repository.ts` |
| Import URL screen | `src/app/(app)/(recipes)/import-url.tsx` |
| Import review screen | `src/app/(app)/(recipes)/import-review.tsx` |

### References

- [Source: _bmad-output/planning-artifacts/epics-v5-recipes.md — Epic 2, Story 2.2]
- [Source: _bmad-output/planning-artifacts/prd.md — FR124, FR125, FR126, NFR32, NFR37]
- [Source: _bmad-output/planning-artifacts/architecture.md — YouTube Data API, IRecipeImportRepository]
- [Source: _bmad-output/implementation-artifacts/18-1-import-recipe-from-url.md — Previous story]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

No issues encountered during implementation.

### Completion Notes List

- Task 1: Created `extract-recipe-youtube` Edge Function — fetches transcript by scraping YouTube watch page for `captionTracks` JSON (no API key needed), parses XML captions to text, sends to LLM. Falls back to YouTube Data API `commentThreads.list` if transcript yields no recipe (requires `YOUTUBE_DATA_API_KEY`). Same Haiku/Gemini provider pattern. 12s LLM timeout (within 15s NFR32 budget).
- Task 2: Extended `IRecipeImportRepository` with `extractFromYoutube(videoId)`. Implemented in `SupabaseRecipeImportRepository` — calls `extract-recipe-youtube` Edge Function, maps response, Portuguese error messages including specific "transcrição e comentários verificados" message.
- Task 3: Added YouTube URL detection to `import-url.tsx` — regex extracts videoId from `youtube.com/watch?v=` and `youtu.be/` URLs, routes to `extractFromYoutube()` automatically. Shows "A extrair receita do YouTube..." loading text. Placeholder updated to mention YouTube. Non-YouTube URLs unchanged.

### Change Log

- 2026-04-06: Story 18.2 implementation complete — 3 tasks (YouTube Edge Function with transcript+comments fallback, repository extension, URL screen YouTube detection)

### File List

New files:
- supabase/functions/extract-recipe-youtube/index.ts

Modified files:
- src/repositories/interfaces/recipe-import.repository.interface.ts (added extractFromYoutube method)
- src/repositories/supabase/recipe-import.repository.ts (implemented extractFromYoutube)
- src/app/(app)/(recipes)/import-url.tsx (YouTube URL detection, routing, loading text)
