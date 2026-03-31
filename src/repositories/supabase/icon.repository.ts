import { SupabaseClient } from '@supabase/supabase-js';
import { IIconRepository } from '../interfaces/icon.repository.interface';
import { IconEntry } from '../../types/packing.types';
import { logger } from '../../utils/logger';

function mapIcon(row: any): IconEntry {
  return {
    id: row.id,
    name: row.name,
    tags: row.tags ?? '',
  };
}

export class SupabaseIconRepository implements IIconRepository {
  constructor(private readonly client: SupabaseClient) {}

  async getIcons(): Promise<IconEntry[]> {
    try {
      const { data, error } = await this.client
        .from('icons')
        .select('*')
        .order('name');
      if (error) throw error;
      return (data ?? []).map(mapIcon);
    } catch (err) {
      logger.error('IconRepository', 'getIcons failed', err);
      throw new Error(
        `Erro ao carregar ícones: ${err instanceof Error ? err.message : 'Erro'}`
      );
    }
  }
}
