import {
  MealEntry,
  MealEntryDish,
  CreateMealEntryInput,
  UpdateMealEntryInput,
  CreateDishInput,
  MealPlanSlotConfig,
  MealSlot,
} from "../../types/meal-plan.types";

export interface IMealPlanRepository {
  getWeek(familyId: string, weekStart: string): Promise<MealEntry[]>;
  create(input: CreateMealEntryInput): Promise<MealEntry>;
  update(id: string, input: UpdateMealEntryInput): Promise<MealEntry>;
  delete(id: string): Promise<void>;
  skipSlot(
    familyId: string,
    weekStart: string,
    dayOfWeek: number,
    mealSlot: MealSlot,
  ): Promise<MealEntry>;
  getConfig(familyId: string): Promise<MealPlanSlotConfig[]>;
  upsertConfig(
    familyId: string,
    dayOfWeek: number,
    mealSlot: MealSlot,
    participants: string[],
    isSkip: boolean,
  ): Promise<MealPlanSlotConfig>;

  // Dish operations
  getDishesForEntries(
    entryIds: string[],
  ): Promise<Map<string, MealEntryDish[]>>;
  addDishes(
    mealEntryId: string,
    dishes: CreateDishInput[],
  ): Promise<MealEntryDish[]>;
  removeDish(dishId: string): Promise<void>;
  updateDishServings(dishId: string, servings: number): Promise<void>;
  getRecentDishes(
    familyId: string,
    beforeDate: string,
    daysBack: number,
  ): Promise<MealEntryDish[]>;
}
