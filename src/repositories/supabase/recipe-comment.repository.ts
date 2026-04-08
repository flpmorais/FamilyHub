import { SupabaseClient } from '@supabase/supabase-js';
import type { IRecipeCommentRepository } from '../interfaces/recipe-comment.repository.interface';
import type { RecipeCommentWithProfile } from '../../types/recipe.types';

export class SupabaseRecipeCommentRepository implements IRecipeCommentRepository {
  constructor(private readonly client: SupabaseClient) {}

  async getByRecipeId(recipeId: string): Promise<RecipeCommentWithProfile[]> {
    const { data, error } = await this.client
      .from('recipe_comments')
      .select('id, recipe_id, profile_id, content, created_at, updated_at, profiles(display_name, avatar_url)')
      .eq('recipe_id', recipeId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    return (data ?? []).map((row: any) => ({
      id: row.id,
      recipeId: row.recipe_id,
      profileId: row.profile_id,
      content: row.content,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      profileName: row.profiles?.display_name ?? '',
      profileAvatarUrl: row.profiles?.avatar_url ?? null,
    }));
  }

  async create(recipeId: string, profileId: string, content: string): Promise<RecipeCommentWithProfile> {
    const { data, error } = await this.client
      .from('recipe_comments')
      .insert({ recipe_id: recipeId, profile_id: profileId, content })
      .select('id, recipe_id, profile_id, content, created_at, updated_at, profiles(display_name, avatar_url)')
      .single();

    if (error) throw error;

    const row = data as any;
    return {
      id: row.id,
      recipeId: row.recipe_id,
      profileId: row.profile_id,
      content: row.content,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      profileName: row.profiles?.display_name ?? '',
      profileAvatarUrl: row.profiles?.avatar_url ?? null,
    };
  }

  async update(commentId: string, content: string): Promise<void> {
    const { error } = await this.client
      .from('recipe_comments')
      .update({ content, updated_at: new Date().toISOString() })
      .eq('id', commentId);

    if (error) throw error;
  }

  async delete(commentId: string): Promise<void> {
    const { error } = await this.client
      .from('recipe_comments')
      .delete()
      .eq('id', commentId);

    if (error) throw error;
  }
}
