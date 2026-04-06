import type { ExtractedRecipe } from '../../types/recipe.types';

export interface IRecipeImportRepository {
  extractFromUrl(url: string): Promise<ExtractedRecipe>;
  extractFromYoutube(videoId: string): Promise<ExtractedRecipe>;
  extractFromPhoto(imageBase64: string, mimeType: string): Promise<ExtractedRecipe>;
}
