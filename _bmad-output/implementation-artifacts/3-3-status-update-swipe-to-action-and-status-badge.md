# Story 3.3: Status Update — Swipe-to-Action & StatusBadge

Status: review

## Story

As an Admin,
I want to update a packing item's status with a swipe gesture,
so that moving items through the packing workflow takes one gesture — under one second.

## Acceptance Criteria

1. **Given** the `SwipeableItemWrapper` component is built
   **When** an item is swiped left past the 40% threshold
   **Then** the primary action is confirmed — status advances to the next logical state: `new→buy`, `buy→ready`, `ready→packed`, `issue→ready`, `last_minute→packed`
   **And** the item's colour strip and `StatusBadge` update instantly (optimistic update — no loading indicator)
   **And** a Snackbar "Desfazer" appears for 4 seconds
   **And** tapping "Desfazer" reverts the status change

2. **Given** an item is swiped right past the 40% threshold
   **When** the secondary action is confirmed
   **Then** if current status is `new` or `ready`: status changes to `buy`
   **And** if current status is `buy` or `ready`: status changes to `issue`
   **And** the same optimistic update and Snackbar behaviour applies

3. **Given** a swipe is released below the 40% threshold
   **When** the gesture ends
   **Then** the item snaps back to its original position with a spring animation
   **And** no status change occurs

4. **Given** a `StatusBadge` renders for any status
   **When** viewed in both light and dark mode
   **Then** the badge background matches `STATUS_COLOURS[status].bg`
   **And** the badge text matches `STATUS_COLOURS[status].text` (dark for Buy, white for all others)
   **And** the 4dp left strip on the packing item row matches the same `bg` colour

5. **Given** a user with TalkBack enabled interacts with a packing item
   **When** they long-press the item
   **Then** a context menu appears with the same actions as swipe-left and swipe-right (accessibility fallback)

## Tasks / Subtasks

- [x] Task 1: Create `StatusBadge` component (AC: 4)
  - [x] 1.1 Create `src/components/packing/status-badge.tsx`
  - [x] 1.2 Renders a small rounded badge with `STATUS_COLOURS[status].bg` background and `STATUS_COLOURS[status].text` label
  - [x] 1.3 Use `useStatusColours()` hook for light/dark mode awareness
  - [x] 1.4 Label text uses the Portuguese status label (Novo, Comprar, Pronto, Problema, Última hora, Embalado)

- [x] Task 2: Create `SwipeableItemWrapper` component (AC: 1, 2, 3)
  - [x] 2.1 Create `src/components/packing/swipeable-item-wrapper.tsx`
  - [x] 2.2 Use `react-native-gesture-handler` `Gesture.Pan()` + `react-native-reanimated` for the swipe gesture
  - [x] 2.3 Swipe left past 40% → call `onSwipeLeft()` callback; reveal colour-coded action behind (next status colour)
  - [x] 2.4 Swipe right past 40% → call `onSwipeRight()` callback; reveal colour-coded action behind (secondary status colour)
  - [x] 2.5 Below 40% threshold → spring animation back to rest position, no action
  - [x] 2.6 Children rendered as the card content; wrapper handles gesture only

- [x] Task 3: Define status transition logic (AC: 1, 2)
  - [x] 3.1 Create `src/utils/status-transitions.ts` with nextStatus and secondaryStatus
  - [x] 3.2 Export both functions

- [x] Task 4: Integrate swipe + badge into packing item list (AC: 1, 2, 4)
  - [x] 4.1 Update `src/components/packing-item-list.tsx` — wrap each item row in `SwipeableItemWrapper`
  - [x] 4.2 Add `StatusBadge` trailing each item row (after the meta text)
  - [x] 4.3 Replace the inline `statusColor()` function with `useStatusColours()` for the 4dp left strip
  - [x] 4.4 On swipe left: call `onStatusChange` with `nextStatus(item.status)`
  - [x] 4.5 On swipe right: call `onStatusChange` with `secondaryStatus(item.status)` if not null

- [x] Task 5: Add Snackbar undo (AC: 1, 2)
  - [x] 5.1 After a swipe-triggered status change, show a Snackbar at screen bottom with "Desfazer" action for 4 seconds
  - [x] 5.2 Tapping "Desfazer" calls `onStatusChange` with the previous status to revert
  - [x] 5.3 Use `react-native-paper`'s `Snackbar` component (PaperProvider is active from Story 3.1)

- [x] Task 6: Accessibility fallback (AC: 5)
  - [x] 6.1 On long-press of a packing item, show an `Alert` with action options matching swipe-left and swipe-right labels
  - [x] 6.2 Actions labelled in Portuguese: "Avançar para Comprar", "Marcar como Problema", plus Editar and Eliminar

- [x] Task 7: Verify (AC: 1–5)
  - [x] 7.1 `npm run type-check` — zero errors
  - [x] 7.2 `npm run lint` — zero errors

## Dev Notes

### Status Transition Map

```
Primary (swipe left — advance):
  new → buy
  buy → ready
  ready → packed
  issue → ready
  last_minute → packed

Secondary (swipe right — flag):
  new → buy (same as primary)
  ready → buy
  buy → issue
  ready → issue
  issue → null (no secondary action)
  last_minute → null
  packed → null
```

### Libraries Already Installed

- `react-native-gesture-handler` ~2.30.0 — for `Gesture.Pan()`
- `react-native-reanimated` ^4.2.1 — for `useAnimatedStyle`, `withSpring`, `useSharedValue`
- `react-native-paper` ^5.15.0 — for `Snackbar` component

