import type {
  RecipeCategory,
  CreateRecipeCategoryInput,
  UpdateRecipeCategoryInput,
} from "../../types/recipe.types";

export interface IRecipeCategoryRepository {
  getAll(familyId: string): Promise<RecipeCategory[]>;
  create(input: CreateRecipeCategoryInput): Promise<RecipeCategory>;
  edit(id: string, input: UpdateRecipeCategoryInput): Promise<RecipeCategory>;
  delete(id: string): Promise<void>;
  countRecipesUsingCategory(categoryId: string): Promise<number>;
}
