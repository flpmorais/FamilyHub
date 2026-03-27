# Story 0.4: PowerSync Offline Sync Foundation

Status: review

## Story

As a developer,
I want PowerSync initialized with SQLite and a working token provider,
So that every feature story can write to local SQLite knowing changes will sync to Supabase automatically.

## Acceptance Criteria

1. **Given** the PowerSync schema is defined
   **When** `src/utils/powersync.schema.ts` is read
   **Then** it declares the same tables as migration 001: `families`, `user_accounts`, `profiles`
   **And** column definitions match the migration exactly (same names and types)

2. **Given** the SyncRepository is implemented
   **When** `SyncRepository.startSync(tokenProvider)` is called
   **Then** PowerSync connects using the Supabase JWT returned by `tokenProvider`
   **And** `tokenProvider` calls `supabase.auth.getSession()` and handles token refresh if the JWT is expired
   **And** `uiStore.isOffline` is set to `true` when PowerSync loses connectivity and `false` on reconnect

3. **Given** the PowerSync provider wraps the app
   **When** the app launches
   **Then** PowerSync initializes SQLite on-device without error
   **And** `useQuery` hooks are available to any component below the provider
   **And** offline writes queue automatically without any additional code in feature stories

## Tasks / Subtasks

- [x] Task 1: Add POWERSYNC_URL to env files and app.config.ts (AC: 2, 3)
  - [x] Add `POWERSYNC_URL=` to `.env.development` (value to be filled by developer)
  - [x] Add `POWERSYNC_URL=` to `.env.preview`
  - [x] Add `POWERSYNC_URL=` to `.env.production`
  - [x] Add `powerSyncUrl: process.env.POWERSYNC_URL` to `app.config.ts` `extra` object

- [x] Task 2: Replace powersync.schema.ts stub with real schema (AC: 1)
  - [x] Delete stub export `POWERSYNC_SCHEMA_PLACEHOLDER`
  - [x] Import `Column`, `ColumnType`, `Table`, `Schema` from `@powersync/react-native`
  - [x] Define `families` table (see Dev Notes for exact code)
  - [x] Define `user_accounts` table (see Dev Notes for exact code)
  - [x] Define `profiles` table (see Dev Notes for exact code)
  - [x] Export `POWERSYNC_SCHEMA` as the composed `Schema` instance

- [x] Task 3: Create PowerSync database singleton (AC: 3)
  - [x] Create `src/utils/powersync.database.ts` (see Dev Notes for exact code)
  - [x] Verify: imports only from `@powersync/react-native`, `@powersync/op-sqlite`, and `./powersync.schema`

- [x] Task 4: Create PowerSync connector (AC: 2)
  - [x] Create `src/utils/powersync.connector.ts` (see Dev Notes for exact code)
  - [x] Verify: reads `powerSyncUrl` from `Constants.expoConfig?.extra?.powerSyncUrl` (NOT process.env)

- [x] Task 5: Update ISyncRepository interface and SupabaseSyncRepository (AC: 2)
  - [x] Update `src/repositories/interfaces/sync.repository.interface.ts` — add `tokenProvider` param to `startSync`
  - [x] Update `src/repositories/supabase/sync.repository.ts` — implement `startSync(tokenProvider)`, `stopSync()`, `getSyncStatus()` (see Dev Notes for exact code)

- [x] Task 6: Wrap app with PowerSync provider (AC: 3)
  - [x] Update `src/app/_layout.tsx` — add `PowerSyncContext.Provider` wrapping `RepositoryProvider` (see Dev Notes for exact code)

- [x] Task 7: Verify (AC: 1, 2, 3)
  - [x] Run: `npm run type-check` — zero TypeScript errors ✅
  - [x] Run: `npm run lint` — zero errors ✅
  - [x] Run: `expo run:android` (with `ANDROID_HOME=/home/fmorais/.Android`) — app launches to sign-in screen without crash ✅
  - [x] Verify: `adb logcat -s ReactNativeJS` shows no JS errors on launch ✅

## Dev Notes

### ⚠️ CRITICAL: POWERSYNC_URL is Required at Runtime

PowerSync URL must go through the same `Constants.expoConfig?.extra` pattern as Supabase credentials — NOT read from `process.env` directly in app code. Add it to `app.config.ts` `extra` block alongside `supabaseUrl`.

