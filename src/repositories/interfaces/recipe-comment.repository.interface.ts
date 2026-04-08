import type { RecipeCommentWithProfile } from '../../types/recipe.types';

export interface IRecipeCommentRepository {
  getByRecipeId(recipeId: string): Promise<RecipeCommentWithProfile[]>;
  create(recipeId: string, profileId: string, content: string): Promise<RecipeCommentWithProfile>;
  update(commentId: string, content: string): Promise<void>;
  delete(commentId: string): Promise<void>;
}
