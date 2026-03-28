import { ITaskTemplateRepository } from '../interfaces/task-template.repository.interface';
import { TaskTemplate, CreateTaskTemplateInput } from '../../types/vacation.types';
import { powerSyncDb } from '../../utils/powersync.database';
import { logger } from '../../utils/logger';
import { uuid } from '../../utils/uuid';

function subtractDays(isoDate: string, days: number): string {
  const d = new Date(isoDate + 'T00:00:00');
  d.setDate(d.getDate() - days);
  return d.toISOString().split('T')[0];
}

function mapTaskTemplate(row: any, tagIds: string[] = [], profileIds: string[] = []): TaskTemplate {
  return {
    id: row.id,
    familyId: row.family_id,
    title: row.title,
    deadlineDays: Number(row.deadline_days) || 30,
    isAllFamily: row.is_all_family === 1 || row.is_all_family === true,
    active: row.active === 1 || row.active === true,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    tagIds,
    profileIds,
  };
}

function now(): string {
  return new Date().toISOString();
}

async function loadTagIds(templateId: string): Promise<string[]> {
  const rows = await powerSyncDb.getAll(
    'SELECT tag_id FROM task_template_tags WHERE task_template_id = ?',
    [templateId]
  );
  return rows.map((r: any) => r.tag_id as string);
}

async function saveTags(templateId: string, tagIds: string[]): Promise<void> {
  await powerSyncDb.execute('DELETE FROM task_template_tags WHERE task_template_id = ?', [templateId]);
  for (const tagId of tagIds) {
    await powerSyncDb.execute(
      'INSERT INTO task_template_tags (id, task_template_id, tag_id) VALUES (?, ?, ?)',
      [uuid(), templateId, tagId]
    );
  }
}

async function loadProfileIds(templateId: string): Promise<string[]> {
  const rows = await powerSyncDb.getAll(
    'SELECT profile_id FROM task_template_profiles WHERE task_template_id = ?',
    [templateId]
  );
  return rows.map((r: any) => r.profile_id as string);
}

async function saveProfiles(templateId: string, profileIds: string[]): Promise<void> {
  await powerSyncDb.execute('DELETE FROM task_template_profiles WHERE task_template_id = ?', [templateId]);
  for (const profileId of profileIds) {
    await powerSyncDb.execute(
      'INSERT INTO task_template_profiles (id, task_template_id, profile_id) VALUES (?, ?, ?)',
      [uuid(), templateId, profileId]
    );
  }
}

export class SupabaseTaskTemplateRepository implements ITaskTemplateRepository {
  async getTaskTemplates(familyId: string): Promise<TaskTemplate[]> {
    try {
      const rows = await powerSyncDb.getAll(
        'SELECT * FROM task_templates WHERE family_id = ? ORDER BY title',
        [familyId]
      );
      const items: TaskTemplate[] = [];
      for (const row of rows as any[]) {
        const [tagIds, profileIds] = await Promise.all([loadTagIds(row.id), loadProfileIds(row.id)]);
        items.push(mapTaskTemplate(row, tagIds, profileIds));
      }
      return items;
    } catch (err) {
      logger.error('TaskTemplateRepository', 'getTaskTemplates failed', err);
      throw new Error(`Erro ao carregar tarefas: ${err instanceof Error ? err.message : 'Erro'}`);
    }
  }

  async createTaskTemplate(familyId: string, input: CreateTaskTemplateInput): Promise<TaskTemplate> {
    const id = uuid();
    const ts = now();
    try {
      await powerSyncDb.execute(
        'INSERT INTO task_templates (id, family_id, title, deadline_days, is_all_family, active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 1, ?, ?)',
        [id, familyId, input.title, input.deadlineDays, input.isAllFamily ? 1 : 0, ts, ts]
      );
      if (input.tagIds && input.tagIds.length > 0) await saveTags(id, input.tagIds);
      if (input.profileIds && input.profileIds.length > 0) await saveProfiles(id, input.profileIds);
      const [tagIds, profileIds] = await Promise.all([loadTagIds(id), loadProfileIds(id)]);
      const rows = await powerSyncDb.getAll('SELECT * FROM task_templates WHERE id = ?', [id]);
      return mapTaskTemplate(rows[0], tagIds, profileIds);
    } catch (err) {
      logger.error('TaskTemplateRepository', 'createTaskTemplate failed', err);
      throw new Error(`Erro ao criar tarefa: ${err instanceof Error ? err.message : 'Erro'}`);
    }
  }

