import type { Recipe, RecipeForList, RecipeWithDetails, CreateRecipeInput } from '../../types/recipe.types';

export interface IRecipeRepository {
  create(input: CreateRecipeInput): Promise<RecipeWithDetails>;
  getById(id: string): Promise<RecipeWithDetails | null>;
  getByFamilyId(familyId: string): Promise<Recipe[]>;
  getByFamilyIdForList(familyId: string): Promise<RecipeForList[]>;
  update(id: string, input: Partial<CreateRecipeInput>): Promise<RecipeWithDetails>;
  delete(id: string): Promise<void>;
}
