# Story 6.2: Leftover CRUD & Dose Tracking

Status: review

## Story

As an Admin,
I want to add leftovers to the fridge, eat doses one at a time, throw out what nobody wants, and edit or delete items,
So that I have an accurate, up-to-date record of what's in the fridge and how it's being consumed.

## Acceptance Criteria

1. Tapping the FAB opens an add form; filling name "Lasagna", total doses 4, expiry days 5 creates a leftover with `date_added = now`, `expiry_date = now + 5 days`, `doses_eaten = 0`, `doses_thrown_out = 0`, `status = 'active'`; item appears immediately (optimistic update)
2. Leaving expiry days blank defaults to 5 days
3. Tapping "Eaten" on an active leftover increments `doses_eaten` by 1; remaining dose count updates immediately
4. When `doses_eaten + doses_thrown_out = total_doses` after an "Eaten" tap, item auto-closes (`status = 'closed'`) and moves to closed section
5. Tapping "Throw out" sets `doses_thrown_out = remaining` and `status = 'closed'`; item moves to closed section
6. Closed items have no "Eaten" or "Throw out" buttons (FR48)
7. Editing an active leftover's name, total doses, or expiry duration saves immediately; `expiry_date` recalculates if expiry changed; `total_doses` cannot be reduced below `doses_eaten + doses_thrown_out`
8. Deleting a leftover (active or closed) removes it permanently
9. Basic list shows active items with name, remaining doses, expiry date, and action buttons; closed items show final eaten/thrown counts

## Tasks / Subtasks