Do NOT install any additional packages.

### SwipeableItemWrapper Pattern

Use the `react-native-gesture-handler` v2 API (`Gesture.Pan()`) with `react-native-reanimated`:

```typescript
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, runOnJS } from 'react-native-reanimated';

// translateX shared value for the card position
// On gesture end: if |translateX| > threshold (40% of item width), fire action
// Otherwise snap back with withSpring
```

The wrapper wraps children — it does NOT render the card itself. The packing-item-list renders items inside the wrapper.

### StatusBadge Integration

The `StatusBadge` should be a small trailing element in each packing item row. Current row structure in `packing-item-list.tsx`:
```
[4dp strip] [item info (name + meta)] → add [StatusBadge] here
```

### Colour Source

Use `useStatusColours()` from `src/constants/status-colours.ts` — this returns mode-aware (light/dark) tokens. Replace the hardcoded `statusColor()` function currently in `packing-item-list.tsx`.

### Optimistic Update Pattern

1. Immediately update local `items` state with new status
2. Call `onUpdateItem()` to persist
3. If persist fails, revert local state
4. Show Snackbar regardless (Snackbar undo also calls `onUpdateItem`)

The parent (vacation detail screen) calls `loadAll()` after `onUpdateItem`, which refreshes `items`. For optimistic feel, the list component should update its own display state before the async call completes.

### Snackbar from react-native-paper

```typescript
import { Snackbar } from 'react-native-paper';

<Snackbar
  visible={snackVisible}
  onDismiss={() => setSnackVisible(false)}
  duration={4000}
  action={{ label: 'Desfazer', onPress: handleUndo }}
>
  Estado alterado para {STATUS_LABELS[newStatus]}
</Snackbar>
```

### Component File Structure (from Architecture)

Per architecture, packing components go in `src/components/packing/`. Create the directory and files there:
- `src/components/packing/status-badge.tsx`
- `src/components/packing/swipeable-item-wrapper.tsx`
- `src/components/packing/index.ts` (barrel export)

Utility goes in:
- `src/utils/status-transitions.ts`

### Previous Story Learnings (3.2)

- Packing item list is in `src/components/packing-item-list.tsx` (not a screen file)
- It receives callbacks from the vacation detail screen: `onCreateItem`, `onUpdateItem`, `onDeleteItem`
- Items rendered in a ScrollView with FAB
- Current item row: TouchableOpacity with status strip + info (name + meta text)
- Long-press currently triggers delete — AC 5 changes this to a context menu with swipe actions. Move delete to the edit sheet or add it as another option in the context menu.

### What NOT To Do

- Do NOT implement filters — that's Story 3.4
- Do NOT implement `PackingItemCard` as a separate component yet — that's Story 3.6
- Do NOT implement category completion indicators — that's Story 3.6
- Do NOT add the `StatusCountPill` header — that's Story 3.4
- Do NOT change the packing list screen layout — only add swipe + badge to existing rows

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 3.3] — Acceptance criteria
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Effortless Interactions] — Swipe-to-action pattern
- [Source: _bmad-output/planning-artifacts/architecture.md#Project Structure] — Component file locations
- [Source: _bmad-output/planning-artifacts/architecture.md#Starter Template] — Gesture handler + Reanimated as dependencies

## Dev Agent Record

### Agent Model Used

claude-opus-4-6

### Debug Log References

### Completion Notes List

- Created `src/utils/status-transitions.ts` with `nextStatus()` and `secondaryStatus()` — maps primary (swipe left) and secondary (swipe right) transitions per the AC spec
- Created `src/components/packing/status-badge.tsx` — mode-aware badge using `useStatusColours()`, Portuguese labels
- Created `src/components/packing/swipeable-item-wrapper.tsx` — Gesture.Pan() + reanimated, 40% threshold with spring snap-back, colour-coded reveal behind card
- Created `src/components/packing/index.ts` — barrel export
- Updated `src/components/packing-item-list.tsx`:
  - Wrapped items in `SwipeableItemWrapper` with primary/secondary swipe actions
  - Added `StatusBadge` trailing each row
  - Replaced hardcoded `statusColor()` with `useStatusColours()` hook
  - Added `onStatusChange` prop for swipe-triggered status updates
  - Added `Snackbar` from react-native-paper with 4s "Desfazer" undo
  - Long-press now shows accessibility context menu (advance, flag, edit, delete) instead of delete-only
  - Wrapped in `GestureHandlerRootView` for gesture support
- Updated `src/app/(app)/vacations/[id]/index.tsx` — added `handleStatusChange` callback and `onStatusChange` prop
- `type-check` and `lint` both pass with zero errors

### File List

- `familyhub/src/utils/status-transitions.ts` — **CREATED** — status transition logic
- `familyhub/src/components/packing/status-badge.tsx` — **CREATED** — StatusBadge component
- `familyhub/src/components/packing/swipeable-item-wrapper.tsx` — **CREATED** — SwipeableItemWrapper component
- `familyhub/src/components/packing/index.ts` — **CREATED** — barrel export
- `familyhub/src/components/packing-item-list.tsx` — **MODIFIED** — swipe integration, badge, snackbar, accessibility menu
- `familyhub/src/app/(app)/vacations/[id]/index.tsx` — **MODIFIED** — added onStatusChange handler