  async updateTaskTemplate(
    id: string,
    data: Partial<Pick<TaskTemplate, 'title' | 'deadlineDays' | 'isAllFamily' | 'active'>> & {
      profileIds?: string[];
      tagIds?: string[];
    }
  ): Promise<TaskTemplate> {
    const sets: string[] = [];
    const params: unknown[] = [];
    if (data.title !== undefined) { sets.push('title = ?'); params.push(data.title); }
    if (data.deadlineDays !== undefined) { sets.push('deadline_days = ?'); params.push(data.deadlineDays); }
    if (data.isAllFamily !== undefined) { sets.push('is_all_family = ?'); params.push(data.isAllFamily ? 1 : 0); }
    if (data.active !== undefined) { sets.push('active = ?'); params.push(data.active ? 1 : 0); }
    sets.push('updated_at = ?');
    params.push(now());
    params.push(id);

    try {
      await powerSyncDb.execute(`UPDATE task_templates SET ${sets.join(', ')} WHERE id = ?`, params);
      if (data.tagIds !== undefined) await saveTags(id, data.tagIds);
      if (data.profileIds !== undefined) await saveProfiles(id, data.profileIds);
      const [tagIds, profileIds] = await Promise.all([loadTagIds(id), loadProfileIds(id)]);
      const rows = await powerSyncDb.getAll('SELECT * FROM task_templates WHERE id = ?', [id]);
      if (rows.length === 0) throw new Error('Tarefa não encontrada');
      return mapTaskTemplate(rows[0], tagIds, profileIds);
    } catch (err) {
      logger.error('TaskTemplateRepository', 'updateTaskTemplate failed', err);
      throw new Error(`Erro ao actualizar tarefa: ${err instanceof Error ? err.message : 'Erro'}`);
    }
  }

  async deleteTaskTemplate(id: string): Promise<void> {
    try {
      await powerSyncDb.execute('DELETE FROM task_template_profiles WHERE task_template_id = ?', [id]);
      await powerSyncDb.execute('DELETE FROM task_template_tags WHERE task_template_id = ?', [id]);
      await powerSyncDb.execute('DELETE FROM task_templates WHERE id = ?', [id]);
    } catch (err) {
      logger.error('TaskTemplateRepository', 'deleteTaskTemplate failed', err);
      throw new Error(`Erro ao eliminar tarefa: ${err instanceof Error ? err.message : 'Erro'}`);
    }
  }

  async applyTaskTemplates(
    familyId: string,
    vacationId: string,
    departureDate: string,
    participantProfileIds: string[],
    vacationTagIds: string[]
  ): Promise<number> {
    try {
      const templates = await this.getTaskTemplates(familyId);
      logger.info('TaskTemplateRepository', `applyTaskTemplates: found ${templates.length} task templates, vacationTagIds=${JSON.stringify(vacationTagIds)}`);
      const participantSet = new Set(participantProfileIds);
      const tagSet = new Set(vacationTagIds);
      let count = 0;

      for (const tpl of templates) {
        if (!tpl.active) { logger.info('TaskTemplateRepository', `  skip "${tpl.title}": inactive`); continue; }
        if (tpl.tagIds.length > 0 && !tpl.tagIds.some((tid) => tagSet.has(tid))) { logger.info('TaskTemplateRepository', `  skip "${tpl.title}": no tag match`); continue; }
        logger.info('TaskTemplateRepository', `  match "${tpl.title}": allFamily=${tpl.isAllFamily}, profiles=${tpl.profileIds.length}`);

        const dueDate = subtractDays(departureDate, tpl.deadlineDays);

        if (tpl.isAllFamily) {
          const id = uuid();
          const ts = now();
          await powerSyncDb.execute(
            `INSERT INTO booking_tasks (id, vacation_id, family_id, title, task_type, deadline_days, due_date, is_complete, profile_id, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)`,
            [id, vacationId, familyId, tpl.title, 'custom', tpl.deadlineDays, dueDate, null, ts, ts]
          );
          count++;
        } else if (tpl.profileIds.length > 0) {
          for (const profileId of tpl.profileIds) {
            if (participantSet.has(profileId)) {
              const id = uuid();
              const ts = now();
              await powerSyncDb.execute(
                `INSERT INTO booking_tasks (id, vacation_id, family_id, title, task_type, deadline_days, due_date, is_complete, profile_id, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)`,
                [id, vacationId, familyId, tpl.title, 'custom', tpl.deadlineDays, dueDate, profileId, ts, ts]
              );
              count++;
            }
          }
        } else {
          for (const profileId of participantProfileIds) {
            const id = uuid();
            const ts = now();
            await powerSyncDb.execute(
              `INSERT INTO booking_tasks (id, vacation_id, family_id, title, task_type, deadline_days, due_date, is_complete, profile_id, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)`,
              [id, vacationId, familyId, tpl.title, 'custom', tpl.deadlineDays, dueDate, profileId, ts, ts]
            );
            count++;
          }
        }
      }

      logger.info('TaskTemplateRepository', `applyTaskTemplates: injected ${count} tasks for vacation ${vacationId}`);
      return count;
    } catch (err) {
      logger.error('TaskTemplateRepository', 'applyTaskTemplates failed', err);
      throw new Error(`Erro ao aplicar tarefas: ${err instanceof Error ? err.message : 'Erro'}`);
    }
  }
}
