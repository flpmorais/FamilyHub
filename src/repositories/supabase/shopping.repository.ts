import { SupabaseClient } from '@supabase/supabase-js';
import { IShoppingRepository } from "../interfaces/shopping.repository.interface";
import {
  ShoppingItem,
  CreateShoppingItemInput,
  UpdateShoppingItemInput,
} from "../../types/shopping.types";
import { logger } from "../../utils/logger";
import { uuid } from "../../utils/uuid";

function mapShoppingItem(row: any): ShoppingItem {
  return {
    id: row.id,
    familyId: row.family_id,
    name: row.name,
    categoryId: row.category_id,
    quantityNote: row.quantity_note ?? null,
    isUrgent: Boolean(row.is_urgent),
    isTicked: Boolean(row.is_ticked),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function now(): string {
  return new Date().toISOString();
}

export class SupabaseShoppingRepository implements IShoppingRepository {
  constructor(private readonly client: SupabaseClient) {}

  async addItem(input: CreateShoppingItemInput): Promise<ShoppingItem> {
    const id = uuid();
    const ts = now();

    try {
      const { data, error } = await this.client
        .from('shopping_items')
        .insert({
          id,
          family_id: input.familyId,
          name: input.name,
          category_id: input.categoryId,
          quantity_note: input.quantityNote ?? null,
          is_urgent: input.isUrgent ?? false,
          is_ticked: false,
          created_at: ts,
          updated_at: ts,
        })
        .select()
        .single();

      if (error) throw error;
      return mapShoppingItem(data);
    } catch (err) {
      logger.error("ShoppingRepository", "addItem failed", err);
      throw new Error(
        `Erro ao adicionar item: ${err instanceof Error ? err.message : "Erro"}`,
      );
    }
  }

  async tickItem(id: string): Promise<ShoppingItem> {
    try {
      const { data, error } = await this.client
        .from('shopping_items')
        .update({ is_ticked: true, updated_at: now() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return mapShoppingItem(data);
    } catch (err) {
      logger.error("ShoppingRepository", "tickItem failed", err);
      throw new Error(
        `Erro ao marcar item: ${err instanceof Error ? err.message : "Erro"}`,
      );
    }
  }

  async untickItem(id: string): Promise<ShoppingItem> {
    try {
      const { data, error } = await this.client
        .from('shopping_items')
        .update({ is_ticked: false, updated_at: now() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return mapShoppingItem(data);
    } catch (err) {
      logger.error("ShoppingRepository", "untickItem failed", err);
      throw new Error(
        `Erro ao desmarcar item: ${err instanceof Error ? err.message : "Erro"}`,
      );
    }
  }

  async setUrgent(id: string, isUrgent: boolean): Promise<ShoppingItem> {
    try {
      const { data, error } = await this.client
        .from('shopping_items')
        .update({ is_urgent: isUrgent, updated_at: now() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return mapShoppingItem(data);
    } catch (err) {
      logger.error("ShoppingRepository", "setUrgent failed", err);
      throw new Error(
        `Erro ao atualizar urgência: ${err instanceof Error ? err.message : "Erro"}`,
      );
    }
  }

  async editItem(id: string, data: UpdateShoppingItemInput): Promise<ShoppingItem> {
    const updates: Record<string, unknown> = {};

    if (data.name !== undefined) updates.name = data.name;
    if (data.categoryId !== undefined) updates.category_id = data.categoryId;
    if (data.quantityNote !== undefined) updates.quantity_note = data.quantityNote;
    if (data.isUrgent !== undefined) updates.is_urgent = data.isUrgent;

    updates.updated_at = now();

    try {
      const { data: row, error } = await this.client
        .from('shopping_items')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return mapShoppingItem(row);
    } catch (err) {
      logger.error("ShoppingRepository", "editItem failed", err);
      throw new Error(
        `Erro ao editar item: ${err instanceof Error ? err.message : "Erro"}`,
      );
    }
  }

  async deleteItem(id: string): Promise<void> {
    try {
      const { error } = await this.client
        .from('shopping_items')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (err) {
      logger.error("ShoppingRepository", "deleteItem failed", err);
      throw new Error(
        `Erro ao eliminar item: ${err instanceof Error ? err.message : "Erro"}`,
      );
    }
  }

  async getItems(familyId: string): Promise<ShoppingItem[]> {
    try {
      const { data, error } = await this.client
        .from('shopping_items')
        .select('*')
        .eq('family_id', familyId)
        .order('is_ticked', { ascending: true })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data ?? []).map(mapShoppingItem);
    } catch (err) {
      logger.error("ShoppingRepository", "getItems failed", err);
      throw new Error(
        `Erro ao carregar itens: ${err instanceof Error ? err.message : "Erro"}`,
      );
    }
  }

  async findByName(familyId: string, name: string): Promise<ShoppingItem | null> {
    try {
      const { data, error } = await this.client
        .from('shopping_items')
        .select('*')
        .eq('family_id', familyId)
        .ilike('name', name)
        .maybeSingle();

      if (error) throw error;
      return data ? mapShoppingItem(data) : null;
    } catch (err) {
      logger.error("ShoppingRepository", "findByName failed", err);
      throw new Error(
        `Erro ao procurar item: ${err instanceof Error ? err.message : "Erro"}`,
      );
    }
  }
}
