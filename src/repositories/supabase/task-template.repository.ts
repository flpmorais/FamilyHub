import { SupabaseClient } from "@supabase/supabase-js";
import { ITaskTemplateRepository } from "../interfaces/task-template.repository.interface";
import {
  TaskTemplate,
  CreateTaskTemplateInput,
} from "../../types/vacation.types";
import { logger } from "../../utils/logger";
import { uuid } from "../../utils/uuid";

function subtractDays(isoDate: string, days: number): string {
  const d = new Date(isoDate + "T00:00:00");
  d.setDate(d.getDate() - days);
  return d.toISOString().split("T")[0];
}

function mapTaskTemplate(
  row: any,
  tagIds: string[] = [],
  profileIds: string[] = [],
): TaskTemplate {
  return {
    id: row.id,
    familyId: row.family_id,
    title: row.title,
    deadlineDays: Number(row.deadline_days) || 30,
    isAllFamily: row.is_all_family === true,
    active: row.active === true,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    tagIds,
    profileIds,
  };
}

function now(): string {
  return new Date().toISOString();
}

export class SupabaseTaskTemplateRepository implements ITaskTemplateRepository {
  constructor(private readonly client: SupabaseClient) {}

  private async loadTagIds(templateId: string): Promise<string[]> {
    const { data, error } = await this.client
      .from("task_template_tags")
      .select("tag_id")
      .eq("task_template_id", templateId);
    if (error) throw error;
    return (data ?? []).map((r: any) => r.tag_id as string);
  }

  private async saveTags(templateId: string, tagIds: string[]): Promise<void> {
    const { error: delError } = await this.client
      .from("task_template_tags")
      .delete()
      .eq("task_template_id", templateId);
    if (delError) throw delError;

    if (tagIds.length > 0) {
      const rows = tagIds.map((tagId) => ({
        id: uuid(),
        task_template_id: templateId,
        tag_id: tagId,
      }));
      const { error: insError } = await this.client
        .from("task_template_tags")
        .insert(rows);
      if (insError) throw insError;
    }
  }

  private async loadProfileIds(templateId: string): Promise<string[]> {
    const { data, error } = await this.client
      .from("task_template_profiles")
      .select("profile_id")
      .eq("task_template_id", templateId);
    if (error) throw error;
    return (data ?? []).map((r: any) => r.profile_id as string);
  }

  private async saveProfiles(
    templateId: string,
    profileIds: string[],
  ): Promise<void> {
    const { error: delError } = await this.client
      .from("task_template_profiles")
      .delete()
      .eq("task_template_id", templateId);
    if (delError) throw delError;

    if (profileIds.length > 0) {
      const rows = profileIds.map((profileId) => ({
        id: uuid(),
        task_template_id: templateId,
        profile_id: profileId,
      }));
      const { error: insError } = await this.client
        .from("task_template_profiles")
        .insert(rows);
      if (insError) throw insError;
    }
  }

  async getTaskTemplates(familyId: string): Promise<TaskTemplate[]> {
    try {
      const { data: rows, error } = await this.client
        .from("task_templates")
        .select("*")
        .eq("family_id", familyId)
        .order("title");
      if (error) throw error;
      if (!rows || rows.length === 0) return [];

      const ids = rows.map((r: any) => r.id as string);

      const [
        { data: tagRows, error: tagErr },
        { data: profileRows, error: profErr },
      ] = await Promise.all([
        this.client
          .from("task_template_tags")
          .select("task_template_id, tag_id")
          .in("task_template_id", ids),
        this.client
          .from("task_template_profiles")
          .select("task_template_id, profile_id")
          .in("task_template_id", ids),
      ]);
      if (tagErr) throw tagErr;
      if (profErr) throw profErr;

      const tagsByTpl = new Map<string, string[]>();
      for (const r of tagRows ?? []) {
        const list = tagsByTpl.get(r.task_template_id) ?? [];
        list.push(r.tag_id);
        tagsByTpl.set(r.task_template_id, list);
      }

      const profilesByTpl = new Map<string, string[]>();
      for (const r of profileRows ?? []) {
        const list = profilesByTpl.get(r.task_template_id) ?? [];
        list.push(r.profile_id);
        profilesByTpl.set(r.task_template_id, list);
      }

      return rows.map((row: any) =>
        mapTaskTemplate(
          row,
          tagsByTpl.get(row.id) ?? [],
          profilesByTpl.get(row.id) ?? [],
        ),
      );
    } catch (err) {
      logger.error("TaskTemplateRepository", "getTaskTemplates failed", err);
      throw new Error(
        `Erro ao carregar tarefas: ${err instanceof Error ? err.message : "Erro"}`,
      );
    }
  }

