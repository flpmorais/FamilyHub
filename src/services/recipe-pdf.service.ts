import * as Print from 'expo-print';
import { buildRecipePdfHtml } from '../constants/recipe-pdf-template';
import type { RecipeWithDetails } from '../types/recipe.types';

/**
 * Generate a PDF file from a recipe and return the local file URI.
 * Runs entirely on-device — no network call.
 */
export async function generateRecipePdf(recipe: RecipeWithDetails): Promise<string> {
  const html = buildRecipePdfHtml(recipe);
  const { uri } = await Print.printToFileAsync({ html });
  return uri;
}
