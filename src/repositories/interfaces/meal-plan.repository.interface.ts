import { MealEntry, MealEntryLinkedRecipe, CreateMealEntryInput, UpdateMealEntryInput, MealPlanSlotConfig, MealSlot } from '../../types/meal-plan.types';

export interface IMealPlanRepository {
  getWeek(familyId: string, weekStart: string): Promise<MealEntry[]>;
  create(input: CreateMealEntryInput): Promise<MealEntry>;
  update(id: string, input: UpdateMealEntryInput): Promise<MealEntry>;
  delete(id: string): Promise<void>;
  skipSlot(familyId: string, weekStart: string, dayOfWeek: number, mealSlot: MealSlot): Promise<MealEntry>;
  getRecentLinkableMeals(familyId: string, currentWeekStart: string, weeksBack?: number): Promise<MealEntry[]>;
  getConfig(familyId: string): Promise<MealPlanSlotConfig[]>;
  upsertConfig(familyId: string, dayOfWeek: number, mealSlot: MealSlot, participants: string[], isSkip: boolean): Promise<MealPlanSlotConfig>;
  linkRecipe(mealEntryId: string, recipeId: string, servingsOverride: number): Promise<MealEntryLinkedRecipe>;
  unlinkRecipe(linkId: string): Promise<void>;
  updateLinkedServings(linkId: string, servings: number): Promise<void>;
  getLinkedRecipes(mealEntryId: string): Promise<MealEntryLinkedRecipe[]>;
}