  async createTaskTemplate(
    familyId: string,
    input: CreateTaskTemplateInput,
  ): Promise<TaskTemplate> {
    const id = uuid();
    const ts = now();
    try {
      const { error } = await this.client.from("task_templates").insert({
        id,
        family_id: familyId,
        title: input.title,
        deadline_days: input.deadlineDays,
        is_all_family: input.isAllFamily ?? false,
        active: true,
        created_at: ts,
        updated_at: ts,
      });
      if (error) throw error;

      if (input.tagIds && input.tagIds.length > 0)
        await this.saveTags(id, input.tagIds);
      if (input.profileIds && input.profileIds.length > 0)
        await this.saveProfiles(id, input.profileIds);

      const [tagIds, profileIds] = await Promise.all([
        this.loadTagIds(id),
        this.loadProfileIds(id),
      ]);
      const { data: rows, error: selError } = await this.client
        .from("task_templates")
        .select("*")
        .eq("id", id);
      if (selError) throw selError;
      return mapTaskTemplate(rows![0], tagIds, profileIds);
    } catch (err) {
      logger.error("TaskTemplateRepository", "createTaskTemplate failed", err);
      throw new Error(
        `Erro ao criar tarefa: ${err instanceof Error ? err.message : "Erro"}`,
      );
    }
  }

  async updateTaskTemplate(
    id: string,
    data: Partial<
      Pick<TaskTemplate, "title" | "deadlineDays" | "isAllFamily" | "active">
    > & {
      profileIds?: string[];
      tagIds?: string[];
    },
  ): Promise<TaskTemplate> {
    const updates: Record<string, unknown> = { updated_at: now() };
    if (data.title !== undefined) updates.title = data.title;
    if (data.deadlineDays !== undefined)
      updates.deadline_days = data.deadlineDays;
    if (data.isAllFamily !== undefined)
      updates.is_all_family = data.isAllFamily;
    if (data.active !== undefined) updates.active = data.active;

    try {
      const { error } = await this.client
        .from("task_templates")
        .update(updates)
        .eq("id", id);
      if (error) throw error;

      if (data.tagIds !== undefined) await this.saveTags(id, data.tagIds);
      if (data.profileIds !== undefined)
        await this.saveProfiles(id, data.profileIds);

      const [tagIds, profileIds] = await Promise.all([
        this.loadTagIds(id),
        this.loadProfileIds(id),
      ]);
      const { data: rows, error: selError } = await this.client
        .from("task_templates")
        .select("*")
        .eq("id", id);
      if (selError) throw selError;
      if (!rows || rows.length === 0) throw new Error("Tarefa não encontrada");
      return mapTaskTemplate(rows[0], tagIds, profileIds);
    } catch (err) {
      logger.error("TaskTemplateRepository", "updateTaskTemplate failed", err);
      throw new Error(
        `Erro ao actualizar tarefa: ${err instanceof Error ? err.message : "Erro"}`,
      );
    }
  }

