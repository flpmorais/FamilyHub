# Story 3.6: PackingItemCard & Trip Completion State

Status: review

## Story

As an Admin,
I want the packing list to show clear item status at a glance and signal when the whole trip is fully packed,
so that I know where things stand without reading every item, and leaving day has a satisfying "done" moment.

## Acceptance Criteria

1. **Given** the `PackingItemCard` component is built
   **When** an item renders in the list
   **Then** the card is 56dp height with a 4dp left colour strip (status colour), item name on the primary line (Body Large), "Person · Qty" on the secondary line (Body Medium, quantity hidden if 1), `StatusBadge` trailing
   **And** a Packed item renders with strikethrough text and 0.6 opacity
   **And** the full item announces as a single TalkBack group: "[Name], [Status], [Person]"

2. **Given** all items on the packing list reach `packed` status
   **When** the last item is packed (or the list is opened with all items already packed)
   **Then** `PackingCompletionState` replaces the list — terracotta/peach background, trip name, "Pronto para partir" heading, stats summary, "Ver lista completa" action

3. **Given** the packing list is empty (no items added yet)
   **When** the screen renders
   **Then** an empty state shows: "Lista vazia — adiciona o primeiro item" with the FAB visible

## Tasks / Subtasks

- [x] Task 1: Create `PackingItemCard` component (AC: 1)
  - [x] 1.1 Create `src/components/packing/packing-item-card.tsx`
  - [x] 1.2 56dp height, 4dp left colour strip using `useStatusColours()`, item name (Body Large 16sp), secondary line "Person · Qty" (Body Medium 14sp, qty hidden if 1), `StatusBadge` trailing
  - [x] 1.3 Packed: strikethrough text + 0.6 opacity on entire card
  - [x] 1.4 TalkBack: `accessibilityLabel="[Name], [Status], [Person]"` as a single group
  - [x] 1.5 Props: `item`, `profileName`, `onPress`, `onLongPress`

- [x] Task 2: Create `PackingCompletionState` component (AC: 2)
  - [x] 2.1 Create `src/components/packing/packing-completion-state.tsx`
  - [x] 2.2 Peach background (#FFDBCF), terracotta text, trip name, "Pronto para partir" heading
  - [x] 2.3 Stats summary: "N itens embalados"
  - [x] 2.4 "Ver lista completa" button triggers `onShowAll`
  - [x] 2.5 Props: `vacationTitle`, `totalItems`, `onShowAll`

- [x] Task 3: Integrate PackingItemCard into packing-item-list (AC: 1)
  - [x] 3.1 Replaced inline TouchableOpacity with `PackingItemCard`
  - [x] 3.2 Pass `profileName` resolved from profiles array
  - [x] 3.3 `SwipeableItemWrapper` wraps `PackingItemCard`

- [x] Task 4: Integrate completion state into packing-item-list (AC: 2, 3)
  - [x] 4.1 Added `vacationTitle` prop to `PackingItemList`
  - [x] 4.2 When all items packed, `PackingCompletionState` replaces the list
  - [x] 4.3 "Ver lista completa" sets `showAllOverride` to reveal all items
  - [x] 4.4 Empty state still works

- [x] Task 5: Update barrel export and vacation detail screen (AC: 1, 2)
  - [x] 5.1 Added exports to `src/components/packing/index.ts`
  - [x] 5.2 Passed `vacationTitle={vacation.title}` from detail screen

- [x] Task 6: Verify (AC: 1–3)
  - [x] 6.1 `npm run type-check` — zero errors
  - [x] 6.2 `npm run lint` — zero errors

## Dev Notes

### PackingItemCard Layout

```
┌──────────────────────────────────────────────┐
│ [4dp strip] [Name (Body Large)]    [Badge]   │  56dp
│             [Person · ×3 (Body Medium)]       │
└──────────────────────────────────────────────┘
```

- Strip colour: `useStatusColours()[item.status].bg`
- Badge: existing `StatusBadge` component from Story 3.3
- Quantity hidden if 1
- Category not shown yet (Epic 4)

### Completion State Design

From UX spec: "PackingCompletionState replaces the list — terracotta/peach illustration, trip name, 'Pronto para partir' heading, stats summary"

Simple implementation:
- Terracotta background (`#B5451B` with low opacity or peach `#FFDBCF`)
- Trip name in Title Large
- "Pronto para partir" heading
- "N itens embalados" stat
- "Ver lista completa" button

### Existing Component Structure

The current packing item row in `packing-item-list.tsx` is:
```tsx
<SwipeableItemWrapper ...>
  <TouchableOpacity style={st.packRow} onPress={...} onLongPress={...}>
    <View style={[st.statusStrip, ...]} />
    <View style={st.packInfo}>
      <Text style={st.packName}>...</Text>
      <Text style={st.packMeta}>...</Text>
    </View>
    <StatusBadge status={item.status} />
  </TouchableOpacity>
</SwipeableItemWrapper>
```

Replace the inner `TouchableOpacity` with `PackingItemCard`. The `SwipeableItemWrapper` stays.

### Props Change for PackingItemList

Need to add `vacationTitle: string` prop. The vacation detail screen has `vacation.title` available.

### Previous Story Context (3.5)

- Packing items now use PowerSync `useQuery()` for reactive updates
- `mapPackingRow()` exported from repository
- `packing-item-list.tsx` receives items as props, has swipe, badge, filters, snackbar

### Component Files

- `src/components/packing/packing-item-card.tsx` — **CREATE**
- `src/components/packing/packing-completion-state.tsx` — **CREATE**
- `src/components/packing/index.ts` — **MODIFY** — add exports
- `src/components/packing-item-list.tsx` — **MODIFY** — use PackingItemCard, add completion state
- `src/app/(app)/vacations/[id]/index.tsx` — **MODIFY** — pass vacationTitle prop

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 3.6] — Acceptance criteria
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Defining Experience] — Packing item card layout, completion state
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Visual Design] — Typography scale, spacing

## Dev Agent Record

### Agent Model Used

claude-opus-4-6

### Debug Log References

### Completion Notes List

- Created `PackingItemCard` — 56dp fixed height, 4dp colour strip, Body Large name, Body Medium meta (person · qty), StatusBadge trailing. Packed items: strikethrough + 0.6 opacity. Full TalkBack accessibility label.
- Created `PackingCompletionState` — peach (#FFDBCF) card with emoji, "Pronto para partir" heading, vacation name, item count, "Ver lista completa" action button.
- Replaced inline item rows in `packing-item-list.tsx` with `PackingItemCard` inside `SwipeableItemWrapper`.
- Added completion state: when all items are packed and no filters active, shows `PackingCompletionState` instead of list. "Ver lista completa" sets override flag to show all items.
- Added `vacationTitle` prop to `PackingItemList`, passed from vacation detail screen.
- Removed unused inline row styles (packRow, statusStrip, packInfo, packName, packNamePacked, packMeta).
- `type-check` and `lint` pass with zero errors.

### File List

- `familyhub/src/components/packing/packing-item-card.tsx` — **CREATED**
- `familyhub/src/components/packing/packing-completion-state.tsx` — **CREATED**
- `familyhub/src/components/packing/index.ts` — **MODIFIED** — added exports
- `familyhub/src/components/packing-item-list.tsx` — **MODIFIED** — PackingItemCard, completion state, vacationTitle prop
- `familyhub/src/app/(app)/vacations/[id]/index.tsx` — **MODIFIED** — passes vacationTitle
