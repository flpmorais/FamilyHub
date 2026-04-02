# Story 9.1: Configure Default Participants Per Meal Slot

Status: review

## Story

As an Admin,
I want to configure which family members eat at each day-of-week and meal combination,
so that new weeks auto-populate with the right participants without manual setup.

## Acceptance Criteria

1. A "Refeições" settings item appears in the Settings hub, navigating to a meal plan configuration screen
2. The configuration screen shows a grid of 7 days × 2 meals (lunch, dinner), each slot displaying currently assigned profiles
3. Tapping a slot opens a profile picker where the admin can select/deselect family profiles for that slot
4. The configured defaults are persisted in a `meal_plan_config` table in Supabase
5. When a new meal is created (via MealAddForm), the participants default to the configured profiles for that slot instead of all profiles
6. If no config exists for a slot, all family profiles are used as fallback (backward compatible with Epic 8)
7. The config screen allows toggling a slot as "don't plan" (FR82) — Story 9.2 will implement the full UI, but the data model must support it
8. Default configuration changes apply to all future unedited weeks without manual propagation (NFR26)
9. Supabase migration creates `meal_plan_config` table with `family_id`, RLS, and required structure

## Tasks / Subtasks

- [x] Task 1: Create Supabase migration for meal_plan_config table (AC: #4, #9)
  - [x] Create `supabase/migrations/20260402100000_meal_plan_config.sql`
  - [x] Define `meal_plan_config` table with all columns, constraints, RLS
  - [x] Add unique constraint (family_id, day_of_week, meal_slot)
  - [x] Add RLS policy matching existing pattern
  - [x] Add `updated_at` trigger
- [x] Task 2: Create config types (AC: #4)
  - [x] Add `MealPlanSlotConfig` type to `src/types/meal-plan.types.ts`
- [x] Task 3: Extend repository interface with config methods (AC: #4, #5)
  - [x] Add `getConfig` and `upsertConfig` to `IMealPlanRepository`
- [x] Task 4: Implement config methods in repository (AC: #4)
  - [x] `getConfig` — fetch all config rows for a family
  - [x] `upsertConfig` — upsert on conflict using Supabase's onConflict
- [x] Task 5: Create config screen with profile picker (AC: #1, #2, #3)
  - [x] Create `src/app/(app)/(settings)/meal-plan-config.tsx`
  - [x] Display lunch/dinner sections with day rows showing profile names
  - [x] Tap slot → modal with profile checkboxes
  - [x] Save on "Guardar" press
- [x] Task 6: Add settings hub entry (AC: #1)
  - [x] Added "Refeições" section with silverware-fork-knife icon
- [x] Task 7: Update MealAddForm to use config defaults (AC: #5, #6, #8)
  - [x] Fetch config on mount alongside profiles
  - [x] `getDefaultParticipants` checks config first, falls back to all profiles

## Dev Notes

### CRITICAL: No PowerSync

All repository methods use Supabase client directly.

### Previous Story Learnings

- Story 8.1: timezone fix (use local date components), no double error logging
- Story 8.2: `getProfilesByFamily` is the correct method name on IProfileRepository
- Story 8.3: chip-row pattern for selectors works well
- Code review: guard against empty profileIds before allowing meal creation

### Database Schema

```sql
CREATE TABLE meal_plan_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL,
  meal_slot TEXT NOT NULL,
  participants JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_skip BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT chk_config_day CHECK (day_of_week BETWEEN 1 AND 7),
  CONSTRAINT chk_config_slot CHECK (meal_slot IN ('lunch', 'dinner')),
  CONSTRAINT uq_config_slot UNIQUE (family_id, day_of_week, meal_slot)
);

CREATE TRIGGER set_meal_plan_config_updated_at
  BEFORE UPDATE ON meal_plan_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE meal_plan_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY meal_plan_config_family_policy ON meal_plan_config
  FOR ALL
  USING (family_id IN (SELECT family_id FROM user_accounts WHERE id = auth.uid()))
  WITH CHECK (family_id IN (SELECT family_id FROM user_accounts WHERE id = auth.uid()));
```

### Types to Add

```typescript
// Add to src/types/meal-plan.types.ts
export interface MealPlanSlotConfig {
  id: string;
  familyId: string;
  dayOfWeek: number;
  mealSlot: MealSlot;
  participants: string[];
  isSkip: boolean;
  createdAt: string;
  updatedAt: string;
}
```

### Repository Methods

```typescript
// Upsert pattern using Supabase's onConflict
async upsertConfig(
  familyId: string,
  dayOfWeek: number,
  mealSlot: MealSlot,
  participants: string[],
  isSkip: boolean
): Promise<MealPlanSlotConfig> {
  const { data, error } = await this.client
    .from('meal_plan_config')
    .upsert({
      family_id: familyId,
      day_of_week: dayOfWeek,
      meal_slot: mealSlot,
      participants,
      is_skip: isSkip,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'family_id,day_of_week,meal_slot' })
    .select()
    .single();
  // ...
}
```

### Config Screen Pattern

Follow the existing settings screen pattern (e.g., `src/app/(app)/(settings)/profiles.tsx`). The config screen should:

1. Load all 14 config slots (7 days × 2 meals) on mount
2. Show a grid similar to the meal plan week view but with profile chips instead of meal names
3. Tapping a slot opens a Modal with a list of family profiles as checkboxes
4. On toggle, call `upsertConfig` immediately (auto-save, no explicit save button)

### Settings Hub Entry

Add to `src/app/(app)/(settings)/index.tsx`:

```typescript
const MEAL_PLAN_ITEMS = [
  { label: 'Refeições', icon: 'silverware-fork-knife', route: '/(app)/(settings)/meal-plan-config' },
] as const;
```

Render this section between FAMILY_ITEMS and VACATION_ITEMS.

### Default Participant Logic (in meal plan screen)

When creating a meal via MealAddForm:
1. Check if config exists for the target (dayOfWeek, mealSlot)
2. If config exists and `isSkip === false`: use config's `participants`
3. If config exists and `isSkip === true`: slot should be skipped (handled in Story 9.2)
4. If no config: fallback to all family profile IDs (current behavior)

### What NOT to Do

- **DO NOT** implement the full "don't plan" UI in the grid — that's Story 9.2
- **DO NOT** add PowerSync
- **DO NOT** modify the `meal_entries` table — config is a separate table
- **DO NOT** retroactively update existing meal entries when config changes — config applies to new meals only (NFR26)

### Project Structure Notes

| File | Path | Action |
|------|------|--------|
| Migration | `supabase/migrations/YYYYMMDDHHMMSS_meal_plan_config.sql` | New |
| Types | `src/types/meal-plan.types.ts` | Modify (add MealPlanSlotConfig) |
| Repo interface | `src/repositories/interfaces/meal-plan.repository.interface.ts` | Modify (add config methods) |
| Repo impl | `src/repositories/supabase/meal-plan.repository.ts` | Modify (add config methods) |
| Config screen | `src/app/(app)/(settings)/meal-plan-config.tsx` | New |
| Settings hub | `src/app/(app)/(settings)/index.tsx` | Modify (add entry) |
| Meal plan screen | `src/app/(app)/(meal-plan)/index.tsx` | Modify (use config for defaults) |

### References

- [Source: _bmad-output/planning-artifacts/prd.md#Meal Plan Management (V3) — FR81, FR82, FR83, NFR26]
- [Source: _bmad-output/planning-artifacts/epics-v3-meal-plan.md#Epic 9, Story 9.1]
- [Pattern: src/app/(app)/(settings)/index.tsx — Settings hub pattern]
- [Pattern: src/app/(app)/(settings)/profiles.tsx — Settings sub-screen pattern]
- [Previous: _bmad-output/implementation-artifacts/8-3-meal-types-and-details.md — learnings]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

- TypeScript compilation: zero errors

### Completion Notes List

- Migration `20260402100000_meal_plan_config.sql` creates table with family_id FK, unique constraint, RLS, trigger
- `MealPlanSlotConfig` type added with `isSkip` boolean for Story 9.2 readiness
- Repository: `getConfig` fetches all 14 possible slot configs; `upsertConfig` uses Supabase `onConflict` for clean insert-or-update
- Config screen: settings sub-screen with lunch/dinner sections, 7 day rows each showing participant names, tap opens profile checkbox modal
- Picker defaults to all profiles when no config exists (matches AC#6 backward compatibility)
- Settings hub: "Refeições" section added between Família and Viagens
- Meal plan screen: loads config alongside profiles on mount, `getDefaultParticipants` resolves config-based or all-profiles fallback
- `is_skip` column present in schema but not exposed in config screen UI (deferred to Story 9.2)

### Change Log

- 2026-04-01: Story 9.1 implemented — all 7 tasks complete

### File List

**New files:**
- `supabase/migrations/20260402100000_meal_plan_config.sql`
- `src/app/(app)/(settings)/meal-plan-config.tsx`

**Modified files:**
- `src/types/meal-plan.types.ts` (added MealPlanSlotConfig)
- `src/repositories/interfaces/meal-plan.repository.interface.ts` (added getConfig, upsertConfig)
- `src/repositories/supabase/meal-plan.repository.ts` (added getConfig, upsertConfig, mapSlotConfig)
- `src/app/(app)/(settings)/index.tsx` (added Refeições section)
- `src/app/(app)/(meal-plan)/index.tsx` (config loading, getDefaultParticipants)