  async deleteTaskTemplate(id: string): Promise<void> {
    try {
      const { error: e1 } = await this.client
        .from("task_template_profiles")
        .delete()
        .eq("task_template_id", id);
      if (e1) throw e1;

      const { error: e2 } = await this.client
        .from("task_template_tags")
        .delete()
        .eq("task_template_id", id);
      if (e2) throw e2;

      const { error: e3 } = await this.client
        .from("task_templates")
        .delete()
        .eq("id", id);
      if (e3) throw e3;
    } catch (err) {
      logger.error("TaskTemplateRepository", "deleteTaskTemplate failed", err);
      throw new Error(
        `Erro ao eliminar tarefa: ${err instanceof Error ? err.message : "Erro"}`,
      );
    }
  }

  async applyTaskTemplates(
    familyId: string,
    vacationId: string,
    departureDate: string,
    participantProfileIds: string[],
    vacationTagIds: string[],
  ): Promise<number> {
    try {
      const templates = await this.getTaskTemplates(familyId);
      logger.info(
        "TaskTemplateRepository",
        `applyTaskTemplates: found ${templates.length} task templates, vacationTagIds=${JSON.stringify(vacationTagIds)}`,
      );
      const participantSet = new Set(participantProfileIds);
      const tagSet = new Set(vacationTagIds);
      let count = 0;

      const tasksToInsert: any[] = [];

      for (const tpl of templates) {
        if (!tpl.active) {
          logger.info(
            "TaskTemplateRepository",
            `  skip "${tpl.title}": inactive`,
          );
          continue;
        }
        if (
          tpl.tagIds.length > 0 &&
          !tpl.tagIds.some((tid) => tagSet.has(tid))
        ) {
          logger.info(
            "TaskTemplateRepository",
            `  skip "${tpl.title}": no tag match`,
          );
          continue;
        }
        logger.info(
          "TaskTemplateRepository",
          `  match "${tpl.title}": allFamily=${tpl.isAllFamily}, profiles=${tpl.profileIds.length}`,
        );

        const dueDate = subtractDays(departureDate, tpl.deadlineDays);

        if (tpl.isAllFamily) {
          tasksToInsert.push({
            id: uuid(),
            vacation_id: vacationId,
            family_id: familyId,
            title: tpl.title,
            task_type: "custom",
            deadline_days: tpl.deadlineDays,
            due_date: dueDate,
            is_complete: false,
            profile_id: null,
            created_at: now(),
            updated_at: now(),
          });
          count++;
        } else if (tpl.profileIds.length > 0) {
          for (const profileId of tpl.profileIds) {
            if (participantSet.has(profileId)) {
              tasksToInsert.push({
                id: uuid(),
                vacation_id: vacationId,
                family_id: familyId,
                title: tpl.title,
                task_type: "custom",
                deadline_days: tpl.deadlineDays,
                due_date: dueDate,
                is_complete: false,
                profile_id: profileId,
                created_at: now(),
                updated_at: now(),
              });
              count++;
            }
          }
        } else {
          for (const profileId of participantProfileIds) {
            tasksToInsert.push({
              id: uuid(),
              vacation_id: vacationId,
              family_id: familyId,
              title: tpl.title,
              task_type: "custom",
              deadline_days: tpl.deadlineDays,
              due_date: dueDate,
              is_complete: false,
              profile_id: profileId,
              created_at: now(),
              updated_at: now(),
            });
            count++;
          }
        }
      }

      if (tasksToInsert.length > 0) {
        const { error } = await this.client
          .from("booking_tasks")
          .insert(tasksToInsert);
        if (error) throw error;
      }

      logger.info(
        "TaskTemplateRepository",
        `applyTaskTemplates: injected ${count} tasks for vacation ${vacationId}`,
      );
      return count;
    } catch (err) {
      logger.error("TaskTemplateRepository", "applyTaskTemplates failed", err);
      throw new Error(
        `Erro ao aplicar tarefas: ${err instanceof Error ? err.message : "Erro"}`,
      );
    }
  }
}
