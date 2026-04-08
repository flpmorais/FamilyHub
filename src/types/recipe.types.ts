export type RecipeType = 'meal' | 'main' | 'side' | 'soup' | 'dessert' | 'other';
export type RecipeImportMethod = 'manual' | 'url' | 'youtube' | 'ocr' | 'text';

export interface Recipe {
  id: string;
  familyId: string;
  name: string;
  type: RecipeType;
  servings: number;
  prepTimeMinutes: number | null;
  cookTimeMinutes: number | null;
  cost: string | null;
  imageUrl: string | null;
  importMethod: RecipeImportMethod;
  sourceUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RecipeIngredient {
  id: string;
  recipeId: string;
  ingredientName: string;
  quantity: string | null;
  sortOrder: number;
}

export interface RecipeStep {
  id: string;
  recipeId: string;
  stepNumber: number;
  stepText: string;
}

export interface RecipeCategory {
  id: string;
  familyId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface RecipeTag {
  id: string;
  familyId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRecipeCategoryInput {
  familyId: string;
  name: string;
}

export interface CreateRecipeTagInput {
  familyId: string;
  name: string;
}

export interface UpdateRecipeCategoryInput {
  name?: string;
}

export interface UpdateRecipeTagInput {
  name?: string;
}

export interface RecipeWithDetails extends Recipe {
  ingredients: RecipeIngredient[];
  steps: RecipeStep[];
  categories: RecipeCategory[];
  tags: RecipeTag[];
}

export interface RecipeForList extends Recipe {
  ingredientNames: string[];
  categoryIds: string[];
  tagIds: string[];
  averageRating?: number | null;
  ratingCount?: number;
}

export interface ExtractedRecipe {
  name: string;
  type: RecipeType;
  ingredients: { name: string; quantity: string | null }[];
  steps: string[];
  servings: number | null;
  prepTimeMinutes: number | null;
  cookTimeMinutes: number | null;
}

export interface CreateRecipeInput {
  familyId: string;
  name: string;
  type: RecipeType;
  servings: number;
  prepTimeMinutes?: number;
  cookTimeMinutes?: number;
  cost?: string;
  imageUrl?: string;
  importMethod?: RecipeImportMethod;
  sourceUrl?: string;
  ingredients: { ingredientName: string; quantity?: string; sortOrder: number }[];
  steps: { stepNumber: number; stepText: string }[];
  categoryIds?: string[];
  tagIds?: string[];
}

export interface RecipeRating {
  id: string;
  recipeId: string;
  profileId: string;
  rating: number;
  createdAt: string;
  updatedAt: string;
}

export interface RecipeRatingWithProfile extends RecipeRating {
  profileName: string;
  profileAvatarUrl: string | null;
}

export interface RecipeRatingSummary {
  average: number | null;
  count: number;
}

export interface RecipeComment {
  id: string;
  recipeId: string;
  profileId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface RecipeCommentWithProfile extends RecipeComment {
  profileName: string;
  profileAvatarUrl: string | null;
}

export interface GeneratedShoppingItem {
  ingredientName: string;
  totalQuantity: string | null;
  checked: boolean;
}
