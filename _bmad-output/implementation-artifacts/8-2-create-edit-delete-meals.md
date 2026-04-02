# Story 8.2: Create, Edit, and Delete Meals

Status: review

## Story

As an Admin,
I want to create, edit, and delete meal entries in any slot,
so that I can plan what the family will eat.

## Acceptance Criteria

1. Tapping an empty slot opens a modal form where the admin can enter a meal name (free text) and save it
2. A created meal defaults to type "home_cooked" and assigns all family profiles as participants (until Epic 9 adds config)
3. Tapping an existing meal opens an edit form where the admin can change the meal name
4. The admin can delete a meal from the edit form — the slot becomes empty
5. Past weeks are editable — creating/editing/deleting meals in past weeks works identically to current/future weeks
6. The `IMealPlanRepository` interface is extended with `create`, `update`, and `delete` methods
7. The `SupabaseMealPlanRepository` implements all three methods using the Supabase client directly
8. After any create/edit/delete, the week grid refreshes to show the updated state
9. Validation: meal name cannot be empty; empty submissions are blocked with an error message in Portuguese

## Tasks / Subtasks

- [x] Task 1: Extend repository interface with CRUD methods (AC: #6)
  - [x] Add `create(input: CreateMealEntryInput): Promise<MealEntry>` to `IMealPlanRepository`
  - [x] Add `update(id: string, input: UpdateMealEntryInput): Promise<MealEntry>` to `IMealPlanRepository`
  - [x] Add `delete(id: string): Promise<void>` to `IMealPlanRepository`
- [x] Task 2: Implement CRUD in repository (AC: #7)
  - [x] Implement `create` — insert with `uuid()` for id, default `meal_type = 'home_cooked'`, return mapped entry
  - [x] Implement `update` — partial update of provided fields only, return mapped entry
  - [x] Implement `delete` — delete by id
  - [x] All methods use Supabase client directly (NOT PowerSync)
- [x] Task 3: Create meal add form component (AC: #1, #2, #9)
  - [x] Create `src/components/meal-plan/meal-add-form.tsx` — Modal with text input for meal name
  - [x] On save: call `create` with familyId, weekStart, dayOfWeek, mealSlot, name, and all family profile IDs as participants
  - [x] Validate: name cannot be empty — show "O nome da refeição é obrigatório" error
  - [x] On success: close modal and trigger grid refresh
- [x] Task 4: Create meal edit form component (AC: #3, #4, #9)
  - [x] Create `src/components/meal-plan/meal-edit-form.tsx` — Modal pre-filled with current meal name
  - [x] Admin can edit the name and save
  - [x] Admin can delete the meal via a delete button with confirmation
  - [x] Validate: name cannot be empty on save
  - [x] On success: close modal and trigger grid refresh
- [x] Task 5: Create barrel export for meal-plan components
  - [x] Create `src/components/meal-plan/index.ts`
- [x] Task 6: Wire forms into the week grid screen (AC: #1, #3, #5, #8)
  - [x] Empty slot tap → opens MealAddForm with slot context (weekStart, dayOfWeek, mealSlot)
  - [x] Existing meal tap → opens MealEditForm with meal data
  - [x] After any CRUD operation, re-call `loadWeek()` to refresh the grid
  - [x] Past weeks: no read-only guard — all slots are tappable regardless of week

## Dev Notes

### CRITICAL: No PowerSync

Repository methods MUST use the Supabase client directly. See Story 8.1 learnings.

### Story 8.1 Learnings (Previous Story)

- Code review found and fixed: timezone bug in date helpers (use local date components, not `toISOString()`), double error logging in repository (removed redundant try/catch), loading state stuck on early return
- Repository pattern: single error check after Supabase call, no wrapping try/catch
- Date strings are `YYYY-MM-DD` format, parsed with `new Date(y, m-1, d)` pattern (not `new Date(string)`)
- All UI text in Portuguese
- `uuid()` from `src/utils/uuid.ts` for generating IDs
- `logger` from `src/utils/logger.ts` for error logging

### Repository CRUD Pattern

Follow the shopping repository pattern (`src/repositories/supabase/shopping.repository.ts`):

```typescript
// Create pattern
async create(input: CreateMealEntryInput): Promise<MealEntry> {
  const id = uuid();
  const ts = new Date().toISOString();
  const { data, error } = await this.client
    .from('meal_entries')
    .insert({
      id,
      family_id: input.familyId,
      week_start: input.weekStart,
      day_of_week: input.dayOfWeek,
      meal_slot: input.mealSlot,
      name: input.name,
      meal_type: input.mealType ?? 'home_cooked',
      detail: input.detail ?? null,
      participants: input.participants,
      created_at: ts,
      updated_at: ts,
    })
    .select()
    .single();
  if (error) {
    logger.error('MealPlanRepository', 'Erro ao criar refeição', error);
    throw error;
  }
  return mapMealEntry(data);
}

// Update pattern — only include provided fields
async update(id: string, input: UpdateMealEntryInput): Promise<MealEntry> {
  const updateData: Record<string, any> = { updated_at: new Date().toISOString() };
  if (input.name !== undefined) updateData.name = input.name;
  if (input.mealType !== undefined) updateData.meal_type = input.mealType;
  if (input.detail !== undefined) updateData.detail = input.detail;
  if (input.participants !== undefined) updateData.participants = input.participants;
  if (input.linkedMealId !== undefined) updateData.linked_meal_id = input.linkedMealId;
  if (input.isSlotOverridden !== undefined) updateData.is_slot_overridden = input.isSlotOverridden;
  if (input.isSlotSkipped !== undefined) updateData.is_slot_skipped = input.isSlotSkipped;

  const { data, error } = await this.client
    .from('meal_entries')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();
  if (error) {
    logger.error('MealPlanRepository', 'Erro ao atualizar refeição', error);
    throw error;
  }
  return mapMealEntry(data);
}

// Delete pattern
async delete(id: string): Promise<void> {
  const { error } = await this.client
    .from('meal_entries')
    .delete()
    .eq('id', id);
  if (error) {
    logger.error('MealPlanRepository', 'Erro ao apagar refeição', error);
    throw error;
  }
}
```

### Default Participants (Until Epic 9)

Story 8.2 creates meals with ALL family profiles as participants. To get all profile IDs, query the profile repository:

```typescript
const profiles = await profileRepo.getAll(userAccount.familyId);
const participantIds = profiles.map(p => p.id);
```

The `useRepository('profile')` hook provides access to `IProfileRepository`. The screen should fetch profile IDs once on mount and pass them to the add form.

### Modal Form Pattern

Follow the leftovers add/edit form pattern (`src/components/leftovers/leftover-add-form.tsx`):
- `Modal` from `react-native` (not react-native-paper)
- `KeyboardAvoidingView` wrapping the form
- `TextInput` for name field
- Validation state with error messages
- `isSaving` loading state during async save
- `resetForm()` on close
- Portuguese error messages and labels

### Delete Confirmation

Follow existing patterns — use a simple confirmation before deleting:
```typescript
Alert.alert(
  'Apagar refeição',
  'Tem a certeza que quer apagar esta refeição?',
  [
    { text: 'Cancelar', style: 'cancel' },
    { text: 'Apagar', style: 'destructive', onPress: handleDelete },
  ]
);
```

### Screen Integration

The meal plan grid screen (`src/app/(app)/(meal-plan)/index.tsx`) needs:
1. State for `selectedSlot` (which empty slot was tapped) and `selectedMeal` (which existing meal was tapped)
2. Fetch all profile IDs on mount for default participants
3. Pass `loadWeek` as a refresh callback to forms

### What NOT to Do

- **DO NOT** implement meal type selection UI — that's Story 8.3
- **DO NOT** implement participant override — that's Epic 10
- **DO NOT** add PowerSync or offline queue
- **DO NOT** add real-time sync subscriptions (FR91 was dropped)

### Project Structure Notes

| File | Path | Action |
|------|------|--------|
| Repository interface | `src/repositories/interfaces/meal-plan.repository.interface.ts` | Modify (add methods) |
| Repository impl | `src/repositories/supabase/meal-plan.repository.ts` | Modify (add methods) |
| Add form component | `src/components/meal-plan/meal-add-form.tsx` | New |
| Edit form component | `src/components/meal-plan/meal-edit-form.tsx` | New |
| Barrel export | `src/components/meal-plan/index.ts` | New |
| Week grid screen | `src/app/(app)/(meal-plan)/index.tsx` | Modify (wire forms) |

### References

- [Source: _bmad-output/planning-artifacts/prd.md#Meal Plan Management (V3) — FR86, FR87, FR88]
- [Source: _bmad-output/planning-artifacts/epics-v3-meal-plan.md#Story 8.2]
- [Pattern: src/repositories/supabase/shopping.repository.ts — Supabase CRUD pattern]
- [Pattern: src/components/leftovers/leftover-add-form.tsx — Modal form pattern]
- [Pattern: src/components/leftovers/leftover-edit-form.tsx — Edit + delete pattern]
- [Previous: _bmad-output/implementation-artifacts/8-1-view-weekly-meal-plan-grid.md — learnings]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

- TypeScript compilation: zero errors (excluding pre-existing Deno Edge Function errors)
- Fixed `getAll` → `getProfilesByFamily` method name from IProfileRepository interface

### Completion Notes List

- Repository interface extended with `create`, `update`, `delete` methods
- Repository implementation: `create` uses `uuid()` + Supabase client, defaults to `home_cooked` type; `update` builds partial update object from provided fields; `delete` by id
- `MealAddForm`: bottom-sheet modal, name input, Portuguese validation ("O nome da refeição é obrigatório"), saving spinner
- `MealEditForm`: bottom-sheet modal, pre-filled name, edit+save, delete with Portuguese confirmation Alert ("Apagar refeição" / "Tem a certeza..."), saving spinner
- Barrel export at `src/components/meal-plan/index.ts`
- Grid cells now tappable: empty slots show "+" and open add form, existing meals open edit form, skipped slots disabled
- Profile IDs fetched on mount via `getProfilesByFamily` — all profiles assigned as default participants on create
- After any CRUD operation, `loadWeek()` refreshes the grid
- Empty slot indicator changed from "·" to "+" for better affordance

### Change Log

- 2026-04-01: Story 8.2 implemented — all 6 tasks complete

### File List

**New files:**
- `src/components/meal-plan/meal-add-form.tsx`
- `src/components/meal-plan/meal-edit-form.tsx`
- `src/components/meal-plan/index.ts`

**Modified files:**
- `src/repositories/interfaces/meal-plan.repository.interface.ts` (added create, update, delete)
- `src/repositories/supabase/meal-plan.repository.ts` (implemented create, update, delete)
- `src/app/(app)/(meal-plan)/index.tsx` (wired forms, added slot tapping, profile loading)
