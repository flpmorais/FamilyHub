import type { RecipeType } from "../types/recipe.types";

export const RECIPE_TYPES: Record<RecipeType, string> = {
  appetizer: "Entradas",
  soup: "Sopa",
  meal: "Refeição",
  main: "Prato Principal",
  side: "Acompanhamento",
  dessert: "Sobremesa",
  other: "Outro",
};

// Stable display order for recipe type pickers / filters.
export const RECIPE_TYPE_ORDER: RecipeType[] = [
  "appetizer",
  "soup",
  "meal",
  "main",
  "side",
  "dessert",
  "other",
];

export const RECIPE_TYPE_LIST: { key: RecipeType; label: string }[] =
  RECIPE_TYPE_ORDER.map((key) => ({ key, label: RECIPE_TYPES[key] }));

export const DEFAULT_SERVINGS = 4;
