import type { RecipeTag, CreateRecipeTagInput, UpdateRecipeTagInput } from '../../types/recipe.types';

export interface IRecipeTagRepository {
  getAll(familyId: string): Promise<RecipeTag[]>;
  create(input: CreateRecipeTagInput): Promise<RecipeTag>;
  edit(id: string, input: UpdateRecipeTagInput): Promise<RecipeTag>;
  delete(id: string): Promise<void>;
  countRecipesUsingTag(tagId: string): Promise<number>;
}
