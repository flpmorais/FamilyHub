import { SyncStatus } from '../../types/sync.types';

export interface ISyncRepository {
  startSync(tokenProvider: () => Promise<string>): Promise<void>;
  stopSync(): Promise<void>;
  getSyncStatus(): SyncStatus;
}
