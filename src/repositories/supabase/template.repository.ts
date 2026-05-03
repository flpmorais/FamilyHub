import { SupabaseClient } from "@supabase/supabase-js";
import { ITemplateRepository } from "../interfaces/template.repository.interface";
import {
  TemplateItem,
  CreateTemplateItemInput,
} from "../../types/packing.types";
import { logger } from "../../utils/logger";
import { uuid } from "../../utils/uuid";

function mapTemplateItem(
  row: any,
  tagIds: string[] = [],
  profileIds: string[] = [],
): TemplateItem {
  return {
    id: row.id,
    familyId: row.family_id,
    title: row.title,
    profileIds,
    categoryId: row.category_id,
    iconId: row.icon_id,
    quantity: Number(row.quantity) || 1,
    isAllFamily: row.is_all_family === true,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    tagIds,
  };
}

function now(): string {
  return new Date().toISOString();
}

export class SupabaseTemplateRepository implements ITemplateRepository {
  constructor(private readonly client: SupabaseClient) {}

  private async loadTagIdsForItem(itemId: string): Promise<string[]> {
    const { data, error } = await this.client
      .from("template_item_tags")
      .select("tag_id")
      .eq("template_item_id", itemId);
    if (error) throw error;
    return (data ?? []).map((r: any) => r.tag_id as string);
  }

  private async saveTagsForItem(
    itemId: string,
    tagIds: string[],
  ): Promise<void> {
    const { error: delError } = await this.client
      .from("template_item_tags")
      .delete()
      .eq("template_item_id", itemId);
    if (delError) throw delError;

    if (tagIds.length > 0) {
      const rows = tagIds.map((tagId) => ({
        template_item_id: itemId,
        tag_id: tagId,
      }));
      const { error: insError } = await this.client
        .from("template_item_tags")
        .insert(rows);
      if (insError) throw insError;
    }
  }

  private async loadProfileIdsForItem(itemId: string): Promise<string[]> {
    const { data, error } = await this.client
      .from("template_item_profiles")
      .select("profile_id")
      .eq("template_item_id", itemId);
    if (error) throw error;
    return (data ?? []).map((r: any) => r.profile_id as string);
  }

  private async saveProfilesForItem(
    itemId: string,
    profileIds: string[],
  ): Promise<void> {
    const { error: delError } = await this.client
      .from("template_item_profiles")
      .delete()
      .eq("template_item_id", itemId);
    if (delError) throw delError;

    if (profileIds.length > 0) {
      const rows = profileIds.map((profileId) => ({
        id: uuid(),
        template_item_id: itemId,
        profile_id: profileId,
      }));
      const { error: insError } = await this.client
        .from("template_item_profiles")
        .insert(rows);
      if (insError) throw insError;
    }
  }

  async getTemplateItems(familyId: string): Promise<TemplateItem[]> {
    try {
      const { data: rows, error } = await this.client
        .from("template_items")
        .select("*")
        .eq("family_id", familyId)
        .order("title");
      if (error) throw error;
      if (!rows || rows.length === 0) return [];

      const itemIds = rows.map((r: any) => r.id as string);

      const [
        { data: tagRows, error: tagErr },
        { data: profileRows, error: profErr },
      ] = await Promise.all([
        this.client
          .from("template_item_tags")
          .select("template_item_id, tag_id")
          .in("template_item_id", itemIds),
        this.client
          .from("template_item_profiles")
          .select("template_item_id, profile_id")
          .in("template_item_id", itemIds),
      ]);
      if (tagErr) throw tagErr;
      if (profErr) throw profErr;

      const tagsByItem = new Map<string, string[]>();
      for (const r of tagRows ?? []) {
        const list = tagsByItem.get(r.template_item_id) ?? [];
        list.push(r.tag_id);
        tagsByItem.set(r.template_item_id, list);
      }

      const profilesByItem = new Map<string, string[]>();
      for (const r of profileRows ?? []) {
        const list = profilesByItem.get(r.template_item_id) ?? [];
        list.push(r.profile_id);
        profilesByItem.set(r.template_item_id, list);
      }

      return rows.map((row: any) =>
        mapTemplateItem(
          row,
          tagsByItem.get(row.id) ?? [],
          profilesByItem.get(row.id) ?? [],
        ),
      );
    } catch (err) {
      logger.error("TemplateRepository", "getTemplateItems failed", err);
      throw new Error(
        `Erro ao carregar modelos: ${err instanceof Error ? err.message : "Erro"}`,
      );
    }
  }

  async createTemplateItem(
    familyId: string,
    item: CreateTemplateItemInput,
  ): Promise<TemplateItem> {
    const id = uuid();
    const ts = now();
    try {
      const { error } = await this.client.from("template_items").insert({
        id,
        family_id: familyId,
        title: item.title,
        category_id: item.categoryId,
        icon_id: item.iconId,
        quantity: item.quantity ?? 1,
        is_all_family: item.isAllFamily ?? false,
        created_at: ts,
        updated_at: ts,
      });
      if (error) throw error;

      if (item.tagIds && item.tagIds.length > 0) {
        await this.saveTagsForItem(id, item.tagIds);
      }
      if (item.profileIds && item.profileIds.length > 0) {
        await this.saveProfilesForItem(id, item.profileIds);
      }

      const [tagIds, profileIds] = await Promise.all([
        this.loadTagIdsForItem(id),
        this.loadProfileIdsForItem(id),
      ]);
      const { data: rows, error: selError } = await this.client
        .from("template_items")
        .select("*")
        .eq("id", id);
      if (selError) throw selError;
      return mapTemplateItem(rows![0], tagIds, profileIds);
    } catch (err) {
      logger.error("TemplateRepository", "createTemplateItem failed", err);
      throw new Error(
        `Erro ao criar modelo: ${err instanceof Error ? err.message : "Erro"}`,
      );
    }
  }

