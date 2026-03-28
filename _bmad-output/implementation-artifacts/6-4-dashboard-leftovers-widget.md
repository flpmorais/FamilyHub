# Story 6.4: Dashboard Leftovers Widget

Status: review

## Story

As an Admin,
I want a widget on the home dashboard that tells me how many meals and doses are in the fridge and what expires next,
So that I can decide at a glance whether to cook something new or use what's already there.

## Acceptance Criteria

1. When active leftovers exist, widget displays: count of active items (as meals), sum of remaining doses, name and expiry date of nearest-expiring item (FR53)
2. Given 2 active leftovers "Lasagna" (2 remaining, expires Sunday) and "Coq au vin" (3 remaining, expires Thursday), widget shows: "2 refeições · 5 doses — Coq au vin expira quinta"
3. When no active leftovers exist, widget shows empty state ("Frigorífico vazio")
4. When nearest-expiring item is past expiry, expiry info is visually flagged red (consistent with list screen)
5. Tapping widget navigates to `leftovers/index.tsx` (FR54)
6. Offline: widget renders correctly from local SQLite data; expiry flagging uses device-local time

## Tasks / Subtasks

- [x] Task 1: Create leftovers widget component (AC: #1, #2, #3, #4)
  - [x] Create `src/components/leftovers/leftovers-widget.tsx`
  - [x] Accept `Leftover[]` data as prop (computed internally)
  - [x] Compute aggregates: activeMeals count, totalActiveDoses sum, nearest expiry (items[0])
  - [x] Display: "{N} refeições · {M} doses" + "{name} expira {date}"
  - [x] Empty state: "Frigorífico vazio" when no active items
  - [x] Expired nearest item: red text (`#D32F2F`) + bold when `daysUntilExpiry <= 0`
  - [x] Touchable with `onPress` prop; warm card styling (#FFF8F5 bg, #F0E0D8 border)
- [x] Task 2: Integrate widget into dashboard screen (AC: #1, #5)
  - [x] Added `leftoverRepo.getActive(familyId)` loading in `useFocusEffect` alongside vacation loading
  - [x] Render `LeftoversWidget` in `widgetSection` between pinned vacations and nav section
  - [x] Wire `onPress` to `router.push("/(app)/leftovers")`
  - [x] Silently fails on error (dashboard pattern)
- [x] Task 3: Add "Restos" navigation link (AC: #5)
  - [x] Added "Restos" link to nav section (same style as existing links, routes to `/(app)/leftovers`)
- [x] Task 4: Update barrel export (AC: all)
  - [x] Added `LeftoversWidget` to `src/components/leftovers/index.ts`

## Dev Notes

### Widget Computes Aggregates from Active Leftovers

The dashboard loads `getActive(familyId)` — returns active items sorted by `expiry_date ASC`. The widget component computes:

```typescript
function computeWidgetData(items: Leftover[]): LeftoverWidgetData {
  const activeMeals = items.length;
  const totalActiveDoses = items.reduce(
    (sum, l) => sum + (l.totalDoses - l.dosesEaten - l.dosesThrownOut),
    0,
  );
  const nearestExpiry = items.length > 0
    ? { name: items[0].name, expiryDate: items[0].expiryDate }
    : null;
  return { activeMeals, totalActiveDoses, nearestExpiry };
}
```

Items are already sorted by `expiry_date ASC` from the repository — `items[0]` is the nearest expiry.

### Widget Visual Design

Follow the existing dashboard card pattern (simple, not hero-card complex):

```
┌──────────────────────────────────────┐
│ 🍽️ Restos                           │
│ 2 refeições · 5 doses               │
│ Coq au vin expira quinta      →     │
└──────────────────────────────────────┘
```

Empty state:
```
┌──────────────────────────────────────┐
│ 🍽️ Restos                           │
│ Frigorífico vazio                    │
└──────────────────────────────────────┘
```

### Dashboard Integration Pattern

The dashboard uses `useFocusEffect` to reload data when screen gains focus. Add leftover loading to the same pattern:

```typescript
const leftoverRepo = useRepository("leftover");
const [activeLeftovers, setActiveLeftovers] = useState<Leftover[]>([]);

useFocusEffect(
  useCallback(() => {
    void loadPinned();
    void loadLeftovers();
  }, [])
);

async function loadLeftovers() {
  if (!userAccount?.familyId) return;
  try {
    const list = await leftoverRepo.getActive(userAccount.familyId);
    setActiveLeftovers(list);
  } catch {
    // Silently fail on dashboard
  }
}
```

### Expiry Flagging (Consistent with List Screen)

Reuse `daysUntilExpiry()` pattern from `leftover-item-card.tsx`:

```typescript
function daysUntilExpiry(iso: string): number {
  const now = new Date();
  const expiry = new Date(iso);
  return Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}
```

If nearest expiry `days <= 0`, show expiry text in red (`#D32F2F`).

### Date Display for Widget

Use `pt-PT` locale for the expiry date:

```typescript
new Intl.DateTimeFormat("pt-PT", { weekday: "long" }).format(new Date(expiryDate));
// e.g., "quinta-feira" → truncate to "quinta" or use { weekday: "short" }
```

Or use the day + month format:
```typescript
new Intl.DateTimeFormat("pt-PT", { day: "numeric", month: "short" }).format(new Date(expiryDate));
// e.g., "28 mar."
```

### Portuguese Labels

| English | Portuguese |
|---------|-----------|
| meals | refeições |
| doses | doses |
| expires | expira |
| Fridge empty | Frigorífico vazio |
| Leftovers | Restos |

### Project Structure Notes

| File | Action |
|------|--------|
| `src/components/leftovers/leftovers-widget.tsx` | **NEW** |
| `src/components/leftovers/index.ts` | **MODIFY** — add export |
| `src/app/(app)/index.tsx` | **MODIFY** — add widget + leftover loading + nav link |

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 6.4]
- [Source: _bmad-output/planning-artifacts/prd.md#FR53, FR54]
- [Pattern: src/app/(app)/index.tsx — current dashboard to modify]
- [Pattern: src/components/leftovers/leftover-item-card.tsx — daysUntilExpiry + expiry flagging]
- [Type: src/types/leftover.types.ts — LeftoverWidgetData]
- [Previous: _bmad-output/implementation-artifacts/6-3-leftovers-list-screen.md]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

- TypeScript compilation: zero errors
- ESLint: zero errors after prettier formatting

### Completion Notes List

- Created `LeftoversWidget` component: warm card styling (#FFF8F5 bg), "RESTOS" title in brand color, summary line with meal/dose counts (singular/plural), expiry row with nearest item name + formatted date (pt-PT day+month), arrow indicator, empty state "Frigorífico vazio"
- Expiry flagging: `daysUntilExpiry()` check — when `days <= 0`, expiry text turns red (#D32F2F) + bold, consistent with list screen card flagging
- Dashboard integration: added `loadLeftovers()` alongside `loadPinned()` in `useFocusEffect` — both reload on focus; silently fails on error
- Widget placed between pinned vacations and nav section in `widgetSection` with bottom margin
- Added "Restos" nav link to navigation section, routing to `/(app)/leftovers`
- Date formatting: `Intl.DateTimeFormat("pt-PT", { day: "numeric", month: "short" })` — e.g., "28 mar."

### Change Log

- 2026-03-28: Story 6.4 implemented — all 4 tasks complete

### File List

**New files:**
- `src/components/leftovers/leftovers-widget.tsx`

**Modified files:**
- `src/app/(app)/index.tsx` — added leftover loading, widget rendering, "Restos" nav link
- `src/components/leftovers/index.ts` — added LeftoversWidget export
