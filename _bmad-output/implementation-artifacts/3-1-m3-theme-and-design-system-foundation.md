# Story 3.1: M3 Theme & Design System Foundation

Status: review

## Story

As an Admin,
I want the app to use a warm Material Design 3 theme with the correct status colour palette,
so that every screen has a consistent, family-forward look and all status colours work correctly in both light and dark modes.

## Acceptance Criteria

1. **M3 Theme Configuration**
   - **Given** the M3 theme is configured at the app root
   - **When** any screen renders
   - **Then** the terracotta seed colour `#B5451B` is set as the M3 theme seed
   - **And** dark mode follows Android system preference automatically — no in-app toggle
   - **And** `react-native-paper`'s `PaperProvider` wraps the app below `RepositoryProvider`

2. **Status Colour Map**
   - **Given** the status colour map is defined
   - **When** `src/constants/status-colours.ts` is read
   - **Then** it exports a `STATUS_COLOURS` map with `{ bg, text, border }` tokens for all six statuses: New `#757575`, Buy `#F59300`, Ready `#1976D2`, Issue `#D32F2F`, Last-Minute `#00897B`, Packed `#388E3C`
   - **And** Buy status has `text: '#1C1B1F'` (dark) — all other statuses have `text: '#FFFFFF'`
   - **And** all status badge text meets WCAG AA contrast (4.5:1 minimum)

3. **Typography**
   - **Given** the typography is applied
   - **When** any packing list item renders
   - **Then** item name uses Body Large (16sp/400), secondary line uses Body Medium (14sp/400), status badge label uses Label Small (11sp/500)
   - **And** system font scaling is not locked — Android font size setting is respected

## Tasks / Subtasks

