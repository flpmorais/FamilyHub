import { SupabaseClient } from '@supabase/supabase-js';
import { IMealPlanRepository } from '../interfaces/meal-plan.repository.interface';
import { MealEntry, MealSlot, MealType, CreateMealEntryInput, UpdateMealEntryInput, MealPlanSlotConfig } from '../../types/meal-plan.types';
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
    linkedMealId: row.linked_meal_id ?? null,
    participants: row.participants ?? [],
    isSlotOverridden: Boolean(row.is_slot_overridden),
    isSlotSkipped: Boolean(row.is_slot_skipped),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

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
        linked_meal_id: input.linkedMealId ?? null,
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
    if (input.linkedMealId !== undefined) updateData.linked_meal_id = input.linkedMealId;
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

  async getRecentLinkableMeals(familyId: string, currentWeekStart: string, weeksBack = 2): Promise<MealEntry[]> {
    const startDate = parseLocalDate(currentWeekStart);
    startDate.setDate(startDate.getDate() - weeksBack * 7);
    const fromWeek = formatDateToString(startDate);

    const { data, error } = await this.client
      .from('meal_entries')
      .select('*')
      .eq('family_id', familyId)
      .in('meal_type', ['home_cooked', 'takeaway'])
      .eq('is_slot_skipped', false)
      .gte('week_start', fromWeek)
      .lte('week_start', currentWeekStart)
      .order('week_start', { ascending: false })
      .order('day_of_week', { ascending: false });

    if (error) {
      logger.error('MealPlanRepository', 'Erro ao carregar refeições recentes', error);
      throw error;
    }

    return (data ?? []).map(mapMealEntry);
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
