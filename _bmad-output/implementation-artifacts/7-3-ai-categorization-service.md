# Story 7.3: AI Categorization Service

Status: review

## Story

As a developer,
I want new shopping items to be auto-categorized by an AI classification service when they're first added,
So that items land in the correct category without manual effort.

## Acceptance Criteria

1. **Given** `IClassificationRepository` is defined in `src/repositories/interfaces/classification.repository.interface.ts`, **Then** it declares: `classifyItem(itemName: string, categories: string[]): Promise<string>` returning a category name. **And** the interface follows the repository pattern (NFR21).

2. **Given** the Supabase Edge Function `classify-item` exists, **When** it receives a POST with `{ itemName: string, categories: string[] }`, **Then** it calls the Gemini Flash API with a prompt that asks the model to pick the best category for the item from the provided list. **And** returns `{ category: string }` with the selected category name.

3. **Given** the Edge Function implementation, **When** Gemini Flash is called, **Then** the prompt is minimal (item name + category list + instruction to return only the category name). **And** the response is parsed to extract only the category name string.

4. **Given** the client-side repository implementation exists at `src/repositories/supabase/classification.repository.ts`, **Then** it calls the `classify-item` Edge Function via `supabase.functions.invoke()`. **And** `RepositoryContext` provides the singleton.

5. **Given** a new item "coriander" is added that has never existed in the shopping list, **When** the add flow executes, **Then** the system calls `classifyItem("coriander", [category list])` (FR68). **And** the returned category (e.g., "Vegetables") is used instead of "Other". **And** the item is saved with the AI-assigned category.

6. **Given** an item "milk" already exists and is ticked, **When** the add flow detects the match, **Then** the existing item is unticked without calling the classification service (FR69). The existing category is preserved.

7. **Given** the admin previously reclassified "toilet paper" from "Hygiene" to "Cleaning", **When** "toilet paper" is added again (unticked from ticked), **Then** the system uses "Cleaning" — it does not call the classification service (FR70).

8. **Given** the Edge Function is unreachable or Gemini times out (>2 seconds, NFR23), **When** a new item is added, **Then** the item is assigned to the "Other" category (FR73). **And** the item is created successfully — classification failure never blocks item creation.

9. **Given** Gemini Flash free tier pricing, **When** measured over a month of family-scale usage (~100 items), **Then** total cost remains under €1/month (NFR25). Gemini Flash free tier covers this entirely.

10. **Given** the Edge Function requires a Gemini API key, **Then** the key is stored as a Supabase Edge Function secret (`GEMINI_API_KEY`), not in client-side `.env` files.

## Tasks / Subtasks

