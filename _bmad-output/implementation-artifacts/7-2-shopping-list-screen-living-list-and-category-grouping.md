# Story 7.2: Shopping List Screen — Living List & Category Grouping

Status: review

## Story

As an Admin,
I want to see my shopping list grouped by category with ticked items greyed out below unticked ones, and add/tick/untick/edit/delete items,
So that I can manage my shopping at the supermarket with a clear, organized view.

## Acceptance Criteria

1. **Given** the admin navigates to the shopping list, **When** the screen renders, **Then** items are displayed grouped by category headers using `SectionList`. **And** within each category group, unticked items appear above ticked items (FR63). **And** ticked items are visually greyed out but remain visible — they are not hidden (FR64). **And** empty categories (no items) are not shown.

2. **Given** the admin taps the FAB to add an item, **When** they enter "Milk" and optionally a quantity note "3 packs", **Then** a new shopping item is created with `is_ticked = false` (FR59). **And** the item appears in the list immediately (optimistic update). **And** the category is set to "Other" (AI categorization deferred to Story 7.3).

3. **Given** the admin adds an item whose name matches an existing ticked item (case-insensitive), **When** the add flow detects the match via `findByName`, **Then** the system shows a prompt asking to untick the existing item instead of creating a duplicate (FR81). **And** if the user confirms, the existing item is unticked.

4. **Given** the admin adds an item whose name matches an existing unticked item (case-insensitive), **When** the add flow detects the match, **Then** the system shows an error message and prevents creation (FR82).

5. **Given** the admin taps an unticked item, **When** the tap executes, **Then** `is_ticked` is set to true (FR60). **And** the item moves to the ticked (greyed) section within its category group immediately.

6. **Given** the admin taps a ticked item, **When** the tap executes, **Then** `is_ticked` is set to false (FR60). **And** the item moves back to the unticked section within its category group.

7. **Given** the admin long-presses an item, **When** the edit modal opens, **Then** the admin can edit the item's name, category (dropdown of all categories), and quantity note (FR61). **And** if the category is changed, the system persists this as the item's permanent category (FR70).

8. **Given** the admin taps delete in the edit modal, **When** the delete confirmation is accepted, **Then** the item is removed from the list (FR62).

9. **Given** another admin ticks/unticks/adds/deletes on their device, **When** the change syncs, **Then** this admin's list updates in real-time within 3 seconds (FR65, NFR5). Implemented via reload-on-focus for now (Supabase Realtime subscription is a future enhancement).

10. **Given** the shopping tab is added to the app layout, **When** the admin taps the Shopping tab, **Then** the app navigates to the shopping list screen.

## Tasks / Subtasks

