import { scaleQuantity } from "./recipe-scaling.service";
import type {
  RecipeWithDetails,
  GeneratedShoppingItem,
} from "../types/recipe.types";

const NUMERIC_REGEX = /^(\d+\.?\d*)\s*/;

interface RecipeLink {
  recipeId: string;
  servingsOverride: number;
}

/**
 * Generate a consolidated shopping list from linked recipes across a week's meal plan.
 * Scales each recipe's ingredients by its servingsOverride, then aggregates by ingredient name.
 */
export function generateShoppingList(
  linkedRecipes: RecipeLink[],
  recipeDetails: Map<string, RecipeWithDetails>,
): GeneratedShoppingItem[] {
  // Collect all scaled ingredients
  const ingredientMap = new Map<string, string[]>(); // lowercase name → scaled quantities

  for (const link of linkedRecipes) {
    const recipe = recipeDetails.get(link.recipeId);
    if (!recipe) continue;

    for (const ing of recipe.ingredients) {
      const scaled = scaleQuantity(
        ing.quantity,
        recipe.servings,
        link.servingsOverride,
      );
      const key = ing.ingredientName.toLowerCase().trim();

      const existing = ingredientMap.get(key) ?? [];
      existing.push(scaled ?? "");
      ingredientMap.set(key, existing);
    }
  }

  // Aggregate quantities per ingredient
  const result: GeneratedShoppingItem[] = [];

  for (const [key, quantities] of ingredientMap) {
    // Use original casing from first occurrence
    const originalName = findOriginalName(linkedRecipes, recipeDetails, key);
    const totalQuantity = sumQuantities(quantities);

    result.push({
      ingredientName: originalName,
      totalQuantity: totalQuantity || null,
      checked: false,
    });
  }

  // Sort alphabetically
  result.sort((a, b) => a.ingredientName.localeCompare(b.ingredientName, "pt"));

  return result;
}

function findOriginalName(
  linkedRecipes: RecipeLink[],
  recipeDetails: Map<string, RecipeWithDetails>,
  lowerKey: string,
): string {
  for (const link of linkedRecipes) {
    const recipe = recipeDetails.get(link.recipeId);
    if (!recipe) continue;
    for (const ing of recipe.ingredients) {
      if (ing.ingredientName.toLowerCase().trim() === lowerKey) {
        return ing.ingredientName;
      }
    }
  }
  return lowerKey;
}

function sumQuantities(quantities: string[]): string {
  const nonEmpty = quantities.filter(Boolean);
  if (nonEmpty.length === 0) return "";
  if (nonEmpty.length === 1) return nonEmpty[0];

  // Try to sum numerically
  const parsed = nonEmpty.map((q) => {
    const match = q.match(NUMERIC_REGEX);
    if (!match) return { numeric: null, suffix: q };
    return {
      numeric: parseFloat(match[1]),
      suffix: q.slice(match[0].length).trim(),
    };
  });

  // Check if all have numeric portions
  const allNumeric = parsed.every((p) => p.numeric !== null);
  if (!allNumeric) {
    // Deduplicate non-numeric
    const unique = [...new Set(nonEmpty)];
    return unique.join(" + ");
  }

  // Check if all have the same suffix
  const suffixes = [...new Set(parsed.map((p) => p.suffix))];
  if (suffixes.length === 1) {
    // Same unit — sum the numbers
    const total = parsed.reduce((sum, p) => sum + (p.numeric ?? 0), 0);
    const rounded = Math.round(total * 10) / 10;
    const display =
      rounded % 1 === 0 ? String(Math.round(rounded)) : String(rounded);
    const suffix = suffixes[0];
    return suffix
      ? `${display}${suffix.startsWith(" ") ? "" : " "}${suffix}`.trim()
      : display;
  }

  // Mixed units — concatenate
  return nonEmpty.join(" + ");
}
