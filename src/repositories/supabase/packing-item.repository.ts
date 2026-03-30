import { SupabaseClient } from '@supabase/supabase-js';
import { IPackingItemRepository } from '../interfaces/packing-item.repository.interface';
import { PackingItem, CreatePackingItemInput, PackingStatus } from '../../types/packing.types';
import { logger } from '../../utils/logger';
import { uuid } from '../../utils/uuid';

export function mapPackingRow(row: any, tagIds: string[] = []): PackingItem {
  return {
    id: row.id,
    vacationId: row.vacation_id,
    familyId: row.family_id,
    name: row.title,
    status: row.status as PackingStatus,
    assignedProfileId: row.profile_id ?? null,
    isAllFamily: row.is_all_family === 1 || row.is_all_family === true,
    quantity: Number(row.quantity) || 1,
    notes: row.notes ?? null,
    categoryId: row.category_id ?? null,
    tagIds,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function now(): string {
  return new Date().toISOString();
}

export class SupabasePackingItemRepository implements IPackingItemRepository {
  constructor(private readonly client: SupabaseClient) {}

  async getPackingItems(vacationId: string): Promise<PackingItem[]> {
    try {
      const { data: rows, error } = await this.client
        .from('packing_items')
        .select('*')
        .eq('vacation_id', vacationId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const itemIds = (rows ?? []).map((r: any) => r.id);

      let tagMap = new Map<string, string[]>();
      if (itemIds.length > 0) {
        const { data: tagRows, error: tagError } = await this.client
          .from('packing_item_tags')
          .select('packing_item_id, tag_id')
          .in('packing_item_id', itemIds);

        if (tagError) throw tagError;

        for (const tr of tagRows ?? []) {
          const list = tagMap.get(tr.packing_item_id) ?? [];
          list.push(tr.tag_id);
          tagMap.set(tr.packing_item_id, list);
        }
      }

      return (rows ?? []).map((r: any) => mapPackingRow(r, tagMap.get(r.id) ?? []));
    } catch (err) {
      logger.error('PackingItemRepository', 'getPackingItems failed', err);
      throw new Error(`Erro ao carregar itens: ${err instanceof Error ? err.message : 'Erro'}`);
    }
  }

  async createPackingItem(input: CreatePackingItemInput): Promise<PackingItem> {
    const id = uuid();
    const ts = now();
    try {
      const { data, error } = await this.client
        .from('packing_items')
        .insert({
          id,
          vacation_id: input.vacationId,
          family_id: input.familyId,
          title: input.name,
          status: 'new',
          profile_id: input.assignedProfileId ?? null,
          quantity: input.quantity ?? 1,
          notes: input.notes ?? null,
          category_id: input.categoryId ?? null,
          is_all_family: input.isAllFamily ?? false,
          created_at: ts,
          updated_at: ts,
        })
        .select()
        .single();

      if (error) throw error;
      return mapPackingRow(data);
    } catch (err) {
      logger.error('PackingItemRepository', 'createPackingItem failed', err);
      throw new Error(`Erro ao criar item: ${err instanceof Error ? err.message : 'Erro'}`);
    }
  }

  async updatePackingItem(
    id: string,
    data: Partial<Omit<PackingItem, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<PackingItem> {
    const updates: Record<string, unknown> = {};

    if (data.name !== undefined) updates.title = data.name;
    if (data.status !== undefined) updates.status = data.status;
    if (data.assignedProfileId !== undefined) updates.profile_id = data.assignedProfileId;
    if (data.quantity !== undefined) updates.quantity = data.quantity;
    if (data.notes !== undefined) updates.notes = data.notes;
    if (data.categoryId !== undefined) updates.category_id = data.categoryId;
    if (data.isAllFamily !== undefined) updates.is_all_family = data.isAllFamily;

    updates.updated_at = now();

    try {
      const { data: row, error } = await this.client
        .from('packing_items')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      if (!row) throw new Error('Item não encontrado');
      return mapPackingRow(row);
    } catch (err) {
      logger.error('PackingItemRepository', 'updatePackingItem failed', err);
      throw new Error(`Erro ao actualizar item: ${err instanceof Error ? err.message : 'Erro'}`);
    }
  }

  async deletePackingItem(id: string): Promise<void> {
    try {
      const { error } = await this.client
        .from('packing_items')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (err) {
      logger.error('PackingItemRepository', 'deletePackingItem failed', err);
      throw new Error(`Erro ao eliminar item: ${err instanceof Error ? err.message : 'Erro'}`);
    }
  }

  async bulkUpdateStatus(ids: string[], status: PackingStatus): Promise<void> {
    if (ids.length === 0) return;
    const ts = now();
    try {
      const { error } = await this.client
        .from('packing_items')
        .update({ status, updated_at: ts })
        .in('id', ids);

      if (error) throw error;
    } catch (err) {
      logger.error('PackingItemRepository', 'bulkUpdateStatus failed', err);
      throw new Error(`Erro ao actualizar estado: ${err instanceof Error ? err.message : 'Erro'}`);
    }
  }
}
