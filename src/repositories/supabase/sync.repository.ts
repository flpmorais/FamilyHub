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
