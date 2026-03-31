import { SupabaseClient } from '@supabase/supabase-js';
import { IBagTemplateRepository } from '../interfaces/bag-template.repository.interface';
import { BagTemplate, CreateBagTemplateInput } from '../../types/packing.types';
import { logger } from '../../utils/logger';
import { uuid } from '../../utils/uuid';

function mapBagTemplate(row: any): BagTemplate {
  return {
    id: row.id,
    familyId: row.family_id,
    name: row.name,
    color: row.color ?? '#888888',
    sizeLiters: Number(row.size_liters) || 0,
    isTopLevel: row.is_top_level === 1 || row.is_top_level === true,
    active: row.active === 1 || row.active === true,
    sortOrder: Number(row.sort_order) || 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function now(): string {
  return new Date().toISOString();
}

export class SupabaseBagTemplateRepository implements IBagTemplateRepository {
  constructor(private readonly client: SupabaseClient) {}

  async getBagTemplates(familyId: string): Promise<BagTemplate[]> {
    try {
      const { data, error } = await this.client
        .from('bag_templates')
        .select('*')
        .eq('family_id', familyId)
        .order('sort_order')
        .order('name');
      if (error) throw error;
      return (data ?? []).map(mapBagTemplate);
    } catch (err) {
      logger.error('BagTemplateRepository', 'getBagTemplates failed', err);
      throw new Error(`Erro ao carregar malas: ${err instanceof Error ? err.message : 'Erro'}`);
    }
  }

  async createBagTemplate(input: CreateBagTemplateInput): Promise<BagTemplate> {
    const id = uuid();
    const ts = now();
    try {
      const { data: maxRows, error: maxErr } = await this.client
        .from('bag_templates')
        .select('sort_order')
        .eq('family_id', input.familyId)
        .order('sort_order', { ascending: false })
        .limit(1);
      if (maxErr) throw maxErr;
      const nextOrder = (Number(maxRows?.[0]?.sort_order) || 0) + 1;

      const { data, error } = await this.client
        .from('bag_templates')
        .insert({
          id,
          family_id: input.familyId,
          name: input.name,
          color: input.color,
          size_liters: input.sizeLiters,
          is_top_level: input.isTopLevel,
          active: true,
          sort_order: nextOrder,
          created_at: ts,
          updated_at: ts,
        })
        .select()
        .single();
      if (error) throw error;
      return mapBagTemplate(data);
    } catch (err) {
      logger.error('BagTemplateRepository', 'createBagTemplate failed', err);
      throw new Error(`Erro ao criar mala: ${err instanceof Error ? err.message : 'Erro'}`);
    }
  }

  async updateBagTemplate(
    id: string,
    data: Partial<Pick<BagTemplate, 'name' | 'color' | 'sizeLiters' | 'isTopLevel'>>
  ): Promise<BagTemplate> {
    const updates: Record<string, unknown> = { updated_at: now() };
    if (data.name !== undefined) updates.name = data.name;
    if (data.color !== undefined) updates.color = data.color;
    if (data.sizeLiters !== undefined) updates.size_liters = data.sizeLiters;
    if (data.isTopLevel !== undefined) updates.is_top_level = data.isTopLevel;

    try {
      const { data: row, error } = await this.client
        .from('bag_templates')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      if (!row) throw new Error('Mala não encontrada');
      return mapBagTemplate(row);
    } catch (err) {
      logger.error('BagTemplateRepository', 'updateBagTemplate failed', err);
      throw new Error(`Erro ao actualizar mala: ${err instanceof Error ? err.message : 'Erro'}`);
    }
  }

  async deleteBagTemplate(id: string): Promise<void> {
    try {
      const { data: row, error: fetchErr } = await this.client
        .from('bag_templates')
        .select('sort_order, family_id')
        .eq('id', id)
        .single();
      if (fetchErr) throw fetchErr;

      const { error: delErr } = await this.client
        .from('bag_templates')
        .delete()
        .eq('id', id);
      if (delErr) throw delErr;

      if (row) {
        const { data: toUpdate, error: listErr } = await this.client
          .from('bag_templates')
          .select('id, sort_order')
          .eq('family_id', row.family_id)
          .gt('sort_order', row.sort_order);
        if (listErr) throw listErr;

        if (toUpdate && toUpdate.length > 0) {
          await this.client.from('bag_templates').upsert(
            toUpdate.map((item) => ({ id: item.id, sort_order: item.sort_order - 1 }))
          );
        }
      }
    } catch (err) {
      logger.error('BagTemplateRepository', 'deleteBagTemplate failed', err);
      throw new Error(`Erro ao eliminar mala: ${err instanceof Error ? err.message : 'Erro'}`);
    }
  }

  async countItemsUsingBag(bagId: string): Promise<number> {
    const { count: vacBagCount, error: vbErr } = await this.client
      .from('vacation_bags')
      .select('id', { count: 'exact', head: true })
      .eq('bag_template_id', bagId);

    const { count: tplBagCount, error: tbErr } = await this.client
      .from('vacation_template_bags')
      .select('id', { count: 'exact', head: true })
      .eq('bag_template_id', bagId);

    if (vbErr) logger.error('BagTemplateRepository', 'countItemsUsingBag vacation_bags failed', vbErr);
    if (tbErr) logger.error('BagTemplateRepository', 'countItemsUsingBag vacation_template_bags failed', tbErr);

    return (vacBagCount ?? 0) + (tplBagCount ?? 0);
  }

  async setActive(id: string, active: boolean): Promise<BagTemplate> {
    const ts = now();
    const { data, error } = await this.client
      .from('bag_templates')
      .update({ active, updated_at: ts })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return mapBagTemplate(data);
  }

  async reorderBagTemplate(id: string, newOrder: number): Promise<void> {
    const { data: row, error: fetchErr } = await this.client
      .from('bag_templates')
      .select('sort_order, family_id')
      .eq('id', id)
      .single();
    if (fetchErr || !row) return;

    const oldOrder = row.sort_order;
    if (oldOrder === newOrder) return;

    const ts = now();

    if (newOrder < oldOrder) {
      const { data: toUpdate } = await this.client
        .from('bag_templates')
        .select('id, sort_order')
        .eq('family_id', row.family_id)
        .gte('sort_order', newOrder)
        .lt('sort_order', oldOrder);

      if (toUpdate && toUpdate.length > 0) {
        await this.client.from('bag_templates').upsert(
          toUpdate.map((item) => ({ id: item.id, sort_order: item.sort_order + 1, updated_at: ts }))
        );
      }
    } else {
      const { data: toUpdate } = await this.client
        .from('bag_templates')
        .select('id, sort_order')
        .eq('family_id', row.family_id)
        .gt('sort_order', oldOrder)
        .lte('sort_order', newOrder);

      if (toUpdate && toUpdate.length > 0) {
        await this.client.from('bag_templates').upsert(
          toUpdate.map((item) => ({ id: item.id, sort_order: item.sort_order - 1, updated_at: ts }))
        );
      }
    }

    await this.client
      .from('bag_templates')
      .update({ sort_order: newOrder, updated_at: ts })
      .eq('id', id);
  }
}
