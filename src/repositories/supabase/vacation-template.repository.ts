import * as FileSystem from "expo-file-system/legacy";
import { SupabaseClient } from "@supabase/supabase-js";
import { IVacationTemplateRepository } from "../interfaces/vacation-template.repository.interface";
import {
  VacationTemplate,
  VacationTemplateBag,
  CreateVacationTemplateInput,
} from "../../types/vacation.types";
import { logger } from "../../utils/logger";
import { uuid } from "../../utils/uuid";

function mapRow(
  row: any,
): Omit<VacationTemplate, "participantProfileIds" | "tagIds" | "bags"> {
  return {
    id: row.id,
    familyId: row.family_id,
    title: row.title,
    countryCode: row.country_code,
    coverImageUrl: row.cover_image_url,
    active: !!row.active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class SupabaseVacationTemplateRepository implements IVacationTemplateRepository {
  constructor(private readonly client: SupabaseClient) {}

  private async loadParticipantIds(templateId: string): Promise<string[]> {
    const { data, error } = await this.client
      .from("vacation_template_participants")
      .select("profile_id")
      .eq("vacation_template_id", templateId);
    if (error) throw error;
    return (data ?? []).map((r) => r.profile_id as string);
  }

  private async loadTagIds(templateId: string): Promise<string[]> {
    const { data, error } = await this.client
      .from("vacation_template_tags")
      .select("tag_id")
      .eq("vacation_template_id", templateId);
    if (error) throw error;
    return (data ?? []).map((r) => r.tag_id as string);
  }

  private async loadBags(templateId: string): Promise<VacationTemplateBag[]> {
    const { data, error } = await this.client
      .from("vacation_template_bags")
      .select("bag_template_id, is_top_level")
      .eq("vacation_template_id", templateId);
    if (error) throw error;
    return (data ?? []).map((r) => ({
      bagTemplateId: r.bag_template_id as string,
      isTopLevel: !!r.is_top_level,
    }));
  }

  async getVacationTemplates(
    familyId: string,
    activeOnly?: boolean,
  ): Promise<VacationTemplate[]> {
    let query = this.client
      .from("vacation_templates")
      .select("*")
      .eq("family_id", familyId)
      .order("created_at", { ascending: false });
    if (activeOnly) query = query.eq("active", true);

    const { data: rows, error } = await query;
    if (error) throw error;
    if (!rows || rows.length === 0) return [];

    const ids = rows.map((r) => r.id);

    const [participantRows, tagRows, bagRows] = await Promise.all([
      this.client
        .from("vacation_template_participants")
        .select("vacation_template_id, profile_id")
        .in("vacation_template_id", ids),
      this.client
        .from("vacation_template_tags")
        .select("vacation_template_id, tag_id")
        .in("vacation_template_id", ids),
      this.client
        .from("vacation_template_bags")
        .select("vacation_template_id, bag_template_id, is_top_level")
        .in("vacation_template_id", ids),
    ]);

    const participantMap = new Map<string, string[]>();
    for (const r of participantRows.data ?? []) {
      const list = participantMap.get(r.vacation_template_id) ?? [];
      list.push(r.profile_id);
      participantMap.set(r.vacation_template_id, list);
    }

    const tagMap = new Map<string, string[]>();
    for (const r of tagRows.data ?? []) {
      const list = tagMap.get(r.vacation_template_id) ?? [];
      list.push(r.tag_id);
      tagMap.set(r.vacation_template_id, list);
    }

    const bagMap = new Map<string, VacationTemplateBag[]>();
    for (const r of bagRows.data ?? []) {
      const list = bagMap.get(r.vacation_template_id) ?? [];
      list.push({
        bagTemplateId: r.bag_template_id,
        isTopLevel: !!r.is_top_level,
      });
      bagMap.set(r.vacation_template_id, list);
    }

    return rows.map((row) => ({
      ...mapRow(row),
      participantProfileIds: participantMap.get(row.id) ?? [],
      tagIds: tagMap.get(row.id) ?? [],
      bags: bagMap.get(row.id) ?? [],
    }));
  }

  async getVacationTemplateById(id: string): Promise<VacationTemplate | null> {
    const { data: row, error } = await this.client
      .from("vacation_templates")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    if (!row) return null;

    const [participantIds, tagIds, bags] = await Promise.all([
      this.loadParticipantIds(id),
      this.loadTagIds(id),
      this.loadBags(id),
    ]);

    return {
      ...mapRow(row),
      participantProfileIds: participantIds,
      tagIds,
      bags,
    };
  }

  async createVacationTemplate(
    input: CreateVacationTemplateInput,
  ): Promise<VacationTemplate> {
    const { data, error } = await this.client
      .from("vacation_templates")
      .insert({
        id: uuid(),
        family_id: input.familyId,
        title: input.title,
        country_code: input.countryCode,
        active: true,
      })
      .select()
      .single();
    if (error || !data) throw error ?? new Error("No data returned");

    const id = data.id;

    // Insert participants
    if (input.participantProfileIds.length > 0) {
      const rows = input.participantProfileIds.map((profileId) => ({
        id: uuid(),
        vacation_template_id: id,
        profile_id: profileId,
      }));
      await this.client.from("vacation_template_participants").insert(rows);
    }

    // Insert tags
    if (input.tagIds && input.tagIds.length > 0) {
      const rows = input.tagIds.map((tagId) => ({
        id: uuid(),
        vacation_template_id: id,
        tag_id: tagId,
      }));
      await this.client.from("vacation_template_tags").insert(rows);
    }

    // Insert bags
    if (input.bags && input.bags.length > 0) {
      const bagRows = input.bags.map((b) => ({
        id: uuid(),
        vacation_template_id: id,
        bag_template_id: b.bagTemplateId,
        is_top_level: b.isTopLevel,
      }));
      await this.client.from("vacation_template_bags").insert(bagRows);
    }

    const base = mapRow(data);
    return {
      ...base,
      participantProfileIds: input.participantProfileIds,
      tagIds: input.tagIds ?? [],
      bags: input.bags ?? [],
    };
  }

  async updateVacationTemplate(
    id: string,
    data: Partial<
      Omit<
        VacationTemplate,
        | "id"
        | "createdAt"
        | "updatedAt"
        | "participantProfileIds"
        | "tagIds"
        | "bags"
      >
    >,
    participantProfileIds?: string[],
    tagIds?: string[],
    bags?: VacationTemplateBag[],
  ): Promise<VacationTemplate> {
    const updates: Record<string, unknown> = {};
    if (data.title !== undefined) updates.title = data.title;
    if (data.countryCode !== undefined) updates.country_code = data.countryCode;
    if (data.coverImageUrl !== undefined)
      updates.cover_image_url = data.coverImageUrl;
    if (data.active !== undefined) updates.active = data.active;

    const { error } = await this.client
      .from("vacation_templates")
      .update(updates)
      .eq("id", id);
    if (error) throw error;

    // Replace participants
    if (participantProfileIds !== undefined) {
      await this.client
        .from("vacation_template_participants")
        .delete()
        .eq("vacation_template_id", id);
      if (participantProfileIds.length > 0) {
        const rows = participantProfileIds.map((profileId) => ({
          id: uuid(),
          vacation_template_id: id,
          profile_id: profileId,
        }));
        await this.client.from("vacation_template_participants").insert(rows);
      }
    }

    // Replace tags
    if (tagIds !== undefined) {
      await this.client
        .from("vacation_template_tags")
        .delete()
        .eq("vacation_template_id", id);
      if (tagIds.length > 0) {
        const rows = tagIds.map((tagId) => ({
          id: uuid(),
          vacation_template_id: id,
          tag_id: tagId,
        }));
        await this.client.from("vacation_template_tags").insert(rows);
      }
    }

    // Replace bags
    if (bags !== undefined) {
      await this.client
        .from("vacation_template_bags")
        .delete()
        .eq("vacation_template_id", id);
      if (bags.length > 0) {
        const bagRows = bags.map((b) => ({
          id: uuid(),
          vacation_template_id: id,
          bag_template_id: b.bagTemplateId,
          is_top_level: b.isTopLevel,
        }));
        await this.client.from("vacation_template_bags").insert(bagRows);
      }
    }

    const { data: updated, error: selError } = await this.client
      .from("vacation_templates")
      .select("*")
      .eq("id", id)
      .single();
    if (selError || !updated) throw selError ?? new Error("Template not found");

    const base = mapRow(updated);
    const [pIds, tIds, loadedBags] = await Promise.all([
      this.loadParticipantIds(id),
      this.loadTagIds(id),
      this.loadBags(id),
    ]);
    return {
      ...base,
      participantProfileIds: pIds,
      tagIds: tIds,
      bags: loadedBags,
    };
  }

  async deleteVacationTemplate(id: string): Promise<void> {
    // Get image URL before deletion for potential cleanup
    const { data: rows } = await this.client
      .from("vacation_templates")
      .select("cover_image_url")
      .eq("id", id);
    const imageUrl = rows && rows.length > 0 ? rows[0].cover_image_url : null;

    // Supabase CASCADE handles junction table cleanup
    const { error } = await this.client
      .from("vacation_templates")
      .delete()
      .eq("id", id);
    if (error) throw error;

    if (imageUrl) {
      await this.tryDeleteUnusedImage(imageUrl);
    }
  }

  async uploadCoverImage(
    templateId: string,
    familyId: string,
    localUri: string,
  ): Promise<string> {
    const storagePath = `${familyId}/templates/${templateId}.jpg`;

    await this.client.storage.from("vacation-covers").remove([storagePath]);

    const base64 = await FileSystem.readAsStringAsync(localUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const { error } = await this.client.storage
      .from("vacation-covers")
      .upload(storagePath, bytes, { contentType: "image/jpeg", upsert: true });

    if (error) {
      logger.error(
        "VacationTemplateRepository",
        "uploadCoverImage failed",
        error,
      );
      throw new Error(`Erro ao carregar imagem: ${error.message}`);
    }

    const { data } = this.client.storage
      .from("vacation-covers")
      .getPublicUrl(storagePath);
    return data.publicUrl;
  }

  async isImageInUse(imageUrl: string): Promise<boolean> {
    const { count: vacCount } = await this.client
      .from("vacations")
      .select("id", { count: "exact", head: true })
      .eq("cover_image_url", imageUrl);
    if ((vacCount ?? 0) > 0) return true;

    const { count: tplCount } = await this.client
      .from("vacation_templates")
      .select("id", { count: "exact", head: true })
      .eq("cover_image_url", imageUrl);
    return (tplCount ?? 0) > 0;
  }

  private async tryDeleteUnusedImage(imageUrl: string): Promise<void> {
    try {
      if (await this.isImageInUse(imageUrl)) return;

      const marker = "/vacation-covers/";
      const idx = imageUrl.indexOf(marker);
      if (idx === -1) return;
      const storagePath = imageUrl.substring(idx + marker.length);

      await this.client.storage.from("vacation-covers").remove([storagePath]);
      logger.info(
        "VacationTemplateRepository",
        `Deleted unused image: ${storagePath}`,
      );
    } catch (err) {
      logger.error(
        "VacationTemplateRepository",
        "tryDeleteUnusedImage failed",
        err,
      );
    }
  }
}
