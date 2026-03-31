import { SupabaseClient } from '@supabase/supabase-js';
import { ICategoryRepository } from '../interfaces/category.repository.interface';
import { Category, CreateCategoryInput } from '../../types/packing.types';
import { logger } from '../../utils/logger';
import { uuid } from '../../utils/uuid';

function mapCategory(row: any): Category {
  return {
    id: row.id,
    name: row.name,
    iconId: row.icon_id,
    iconName: row.icon?.name ?? 'category',
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

export class SupabaseCategoryRepository implements ICategoryRepository {
  constructor(private readonly client: SupabaseClient) {}

  async getCategories(familyId: string): Promise<Category[]> {
    try {
      const { data, error } = await this.client
        .from('categories')
        .select('*, icon:icons!icon_id(name)')
        .eq('family_id', familyId)
        .order('sort_order')
        .order('name');
      if (error) throw error;
      return (data ?? []).map(mapCategory);
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
      // Get max sort_order for this family
      const { data: maxRows, error: maxErr } = await this.client
        .from('categories')
        .select('sort_order')
        .eq('family_id', input.familyId)
        .order('sort_order', { ascending: false })
        .limit(1);
      if (maxErr) throw maxErr;
      const nextOrder = (Number(maxRows?.[0]?.sort_order) || 0) + 1;

      const { data, error } = await this.client
        .from('categories')
        .insert({
          id,
          family_id: input.familyId,
          name: input.name,
          icon_id: input.iconId,
          active: true,
          sort_order: nextOrder,
          created_at: ts,
          updated_at: ts,
        })
        .select('*, icon:icons!icon_id(name)')
        .single();
      if (error) throw error;
      return mapCategory(data);
    } catch (err) {
      logger.error('CategoryRepository', 'createCategory failed', err);
      throw new Error(`Erro ao criar categoria: ${err instanceof Error ? err.message : 'Erro'}`);
    }
  }

  async updateCategory(
    id: string,
    data: Partial<Pick<Category, 'name' | 'iconId'>>
  ): Promise<Category> {
    const updates: Record<string, unknown> = { updated_at: now() };
    if (data.name !== undefined) updates.name = data.name;
    if (data.iconId !== undefined) updates.icon_id = data.iconId;

    try {
      const { data: row, error } = await this.client
        .from('categories')
        .update(updates)
        .eq('id', id)
        .select('*, icon:icons!icon_id(name)')
        .single();
      if (error) throw error;
      if (!row) throw new Error('Categoria não encontrada');
      return mapCategory(row);
    } catch (err) {
      logger.error('CategoryRepository', 'updateCategory failed', err);
      throw new Error(
        `Erro ao actualizar categoria: ${err instanceof Error ? err.message : 'Erro'}`
      );
    }
  }

  async deleteCategory(id: string): Promise<void> {
    try {
      // Get the category's sort_order and family_id before deleting
      const { data: rows, error: fetchErr } = await this.client
        .from('categories')
        .select('sort_order, family_id')
        .eq('id', id)
        .single();
      if (fetchErr) throw fetchErr;

      const { error: delErr } = await this.client
        .from('categories')
        .delete()
        .eq('id', id);
      if (delErr) throw delErr;

      if (rows) {
        // Shift sort_order down for categories that were after the deleted one
        const { data: toUpdate, error: listErr } = await this.client
          .from('categories')
          .select('id, sort_order')
          .eq('family_id', rows.family_id)
          .gt('sort_order', rows.sort_order);
        if (listErr) throw listErr;

        if (toUpdate && toUpdate.length > 0) {
          await this.client.from('categories').upsert(
            toUpdate.map((item) => ({ id: item.id, sort_order: item.sort_order - 1 }))
          );
        }
      }
    } catch (err) {
      logger.error('CategoryRepository', 'deleteCategory failed', err);
      throw new Error(`Erro ao eliminar categoria: ${err instanceof Error ? err.message : 'Erro'}`);
    }
  }

  async reorderCategory(id: string, newOrder: number): Promise<void> {
    const { data: rows, error: fetchErr } = await this.client
      .from('categories')
      .select('sort_order, family_id')
      .eq('id', id)
      .single();
    if (fetchErr || !rows) return;

    const oldOrder = rows.sort_order;
    if (oldOrder === newOrder) return;

    const ts = now();

    if (newOrder < oldOrder) {
      // Moving up: shift items in [newOrder, oldOrder) down by +1
      const { data: toUpdate } = await this.client
        .from('categories')
        .select('id, sort_order')
        .eq('family_id', rows.family_id)
        .gte('sort_order', newOrder)
        .lt('sort_order', oldOrder);

      if (toUpdate && toUpdate.length > 0) {
        await this.client.from('categories').upsert(
          toUpdate.map((item) => ({ id: item.id, sort_order: item.sort_order + 1, updated_at: ts }))
        );
      }
    } else {
      // Moving down: shift items in (oldOrder, newOrder] up by -1
      const { data: toUpdate } = await this.client
        .from('categories')
        .select('id, sort_order')
        .eq('family_id', rows.family_id)
        .gt('sort_order', oldOrder)
        .lte('sort_order', newOrder);

      if (toUpdate && toUpdate.length > 0) {
        await this.client.from('categories').upsert(
          toUpdate.map((item) => ({ id: item.id, sort_order: item.sort_order - 1, updated_at: ts }))
        );
      }
    }

    await this.client
      .from('categories')
      .update({ sort_order: newOrder, updated_at: ts })
      .eq('id', id);
  }

  async countItemsUsingCategory(categoryId: string): Promise<number> {
    const { count: packingCount, error: packErr } = await this.client
      .from('packing_items')
      .select('id', { count: 'exact', head: true })
      .eq('category_id', categoryId);

    const { count: templateCount, error: tmplErr } = await this.client
      .from('template_items')
      .select('id', { count: 'exact', head: true })
      .eq('category_id', categoryId);

    if (packErr) logger.error('CategoryRepository', 'countItemsUsingCategory packing_items failed', packErr);
    if (tmplErr) logger.error('CategoryRepository', 'countItemsUsingCategory template_items failed', tmplErr);

    return (packingCount ?? 0) + (templateCount ?? 0);
  }

  async setActive(id: string, active: boolean): Promise<Category> {
    const ts = now();
    const { data, error } = await this.client
      .from('categories')
      .update({ active, updated_at: ts })
      .eq('id', id)
      .select('*, icon:icons!icon_id(name)')
      .single();
    if (error) throw error;
    return mapCategory(data);
  }
}
