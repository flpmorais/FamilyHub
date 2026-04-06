import { RECIPE_TYPES } from './recipe-defaults';
import type { RecipeWithDetails } from '../types/recipe.types';

export function buildRecipePdfHtml(recipe: RecipeWithDetails): string {
  const ingredients = recipe.ingredients
    .map(
      (ing) =>
        `<tr><td>${escapeHtml(ing.ingredientName)}</td><td class="qty">${escapeHtml(ing.quantity ?? '')}</td></tr>`,
    )
    .join('');

  const steps = recipe.steps
    .map((step) => `<li>${escapeHtml(step.stepText)}</li>`)
    .join('');

  const metaParts = [
    recipe.servings ? `${recipe.servings} porções` : null,
    recipe.prepTimeMinutes ? `Prep: ${recipe.prepTimeMinutes} min` : null,
    recipe.cookTimeMinutes ? `Cozinhar: ${recipe.cookTimeMinutes} min` : null,
    recipe.prepTimeMinutes && recipe.cookTimeMinutes
      ? `Total: ${recipe.prepTimeMinutes + recipe.cookTimeMinutes} min`
      : null,
    recipe.cost ? `Custo: ${recipe.cost}` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  const typeLabel = RECIPE_TYPES[recipe.type] ?? recipe.type;

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, 'Segoe UI', Roboto, sans-serif; margin: 40px; color: #1A1A1A; line-height: 1.5; }
  h1 { font-size: 26px; color: #B5451B; margin-bottom: 6px; }
  .type-badge { display: inline-block; background: #B5451B; color: #FFFFFF; padding: 3px 12px; border-radius: 12px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
  .meta { color: #888888; font-size: 13px; margin: 12px 0 24px; }
  h2 { font-size: 16px; color: #1A1A1A; margin: 24px 0 10px; padding-bottom: 4px; border-bottom: 2px solid #B5451B; }
  table { width: 100%; border-collapse: collapse; }
  td { padding: 8px 4px; border-bottom: 1px solid #F0F0F0; font-size: 14px; }
  td.qty { text-align: right; color: #888888; white-space: nowrap; }
  ol { padding-left: 24px; }
  li { margin-bottom: 10px; font-size: 14px; line-height: 1.6; }
  .footer { margin-top: 40px; text-align: center; color: #CCCCCC; font-size: 10px; border-top: 1px solid #F0F0F0; padding-top: 12px; }
</style>
</head>
<body>
  <h1>${escapeHtml(recipe.name)}</h1>
  <span class="type-badge">${escapeHtml(typeLabel)}</span>
  <p class="meta">${escapeHtml(metaParts)}</p>

  <h2>Ingredientes</h2>
  <table>${ingredients}</table>

  <h2>Preparação</h2>
  <ol>${steps}</ol>

  <p class="footer">Gerado pelo FamilyHub</p>
</body>
</html>`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