  async updateTemplateItem(
    id: string,
    data: Partial<
      Pick<
        TemplateItem,
        "title" | "categoryId" | "iconId" | "quantity" | "isAllFamily"
      >
    > & { profileIds?: string[]; tagIds?: string[] },
  ): Promise<TemplateItem> {
    const updates: Record<string, unknown> = { updated_at: now() };
    if (data.title !== undefined) updates.title = data.title;
    if (data.categoryId !== undefined) updates.category_id = data.categoryId;
    if (data.iconId !== undefined) updates.icon_id = data.iconId;
    if (data.quantity !== undefined) updates.quantity = data.quantity;
    if (data.isAllFamily !== undefined)
      updates.is_all_family = data.isAllFamily;

    try {
      const { error } = await this.client
        .from("template_items")
        .update(updates)
        .eq("id", id);
      if (error) throw error;

      if (data.tagIds !== undefined) {
        await this.saveTagsForItem(id, data.tagIds);
      }
      if (data.profileIds !== undefined) {
        await this.saveProfilesForItem(id, data.profileIds);
      }

      const [tagIds, profileIds] = await Promise.all([
        this.loadTagIdsForItem(id),
        this.loadProfileIdsForItem(id),
      ]);
      const { data: rows, error: selError } = await this.client
        .from("template_items")
        .select("*")
        .eq("id", id);
      if (selError) throw selError;
      if (!rows || rows.length === 0) throw new Error("Modelo não encontrado");
      return mapTemplateItem(rows[0], tagIds, profileIds);
    } catch (err) {
      logger.error("TemplateRepository", "updateTemplateItem failed", err);
      throw new Error(
        `Erro ao actualizar modelo: ${err instanceof Error ? err.message : "Erro"}`,
      );
    }
  }

  async deleteTemplateItem(id: string): Promise<void> {
    try {
      const { error: e1 } = await this.client
        .from("template_item_profiles")
        .delete()
        .eq("template_item_id", id);
      if (e1) throw e1;

      const { error: e2 } = await this.client
        .from("template_item_tags")
        .delete()
        .eq("template_item_id", id);
      if (e2) throw e2;

      const { error: e3 } = await this.client
        .from("template_items")
        .delete()
        .eq("id", id);
      if (e3) throw e3;
    } catch (err) {
      logger.error("TemplateRepository", "deleteTemplateItem failed", err);
      throw new Error(
        `Erro ao eliminar modelo: ${err instanceof Error ? err.message : "Erro"}`,
      );
    }
  }

  async applyTemplates(
    familyId: string,
    vacationId: string,
    participantProfileIds: string[],
    vacationTagIds: string[],
  ): Promise<number> {
    try {
      const items = await this.getTemplateItems(familyId);
      const participantSet = new Set(participantProfileIds);
      const tagSet = new Set(vacationTagIds);
      let count = 0;

      const packingItemsToInsert: any[] = [];
      const packingItemTagsToInsert: any[] = [];

      function enqueuePackingItem(
        profileId: string | null,
        isAllFamily: boolean,
        item: TemplateItem,
      ): void {
        const id = uuid();
        const ts = now();
        packingItemsToInsert.push({
          id,
          vacation_id: vacationId,
          family_id: familyId,
          title: item.title,
          status: "new",
          profile_id: profileId,
          quantity: item.quantity,
          notes: null,
          category_id: item.categoryId,
          icon_id: item.iconId,
          is_all_family: isAllFamily,
          created_at: ts,
          updated_at: ts,
        });
        const matchingTagIds = item.tagIds.filter((tid) => tagSet.has(tid));
        for (const tagId of matchingTagIds) {
          packingItemTagsToInsert.push({
            packing_item_id: id,
            tag_id: tagId,
          });
        }
        count++;
      }

      for (const item of items) {
        if (
          item.tagIds.length > 0 &&
          !item.tagIds.some((tid) => tagSet.has(tid))
        )
          continue;

        if (item.isAllFamily) {
          enqueuePackingItem(null, true, item);
        } else if (item.profileIds.length > 0) {
          for (const profileId of item.profileIds) {
            if (participantSet.has(profileId)) {
              enqueuePackingItem(profileId, false, item);
            }
          }
        } else {
          for (const profileId of participantProfileIds) {
            enqueuePackingItem(profileId, false, item);
          }
        }
      }

      if (packingItemsToInsert.length > 0) {
        const { error: itemsError } = await this.client
          .from("packing_items")
          .insert(packingItemsToInsert);
        if (itemsError) throw itemsError;
      }

      if (packingItemTagsToInsert.length > 0) {
        const { error: tagsError } = await this.client
          .from("packing_item_tags")
          .insert(packingItemTagsToInsert);
        if (tagsError) throw tagsError;
      }

      logger.info(
        "TemplateRepository",
        `applyTemplates: injected ${count} packing items for vacation ${vacationId}`,
      );
      return count;
    } catch (err) {
      logger.error("TemplateRepository", "applyTemplates failed", err);
      throw new Error(
        `Erro ao aplicar modelos: ${err instanceof Error ? err.message : "Erro"}`,
      );
    }
  }
}
