import type { ExtractedRecipe } from "../../types/recipe.types";

export type LlmModel = "haiku" | "sonnet";

export interface IRecipeImportRepository {
  extractFromUrl(url: string, model?: LlmModel): Promise<ExtractedRecipe>;
  extractFromYoutube(
    videoId: string,
    model?: LlmModel,
  ): Promise<ExtractedRecipe>;
  extractFromPhoto(
    imageBase64: string,
    mimeType: string,
    model?: LlmModel,
  ): Promise<ExtractedRecipe>;
  extractFromText(text: string, model?: LlmModel): Promise<ExtractedRecipe>;
}
