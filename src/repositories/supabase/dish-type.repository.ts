import { SupabaseClient } from '@supabase/supabase-js';
import { IDishTypeRepository } from '../interfaces/dish-type.repository.interface';
import type { DishType, DishTypeKey } from '../../types/dish-type.types';
import { logger } from '../../utils/logger';

function mapDishType(row: any): DishType {
  return {
    id: row.id,
    familyId: row.family_id,
    key: row.key as DishTypeKey,
    name: row.name,
    color: row.color,
    icon: row.icon,
    sortOrder: row.sort_order,
    isSystem: row.is_system,
  };
}

export class SupabaseDishTypeRepository implements IDishTypeRepository {
  constructor(private readonly client: SupabaseClient) {}

  async getByFamilyId(familyId: string): Promise<DishType[]> {
    try {
      const { data, error } = await this.client
        .from('dish_types')
        .select('*')
        .eq('family_id', familyId)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return (data ?? []).map(mapDishType);
    } catch (err) {
      logger.error('DishTypeRepository', 'getByFamilyId failed', err);
      throw new Error(
        `Não foi possível carregar os tipos de prato: ${err instanceof Error ? err.message : 'Erro'}`,
      );
    }
  }
}
