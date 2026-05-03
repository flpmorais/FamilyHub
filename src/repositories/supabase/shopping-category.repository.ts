import { SupabaseClient } from "@supabase/supabase-js";
import { IShoppingCategoryRepository } from "../interfaces/shopping-category.repository.interface";
import {
  ShoppingCategory,
  CreateShoppingCategoryInput,
  UpdateShoppingCategoryInput,
} from "../../types/shopping.types";
import { logger } from "../../utils/logger";
import { uuid } from "../../utils/uuid";

function mapShoppingCategory(row: any): ShoppingCategory {
  return {
    id: row.id,
    familyId: row.family_id,
    name: row.name,
    active: Boolean(row.active),
    sortOrder: Number(row.sort_order),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function now(): string {
  return new Date().toISOString();
}

export class SupabaseShoppingCategoryRepository implements IShoppingCategoryRepository {
  constructor(private readonly client: SupabaseClient) {}

  async getAll(familyId: string): Promise<ShoppingCategory[]> {
    try {
      const { data, error } = await this.client
        .from("shopping_categories")
        .select("*")
        .eq("family_id", familyId)
        .order("sort_order", { ascending: true });

      if (error) throw error;
      return (data ?? []).map(mapShoppingCategory);
    } catch (err) {
      logger.error("ShoppingCategoryRepository", "getAll failed", err);
      throw new Error(
        `Erro ao carregar categorias: ${err instanceof Error ? err.message : "Erro"}`,
      );
    }
  }

  async create(input: CreateShoppingCategoryInput): Promise<ShoppingCategory> {
    const id = uuid();
    const ts = now();

    try {
      const { data, error } = await this.client
        .from("shopping_categories")
        .insert({
          id,
          family_id: input.familyId,
          name: input.name,
          sort_order: input.sortOrder ?? 0,
          created_at: ts,
          updated_at: ts,
        })
        .select()
        .single();

      if (error) throw error;
      return mapShoppingCategory(data);
    } catch (err) {
      logger.error("ShoppingCategoryRepository", "create failed", err);
      throw new Error(
        `Erro ao criar categoria: ${err instanceof Error ? err.message : "Erro"}`,
      );
    }
  }

  async edit(
    id: string,
    data: UpdateShoppingCategoryInput,
  ): Promise<ShoppingCategory> {
    const updates: Record<string, unknown> = {};

    if (data.name !== undefined) updates.name = data.name;
    if (data.sortOrder !== undefined) updates.sort_order = data.sortOrder;

    updates.updated_at = now();

    try {
      const { data: row, error } = await this.client
        .from("shopping_categories")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return mapShoppingCategory(row);
    } catch (err) {
      logger.error("ShoppingCategoryRepository", "edit failed", err);
      throw new Error(
        `Erro ao editar categoria: ${err instanceof Error ? err.message : "Erro"}`,
      );
    }
  }

  async delete(id: string): Promise<void> {
    try {
      const { error } = await this.client
        .from("shopping_categories")
        .delete()
        .eq("id", id);

      if (error) throw error;
    } catch (err) {
      logger.error("ShoppingCategoryRepository", "delete failed", err);
      throw new Error(
        `Erro ao eliminar categoria: ${err instanceof Error ? err.message : "Erro"}`,
      );
    }
  }

  async setActive(id: string, active: boolean): Promise<void> {
    const { error } = await this.client
      .from("shopping_categories")
      .update({ active, updated_at: now() })
      .eq("id", id);
    if (error) throw error;
  }

  async reorder(id: string, sortOrder: number): Promise<void> {
    const { error } = await this.client
      .from("shopping_categories")
      .update({ sort_order: sortOrder, updated_at: now() })
      .eq("id", id);
    if (error) throw error;
  }

  async batchReorder(
    items: { id: string; sortOrder: number }[],
  ): Promise<void> {
    await Promise.all(
      items.map(({ id, sortOrder }) =>
        this.client
          .from("shopping_categories")
          .update({ sort_order: sortOrder, updated_at: now() })
          .eq("id", id),
      ),
    );
  }

  async countItemsUsingCategory(categoryId: string): Promise<number> {
    const { count, error } = await this.client
      .from("shopping_items")
      .select("*", { count: "exact", head: true })
      .eq("category_id", categoryId)
      .eq("is_ticked", false);
    if (error) throw error;
    return count ?? 0;
  }
}
