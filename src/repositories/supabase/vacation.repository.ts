import * as FileSystem from "expo-file-system/legacy";
import { SupabaseClient } from "@supabase/supabase-js";
import { IVacationRepository } from "../interfaces/vacation.repository.interface";
import {
  Vacation,
  VacationLifecycle,
  BookingTaskType,
  CreateVacationInput,
  VacationParticipant,
  BookingTask,
  CreateBookingTaskInput,
  VacationBag,
} from "../../types/vacation.types";
import { logger } from "../../utils/logger";
import { uuid } from "../../utils/uuid";

function subtractDays(isoDate: string, days: number): string {
  const d = new Date(isoDate + "T00:00:00");
  d.setDate(d.getDate() - days);
  return d.toISOString().split("T")[0];
}

const VACATION_COLS =
  "id, family_id, title, country_code, destination, cover_image_url, departure_date, return_date, lifecycle, is_pinned, created_at, updated_at";

function mapVacation(row: {
  id: string;
  title: string;
  country_code: string;
  destination: string | null;
  cover_image_url: string | null;
  departure_date: string;
  return_date: string;
  lifecycle: string;
  is_pinned: boolean;
  family_id: string;
  created_at: string;
  updated_at: string;
}): Vacation {
  return {
    id: row.id,
    title: row.title,
    countryCode: row.country_code,
    destination: row.destination,
    coverImageUrl: row.cover_image_url,
    departureDate: row.departure_date,
    returnDate: row.return_date,
    lifecycle: row.lifecycle as VacationLifecycle,
    isPinned: row.is_pinned,
    familyId: row.family_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const TASK_COLS =
  "id, vacation_id, family_id, title, task_type, deadline_days, due_date, is_complete, profile_id, created_at, updated_at";

function mapTask(row: {
  id: string;
  vacation_id: string;
  family_id: string;
  title: string;
  task_type: string;
  deadline_days: number | null;
  due_date: string | null;
  is_complete: boolean;
  profile_id: string | null;
  created_at: string;
  updated_at: string;
}): BookingTask {
  return {
    id: row.id,
    vacationId: row.vacation_id,
    familyId: row.family_id,
    title: row.title,
    taskType: row.task_type as BookingTaskType,
    deadlineDays: row.deadline_days,
    dueDate: row.due_date,
    isComplete: row.is_complete,
    profileId: row.profile_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class SupabaseVacationRepository implements IVacationRepository {
  constructor(private readonly client: SupabaseClient) {}

  async getVacations(familyId: string): Promise<Vacation[]> {
    const { data, error } = await this.client
      .from("vacations")
      .select(VACATION_COLS)
      .eq("family_id", familyId)
      .order("departure_date");

    if (error) {
      logger.error("VacationRepository", "getVacations failed", error);
      throw new Error(`Erro ao carregar viagens: ${error.message}`);
    }

    return (data ?? []).map(mapVacation);
  }

  async getVacationsPaginated(
    familyId: string,
    limit: number,
    offset: number,
    filters: {
      search?: string;
      profileId?: string | null;
      tagId?: string | null;
    },
  ): Promise<Vacation[]> {
    try {
      // Pre-compute id whitelist from join filters
      let restrictIds: string[] | null = null;

      const intersect = (ids: string[]) => {
        if (restrictIds === null) restrictIds = ids;
        else {
          const set = new Set(ids);
          restrictIds = restrictIds.filter((id) => set.has(id));
        }
      };

      if (filters.profileId) {
        const { data, error } = await this.client
          .from("vacation_participants")
          .select("vacation_id")
          .eq("profile_id", filters.profileId);
        if (error) throw error;
        intersect(
          Array.from(new Set((data ?? []).map((r: any) => r.vacation_id))),
        );
        if (restrictIds!.length === 0) return [];
      }

      if (filters.tagId) {
        const { data, error } = await this.client
          .from("vacation_tags")
          .select("vacation_id")
          .eq("tag_id", filters.tagId);
        if (error) throw error;
        intersect(
          Array.from(new Set((data ?? []).map((r: any) => r.vacation_id))),
        );
        if (restrictIds!.length === 0) return [];
      }

      let query = this.client
        .from("vacations")
        .select(VACATION_COLS)
        .eq("family_id", familyId)
        .order("lifecycle_sort", { ascending: true })
        .order("departure_date", { ascending: false });

      if (filters.search && filters.search.trim()) {
        query = query.ilike("title", `%${filters.search.trim()}%`);
      }
      if (restrictIds !== null) query = query.in("id", restrictIds);

      query = query.range(offset, offset + limit - 1);

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []).map(mapVacation);
    } catch (err) {
      logger.error("VacationRepository", "getVacationsPaginated failed", err);
      throw new Error(
        `Erro ao carregar viagens: ${err instanceof Error ? err.message : "Erro"}`,
      );
    }
  }

  async createVacation(input: CreateVacationInput): Promise<Vacation> {
    const { data, error } = await this.client
      .from("vacations")
      .insert({
        family_id: input.familyId,
        title: input.title,
        country_code: input.countryCode,
        destination: input.destination,
        departure_date: input.departureDate,
        return_date: input.returnDate,
        lifecycle: "planning",
        is_pinned: false,
      })
      .select(VACATION_COLS);

    if (error || !data || data.length === 0) {
      logger.error("VacationRepository", "createVacation failed", error);
      throw new Error(
        `Erro ao criar viagem: ${error?.message ?? "Sem resposta"}`,
      );
    }

    const vacation = mapVacation(data[0]);

    // Insert participants
    if (input.participantProfileIds.length > 0) {
      const participantRows = input.participantProfileIds.map((profileId) => ({
        vacation_id: vacation.id,
        profile_id: profileId,
      }));

      const { error: partError } = await this.client
        .from("vacation_participants")
        .insert(participantRows);

      if (partError) {
        logger.error(
          "VacationRepository",
          "createVacation: participants failed",
          partError,
        );
        throw new Error(
          `Erro ao adicionar participantes: ${partError.message}`,
        );
      }
    }

    // Insert vacation tags
    if (input.tagIds && input.tagIds.length > 0) {
      const tagRows = input.tagIds.map((tagId) => ({
        id: uuid(),
        vacation_id: vacation.id,
        tag_id: tagId,
      }));
      const { error: tagError } = await this.client
        .from("vacation_tags")
        .insert(tagRows);
      if (tagError) {
        logger.error(
          "VacationRepository",
          "createVacation: tags failed",
          tagError,
        );
      }
    }

    // Task generation now handled by TaskTemplateRepository.applyTaskTemplates()

    return vacation;
  }

  async updateVacation(
    id: string,
    data: Partial<Omit<Vacation, "id" | "createdAt" | "updatedAt">>,
    participantProfileIds?: string[],
    tagIds?: string[],
  ): Promise<Vacation> {
    const updates: Record<string, unknown> = {};
    if (data.title !== undefined) updates["title"] = data.title;
    if (data.countryCode !== undefined)
      updates["country_code"] = data.countryCode;
    if (data.destination !== undefined)
      updates["destination"] = data.destination;
    if (data.coverImageUrl !== undefined)
      updates["cover_image_url"] = data.coverImageUrl;
    if (data.departureDate !== undefined)
      updates["departure_date"] = data.departureDate;
    if (data.returnDate !== undefined) updates["return_date"] = data.returnDate;
    if (data.lifecycle !== undefined) updates["lifecycle"] = data.lifecycle;
    if (data.isPinned !== undefined) updates["is_pinned"] = data.isPinned;

    const { data: rows, error } = await this.client
      .from("vacations")
      .update(updates)
      .eq("id", id)
      .select(VACATION_COLS);

    if (error || !rows || rows.length === 0) {
      logger.error("VacationRepository", "updateVacation failed", {
        error,
        rowCount: rows?.length,
      });
      throw new Error(
        `Erro ao actualizar viagem: ${error?.message ?? "Viagem não encontrada"}`,
      );
    }

    // Sync participants if provided
    if (participantProfileIds !== undefined) {
      // Delete all existing
      const { error: delError } = await this.client
        .from("vacation_participants")
        .delete()
        .eq("vacation_id", id);

      if (delError) {
        logger.error(
          "VacationRepository",
          "updateVacation: delete participants failed",
          delError,
        );
      }

      // Re-insert
      if (participantProfileIds.length > 0) {
        const participantRows = participantProfileIds.map((profileId) => ({
          vacation_id: id,
          profile_id: profileId,
        }));

        const { error: insError } = await this.client
          .from("vacation_participants")
          .insert(participantRows);

        if (insError) {
          logger.error(
            "VacationRepository",
            "updateVacation: insert participants failed",
            insError,
          );
        }
      }
    }

    // Sync tags if provided
    if (tagIds !== undefined) {
      await this.client.from("vacation_tags").delete().eq("vacation_id", id);
      if (tagIds.length > 0) {
        const tagRows = tagIds.map((tagId) => ({
          id: uuid(),
          vacation_id: id,
          tag_id: tagId,
        }));
        await this.client.from("vacation_tags").insert(tagRows);
      }
    }

    return mapVacation(rows[0]);
  }

  async getVacationTags(vacationId: string): Promise<string[]> {
    try {
      const { data, error } = await this.client
        .from("vacation_tags")
        .select("tag_id")
        .eq("vacation_id", vacationId);
      if (error) throw error;
      return (data ?? []).map((r) => r.tag_id as string);
    } catch (err) {
      logger.error("VacationRepository", "getVacationTags failed", err);
      throw new Error(
        `Erro ao carregar etiquetas da viagem: ${err instanceof Error ? err.message : "Erro"}`,
      );
    }
  }

  async deleteVacation(id: string): Promise<void> {
    // Supabase CASCADE handles cleanup of related tables
    const { error } = await this.client.from("vacations").delete().eq("id", id);
    if (error) {
      logger.error("VacationRepository", "deleteVacation failed", error);
      throw new Error(`Erro ao eliminar viagem: ${error.message}`);
    }
  }

  async getParticipants(vacationId: string): Promise<VacationParticipant[]> {
    const { data, error } = await this.client
      .from("vacation_participants")
      .select("vacation_id, profile_id, created_at")
      .eq("vacation_id", vacationId);

    if (error) {
      logger.error("VacationRepository", "getParticipants failed", error);
      throw new Error(`Erro ao carregar participantes: ${error.message}`);
    }

    return (data ?? []).map((row) => ({
      vacationId: row.vacation_id,
      profileId: row.profile_id,
      createdAt: row.created_at,
    }));
  }

  async uploadCoverImage(
    vacationId: string,
    familyId: string,
    localUri: string,
  ): Promise<string> {
    // Check if old image is used elsewhere before deleting
    const { data: oldRows } = await this.client
      .from("vacations")
      .select("cover_image_url")
      .eq("id", vacationId);
    const oldUrl =
      oldRows && oldRows.length > 0 ? oldRows[0].cover_image_url : null;

    const storagePath = `${familyId}/${vacationId}.jpg`;

    // Only remove old file if it's not reused by another vacation or template
    if (oldUrl) {
      const inUse = await this.isImageInUse(oldUrl, vacationId);
      if (!inUse) {
        await this.client.storage.from("vacation-covers").remove([storagePath]);
      }
    } else {
      await this.client.storage.from("vacation-covers").remove([storagePath]);
    }

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
      logger.error("VacationRepository", "uploadCoverImage failed", error);
      throw new Error(`Erro ao carregar imagem: ${error.message}`);
    }

    const { data } = this.client.storage
      .from("vacation-covers")
      .getPublicUrl(storagePath);
    return data.publicUrl;
  }

  // ── Booking tasks ────────────────────────────────────────────────────────

  async getBookingTasks(vacationId: string): Promise<BookingTask[]> {
    try {
      const { data, error } = await this.client
        .from("booking_tasks")
        .select("*")
        .eq("vacation_id", vacationId)
        .order("is_complete", { ascending: true })
        .order("due_date", { ascending: true });
      if (error) throw error;
      return (data ?? []).map((r: any) => mapTask(r));
    } catch (err) {
      logger.error("VacationRepository", "getBookingTasks failed", err);
      throw new Error(
        `Erro ao carregar tarefas: ${err instanceof Error ? err.message : "Erro"}`,
      );
    }
  }

  async createBookingTask(input: CreateBookingTaskInput): Promise<BookingTask> {
    try {
      const { data, error } = await this.client
        .from("booking_tasks")
        .insert({
          id: uuid(),
          vacation_id: input.vacationId,
          family_id: input.familyId,
          title: input.title,
          task_type: input.taskType,
          deadline_days: input.deadlineDays ?? null,
          due_date: input.dueDate ?? null,
          is_complete: false,
          profile_id: input.profileId ?? null,
        })
        .select()
        .single();
      if (error || !data) throw error ?? new Error("No data returned");
      return mapTask(data);
    } catch (err) {
      logger.error("VacationRepository", "createBookingTask failed", err);
      throw new Error(
        `Erro ao criar tarefa: ${err instanceof Error ? err.message : "Erro"}`,
      );
    }
  }

  async updateBookingTask(
    id: string,
    data: Partial<
      Pick<BookingTask, "title" | "dueDate" | "isComplete" | "profileId">
    >,
  ): Promise<BookingTask> {
    try {
      const updates: Record<string, unknown> = {};
      if (data.title !== undefined) updates.title = data.title;
      if (data.dueDate !== undefined) updates.due_date = data.dueDate;
      if (data.isComplete !== undefined) updates.is_complete = data.isComplete;
      if (data.profileId !== undefined) updates.profile_id = data.profileId;

      const { data: rows, error } = await this.client
        .from("booking_tasks")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error || !rows) throw error ?? new Error("Tarefa não encontrada");
      return mapTask(rows);
    } catch (err) {
      logger.error("VacationRepository", "updateBookingTask failed", err);
      throw new Error(
        `Erro ao actualizar tarefa: ${err instanceof Error ? err.message : "Erro"}`,
      );
    }
  }

  async deleteBookingTask(id: string): Promise<void> {
    try {
      const { error } = await this.client
        .from("booking_tasks")
        .delete()
        .eq("id", id);
      if (error) throw error;
    } catch (err) {
      logger.error("VacationRepository", "deleteBookingTask failed", err);
      throw new Error(
        `Erro ao eliminar tarefa: ${err instanceof Error ? err.message : "Erro"}`,
      );
    }
  }

  /** Check if an image URL is used by any vacation (excluding excludeId) or vacation template */
  private async isImageInUse(
    imageUrl: string,
    excludeId?: string,
  ): Promise<boolean> {
    let query = this.client
      .from("vacations")
      .select("id", { count: "exact", head: true })
      .eq("cover_image_url", imageUrl);
    if (excludeId) query = query.neq("id", excludeId);
    const { count: vacCount } = await query;
    if ((vacCount ?? 0) > 0) return true;

    const { count: tplCount } = await this.client
      .from("vacation_templates")
      .select("id", { count: "exact", head: true })
      .eq("cover_image_url", imageUrl);
    return (tplCount ?? 0) > 0;
  }

  // ── Vacation bags ───────────────────────────────────────────────────

  async getVacationBags(vacationId: string): Promise<VacationBag[]> {
    const { data, error } = await this.client
      .from("vacation_bags")
      .select("*")
      .eq("vacation_id", vacationId);
    if (error) throw error;
    return (data ?? []).map((r) => ({
      id: r.id,
      bagTemplateId: r.bag_template_id,
      isTopLevel: !!r.is_top_level,
    }));
  }

  async addVacationBag(
    vacationId: string,
    bagTemplateId: string,
    isTopLevel: boolean,
  ): Promise<VacationBag> {
    const { data, error } = await this.client
      .from("vacation_bags")
      .insert({
        id: uuid(),
        vacation_id: vacationId,
        bag_template_id: bagTemplateId,
        is_top_level: isTopLevel,
      })
      .select()
      .single();
    if (error) throw error;
    return {
      id: data.id,
      bagTemplateId: data.bag_template_id,
      isTopLevel: !!data.is_top_level,
    };
  }

  async removeVacationBag(vacationBagId: string): Promise<void> {
    const { error } = await this.client
      .from("vacation_bags")
      .delete()
      .eq("id", vacationBagId);
    if (error) throw error;
  }

  async updateVacationBagTopLevel(
    vacationBagId: string,
    isTopLevel: boolean,
  ): Promise<void> {
    const { error } = await this.client
      .from("vacation_bags")
      .update({ is_top_level: isTopLevel })
      .eq("id", vacationBagId);
    if (error) throw error;
  }
}
