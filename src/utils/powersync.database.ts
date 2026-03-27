import { PowerSyncDatabase } from '@powersync/react-native';
import { OPSqliteOpenFactory } from '@powersync/op-sqlite';
import { POWERSYNC_SCHEMA } from './powersync.schema';

// Singleton PowerSync database instance shared across the app.
// Uses @op-engineering/op-sqlite (via @powersync/op-sqlite) per architecture decision AR.
// Initialized once at module load; provider in _layout.tsx makes it available via context.
export const powerSyncDb = new PowerSyncDatabase({
  schema: POWERSYNC_SCHEMA,
  database: new OPSqliteOpenFactory({ dbFilename: 'familyhub.db' }),
});
