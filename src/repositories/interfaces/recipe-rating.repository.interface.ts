import type {
  RecipeRatingWithProfile,
  RecipeRatingSummary,
} from "../../types/recipe.types";

export interface IRecipeRatingRepository {
  getRatingsForRecipe(recipeId: string): Promise<RecipeRatingWithProfile[]>;
  getSummary(recipeId: string): Promise<RecipeRatingSummary>;
  getSummariesForRecipes(
    recipeIds: string[],
  ): Promise<Map<string, RecipeRatingSummary>>;
  upsertRating(
    recipeId: string,
    profileId: string,
    rating: number,
  ): Promise<void>;
  deleteRating(recipeId: string, profileId: string): Promise<void>;
}
