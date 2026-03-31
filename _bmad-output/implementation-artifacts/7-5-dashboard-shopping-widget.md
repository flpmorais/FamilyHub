# Story 7.5: Dashboard Shopping Widget

Status: review

## Story

As an Admin,
I want a shopping widget on the dashboard showing how many items I need to buy,
So that I always know at a glance what to shop for.

## Acceptance Criteria

1. **Given** there are unticked shopping items in the database, **When** the admin views the home dashboard, **Then** the Shopping widget displays the count of unticked (open) items (FR66). **And** the widget text reads e.g., "12 itens" (Portuguese, with correct singular/plural).

2. **Given** there are no unticked shopping items, **When** the dashboard loads, **Then** the Shopping widget shows a zero state: "Lista vazia".

3. **Given** the admin taps the Shopping widget, **When** the navigation executes, **Then** the app navigates to the shopping list screen at `/(app)/(shopping)` (FR67).

4. **Given** the dashboard is revisited (tab switch or app resume), **When** `useFocusEffect` fires, **Then** the widget data reloads to reflect any changes made since last visit.

## Tasks / Subtasks

- [x] Task 1: ShoppingWidget component (AC: #1, #2, #3)
  - [x] Create `src/components/shopping/shopping-widget.tsx`
  - [x] Props: `itemCount: number`, `onPress: () => void`
  - [x] Display: title "Compras" (green, uppercase), count with singular/plural, arrow indicator
  - [x] Zero state: "Lista vazia" in grey
  - [x] Wrapped in `TouchableOpacity` with `onPress`
  - [x] Card: light green (#E8F5E9), border #C8E6C9, rounded 12
- [x] Task 2: Integrate into dashboard (AC: #1, #3, #4)
  - [x] Added `useRepository("shopping")` and `shoppingCount` state
  - [x] Added `loadShoppingCount()` in `useFocusEffect` — filters unticked items client-side
  - [x] Rendered `<ShoppingWidget>` after leftovers widget with navigation to `/(app)/(shopping)`
- [x] Task 3: Component barrel update
  - [x] Added `ShoppingWidget` export to `src/components/shopping/index.ts`

## Dev Notes

### Architecture Compliance

- **Repository pattern:** Use `useRepository("shopping")` — same as leftovers pattern on dashboard. Count unticked items from the result of `getItems()`.
- **No new repository methods needed.** `getItems` already returns all items. Filter client-side: `items.filter(i => !i.isTicked).length`.

### Existing Dashboard Pattern to Follow

The leftovers widget on the dashboard uses this exact pattern:
- `src/app/(app)/(home)/index.tsx` loads data via `useFocusEffect` + repository
- `LeftoversWidget` receives data as props + `onPress` callback
- Navigation: `router.push('/(app)/(leftovers)')`

Shopping widget follows the same pattern but simpler — just a count, no nearest-expiry logic.

### Widget Visual Pattern

Match the leftovers widget card style:
- Card: `backgroundColor: "#E8F5E9"` (light green — differentiate from leftovers orange), `borderRadius: 12`, `padding: 16`, `borderWidth: 1`, `borderColor: "#C8E6C9"`
- Title: "Compras" in bold
- Count: `"{count} {count === 1 ? 'item' : 'itens'}"` 
- Zero state: "Lista vazia" in grey
- Arrow: "→" on the right

### File Locations

```
src/components/shopping/shopping-widget.tsx    ← NEW
src/components/shopping/index.ts               ← MODIFY (add export)
src/app/(app)/(home)/index.tsx                 ← MODIFY (add shopping widget)
```

### Existing Code to Reference

- `src/components/leftovers/leftovers-widget.tsx` — widget component pattern
- `src/app/(app)/(home)/index.tsx` — dashboard data loading, widget rendering, navigation

### UI Language

- Widget title: "Compras"
- Count: "1 item" / "12 itens"
- Zero state: "Lista vazia"

### Out of Scope

- Offline sync (FR83–FR85) — explicitly excluded per user instruction
- NFR28 (reclassification persistence) — already handled in Story 7.2/7.3

### References

- [Source: _bmad-output/planning-artifacts/prd.md#Shopping Management (V2)] — FR66, FR67
- [Source: _bmad-output/planning-artifacts/epics.md#Story 7.5] — acceptance criteria (widget portion only)

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

None — straightforward implementation following leftovers widget pattern exactly.

### Completion Notes List

- ShoppingWidget: green card (#E8F5E9) to differentiate from leftovers orange (#FFF8F5)
- Count loaded via `shoppingRepo.getItems()` then filtered client-side (`!i.isTicked`)
- Widget placed after leftovers widget in dashboard scroll view
- Reloads on screen focus via `useFocusEffect` — same pattern as leftovers

### Change Log

- 2026-03-31: Story 7.5 implemented — dashboard shopping widget

### File List

**New files:**
- src/components/shopping/shopping-widget.tsx

**Modified files:**
- src/app/(app)/(home)/index.tsx (added shopping widget + data loading)
- src/components/shopping/index.ts (added ShoppingWidget export)
