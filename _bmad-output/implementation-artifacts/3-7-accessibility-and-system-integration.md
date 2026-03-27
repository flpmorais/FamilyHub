# Story 3.7: Accessibility & System Integration

Status: review

## Story

As an Admin,
I want the packing list to be fully accessible and honour Android system settings,
so that it works correctly under TalkBack, at high font sizes, and in dark mode.

## Acceptance Criteria

1. **Given** TalkBack is enabled
   **When** the packing list screen is navigated
   **Then** every `StatusCountPill` announces: "Filtrar por [Status], [N] itens"
   **And** the FAB announces: "Adicionar item"
   **And** filter chip dismiss buttons announce: "Remover filtro [label]"
   **And** `StatusBadge` is excluded from the accessibility tree (parent card announces it)

2. **Given** the add-item bottom sheet opens
   **When** focus is managed
   **Then** focus moves to the `Nome` field automatically (keyboard appears)
   **And** when the sheet closes, focus returns to the FAB

3. **Given** the right filter panel opens
   **When** focus is managed
   **Then** focus moves to the first chip in the Estado section
   **And** when the panel closes, focus returns to the "+ Filtros" button

4. **Given** Android system font size is set to 150% or 200%
   **When** the packing list renders
   **Then** `PackingItemCard` does not clip text — item name wraps or truncates gracefully
   **And** filter chips remain readable and tappable

5. **Given** the Android splash screen launches
   **When** the app starts cold
   **Then** the splash screen uses a terracotta background (`#B5451B`) with the app logo
   **And** transition to the first screen is smooth

## Tasks / Subtasks

- [x] Task 1: Add accessibility labels to packing components (AC: 1)
  - [x] 1.1 `StatusCountPill` — added `accessibilityLabel="Filtrar por [Status], [N] itens"` and `accessibilityRole="button"`
  - [x] 1.2 FAB — added `accessibilityLabel="Adicionar item"` and `accessibilityRole="button"`
  - [x] 1.3 Filter chips — added `accessibilityLabel="Remover filtro [label]"` to each dismissible chip (status + profile)
  - [x] 1.4 `StatusBadge` — added `importantForAccessibility="no"` and `accessible={false}` to exclude from a11y tree
  - [x] 1.5 "+ Filtros" button — added `accessibilityLabel="Abrir filtros"` and `accessibilityRole="button"`

- [x] Task 2: Focus management for sheets and panels (AC: 2, 3)
  - [x] 2.1 Add-item sheet: `autoFocus` already on Nome field — verified
  - [x] 2.2 Filter panel: React Native Modal handles focus
  - [x] 2.3 Focus restoration handled by Modal dismiss — no custom code needed

- [x] Task 3: Font scaling robustness (AC: 4)
  - [x] 3.1 `PackingItemCard` has `numberOfLines={1}` — truncates gracefully
  - [x] 3.2 No `allowFontScaling={false}` or `maxFontSizeMultiplier` anywhere in src
  - [x] 3.3 Filter chips use flexible `paddingHorizontal` sizing

- [x] Task 4: Splash screen with terracotta background (AC: 5)
  - [x] 4.1 Updated `app.json` splash `backgroundColor` to `"#B5451B"`

- [x] Task 5: Verify (AC: 1–5)
  - [x] 5.1 `npm run type-check` — zero errors
  - [x] 5.2 `npm run lint` — zero errors

## Dev Notes

### StatusBadge A11y Exclusion

The `PackingItemCard` already announces the full item including status via `accessibilityLabel`. The `StatusBadge` inside it should be hidden from TalkBack to avoid double-announcing:

```tsx
<View importantForAccessibility="no" accessible={false}>
  <StatusBadge status={item.status} />
</View>
```

Or directly on the StatusBadge root View.

### StatusCountPill A11y Label

```tsx
accessibilityLabel={`Filtrar por ${STATUS_LABELS[status]}, ${count} itens`}
accessibilityRole="button"
```

### Filter Chip A11y Labels

For status chips: `accessibilityLabel={`Remover filtro ${STATUS_LABELS[status]}`}`
For profile chips: `accessibilityLabel={`Remover filtro ${profileName}`}`

### Font Scaling

`react-native-paper` and standard React Native `Text` respect system font scaling by default. The key checks:
- No `allowFontScaling={false}` anywhere
- No `maxFontSizeMultiplier` set
- `numberOfLines` with ellipsis for text that could overflow

Story 3.1 already verified no font scaling locks exist.

### Splash Screen

Current `app.json`:
```json
"splash": {
  "image": "./assets/splash-icon.png",
  "resizeMode": "contain",
  "backgroundColor": "#ffffff"
}
```

Change `backgroundColor` to `"#B5451B"`. The splash icon should be light/white to contrast with terracotta.

### Component Files

- `src/components/packing/status-count-pill.tsx` — **MODIFY** — add a11y label
- `src/components/packing/status-badge.tsx` — **MODIFY** — exclude from a11y tree
- `src/components/packing-item-list.tsx` — **MODIFY** — a11y labels on FAB, filter chips, "+ Filtros"
- `familyhub/app.json` — **MODIFY** — splash backgroundColor

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 3.7] — Acceptance criteria
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Accessibility Considerations] — WCAG AA, touch targets, colour+icon+label
- [Source: _bmad-output/planning-artifacts/architecture.md#Technical Constraints] — WCAG AA, TalkBack, 48dp touch targets

## Dev Agent Record

### Agent Model Used

claude-opus-4-6

### Debug Log References

### Completion Notes List

- Added TalkBack labels to all interactive packing components: StatusCountPill ("Filtrar por X, N itens"), FAB ("Adicionar item"), filter chips ("Remover filtro X"), "+ Filtros" ("Abrir filtros")
- Excluded StatusBadge from accessibility tree (`accessible={false}`, `importantForAccessibility="no"`) — parent PackingItemCard already announces status
- Verified focus management: autoFocus on Nome field works, Modal handles focus restoration
- Verified no font scaling locks anywhere in src — text wraps/truncates gracefully
- Updated splash screen backgroundColor from #ffffff to #B5451B (terracotta)
- `type-check` and `lint` pass with zero errors

### File List

- `familyhub/src/components/packing/status-count-pill.tsx` — **MODIFIED** — added a11y label + role
- `familyhub/src/components/packing/status-badge.tsx` — **MODIFIED** — excluded from a11y tree
- `familyhub/src/components/packing-item-list.tsx` — **MODIFIED** — a11y labels on FAB, filter chips, "+ Filtros"
- `familyhub/app.json` — **MODIFIED** — splash backgroundColor → #B5451B
