import { IPackingItemRepository } from '../interfaces/packing-item.repository.interface';
import { PackingItem, CreatePackingItemInput, PackingStatus } from '../../types/packing.types';
import { powerSyncDb } from '../../utils/powersync.database';
import { logger } from '../../utils/logger';
import { uuid } from '../../utils/uuid';

export function mapPackingRow(row: any): PackingItem {
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
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function now(): string {
  return new Date().toISOString();
}

export class SupabasePackingItemRepository implements IPackingItemRepository {
  async getPackingItems(vacationId: string): Promise<PackingItem[]> {
    try {
      const rows = await powerSyncDb.getAll(
        'SELECT * FROM packing_items WHERE vacation_id = ? ORDER BY created_at',
        [vacationId]
      );
      return rows.map(mapPackingRow);
    } catch (err) {
      logger.error('PackingItemRepository', 'getPackingItems failed', err);
      throw new Error(`Erro ao carregar itens: ${err instanceof Error ? err.message : 'Erro'}`);
    }
  }

  async createPackingItem(input: CreatePackingItemInput): Promise<PackingItem> {
    const id = uuid();
    const ts = now();
    try {
      await powerSyncDb.execute(
        `INSERT INTO packing_items (id, vacation_id, family_id, title, status, profile_id, quantity, notes, category_id, is_all_family, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          input.vacationId,
          input.familyId,
          input.name,
          'new',
          input.assignedProfileId ?? null,
          input.quantity ?? 1,
          input.notes ?? null,
          input.categoryId ?? null,
          input.isAllFamily ? 1 : 0,
          ts,
          ts,
        ]
      );
      const rows = await powerSyncDb.getAll('SELECT * FROM packing_items WHERE id = ?', [id]);
      return mapPackingRow(rows[0]);
    } catch (err) {
      logger.error('PackingItemRepository', 'createPackingItem failed', err);
      throw new Error(`Erro ao criar item: ${err instanceof Error ? err.message : 'Erro'}`);
    }
  }

  async updatePackingItem(
    id: string,
    data: Partial<Omit<PackingItem, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<PackingItem> {
    const sets: string[] = [];
    const params: unknown[] = [];

    if (data.name !== undefined) {
      sets.push('title = ?');
      params.push(data.name);
    }
    if (data.status !== undefined) {
      sets.push('status = ?');
      params.push(data.status);
    }
    if (data.assignedProfileId !== undefined) {
      sets.push('profile_id = ?');
      params.push(data.assignedProfileId);
    }
    if (data.quantity !== undefined) {
      sets.push('quantity = ?');
      params.push(data.quantity);
    }
    if (data.notes !== undefined) {
      sets.push('notes = ?');
      params.push(data.notes);
    }
    if (data.categoryId !== undefined) {
      sets.push('category_id = ?');
      params.push(data.categoryId);
    }
    if (data.isAllFamily !== undefined) {
      sets.push('is_all_family = ?');
      params.push(data.isAllFamily ? 1 : 0);
    }

    sets.push('updated_at = ?');
    params.push(now());
    params.push(id);

    try {
      await powerSyncDb.execute(`UPDATE packing_items SET ${sets.join(', ')} WHERE id = ?`, params);
      const rows = await powerSyncDb.getAll('SELECT * FROM packing_items WHERE id = ?', [id]);
      if (rows.length === 0) throw new Error('Item não encontrado');
      return mapPackingRow(rows[0]);
    } catch (err) {
      logger.error('PackingItemRepository', 'updatePackingItem failed', err);
      throw new Error(`Erro ao actualizar item: ${err instanceof Error ? err.message : 'Erro'}`);
    }
  }

  async deletePackingItem(id: string): Promise<void> {
    try {
      await powerSyncDb.execute('DELETE FROM packing_items WHERE id = ?', [id]);
    } catch (err) {
      logger.error('PackingItemRepository', 'deletePackingItem failed', err);
      throw new Error(`Erro ao eliminar item: ${err instanceof Error ? err.message : 'Erro'}`);
    }
  }

  async bulkUpdateStatus(ids: string[], status: PackingStatus): Promise<void> {
    if (ids.length === 0) return;
    const placeholders = ids.map(() => '?').join(',');
    const ts = now();
    try {
      await powerSyncDb.execute(
        `UPDATE packing_items SET status = ?, updated_at = ? WHERE id IN (${placeholders})`,
        [status, ts, ...ids]
      );
    } catch (err) {
      logger.error('PackingItemRepository', 'bulkUpdateStatus failed', err);
      throw new Error(`Erro ao actualizar estado: ${err instanceof Error ? err.message : 'Erro'}`);
    }
  }
}
