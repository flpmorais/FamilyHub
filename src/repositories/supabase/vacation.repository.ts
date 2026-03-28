import * as FileSystem from 'expo-file-system/legacy';
import { SupabaseClient } from '@supabase/supabase-js';
import { IVacationRepository } from '../interfaces/vacation.repository.interface';
import {
  Vacation,
  VacationLifecycle,
  BookingTaskType,
  CreateVacationInput,
  VacationParticipant,
  BookingTask,
  CreateBookingTaskInput,
} from '../../types/vacation.types';
import { logger } from '../../utils/logger';
import { powerSyncDb } from '../../utils/powersync.database';
import { uuid } from '../../utils/uuid';

function subtractDays(isoDate: string, days: number): string {
  const d = new Date(isoDate + 'T00:00:00');
  d.setDate(d.getDate() - days);
  return d.toISOString().split('T')[0];
}

const VACATION_COLS =
  'id, family_id, title, country_code, destination, cover_image_url, departure_date, return_date, lifecycle, is_pinned, created_at, updated_at';

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
  'id, vacation_id, family_id, title, task_type, deadline_days, due_date, is_complete, profile_id, created_at, updated_at';

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
      .from('vacations')
      .select(VACATION_COLS)
      .eq('family_id', familyId)
      .order('departure_date');

    if (error) {
      logger.error('VacationRepository', 'getVacations failed', error);
      throw new Error(`Erro ao carregar viagens: ${error.message}`);
    }

    return (data ?? []).map(mapVacation);
  }

  async createVacation(input: CreateVacationInput): Promise<Vacation> {
    const { data, error } = await this.client
      .from('vacations')
      .insert({
        family_id: input.familyId,
        title: input.title,
        country_code: input.countryCode,
        destination: input.destination,
        departure_date: input.departureDate,
        return_date: input.returnDate,
        lifecycle: 'planning',
        is_pinned: false,
      })
      .select(VACATION_COLS);

    if (error || !data || data.length === 0) {
      logger.error('VacationRepository', 'createVacation failed', error);
      throw new Error(`Erro ao criar viagem: ${error?.message ?? 'Sem resposta'}`);
    }

    const vacation = mapVacation(data[0]);

    // Insert participants
    if (input.participantProfileIds.length > 0) {
      const participantRows = input.participantProfileIds.map((profileId) => ({
        vacation_id: vacation.id,
        profile_id: profileId,
      }));

      const { error: partError } = await this.client
        .from('vacation_participants')
        .insert(participantRows);

      if (partError) {
        logger.error('VacationRepository', 'createVacation: participants failed', partError);
        throw new Error(`Erro ao adicionar participantes: ${partError.message}`);
      }
    }

    // Insert vacation categories (via PowerSync to avoid FK issues with locally-created categories)
    if (input.categoryIds && input.categoryIds.length > 0) {
      for (const categoryId of input.categoryIds) {
        await powerSyncDb.execute(
          'INSERT INTO vacation_categories (id, vacation_id, category_id) VALUES (?, ?, ?)',
          [uuid(), vacation.id, categoryId]
        );
      }
    }

    // Insert vacation tags (via PowerSync)
    if (input.tagIds && input.tagIds.length > 0) {
      for (const tagId of input.tagIds) {
        await powerSyncDb.execute(
          'INSERT INTO vacation_tags (id, vacation_id, tag_id) VALUES (?, ?, ?)',
          [uuid(), vacation.id, tagId]
        );
      }
    }

    // Task generation now handled by TaskTemplateRepository.applyTaskTemplates()

    return vacation;
  }

  async updateVacation(
    id: string,
    data: Partial<Omit<Vacation, 'id' | 'createdAt' | 'updatedAt'>>,
    participantProfileIds?: string[],
    categoryIds?: string[],
    tagIds?: string[]
  ): Promise<Vacation> {
    const updates: Record<string, unknown> = {};
    if (data.title !== undefined) updates['title'] = data.title;
    if (data.countryCode !== undefined) updates['country_code'] = data.countryCode;
    if (data.destination !== undefined) updates['destination'] = data.destination;
    if (data.coverImageUrl !== undefined) updates['cover_image_url'] = data.coverImageUrl;
    if (data.departureDate !== undefined) updates['departure_date'] = data.departureDate;
    if (data.returnDate !== undefined) updates['return_date'] = data.returnDate;
    if (data.lifecycle !== undefined) updates['lifecycle'] = data.lifecycle;
    if (data.isPinned !== undefined) updates['is_pinned'] = data.isPinned;

    const { data: rows, error } = await this.client
      .from('vacations')
      .update(updates)
      .eq('id', id)
      .select(VACATION_COLS);

    if (error || !rows || rows.length === 0) {
      logger.error('VacationRepository', 'updateVacation failed', {
        error,
        rowCount: rows?.length,
      });
      throw new Error(`Erro ao actualizar viagem: ${error?.message ?? 'Viagem não encontrada'}`);
    }

    // Sync participants if provided
    if (participantProfileIds !== undefined) {
      // Delete all existing
      const { error: delError } = await this.client
        .from('vacation_participants')
        .delete()
        .eq('vacation_id', id);

      if (delError) {
        logger.error('VacationRepository', 'updateVacation: delete participants failed', delError);
      }

      // Re-insert
      if (participantProfileIds.length > 0) {
        const participantRows = participantProfileIds.map((profileId) => ({
          vacation_id: id,
          profile_id: profileId,
        }));

        const { error: insError } = await this.client
          .from('vacation_participants')
          .insert(participantRows);

        if (insError) {
          logger.error(
            'VacationRepository',
            'updateVacation: insert participants failed',
            insError
          );
        }
      }
    }

    // Sync categories if provided (via PowerSync)
    if (categoryIds !== undefined) {
      await powerSyncDb.execute('DELETE FROM vacation_categories WHERE vacation_id = ?', [id]);
      for (const categoryId of categoryIds) {
        await powerSyncDb.execute(
          'INSERT INTO vacation_categories (id, vacation_id, category_id) VALUES (?, ?, ?)',
          [uuid(), id, categoryId]
        );
      }
    }

    // Sync tags if provided (via PowerSync)
    if (tagIds !== undefined) {
      await powerSyncDb.execute('DELETE FROM vacation_tags WHERE vacation_id = ?', [id]);
      for (const tagId of tagIds) {
        await powerSyncDb.execute(
          'INSERT INTO vacation_tags (id, vacation_id, tag_id) VALUES (?, ?, ?)',
          [uuid(), id, tagId]
        );
      }
    }

    return mapVacation(rows[0]);
  }

  async getVacationCategories(vacationId: string): Promise<string[]> {
    try {
      const rows = await powerSyncDb.getAll(
        'SELECT category_id FROM vacation_categories WHERE vacation_id = ?',
        [vacationId]
      );
      return rows.map((r: any) => r.category_id as string);
    } catch (err) {
      logger.error('VacationRepository', 'getVacationCategories failed', err);
      throw new Error(`Erro ao carregar categorias da viagem: ${err instanceof Error ? err.message : 'Erro'}`);
    }
  }

  async getVacationTags(vacationId: string): Promise<string[]> {
    try {
      const rows = await powerSyncDb.getAll(
        'SELECT tag_id FROM vacation_tags WHERE vacation_id = ?',
        [vacationId]
      );
      return rows.map((r: any) => r.tag_id as string);
    } catch (err) {
      logger.error('VacationRepository', 'getVacationTags failed', err);
      throw new Error(`Erro ao carregar etiquetas da viagem: ${err instanceof Error ? err.message : 'Erro'}`);
    }
  }

  async deleteVacation(id: string): Promise<void> {
    const { error } = await this.client.from('vacations').delete().eq('id', id);
    if (error) {
      logger.error('VacationRepository', 'deleteVacation failed', error);
      throw new Error(`Erro ao eliminar viagem: ${error.message}`);
    }
  }

  async getParticipants(vacationId: string): Promise<VacationParticipant[]> {
    const { data, error } = await this.client
      .from('vacation_participants')
      .select('vacation_id, profile_id, created_at')
      .eq('vacation_id', vacationId);

    if (error) {
      logger.error('VacationRepository', 'getParticipants failed', error);
      throw new Error(`Erro ao carregar participantes: ${error.message}`);
    }

    return (data ?? []).map((row) => ({
      vacationId: row.vacation_id,
      profileId: row.profile_id,
      createdAt: row.created_at,
    }));
  }

  async uploadCoverImage(vacationId: string, familyId: string, localUri: string): Promise<string> {
    const storagePath = `${familyId}/${vacationId}.jpg`;

    await this.client.storage.from('vacation-covers').remove([storagePath]);

    const base64 = await FileSystem.readAsStringAsync(localUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const { error } = await this.client.storage
      .from('vacation-covers')
      .upload(storagePath, bytes, { contentType: 'image/jpeg', upsert: true });

    if (error) {
      logger.error('VacationRepository', 'uploadCoverImage failed', error);
      throw new Error(`Erro ao carregar imagem: ${error.message}`);
    }

    const { data } = this.client.storage.from('vacation-covers').getPublicUrl(storagePath);
    return data.publicUrl;
  }

  // ── Booking tasks ────────────────────────────────────────────────────────

  async getBookingTasks(vacationId: string): Promise<BookingTask[]> {
    try {
      const rows = await powerSyncDb.getAll(
        `SELECT ${TASK_COLS} FROM booking_tasks WHERE vacation_id = ? ORDER BY is_complete ASC, due_date ASC`,
        [vacationId]
      );
      return rows.map((r: any) => mapTask({ ...r, is_complete: !!r.is_complete }));
    } catch (err) {
      logger.error('VacationRepository', 'getBookingTasks failed', err);
      throw new Error(`Erro ao carregar tarefas: ${err instanceof Error ? err.message : 'Erro'}`);
    }
  }

  async createBookingTask(input: CreateBookingTaskInput): Promise<BookingTask> {
    try {
      const id = uuid();
      const now = new Date().toISOString();
      await powerSyncDb.execute(
        `INSERT INTO booking_tasks (id, vacation_id, family_id, title, task_type, deadline_days, due_date, is_complete, profile_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)`,
        [id, input.vacationId, input.familyId, input.title, input.taskType, input.deadlineDays ?? null, input.dueDate ?? null, input.profileId ?? null, now, now]
      );
      return {
        id,
        vacationId: input.vacationId,
        familyId: input.familyId,
        title: input.title,
        taskType: input.taskType as BookingTaskType,
        deadlineDays: input.deadlineDays ?? null,
        dueDate: input.dueDate ?? null,
        isComplete: false,
        profileId: input.profileId ?? null,
        createdAt: now,
        updatedAt: now,
      };
    } catch (err) {
      logger.error('VacationRepository', 'createBookingTask failed', err);
      throw new Error(`Erro ao criar tarefa: ${err instanceof Error ? err.message : 'Erro'}`);
    }
  }

  async updateBookingTask(
    id: string,
    data: Partial<Pick<BookingTask, 'title' | 'dueDate' | 'isComplete'>>
  ): Promise<BookingTask> {
    try {
      const setClauses: string[] = [];
      const values: unknown[] = [];
      if (data.title !== undefined) { setClauses.push('title = ?'); values.push(data.title); }
      if (data.dueDate !== undefined) { setClauses.push('due_date = ?'); values.push(data.dueDate); }
      if (data.isComplete !== undefined) { setClauses.push('is_complete = ?'); values.push(data.isComplete ? 1 : 0); }
      const now = new Date().toISOString();
      setClauses.push('updated_at = ?');
      values.push(now);
      values.push(id);

      await powerSyncDb.execute(
        `UPDATE booking_tasks SET ${setClauses.join(', ')} WHERE id = ?`,
        values
      );

      const rows = await powerSyncDb.getAll(
        `SELECT ${TASK_COLS} FROM booking_tasks WHERE id = ?`,
        [id]
      );
      if (rows.length === 0) throw new Error('Tarefa não encontrada');
      return mapTask({ ...(rows[0] as any), is_complete: !!(rows[0] as any).is_complete });
    } catch (err) {
      logger.error('VacationRepository', 'updateBookingTask failed', err);
      throw new Error(`Erro ao actualizar tarefa: ${err instanceof Error ? err.message : 'Erro'}`);
    }
  }

  async deleteBookingTask(id: string): Promise<void> {
    try {
      await powerSyncDb.execute('DELETE FROM booking_tasks WHERE id = ?', [id]);
    } catch (err) {
      logger.error('VacationRepository', 'deleteBookingTask failed', err);
      throw new Error(`Erro ao eliminar tarefa: ${err instanceof Error ? err.message : 'Erro'}`);
    }
  }
}
