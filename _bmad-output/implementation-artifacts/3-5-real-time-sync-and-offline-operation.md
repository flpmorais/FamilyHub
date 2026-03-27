# Story 3.5: Real-Time Sync & Offline Operation

Status: review

## Story

As an Admin,
I want packing list changes to appear on Angela's phone silently and to work fully when I'm offline,
so that we never need to coordinate or wonder if the list is current.

## Acceptance Criteria

1. **Given** Filipe updates a packing item status on his phone
   **When** Angela's phone is connected
   **Then** Angela's list updates within 3 seconds without any refresh action (NFR3)
   **And** no toast, banner, or visual disruption appears — the list is just current

2. **Given** both phones are online and Angela adds a new item
   **When** Filipe views his list
   **Then** Angela's new item appears without Filipe taking any action

3. **Given** an Admin enables airplane mode
   **When** they add items, update statuses, and delete items offline
   **Then** all operations complete normally with immediate local feedback
   **And** no connectivity banner appears during the operation
   **And** a subtle app bar icon appears (no banner, no text) after more than 5 minutes without connectivity

4. **Given** the Admin reconnects after offline changes
   **When** PowerSync sync runs
   **Then** all queued changes sync to Supabase without data loss (NFR13, NFR14)
   **And** if Angela made overlapping changes, last-write-wins resolves silently — no conflict dialog (FR39)
   **And** the list converges to a valid, readable state (NFR15)

5. **Given** the app is launched with no connectivity
   **When** the packing list screen opens
   **Then** the list loads from local SQLite within 1 second (NFR4)
   **And** the user can interact normally — all reads and writes work against local SQLite

## Tasks / Subtasks

- [x] Task 1: Switch packing item repository from Supabase-direct to PowerSync local writes (AC: 3, 5)
  - [x] 1.1 Refactor `PackingItemRepository` CRUD methods to write to local SQLite via `powerSyncDb.execute()`
  - [x] 1.2 Reads: use `powerSyncDb.getAll()` for `getPackingItems(vacationId)`
  - [x] 1.3 Writes: use `powerSyncDb.execute()` for INSERT/UPDATE/DELETE — PowerSync queues for upload
  - [x] 1.4 Exported `mapPackingRow()` for reuse by `useQuery()` in detail screen
  - [x] 1.5 Generate UUIDs client-side (`crypto.randomUUID()`)
  - [x] 1.6 Also implemented `bulkUpdateStatus` (was a stub)

- [x] Task 2: Implement `uploadData` in PowerSync connector (AC: 1, 2, 4)
  - [x] 2.1 Updated `powersync.connector.ts` `uploadData()` method
  - [x] 2.2 Processes write-ahead log: PUT→upsert, PATCH→update, DELETE→delete on any table
  - [x] 2.3 Generic implementation works for all tables (not just packing_items)

- [x] Task 3: Use PowerSync reactive queries for live list updates (AC: 1, 2)
  - [x] 3.1 Replaced manual `packingRepo.getPackingItems()` with `useQuery()` + `mapPackingRow()` in vacation detail
  - [x] 3.2 Packing callbacks no longer call `loadData()` — `useQuery()` auto-re-renders
  - [x] 3.3 Tasks still use manual `loadData()` (booking_tasks remain Supabase-direct)

- [x] Task 4: Add subtle offline indicator (AC: 3)
  - [x] 4.1 Created `src/components/common/offline-indicator.tsx` — cloud icon after 5min offline
  - [x] 4.2 Uses `useUiStore.isOffline` with 5-minute delay timer
  - [x] 4.3 Added to vacation detail hero overlay (right side, next to edit button)

- [x] Task 5: Verify (AC: 1–5)
  - [x] 5.1 `npm run type-check` — zero errors
  - [x] 5.2 `npm run lint` — zero errors

## Dev Notes

### PowerSync Write Pattern

Currently, `PackingItemRepository` calls `supabaseClient.from('packing_items').insert(...)` etc. This means writes go directly to Supabase and fail when offline. The fix is to write to local SQLite via PowerSync:

```typescript
// Before (Supabase-direct, fails offline):
const { data, error } = await this.client.from('packing_items').insert({...}).select();

// After (PowerSync local-first):
const id = crypto.randomUUID();
await powerSyncDb.execute(
  'INSERT INTO packing_items (id, vacation_id, family_id, title, status, profile_id, quantity, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
  [id, vacationId, familyId, title, status, profileId, quantity, notes, now, now]
);
```

PowerSync queues this write and calls `uploadData()` when online to replay it to Supabase.

### uploadData Implementation

The `uploadData` method in `powersync.connector.ts` processes the write-ahead log:

```typescript
async uploadData(database: AbstractPowerSyncDatabase): Promise<void> {
  const transaction = await database.getNextCrudTransaction();
  if (!transaction) return;

  for (const op of transaction.crud) {
    if (op.table === 'packing_items') {
      if (op.op === 'PUT') {
        await this.supabaseClient.from('packing_items').upsert(op.opData);
      } else if (op.op === 'PATCH') {
        await this.supabaseClient.from('packing_items').update(op.opData).eq('id', op.id);
      } else if (op.op === 'DELETE') {
        await this.supabaseClient.from('packing_items').delete().eq('id', op.id);
      }
    }
    // Add cases for other tables as they're migrated to local-first
  }

  await transaction.complete();
}
```

