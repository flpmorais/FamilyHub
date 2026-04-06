import { SupabaseClient } from '@supabase/supabase-js';
import { IRecipeCategoryRepository } from '../interfaces/recipe-category.repository.interface';
import type { RecipeCategory, CreateRecipeCategoryInput, UpdateRecipeCategoryInput } from '../../types/recipe.types';
import { logger } from '../../utils/logger';
import { uuid } from '../../utils/uuid';

function mapRecipeCategory(row: any): RecipeCategory {
  return {
    id: row.id,
    familyId: row.family_id,
    name: row.name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function now(): string {
  return new Date().toISOString();
}

export class SupabaseRecipeCategoryRepository implements IRecipeCategoryRepository {
  constructor(private readonly client: SupabaseClient) {}

  async getAll(familyId: string): Promise<RecipeCategory[]> {
    try {
      const { data, error } = await this.client
        .from('recipe_categories')
        .select('*')
        .eq('family_id', familyId)
        .order('name', { ascending: true });

      if (error) throw error;
      return (data ?? []).map(mapRecipeCategory);
    } catch (err) {
      logger.error('RecipeCategoryRepository', 'getAll failed', err);
      throw new Error(
        `Não foi possível carregar as categorias: ${err instanceof Error ? err.message : 'Erro'}`,
      );
    }
  }

  async create(input: CreateRecipeCategoryInput): Promise<RecipeCategory> {
    const id = uuid();
    const ts = now();

    try {
      const { data, error } = await this.client
        .from('recipe_categories')
        .insert({
          id,
          family_id: input.familyId,
          name: input.name,
          created_at: ts,
          updated_at: ts,
        })
        .select()
        .single();

      if (error) throw error;
      return mapRecipeCategory(data);
    } catch (err) {
      logger.error('RecipeCategoryRepository', 'create failed', err);
      throw new Error(
        `Não foi possível criar a categoria: ${err instanceof Error ? err.message : 'Erro'}`,
      );
    }
  }

  async edit(id: string, input: UpdateRecipeCategoryInput): Promise<RecipeCategory> {
    const updates: Record<string, unknown> = {};
    if (input.name !== undefined) updates.name = input.name;
    updates.updated_at = now();

    try {
      const { data, error } = await this.client
        .from('recipe_categories')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return mapRecipeCategory(data);
    } catch (err) {
      logger.error('RecipeCategoryRepository', 'edit failed', err);
      throw new Error(
        `Não foi possível editar a categoria: ${err instanceof Error ? err.message : 'Erro'}`,
      );
    }
  }

  async delete(id: string): Promise<void> {
    try {
      const { error } = await this.client
        .from('recipe_categories')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (err) {
      logger.error('RecipeCategoryRepository', 'delete failed', err);
      throw new Error(
        `Não foi possível eliminar a categoria: ${err instanceof Error ? err.message : 'Erro'}`,
      );
    }
  }

  async countRecipesUsingCategory(categoryId: string): Promise<number> {
    const { count, error } = await this.client
      .from('recipe_category_assignments')
      .select('*', { count: 'exact', head: true })
      .eq('category_id', categoryId);
    if (error) throw error;
    return count ?? 0;
  }
}
