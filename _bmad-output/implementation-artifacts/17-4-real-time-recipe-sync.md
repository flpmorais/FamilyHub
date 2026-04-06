# Story 17.4: Real-Time Recipe Sync

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an admin,
I want recipe changes made by my partner to appear on my device in real-time,
so that we both always see the same recipe collection without refreshing.

## Acceptance Criteria

1. When both admins have the Recipes module open and one admin creates a recipe, the new recipe appears in the other admin's recipe list within 3 seconds without manual refresh (FR149, NFR3)
2. When one admin edits a recipe, the other admin's recipe list reflects the updated name/type immediately (FR149)
3. When one admin deletes a recipe, the recipe disappears from the other admin's list immediately (FR149)
4. The new recipe appears in the correct type group in the list (FR149)
5. A Supabase Realtime subscription on the `recipes` table is active while the recipe list screen is mounted
6. The subscription is properly cleaned up (unsubscribed) when the recipe list screen unmounts or when the user navigates away
7. If the admin is viewing a recipe detail screen when the recipe is deleted by the other admin, an appropriate message is shown

## Tasks / Subtasks

- [x] Task 1: Create Realtime subscription hook (AC: #5, #6)
  - [x] Create `src/hooks/use-recipe-realtime.ts`
  - [x] Hook takes `familyId: string` and `onRecipeChange: () => void` callback
  - [x] Subscribes to Supabase Realtime `postgres_changes` on the `recipes` table filtered by `family_id`
  - [x] Listens for `INSERT`, `UPDATE`, `DELETE` events
  - [x] On any event, calls `onRecipeChange()` callback to trigger a data reload
  - [x] Returns cleanup function that removes the channel subscription
  - [x] Uses `useEffect` with cleanup to auto-unsubscribe on unmount
- [x] Task 2: Integrate Realtime into recipe list screen (AC: #1, #2, #3, #4)
  - [x] In `src/app/(app)/(recipes)/index.tsx`, use `useRecipeRealtime` hook
  - [x] On Realtime event, call the existing `reload()` function to refresh the recipe list
  - [x] This naturally re-groups recipes by type (AC #4) since `buildSections()` runs on every render
  - [x] Keep `useFocusEffect` reload as well — Realtime is for cross-device sync, focus reload handles returning from create/edit
- [x] Task 3: Handle deleted recipe on detail screen (AC: #7)
  - [x] In `src/app/(app)/(recipes)/[recipeId]/index.tsx`, add Realtime subscription for the specific recipe
  - [x] On `DELETE` event matching the current `recipeId`, show error state "Esta receita foi eliminada" and navigate back after a short delay
  - [x] On `UPDATE` event matching the current `recipeId`, reload the recipe data

## Dev Notes

### Supabase Realtime API Pattern

Supabase JS v2 Realtime uses channel subscriptions with `postgres_changes`:

```typescript
import { supabaseClient } from '../repositories/supabase/supabase.client';

const channel = supabaseClient
  .channel('recipes-realtime')
  .on(
    'postgres_changes',
    {
      event: '*',        // INSERT, UPDATE, DELETE
      schema: 'public',
      table: 'recipes',
      filter: `family_id=eq.${familyId}`,
    },
    (payload) => {
      // payload.eventType: 'INSERT' | 'UPDATE' | 'DELETE'
      // payload.new: the new row (for INSERT/UPDATE)
      // payload.old: the old row (for DELETE/UPDATE)
      onRecipeChange();
    },
  )
  .subscribe();

// Cleanup
supabaseClient.removeChannel(channel);
```

### Hook Pattern

```typescript
// src/hooks/use-recipe-realtime.ts
import { useEffect } from 'react';
import { supabaseClient } from '../repositories/supabase/supabase.client';

export function useRecipeRealtime(
  familyId: string | undefined,
  onRecipeChange: () => void,
) {
  useEffect(() => {
    if (!familyId) return;

    const channel = supabaseClient
      .channel(`recipes-${familyId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'recipes',
          filter: `family_id=eq.${familyId}`,
        },
        () => {
          onRecipeChange();
        },
      )
      .subscribe();

    return () => {
      supabaseClient.removeChannel(channel);
    };
  }, [familyId, onRecipeChange]);
}
```

### Detail Screen Realtime Pattern

For the detail screen, subscribe to changes on the specific recipe:

```typescript
useEffect(() => {
  if (!recipeId) return;

  const channel = supabaseClient
    .channel(`recipe-detail-${recipeId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'recipes',
        filter: `id=eq.${recipeId}`,
      },
      (payload) => {
        if (payload.eventType === 'DELETE') {
          setError('Esta receita foi eliminada');
          setRecipe(null);
          setTimeout(() => router.back(), 1500);
        } else if (payload.eventType === 'UPDATE') {
          // Reload recipe data
          recipeRepo.getById(recipeId).then((data) => {
            if (data) setRecipe(data);
          });
        }
      },
    )
    .subscribe();

  return () => {
    supabaseClient.removeChannel(channel);
  };
}, [recipeId]);
```

### Important: Supabase Realtime Prerequisites

Supabase Realtime requires that the table has **Realtime enabled** in the Supabase dashboard or via SQL:

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE recipes;
```

This should be added as a migration. Check if other tables already have this — if not, this is the first table to enable Realtime on.

### Integration with Existing Reload Pattern

The recipe list screen already uses `useFocusEffect` to reload when the screen gains focus (e.g., returning from create/edit). The Realtime subscription is **additive** — it handles cross-device sync while `useFocusEffect` handles same-device navigation. Both coexist:

```typescript
// Existing: reload on focus (same-device navigation)
useFocusEffect(useCallback(() => { void reload(); ... }, [reload, familyId]));

// New: reload on Realtime event (cross-device sync)
useRecipeRealtime(familyId, reload);
```

### Error Messages (Portuguese)

- Recipe deleted by another admin: "Esta receita foi eliminada"

### Architecture Compliance

- **Direct import of `supabaseClient`**: The Realtime hook imports `supabaseClient` directly — this is consistent with how the client is used in screens for banner URL fetching. The Realtime subscription is not a repository concern (it's a UI subscription, not a data access pattern).
- **Hook pattern**: Clean `useEffect` with cleanup, channel name includes `familyId` to avoid collisions
- **No new store state**: The Realtime callback simply triggers an existing reload function — no new Zustand state needed

### Previous Story Intelligence (17.1, 17.2, 17.3)

- Recipe list screen at `(recipes)/index.tsx` already has `reload()` function and `useFocusEffect`
- Detail screen at `[recipeId]/index.tsx` already has `useFocusEffect` reload pattern and Snackbar
- `supabaseClient` is a singleton imported from `src/repositories/supabase/supabase.client.ts`
- No Realtime subscriptions exist anywhere in the codebase yet — this is the first implementation

### Project Structure Notes

New files:
```
src/hooks/use-recipe-realtime.ts
supabase/migrations/20260406200000_enable_recipes_realtime.sql  (if needed)
```

Files to modify:
```
src/app/(app)/(recipes)/index.tsx              (add useRecipeRealtime hook)
src/app/(app)/(recipes)/[recipeId]/index.tsx   (add detail-level Realtime subscription)
```

### What This Story Does NOT Include

- No Realtime on `recipe_categories`, `recipe_tags`, or junction tables (not required — categories/tags are managed in Settings which reloads on focus)
- No Realtime on other modules (shopping, leftovers, meal plan) — this story only covers recipes
- No offline handling — app requires network connectivity

### Codebase Patterns to Follow

| Pattern | Reference File |
|---------|---------------|
| Supabase client singleton | `src/repositories/supabase/supabase.client.ts` |
| Recipe list screen | `src/app/(app)/(recipes)/index.tsx` |
| Recipe detail screen | `src/app/(app)/(recipes)/[recipeId]/index.tsx` |
| Hook pattern | `src/hooks/use-repository.ts` |
| useFocusEffect reload | `src/app/(app)/(shopping)/index.tsx` |

### References

- [Source: _bmad-output/planning-artifacts/epics-v5-recipes.md — Epic 1, Story 1.4]
- [Source: _bmad-output/planning-artifacts/prd.md — FR149]
- [Source: _bmad-output/planning-artifacts/architecture.md — Supabase Realtime, NFR3 <3s]
- [Source: _bmad-output/planning-artifacts/architecture.md — Direct Supabase Queries + Realtime Subscriptions]
- [Source: _bmad-output/implementation-artifacts/17-1-create-and-view-recipes-via-manual-entry.md]
- [Source: _bmad-output/implementation-artifacts/17-3-edit-and-delete-recipes.md]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

No issues encountered during implementation.

### Completion Notes List

- Task 1: Created `use-recipe-realtime.ts` hook — subscribes to Supabase Realtime `postgres_changes` on `recipes` table filtered by `family_id`, calls `onRecipeChange` callback on any INSERT/UPDATE/DELETE, auto-cleans up on unmount. Also created migration `20260406200000_enable_recipes_realtime.sql` to add `recipes` to `supabase_realtime` publication.
- Task 2: Integrated `useRecipeRealtime(familyId, reload)` into recipe list screen — cross-device sync triggers existing `reload()` function, coexists with `useFocusEffect` for same-device navigation.
- Task 3: Added per-recipe Realtime subscription to detail screen — on DELETE shows "Esta receita foi eliminada" and navigates back after 1.5s, on UPDATE reloads recipe data. Proper cleanup on unmount.

### Change Log

- 2026-04-06: Story 17.4 implementation complete — 3 tasks (Realtime hook, list integration, detail screen subscription). First Realtime implementation in the codebase.

### File List

New files:
- src/hooks/use-recipe-realtime.ts
- supabase/migrations/20260406200000_enable_recipes_realtime.sql

Modified files:
- src/app/(app)/(recipes)/index.tsx (added useRecipeRealtime hook)
- src/app/(app)/(recipes)/[recipeId]/index.tsx (added per-recipe Realtime subscription with DELETE/UPDATE handling)
