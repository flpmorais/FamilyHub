import { SupabaseClient } from '@supabase/supabase-js';
import { IOtaRepository } from '../interfaces/ota.repository.interface';

export class SupabaseOtaRepository implements IOtaRepository {
  constructor(private readonly client: SupabaseClient) {}

  async checkForUpdate(): Promise<boolean> {
    throw new Error('SupabaseOtaRepository.checkForUpdate: not implemented (Story 5.2)');
  }

  async applyUpdate(): Promise<void> {
    throw new Error('SupabaseOtaRepository.applyUpdate: not implemented (Story 5.2)');
  }
}
