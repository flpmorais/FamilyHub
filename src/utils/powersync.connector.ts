import {
  AbstractPowerSyncDatabase,
  PowerSyncBackendConnector,
  PowerSyncCredentials,
} from '@powersync/react-native';
import { SupabaseClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';
import { logger } from './logger';

// Bridges Supabase JWT authentication with PowerSync sync credentials.
// tokenProvider: caller-supplied function that returns current Supabase JWT.
export class SupabasePowerSyncConnector implements PowerSyncBackendConnector {
  constructor(
    private readonly supabaseClient: SupabaseClient,
    private readonly tokenProvider: () => Promise<string>
  ) {}

  async fetchCredentials(): Promise<PowerSyncCredentials | null> {
    const powerSyncUrl = Constants.expoConfig?.extra?.powerSyncUrl as string | undefined;
    if (!powerSyncUrl) {
      // No PowerSync URL configured — sync disabled, return null to indicate unauthenticated
      return null;
    }
    const token = await this.tokenProvider();
    return {
      endpoint: powerSyncUrl,
      token,
    };
  }

  // Replays queued local writes to Supabase when connectivity is available.
  async uploadData(database: AbstractPowerSyncDatabase): Promise<void> {
    const transaction = await database.getNextCrudTransaction();
    if (!transaction) return;

    try {
      for (const op of transaction.crud) {
        const table = op.table;
        const id = op.id;
        const opData = op.opData;

        if (op.op === 'PUT') {
          // Full row insert/upsert
          const { error } = await this.supabaseClient.from(table).upsert({ id, ...opData });
          if (error) throw error;
        } else if (op.op === 'PATCH') {
          // Partial update
          const { error } = await this.supabaseClient.from(table).update(opData).eq('id', id);
          if (error) throw error;
        } else if (op.op === 'DELETE') {
          const { error } = await this.supabaseClient.from(table).delete().eq('id', id);
          if (error) throw error;
        }
      }
      await transaction.complete();
    } catch (err) {
      logger.error('PowerSyncConnector', 'uploadData failed', err);
      throw err;
    }
  }
}
