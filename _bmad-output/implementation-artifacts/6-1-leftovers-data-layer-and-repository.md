# Story 6.1: Leftovers Data Layer & Repository

Status: review

## Story

As a developer,
I want the leftovers database table, PowerSync schema, repository interface, and implementation in place,
So that all subsequent leftovers stories can persist and sync data using the same patterns as V1.

## Acceptance Criteria

1. Migration `20260327000001_leftovers_module.sql` creates the `leftovers` table with all columns, constraints, RLS, and index
2. PowerSync schema (`src/utils/powersync.schema.ts`) declares the `leftovers` table matching the migration — in the same commit
3. `ILeftoverRepository` interface defined with methods: `create`, `update`, `delete`, `getById`, `getActive`, `getAll` (paginated), `incrementEaten`, `throwOutRemaining`
4. `SupabaseLeftoverRepository` implements all methods using `powerSyncDb` (local-first pattern), with `snake_case` ↔ `camelCase` conversion in `mapLeftover()`
5. `RepositoryContext` provides the 9th repository singleton
6. `Leftover`, `LeftoverStatus`, `LeftoverWidgetData`, `CreateLeftoverInput` types exist in `src/types/leftover.types.ts`
7. `DEFAULT_EXPIRY_DAYS = 5` and `PAGINATION_PAGE_SIZE = 20` exported from `src/constants/leftover-defaults.ts`
8. `leftoversStore` Zustand store exists with `paginationCursor` and `scrollPosition` state

## Tasks / Subtasks