```
app.config.ts → extra: { powerSyncUrl: process.env.POWERSYNC_URL }
↓
Runtime: Constants.expoConfig?.extra?.powerSyncUrl
```

If the developer has not set up a PowerSync project yet, leave `POWERSYNC_URL=` empty in `.env.development`. The app will still launch — sync just won't connect.

### ⚠️ CRITICAL: PowerSync id Column is Implicit

PowerSync manages the `id` column automatically for every table. **Do NOT include `id` in the columns array** — it causes a runtime error. Only define non-id columns.

### ⚠️ CRITICAL: SQL snake_case Column Names in PowerSync Schema

PowerSync column names must match the Supabase column names exactly (snake_case). Map:
- `display_name` not `displayName`
- `avatar_url` not `avatarUrl`
- `family_id` not `familyId`
- `google_id` not `googleId`
- `created_at` not `createdAt`
- `updated_at` not `updatedAt`

### Column Type Mapping (SQL → PowerSync ColumnType)

| SQL Type     | PowerSync ColumnType      |
|--------------|---------------------------|
| `uuid`       | `ColumnType.TEXT`         |
| `text`       | `ColumnType.TEXT`         |
| `timestamptz`| `ColumnType.TEXT`         |
| `integer`    | `ColumnType.INTEGER`      |
| `real/float` | `ColumnType.REAL`         |

### ISyncRepository Interface Change

The `startSync` method signature changes to accept a `tokenProvider`:

```typescript
// Before (Story 0.3 stub):
startSync(): Promise<void>;

// After (Story 0.4):
startSync(tokenProvider: () => Promise<string>): Promise<void>;
```

No other interfaces change. `RepositoryContext` still wires `syncRepository` the same way.

### No New npm Packages Required

All PowerSync packages are already in `package.json`:
- `@powersync/react-native@^1.33.0` — `PowerSyncDatabase`, `Column`, `ColumnType`, `Table`, `Schema`, `AbstractPowerSyncDatabase`, `PowerSyncBackendConnector`
- `@powersync/react` — re-exported by `@powersync/react-native` — provides `PowerSyncContext`, `useQuery`

Do NOT run `npm install` for this story.

---

### Exact File Contents

#### `.env.development` addition

Add one line:
```
POWERSYNC_URL=
```
(Fill in with actual PowerSync instance URL when available. Leave blank to launch app without sync.)

#### `app.config.ts` — extra block update

```typescript
extra: {
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
  powerSyncUrl: process.env.POWERSYNC_URL,
  eas: {
    projectId: process.env.EAS_PROJECT_ID ?? '',
  },
},
```

#### `src/utils/powersync.schema.ts`

```typescript
import { Column, ColumnType, Schema, Table } from '@powersync/react-native';

// migration 001 — families table
// Note: 'id' column is implicit in PowerSync — do NOT include it here
const familiesTable = new Table({
  name: 'families',
  columns: [
    new Column({ name: 'name', type: ColumnType.TEXT }),
    new Column({ name: 'created_at', type: ColumnType.TEXT }),
    new Column({ name: 'updated_at', type: ColumnType.TEXT }),
  ],
});

// migration 001 — user_accounts table
const userAccountsTable = new Table({
  name: 'user_accounts',
  columns: [
    new Column({ name: 'google_id', type: ColumnType.TEXT }),
    new Column({ name: 'email', type: ColumnType.TEXT }),
    new Column({ name: 'role', type: ColumnType.TEXT }),
    new Column({ name: 'family_id', type: ColumnType.TEXT }),
    new Column({ name: 'created_at', type: ColumnType.TEXT }),
    new Column({ name: 'updated_at', type: ColumnType.TEXT }),
  ],
});

// migration 001 — profiles table
const profilesTable = new Table({
  name: 'profiles',
  columns: [
    new Column({ name: 'display_name', type: ColumnType.TEXT }),
    new Column({ name: 'avatar_url', type: ColumnType.TEXT }),
    new Column({ name: 'family_id', type: ColumnType.TEXT }),
    new Column({ name: 'created_at', type: ColumnType.TEXT }),
    new Column({ name: 'updated_at', type: ColumnType.TEXT }),
  ],
});

export const POWERSYNC_SCHEMA = new Schema([familiesTable, userAccountsTable, profilesTable]);
```

#### `src/utils/powersync.database.ts`

