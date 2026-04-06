export type MealSlot = 'lunch' | 'dinner';
export type MealType = 'home_cooked' | 'eating_out' | 'takeaway' | 'leftovers';

export interface MealEntry {
  id: string;
  familyId: string;
  weekStart: string;
  dayOfWeek: number;
  mealSlot: MealSlot;
  name: string;
  mealType: MealType;
  linkedMealId: string | null;
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
  linkedMealId?: string;
  participants: string[];
}

export interface UpdateMealEntryInput {
  name?: string;
  mealType?: MealType;
  participants?: string[];
  linkedMealId?: string | null;
  isSlotOverridden?: boolean;
  isSlotSkipped?: boolean;
}

export interface MealPlanWeek {
  weekStart: string;
  entries: MealEntry[];
}

export interface MealEntryLinkedRecipe {
  id: string;
  mealEntryId: string;
  recipeId: string;
  recipeName: string;
  recipeType: string;
  servingsOverride: number;
  sortOrder: number;
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
