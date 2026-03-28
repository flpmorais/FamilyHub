import { ITagRepository } from '../interfaces/tag.repository.interface';
import { Tag } from '../../types/packing.types';
import { powerSyncDb } from '../../utils/powersync.database';
import { logger } from '../../utils/logger';
import { uuid } from '../../utils/uuid';

function mapTag(row: any): Tag {
  return {
    id: row.id,
    name: row.name,
    color: row.color ?? '#888888',
    icon: row.icon ?? 'tag',
    active: row.active === 1 || row.active === true,
    sortOrder: Number(row.sort_order) || 0,
    familyId: row.family_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function now(): string {
  return new Date().toISOString();
}

export class SupabaseTagRepository implements ITagRepository {
  async getTags(familyId: string): Promise<Tag[]> {
    try {
      const rows = await powerSyncDb.getAll(
        'SELECT * FROM tags WHERE family_id = ? ORDER BY sort_order, name',
        [familyId]
      );
      return rows.map(mapTag);
    } catch (err) {
      logger.error('TagRepository', 'getTags failed', err);
      throw new Error(`Erro ao carregar etiquetas: ${err instanceof Error ? err.message : 'Erro'}`);
    }
  }

  async createTag(familyId: string, name: string, icon: string, color: string = '#888888'): Promise<Tag> {
    const id = uuid();
    const ts = now();
    try {
      const maxRows = await powerSyncDb.getAll(
        'SELECT MAX(sort_order) as max_order FROM tags WHERE family_id = ?',
        [familyId]
      );
      const nextOrder = (Number((maxRows[0] as any)?.max_order) || 0) + 1;
      await powerSyncDb.execute(
        'INSERT INTO tags (id, family_id, name, icon, color, active, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?)',
        [id, familyId, name, icon, color, nextOrder, ts, ts]
      );
      const rows = await powerSyncDb.getAll('SELECT * FROM tags WHERE id = ?', [id]);
      return mapTag(rows[0]);
    } catch (err) {
      logger.error('TagRepository', 'createTag failed', err);
      throw new Error(`Erro ao criar etiqueta: ${err instanceof Error ? err.message : 'Erro'}`);
    }
  }

  async updateTag(id: string, name: string, icon: string, color?: string): Promise<Tag> {
    const ts = now();
    try {
      if (color !== undefined) {
        await powerSyncDb.execute(
          'UPDATE tags SET name = ?, icon = ?, color = ?, updated_at = ? WHERE id = ?',
          [name, icon, color, ts, id]
        );
      } else {
        await powerSyncDb.execute('UPDATE tags SET name = ?, icon = ?, updated_at = ? WHERE id = ?', [name, icon, ts, id]);
      }
      const rows = await powerSyncDb.getAll('SELECT * FROM tags WHERE id = ?', [id]);
      if (rows.length === 0) throw new Error('Etiqueta não encontrada');
      return mapTag(rows[0]);
    } catch (err) {
      logger.error('TagRepository', 'updateTag failed', err);
      throw new Error(`Erro ao actualizar etiqueta: ${err instanceof Error ? err.message : 'Erro'}`);
    }
  }

  async deleteTag(id: string): Promise<void> {
    try {
      const rows = await powerSyncDb.getAll('SELECT sort_order, family_id FROM tags WHERE id = ?', [id]);
      await powerSyncDb.execute('DELETE FROM tags WHERE id = ?', [id]);
      if (rows.length > 0) {
        const { sort_order, family_id } = rows[0] as any;
        await powerSyncDb.execute(
          'UPDATE tags SET sort_order = sort_order - 1 WHERE family_id = ? AND sort_order > ?',
          [family_id, sort_order]
        );
      }
    } catch (err) {
      logger.error('TagRepository', 'deleteTag failed', err);
      throw new Error(`Erro ao eliminar etiqueta: ${err instanceof Error ? err.message : 'Erro'}`);
    }
  }

  async countItemsUsingTag(tagId: string): Promise<number> {
    const rows = await powerSyncDb.getAll(
      'SELECT COUNT(*) as cnt FROM packing_item_tags WHERE tag_id = ?',
      [tagId]
    );
    return Number((rows[0] as any)?.cnt ?? 0);
  }

  async setActive(id: string, active: boolean): Promise<Tag> {
    const ts = now();
    await powerSyncDb.execute('UPDATE tags SET active = ?, updated_at = ? WHERE id = ?', [
      active ? 1 : 0, ts, id,
    ]);
    const rows = await powerSyncDb.getAll('SELECT * FROM tags WHERE id = ?', [id]);
    return mapTag(rows[0]);
  }

  async reorderTag(id: string, newOrder: number): Promise<void> {
    const rows = await powerSyncDb.getAll('SELECT sort_order, family_id FROM tags WHERE id = ?', [id]);
    if (rows.length === 0) return;
    const { sort_order: oldOrder, family_id } = rows[0] as any;
    if (oldOrder === newOrder) return;
    const ts = now();
    if (newOrder < oldOrder) {
      await powerSyncDb.execute(
        'UPDATE tags SET sort_order = sort_order + 1, updated_at = ? WHERE family_id = ? AND sort_order >= ? AND sort_order < ?',
        [ts, family_id, newOrder, oldOrder]
      );
    } else {
      await powerSyncDb.execute(
        'UPDATE tags SET sort_order = sort_order - 1, updated_at = ? WHERE family_id = ? AND sort_order > ? AND sort_order <= ?',
        [ts, family_id, oldOrder, newOrder]
      );
    }
    await powerSyncDb.execute('UPDATE tags SET sort_order = ?, updated_at = ? WHERE id = ?', [newOrder, ts, id]);
  }
}
