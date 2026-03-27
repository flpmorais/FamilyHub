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
    active: row.active === 1 || row.active === true,
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
        'SELECT * FROM tags WHERE family_id = ? ORDER BY name',
        [familyId]
      );
      return rows.map(mapTag);
    } catch (err) {
      logger.error('TagRepository', 'getTags failed', err);
      throw new Error(`Erro ao carregar etiquetas: ${err instanceof Error ? err.message : 'Erro'}`);
    }
  }

  async createTag(familyId: string, name: string, color: string = '#888888'): Promise<Tag> {
    const id = uuid();
    const ts = now();
    try {
      await powerSyncDb.execute(
        'INSERT INTO tags (id, family_id, name, color, active, created_at, updated_at) VALUES (?, ?, ?, ?, 1, ?, ?)',
        [id, familyId, name, color, ts, ts]
      );
      const rows = await powerSyncDb.getAll('SELECT * FROM tags WHERE id = ?', [id]);
      return mapTag(rows[0]);
    } catch (err) {
      logger.error('TagRepository', 'createTag failed', err);
      throw new Error(`Erro ao criar etiqueta: ${err instanceof Error ? err.message : 'Erro'}`);
    }
  }

  async updateTag(id: string, name: string, color?: string): Promise<Tag> {
    const ts = now();
    try {
      if (color !== undefined) {
        await powerSyncDb.execute(
          'UPDATE tags SET name = ?, color = ?, updated_at = ? WHERE id = ?',
          [name, color, ts, id]
        );
      } else {
        await powerSyncDb.execute('UPDATE tags SET name = ?, updated_at = ? WHERE id = ?', [
          name,
          ts,
          id,
        ]);
      }
      const rows = await powerSyncDb.getAll('SELECT * FROM tags WHERE id = ?', [id]);
      if (rows.length === 0) throw new Error('Etiqueta não encontrada');
      return mapTag(rows[0]);
    } catch (err) {
      logger.error('TagRepository', 'updateTag failed', err);
      throw new Error(
        `Erro ao actualizar etiqueta: ${err instanceof Error ? err.message : 'Erro'}`
      );
    }
  }

  async deleteTag(id: string): Promise<void> {
    try {
      await powerSyncDb.execute('DELETE FROM tags WHERE id = ?', [id]);
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
      active ? 1 : 0,
      ts,
      id,
    ]);
    const rows = await powerSyncDb.getAll('SELECT * FROM tags WHERE id = ?', [id]);
    return mapTag(rows[0]);
  }
}
