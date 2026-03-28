# Story 4.3: Automatic Template Application at Trip Creation

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an Admin,
I want to configure a trip with profiles, categories, and tags so the system automatically injects all matching template items,
so that the packing list is populated without me manually selecting which templates to apply.

## Acceptance Criteria

1. **Given** templates exist and a new vacation is being created
   **When** the trip creation bottom sheet is open
   **Then** in addition to title, destination, and dates, the Admin selects:
   - Participantes (profiles going) — already exists
   - Categorias (which categories to include) — NEW
   - Etiquetas da viagem (tags that describe this trip) — NEW

2. **Given** the trip configuration is complete and the Admin taps "Criar"
   **When** the vacation is created
   **Then** the system queries all template items and applies matching rules:
   - Category filter: item's `category_id` is null OR matches one of the trip's selected categories
   - Tag filter: item has no tags OR at least one of the item's tags is in the trip's selected tags
   **And** items that pass both filters are injected as packing items

3. **Given** a matching template item has `profile_id = null`
   **When** it is injected
   **Then** one packing item is created per trip participant, each assigned to their respective profile

4. **Given** a matching template item has `profile_id = Filipe`
   **When** Filipe is in the trip participants
   **Then** one packing item is created assigned to Filipe only

5. **Given** a matching template item has `profile_id = Isabel`
   **When** Isabel is NOT in the trip participants
   **Then** no packing item is created for that template item

6. **Given** two matching template items have the same title and category
   **When** injected into the same trip
   **Then** they are treated as separate items — no automatic deduplication

7. **Given** the trip is created with no categories or no tags selected
   **When** template matching runs
   **Then** only template items with null category (if no categories selected) and no tags (if no tags selected) are injected

## Tasks / Subtasks

