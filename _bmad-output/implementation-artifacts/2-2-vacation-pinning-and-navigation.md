# Story 2.2: Vacation Pinning & Navigation

Status: done

## Story

As an Admin,
I want to pin vacations to the dashboard and navigate between them,
So that active trips are always one tap away on both my and Angela's device.

## Acceptance Criteria

1. **Given** a vacation exists
   **When** an Admin taps the pin toggle on a vacation
   **Then** `vacation.is_pinned` is set to `true` and syncs to all Admin devices via PowerSync
   **And** Angela's app shows the same pin state without refresh (NFR3)

2. **Given** multiple vacations are pinned
   **When** any Admin opens the app
   **Then** all pinned vacations appear as cards on the dashboard
   **And** unpinned vacations are only visible from the vacation list screen

3. **Given** an Admin taps a pinned vacation card on the dashboard
   **When** the card is tapped
   **Then** the app navigates to the vacation detail view

4. **Given** the dashboard shows pinned vacation cards
   **When** the list renders
   **Then** each card shows: country flag + title, dates, participant count, lifecycle badge

## Tasks / Subtasks

- [x] Task 1: Add pin toggle to vacation list (AC: 1)
  - [x] Add a pin icon/button to each vacation card row in `vacations/index.tsx`
  - [x] Tapping calls `vacationRepository.updateVacation(id, { isPinned: !current })`
  - [x] Pinned vacations show a filled pin icon; unpinned show an outline
  - [x] No page reload flicker — update local state optimistically

- [x] Task 2: Show pinned vacations on dashboard (AC: 2, 4)
  - [x] Rewrite `src/app/(app)/index.tsx` to load pinned vacations from `vacationRepository.getVacations(familyId)`
  - [x] Filter to `isPinned === true`
  - [x] Render each as a card with: country flag + title, dates (DD/MM/YYYY — DD/MM/YYYY), participant count, lifecycle badge (same colours as vacation list)
  - [x] Keep existing "Perfis" and "Viagens" navigation buttons below the cards

- [x] Task 3: Navigate from dashboard card to vacation detail (AC: 3)
  - [x] Tapping a pinned card on the dashboard navigates to `/(app)/vacations` and opens the edit sheet for that vacation
  - [x] Pass the vacation ID via route params or state — simplest approach: `router.push('/(app)/vacations?edit=<id>')`
  - [x] In `vacations/index.tsx`, read the `edit` param on mount; if present, find the vacation and call `openEdit(vacation)`

- [ ] Task 4: Verify (AC: 1, 2, 3, 4)
  - [x] `npm run type-check` — zero errors
  - [x] `npm run lint` — zero errors
  - [ ] Build: `npx expo run:android`
  - [ ] Pin a vacation → pin icon fills, card appears on dashboard
  - [ ] Unpin → card disappears from dashboard
  - [ ] Tap pinned card on dashboard → navigates to vacation edit
  - [ ] Multiple pinned vacations → all show on dashboard

## Dev Notes

### ⚠️ No Migration Needed

`vacations.is_pinned` already exists (boolean, default false). The `updateVacation` repository method already handles `isPinned`. No schema changes required.

### Pin Icon Pattern

Use simple text-based pin indicators (no external icon library):
- Pinned: `📌` emoji or a filled-colour indicator
- Unpinned: light grey text `Pin`

The pin toggle sits on the right side of each vacation card row, next to the lifecycle badge. It's a separate `TouchableOpacity` that calls `updateVacation` directly without opening the edit sheet.

### Dashboard Cards

The dashboard replaces the simple placeholder with a real layout:
- Header: "FamilyHub" title
- Pinned vacation cards (scrollable if many)
- Navigation buttons at the bottom (Perfis, Viagens)

Each pinned card should look like a compact version of the vacation list row:
```
🇵🇹 Férias Algarve 2026
26/07/2026 — 09/08/2026 · 4 participantes
                                [Planeamento]
```

### Navigation to Vacation Detail

The simplest approach is to use a query param. When the user taps a dashboard card:
```typescript
router.push(`/(app)/vacations?edit=${vacation.id}`);
```

In `vacations/index.tsx`, use `useLocalSearchParams()` from `expo-router` to read the `edit` param:
```typescript
import { useLocalSearchParams } from 'expo-router';

const { edit } = useLocalSearchParams<{ edit?: string }>();

useEffect(() => {
  if (edit && vacations.length > 0) {
    const vacation = vacations.find(v => v.id === edit);
    if (vacation) openEdit(vacation);
  }
}, [edit, vacations]);
```

### No Separate Vacation Detail Screen

Story 2.2 does NOT create a separate `vacations/[id].tsx` detail screen. The edit bottom sheet in `vacations/index.tsx` serves as the detail view for now. A full detail screen with booking tasks, packing list tabs etc. comes in later stories.

### Learnings from Story 2.1

- **No `.single()` on Supabase mutations** — use `.select()` + check `rows[0]`
- **No screen flicker** — `loadData()` without `setIsLoading(true)` for post-mutation reloads
- **`setTimeout(() => Alert.alert(...), 400)`** after closing a Modal on Android
- **Country flag emoji**: `countryFlag(code)` from `utils/countries.ts`
- **Date formatting**: `formatDate(iso)` returns `DD/MM/YYYY`
- **`useRepository('vacation')`** already wired in context

### Project Structure Notes

- No new files needed besides modifying `index.tsx` (dashboard) and `vacations/index.tsx`
- No new migrations
- No new dependencies

### References

- Epic 2 Story 2.2 — `_bmad-output/planning-artifacts/epics.md`
- Vacation list screen — `familyhub/src/app/(app)/vacations/index.tsx`
- Dashboard — `familyhub/src/app/(app)/index.tsx`
- Vacation types — `familyhub/src/types/vacation.types.ts`
- Country flag utility — `familyhub/src/utils/countries.ts`

## Dev Agent Record

### Agent Model Used

claude-opus-4-6

### Debug Log References

### Completion Notes List

- Pin toggle: 📌 (pinned) / 📍 (unpinned) emoji button on each vacation card, calls updateVacation directly
- Dashboard rewritten: loads pinned vacations on mount, renders cards with flag + title, dates, participant count, lifecycle badge
- Navigation: tapping a pinned card on dashboard uses `router.push('/(app)/vacations?edit=<id>')`, vacation list reads `useLocalSearchParams` and auto-opens edit sheet
- No migration needed (is_pinned already existed)
- No flicker on pin/unpin (loadData without setIsLoading)

### File List

- `familyhub/src/app/(app)/index.tsx` (rewritten)
- `familyhub/src/app/(app)/vacations/index.tsx` (modified — pin toggle, edit param)
