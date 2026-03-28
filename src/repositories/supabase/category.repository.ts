import { ICategoryRepository } from '../interfaces/category.repository.interface';
import { Category, CreateCategoryInput } from '../../types/packing.types';
import { powerSyncDb } from '../../utils/powersync.database';
import { logger } from '../../utils/logger';
import { uuid } from '../../utils/uuid';

function mapCategory(row: any): Category {
  return {
    id: row.id,
    name: row.name,
    icon: row.icon,
    active: row.active === 1 || row.active === true,
    isDefault: row.is_default === 1 || row.is_default === true,
    sortOrder: Number(row.sort_order) || 0,
    familyId: row.family_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function now(): string {
  return new Date().toISOString();
}

export class SupabaseCategoryRepository implements ICategoryRepository {
  async getCategories(familyId: string): Promise<Category[]> {
    try {
      const rows = await powerSyncDb.getAll(
        'SELECT * FROM categories WHERE family_id = ? ORDER BY sort_order, name',
        [familyId]
      );
      return rows.map(mapCategory);
    } catch (err) {
      logger.error('CategoryRepository', 'getCategories failed', err);
      throw new Error(
        `Erro ao carregar categorias: ${err instanceof Error ? err.message : 'Erro'}`
      );
    }
  }

  async createCategory(input: CreateCategoryInput): Promise<Category> {
    const id = uuid();
    const ts = now();
    try {
      const maxRows = await powerSyncDb.getAll(
        'SELECT MAX(sort_order) as max_order FROM categories WHERE family_id = ?',
        [input.familyId]
      );
      const nextOrder = (Number((maxRows[0] as any)?.max_order) || 0) + 1;
      await powerSyncDb.execute(
        'INSERT INTO categories (id, family_id, name, icon, active, is_default, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, 1, ?, ?, ?, ?)',
        [id, input.familyId, input.name, input.icon, input.isDefault ? 1 : 0, nextOrder, ts, ts]
      );
      const rows = await powerSyncDb.getAll('SELECT * FROM categories WHERE id = ?', [id]);
      return mapCategory(rows[0]);
    } catch (err) {
      logger.error('CategoryRepository', 'createCategory failed', err);
      throw new Error(`Erro ao criar categoria: ${err instanceof Error ? err.message : 'Erro'}`);
    }
  }

  async updateCategory(
    id: string,
    data: Partial<Pick<Category, 'name' | 'icon' | 'isDefault'>>
  ): Promise<Category> {
    const sets: string[] = [];
    const params: unknown[] = [];
    if (data.name !== undefined) {
      sets.push('name = ?');
      params.push(data.name);
    }
    if (data.icon !== undefined) {
      sets.push('icon = ?');
      params.push(data.icon);
    }
    if (data.isDefault !== undefined) {
      sets.push('is_default = ?');
      params.push(data.isDefault ? 1 : 0);
    }
    sets.push('updated_at = ?');
    params.push(now());
    params.push(id);

    try {
      await powerSyncDb.execute(`UPDATE categories SET ${sets.join(', ')} WHERE id = ?`, params);
      const rows = await powerSyncDb.getAll('SELECT * FROM categories WHERE id = ?', [id]);
      if (rows.length === 0) throw new Error('Categoria não encontrada');
      return mapCategory(rows[0]);
    } catch (err) {
      logger.error('CategoryRepository', 'updateCategory failed', err);
      throw new Error(
        `Erro ao actualizar categoria: ${err instanceof Error ? err.message : 'Erro'}`
      );
    }
  }

  async deleteCategory(id: string): Promise<void> {
    try {
      const rows = await powerSyncDb.getAll('SELECT sort_order, family_id FROM categories WHERE id = ?', [id]);
      await powerSyncDb.execute('DELETE FROM categories WHERE id = ?', [id]);
      if (rows.length > 0) {
        const { sort_order, family_id } = rows[0] as any;
        await powerSyncDb.execute(
          'UPDATE categories SET sort_order = sort_order - 1 WHERE family_id = ? AND sort_order > ?',
          [family_id, sort_order]
        );
      }
    } catch (err) {
      logger.error('CategoryRepository', 'deleteCategory failed', err);
      throw new Error(`Erro ao eliminar categoria: ${err instanceof Error ? err.message : 'Erro'}`);
    }
  }

  async reorderCategory(id: string, newOrder: number): Promise<void> {
    const rows = await powerSyncDb.getAll('SELECT sort_order, family_id FROM categories WHERE id = ?', [id]);
    if (rows.length === 0) return;
    const { sort_order: oldOrder, family_id } = rows[0] as any;
    if (oldOrder === newOrder) return;
    const ts = now();
    if (newOrder < oldOrder) {
      await powerSyncDb.execute(
        'UPDATE categories SET sort_order = sort_order + 1, updated_at = ? WHERE family_id = ? AND sort_order >= ? AND sort_order < ?',
        [ts, family_id, newOrder, oldOrder]
      );
    } else {
      await powerSyncDb.execute(
        'UPDATE categories SET sort_order = sort_order - 1, updated_at = ? WHERE family_id = ? AND sort_order > ? AND sort_order <= ?',
        [ts, family_id, oldOrder, newOrder]
      );
    }
    await powerSyncDb.execute('UPDATE categories SET sort_order = ?, updated_at = ? WHERE id = ?', [newOrder, ts, id]);
  }

  async countItemsUsingCategory(categoryId: string): Promise<number> {
    const packingRows = await powerSyncDb.getAll(
      'SELECT COUNT(*) as cnt FROM packing_items WHERE category_id = ?',
      [categoryId]
    );
    const templateRows = await powerSyncDb.getAll(
      'SELECT COUNT(*) as cnt FROM template_items WHERE category_id = ?',
      [categoryId]
    );
    return Number((packingRows[0] as any)?.cnt ?? 0) + Number((templateRows[0] as any)?.cnt ?? 0);
  }

  async setActive(id: string, active: boolean): Promise<Category> {
    const ts = now();
    await powerSyncDb.execute('UPDATE categories SET active = ?, updated_at = ? WHERE id = ?', [
      active ? 1 : 0,
      ts,
      id,
    ]);
    const rows = await powerSyncDb.getAll('SELECT * FROM categories WHERE id = ?', [id]);
    return mapCategory(rows[0]);
  }
}