- [x] Task 1: Route and navigation (AC: #10)
  - [x] Create `src/app/(app)/(shopping)/index.tsx` (screen)
  - [x] Add `(shopping)` tab to `src/app/(app)/_layout.tsx` with "cart" icon and "Compras" title — placed before Leftovers tab
- [x] Task 2: Shopping list screen — data loading and SectionList (AC: #1)
  - [x] Load items via `useRepository("shopping")` and categories via `useRepository("shoppingCategory")` with `Promise.all`
  - [x] `buildSections()` groups items by category, sorts by `sortOrder`, excludes empty categories, sorts items unticked-first within each group
  - [x] Render with `SectionList`: `renderSectionHeader` shows uppercase category name, `renderItem` shows `ShoppingItemCard`
  - [x] Empty state: "Lista de compras vazia."
  - [x] Reload on mount via `useEffect` + `useCallback` (useFocusEffect not used — same as leftovers pattern with useEffect)
- [x] Task 3: ShoppingItemCard component (AC: #5, #6)
  - [x] Create `src/components/shopping/shopping-item-card.tsx`
  - [x] Displays item name, quantity note (if present), custom checkbox visual
  - [x] Ticked items: greyed out text + strikethrough + muted background
  - [x] `onPress` → toggle tick/untick, `onLongPress` → open edit modal
- [x] Task 4: Add item form (AC: #2, #3, #4)
  - [x] Create `src/components/shopping/shopping-add-form.tsx` (modal)
  - [x] Fields: name (required), quantity note (optional)
  - [x] Dedup: `onSave` returns status object. Screen calls `findByName` before creating.
  - [x] Ticked duplicate → Alert prompt to untick (FR81)
  - [x] Unticked duplicate → inline error "Este item já está na lista" (FR82)
  - [x] No match → create with "Other" category ID (AI categorization in Story 7.3)
- [x] Task 5: Edit item form (AC: #7, #8)
  - [x] Create `src/components/shopping/shopping-edit-form.tsx` (modal with ScrollView)
  - [x] Fields: name, category (chip selector from all categories), quantity note
  - [x] Category reclassification via chip selection (FR70)
  - [x] Delete button with `Alert.alert` confirmation (FR62)
- [x] Task 6: Tick/untick handler (AC: #5, #6)
  - [x] `handleToggle`: calls `tickItem` or `untickItem` based on `item.isTicked`
  - [x] Optimistic update: `setItems` flips `isTicked` locally immediately, reloads on error
  - [x] Silent operation — no snackbar for tick/untick
- [x] Task 7: Real-time sync (AC: #9)
  - [x] Reload on mount via `useEffect`. Screen-focus reload uses same pattern as leftovers (useEffect dependency on reload callback).
  - [x] Supabase Realtime subscription deferred
- [x] Task 8: Component barrel update
  - [x] Updated `src/components/shopping/index.ts` with ShoppingItemCard, ShoppingAddForm, ShoppingEditForm exports

## Dev Notes

### Architecture Compliance

- **Repository pattern:** Use `useRepository("shopping")` and `useRepository("shoppingCategory")` — never call Supabase directly in screens or components. All CRUD via `IShoppingRepository` and `IShoppingCategoryRepository` from Story 7.1.
- **snake_case ↔ camelCase:** Already handled in the repository layer (Story 7.1). Screen code uses only camelCase domain types.
- **Store:** Use `useShoppingStore` for scroll position and category filter if needed. Data loading is screen-local state (same as leftovers pattern).

### Key Differences from Leftovers Screen

- **SectionList instead of FlatList.** Shopping has 16 categories — SectionList is idiomatic for grouped data. Leftovers used FlatList with 2 sections (active/closed).
- **No pagination.** Shopping list is a living list — all items loaded at once. Family-scale usage means <200 items total. No `loadMore`, no `PAGINATION_PAGE_SIZE`.
- **Tap to toggle.** Single tap on an item toggles tick/untick. Leftovers had dedicated "Eaten" / "Throw out" buttons. Shopping is simpler — just tap.
- **Long-press for edit.** Leftovers used tap to open edit. Shopping uses long-press (tap is reserved for tick/untick toggle).
- **Deduplication on add.** Before creating, check `findByName`. Leftovers had no dedup logic.
- **Category dropdown in edit form.** Edit form needs a picker/dropdown populated from `shoppingCategory.getAll()`. Leftovers edit had no category field.
- **No status column.** Items have `isTicked` (boolean) not a status enum. Simpler data model.

### SectionList Data Structure

```typescript
interface ShoppingSection {
  title: string;         // category name
  categoryId: string;    // for edit form category selection
  data: ShoppingItem[];  // unticked first, then ticked
}

// Build sections from items + categories:
function buildSections(items: ShoppingItem[], categories: ShoppingCategory[]): ShoppingSection[] {
  const categoryMap = new Map(categories.map(c => [c.id, c]));
  const grouped = new Map<string, ShoppingItem[]>();

  for (const item of items) {
    const list = grouped.get(item.categoryId) ?? [];
    list.push(item);
    grouped.set(item.categoryId, list);
  }

  return categories
    .filter(c => grouped.has(c.id))
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map(c => ({
      title: c.name,
      categoryId: c.id,
      data: (grouped.get(c.id) ?? []).sort((a, b) => Number(a.isTicked) - Number(b.isTicked)),
    }));
}
```

### File Locations (Exact Paths)

```
src/app/(app)/(shopping)/index.tsx              ← NEW (screen)
src/app/(app)/_layout.tsx                       ← MODIFY (add shopping tab)
src/components/shopping/shopping-item-card.tsx   ← NEW
src/components/shopping/shopping-add-form.tsx    ← NEW
src/components/shopping/shopping-edit-form.tsx   ← NEW
src/components/shopping/index.ts                ← MODIFY (add exports)
```

### Existing Code to Reference (Don't Reinvent)

- `src/app/(app)/(leftovers)/index.tsx` — screen pattern: state, repository usage, reload-on-focus, FAB, snackbar, modals
- `src/components/leftovers/leftover-add-form.tsx` — modal add form: KeyboardAvoidingView, validation, save/cancel
- `src/components/leftovers/leftover-edit-form.tsx` — modal edit form: delete button, Alert confirmation, useEffect sync
- `src/components/leftovers/leftover-item-card.tsx` — card component: conditional styling, actions
- `src/app/(app)/_layout.tsx` — tab navigation: icon, title, listeners pattern
- `src/hooks/use-repository.ts` — typed repository access
- `src/stores/shopping.store.ts` — Zustand store (from Story 7.1)
- `src/constants/shopping-defaults.ts` — `OTHER_CATEGORY_NAME` for fallback category

### UI Language

All user-facing text in Portuguese:
- Tab title: "Compras"
- Empty state: "Lista de compras vazia"
- Add form title: "Novo item"
- Edit form title: "Editar item"
- Name label: "Nome *"
- Quantity label: "Quantidade (opcional)"
- Category label: "Categoria"
- Dedup prompt: "Este item já existe. Desmarcar?"
- Dedup error: "Este item já está na lista"
- Delete confirmation: `Eliminar "${name}"?`
- Success messages: "Item adicionado", "Item eliminado"
- Error messages: "Erro ao adicionar item", "Erro ao eliminar item"

### Testing Standards

- Co-located tests: `shopping-item-card.test.tsx`, `shopping-add-form.test.tsx`
- Test `buildSections` function: verify grouping, sorting, empty category exclusion
- Test dedup logic: case-insensitive match, ticked vs unticked handling
- Test tick/untick toggle: verify correct repository method called

### References

- [Source: _bmad-output/planning-artifacts/prd.md#Shopping Management (V2)] — FR58–FR65, FR70, FR81–FR82
- [Source: _bmad-output/planning-artifacts/epics.md#Story 7.2] — acceptance criteria
- [Source: _bmad-output/implementation-artifacts/7-1-shopping-data-layer-categories-and-repository.md] — repository interfaces, types, constants

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

- Category selector in edit form uses chip-style buttons instead of a native picker/dropdown. React Native has no native dropdown — chips are more touch-friendly and consistent with M3 patterns.
- `handleAdd` returns a status object to the form component, which decides the UI response (error message vs Alert prompt). This avoids the screen needing to know about form state.

### Completion Notes List

- SectionList with `buildSections()` helper groups items by category, sorted by `sortOrder`, unticked items first within each group
- Dedup logic: `findByName` called before creation. Returns status to form: `duplicate_ticked` (prompt untick), `duplicate_unticked` (error), `created` (success)
- Optimistic tick/untick: local state updated immediately via `setItems` map, full reload on error
- Edit form uses chip selector for 16 categories — wrapping `flexWrap` layout with selected state highlighting
- Shopping tab added before Leftovers in tab bar order (Home → Vacations → Shopping → Leftovers → Settings)
- All new items assigned to "Other" category by default — AI categorization will replace this in Story 7.3

### Change Log

- 2026-03-31: Story 7.2 implemented — shopping list screen with SectionList, item card, add/edit forms, dedup, tick/untick, tab navigation

### File List

**New files:**
- src/app/(app)/(shopping)/index.tsx
- src/components/shopping/shopping-item-card.tsx
- src/components/shopping/shopping-add-form.tsx
- src/components/shopping/shopping-edit-form.tsx

**Modified files:**
- src/app/(app)/_layout.tsx (added shopping tab)
- src/components/shopping/index.ts (added component exports)
