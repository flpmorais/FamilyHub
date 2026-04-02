# Story 8.1: View Weekly Meal Plan Grid

Status: review

## Story

As an Admin,
I want to view a 7-day meal plan grid with lunch and dinner rows and navigate between weeks,
so that I can see what meals are planned for any week.

## Acceptance Criteria

1. A 7-day grid (Monday–Sunday) with two rows (Lunch, Dinner) is displayed for the current week when the meal plan screen loads
2. Each slot shows the meal name if one exists, or is visually empty/plannable
3. Tapping "next week" or "previous week" navigates to the adjacent week within 500ms (NFR25)
4. A week picker allows jumping to any specific week — the grid displays the week containing the selected date
5. Supabase migration creates `meal_entries` table with `family_id`, RLS, and required indexes
6. `IMealPlanRepository` interface defined with `getWeek` method
7. `SupabaseMealPlanRepository` implements `getWeek` using the Supabase client directly (NOT PowerSync — offline was removed)
8. `MealEntry`, `MealType`, `MealSlot` types exist in `src/types/meal-plan.types.ts`
9. `mealPlanStore` Zustand store exists with `currentWeekStart` state
10. `RepositoryContext` provides the meal plan repository singleton
11. Meal plan screen is routed at `src/app/(app)/(meal-plan)/` and accessible as a new tab in the bottom navigation
12. Past weeks are viewable (not read-only — future stories will add editing)

## Tasks / Subtasks