- [x] Task 1: Supabase Edge Function setup (AC: #2, #3, #10)
  - [x] Create `supabase/functions/classify-item/index.ts` (Deno runtime)
  - [x] Read `GEMINI_API_KEY` from `Deno.env.get()` — returns "Other" fallback if not set
  - [x] Accept POST body: `{ itemName: string, categories: string[] }`
  - [x] Call Gemini Flash API with minimal prompt, `temperature: 0`, `maxOutputTokens: 20`
  - [x] Parse response: extract `candidates[0].content.parts[0].text`, trim, case-insensitive validate against category list
  - [x] If response not in category list → return "Other"
  - [x] Return JSON `{ category: string }`
  - [x] `AbortSignal.timeout(2000)` enforces 2-second timeout (NFR23)
  - [x] All error paths return `{ category: "Other" }` — never returns error status
  - [x] CORS headers for Supabase client calls
- [ ] Task 2: Deploy Edge Function and set secret (AC: #10)
  - [ ] Deploy: `npx supabase functions deploy classify-item`
  - [ ] Set secret: `npx supabase secrets set GEMINI_API_KEY=<key>`
  - [ ] Verify deployment: test with curl or Supabase dashboard
- [x] Task 3: Classification repository interface (AC: #1)
  - [x] Create `src/repositories/interfaces/classification.repository.interface.ts`
  - [x] `IClassificationRepository` with `classifyItem(itemName, categories): Promise<string>`
- [x] Task 4: Classification repository implementation (AC: #4)
  - [x] Create `src/repositories/supabase/classification.repository.ts`
  - [x] Calls Edge Function via `this.client.functions.invoke('classify-item', ...)`
  - [x] Double-validates: checks returned category is in the categories list
  - [x] NEVER throws — catches all errors, returns `OTHER_CATEGORY_NAME`
- [x] Task 5: Repository context update (AC: #4)
  - [x] Added `classification: IClassificationRepository` to `RepositoryContextValue`
  - [x] Instantiated `SupabaseClassificationRepository` in `RepositoryProvider`
  - [x] Added type export to `src/repositories/index.ts`
- [x] Task 6: Integrate into shopping add flow (AC: #5, #6, #7, #8)
  - [x] Modified `src/app/(app)/(shopping)/index.tsx` `handleAdd` function
  - [x] Added `classificationRepo = useRepository("classification")`
  - [x] After dedup check passes: calls `classificationRepo.classifyItem(name, categoryNames)`
  - [x] Finds category ID matching returned name, falls back to "Other" then first category
  - [x] Dedup logic (FR69 untick, FR70 reclassification) unchanged — classification only for truly new items

## Dev Notes

### Architecture Compliance

- **Repository pattern (NFR21):** `IClassificationRepository` is a typed interface. The Supabase implementation calls the Edge Function. If Gemini is swapped for another provider, only the Edge Function changes — the client-side interface stays the same.
- **Edge Function as the AI boundary:** The LLM API key lives server-side only. Client calls `supabase.functions.invoke()` which is authenticated via the user's Supabase JWT. No LLM credentials on the device.
- **Graceful degradation (FR73):** The repository implementation NEVER throws on classification failure. It catches all errors and returns `"Other"`. The shopping screen doesn't need try/catch around classification — it always gets a valid category name.

### Edge Function: Deno Runtime

Supabase Edge Functions use Deno, not Node.js. Key differences:
- Import from URLs: `import { serve } from "https://deno.land/std@0.168.0/http/server.ts"`
- Environment variables: `Deno.env.get("GEMINI_API_KEY")`
- Native `fetch` available (no axios/node-fetch needed)
- TypeScript out of the box, no build step

### Gemini Flash API Call Pattern

```typescript
const response = await fetch(
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0,
        maxOutputTokens: 20,
      },
    }),
    signal: AbortSignal.timeout(2000),
  },
);
```

- `temperature: 0` for deterministic classification
- `maxOutputTokens: 20` — we only need a single category name
- `AbortSignal.timeout(2000)` enforces the 2-second NFR23 timeout
- API key passed as query parameter (Gemini API pattern)

### Client-Side Classification Repository Pattern

```typescript
export class SupabaseClassificationRepository implements IClassificationRepository {
  constructor(private readonly client: SupabaseClient) {}

  async classifyItem(itemName: string, categories: string[]): Promise<string> {
    try {
      const { data, error } = await this.client.functions.invoke('classify-item', {
        body: { itemName, categories },
      });
      if (error) throw error;
      return data?.category ?? OTHER_CATEGORY_NAME;
    } catch (err) {
      logger.warn("ClassificationRepository", "classify failed, using Other", err);
      return OTHER_CATEGORY_NAME;
    }
  }
}
```

Key: this method NEVER throws. It always returns a valid category name.

### Shopping Screen Integration Point

In `handleAdd` (currently in `src/app/(app)/(shopping)/index.tsx`), replace:
```typescript
// OLD: hardcoded "Other"
const otherCat = categories.find((c) => c.name === OTHER_CATEGORY_NAME);
const categoryId = otherCat?.id ?? categories[0]?.id;
```

With:
```typescript
// NEW: AI classification
const categoryNames = categories.map((c) => c.name);
const classifiedName = await classificationRepo.classifyItem(data.name, categoryNames);
const matchedCat = categories.find((c) => c.name === classifiedName);
const categoryId = matchedCat?.id ?? categories.find((c) => c.name === OTHER_CATEGORY_NAME)?.id ?? categories[0]?.id;
```

The dedup flow (FR69 untick existing, FR70 reclassification preserved) runs BEFORE this — classification is only reached for truly new items.

### File Locations (Exact Paths)

```
supabase/functions/classify-item/index.ts             ← NEW (Edge Function)
src/repositories/interfaces/classification.repository.interface.ts ← NEW
src/repositories/supabase/classification.repository.ts ← NEW
src/repositories/repository.context.tsx                ← MODIFY (add classification repo)
src/repositories/index.ts                              ← MODIFY (add type export)
src/app/(app)/(shopping)/index.tsx                     ← MODIFY (integrate classification into handleAdd)
```

### Existing Code to Reference (Don't Reinvent)

- `src/repositories/supabase/leftover.repository.ts` — repository class pattern
- `src/repositories/repository.context.tsx` — how to add new repository
- `src/app/(app)/(shopping)/index.tsx` — current `handleAdd` to modify
- `src/constants/shopping-defaults.ts` — `OTHER_CATEGORY_NAME` for fallback

### Testing

- Test Edge Function locally: `npx supabase functions serve classify-item` then curl
- Test client repository: mock `supabase.functions.invoke` response
- Test fallback: simulate timeout/error → verify "Other" returned
- Test shopping screen integration: verify AI category is used for new items, "Other" on failure

### References

- [Source: _bmad-output/planning-artifacts/prd.md#AI Categorization] — FR68–FR73
- [Source: _bmad-output/planning-artifacts/prd.md#Non-Functional Requirements] — NFR23 (2s timeout), NFR25 (<€1/month)
- [Source: _bmad-output/planning-artifacts/epics.md#Story 7.3] — acceptance criteria
- [Source: _bmad-output/implementation-artifacts/7-2-shopping-list-screen-living-list-and-category-grouping.md] — current handleAdd flow

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

- Task 2 (deploy + secrets) left unchecked — requires user to provide their Gemini API key and run the deploy command. Cannot be done autonomously.
- Edge Function uses `AbortSignal.timeout(2000)` — Deno supports this natively (no polyfill needed).
- Client-side repository double-validates the returned category against the provided category list — even if the Edge Function validates too, the client doesn't trust the response blindly.

### Completion Notes List

- Edge Function created: `supabase/functions/classify-item/index.ts` — first Edge Function in the project
- Deno runtime with native `fetch`, `AbortSignal.timeout`, TypeScript
- Prompt is minimal: item name + comma-separated categories + "reply with only the category name"
- `temperature: 0` for deterministic output, `maxOutputTokens: 20` for cost efficiency
- All error paths (missing API key, Gemini error, timeout, invalid response, network failure) return "Other" — NEVER returns an error
- Client-side `SupabaseClassificationRepository` also never throws — wraps all errors and returns `OTHER_CATEGORY_NAME`
- Shopping screen `handleAdd` now calls `classificationRepo.classifyItem()` for new items instead of hardcoded "Other"
- **PENDING:** Task 2 — user needs to deploy the Edge Function and set the `GEMINI_API_KEY` secret

### Change Log

- 2026-03-31: Story 7.3 implemented — Edge Function, classification repository, shopping screen integration. Deployment pending user action.

### File List

**New files:**
- supabase/functions/classify-item/index.ts
- src/repositories/interfaces/classification.repository.interface.ts
- src/repositories/supabase/classification.repository.ts

**Modified files:**
- src/repositories/repository.context.tsx (added classification repo)
- src/repositories/index.ts (added type export)
- src/app/(app)/(shopping)/index.tsx (integrated AI classification into handleAdd)