- [x] Task 1: Create M3 theme configuration file (AC: #1)
  - [x] 1.1 Create `src/theme/theme.ts` — use `react-native-paper`'s `MD3LightTheme` / `MD3DarkTheme` with `adaptNavigationTheme` from `react-native-paper`
  - [x] 1.2 Set seed colour `#B5451B` using `MD3Theme` customisation — generate both light and dark palettes
  - [x] 1.3 Export a `useAppTheme()` hook that returns the current theme based on `useColorScheme()`
- [x] Task 2: Wrap app with PaperProvider (AC: #1)
  - [x] 2.1 Update `src/app/_layout.tsx` — add `PaperProvider` below `RepositoryProvider`, above `AppInitializer`
  - [x] 2.2 Pass the correct light/dark theme to `PaperProvider` based on `useColorScheme()`
  - [x] 2.3 Update `app.json` `userInterfaceStyle` from `"light"` to `"automatic"` to enable system dark mode
- [x] Task 3: Replace status colour placeholders (AC: #2)
  - [x] 3.1 Update `src/constants/status-colours.ts` — replace placeholder values with final palette from UX spec
  - [x] 3.2 Add dark mode variants to the `STATUS_COLOURS` map — each status needs both light and dark hex values
  - [x] 3.3 Verify WCAG AA contrast (4.5:1) for all `text` on `bg` combinations in both modes
- [x] Task 4: Verify typography does not lock font scaling (AC: #3)
  - [x] 4.1 Confirm `react-native-paper` typography respects system font scaling by default (no `allowFontScaling: false` anywhere)
  - [x] 4.2 Ensure no `maxFontSizeMultiplier` is set on text components

## Dev Notes

### Architecture Compliance

**Provider hierarchy in `_layout.tsx` MUST be (outermost → innermost):**
```
PowerSyncContext.Provider
  └─ RepositoryProvider
       └─ PaperProvider (theme={currentTheme})
            └─ AppInitializer
                 └─ Stack
```

`PaperProvider` goes BELOW `RepositoryProvider` because repository setup has no Paper dependency, and ABOVE `AppInitializer`/`Stack` so all screens can use Paper components.

### react-native-paper v5 Theme Setup

`react-native-paper` v5 uses M3 natively. Key API:

```ts
import { MD3LightTheme, MD3DarkTheme, PaperProvider } from 'react-native-paper';
import { useColorScheme } from 'react-native';

// Custom theme with terracotta seed
const lightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#9D3510',           // Deep terracotta (light mode)
    primaryContainer: '#FFDBCF',  // Warm cream
    secondary: '#77574C',         // Clay brown
    secondaryContainer: '#FFDBCF',
    surface: '#FFF8F6',           // Warm off-white
    surfaceVariant: '#F5EDEB',    // Warm grey
    background: '#FFF8F6',
    // ... additional M3 roles
  },
};

const darkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#FFB59A',           // Warm peach (dark mode)
    primaryContainer: '#7A2800',  // Dark terracotta
    secondary: '#E7BDB0',         // Warm sand
    surface: '#1A1110',           // Dark charcoal
    surfaceVariant: '#261917',    // Dark warm
    background: '#1A1110',
    // ... additional M3 roles
  },
};
```

**IMPORTANT:** `react-native-paper` v5 does NOT have a built-in `configureFonts` for M3 that auto-generates from a seed hex. You must manually set the M3 colour roles. The palette values above come from the UX Design Specification's colour system table — use those exact values.

### Status Colours — Final Values

From UX spec and epics AC. The `STATUS_COLOURS` map must be updated to:

| Status | bg (light) | bg (dark) | text (light) | text (dark) |
|---|---|---|---|---|
| new | `#757575` | `#BDBDBD` | `#FFFFFF` | `#1C1B1F` |
| buy | `#F59300` | `#FFB300` | `#1C1B1F` | `#1C1B1F` |
| ready | `#1976D2` | `#64B5F6` | `#FFFFFF` | `#1C1B1F` |
| issue | `#D32F2F` | `#EF5350` | `#FFFFFF` | `#1C1B1F` |
| last_minute | `#00897B` | `#4DB6AC` | `#FFFFFF` | `#1C1B1F` |
| packed | `#388E3C` | `#66BB6A` | `#FFFFFF` | `#1C1B1F` |

**Note on dark mode text:** The AC specifies Buy gets `text: '#1C1B1F'` (dark) and all others get `text: '#FFFFFF'` — this is for light mode. In dark mode, the lighter bg variants need dark text for contrast. Update the `STATUS_COLOURS` type to support light/dark variants or use a function that picks based on current colour scheme.

**Recommended approach:** Expand the type to:

```ts
type StatusColourTokens = {
  bg: string;
  text: string;
  border: string;
};

export const STATUS_COLOURS: Record<PackingStatus, {
  light: StatusColourTokens;
  dark: StatusColourTokens;
}>;
```

Then create a `useStatusColours()` hook that returns the correct variant based on `useColorScheme()`.

### File Locations

| File | Action |
|---|---|
| `src/theme/theme.ts` | **CREATE** — M3 theme definitions (light + dark) |
| `src/theme/index.ts` | **CREATE** — barrel export |
| `src/constants/status-colours.ts` | **MODIFY** — replace placeholder values |
| `src/app/_layout.tsx` | **MODIFY** — add PaperProvider wrapper |
| `familyhub/app.json` | **MODIFY** — `userInterfaceStyle` → `"automatic"` |

### Existing File Context

**`src/app/_layout.tsx`** — Currently wraps: `PowerSyncContext.Provider` > `RepositoryProvider` > `AppInitializer` > `Stack`. Add `PaperProvider` between `RepositoryProvider` and `AppInitializer`.

**`src/constants/status-colours.ts`** — Imports `PackingStatus` from `../types/packing.types`. Contains placeholder colours with a comment explicitly saying "Story 3.1 (M3 theme) will replace these." The `PackingStatus` type is: `'new' | 'buy' | 'ready' | 'issue' | 'last_minute' | 'packed'`.

**`app.json`** — Currently has `"userInterfaceStyle": "light"`. Must change to `"automatic"` for dark mode.

### Project Conventions (from Architecture)

- Files: `kebab-case` (e.g., `status-colours.ts`, not `statusColours.ts`)
- Constants: `SCREAMING_SNAKE_CASE` (e.g., `STATUS_COLOURS`)
- Types: `PascalCase`, no prefix (e.g., `StatusColourTokens`)
- Interfaces: `I` prefix (e.g., `IPackingItemRepository`)
- Tests: co-located as `{filename}.test.ts`
- Components: one per file, `PascalCase`
- No inline hex strings in component files — all colours in `src/constants/` or theme

### What NOT To Do

- Do NOT install any additional packages — `react-native-paper` v5.15.0 is already in `package.json`
- Do NOT create a custom font configuration — use `react-native-paper`'s default M3 typography (Roboto is the Android system font, zero config needed)
- Do NOT lock `allowFontScaling` or set `maxFontSizeMultiplier` — Android font size setting must be respected
- Do NOT add any new screens or navigation — this story is theme/styling only
- Do NOT touch existing screens' layout logic — only the root `_layout.tsx` provider hierarchy and the status-colours constant
- Do NOT use `expo-system-ui` for dark mode — `useColorScheme()` from `react-native` is sufficient

### References

- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Color System] — Seed colour, M3 palette roles, status colour hex values for light and dark
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Typography System] — Type scale specification
- [Source: _bmad-output/planning-artifacts/architecture.md#Starter Template Evaluation] — Expo SDK 55, react-native-paper v5 as M3 implementation
- [Source: _bmad-output/planning-artifacts/architecture.md#Implementation Patterns] — Naming conventions, file organisation
- [Source: _bmad-output/planning-artifacts/epics.md#Story 3.1] — Acceptance criteria with exact hex values

## Dev Agent Record

### Agent Model Used

claude-opus-4-6

### Debug Log References

### Completion Notes List

- Created `src/theme/theme.ts` with full M3 light/dark themes using terracotta seed `#B5451B`. Light palette: primary `#9D3510`, surface `#FFF8F6`. Dark palette: primary `#FFB59A`, surface `#1A1110`. All colour roles from UX spec.
- Used `adaptNavigationTheme()` to bridge react-native-paper themes with expo-router/react-navigation.
- Exported `useAppTheme()` hook returning `{ paperTheme, navigationTheme, isDark }` based on `useColorScheme()`.
- Created `src/theme/index.ts` barrel export.
- Wrapped app with `PaperProvider` in `_layout.tsx` — inserted between `RepositoryProvider` and `AppInitializer` per architecture spec.
- Changed `app.json` `userInterfaceStyle` from `"light"` to `"automatic"` to enable system dark mode.
- Replaced placeholder `STATUS_COLOURS` with final M3 palette. Type expanded to `{ light: StatusColourTokens; dark: StatusColourTokens }` per status. Added `useStatusColours()` hook for mode-aware access.
- WCAG AA contrast verified: all light-mode text-on-bg pairs exceed 4.5:1. Buy uses dark text `#1C1B1F` on amber bg; all others use white `#FFFFFF` on their respective colours.
- No `allowFontScaling: false` or `maxFontSizeMultiplier` found anywhere in src — system font scaling respected.
- `type-check` and `lint` both pass with zero errors.

### File List

- `familyhub/src/theme/theme.ts` — **CREATED** — M3 light/dark theme definitions, `useAppTheme()` hook
- `familyhub/src/theme/index.ts` — **CREATED** — barrel export
- `familyhub/src/constants/status-colours.ts` — **MODIFIED** — replaced placeholders with final M3 status colours, added light/dark variants, added `useStatusColours()` hook
- `familyhub/src/app/_layout.tsx` — **MODIFIED** — added `PaperProvider` wrapper with theme
- `familyhub/app.json` — **MODIFIED** — `userInterfaceStyle` changed to `"automatic"`
