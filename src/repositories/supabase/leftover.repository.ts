import { SupabaseClient } from '@supabase/supabase-js';
import { ILeftoverRepository } from "../interfaces/leftover.repository.interface";
import {
  Leftover,
  CreateLeftoverInput,
  UpdateLeftoverInput,
  LeftoverStatus,
} from "../../types/leftover.types";
import { DEFAULT_EXPIRY_DAYS } from "../../constants/leftover-defaults";
import { logger } from "../../utils/logger";
import { uuid } from "../../utils/uuid";

function mapLeftover(row: any): Leftover {
  return {
    id: row.id,
    familyId: row.family_id,
    name: row.name,
    type: row.type ?? 'meal',
    totalDoses: Number(row.total_doses),
    dosesEaten: Number(row.doses_eaten),
    dosesThrownOut: Number(row.doses_thrown_out),
    expiryDays: Number(row.expiry_days),
    dateAdded: row.date_added,
    expiryDate: row.expiry_date,
    status: row.status as LeftoverStatus,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function now(): string {
  return new Date().toISOString();
}

function computeExpiryDate(dateAdded: string, expiryDays: number): string {
  const d = new Date(dateAdded);
  d.setDate(d.getDate() + expiryDays);
  return d.toISOString();
}

export class SupabaseLeftoverRepository implements ILeftoverRepository {
  constructor(private readonly client: SupabaseClient) {}

  async create(input: CreateLeftoverInput): Promise<Leftover> {
    const id = uuid();
    const ts = now();
    const expiryDays = input.expiryDays ?? DEFAULT_EXPIRY_DAYS;
    const expiryDate = computeExpiryDate(ts, expiryDays);

    try {
      const { data, error } = await this.client
        .from('leftovers')
        .insert({
          id,
          family_id: input.familyId,
          name: input.name,
          type: input.type ?? 'meal',
          total_doses: input.totalDoses,
          doses_eaten: 0,
          doses_thrown_out: 0,
          expiry_days: expiryDays,
          date_added: ts,
          expiry_date: expiryDate,
          status: 'active',
          created_at: ts,
          updated_at: ts,
        })
        .select()
        .single();

      if (error) throw error;
      return mapLeftover(data);
    } catch (err) {
      logger.error("LeftoverRepository", "create failed", err);
      throw new Error(
        `Erro ao criar resto: ${err instanceof Error ? err.message : "Erro"}`,
      );
    }
  }

  async update(id: string, data: UpdateLeftoverInput): Promise<Leftover> {
    const updates: Record<string, unknown> = {};

    if (data.name !== undefined) updates.name = data.name;
    if (data.type !== undefined) updates.type = data.type;
    if (data.totalDoses !== undefined) updates.total_doses = data.totalDoses;
    if (data.expiryDate !== undefined) updates.expiry_date = data.expiryDate;
    if (data.dosesEaten !== undefined) updates.doses_eaten = data.dosesEaten;
    if (data.dosesThrownOut !== undefined) updates.doses_thrown_out = data.dosesThrownOut;

    updates.updated_at = now();

    try {
      // First apply the field updates
      const { error: updateError } = await this.client
        .from('leftovers')
        .update(updates)
        .eq('id', id);

      if (updateError) throw updateError;

      // Re-fetch to get committed values, then recalculate status
      const { data: current, error: fetchError } = await this.client
        .from('leftovers')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;
      if (!current) throw new Error("Resto não encontrado");

      const newStatus: LeftoverStatus =
        current.doses_eaten + current.doses_thrown_out >= current.total_doses
          ? 'closed'
          : 'active';

      if (current.status !== newStatus) {
        const { error: statusError } = await this.client
          .from('leftovers')
          .update({ status: newStatus, updated_at: now() })
          .eq('id', id);

        if (statusError) throw statusError;

        current.status = newStatus;
        current.updated_at = now();
      }

      return mapLeftover(current);
    } catch (err) {
      logger.error("LeftoverRepository", "update failed", err);
      throw new Error(
        `Erro ao actualizar resto: ${err instanceof Error ? err.message : "Erro"}`,
      );
    }
  }

  async delete(id: string): Promise<void> {
    try {
      const { error } = await this.client
        .from('leftovers')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (err) {
      logger.error("LeftoverRepository", "delete failed", err);
      throw new Error(
        `Erro ao eliminar resto: ${err instanceof Error ? err.message : "Erro"}`,
      );
    }
  }

  async getById(id: string): Promise<Leftover> {
    try {
      const { data, error } = await this.client
        .from('leftovers')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      if (!data) throw new Error("Resto não encontrado");
      return mapLeftover(data);
    } catch (err) {
      logger.error("LeftoverRepository", "getById failed", err);
      throw new Error(
        `Erro ao carregar resto: ${err instanceof Error ? err.message : "Erro"}`,
      );
    }
  }

  async getActive(familyId: string): Promise<Leftover[]> {
    try {
      const { data, error } = await this.client
        .from('leftovers')
        .select('*')
        .eq('family_id', familyId)
        .eq('status', 'active')
        .order('expiry_date', { ascending: true });

      if (error) throw error;
      return (data ?? []).map(mapLeftover);
    } catch (err) {
      logger.error("LeftoverRepository", "getActive failed", err);
      throw new Error(
        `Erro ao carregar restos: ${err instanceof Error ? err.message : "Erro"}`,
      );
    }
  }

  async getClosedPaginated(
    familyId: string,
    limit: number,
    offset: number,
  ): Promise<Leftover[]> {
    try {
      const { data, error } = await this.client
        .from('leftovers')
        .select('*')
        .eq('family_id', familyId)
        .eq('status', 'closed')
        .order('updated_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;
      return (data ?? []).map(mapLeftover);
    } catch (err) {
      logger.error("LeftoverRepository", "getClosedPaginated failed", err);
      throw new Error(
        `Erro ao carregar restos: ${err instanceof Error ? err.message : "Erro"}`,
      );
    }
  }

  async incrementEaten(id: string): Promise<Leftover> {
    try {
      // Fetch current row to check preconditions and compute new values
      const { data: current, error: fetchError } = await this.client
        .from('leftovers')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;
      if (!current) throw new Error("Resto não encontrado");

      // Only increment if active and doses remaining
      if (current.status !== 'active' || current.doses_eaten + current.doses_thrown_out >= current.total_doses) {
        return mapLeftover(current);
      }

      const newDosesEaten = current.doses_eaten + 1;
      const newStatus: LeftoverStatus =
        newDosesEaten + current.doses_thrown_out >= current.total_doses
          ? 'closed'
          : 'active';

      const ts = now();
      const { data: updated, error: updateError } = await this.client
        .from('leftovers')
        .update({
          doses_eaten: newDosesEaten,
          status: newStatus,
          updated_at: ts,
        })
        .eq('id', id)
        .select()
        .single();

      if (updateError) throw updateError;
      return mapLeftover(updated);
    } catch (err) {
      logger.error("LeftoverRepository", "incrementEaten failed", err);
      throw new Error(
        `Erro ao registar dose: ${err instanceof Error ? err.message : "Erro"}`,
      );
    }
  }

  async throwOutRemaining(id: string): Promise<Leftover> {
    try {
      // Fetch current row to compute doses_thrown_out
      const { data: current, error: fetchError } = await this.client
        .from('leftovers')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;
      if (!current) throw new Error("Resto não encontrado");

      if (current.status !== 'active') {
        return mapLeftover(current);
      }

      const ts = now();
      const { data: updated, error: updateError } = await this.client
        .from('leftovers')
        .update({
          doses_thrown_out: current.total_doses - current.doses_eaten,
          status: 'closed',
          updated_at: ts,
        })
        .eq('id', id)
        .select()
        .single();

      if (updateError) throw updateError;
      return mapLeftover(updated);
    } catch (err) {
      logger.error("LeftoverRepository", "throwOutRemaining failed", err);
      throw new Error(
        `Erro ao descartar resto: ${err instanceof Error ? err.message : "Erro"}`,
      );
    }
  }
}
