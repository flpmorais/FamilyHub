import type { RecipeType } from "../types/recipe.types";

export interface CategoryStyle {
  color: string;
  icon: string;
  label: string;
}

/**
 * Fallback dish-type styling used only when the family-scoped `dish_types`
 * lookup is unavailable (offline / first load). Source of truth at runtime
 * is the `dish_types` table loaded via `useDishTypes()`.
 */
export const FALLBACK_DISH_CATEGORY_STYLES: Record<RecipeType, CategoryStyle> =
  {
    appetizer: {
      color: "#00ACC1",
      icon: "bowl-mix-outline",
      label: "Entradas",
    },
    soup: { color: "#D32F2F", icon: "bowl-mix", label: "Sopa" },
    meal: { color: "#388E3C", icon: "pot-steam", label: "Refeição" },
    main: { color: "#1976D2", icon: "food-steak", label: "Prato Principal" },
    side: { color: "#F59300", icon: "food-apple", label: "Acompanhamento" },
    dessert: { color: "#E91E63", icon: "cupcake", label: "Sobremesa" },
    other: { color: "#888888", icon: "food", label: "Outro" },
  };

/**
 * @deprecated Use `FALLBACK_DISH_CATEGORY_STYLES` for fallbacks, or read from
 * the `dish_types` table at runtime via `useDishTypes()`.
 */
export const DISH_CATEGORY_STYLES = FALLBACK_DISH_CATEGORY_STYLES;
