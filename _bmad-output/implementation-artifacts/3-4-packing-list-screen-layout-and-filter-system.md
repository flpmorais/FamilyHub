# Story 3.4: Packing List Screen Layout & Filter System

Status: review

## Story

As an Admin,
I want to see my packing list with status count pills in the header and a composable filter system,
so that I can orient myself instantly and narrow to exactly the items I need to work on.

## Acceptance Criteria

1. **Given** a packing list has items
   **When** the packing list screen opens
   **Then** Packed items are hidden by default
   **And** a row of `StatusCountPill` components appears beneath the tab bar showing counts per non-zero status
   **And** a floating FAB (56dp, bottom-right, 16dp margins) is always visible regardless of scroll or filter state

2. **Given** an Admin taps a `StatusCountPill` (e.g., "Comprar · 4")
   **When** the pill is tapped
   **Then** the list filters to show only items with that status
   **And** the pill shows as active (solid white background)
   **And** a dismissible `FilterChip` for that status appears in the chip row below the pills
   **And** tapping the pill again or the chip's `×` removes the filter

3. **Given** an Admin taps the "+ Filtros" chip
   **When** the right filter panel opens
   **Then** a right-anchored modal slides in with sections: Estado (status chips), Pessoa (profile chips)
   **And** AND logic applies across dimensions (status AND person), OR logic within (Buy OR Issue)
   **And** a "Ver N itens" button shows the live count as selections change
   **And** dismissing the panel applies the selection and shows active chips in the chip row

4. **Given** filters are active
   **When** no items match the current filter combination
   **Then** an empty state is shown: "Nenhum item corresponde aos filtros activos" with a "Limpar filtros" inline link

5. **Given** an Admin closes and reopens the packing list for a vacation
   **When** the screen loads
   **Then** the previously active filter state is restored (persisted per trip)

## Tasks / Subtasks

- [x] Task 1: Create `StatusCountPill` component (AC: 1, 2)
  - [x] 1.1 Create `src/components/packing/status-count-pill.tsx`
  - [x] 1.2 Renders a pill with status colour dot + Portuguese label + count
  - [x] 1.3 Active state: solid white background with status colour text
  - [x] 1.4 Inactive state: transparent background with muted text
  - [x] 1.5 Uses `useStatusColours()` for mode-aware colours
  - [x] 1.6 Props: `status`, `count`, `isActive`, `onPress`

- [x] Task 2: Create filter header in packing-item-list (AC: 1, 2)
  - [x] 2.1 Add a horizontal ScrollView of `StatusCountPill` components above the item list
  - [x] 2.2 Only show pills for statuses with count > 0
  - [x] 2.3 Hide packed items by default (filter out `status === 'packed'` unless packed pill is active)
  - [x] 2.4 Tapping a pill toggles that status filter — uses `usePackingStore.toggleStatusFilter()`
  - [x] 2.5 Active filter chips row below pills showing dismissible chips for active filters
  - [x] 2.6 Add "+ Filtros" button to open the filter panel

- [x] Task 3: Extend packing store for person filters and per-trip persistence (AC: 3, 5)
  - [x] 3.1 Add `activeProfileFilters: string[]` to `usePackingStore`
  - [x] 3.2 Add `toggleProfileFilter(profileId: string)` action
  - [x] 3.3 Add `clearAllFilters()` action
  - [x] 3.4 Add `activeVacationId: string | null` to track which trip's filters are active
  - [x] 3.5 Persist filter state per vacation using in-memory map (survives tab switches)

- [x] Task 4: Create filter panel modal (AC: 3)
  - [x] 4.1 Create `src/components/packing/filter-panel.tsx`
  - [x] 4.2 Right-anchored modal with Estado section (status chips) and Pessoa section (profile chips)
  - [x] 4.3 AND logic across dimensions (status AND person), OR logic within dimension
  - [x] 4.4 Live "Ver N itens" count at bottom based on current selections
  - [x] 4.5 Dismiss applies filters and shows active chips in the chip row

- [x] Task 5: Apply filter logic to item list (AC: 1, 3, 4)
  - [x] 5.1 Filter items by: active status filters (OR within statuses) AND active profile filters (OR within profiles)
  - [x] 5.2 Default: hide packed items (unless packed status is explicitly selected)
  - [x] 5.3 Empty state: "Nenhum item corresponde aos filtros activos" with "Limpar filtros" link

- [x] Task 6: Verify (AC: 1–5)
  - [x] 6.1 `npm run type-check` — zero errors
  - [x] 6.2 `npm run lint` — zero errors

## Dev Notes

### Existing Store

