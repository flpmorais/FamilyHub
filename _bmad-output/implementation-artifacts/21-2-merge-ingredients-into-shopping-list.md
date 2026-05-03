# Story 21.2: Merge Ingredients into Shopping List

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an admin,
I want to add the ingredients I need to the shopping list with correct quantities, deduplicated against what's already there,
so that I don't have to manually copy items from the meal plan to the shopping list.

## Acceptance Criteria

1. When the admin taps "Adicionar à Lista de Compras" on the review screen with checked items, only the checked items are processed (FR144)
2. When a checked ingredient already exists on the shopping list and is ticked (shopped), the item is unticked (marked as needed again) with the new quantity (FR145)
3. When a checked ingredient already exists on the shopping list and is unticked (already needed), the item's quantity is updated to the generated quantity (FR145)
4. When a checked ingredient does not exist on the shopping list, a new shopping item is created with the ingredient name and quantity (FR145)
5. New items are categorized via the existing V2 AI categorization service (FR145)
6. After merge, the admin sees a success message and can navigate to the Shopping module to verify (FR145)
7. Dedup matching uses case-insensitive exact name match against existing shopping list items (FR145)

## Tasks / Subtasks

- [x] Task 1: Add `mergeItems` method to shopping repository (AC: #2, #3, #4, #7)
  - [x] Add `mergeItems(familyId: string, items: { name: string; quantity: string | null }[]): Promise<{ created: number; updated: number }>` to `IShoppingRepository`
  - [x] Implement in `SupabaseShoppingRepository`:
    - For each item: call `findByName(familyId, name)` (already case-insensitive via `ilike`)
    - If found and ticked: `untickItem(id)` then `editItem(id, { quantityNote: quantity })`
    - If found and not ticked: `editItem(id, { quantityNote: quantity })`
    - If not found: create new item (needs categoryId — delegate to next task)
  - [x] Return counts of created and updated items
- [x] Task 2: Wire AI categorization for new items (AC: #5)
  - [x] In `mergeItems`, for items not found: call `classificationRepo.classifyItem()` to get category, then `addItem()` with the classified category
  - [x] Since `mergeItems` needs both shopping and classification repos, make it a service function rather than a repository method — or pass classificationRepo as parameter
  - [x] Alternative: create a `shopping-merge.service.ts` that orchestrates both repos
- [x] Task 3: Wire up the review screen button (AC: #1, #6)
  - [x] In `shopping-list-review.tsx`, replace the placeholder `handleAddToShoppingList()` with actual merge logic
  - [x] Get checked items, call merge service/function
  - [x] Show success Snackbar: "X itens adicionados, Y atualizados na lista de compras"
  - [x] After success, navigate back (dismiss) to meal plan

## Dev Notes

### Merge Service Architecture

Since the merge needs both `IShoppingRepository` and `IClassificationRepository`, and the review screen doesn't know about shopping categories, the cleanest approach is a service function that takes the repositories as parameters:

```typescript
// src/services/shopping-merge.service.ts

export async function mergeIntoShoppingList(
  items: { name: string; quantity: string | null }[],
  familyId: string,
  shoppingRepo: IShoppingRepository,
  shoppingCategoryRepo: IShoppingCategoryRepository,
  classificationRepo: IClassificationRepository,
): Promise<{ created: number; updated: number }> {
  let created = 0;
  let updated = 0;

  // Load categories for AI classification
  const categories = await shoppingCategoryRepo.getAll(familyId);
  const categoryNames = categories.filter(c => c.active).map(c => c.name);
  const otherCatId = categories.find(c => c.name === 'Outros')?.id ?? categories[0]?.id;

  for (const item of items) {
    const existing = await shoppingRepo.findByName(familyId, item.name);

    if (existing) {
      // Update existing
      if (existing.isTicked) {
        await shoppingRepo.untickItem(existing.id);
      }
      if (item.quantity) {
        await shoppingRepo.editItem(existing.id, { quantityNote: item.quantity });
      }
      updated++;
    } else {
      // Create new with AI categorization
      let categoryId = otherCatId;
      try {
        const result = await classificationRepo.classifyItem(item.name, categoryNames);
        const matched = categories.find(c => c.name === result.category);
        if (matched) categoryId = matched.id;
      } catch { /* fallback to Outros */ }

      await shoppingRepo.addItem({
        familyId,
        name: item.name,
        categoryId: categoryId ?? '',
        quantityNote: item.quantity ?? undefined,
      });
      created++;
    }
  }

  return { created, updated };
}
```

### Review Screen Wiring

```typescript
async function handleAddToShoppingList() {
  const checked = items.filter(i => i.checked);
  if (checked.length === 0) return;

  setIsMerging(true);
  try {
    const { created, updated } = await mergeIntoShoppingList(
      checked.map(i => ({ name: i.ingredientName, quantity: i.totalQuantity })),
      familyId,
      shoppingRepo,
      shoppingCategoryRepo,
      classificationRepo,
    );
    // Show success and navigate back
    Alert.alert(
      'Lista de compras atualizada',
      `${created} itens adicionados, ${updated} atualizados.`,
      [{ text: 'OK', onPress: () => router.dismiss(2) }],
    );
  } catch { ... }
}
```

### Error Messages (Portuguese)

- Merging: "A adicionar à lista de compras..."
- Success: "X itens adicionados, Y atualizados"
- Merge failed: "Erro ao adicionar à lista de compras"

### Architecture Compliance

- **Service function**: `mergeIntoShoppingList()` takes repos as params — no direct Supabase calls in screens
- **Reuses existing repos**: `findByName`, `untickItem`, `editItem`, `addItem` all exist
- **AI categorization reuse**: Same `classifyItem()` from V2 for new items

### Previous Story Intelligence

- `shopping-list-review.tsx` has placeholder `handleAddToShoppingList()` — replace it
- `IShoppingRepository.findByName()` uses `ilike` — case-insensitive match
- `IClassificationRepository.classifyItem()` returns `{ category, parsedName, quantityNote, isUrgent }`
- Shopping categories loaded via `IShoppingCategoryRepository.getAll()`

### Project Structure Notes

New files:
```
src/services/shopping-merge.service.ts
```

Files to modify:
```
src/app/(app)/(recipes)/shopping-list-review.tsx  (wire up merge button)
```

### Codebase Patterns to Follow

| Pattern | Reference File |
|---------|---------------|
| Shopping repository | `src/repositories/supabase/shopping.repository.ts` |
| Classification repository | `src/repositories/supabase/classification.repository.ts` |
| Shopping category repo | `src/repositories/supabase/shopping-category.repository.ts` |
| Review screen | `src/app/(app)/(recipes)/shopping-list-review.tsx` |

### References

- [Source: _bmad-output/planning-artifacts/epics-v5-recipes.md — Epic 5, Story 5.2]
- [Source: _bmad-output/planning-artifacts/prd.md — FR144, FR145]
- [Source: _bmad-output/implementation-artifacts/21-1-generate-and-review-ingredient-list.md]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

No issues encountered during implementation.

### Completion Notes List

- Tasks 1-2: Created `shopping-merge.service.ts` — `mergeIntoShoppingList()` takes items + familyId + 3 repos. For each item: `findByName` (case-insensitive) → if found+ticked: untick+update qty → if found+unticked: update qty → if not found: AI classify via `classifyItem()`, then `addItem()`. Returns `{ created, updated }` counts.
- Task 3: Wired up `shopping-list-review.tsx` — replaced placeholder with real merge. Calls `mergeIntoShoppingList()` with checked items, shows `Alert.alert` success message with counts ("X adicionados, Y atualizados"), navigates back via `router.dismiss(2)`. Loading spinner on button during merge. Error Snackbar on failure.

### Change Log

- 2026-04-06: Story 21.2 implementation complete — 3 tasks (merge service, review screen wiring). Completes Epic 21 (Shopping List Generation) and the entire V5 Recipes module!

### File List

New files:
- src/services/shopping-merge.service.ts

Modified files:
- src/app/(app)/(recipes)/shopping-list-review.tsx (wired merge button with repos, loading state, success alert, error handling)
