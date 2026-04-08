import type { RecipeType } from '../types/recipe.types';

export interface CategoryStyle {
  color: string;
  icon: string;
  label: string;
}

export const DISH_CATEGORY_STYLES: Record<RecipeType, CategoryStyle> = {
  soup:    { color: '#D32F2F', icon: 'bowl-mix',    label: 'Sopa' },
  meal:    { color: '#388E3C', icon: 'pot-steam',    label: 'Refeição' },
  main:    { color: '#1976D2', icon: 'food-steak',   label: 'Prato Principal' },
  side:    { color: '#F59300', icon: 'food-apple',   label: 'Acompanhamento' },
  dessert: { color: '#E91E63', icon: 'cupcake',      label: 'Sobremesa' },
  other:   { color: '#888888', icon: 'food',          label: 'Outro' },
};