- [x] Task 1: Create leftovers route and basic screen (AC: #9)
  - [x] Create `src/app/(app)/leftovers/index.tsx` with basic FlatList rendering leftovers
  - [x] Use `useRepository('leftover')` to access `ILeftoverRepository`
  - [x] Load leftovers via `getActive()` for initial view (simple active list — Story 6.3 adds full sorting/infinite scroll)
  - [x] Show empty state when no leftovers exist
- [x] Task 2: Create leftover item card component (AC: #3, #5, #6, #9)
  - [x] Create `src/components/leftovers/leftover-item-card.tsx`
  - [x] Display: item name, remaining doses (`totalDoses - dosesEaten - dosesThrownOut`), expiry date as days until expiry
  - [x] Active items: show "Comi" (Eaten) button and "Deitar fora" (Throw out) button
  - [x] Closed items: show final counts (eaten / thrown out), no action buttons
  - [x] Tap card to open edit sheet
- [x] Task 3: Create add leftover form (AC: #1, #2)
  - [x] Create `src/components/leftovers/leftover-add-form.tsx` as a Modal bottom sheet
  - [x] Fields: Nome (required, auto-focus), Doses (required, number), Dias de validade (optional, defaults to 5)
  - [x] "Guardar" button calls `leftoverRepo.create({ familyId, name, totalDoses, expiryDays })`
  - [x] Form stays open after save for rapid entry — explicit close to dismiss
  - [x] Validate: name not empty, doses > 0
- [x] Task 4: Implement "Eaten" dose tracking (AC: #3, #4)
  - [x] Wire "Comi" button to `leftoverRepo.incrementEaten(id)`
  - [x] Auto-close handled by repository (SQL CASE expression) — UI re-renders via loadLeftovers()
- [x] Task 5: Implement "Throw out" action (AC: #5, #6)
  - [x] Wire "Deitar fora" button to `leftoverRepo.throwOutRemaining(id)`
  - [x] Show confirmation dialog before throw-out (Alert.alert — V1 UX-DR29 pattern)
  - [x] Item transitions to closed state after throw-out
- [x] Task 6: Create edit leftover form (AC: #7)
  - [x] Create `src/components/leftovers/leftover-edit-form.tsx` as a separate Modal bottom sheet
  - [x] Editable fields: Nome, Doses totais, Dias de validade
  - [x] Enforce `totalDoses >= dosesEaten + dosesThrownOut` (validation error message shown)
  - [x] "Guardar" calls `leftoverRepo.update(id, { name, totalDoses, expiryDays })`
  - [x] "Eliminar" button with confirmation dialog calls `leftoverRepo.delete(id)`
- [x] Task 7: Create barrel export (AC: all)
  - [x] Create `src/components/leftovers/index.ts` barrel exporting all leftover components

## Dev Notes

### Story 6.1 Built the Data Layer — Reuse It

All repository methods, types, and constants are ready. This story is purely UI + wiring.

**Available from Story 6.1:**
- `ILeftoverRepository` with `create`, `update`, `delete`, `getById`, `getActive`, `getAll`, `incrementEaten`, `throwOutRemaining`
- `Leftover`, `LeftoverStatus`, `CreateLeftoverInput` types
- `DEFAULT_EXPIRY_DAYS = 5`, `PAGINATION_PAGE_SIZE = 20` constants
- `useLeftoversStore` Zustand store
- Repository registered in `RepositoryContext` as `leftover`

**Access pattern:**
```typescript
import { useRepository } from "../../../hooks/use-repository";
const leftoverRepo = useRepository("leftover");
```

### Scope Boundary with Story 6.3

This story creates a **basic working list** with CRUD and dose tracking. Story 6.3 adds the full list features:
- Sorting (active first by expiry ASC, closed by expiry DESC)
- Expired item red flagging
- Infinite scroll pagination
- Closed items section

For this story, use `getActive(familyId)` for the list. Story 6.3 will switch to `getAll()` with pagination.

### UI Pattern: Follow categories.tsx

The closest V1 pattern is `src/app/(app)/settings/categories.tsx`:
- ScrollView/FlatList with items
- FAB (56x56, borderRadius: 16, `#B5451B`, bottom-right)
- Modal bottom sheet for add/edit (slide-up, borderRadius 16 top corners)
- Form fields with TextInput
- "Guardar" / "Cancelar" / "Eliminar" buttons in sheet footer
- Empty state text when list is empty
- Snackbar for success feedback

### FAB Style (consistent with V1)

```typescript
fab: {
  position: "absolute",
  bottom: 16,
  right: 16,
  width: 56,
  height: 56,
  borderRadius: 16,
  backgroundColor: "#B5451B",
  justifyContent: "center",
  alignItems: "center",
  elevation: 6,
},
fabText: { color: "#fff", fontSize: 28, fontWeight: "300" },
```

### Item Card Design

Each active leftover card should show:
```
┌──────────────────────────────────────┐
│ Lasagna                    Exp: 2d   │
│ 3 doses restantes                    │
│ [Comi]              [Deitar fora]    │
└──────────────────────────────────────┘
```

Each closed leftover card:
```
┌──────────────────────────────────────┐
│ Coq au vin              ✓ Fechado   │
│ 0 comidas · 3 deitadas fora         │
└──────────────────────────────────────┘
```

### Date Formatting

Use `pt-PT` locale for expiry date display (architecture requirement):
```typescript
import { formatDistanceToNow } from "../../utils/date.utils";
// Or use Intl.DateTimeFormat directly:
new Intl.DateTimeFormat("pt-PT", { day: "numeric", month: "short" }).format(new Date(expiryDate));
```

### Destructive Action Pattern (V1 UX-DR29)

"Throw out" and "Delete" are destructive — show confirmation:
```typescript
Alert.alert(
  "Deitar fora",
  "Descartar todas as doses restantes?",
  [
    { text: "Cancelar", style: "cancel" },
    { text: "Deitar fora", style: "destructive", onPress: () => throwOut(id) },
  ]
);
```

### Portuguese Labels

| English | Portuguese |
|---------|-----------|
| Eaten | Comi |
| Throw out | Deitar fora |
| Save | Guardar |
| Cancel | Cancelar |
| Delete | Eliminar |
| Name | Nome |
| Total doses | Doses totais |
| Expiry days | Dias de validade |
| Remaining | restantes |
| Closed | Fechado |
| No leftovers | Sem restos no frigorífico |
| eaten | comidas |
| thrown out | deitadas fora |

### Project Structure Notes

| File | Path |
|------|------|
| Screen | `src/app/(app)/leftovers/index.tsx` |
| Item card | `src/components/leftovers/leftover-item-card.tsx` |
| Add form | `src/components/leftovers/leftover-add-form.tsx` |
| Edit form | `src/components/leftovers/leftover-edit-form.tsx` (or combined with add) |
| Barrel | `src/components/leftovers/index.ts` |

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 6.2]
- [Source: _bmad-output/planning-artifacts/prd.md#Leftovers Management (V2)]
- [Source: _bmad-output/planning-artifacts/architecture.md#Project Structure & Boundaries]
- [Pattern: src/app/(app)/settings/categories.tsx — CRUD screen with FAB + modal sheet]
- [Pattern: src/components/packing/packing-item-card.tsx — item card with actions]
- [Pattern: src/hooks/use-repository.ts — repository access hook]
- [Previous: _bmad-output/implementation-artifacts/6-1-leftovers-data-layer-and-repository.md]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

- TypeScript compilation: zero errors
- ESLint: zero errors, zero warnings (removed unused `formatExpiryDate` function)
- Prettier: all files formatted (one minor formatting fix in edit form)

### Completion Notes List

- Created leftovers route screen with FlatList, FAB, empty state, Snackbar feedback
- Item card shows name, remaining doses, days-until-expiry badge; "Comi" (green) and "Deitar fora" (red outline) buttons for active items; final counts for closed items
- Add form: Modal bottom sheet with Nome, Doses, Dias de validade fields; form resets after save but stays open for rapid entry; validates name not empty and doses >= 1
- Edit form: separate Modal bottom sheet; enforces `totalDoses >= dosesEaten + dosesThrownOut` with validation message; "Eliminar" button with Alert confirmation; closed items are read-only (no save button)
- "Eaten" wired to `incrementEaten(id)` — auto-close handled by repository SQL CASE; screen reloads after action
- "Throw out" wired to `throwOutRemaining(id)` with Alert.alert confirmation dialog before executing
- All UI text in Portuguese matching V1 conventions
- Followed categories.tsx pattern: FAB styling, Modal bottom sheet, form structure, Snackbar, back button

### Change Log

- 2026-03-28: Story 6.2 implemented — all 7 tasks complete

### File List

**New files:**
- `src/app/(app)/leftovers/index.tsx`
- `src/components/leftovers/leftover-item-card.tsx`
- `src/components/leftovers/leftover-add-form.tsx`
- `src/components/leftovers/leftover-edit-form.tsx`
- `src/components/leftovers/index.ts`
