import { SupabaseClient } from '@supabase/supabase-js';
import { IRecipeImportRepository } from '../interfaces/recipe-import.repository.interface';
import type { ExtractedRecipe, RecipeType } from '../../types/recipe.types';
import { logger } from '../../utils/logger';

const VALID_TYPES: RecipeType[] = ['meal', 'main', 'side', 'soup', 'dessert', 'other'];

export class SupabaseRecipeImportRepository implements IRecipeImportRepository {
  constructor(private readonly client: SupabaseClient) {}

  async extractFromUrl(url: string): Promise<ExtractedRecipe> {
    try {
      const { data, error } = await this.client.functions.invoke('extract-recipe', {
        body: { url },
      });

      if (error) {
        logger.error('RecipeImportRepository', 'Edge Function error', error);
        throw new Error('Não foi possível extrair a receita. Verifique o URL e tente novamente.');
      }

      if (data?.error) {
        throw new Error(data.error === 'No recipe found'
          ? 'Não foi encontrada nenhuma receita neste URL.'
          : `Erro na extração: ${data.error}`);
      }

      const recipeType = VALID_TYPES.includes(data?.type) ? data.type : 'other';

      return {
        name: data?.name ?? '',
        type: recipeType,
        ingredients: Array.isArray(data?.ingredients)
          ? data.ingredients.map((i: any) => ({
              name: String(i?.name ?? ''),
              quantity: i?.quantity != null ? String(i.quantity) : null,
            }))
          : [],
        steps: Array.isArray(data?.steps)
          ? data.steps.map((s: any) => String(s ?? ''))
          : [],
        servings: typeof data?.servings === 'number' ? data.servings : null,
        prepTimeMinutes: typeof data?.prepTimeMinutes === 'number' ? data.prepTimeMinutes : null,
        cookTimeMinutes: typeof data?.cookTimeMinutes === 'number' ? data.cookTimeMinutes : null,
      };
    } catch (err) {
      if (err instanceof Error && err.message.startsWith('Não foi')) {
        throw err;
      }
      logger.error('RecipeImportRepository', 'extractFromUrl failed', err);
      throw new Error('Não foi possível extrair a receita. Verifique o URL e tente novamente.');
    }
  }

  async extractFromYoutube(videoId: string): Promise<ExtractedRecipe> {
    try {
      const { data, error } = await this.client.functions.invoke('extract-recipe-youtube', {
        body: { videoId },
      });

      if (error) {
        logger.error('RecipeImportRepository', 'YouTube Edge Function error', error);
        throw new Error('Não foi possível extrair a receita do YouTube. Tente novamente.');
      }

      if (data?.error) {
        const msg = String(data.error);
        if (msg.includes('No recipe found')) {
          throw new Error('Não foi encontrada nenhuma receita neste vídeo (transcrição e comentários verificados).');
        }
        throw new Error(`Erro na extração: ${msg}`);
      }

      const recipeType = VALID_TYPES.includes(data?.type) ? data.type : 'other';

      return {
        name: data?.name ?? '',
        type: recipeType,
        ingredients: Array.isArray(data?.ingredients)
          ? data.ingredients.map((i: any) => ({
              name: String(i?.name ?? ''),
              quantity: i?.quantity != null ? String(i.quantity) : null,
            }))
          : [],
        steps: Array.isArray(data?.steps)
          ? data.steps.map((s: any) => String(s ?? ''))
          : [],
        servings: typeof data?.servings === 'number' ? data.servings : null,
        prepTimeMinutes: typeof data?.prepTimeMinutes === 'number' ? data.prepTimeMinutes : null,
        cookTimeMinutes: typeof data?.cookTimeMinutes === 'number' ? data.cookTimeMinutes : null,
      };
    } catch (err) {
      if (err instanceof Error && (err.message.startsWith('Não foi') || err.message.startsWith('Erro na'))) {
        throw err;
      }
      logger.error('RecipeImportRepository', 'extractFromYoutube failed', err);
      throw new Error('Não foi possível extrair a receita do YouTube. Tente novamente.');
    }
  }

  async extractFromPhoto(imageBase64: string, mimeType: string): Promise<ExtractedRecipe> {
    try {
      const { data, error } = await this.client.functions.invoke('extract-recipe-photo', {
        body: { imageBase64, mimeType },
      });

      if (error) {
        logger.error('RecipeImportRepository', 'Photo Edge Function error', error);
        throw new Error('Não foi possível extrair a receita da foto. Tente com uma foto mais nítida.');
      }

      if (data?.error) {
        const msg = String(data.error);
        if (msg.includes('No recipe found')) {
          throw new Error('Não foi encontrada nenhuma receita nesta foto.');
        }
        throw new Error(`Erro na extração: ${msg}`);
      }

      const recipeType = VALID_TYPES.includes(data?.type) ? data.type : 'other';

      return {
        name: data?.name ?? '',
        type: recipeType,
        ingredients: Array.isArray(data?.ingredients)
          ? data.ingredients.map((i: any) => ({
              name: String(i?.name ?? ''),
              quantity: i?.quantity != null ? String(i.quantity) : null,
            }))
          : [],
        steps: Array.isArray(data?.steps)
          ? data.steps.map((s: any) => String(s ?? ''))
          : [],
        servings: typeof data?.servings === 'number' ? data.servings : null,
        prepTimeMinutes: typeof data?.prepTimeMinutes === 'number' ? data.prepTimeMinutes : null,
        cookTimeMinutes: typeof data?.cookTimeMinutes === 'number' ? data.cookTimeMinutes : null,
      };
    } catch (err) {
      if (err instanceof Error && (err.message.startsWith('Não foi') || err.message.startsWith('Erro na'))) {
        throw err;
      }
      logger.error('RecipeImportRepository', 'extractFromPhoto failed', err);
      throw new Error('Não foi possível extrair a receita da foto. Tente com uma foto mais nítida.');
    }
  }
}