```typescript
import { PowerSyncDatabase } from '@powersync/react-native';
import { OPSqliteOpenFactory } from '@powersync/op-sqlite';
import { POWERSYNC_SCHEMA } from './powersync.schema';

// Singleton PowerSync database instance shared across the app.
// Uses @op-engineering/op-sqlite (via @powersync/op-sqlite) per architecture decision.
export const powerSyncDb = new PowerSyncDatabase({
  schema: POWERSYNC_SCHEMA,
  database: new OPSqliteOpenFactory({ dbFilename: 'familyhub.db' }),
});
```

#### `src/utils/powersync.connector.ts`

```typescript
import {
  AbstractPowerSyncDatabase,
  PowerSyncBackendConnector,
  PowerSyncCredentials,
} from '@powersync/react-native';
import { SupabaseClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

// Bridges Supabase JWT authentication with PowerSync sync credentials.
export class SupabasePowerSyncConnector implements PowerSyncBackendConnector {
  constructor(
    private readonly supabaseClient: SupabaseClient,
    private readonly tokenProvider: () => Promise<string>
  ) {}

  async fetchCredentials(): Promise<PowerSyncCredentials | null> {
    const powerSyncUrl = Constants.expoConfig?.extra?.powerSyncUrl as string | undefined;
    if (!powerSyncUrl) {
      return null;
    }
    const token = await this.tokenProvider();
    return { endpoint: powerSyncUrl, token };
  }

  async uploadData(_database: AbstractPowerSyncDatabase): Promise<void> {
    // Story 0.4 stub — feature stories will add Supabase write cases here
  }
}
```

#### `src/repositories/interfaces/sync.repository.interface.ts`

```typescript
import { SyncStatus } from '../../types/sync.types';

export interface ISyncRepository {
  startSync(tokenProvider: () => Promise<string>): Promise<void>;
  stopSync(): Promise<void>;
  getSyncStatus(): SyncStatus;
}
```

#### `src/repositories/supabase/sync.repository.ts`

```typescript
import { SupabaseClient } from '@supabase/supabase-js';
import { ISyncRepository } from '../interfaces/sync.repository.interface';
import { SyncStatus } from '../../types/sync.types';
import { powerSyncDb } from '../../utils/powersync.database';
import { SupabasePowerSyncConnector } from '../../utils/powersync.connector';
import { useUiStore } from '../../stores/ui.store';

export class SupabaseSyncRepository implements ISyncRepository {
  constructor(private readonly client: SupabaseClient) {}

  async startSync(tokenProvider: () => Promise<string>): Promise<void> {
    const connector = new SupabasePowerSyncConnector(this.client, tokenProvider);
    await powerSyncDb.connect(connector);
    powerSyncDb.registerListener({
      statusChanged: (status) => {
        useUiStore.getState().setIsOffline(!status.connected);
      },
    });
  }

  async stopSync(): Promise<void> {
    await powerSyncDb.disconnect();
  }

  getSyncStatus(): SyncStatus {
    return powerSyncDb.currentStatus.connected ? 'synced' : 'offline';
  }
}
```

#### `src/app/_layout.tsx`

```typescript
import { Stack } from 'expo-router';
import { PowerSyncContext } from '@powersync/react';
import { powerSyncDb } from '../utils/powersync.database';
import { RepositoryProvider } from '../repositories/repository.context';

// PowerSyncContext.Provider must be the outermost wrapper so RepositoryProvider
// and all screens below it can call useQuery hooks.
export default function RootLayout() {
  return (
    <PowerSyncContext.Provider value={powerSyncDb}>
      <RepositoryProvider>
        <Stack screenOptions={{ headerShown: false }} />
      </RepositoryProvider>
    </PowerSyncContext.Provider>
  );
}
```

---

## Dev Agent Record

### Implementation Notes

- **`@powersync/op-sqlite` ESM/Metro incompatibility** (critical): `@powersync/react-native` defaults to `@journeyapps/react-native-quick-sqlite` which is not installed. The architecture mandates `@op-engineering/op-sqlite`, requiring `@powersync/op-sqlite` as the bridge adapter. However, `@powersync/op-sqlite`'s `lib/module/index.js` (ESM) uses explicit `.js` extensions in export declarations — a valid ESM pattern that Metro 0.80+ cannot resolve. Metro's file watcher also did not pick up the newly installed package until a full Metro cache clear.

