import { SupabaseClient } from "@supabase/supabase-js";
import { ITagRepository } from "../interfaces/tag.repository.interface";
import { Tag } from "../../types/packing.types";
import { logger } from "../../utils/logger";
import { uuid } from "../../utils/uuid";

function mapTag(row: any): Tag {
  return {
    id: row.id,
    name: row.name,
    color: row.color ?? "#888888",
    icon: row.icon ?? "tag",
    active: row.active === 1 || row.active === true,
    sortOrder: Number(row.sort_order) || 0,
    familyId: row.family_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function now(): string {
  return new Date().toISOString();
}

export class SupabaseTagRepository implements ITagRepository {
  constructor(private readonly client: SupabaseClient) {}

  async getTags(familyId: string): Promise<Tag[]> {
    try {
      const { data, error } = await this.client
        .from("tags")
        .select("*")
        .eq("family_id", familyId)
        .order("sort_order")
        .order("name");
      if (error) throw error;
      return (data ?? []).map(mapTag);
    } catch (err) {
      logger.error("TagRepository", "getTags failed", err);
      throw new Error(
        `Erro ao carregar etiquetas: ${err instanceof Error ? err.message : "Erro"}`,
      );
    }
  }

  async createTag(
    familyId: string,
    name: string,
    icon: string,
    color: string = "#888888",
  ): Promise<Tag> {
    const id = uuid();
    const ts = now();
    try {
      // Get max sort_order for this family
      const { data: maxRows, error: maxErr } = await this.client
        .from("tags")
        .select("sort_order")
        .eq("family_id", familyId)
        .order("sort_order", { ascending: false })
        .limit(1);
      if (maxErr) throw maxErr;
      const nextOrder = (Number(maxRows?.[0]?.sort_order) || 0) + 1;

      const { data, error } = await this.client
        .from("tags")
        .insert({
          id,
          family_id: familyId,
          name,
          icon,
          color,
          active: true,
          sort_order: nextOrder,
          created_at: ts,
          updated_at: ts,
        })
        .select()
        .single();
      if (error) throw error;
      return mapTag(data);
    } catch (err) {
      logger.error("TagRepository", "createTag failed", err);
      throw new Error(
        `Erro ao criar etiqueta: ${err instanceof Error ? err.message : "Erro"}`,
      );
    }
  }

  async updateTag(
    id: string,
    name: string,
    icon: string,
    color?: string,
  ): Promise<Tag> {
    const ts = now();
    try {
      const updates: Record<string, unknown> = { name, icon, updated_at: ts };
      if (color !== undefined) updates.color = color;

      const { data, error } = await this.client
        .from("tags")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      if (!data) throw new Error("Etiqueta não encontrada");
      return mapTag(data);
    } catch (err) {
      logger.error("TagRepository", "updateTag failed", err);
      throw new Error(
        `Erro ao actualizar etiqueta: ${err instanceof Error ? err.message : "Erro"}`,
      );
    }
  }

  async deleteTag(id: string): Promise<void> {
    try {
      // Get the tag's sort_order and family_id before deleting
      const { data: row, error: fetchErr } = await this.client
        .from("tags")
        .select("sort_order, family_id")
        .eq("id", id)
        .single();
      if (fetchErr) throw fetchErr;

      const { error: delErr } = await this.client
        .from("tags")
        .delete()
        .eq("id", id);
      if (delErr) throw delErr;

      if (row) {
        // Shift sort_order down for tags that were after the deleted one
        const { data: toUpdate, error: listErr } = await this.client
          .from("tags")
          .select("id, sort_order")
          .eq("family_id", row.family_id)
          .gt("sort_order", row.sort_order);
        if (listErr) throw listErr;

        if (toUpdate && toUpdate.length > 0) {
          await this.client.from("tags").upsert(
            toUpdate.map((item) => ({
              id: item.id,
              sort_order: item.sort_order - 1,
            })),
          );
        }
      }
    } catch (err) {
      logger.error("TagRepository", "deleteTag failed", err);
      throw new Error(
        `Erro ao eliminar etiqueta: ${err instanceof Error ? err.message : "Erro"}`,
      );
    }
  }

  async countItemsUsingTag(tagId: string): Promise<number> {
    const { count, error } = await this.client
      .from("packing_item_tags")
      .select("packing_item_id", { count: "exact", head: true })
      .eq("tag_id", tagId);

    if (error)
      logger.error("TagRepository", "countItemsUsingTag failed", error);
    return count ?? 0;
  }

  async setActive(id: string, active: boolean): Promise<Tag> {
    const ts = now();
    const { data, error } = await this.client
      .from("tags")
      .update({ active, updated_at: ts })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return mapTag(data);
  }

  async reorderTag(id: string, newOrder: number): Promise<void> {
    const { data: row, error: fetchErr } = await this.client
      .from("tags")
      .select("sort_order, family_id")
      .eq("id", id)
      .single();
    if (fetchErr || !row) return;

    const oldOrder = row.sort_order;
    if (oldOrder === newOrder) return;

    const ts = now();

    if (newOrder < oldOrder) {
      // Moving up: shift items in [newOrder, oldOrder) down by +1
      const { data: toUpdate } = await this.client
        .from("tags")
        .select("id, sort_order")
        .eq("family_id", row.family_id)
        .gte("sort_order", newOrder)
        .lt("sort_order", oldOrder);

      if (toUpdate && toUpdate.length > 0) {
        await this.client.from("tags").upsert(
          toUpdate.map((item) => ({
            id: item.id,
            sort_order: item.sort_order + 1,
            updated_at: ts,
          })),
        );
      }
    } else {
      // Moving down: shift items in (oldOrder, newOrder] up by -1
      const { data: toUpdate } = await this.client
        .from("tags")
        .select("id, sort_order")
        .eq("family_id", row.family_id)
        .gt("sort_order", oldOrder)
        .lte("sort_order", newOrder);

      if (toUpdate && toUpdate.length > 0) {
        await this.client.from("tags").upsert(
          toUpdate.map((item) => ({
            id: item.id,
            sort_order: item.sort_order - 1,
            updated_at: ts,
          })),
        );
      }
    }

    await this.client
      .from("tags")
      .update({ sort_order: newOrder, updated_at: ts })
      .eq("id", id);
  }
}
