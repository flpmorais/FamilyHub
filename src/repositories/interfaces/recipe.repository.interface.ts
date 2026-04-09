import type {
  Recipe,
  RecipeForList,
  RecipeType,
  RecipeWithDetails,
  CreateRecipeInput,
} from '../../types/recipe.types';

export interface RecipeListFilters {
  type?: RecipeType | null;
  categoryIds?: string[];
  tagIds?: string[];
  ingredientQuery?: string;
  maxTotalTime?: number | null;
  maxPrepTime?: number | null;
  maxCookTime?: number | null;
}

export interface IRecipeRepository {
  create(input: CreateRecipeInput): Promise<RecipeWithDetails>;
  getById(id: string): Promise<RecipeWithDetails | null>;
  getByFamilyId(familyId: string): Promise<Recipe[]>;
  getByFamilyIdForList(familyId: string): Promise<RecipeForList[]>;
  getListPaginated(
    familyId: string,
    limit: number,
    offset: number,
    filters: RecipeListFilters,
  ): Promise<RecipeForList[]>;
  getTypeCounts(familyId: string): Promise<Record<string, number>>;
  update(id: string, input: Partial<CreateRecipeInput>): Promise<RecipeWithDetails>;
  delete(id: string): Promise<void>;
}