`src/stores/packing.store.ts` already has:
- `activeStatusFilters: PackingStatus[]`
- `toggleStatusFilter(status)`
- `selectedItemId` / `setSelectedItemId`

Extend this store — do NOT create a new one. Add `activeProfileFilters`, `toggleProfileFilter`, `clearAllFilters`, and per-vacation persistence.

### Filter Logic

```
visibleItems = items
  .filter(item => {
    // Default: hide packed unless explicitly selected
    if (item.status === 'packed' && !activeStatusFilters.includes('packed')) return false;

    // Status filter (OR within): if any status filters active, item must match one
    if (activeStatusFilters.length > 0 && !activeStatusFilters.includes(item.status)) return false;

    // Profile filter (OR within): if any profile filters active, item must match one
    if (activeProfileFilters.length > 0 && !activeProfileFilters.includes(item.assignedProfileId)) return false;

    return true;
  })
```

### StatusCountPill Layout

Horizontal ScrollView row. Each pill shows:
- Coloured dot (8dp) matching `STATUS_COLOURS[status].bg`
- Portuguese label (Body Small)
- Count number
- Active state inverts to white bg with coloured text

Only show pills for statuses with at least 1 item.

### Filter Panel Pattern

Use a `Modal` with `animationType="slide"` anchored right. Sections:
1. **Estado** — chips for each status (multi-select, OR logic)
2. **Pessoa** — chips for each profile in the vacation (multi-select, OR logic)

Bottom bar: "Ver N itens" button showing live filtered count. Tap dismisses and applies.

### Component Files

- `src/components/packing/status-count-pill.tsx` — **CREATE**
- `src/components/packing/filter-panel.tsx` — **CREATE**
- `src/components/packing/index.ts` — **MODIFY** — add exports
- `src/components/packing-item-list.tsx` — **MODIFY** — add pill header, filter chips, filter logic
- `src/stores/packing.store.ts` — **MODIFY** — extend with profile filters, persistence

### Previous Story Context (3.3)

- Packing items now have swipeable wrappers with StatusBadge
- Items wrapped in `GestureHandlerRootView`
- `onStatusChange` prop handles swipe status changes
- Long-press shows context menu (not delete)
- Snackbar undo active

### What NOT To Do

- Do NOT implement category filters — categories come in Epic 4
- Do NOT add left navigation drawer — out of scope for this story
- Do NOT change the item card layout — that's Story 3.6
- Do NOT add real-time sync — that's Story 3.5

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 3.4] — Acceptance criteria
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Experience Mechanics] — Filter UX flow
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Design Direction] — Status count pills, filter chips, right panel
- [Source: _bmad-output/planning-artifacts/architecture.md#State Management] — Zustand for UI state

## Dev Agent Record

### Agent Model Used

claude-opus-4-6

### Debug Log References

### Completion Notes List

- Created `src/components/packing/status-count-pill.tsx` — mode-aware pill with coloured dot, Portuguese label, count; active/inactive visual states
- Created `src/components/packing/filter-panel.tsx` — right-anchored modal with Estado (status chips) and Pessoa (profile chips), live "Ver N itens" count, clear button
- Extended `src/stores/packing.store.ts` — added `activeProfileFilters`, `toggleProfileFilter`, `clearAllFilters`, `activeVacationId`, `setActiveVacation` with per-vacation in-memory filter persistence
- Updated `src/components/packing-item-list.tsx`:
  - Added horizontal StatusCountPill row above list (only statuses with count > 0)
  - Active filter chip row with dismissible chips for status + profile filters
  - "+ Filtros" button to open filter panel
  - Filter logic: packed hidden by default, OR within dimensions, AND across dimensions
  - Empty state with "Limpar filtros" link when no items match
- Updated `src/app/(app)/vacations/[id]/index.tsx` — calls `setActiveVacation(vacationId)` on focus for per-trip filter persistence
- Updated `src/components/packing/index.ts` — added StatusCountPill and FilterPanel exports
- `type-check` and `lint` both pass with zero errors

### File List

- `familyhub/src/components/packing/status-count-pill.tsx` — **CREATED**
- `familyhub/src/components/packing/filter-panel.tsx` — **CREATED**
- `familyhub/src/components/packing/index.ts` — **MODIFIED** — added exports
- `familyhub/src/stores/packing.store.ts` — **MODIFIED** — extended with profile filters and per-vacation persistence
- `familyhub/src/components/packing-item-list.tsx` — **MODIFIED** — filter header, filter logic, empty state
- `familyhub/src/app/(app)/vacations/[id]/index.tsx` — **MODIFIED** — setActiveVacation call
