# Story 6.3: Leftovers List Screen

Status: review

## Story

As an Admin,
I want to see all my leftovers in a single scrollable list — active items first with expired ones flagged in red, closed items below — loading more as I scroll,
So that I can quickly assess what's in the fridge and review the history of what was consumed or wasted.

## Acceptance Criteria

1. Screen shows active items first (sorted by expiry date ASC — nearest first), then closed items below (sorted by expiry date DESC — most recent first)
2. Active items past their expiry date are visually flagged red — evaluated against device-local `Date.now()`, works offline (FR52, NFR23)
3. Active items not yet expired display in normal styling
4. When scrolling to the bottom, the next page loads automatically (infinite scroll, FR56); `leftoversStore` pagination cursor updates; page size = `PAGINATION_PAGE_SIZE`
5. Empty state shown when no items exist at all
6. Offline: list loads from local SQLite cache without error; expiry flagging evaluates correctly on device-local time
7. Item cards show: name, remaining doses, expiry date, action buttons (active) or final counts (closed)

## Tasks / Subtasks

- [x] Task 1: Switch screen from `getActive()` to `getAll()` with pagination (AC: #1, #4)
  - [x] Modify `src/app/(app)/leftovers/index.tsx` to use `leftoverRepo.getAll(familyId, PAGINATION_PAGE_SIZE, offset)` instead of `getActive()`
  - [x] Import `PAGINATION_PAGE_SIZE` from `../../../constants/leftover-defaults`
  - [x] Import and use `useLeftoversStore` for pagination cursor state
  - [x] Initial load: offset 0, set pagination cursor to `PAGINATION_PAGE_SIZE`
  - [x] Track `hasMore` flag: if returned rows < `PAGINATION_PAGE_SIZE`, no more pages
- [x] Task 2: Implement infinite scroll (AC: #4)
  - [x] Add `onEndReached` handler to FlatList — calls `loadMore()` when near bottom
  - [x] `loadMore()`: if `hasMore && !loadingMoreRef.current`, fetch next page, append, update cursor
  - [x] Add `onEndReachedThreshold={0.5}` to trigger before reaching absolute bottom
  - [x] Show `ActivityIndicator` in `ListFooterComponent` when loading more
  - [x] Prevent duplicate loads with `loadingMoreRef` ref guard (more reliable than state)
- [x] Task 3: Add section visual separation (AC: #1)
  - [x] Add "Fechados" section header between active and closed items
  - [x] Only shows when both active and closed items exist (`firstClosedIndex > 0`)
- [x] Task 4: Ensure expiry flagging works correctly (AC: #2, #3, #6)
  - [x] Card already flags expired items via `days <= 0` + `expiryExpired` badge style
  - [x] Added `cardExpired` style: red left border (4px #D32F2F) + red border tint (#FFCDD2)
  - [x] Confirmed: `daysUntilExpiry()` uses `new Date()` (device-local) — works offline
- [x] Task 5: Reload list after CRUD actions (AC: #7)
  - [x] All CRUD handlers call `reloadFromStart()` which resets pagination to offset 0 and reloads
  - [x] Ensures sort order is correct after status changes

## Dev Notes

### This Story MODIFIES Existing Files — Not Creating New Ones

Story 6.2 created all the files. This story upgrades the screen from a simple active-only list to a full sorted paginated list with both active and closed items.

**Files to modify:**
- `src/app/(app)/leftovers/index.tsx` — main changes (pagination, `getAll()`, infinite scroll, section divider)
- `src/components/leftovers/leftover-item-card.tsx` — minor: add expired card styling (red border/tint)

**Files NOT to modify:**
- `leftover-add-form.tsx`, `leftover-edit-form.tsx`, `index.ts` — no changes needed

### Key Change: `getActive()` → `getAll()`

Story 6.2 used `getActive(familyId)` which returns only active items. Replace with:

```typescript
const list = await leftoverRepo.getAll(
  userAccount.familyId,
  PAGINATION_PAGE_SIZE,
  offset,
);
```

`getAll()` already sorts correctly in SQL:
- Active items first (`status = 'active'`), by `expiry_date ASC`
- Closed items second (`status = 'closed'`), by `expiry_date DESC`

### Infinite Scroll Pattern

```typescript
const [leftovers, setLeftovers] = useState<Leftover[]>([]);
const [hasMore, setHasMore] = useState(true);
const [isLoadingMore, setIsLoadingMore] = useState(false);
const { paginationCursor, setPaginationCursor } = useLeftoversStore();

async function loadLeftovers() {
  // Initial load — reset
  const list = await leftoverRepo.getAll(familyId, PAGINATION_PAGE_SIZE, 0);
  setLeftovers(list);
  setPaginationCursor(PAGINATION_PAGE_SIZE);
  setHasMore(list.length === PAGINATION_PAGE_SIZE);
}

async function loadMore() {
  if (!hasMore || isLoadingMore) return;
  setIsLoadingMore(true);
  const nextPage = await leftoverRepo.getAll(familyId, PAGINATION_PAGE_SIZE, paginationCursor);
  setLeftovers(prev => [...prev, ...nextPage]);
  setPaginationCursor(paginationCursor + PAGINATION_PAGE_SIZE);
  setHasMore(nextPage.length === PAGINATION_PAGE_SIZE);
  setIsLoadingMore(false);
}

// FlatList props:
// onEndReached={loadMore}
// onEndReachedThreshold={0.5}
// ListFooterComponent={isLoadingMore ? <ActivityIndicator /> : null}
```

### Section Divider Between Active and Closed

Find the boundary in the sorted list where status changes from `'active'` to `'closed'`:

```typescript
const firstClosedIndex = leftovers.findIndex(l => l.status === "closed");

// In renderItem, if index === firstClosedIndex, render a section header above:
{index === firstClosedIndex && (
  <Text style={s.sectionHeader}>Fechados</Text>
)}
```

### Expired Card Styling Enhancement

The card already has `expiryExpired` for the badge. Add a subtle red left border or tint to the card itself:

```typescript
// In leftover-item-card.tsx, add:
const isExpired = isActive && days <= 0;

// On the card style:
style={[s.card, !isActive && s.cardClosed, isExpired && s.cardExpired]}

// New style:
cardExpired: {
  borderLeftWidth: 4,
  borderLeftColor: "#D32F2F",
  borderColor: "#FFCDD2",
},
```

### After CRUD: Reset and Reload

After any action (add, eaten, throw out, edit, delete), reset pagination:

```typescript
async function reloadFromStart() {
  const list = await leftoverRepo.getAll(familyId, PAGINATION_PAGE_SIZE, 0);
  setLeftovers(list);
  setPaginationCursor(PAGINATION_PAGE_SIZE);
  setHasMore(list.length === PAGINATION_PAGE_SIZE);
}
```

Replace all `loadLeftovers()` calls with `reloadFromStart()`.

### Offline: Already Handled

PowerSync serves `getAll()` from local SQLite. The `daysUntilExpiry()` function uses `Date.now()` device-local. No changes needed — offline works by design.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 6.3]
- [Source: _bmad-output/planning-artifacts/prd.md#FR52, FR55, FR56, NFR23]
- [Source: _bmad-output/planning-artifacts/architecture.md#(V2) Leftovers Data Architecture]
- [Previous: _bmad-output/implementation-artifacts/6-2-leftover-crud-and-dose-tracking.md]
- [Pattern: src/app/(app)/leftovers/index.tsx — current screen to modify]
- [Pattern: src/components/leftovers/leftover-item-card.tsx — card to enhance]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

- TypeScript compilation: zero errors
- ESLint: zero errors after prettier fix (one formatting issue auto-fixed)

### Completion Notes List

- Switched from `getActive()` to `getAll()` with `PAGINATION_PAGE_SIZE` offset — SQL already sorts active-first by expiry ASC, closed by expiry DESC
- Infinite scroll: `onEndReached` + `onEndReachedThreshold={0.5}` + `loadingMoreRef` (ref-based guard prevents duplicate calls better than state)
- Section divider: "Fechados" label rendered inline via `firstClosedIndex` detection — only appears when both active and closed items exist
- Expired card styling: added `cardExpired` with 4px red left border + red-tinted border — visually distinct beyond just the badge
- All CRUD handlers (`handleAdd`, `handleEaten`, `handleThrowOut`, `handleEdit`, `handleDelete`) call `reloadFromStart()` which resets pagination cursor to 0
- Extracted `familyId` to avoid repeated optional chaining
- Offline: no changes needed — PowerSync serves `getAll()` from SQLite, `daysUntilExpiry()` uses device-local time

### Change Log

- 2026-03-28: Story 6.3 implemented — all 5 tasks complete

### File List

**Modified files:**
- `src/app/(app)/leftovers/index.tsx` — pagination, infinite scroll, section divider, reloadFromStart
- `src/components/leftovers/leftover-item-card.tsx` — expired card styling (cardExpired)