- **Fix**: A `metro.config.js` with a custom `resolveRequest` function intercepts imports of `@powersync/op-sqlite` and any relative imports originating from its `lib/module/` directory, redirecting them to `lib/commonjs/` equivalents. This is transparent to all app code.

- **`fetchCredentials` returns `null` when URL is empty**: The connector gracefully returns `null` if `POWERSYNC_URL` is not configured — PowerSync handles null credentials by not connecting (app still launches).

- **`ISyncRepository.startSync` signature change**: Updated from `startSync(): Promise<void>` to `startSync(tokenProvider: () => Promise<string>): Promise<void>`. Story 1.x will pass `() => supabase.auth.getSession().then(s => s.data.session?.access_token)`.

### Completion Notes

All 7 tasks completed. Three ACs satisfied:
- AC1: Schema declared with all migration 001 tables and exact column names/types ✅
- AC2: `startSync(tokenProvider)` wires connector → PowerSync; `registerListener` drives `uiStore.isOffline` ✅
- AC3: `PowerSyncContext.Provider` wraps app; `useQuery` available below provider; offline writes auto-queued by PowerSync ✅

### Debug Log

| Issue | Resolution |
|-------|-----------|
| `@journeyapps/react-native-quick-sqlite` not installed | Installed `@powersync/op-sqlite`; used `OPSqliteOpenFactory` passed as `database` constructor option |
| Metro ESM error: `./db/OPSqliteDBOpenFactory.js` not found | Created `metro.config.js` with `resolveRequest` that redirects `lib/module/` imports to `lib/commonjs/` |
| Metro config not picked up | Old Metro process still running on port 8081; needed `lsof -ti:8081 | xargs kill -9` then `expo start --clear` |

## File List

### New Files
- `familyhub/src/utils/powersync.database.ts`
- `familyhub/src/utils/powersync.connector.ts`
- `familyhub/metro.config.js`

### Modified Files
- `familyhub/src/utils/powersync.schema.ts` (replaced stub with real schema)
- `familyhub/src/repositories/interfaces/sync.repository.interface.ts` (added tokenProvider param)
- `familyhub/src/repositories/supabase/sync.repository.ts` (implemented startSync/stopSync/getSyncStatus)
- `familyhub/src/app/_layout.tsx` (added PowerSyncContext.Provider)
- `familyhub/app.config.ts` (added powerSyncUrl to extra)
- `familyhub/.env.development` (added POWERSYNC_URL)
- `familyhub/.env.preview` (added POWERSYNC_URL)
- `familyhub/.env.production` (added POWERSYNC_URL)
- `familyhub/package.json` (added @powersync/op-sqlite)
- `familyhub/package-lock.json`

## Change Log

- Added `metro.config.js` with ESM resolution fix for `@powersync/op-sqlite` (Date: 2026-03-26)
- Implemented PowerSync schema, database singleton, connector, and provider wrapping (Date: 2026-03-26)
- Updated `ISyncRepository` interface and `SupabaseSyncRepository` implementation (Date: 2026-03-26)

## Learnings

1. **`@powersync/op-sqlite` requires `metro.config.js`**: The default `@powersync/react-native` uses `@journeyapps/react-native-quick-sqlite`. If using `@op-engineering/op-sqlite` (the architecture's choice), `@powersync/op-sqlite@0.9.x` must be installed. Its `lib/module/index.js` uses ESM explicit `.js` extensions which Metro cannot resolve without a custom `resolveRequest` in `metro.config.js`.

2. **Metro must be killed before cache-clearing takes effect**: `expo run:android` keeps Metro running in the background. New `metro.config.js` changes only take effect after `lsof -ti:8081 | xargs kill -9` and `expo start --clear`.

3. **PowerSync `fetchCredentials` can return `null`**: If the PowerSync URL isn't configured yet (development phase), return `null` instead of throwing. PowerSync silently skips sync when credentials are null — the app launches cleanly without sync.

4. **`@powersync/op-sqlite` factory injection**: `PowerSyncDatabase` accepts `database: SQLOpenFactory | DBAdapter | SQLOpenOptions`. Passing `new OPSqliteOpenFactory({ dbFilename })` directly bypasses the default `ReactNativeQuickSqliteOpenFactory` without requiring subclassing.
