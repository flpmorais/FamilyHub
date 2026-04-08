import { SupabaseClient } from '@supabase/supabase-js';
import { IMealPlanRepository } from '../interfaces/meal-plan.repository.interface';
import { MealEntry, MealEntryDish, MealSlot, MealType, CreateMealEntryInput, UpdateMealEntryInput, CreateDishInput, MealPlanSlotConfig } from '../../types/meal-plan.types';
import type { RecipeType } from '../../types/recipe.types';
import { logger } from '../../utils/logger';
import { uuid } from '../../utils/uuid';

function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function formatDateToString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function mapMealEntry(row: any): MealEntry {
  return {
    id: row.id,
    familyId: row.family_id,
    weekStart: row.week_start,
    dayOfWeek: Number(row.day_of_week),
    mealSlot: row.meal_slot as MealSlot,
    name: row.name,
    mealType: row.meal_type as MealType,
    participants: row.participants ?? [],
    isSlotOverridden: Boolean(row.is_slot_overridden),
    isSlotSkipped: Boolean(row.is_slot_skipped),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapDish(row: any): MealEntryDish {
  const recipes = row.recipes;
  const leftovers = row.leftovers;
  // source_dish is resolved via a second pass or self-join
  const sourceDish = row.source_dish;

  return {
    id: row.id,
    mealEntryId: row.meal_entry_id,
    dishType: row.dish_type,
    recipeId: row.recipe_id ?? null,
    recipeName: recipes?.name ?? null,
    recipeCategory: (recipes?.type as RecipeType) ?? null,
    manualName: row.manual_name ?? null,
    manualCategory: (row.manual_category as RecipeType) ?? null,
    sourceDishId: row.source_dish_id ?? null,
    sourceDishName: sourceDish?.manual_name ?? sourceDish?.recipes?.name ?? null,
    sourceDishCategory: sourceDish?.manual_category ?? sourceDish?.recipes?.type ?? null,
    leftoverId: row.leftover_id ?? null,
    leftoverName: leftovers?.name ?? null,
    leftoverCategory: (leftovers?.type as RecipeType) ?? null,
    servingsOverride: row.servings_override ?? null,
    sortOrder: row.sort_order ?? 0,
  };
}

function mapSlotConfig(row: any): MealPlanSlotConfig {
  return {
    id: row.id,
    familyId: row.family_id,
    dayOfWeek: Number(row.day_of_week),
    mealSlot: row.meal_slot as MealSlot,
    participants: row.participants ?? [],
    isSkip: Boolean(row.is_skip),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const DISH_SELECT = `
  id, meal_entry_id, dish_type,
  recipe_id, manual_name, manual_category,
  source_dish_id, leftover_id,
  servings_override, sort_order, created_at, updated_at,
  recipes:recipe_id(name, type),
  leftovers:leftover_id(name, type),
  source_dish:source_dish_id(manual_name, manual_category, recipes:recipe_id(name, type))
`;

export class SupabaseMealPlanRepository implements IMealPlanRepository {
  constructor(private readonly client: SupabaseClient) {}

  async getWeek(familyId: string, weekStart: string): Promise<MealEntry[]> {
    const { data, error } = await this.client
      .from('meal_entries')
      .select('*')
      .eq('family_id', familyId)
      .eq('week_start', weekStart)
      .order('day_of_week', { ascending: true })
      .order('meal_slot', { ascending: true });

    if (error) {
      logger.error('MealPlanRepository', 'Erro ao carregar plano de refeições', error);
      throw error;
    }

    return (data ?? []).map(mapMealEntry);
  }

  async create(input: CreateMealEntryInput): Promise<MealEntry> {
    const id = uuid();
    const ts = new Date().toISOString();

    const { data, error } = await this.client
      .from('meal_entries')
      .insert({
        id,
        family_id: input.familyId,
        week_start: input.weekStart,
        day_of_week: input.dayOfWeek,
        meal_slot: input.mealSlot,
        name: input.name,
        meal_type: input.mealType ?? 'home_cooked',
        participants: input.participants,
        created_at: ts,
        updated_at: ts,
      })
      .select()
      .single();

    if (error) {
      logger.error('MealPlanRepository', 'Erro ao criar refeição', error);
      throw error;
    }

    return mapMealEntry(data);
  }

  async update(id: string, input: UpdateMealEntryInput): Promise<MealEntry> {
    const updateData: Record<string, any> = { updated_at: new Date().toISOString() };
    if (input.name !== undefined) updateData.name = input.name;
    if (input.mealType !== undefined) updateData.meal_type = input.mealType;
    if (input.participants !== undefined) updateData.participants = input.participants;
    if (input.isSlotOverridden !== undefined) updateData.is_slot_overridden = input.isSlotOverridden;
    if (input.isSlotSkipped !== undefined) updateData.is_slot_skipped = input.isSlotSkipped;

    const { data, error } = await this.client
      .from('meal_entries')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      logger.error('MealPlanRepository', 'Erro ao atualizar refeição', error);
      throw error;
    }

    return mapMealEntry(data);
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.client
      .from('meal_entries')
      .delete()
      .eq('id', id);

    if (error) {
      logger.error('MealPlanRepository', 'Erro ao apagar refeição', error);
      throw error;
    }
  }

  async skipSlot(familyId: string, weekStart: string, dayOfWeek: number, mealSlot: MealSlot): Promise<MealEntry> {
    const id = uuid();
    const ts = new Date().toISOString();

    const { data, error } = await this.client
      .from('meal_entries')
      .upsert(
        {
          id,
          family_id: familyId,
          week_start: weekStart,
          day_of_week: dayOfWeek,
          meal_slot: mealSlot,
          name: '_skipped',
          meal_type: 'home_cooked',
          participants: [],
          is_slot_skipped: true,
          created_at: ts,
          updated_at: ts,
        },
        { onConflict: 'family_id,week_start,day_of_week,meal_slot' }
      )
      .select()
      .single();

    if (error) {
      logger.error('MealPlanRepository', 'Erro ao saltar horário', error);
      throw error;
    }

    return mapMealEntry(data);
  }

  async getConfig(familyId: string): Promise<MealPlanSlotConfig[]> {
    const { data, error } = await this.client
      .from('meal_plan_config')
      .select('*')
      .eq('family_id', familyId)
      .order('day_of_week', { ascending: true })
      .order('meal_slot', { ascending: true });

    if (error) {
      logger.error('MealPlanRepository', 'Erro ao carregar configuração', error);
      throw error;
    }

    return (data ?? []).map(mapSlotConfig);
  }

  async upsertConfig(
    familyId: string,
    dayOfWeek: number,
    mealSlot: MealSlot,
    participants: string[],
    isSkip: boolean
  ): Promise<MealPlanSlotConfig> {
    const { data, error } = await this.client
      .from('meal_plan_config')
      .upsert(
        {
          family_id: familyId,
          day_of_week: dayOfWeek,
          meal_slot: mealSlot,
          participants,
          is_skip: isSkip,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'family_id,day_of_week,meal_slot' }
      )
      .select()
      .single();

    if (error) {
      logger.error('MealPlanRepository', 'Erro ao guardar configuração', error);
      throw error;
    }

    return mapSlotConfig(data);
  }

  // ── Dish operations ─────────────────────────────────────────────────────

  async getDishesForEntries(entryIds: string[]): Promise<Map<string, MealEntryDish[]>> {
    if (entryIds.length === 0) return new Map();

    const { data, error } = await this.client
      .from('meal_entry_dishes')
      .select(DISH_SELECT)
      .in('meal_entry_id', entryIds)
      .order('sort_order', { ascending: true });

    if (error) {
      logger.error('MealPlanRepository', 'Erro ao carregar pratos', error);
      throw error;
    }

    const map = new Map<string, MealEntryDish[]>();
    for (const row of data ?? []) {
      const dish = mapDish(row);
      const list = map.get(dish.mealEntryId) ?? [];
      list.push(dish);
      map.set(dish.mealEntryId, list);
    }
    return map;
  }

  async addDishes(mealEntryId: string, dishes: CreateDishInput[]): Promise<MealEntryDish[]> {
    if (dishes.length === 0) return [];

    const rows = dishes.map((d, i) => ({
      id: uuid(),
      meal_entry_id: mealEntryId,
      dish_type: d.dishType,
      recipe_id: d.recipeId ?? null,
      manual_name: d.manualName ?? null,
      manual_category: d.manualCategory ?? null,
      source_dish_id: d.sourceDishId ?? null,
      leftover_id: d.leftoverId ?? null,
      servings_override: d.servingsOverride ?? null,
      sort_order: d.sortOrder ?? i,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    const { data, error } = await this.client
      .from('meal_entry_dishes')
      .insert(rows)
      .select(DISH_SELECT);

    if (error) {
      logger.error('MealPlanRepository', 'Erro ao adicionar pratos', error);
      throw error;
    }

    return (data ?? []).map(mapDish);
  }

  async removeDish(dishId: string): Promise<void> {
    const { error } = await this.client
      .from('meal_entry_dishes')
      .delete()
      .eq('id', dishId);

    if (error) {
      logger.error('MealPlanRepository', 'Erro ao remover prato', error);
      throw error;
    }
  }

  async updateDishServings(dishId: string, servings: number): Promise<void> {
    const { error } = await this.client
      .from('meal_entry_dishes')
      .update({ servings_override: servings, updated_at: new Date().toISOString() })
      .eq('id', dishId);

    if (error) {
      logger.error('MealPlanRepository', 'Erro ao atualizar porções', error);
      throw error;
    }
  }

  async getRecentDishes(familyId: string, beforeDate: string, daysBack: number): Promise<MealEntryDish[]> {
    // Calculate the date range for the query
    const targetDate = parseLocalDate(beforeDate);
    const startDate = new Date(targetDate);
    startDate.setDate(startDate.getDate() - daysBack);
    const startDateStr = formatDateToString(startDate);

    // Determine relevant week_start values (can span at most 2 weeks)
    const startMonday = new Date(startDate);
    startMonday.setDate(startMonday.getDate() - ((startMonday.getDay() + 6) % 7));
    const endMonday = new Date(targetDate);
    endMonday.setDate(endMonday.getDate() - ((endMonday.getDay() + 6) % 7));

    const weekStarts: string[] = [];
    const current = new Date(startMonday);
    while (current <= endMonday) {
      weekStarts.push(formatDateToString(current));
      current.setDate(current.getDate() + 7);
    }

    // Query meal entries in the date range, then their dishes
    const { data: entries, error: entryError } = await this.client
      .from('meal_entries')
      .select('id, week_start, day_of_week')
      .eq('family_id', familyId)
      .eq('is_slot_skipped', false)
      .in('week_start', weekStarts);

    if (entryError) {
      logger.error('MealPlanRepository', 'Erro ao carregar refeições recentes', entryError);
      throw entryError;
    }

    // Filter entries by actual date range
    const validEntryIds = (entries ?? [])
      .filter((e) => {
        const entryDate = parseLocalDate(e.week_start);
        entryDate.setDate(entryDate.getDate() + (e.day_of_week - 1));
        return entryDate >= startDate && entryDate < targetDate;
      })
      .map((e) => e.id);

    if (validEntryIds.length === 0) return [];

    // Get recipe and manual dishes from those entries
    const { data: dishes, error: dishError } = await this.client
      .from('meal_entry_dishes')
      .select(DISH_SELECT)
      .in('meal_entry_id', validEntryIds)
      .in('dish_type', ['recipe', 'manual'])
      .order('sort_order', { ascending: true });

    if (dishError) {
      logger.error('MealPlanRepository', 'Erro ao carregar pratos recentes', dishError);
      throw dishError;
    }

    return (dishes ?? []).map(mapDish);
  }
}
