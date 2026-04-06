import { SupabaseClient } from '@supabase/supabase-js';
import { IRecipeRepository } from '../interfaces/recipe.repository.interface';
import type {
  Recipe,
  RecipeForList,
  RecipeCategory,
  RecipeTag,
  RecipeIngredient,
  RecipeStep,
  RecipeWithDetails,
  CreateRecipeInput,
} from '../../types/recipe.types';
import { logger } from '../../utils/logger';

function mapRecipe(row: any): Recipe {
  return {
    id: row.id,
    familyId: row.family_id,
    name: row.name,
    type: row.type,
    servings: row.servings,
    prepTimeMinutes: row.prep_time_minutes ?? null,
    cookTimeMinutes: row.cook_time_minutes ?? null,
    cost: row.cost ?? null,
    imageUrl: row.image_url ?? null,
    importMethod: row.import_method,
    sourceUrl: row.source_url ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapIngredient(row: any): RecipeIngredient {
  return {
    id: row.id,
    recipeId: row.recipe_id,
    ingredientName: row.ingredient_name,
    quantity: row.quantity ?? null,
    sortOrder: row.sort_order,
  };
}

function mapStep(row: any): RecipeStep {
  return {
    id: row.id,
    recipeId: row.recipe_id,
    stepNumber: row.step_number,
    stepText: row.step_text,
  };
}

function mapCategory(row: any): RecipeCategory {
  return {
    id: row.id,
    familyId: row.family_id,
    name: row.name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapTag(row: any): RecipeTag {
  return {
    id: row.id,
    familyId: row.family_id,
    name: row.name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class SupabaseRecipeRepository implements IRecipeRepository {
  constructor(private readonly client: SupabaseClient) {}

  async create(input: CreateRecipeInput): Promise<RecipeWithDetails> {
    try {
      // 1. Insert recipe
      const { data: recipeRow, error } = await this.client
        .from('recipes')
        .insert({
          family_id: input.familyId,
          name: input.name,
          type: input.type,
          servings: input.servings,
          prep_time_minutes: input.prepTimeMinutes ?? null,
          cook_time_minutes: input.cookTimeMinutes ?? null,
          cost: input.cost ?? null,
          image_url: input.imageUrl ?? null,
          import_method: input.importMethod ?? 'manual',
          source_url: input.sourceUrl ?? null,
        })
        .select()
        .single();

      if (error) throw error;

      // 2. Insert ingredients
      const ingredientRows = input.ingredients.map((ing) => ({
        recipe_id: recipeRow.id,
        ingredient_name: ing.ingredientName,
        quantity: ing.quantity ?? null,
        sort_order: ing.sortOrder,
      }));

      const { data: ingredients, error: ingError } = await this.client
        .from('recipe_ingredients')
        .insert(ingredientRows)
        .select();

      if (ingError) throw ingError;

      // 3. Insert steps
      const stepRows = input.steps.map((step) => ({
        recipe_id: recipeRow.id,
        step_number: step.stepNumber,
        step_text: step.stepText,
      }));

      const { data: steps, error: stepError } = await this.client
        .from('recipe_steps')
        .insert(stepRows)
        .select();

      if (stepError) throw stepError;

      // 4. Insert category assignments
      if (input.categoryIds && input.categoryIds.length > 0) {
        const catRows = input.categoryIds.map((catId) => ({
          recipe_id: recipeRow.id,
          category_id: catId,
        }));
        const { error: catError } = await this.client
          .from('recipe_category_assignments')
          .insert(catRows);
        if (catError) throw catError;
      }

      // 5. Insert tag assignments
      if (input.tagIds && input.tagIds.length > 0) {
        const tagRows = input.tagIds.map((tagId) => ({
          recipe_id: recipeRow.id,
          tag_id: tagId,
        }));
        const { error: tagError } = await this.client
          .from('recipe_tag_assignments')
          .insert(tagRows);
        if (tagError) throw tagError;
      }

      return {
        ...mapRecipe(recipeRow),
        ingredients: (ingredients ?? []).map(mapIngredient),
        steps: (steps ?? []).map(mapStep),
        categories: [],
        tags: [],
      };
    } catch (err) {
      logger.error('RecipeRepository', 'create failed', err);
      throw new Error(
        `Não foi possível criar a receita: ${err instanceof Error ? err.message : 'Erro'}`,
      );
    }
  }

  async getById(id: string): Promise<RecipeWithDetails | null> {
    try {
      const { data: recipeRow, error } = await this.client
        .from('recipes')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      if (!recipeRow) return null;

      const [ingredientsResult, stepsResult, catResult, tagResult] = await Promise.all([
        this.client
          .from('recipe_ingredients')
          .select('*')
          .eq('recipe_id', id)
          .order('sort_order', { ascending: true }),
        this.client
          .from('recipe_steps')
          .select('*')
          .eq('recipe_id', id)
          .order('step_number', { ascending: true }),
        this.client
          .from('recipe_category_assignments')
          .select('category_id, recipe_categories(id, family_id, name, created_at, updated_at)')
          .eq('recipe_id', id),
        this.client
          .from('recipe_tag_assignments')
          .select('tag_id, recipe_tags(id, family_id, name, created_at, updated_at)')
          .eq('recipe_id', id),
      ]);

      if (ingredientsResult.error) throw ingredientsResult.error;
      if (stepsResult.error) throw stepsResult.error;
      if (catResult.error) throw catResult.error;
      if (tagResult.error) throw tagResult.error;

      return {
        ...mapRecipe(recipeRow),
        ingredients: (ingredientsResult.data ?? []).map(mapIngredient),
        steps: (stepsResult.data ?? []).map(mapStep),
        categories: (catResult.data ?? []).map((row: any) => mapCategory(row.recipe_categories)),
        tags: (tagResult.data ?? []).map((row: any) => mapTag(row.recipe_tags)),
      };
    } catch (err) {
      logger.error('RecipeRepository', 'getById failed', err);
      throw new Error(
        `Não foi possível carregar a receita: ${err instanceof Error ? err.message : 'Erro'}`,
      );
    }
  }

  async getByFamilyId(familyId: string): Promise<Recipe[]> {
    try {
      const { data, error } = await this.client
        .from('recipes')
        .select('*')
        .eq('family_id', familyId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data ?? []).map(mapRecipe);
    } catch (err) {
      logger.error('RecipeRepository', 'getByFamilyId failed', err);
      throw new Error(
        `Não foi possível carregar as receitas: ${err instanceof Error ? err.message : 'Erro'}`,
      );
    }
  }

  async getByFamilyIdForList(familyId: string): Promise<RecipeForList[]> {
    try {
      const { data: recipeRows, error } = await this.client
        .from('recipes')
        .select('*')
        .eq('family_id', familyId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      const recipes = (recipeRows ?? []).map(mapRecipe);
      if (recipes.length === 0) return [];

      const recipeIds = recipes.map((r) => r.id);

      // Batch load ingredient names, category assignments, and tag assignments
      const [ingredientsResult, catAssignments, tagAssignments] = await Promise.all([
        this.client
          .from('recipe_ingredients')
          .select('recipe_id, ingredient_name')
          .in('recipe_id', recipeIds),
        this.client
          .from('recipe_category_assignments')
          .select('recipe_id, category_id')
          .in('recipe_id', recipeIds),
        this.client
          .from('recipe_tag_assignments')
          .select('recipe_id, tag_id')
          .in('recipe_id', recipeIds),
      ]);

      // Group by recipe_id
      const ingredientMap = new Map<string, string[]>();
      for (const row of ingredientsResult.data ?? []) {
        const list = ingredientMap.get(row.recipe_id) ?? [];
        list.push(row.ingredient_name);
        ingredientMap.set(row.recipe_id, list);
      }

      const categoryMap = new Map<string, string[]>();
      for (const row of catAssignments.data ?? []) {
        const list = categoryMap.get(row.recipe_id) ?? [];
        list.push(row.category_id);
        categoryMap.set(row.recipe_id, list);
      }

      const tagMap = new Map<string, string[]>();
      for (const row of tagAssignments.data ?? []) {
        const list = tagMap.get(row.recipe_id) ?? [];
        list.push(row.tag_id);
        tagMap.set(row.recipe_id, list);
      }

      return recipes.map((recipe) => ({
        ...recipe,
        ingredientNames: ingredientMap.get(recipe.id) ?? [],
        categoryIds: categoryMap.get(recipe.id) ?? [],
        tagIds: tagMap.get(recipe.id) ?? [],
      }));
    } catch (err) {
      logger.error('RecipeRepository', 'getByFamilyIdForList failed', err);
      throw new Error(
        `Não foi possível carregar as receitas: ${err instanceof Error ? err.message : 'Erro'}`,
      );
    }
  }

  async update(id: string, input: Partial<CreateRecipeInput>): Promise<RecipeWithDetails> {
    try {
      const updates: Record<string, unknown> = {};
      if (input.name !== undefined) updates.name = input.name;
      if (input.type !== undefined) updates.type = input.type;
      if (input.servings !== undefined) updates.servings = input.servings;
      if (input.prepTimeMinutes !== undefined) updates.prep_time_minutes = input.prepTimeMinutes;
      if (input.cookTimeMinutes !== undefined) updates.cook_time_minutes = input.cookTimeMinutes;
      if (input.cost !== undefined) updates.cost = input.cost;
      if (input.imageUrl !== undefined) updates.image_url = input.imageUrl;

      if (Object.keys(updates).length > 0) {
        const { error } = await this.client
          .from('recipes')
          .update(updates)
          .eq('id', id);
        if (error) throw error;
      }

      // Replace ingredients if provided
      if (input.ingredients) {
        await this.client.from('recipe_ingredients').delete().eq('recipe_id', id);
        const ingredientRows = input.ingredients.map((ing) => ({
          recipe_id: id,
          ingredient_name: ing.ingredientName,
          quantity: ing.quantity ?? null,
          sort_order: ing.sortOrder,
        }));
        const { error: ingError } = await this.client
          .from('recipe_ingredients')
          .insert(ingredientRows);
        if (ingError) throw ingError;
      }

      // Replace steps if provided
      if (input.steps) {
        await this.client.from('recipe_steps').delete().eq('recipe_id', id);
        const stepRows = input.steps.map((step) => ({
          recipe_id: id,
          step_number: step.stepNumber,
          step_text: step.stepText,
        }));
        const { error: stepError } = await this.client
          .from('recipe_steps')
          .insert(stepRows);
        if (stepError) throw stepError;
      }

      // Replace category assignments if provided
      if (input.categoryIds) {
        await this.client.from('recipe_category_assignments').delete().eq('recipe_id', id);
        if (input.categoryIds.length > 0) {
          const catRows = input.categoryIds.map((catId) => ({
            recipe_id: id,
            category_id: catId,
          }));
          const { error: catError } = await this.client
            .from('recipe_category_assignments')
            .insert(catRows);
          if (catError) throw catError;
        }
      }

      // Replace tag assignments if provided
      if (input.tagIds) {
        await this.client.from('recipe_tag_assignments').delete().eq('recipe_id', id);
        if (input.tagIds.length > 0) {
          const tagRows = input.tagIds.map((tagId) => ({
            recipe_id: id,
            tag_id: tagId,
          }));
          const { error: tagError } = await this.client
            .from('recipe_tag_assignments')
            .insert(tagRows);
          if (tagError) throw tagError;
        }
      }

      const result = await this.getById(id);
      if (!result) throw new Error('Receita não encontrada após atualização');
      return result;
    } catch (err) {
      logger.error('RecipeRepository', 'update failed', err);
      throw new Error(
        `Não foi possível atualizar a receita: ${err instanceof Error ? err.message : 'Erro'}`,
      );
    }
  }

  async delete(id: string): Promise<void> {
    try {
      const { error } = await this.client
        .from('recipes')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (err) {
      logger.error('RecipeRepository', 'delete failed', err);
      throw new Error(
        `Não foi possível eliminar a receita: ${err instanceof Error ? err.message : 'Erro'}`,
      );
    }
  }
}