### Reactive Queries with useQuery

PowerSync's `useQuery()` hook watches local SQLite and re-renders when data changes (from local writes OR from sync). Replace manual fetch with:

```typescript
import { useQuery } from '@powersync/react';

const { data: rawItems } = useQuery(
  'SELECT * FROM packing_items WHERE vacation_id = ? ORDER BY created_at',
  [vacationId]
);
const items = (rawItems ?? []).map(mapItem);
```

This means the vacation detail screen's packing tab is live — no `loadAll()` needed for packing items. Tasks still use `loadAll()` since booking_tasks remain Supabase-direct.

### What NOT To Migrate

- `booking_tasks` — stays Supabase-direct for now (a future story could migrate these)
- `vacations` — stays Supabase-direct
- `profiles` — stays Supabase-direct
- Only `packing_items` moves to local-first in this story

### Offline Indicator

The UX spec says: "a subtle app bar icon appears (no banner, no text) after more than 5 minutes without connectivity." Use a small cloud-off icon or dot. The `useUiStore.isOffline` state is already set by the sync repository's `statusChanged` listener.

Track time-since-disconnect with a `useEffect` + `setTimeout(5 * 60 * 1000)`. Only show the icon after the timeout. Reset on reconnect.

### Existing Infrastructure

- `powerSyncDb` singleton in `src/utils/powersync.database.ts`
- `SupabasePowerSyncConnector` in `src/utils/powersync.connector.ts` — `uploadData()` is a stub
- `SupabaseSyncRepository` in `src/repositories/supabase/sync.repository.ts` — calls `powerSyncDb.connect()`
- `useUiStore` has `isOffline` state, updated by sync listener
- PowerSync schema already includes `packing_items` table (added in Story 3.2)

### File Locations

| File | Action |
|---|---|
| `src/repositories/supabase/packing-item.repository.ts` | **MODIFY** — rewrite CRUD to use `powerSyncDb.execute()` |
| `src/utils/powersync.connector.ts` | **MODIFY** — implement `uploadData()` for packing_items |
| `src/app/(app)/vacations/[id]/index.tsx` | **MODIFY** — use `useQuery()` for reactive packing items |
| `src/components/common/offline-indicator.tsx` | **CREATE** — subtle offline icon |
| `src/app/(app)/vacations/[id]/index.tsx` | **MODIFY** — add offline indicator to hero |

### Previous Story Learnings (3.4)

- Packing items are loaded in the vacation detail screen's `loadAll()` and passed to `PackingItemList` as props
- The `usePackingStore` manages filter state per vacation
- The `PackingItemList` component receives `items` as props — if we use `useQuery()` in the parent, the list will automatically re-render when items change

### References

- [Source: _bmad-output/planning-artifacts/architecture.md#Data Architecture] — PowerSync sync engine, last-write-wins
- [Source: _bmad-output/planning-artifacts/architecture.md#Process Patterns] — Offline writes go to SQLite first
- [Source: _bmad-output/planning-artifacts/epics.md#Story 3.5] — Acceptance criteria
- [Source: _bmad-output/planning-artifacts/prd.md#Data Sync & Offline] — FR37–FR39, NFR13–NFR15

## Dev Agent Record

### Agent Model Used

claude-opus-4-6

### Debug Log References

### Completion Notes List

- Rewrote `PackingItemRepository` to use `powerSyncDb.execute()` / `powerSyncDb.getAll()` for all CRUD — writes go to local SQLite, PowerSync queues for sync. Removed `SupabaseClient` constructor dependency. Also implemented `bulkUpdateStatus`.
- Exported `mapPackingRow()` for reuse by `useQuery()` in the detail screen.
- Implemented `uploadData()` in `powersync.connector.ts` — generic handler for PUT (upsert), PATCH (update), DELETE on any table via the crud transaction log.
- Replaced manual `packingRepo.getPackingItems()` in vacation detail with `useQuery()` reactive query — packing list now auto-updates when local SQLite changes (from own writes or sync from other devices).
- Packing callbacks no longer call `loadData()` — useQuery handles re-renders. Task callbacks still call `loadData()`.
- Created `OfflineIndicator` component — shows cloud icon after 5 minutes without connectivity. Added to vacation detail hero overlay.
- Updated `repository.context.tsx` — `SupabasePackingItemRepository` no longer takes supabaseClient arg.
- `type-check` and `lint` both pass with zero errors.

### File List

- `familyhub/src/repositories/supabase/packing-item.repository.ts` — **MODIFIED** — rewritten to PowerSync local-first
- `familyhub/src/utils/powersync.connector.ts` — **MODIFIED** — implemented uploadData()
- `familyhub/src/app/(app)/vacations/[id]/index.tsx` — **MODIFIED** — useQuery() for reactive packing, OfflineIndicator
- `familyhub/src/components/common/offline-indicator.tsx` — **CREATED** — subtle offline icon
- `familyhub/src/repositories/repository.context.tsx` — **MODIFIED** — removed supabaseClient arg from PackingItemRepository