- [x] Task 1: Create Supabase migration (AC: #1)
  - [x] Create `supabase/migrations/20260327200000_leftovers_module.sql`
  - [x] Define `leftovers` table with all columns (see schema below)
  - [x] Add check constraints: `doses_eaten + doses_thrown_out <= total_doses`, `total_doses > 0`, `expiry_days > 0`, `status IN ('active', 'closed')`
  - [x] Add `updated_at` trigger (same pattern as existing tables — `update_updated_at()`)
  - [x] Enable RLS: admins read/write rows where `family_id` matches session
  - [x] Create index `idx_leftovers_family_id_status`
- [x] Task 2: Update PowerSync schema (AC: #2)
  - [x] Add `leftovers` table definition to `src/utils/powersync.schema.ts`
  - [x] Columns match migration exactly (11 columns)
- [x] Task 3: Create types and constants (AC: #6, #7)
  - [x] Create `src/types/leftover.types.ts`
  - [x] Create `src/constants/leftover-defaults.ts`
- [x] Task 4: Create repository interface (AC: #3)
  - [x] Create `src/repositories/interfaces/leftover.repository.interface.ts`
- [x] Task 5: Create repository implementation (AC: #4)
  - [x] Create `src/repositories/supabase/leftover.repository.ts`
  - [x] Use `powerSyncDb` pattern (NOT Supabase client) — local-first, offline-capable
  - [x] Include `mapLeftover()` for snake_case → camelCase conversion
  - [x] Implement auto-close logic in `incrementEaten` and `throwOutRemaining` (AR-V2-5)
- [x] Task 6: Register in RepositoryContext (AC: #5)
  - [x] Add `ILeftoverRepository` to `src/repositories/repository.context.tsx`
  - [x] Export from barrel `src/repositories/index.ts`
- [x] Task 7: Create Zustand store (AC: #8)
  - [x] Create `src/stores/leftovers.store.ts`

## Dev Notes

### Database Schema

```sql
CREATE TABLE leftovers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id),
  name TEXT NOT NULL,
  total_doses INTEGER NOT NULL,
  doses_eaten INTEGER NOT NULL DEFAULT 0,
  doses_thrown_out INTEGER NOT NULL DEFAULT 0,
  expiry_days INTEGER NOT NULL DEFAULT 5,
  date_added TIMESTAMPTZ NOT NULL DEFAULT now(),
  expiry_date TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT chk_doses CHECK (doses_eaten + doses_thrown_out <= total_doses),
  CONSTRAINT chk_total_positive CHECK (total_doses > 0),
  CONSTRAINT chk_expiry_positive CHECK (expiry_days > 0),
  CONSTRAINT chk_status CHECK (status IN ('active', 'closed'))
);

CREATE INDEX idx_leftovers_family_id_status ON leftovers(family_id, status);

-- RLS
ALTER TABLE leftovers ENABLE ROW LEVEL SECURITY;
CREATE POLICY leftovers_family_policy ON leftovers
  USING (family_id IN (SELECT family_id FROM user_accounts WHERE id = auth.uid()))
  WITH CHECK (family_id IN (SELECT family_id FROM user_accounts WHERE id = auth.uid()));
```

**`expiry_date` is computed on insert:** `date_added + expiry_days * interval '1 day'`. Compute in the repository layer at creation time — not a generated column (PowerSync doesn't sync generated columns reliably).

### V1 Pattern: Repository Uses PowerSync (local-first)

**CRITICAL:** The leftovers repository MUST use the `powerSyncDb` pattern (same as `category.repository.ts`, `tag.repository.ts`, `packing-item.repository.ts`) — NOT the Supabase JS client pattern used by `vacation.repository.ts`. This ensures offline writes work (FR57).

Key imports and utilities to reuse:
```typescript
import { powerSyncDb } from '../../utils/powersync.database';
import { logger } from '../../utils/logger';
import { uuid } from '../../utils/uuid';
```

**Mapper pattern** (from `category.repository.ts`):
```typescript
function mapLeftover(row: any): Leftover {
  return {
    id: row.id,
    familyId: row.family_id,
    name: row.name,
    totalDoses: Number(row.total_doses),
    dosesEaten: Number(row.doses_eaten),
    dosesThrownOut: Number(row.doses_thrown_out),
    expiryDays: Number(row.expiry_days),
    dateAdded: row.date_added,
    expiryDate: row.expiry_date,
    status: row.status as LeftoverStatus,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
```

**CRUD pattern** (from `category.repository.ts`):
- `powerSyncDb.getAll(sql, params)` for reads
- `powerSyncDb.execute(sql, params)` for writes
- `uuid()` for generating IDs
- `new Date().toISOString()` for timestamps
- Wrap all operations in try-catch with `logger.error('LeftoverRepository', 'methodName failed', err)`
- Error messages in Portuguese: `'Erro ao carregar restos: ...'`

### Auto-Close Logic (AR-V2-5)

In `incrementEaten()` and `throwOutRemaining()`, after updating dose counters, check if `doses_eaten + doses_thrown_out === total_doses`. If so, set `status = 'closed'` in the same SQL UPDATE. Do NOT use a database trigger — keep logic in the repository layer.

```typescript
// incrementEaten pseudo-pattern
async incrementEaten(id: string): Promise<Leftover> {
  const ts = now();
  await powerSyncDb.execute(
    `UPDATE leftovers SET
      doses_eaten = doses_eaten + 1,
      status = CASE WHEN doses_eaten + 1 + doses_thrown_out >= total_doses THEN 'closed' ELSE status END,
      updated_at = ?
    WHERE id = ? AND status = 'active' AND doses_eaten + doses_thrown_out < total_doses`,
    [ts, id]
  );
  // fetch and return updated row
}
```

### Types to Create

```typescript
// src/types/leftover.types.ts
export type LeftoverStatus = 'active' | 'closed';

export interface Leftover {
  id: string;
  familyId: string;
  name: string;
  totalDoses: number;
  dosesEaten: number;
  dosesThrownOut: number;
  expiryDays: number;
  dateAdded: string;
  expiryDate: string;
  status: LeftoverStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLeftoverInput {
  familyId: string;
  name: string;
  totalDoses: number;
  expiryDays?: number; // defaults to DEFAULT_EXPIRY_DAYS
}

export interface LeftoverWidgetData {
  activeMeals: number;
  totalActiveDoses: number;
  nearestExpiry: { name: string; expiryDate: string } | null;
}
```

### Constants

```typescript
// src/constants/leftover-defaults.ts
export const DEFAULT_EXPIRY_DAYS = 5;
export const PAGINATION_PAGE_SIZE = 20;
```

### Zustand Store Pattern

Follow existing stores (`packing.store.ts`):
```typescript
// src/stores/leftovers.store.ts
import { create } from 'zustand';

interface LeftoversState {
  paginationCursor: number;
  scrollPosition: number;
  setPaginationCursor: (cursor: number) => void;
  setScrollPosition: (pos: number) => void;
  reset: () => void;
}

export const useLeftoversStore = create<LeftoversState>((set) => ({
  paginationCursor: 0,
  scrollPosition: 0,
  setPaginationCursor: (cursor) => set({ paginationCursor: cursor }),
  setScrollPosition: (pos) => set({ scrollPosition: pos }),
  reset: () => set({ paginationCursor: 0, scrollPosition: 0 }),
}));
```

### RepositoryContext Registration

In `src/repositories/repository.context.tsx`, add:
1. Import `ILeftoverRepository` and `SupabaseLeftoverRepository`
2. Add `leftover: ILeftoverRepository` to the context type
3. Create singleton instance: `new SupabaseLeftoverRepository()`
4. Provide in context value

### Project Structure Notes

All new files follow existing naming conventions:

| File | Path |
|------|------|
| Migration | `supabase/migrations/20260327000001_leftovers_module.sql` |
| PowerSync schema update | `src/utils/powersync.schema.ts` (existing file — add table) |
| Types | `src/types/leftover.types.ts` |
| Constants | `src/constants/leftover-defaults.ts` |
| Interface | `src/repositories/interfaces/leftover.repository.interface.ts` |
| Implementation | `src/repositories/supabase/leftover.repository.ts` |
| Context update | `src/repositories/repository.context.tsx` (existing file — add repo) |
| Barrel update | `src/repositories/index.ts` (existing file — add export) |
| Store | `src/stores/leftovers.store.ts` |

### References

- [Source: _bmad-output/planning-artifacts/architecture.md#1b. (V2) Leftovers Data Architecture]
- [Source: _bmad-output/planning-artifacts/architecture.md#Implementation Patterns & Consistency Rules]
- [Source: _bmad-output/planning-artifacts/architecture.md#Project Structure & Boundaries]
- [Source: _bmad-output/planning-artifacts/epics.md#Story 6.1]
- [Source: _bmad-output/planning-artifacts/prd.md#Leftovers Management (V2)]
- [Pattern: src/repositories/supabase/category.repository.ts — powerSyncDb local-first pattern]
- [Pattern: src/repositories/interfaces/category.repository.interface.ts — interface pattern]
- [Pattern: src/stores/packing.store.ts — Zustand store pattern]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

- TypeScript compilation: zero errors
- ESLint: all new files pass after prettier formatting
- Existing test suite: no tests exist (passWithNoTests)
- Migration file uses `update_updated_at()` function (corrected from initial `update_updated_at_column()` — discovered by inspecting existing migrations)

### Completion Notes List

- Created Supabase migration with full table schema, 4 check constraints, RLS policy (same `FOR ALL` pattern as categories/tags), `updated_at` trigger, and composite index
- Migration filename adjusted to `20260327200000` (follows chronological ordering after existing `20260327110000`)
- PowerSync schema updated with `leftovers` table (11 columns matching migration)
- Types: `Leftover`, `LeftoverStatus`, `CreateLeftoverInput`, `LeftoverWidgetData` — all camelCase
- Constants: `DEFAULT_EXPIRY_DAYS = 5`, `PAGINATION_PAGE_SIZE = 20`
- Repository interface: 8 methods including `incrementEaten` and `throwOutRemaining`
- Repository implementation uses `powerSyncDb` pattern (local-first, offline-capable) — NOT the Supabase client pattern
- Auto-close logic uses SQL CASE expression in single UPDATE (no separate read-then-write)
- `throwOutRemaining` sets `doses_thrown_out = total_doses - doses_eaten` and `status = 'closed'` atomically
- `getAll` sorts active-first by expiry ASC, closed by expiry DESC (matches FR55)
- `expiry_date` computed in repository layer at creation time (not DB generated column — PowerSync compatibility)
- RepositoryContext provides 10th singleton (9 existing + leftover) — no constructor args needed (powerSyncDb imported)
- Zustand store: `useLeftoversStore` with pagination cursor and scroll position
- All error messages in Portuguese matching V1 convention

### Change Log

- 2026-03-28: Story 6.1 implemented — all 7 tasks complete

### File List

**New files:**
- `supabase/migrations/20260327200000_leftovers_module.sql`
- `src/types/leftover.types.ts`
- `src/constants/leftover-defaults.ts`
- `src/repositories/interfaces/leftover.repository.interface.ts`
- `src/repositories/supabase/leftover.repository.ts`
- `src/stores/leftovers.store.ts`

**Modified files:**
- `src/utils/powersync.schema.ts` (added leftoversTable)
- `src/repositories/repository.context.tsx` (added leftover repository)
- `src/repositories/index.ts` (added ILeftoverRepository export)
