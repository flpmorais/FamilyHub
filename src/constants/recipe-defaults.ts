import type { RecipeType } from '../types/recipe.types';

export const RECIPE_TYPES: Record<RecipeType, string> = {
  meal: 'Refeição',
  main: 'Prato Principal',
  side: 'Acompanhamento',
  soup: 'Sopa',
  dessert: 'Sobremesa',
  other: 'Outro',
};

export const RECIPE_TYPE_LIST: { key: RecipeType; label: string }[] = Object.entries(
  RECIPE_TYPES,
).map(([key, label]) => ({ key: key as RecipeType, label }));

export const DEFAULT_SERVINGS = 4;
