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
        'SELECT * FROM categories WHERE family_id = ? ORDER BY name',
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
      await powerSyncDb.execute(
        'INSERT INTO categories (id, family_id, name, icon, active, created_at, updated_at) VALUES (?, ?, ?, ?, 1, ?, ?)',
        [id, input.familyId, input.name, input.icon, ts, ts]
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
    data: Partial<Pick<Category, 'name' | 'icon'>>
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
      await powerSyncDb.execute('DELETE FROM categories WHERE id = ?', [id]);
    } catch (err) {
      logger.error('CategoryRepository', 'deleteCategory failed', err);
      throw new Error(`Erro ao eliminar categoria: ${err instanceof Error ? err.message : 'Erro'}`);
    }
  }

  async countItemsUsingCategory(categoryId: string): Promise<number> {
    const rows = await powerSyncDb.getAll(
      'SELECT COUNT(*) as cnt FROM packing_items WHERE category_id = ?',
      [categoryId]
    );
    return Number((rows[0] as any)?.cnt ?? 0);
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