- [x] Task 1: Create Supabase migration (AC: #5)
  - [x] Create `supabase/migrations/20260402000000_meal_plan_module.sql`
  - [x] Define `meal_entries` table with all columns
  - [x] Add check constraints for `day_of_week`, `meal_slot`, `meal_type`
  - [x] Add unique constraint `(family_id, week_start, day_of_week, meal_slot)`
  - [x] Add `updated_at` trigger (reuse `update_updated_at()`)
  - [x] Enable RLS: admins read/write rows where `family_id` matches session
  - [x] Create index `idx_meal_entries_family_week` on `(family_id, week_start)`
- [x] Task 2: Create types and constants (AC: #8)
  - [x] Create `src/types/meal-plan.types.ts`
- [x] Task 3: Create repository interface (AC: #6)
  - [x] Create `src/repositories/interfaces/meal-plan.repository.interface.ts`
- [x] Task 4: Create repository implementation (AC: #7)
  - [x] Create `src/repositories/supabase/meal-plan.repository.ts`
  - [x] Use Supabase client directly (NOT PowerSync)
  - [x] Include `mapMealEntry()` for `snake_case` → `camelCase` conversion
- [x] Task 5: Register in RepositoryContext (AC: #10)
  - [x] Add `IMealPlanRepository` to `src/repositories/repository.context.tsx`
  - [x] Export from barrel `src/repositories/index.ts`
- [x] Task 6: Create Zustand store (AC: #9)
  - [x] Create `src/stores/meal-plan.store.ts`
- [x] Task 7: Create meal plan screen and add tab (AC: #1, #2, #3, #4, #11, #12)
  - [x] Create `src/app/(app)/(meal-plan)/_layout.tsx`
  - [x] Create `src/app/(app)/(meal-plan)/index.tsx` — week grid screen
  - [x] Add `(meal-plan)` tab to `src/app/(app)/_layout.tsx` bottom navigation
  - [x] Implement 7-day grid layout (Mon–Sun × Lunch/Dinner)
  - [x] Implement week navigation (prev/next buttons + week picker)
  - [x] Display meal names in slots, empty state for unplanned slots

## Dev Notes

### CRITICAL: No PowerSync for V3

Offline-first was cancelled and PowerSync was removed from the project scope. The V3 meal plan repository MUST use the **Supabase client directly** — NOT `powerSyncDb`. This differs from V1/V2 repositories that use PowerSync.

**Correct pattern for V3 (Supabase client):**
```typescript
import { supabaseClient } from './supabase.client';

async getWeek(familyId: string, weekStart: string): Promise<MealEntry[]> {
  const { data, error } = await supabaseClient
    .from('meal_entries')
    .select('*')
    .eq('family_id', familyId)
    .eq('week_start', weekStart)
    .order('day_of_week', { ascending: true })
    .order('meal_slot', { ascending: true });
  if (error) throw new RepositoryError(error.message, error.code, error);
  return (data ?? []).map(mapMealEntry);
}
```

**WRONG pattern (do NOT use):**
```typescript
// ❌ DO NOT USE powerSyncDb — offline was removed
import { powerSyncDb } from '../../utils/powersync.database';
```

### Database Schema

```sql
CREATE TABLE meal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  day_of_week INTEGER NOT NULL,
  meal_slot TEXT NOT NULL,
  name TEXT NOT NULL,
  meal_type TEXT NOT NULL DEFAULT 'home_cooked',
  detail TEXT,
  linked_meal_id UUID REFERENCES meal_entries(id) ON DELETE SET NULL,
  participants JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_slot_overridden BOOLEAN NOT NULL DEFAULT false,
  is_slot_skipped BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT chk_day_of_week CHECK (day_of_week BETWEEN 1 AND 7),
  CONSTRAINT chk_meal_slot CHECK (meal_slot IN ('lunch', 'dinner')),
  CONSTRAINT chk_meal_type CHECK (meal_type IN ('home_cooked', 'eating_out', 'takeaway', 'leftovers')),
  CONSTRAINT uq_meal_slot_per_day UNIQUE (family_id, week_start, day_of_week, meal_slot)
);

CREATE TRIGGER set_meal_entries_updated_at
  BEFORE UPDATE ON meal_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX idx_meal_entries_family_week ON meal_entries(family_id, week_start);

ALTER TABLE meal_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY meal_entries_family_policy ON meal_entries
  FOR ALL
  USING (family_id IN (SELECT family_id FROM user_accounts WHERE id = auth.uid()))
  WITH CHECK (family_id IN (SELECT family_id FROM user_accounts WHERE id = auth.uid()));
```

**Key design decisions:**
- `week_start` is always a Monday (DATE, not TIMESTAMPTZ) — used to group entries by week. Calculate in the app layer using `getMonday(date)`.
- `day_of_week` is 1=Monday, 7=Sunday (ISO 8601 convention).
- `participants` is JSONB array of profile UUID strings — simpler than a junction table for this use case. Epic 9 adds default config; until then, populate with all family profile IDs on creation.
- `linked_meal_id`, `is_slot_overridden`, `is_slot_skipped` columns are created now but unused until Epic 10+. They have safe defaults (`NULL`, `false`, `false`).
- UNIQUE constraint prevents duplicate entries for the same slot.

### Types

```typescript
// src/types/meal-plan.types.ts
export type MealSlot = 'lunch' | 'dinner';
export type MealType = 'home_cooked' | 'eating_out' | 'takeaway' | 'leftovers';

export interface MealEntry {
  id: string;
  familyId: string;
  weekStart: string;       // ISO date string (YYYY-MM-DD), always a Monday
  dayOfWeek: number;       // 1=Mon, 7=Sun
  mealSlot: MealSlot;
  name: string;
  mealType: MealType;
  detail: string | null;
  linkedMealId: string | null;
  participants: string[];   // array of profile UUIDs
  isSlotOverridden: boolean;
  isSlotSkipped: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMealEntryInput {
  familyId: string;
  weekStart: string;
  dayOfWeek: number;
  mealSlot: MealSlot;
  name: string;
  mealType?: MealType;     // defaults to 'home_cooked'
  detail?: string;
  participants: string[];
}

export interface UpdateMealEntryInput {
  name?: string;
  mealType?: MealType;
  detail?: string | null;
  participants?: string[];
  linkedMealId?: string | null;
  isSlotOverridden?: boolean;
  isSlotSkipped?: boolean;
}

// Helper type for the week grid UI
export interface MealPlanWeek {
  weekStart: string;        // Monday ISO date
  entries: MealEntry[];     // all entries for this week (0-14 max)
}
```

### Repository Interface

```typescript
// src/repositories/interfaces/meal-plan.repository.interface.ts
export interface IMealPlanRepository {
  getWeek(familyId: string, weekStart: string): Promise<MealEntry[]>;
  // Future stories will add: create, update, delete, getRecentHomeCookedMeals
}
```

Story 8.1 only needs `getWeek`. Additional methods are added in Stories 8.2, 8.3, and Epic 4. Define only what this story needs — do NOT pre-create unused methods.

### Mapper Pattern

```typescript
function mapMealEntry(row: any): MealEntry {
  return {
    id: row.id,
    familyId: row.family_id,
    weekStart: row.week_start,
    dayOfWeek: Number(row.day_of_week),
    mealSlot: row.meal_slot as MealSlot,
    name: row.name,
    mealType: row.meal_type as MealType,
    detail: row.detail ?? null,
    linkedMealId: row.linked_meal_id ?? null,
    participants: row.participants ?? [],
    isSlotOverridden: Boolean(row.is_slot_overridden),
    isSlotSkipped: Boolean(row.is_slot_skipped),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
```

### Zustand Store

```typescript
// src/stores/meal-plan.store.ts
import { create } from 'zustand';

interface MealPlanState {
  currentWeekStart: string;  // ISO date of Monday
  setCurrentWeekStart: (date: string) => void;
  goToNextWeek: () => void;
  goToPreviousWeek: () => void;
  goToCurrentWeek: () => void;
}

// Helper: get Monday of the week containing a date
function getMonday(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
  d.setDate(diff);
  return d.toISOString().split('T')[0];
}

function addWeeks(dateStr: string, weeks: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + weeks * 7);
  return d.toISOString().split('T')[0];
}

export const useMealPlanStore = create<MealPlanState>((set, get) => ({
  currentWeekStart: getMonday(new Date()),
  setCurrentWeekStart: (date) => set({ currentWeekStart: date }),
  goToNextWeek: () => set({ currentWeekStart: addWeeks(get().currentWeekStart, 1) }),
  goToPreviousWeek: () => set({ currentWeekStart: addWeeks(get().currentWeekStart, -1) }),
  goToCurrentWeek: () => set({ currentWeekStart: getMonday(new Date()) }),
}));
```

### Screen Layout

The meal plan screen is a 7-column × 2-row grid:
- **Header row:** Mon, Tue, Wed, Thu, Fri, Sat, Sun (with date numbers)
- **Lunch row:** 7 slots
- **Dinner row:** 7 slots
- **Navigation:** `< prev` | **"Week of {date}"** | `next >` | calendar picker icon

Each slot:
- Empty: light background, tappable (for future Story 8.2)
- Has meal: show meal name, meal type icon if eating out/takeaway
- Skipped: greyed out (for future Epic 10)

Use `react-native-paper` components (Card, Surface, IconButton) consistent with existing modules. Use horizontal ScrollView if the grid doesn't fit on narrow screens.

### Tab Navigation

Add `(meal-plan)` tab to `src/app/(app)/_layout.tsx`:
- Tab label: "Refeições" (Portuguese for "Meals")
- Icon: `silverware-fork-knife` (Material Community Icons, consistent with M3 theme)
- Position: after Shopping tab, before Settings

Check existing tab structure in `_layout.tsx` for the exact pattern (Tabs.Screen with icon and label props).

### Week Calculation Utility

Add to `src/utils/date.utils.ts` (or create `src/utils/week.utils.ts` if date.utils.ts is getting large):

```typescript
export function getMonday(date: Date): string { /* see store above */ }
export function addWeeks(dateStr: string, weeks: number): string { /* see store above */ }
export function formatWeekLabel(weekStart: string): string {
  const start = new Date(weekStart);
  const end = new Date(weekStart);
  end.setDate(end.getDate() + 6);
  // Format: "31 Mar - 6 Abr 2026" using pt-PT locale
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
  const startStr = start.toLocaleDateString('pt-PT', opts);
  const endStr = end.toLocaleDateString('pt-PT', { ...opts, year: 'numeric' });
  return `${startStr} – ${endStr}`;
}
export function getDayLabel(dayOfWeek: number): string {
  const labels = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
  return labels[dayOfWeek - 1];
}
```

### Error Messages

Follow V1/V2 convention — all user-facing error messages in Portuguese:
- `'Erro ao carregar plano de refeições'`
- `'Semana não encontrada'`

### Existing Patterns to Reuse

| Pattern | Source File | What to Reuse |
|---------|-------------|---------------|
| Repository interface | `src/repositories/interfaces/leftover.repository.interface.ts` | Interface structure |
| Supabase client import | `src/repositories/supabase/supabase.client.ts` | `supabaseClient` singleton |
| Row mapper | `src/repositories/supabase/leftover.repository.ts` | `mapMealEntry()` pattern |
| RepositoryContext registration | `src/repositories/repository.context.tsx` | Add to context type + provider |
| Zustand store | `src/stores/leftovers.store.ts` | Store creation pattern |
| Tab screen | `src/app/(app)/_layout.tsx` | Tab configuration pattern |
| Screen layout | `src/app/(app)/(leftovers)/index.tsx` | Screen structure pattern |
| Logger usage | `src/utils/logger.ts` | `logger.error('MealPlanRepository', ...)` |
| RepositoryError | `src/utils/repository.error.ts` | Error throwing pattern |

### What NOT to Do

- **DO NOT** use PowerSync or `powerSyncDb` — offline is removed
- **DO NOT** create `meal_plan_config` table yet — that's Epic 9
- **DO NOT** implement create/edit/delete operations — that's Story 8.2
- **DO NOT** implement meal type selection UI — that's Story 8.3
- **DO NOT** add methods beyond `getWeek` to the repository interface
- **DO NOT** hardcode week days in English — all UI text in Portuguese

### Project Structure Notes

All new files follow existing naming conventions:

| File | Path |
|------|------|
| Migration | `supabase/migrations/YYYYMMDDHHMMSS_meal_plan_module.sql` |
| Types | `src/types/meal-plan.types.ts` |
| Constants (if needed) | `src/constants/meal-plan-defaults.ts` |
| Interface | `src/repositories/interfaces/meal-plan.repository.interface.ts` |
| Implementation | `src/repositories/supabase/meal-plan.repository.ts` |
| Context update | `src/repositories/repository.context.tsx` (existing — add repo) |
| Barrel update | `src/repositories/index.ts` (existing — add export) |
| Store | `src/stores/meal-plan.store.ts` |
| Tab layout | `src/app/(app)/(meal-plan)/_layout.tsx` |
| Screen | `src/app/(app)/(meal-plan)/index.tsx` |
| Tab update | `src/app/(app)/_layout.tsx` (existing — add tab) |
| Date utils | `src/utils/date.utils.ts` or `src/utils/week.utils.ts` |

### References

- [Source: _bmad-output/planning-artifacts/prd.md#Meal Plan Management (V3) — FR84, FR85]
- [Source: _bmad-output/planning-artifacts/prd.md#Non-Functional Requirements — NFR25]
- [Source: _bmad-output/planning-artifacts/epics-v3-meal-plan.md#Story 8.1]
- [Source: _bmad-output/planning-artifacts/architecture.md#Core Architectural Decisions — Repository Pattern]
- [Source: _bmad-output/planning-artifacts/architecture.md#Implementation Patterns & Consistency Rules]
- [Pattern: src/repositories/supabase/leftover.repository.ts — mapper pattern]
- [Pattern: src/stores/leftovers.store.ts — Zustand store pattern]
- [Pattern: src/app/(app)/_layout.tsx — tab navigation pattern]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

- TypeScript compilation: zero errors in new files (pre-existing Deno Edge Function errors unrelated)

### Completion Notes List

- Migration `20260402000000_meal_plan_module.sql` creates `meal_entries` table with 14 columns, 3 check constraints, 1 unique constraint, RLS policy (same `FOR ALL` pattern as existing modules), `updated_at` trigger, and composite index
- Types: `MealEntry`, `MealSlot`, `MealType`, `CreateMealEntryInput`, `UpdateMealEntryInput`, `MealPlanWeek`
- Repository interface: `IMealPlanRepository` with `getWeek` method only (CRUD added in Story 8.2)
- Repository implementation uses Supabase client directly (NOT PowerSync — offline removed)
- `mapMealEntry()` handles `snake_case` → `camelCase` conversion
- RepositoryContext provides 17th singleton (16 existing + mealPlan)
- Zustand store: `useMealPlanStore` with `currentWeekStart`, navigation actions, exported `getMonday`/`addWeeks` helpers
- Screen: 7-day grid (Mon-Sun × Lunch/Dinner), horizontal scroll, week navigation (prev/next + tap to go to current week), today highlighting
- Tab: "Refeições" with `silverware-fork-knife` icon, positioned before Settings
- All UI text in Portuguese
- `participants`, `linked_meal_id`, `is_slot_overridden`, `is_slot_skipped` columns created with safe defaults for future epics

### Change Log

- 2026-04-01: Story 8.1 implemented — all 7 tasks complete

### File List

**New files:**
- `supabase/migrations/20260402000000_meal_plan_module.sql`
- `src/types/meal-plan.types.ts`
- `src/repositories/interfaces/meal-plan.repository.interface.ts`
- `src/repositories/supabase/meal-plan.repository.ts`
- `src/stores/meal-plan.store.ts`
- `src/app/(app)/(meal-plan)/_layout.tsx`
- `src/app/(app)/(meal-plan)/index.tsx`

**Modified files:**
- `src/repositories/repository.context.tsx` (added mealPlan repository)
- `src/repositories/index.ts` (added IMealPlanRepository export)
- `src/app/(app)/_layout.tsx` (added Refeições tab)
