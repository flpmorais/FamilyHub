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

    // Auto-generate standard booking tasks
    const standardTasks = [
      { title: 'Voos', task_type: 'flights', deadline_days: 90 },
      { title: 'Hotel', task_type: 'hotel', deadline_days: 60 },
      { title: 'Rent-a-car', task_type: 'car', deadline_days: 30 },
    ];

    const taskRows = standardTasks.map((t) => ({
      vacation_id: vacation.id,
      family_id: input.familyId,
      title: t.title,
      task_type: t.task_type,
      deadline_days: t.deadline_days,
      due_date: subtractDays(input.departureDate, t.deadline_days),
      is_complete: false,
    }));

    const { error: taskError } = await this.client.from('booking_tasks').insert(taskRows);
    if (taskError) {
      logger.error('VacationRepository', 'createVacation: booking tasks failed', taskError);
    }

    // Auto-generate document check tasks per participant
    if (input.participantProfileIds.length > 0) {
      const { data: profileRows } = await this.client
        .from('profiles')
        .select('id, display_name')
        .in('id', input.participantProfileIds);

      const docCheckTasks = (profileRows ?? []).map((p) => ({
        vacation_id: vacation.id,
        family_id: input.familyId,
        title: `Verificar documentos — ${p.display_name}`,
        task_type: 'document_check',
        deadline_days: 14,
        due_date: subtractDays(input.departureDate, 14),
        is_complete: false,
        profile_id: p.id,
      }));

      if (docCheckTasks.length > 0) {
        const { error: docError } = await this.client.from('booking_tasks').insert(docCheckTasks);
        if (docError) {
          logger.error('VacationRepository', 'createVacation: doc check tasks failed', docError);
        }
      }
    }

    return vacation;
  }

  async updateVacation(
    id: string,
    data: Partial<Omit<Vacation, 'id' | 'createdAt' | 'updatedAt'>>,
    participantProfileIds?: string[]
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

    return mapVacation(rows[0]);
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
    const { data, error } = await this.client
      .from('booking_tasks')
      .select(TASK_COLS)
      .eq('vacation_id', vacationId)
      .order('is_complete')
      .order('due_date', { nullsFirst: false });

    if (error) {
      logger.error('VacationRepository', 'getBookingTasks failed', error);
      throw new Error(`Erro ao carregar tarefas: ${error.message}`);
    }

    return (data ?? []).map(mapTask);
  }

  async createBookingTask(input: CreateBookingTaskInput): Promise<BookingTask> {
    const { data, error } = await this.client
      .from('booking_tasks')
      .insert({
        vacation_id: input.vacationId,
        family_id: input.familyId,
        title: input.title,
        task_type: input.taskType,
        deadline_days: input.deadlineDays ?? null,
        due_date: input.dueDate ?? null,
        is_complete: false,
        profile_id: input.profileId ?? null,
      })
      .select(TASK_COLS);

    if (error || !data || data.length === 0) {
      logger.error('VacationRepository', 'createBookingTask failed', error);
      throw new Error(`Erro ao criar tarefa: ${error?.message ?? 'Sem resposta'}`);
    }

    return mapTask(data[0]);
  }

  async updateBookingTask(
    id: string,
    data: Partial<Pick<BookingTask, 'title' | 'dueDate' | 'isComplete'>>
  ): Promise<BookingTask> {
    const updates: Record<string, unknown> = {};
    if (data.title !== undefined) updates['title'] = data.title;
    if (data.dueDate !== undefined) updates['due_date'] = data.dueDate;
    if (data.isComplete !== undefined) updates['is_complete'] = data.isComplete;

    const { data: rows, error } = await this.client
      .from('booking_tasks')
      .update(updates)
      .eq('id', id)
      .select(TASK_COLS);

    if (error || !rows || rows.length === 0) {
      logger.error('VacationRepository', 'updateBookingTask failed', {
        error,
        rowCount: rows?.length,
      });
      throw new Error(`Erro ao actualizar tarefa: ${error?.message ?? 'Tarefa não encontrada'}`);
    }

    return mapTask(rows[0]);
  }

  async deleteBookingTask(id: string): Promise<void> {
    const { error } = await this.client.from('booking_tasks').delete().eq('id', id);
    if (error) {
      logger.error('VacationRepository', 'deleteBookingTask failed', error);
      throw new Error(`Erro ao eliminar tarefa: ${error.message}`);
    }
  }
}
