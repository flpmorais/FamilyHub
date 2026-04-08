import type { RecipeType } from './recipe.types';

export type MealSlot = 'lunch' | 'dinner';
export type MealType = 'home_cooked' | 'eating_out' | 'takeaway';
export type DishType = 'recipe' | 'manual' | 'resto' | 'fridge';

export interface MealEntry {
  id: string;
  familyId: string;
  weekStart: string;
  dayOfWeek: number;
  mealSlot: MealSlot;
  name: string;
  mealType: MealType;
  participants: string[];
  isSlotOverridden: boolean;
  isSlotSkipped: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMealEntryInput {
  familyId: string;
  weekStart: string;
  dayOfWeek: number;
  mealSlot: MealSlot;
  name: string;
  mealType?: MealType;
  participants: string[];
}

export interface UpdateMealEntryInput {
  name?: string;
  mealType?: MealType;
  participants?: string[];
  isSlotOverridden?: boolean;
  isSlotSkipped?: boolean;
}

export interface MealPlanWeek {
  weekStart: string;
  entries: MealEntry[];
}

export interface MealEntryDish {
  id: string;
  mealEntryId: string;
  dishType: DishType;
  recipeId: string | null;
  recipeName: string | null;
  recipeCategory: RecipeType | null;
  manualName: string | null;
  manualCategory: RecipeType | null;
  sourceDishId: string | null;
  sourceDishName: string | null;
  sourceDishCategory: RecipeType | null;
  leftoverId: string | null;
  leftoverName: string | null;
  leftoverCategory: RecipeType | null;
  servingsOverride: number | null;
  sortOrder: number;
}

export interface CreateDishInput {
  dishType: DishType;
  recipeId?: string;
  manualName?: string;
  manualCategory?: RecipeType;
  sourceDishId?: string;
  leftoverId?: string;
  servingsOverride?: number;
  sortOrder?: number;
}

export interface MealPlanSlotConfig {
  id: string;
  familyId: string;
  dayOfWeek: number;
  mealSlot: MealSlot;
  participants: string[];
  isSkip: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Resolve the display name and category for any dish type */
export function getDishDisplay(d: MealEntryDish): { name: string; category: RecipeType } {
  switch (d.dishType) {
    case 'recipe':
      return { name: d.recipeName ?? '', category: d.recipeCategory ?? 'other' };
    case 'manual':
      return { name: d.manualName ?? '', category: d.manualCategory ?? 'other' };
    case 'resto':
      return { name: d.sourceDishName ?? '', category: d.sourceDishCategory ?? 'other' };
    case 'fridge':
      return { name: d.leftoverName ?? '', category: d.leftoverCategory ?? 'other' };
    default:
      return { name: '', category: 'other' };
  }
}
