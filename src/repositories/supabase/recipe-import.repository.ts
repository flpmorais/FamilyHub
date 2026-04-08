import { SupabaseClient } from '@supabase/supabase-js';
import { IRecipeImportRepository, type LlmModel } from '../interfaces/recipe-import.repository.interface';
import type { ExtractedRecipe, RecipeType } from '../../types/recipe.types';
import { logger } from '../../utils/logger';

const VALID_TYPES: RecipeType[] = ['meal', 'main', 'side', 'soup', 'dessert', 'other'];

export class SupabaseRecipeImportRepository implements IRecipeImportRepository {
  constructor(private readonly client: SupabaseClient) {}

  async extractFromUrl(url: string, model?: LlmModel): Promise<ExtractedRecipe> {
    try {
      const { data, error } = await this.client.functions.invoke('extract-recipe', {
        body: { url, model },
      });

      logger.info('RecipeImportRepository', `invoke result: error=${error?.constructor?.name ?? 'none'}, data=${JSON.stringify(data)?.slice(0, 200)}`);

      if (error) {
        let detail = error instanceof Error ? error.message : JSON.stringify(error);
        // FunctionsHttpError has a context with the response
        if ('context' in error && (error as any).context?.body) {
          try {
            const body = await new Response((error as any).context.body).text();
            detail += ` | body: ${body.slice(0, 500)}`;
          } catch { /* ignore */ }
        }
        logger.error('RecipeImportRepository', `Edge Function error [${error?.constructor?.name}]: ${detail}`);
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

  async extractFromYoutube(videoId: string, model?: LlmModel): Promise<ExtractedRecipe> {
    try {
      const { data, error } = await this.client.functions.invoke('extract-recipe-youtube', {
        body: { videoId, model },
      });

      if (error) {
        let detail = error instanceof Error ? error.message : String(error);
        try {
          const ctx = (error as any).context;
          if (ctx) {
            detail += ` | status: ${ctx.status ?? 'unknown'}`;
            if (ctx.body) {
              const bodyText = typeof ctx.body === 'string' ? ctx.body : await new Response(ctx.body).text().catch(() => '');
              detail += ` | body: ${bodyText.slice(0, 500)}`;
            }
          }
        } catch { /* ignore */ }
        logger.error('RecipeImportRepository', `YouTube Edge Function error [${error?.constructor?.name}]: ${detail}`);

        // Surface the actual error from the function if available
        try {
          const ctx = (error as any).context;
          if (ctx?.body) {
            const bodyText = typeof ctx.body === 'string' ? ctx.body : await new Response(ctx.body).text().catch(() => '');
            const parsed = JSON.parse(bodyText);
            if (parsed?.error) {
              if (String(parsed.error).includes('API key not configured')) {
                throw new Error('YouTube API key não configurada. Contacte o administrador.');
              }
              if (String(parsed.error).includes('No recipe found')) {
                throw new Error('Não foi encontrada nenhuma receita neste vídeo.');
              }
              throw new Error(`Erro YouTube: ${parsed.error}`);
            }
          }
        } catch (parseErr) {
          if (parseErr instanceof Error && (parseErr.message.startsWith('Não foi') || parseErr.message.startsWith('YouTube') || parseErr.message.startsWith('Erro'))) {
            throw parseErr;
          }
        }
        throw new Error('Não foi possível extrair a receita do YouTube. Tente novamente.');
      }

      if (data?.error) {
        const msg = String(data.error);
        if (msg.includes('No recipe found')) {
          throw new Error('Não foi encontrada nenhuma receita neste vídeo.');
        }
        if (msg.includes('API key not configured')) {
          throw new Error('YouTube API key não configurada. Contacte o administrador.');
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

  async extractFromPhoto(imageBase64: string, mimeType: string, model?: LlmModel): Promise<ExtractedRecipe> {
    try {
      const { data, error } = await this.client.functions.invoke('extract-recipe-photo', {
        body: { imageBase64, mimeType, model },
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

  async extractFromText(text: string, model?: LlmModel): Promise<ExtractedRecipe> {
    try {
      const { data, error } = await this.client.functions.invoke('extract-recipe', {
        body: { text, model },
      });

      if (error) {
        logger.error('RecipeImportRepository', 'Text Edge Function error', error);
        throw new Error('Não foi possível extrair a receita do texto. Tente novamente.');
      }

      if (data?.error) {
        const msg = String(data.error);
        if (msg.includes('No recipe found')) {
          throw new Error('Não foi encontrada nenhuma receita no texto fornecido.');
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
      logger.error('RecipeImportRepository', 'extractFromText failed', err);
      throw new Error('Não foi possível extrair a receita do texto. Tente novamente.');
    }
  }
}