- [x] Task 1: Add category and tag selection to vacation creation form (AC: #1)
  - [x] 1.1 Load categories and tags in VacationsScreen (add `useRepository('category')`, `useRepository('tag')`, `useRepository('template')`)
  - [x] 1.2 Add `formCategories: Set<string>` and `formTags: Set<string>` state to track selected categories and tags
  - [x] 1.3 Add category chip picker UI below participants section (label "Categorias", horizontal scroll of toggle chips with icon + name, multi-select)
  - [x] 1.4 Add tag chip picker UI below categories section (label "Etiquetas da viagem", wrap layout of toggle chips, multi-select)
  - [x] 1.5 Reset formCategories and formTags in `openCreate()`

- [x] Task 2: Implement `applyTemplate` in SupabaseTemplateRepository (AC: #2, #3, #4, #5, #6, #7)
  - [x] 2.1 Replace the stub `applyTemplate` with real implementation
  - [x] 2.2 Accept additional parameters: `participantProfileIds: string[]`, `selectedCategoryIds: string[]`, `selectedTagIds: string[]`
  - [x] 2.3 Load ALL templates for the family via `getTemplates(familyId)`
  - [x] 2.4 For each template item, apply category filter: pass if item's `categoryId` is null OR `categoryId` is in `selectedCategoryIds`; if `selectedCategoryIds` is empty, only pass items with null `categoryId`
  - [x] 2.5 For each template item, apply tag filter: pass if item has no tags (empty `tagIds`) OR at least one of item's `tagIds` is in `selectedTagIds`; if `selectedTagIds` is empty, only pass items with empty `tagIds`
  - [x] 2.6 For matching items with `profileId = null`: create one packing item per participant profile
  - [x] 2.7 For matching items with specific `profileId`: create packing item only if profileId is in `participantProfileIds`, skip otherwise
  - [x] 2.8 Create packing items via `powerSyncDb.execute()` INSERT using the same schema as `packing-item.repository.ts` (vacation_id, family_id, title, status='new', profile_id, quantity, category_id, notes=null)
  - [x] 2.9 No deduplication — each matching template item creates its own packing item(s)

- [x] Task 3: Update ITemplateRepository interface (AC: #2)
  - [x] 3.1 Update `applyTemplate` signature to accept the new parameters: `applyTemplate(familyId: string, vacationId: string, participantProfileIds: string[], selectedCategoryIds: string[], selectedTagIds: string[]): Promise<number>` — returns count of created packing items

- [x] Task 4: Call template application after vacation creation (AC: #2)
  - [x] 4.1 In `handleSave()` in vacations/index.tsx, after `vacationRepository.createVacation()` succeeds, call `templateRepository.applyTemplate()` with familyId, created vacation id, participantProfileIds, selected category ids, and selected tag ids
  - [x] 4.2 Handle the case where no templates exist (applyTemplate returns 0 — no error)
  - [x] 4.3 Log the count of injected packing items for debugging

- [x] Task 5: Type-check and lint verification (AC: all)
  - [x] 5.1 Run `npx tsc --noEmit` — zero errors
  - [x] 5.2 Run linter if configured — zero errors

## Dev Notes

### Architecture Requirements

- **PowerSync local-first**: Template matching and packing item injection must use `powerSyncDb.execute()` — NEVER supabaseClient directly.
- **Template application happens in the repository layer**, not in the UI component. The UI calls `applyTemplate()` after vacation creation; the repository handles all matching logic and packing item insertion.
- **No changes to Supabase migration or PowerSync schema needed** — all required tables exist from Stories 4.1 and 4.2.

### Existing Code to Reuse (DO NOT Reinvent)

- **Vacation creation screen** (`src/app/(app)/vacations/index.tsx`): This is the file to modify. It already has participants selection with chip-style toggles. Add category and tag pickers using the same chip pattern.
- **Template repository** (`src/repositories/supabase/template.repository.ts`): Contains `getTemplates()` which already loads all template items with their tagIds. The `applyTemplate()` stub is here — replace it.
- **Packing item insertion pattern**: See `src/repositories/supabase/packing-item.repository.ts` `createPackingItem()` for the correct INSERT SQL and column mapping. The template injection should use the same INSERT pattern: `INSERT INTO packing_items (id, vacation_id, family_id, title, status, profile_id, quantity, category_id, notes, created_at, updated_at)`.
- **Category repository** (`src/repositories/supabase/category.repository.ts`): Use `getCategories()` to load categories for the picker.
- **Tag repository** (`src/repositories/supabase/tag.repository.ts`): Use `getTags()` to load tags for the picker.
- **Chip UI pattern**: See `src/app/(app)/settings/templates.tsx` item sub-form for the chip-based profile/category/tag pickers — reuse the same `chip`/`chipActive`/`chipText`/`chipTextActive` styles.

### Template Matching Logic (Critical)

The matching algorithm applies TWO filters (AND logic between dimensions):

```
For each template item:
  1. CATEGORY FILTER:
     - If selectedCategoryIds is EMPTY → item passes only if item.categoryId is null
     - If selectedCategoryIds is NOT EMPTY → item passes if item.categoryId is null OR item.categoryId IN selectedCategoryIds

  2. TAG FILTER:
     - If selectedTagIds is EMPTY → item passes only if item.tagIds is empty
     - If selectedTagIds is NOT EMPTY → item passes if item.tagIds is empty OR any of item.tagIds is IN selectedTagIds

  3. If item passes BOTH filters:
     - If item.profileId is null → create N packing items (one per participant)
     - If item.profileId is in participantProfileIds → create 1 packing item
     - If item.profileId is NOT in participantProfileIds → skip (don't create)
```

### UI Changes to Vacation Creation Sheet

The vacation creation bottom sheet at `src/app/(app)/vacations/index.tsx` needs:
1. **Category chips** — added after the participants section. Horizontal scroll of category chips (icon + name). Multi-select toggles. Label: "Categorias"
2. **Tag chips** — added after categories section. Wrap layout of tag chips. Multi-select toggles. Label: "Etiquetas da viagem"
3. Both sections are optional — user can create a trip without selecting any categories or tags (in which case only template items with null category AND no tags are injected)
4. Load categories, tags at screen mount alongside profiles and vacations

### Current `handleSave()` Flow (modify step 3)

```
1. Validate form fields
2. Call vacationRepository.createVacation() → get created vacation
3. >>> NEW: Call templateRepository.applyTemplate(familyId, created.id, participantIds, categoryIds, tagIds) <<<
4. Upload cover image if provided
5. Update vacation with coverImageUrl and isPinned if needed
6. Close sheet, show success snackbar, reload data
```

### Profile Data

Family profiles (from seed): Filipe, Angela, Aurora, Isabel. The profile picker already exists in the vacation creation form — use `formParticipants` (Set<string> of profile IDs) as the `participantProfileIds` parameter for `applyTemplate()`.

### Project Structure Notes

- MODIFY: `src/app/(app)/vacations/index.tsx` — add category/tag pickers, call applyTemplate
- MODIFY: `src/repositories/interfaces/template.repository.interface.ts` — update applyTemplate signature
- MODIFY: `src/repositories/supabase/template.repository.ts` — implement applyTemplate
- No new files needed
- No migration needed

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic-4-Story-4.3]
- [Source: _bmad-output/planning-artifacts/prd.md#FR32]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Journey-1-Template-Application]
- [Source: src/app/(app)/vacations/index.tsx — current vacation creation flow]
- [Source: src/repositories/supabase/template.repository.ts — applyTemplate stub]
- [Source: src/repositories/supabase/packing-item.repository.ts — packing item INSERT pattern]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

- No debug issues encountered — clean implementation

### Completion Notes List

- Updated ITemplateRepository.applyTemplate signature: now accepts familyId, vacationId, participantProfileIds, selectedCategoryIds, selectedTagIds; returns count of injected items
- Implemented full template matching algorithm in SupabaseTemplateRepository.applyTemplate: category filter (null OR in selected), tag filter (empty OR intersection), profile expansion (null→per participant, specific→only if attending)
- Added category and tag chip pickers to vacation creation form in vacations/index.tsx: horizontal scroll for categories (with icon), wrap layout for tags
- Added formCategories and formTags state, toggle functions, and reset in openCreate()
- Integrated applyTemplate call in handleSave() after createVacation(), with logging of injected count
- Loaded categories and tags alongside vacations and profiles in loadData()
- TypeScript type-check passes with zero errors

### File List

- MODIFY: src/repositories/interfaces/template.repository.interface.ts
- MODIFY: src/repositories/supabase/template.repository.ts
- MODIFY: src/app/(app)/vacations/index.tsx

### Change Log

- 2026-03-27: Story 4.3 implementation complete — automatic template application at trip creation with category/tag filtering and profile expansion
