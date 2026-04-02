# Story 12.1: Display Next Upcoming Meal on Dashboard

Status: done

## Story

As an Admin,
I want to see my next meal on the dashboard,
so that I know what's planned without opening the full meal plan.

## Acceptance Criteria

1. **Given** meals are planned for the current week
   **When** the admin views the dashboard
   **Then** a Meal Plan widget displays the next upcoming meal's name, type, and participants

2. **Given** the next meal is "Dinner — Cervejaria Ramiro (Filipe, Angela, Aurora)"
   **When** the admin views the widget
   **Then** the meal name, type (eating out), and participant names are visible

3. **Given** the next plannable slot is skipped (marked "don't plan" or disabled)
   **When** the system determines the next meal
   **Then** it skips over skipped slots and shows the next active meal with an entry

4. **Given** the admin taps the widget
   **When** the tap is registered
   **Then** the app navigates to the meal plan week view for the current week

## Tasks / Subtasks

- [x] Task 1: Create MealPlanWidget component (AC: #1, #2, #3)
  - [x] 1.1 Created `src/components/meal-plan/meal-plan-widget.tsx` following leftovers widget card pattern
  - [x] 1.2 Props: `nextMeal: MealEntry | null`, `nextMealProfiles: string[]`, `onPress: () => void`
  - [x] 1.3 Shows meal name with type icon (store, food-takeout-box, recycle-variant), participants as comma-separated
  - [x] 1.4 Empty state: "Sem refeições planeadas"
  - [x] 1.5 Slot context: uppercase "QUI JANTAR" style label above meal name
  - [x] 1.6 Shows detail below name for eating_out/takeaway meals
  - [x] 1.7 Exported from `src/components/meal-plan/index.ts`

- [x] Task 2: Add "next meal" resolution logic (AC: #1, #3)
  - [x] 2.1 Created `getNextMeal(entries, configs, now)` exported from meal-plan-widget.tsx
  - [x] 2.2 Time logic: before 14:00 → lunch next, before 21:00 → dinner next, after 21:00 → next day lunch
  - [x] 2.3 Iterates forward from current slot through remaining days (1-7)
  - [x] 2.4 Skips entry-level skips (`isSlotSkipped`) and config-level skips (no entry + config.isSkip)
  - [x] 2.5 Returns first active entry found, or null

- [x] Task 3: Integrate widget into dashboard (AC: #1, #4)
  - [x] 3.1 Imported MealPlanWidget, getNextMeal, getMonday; added mealPlan and profile repositories
  - [x] 3.2 `loadNextMeal()` fetches week entries, configs, and profiles in parallel
  - [x] 3.3 Computes next meal via `getNextMeal(weekEntries, configs, new Date())`
  - [x] 3.4 Resolves participant display names from profiles array
  - [x] 3.5 Rendered MealPlanWidget above LeftoversWidget in dashboard
  - [x] 3.6 onPress: `router.push('/(app)/(meal-plan)')`

## Dev Notes

### Existing Widget Patterns (MUST follow)

All dashboard widgets follow this pattern:

```
TouchableOpacity (activeOpacity: 0.7-0.85)
├── Title Row (Icon + title text, uppercase, letterSpacing 0.5)
├── Content (summary stats or detail)
├── Alert rows (conditional)
└── Arrow indicator (optional)
```

**Styling conventions:**
- Card background: light tint of primary (#FFF8F5 or similar)
- Border: light (#F0E0D8), borderRadius: 12
- Padding: 16
- Title: fontSize 14, fontWeight 700, uppercase
- Icons: react-native-paper `Icon`, size 18 for headers
- Primary color: `#B5451B`

**Reference widgets:**
- `src/components/leftovers/leftovers-widget.tsx` — closest pattern (simple data display)
- `src/components/shopping/shopping-widget.tsx` — minimal pattern
- `src/components/dashboard-vacation-widget.tsx` — complex pattern

### Dashboard Integration Pattern

In `src/app/(app)/(home)/index.tsx`:
- Data fetched via `useRepository()` hook
- `useFocusEffect` triggers reload on screen focus
- Widgets receive pre-fetched data as props + `onPress` callback
- Navigation: `router.push('/(app)/(meal-plan)')`

### Meal Slot Time Logic

The "next upcoming meal" requires time-of-day awareness:
- **Lunch cutoff**: 14:00 — if before 14:00, lunch is still upcoming
- **Dinner cutoff**: 21:00 — if before 21:00, dinner is still upcoming
- **After 21:00**: next day's lunch is next
- Use `new Date()` for current time, extract hours

### Day of Week Mapping

MealEntry uses `dayOfWeek` 1-7 (Mon=1, Sun=7). JavaScript `Date.getDay()` returns 0-6 (Sun=0, Sat=6). Conversion needed:
```typescript
const jsDay = now.getDay(); // 0=Sun, 1=Mon, ...
const mealDay = jsDay === 0 ? 7 : jsDay; // Convert to 1=Mon, 7=Sun
```

### Skipped Slot Detection

A slot is skipped if:
1. Entry exists with `isSlotSkipped === true` (entry-level skip), OR
2. No entry exists AND config has `isSkip === true` for that day/slot (config-level skip)

Both must be checked when iterating to find the next active meal.

### Meal Type Icons (from grid display)

| MealType | Icon | Color |
|----------|------|-------|
| home_cooked | (none or pot-steam) | — |
| eating_out | store | #888 |
| takeaway | food-takeout-box | #888 |
| leftovers | recycle-variant | #888 |

### Architecture Compliance

- **No new repository methods** — use existing `getWeek()` and `getConfig()`
- **No new types needed** — `MealEntry` and `MealPlanSlotConfig` are sufficient
- **No store changes** — widget data is ephemeral, computed from fetched data
- **Repository pattern**: Access via `useRepository('mealPlan')` hook
- **Component pattern**: One component per file, PascalCase, kebab-case filename

### File Structure

```
src/
  components/meal-plan/
    meal-plan-widget.tsx      ← NEW: Dashboard widget component + getNextMeal helper
    index.ts                  ← MODIFY: Export MealPlanWidget
  app/(app)/(home)/
    index.tsx                 ← MODIFY: Add MealPlanWidget, fetch meal data
```

### Previous Story Intelligence (from Story 11-1/11-2)

- `getMonday()` helper from `src/stores/meal-plan.store.ts` — use to get current week start
- Profile resolution: dashboard already loads profiles for vacation widgets — reuse
- Meal plan repository already registered in `src/repositories/repository.context.tsx`

### Scope Boundary

**In scope (Story 12.1):** Widget showing next meal with name, type, participants, navigation
**Out of scope (Story 12.2):** Warning when no meal is planned for next active slot
**Out of scope (Story 12.3):** Sunday planning reminder for next week

### References

- [Source: _bmad-output/planning-artifacts/epics-v3-meal-plan.md#Epic 12]
- [Source: _bmad-output/planning-artifacts/prd.md#FR97]
- [Source: src/components/leftovers/leftovers-widget.tsx — widget pattern reference]
- [Source: src/app/(app)/(home)/index.tsx — dashboard integration reference]
- [Source: _bmad-output/implementation-artifacts/11-1-link-meal-slot-to-leftovers.md]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

- TypeScript compilation: 0 errors

### Completion Notes List

- Created MealPlanWidget following leftovers widget card pattern (TouchableOpacity, #FFF8F5 background, 12px radius)
- Created getNextMeal() helper with time-of-day awareness (lunch cutoff 14:00, dinner cutoff 21:00)
- Widget shows: slot context (day + meal), meal name with type icon, detail, participant names, navigation arrow
- Dashboard loads week entries + config + profiles in parallel on focus
- Widget placed above leftovers widget on dashboard
- Navigates to /(app)/(meal-plan) on tap

### File List

- src/components/meal-plan/meal-plan-widget.tsx (NEW — widget component + getNextMeal helper)
- src/components/meal-plan/index.ts (MODIFIED — exported MealPlanWidget and getNextMeal)
- src/app/(app)/(home)/index.tsx (MODIFIED — added meal plan widget with data fetching and navigation)

### Change Log
- 2026-04-02: Story created by create-story workflow — comprehensive developer guide with dashboard widget patterns
- 2026-04-02: Implementation complete — meal plan dashboard widget with next-meal resolution logic
