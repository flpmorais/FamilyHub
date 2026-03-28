import { ILeftoverRepository } from "../interfaces/leftover.repository.interface";
import {
  Leftover,
  CreateLeftoverInput,
  UpdateLeftoverInput,
  LeftoverStatus,
} from "../../types/leftover.types";
import { DEFAULT_EXPIRY_DAYS } from "../../constants/leftover-defaults";
import { powerSyncDb } from "../../utils/powersync.database";
import { logger } from "../../utils/logger";
import { uuid } from "../../utils/uuid";

function mapLeftover(row: any): Leftover {
  return {
    id: row.id,
    familyId: row.family_id,
    name: row.name,
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
  async create(input: CreateLeftoverInput): Promise<Leftover> {
    const id = uuid();
    const ts = now();
    const expiryDays = input.expiryDays ?? DEFAULT_EXPIRY_DAYS;
    const expiryDate = computeExpiryDate(ts, expiryDays);

    try {
      await powerSyncDb.execute(
        `INSERT INTO leftovers (id, family_id, name, total_doses, doses_eaten, doses_thrown_out, expiry_days, date_added, expiry_date, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, 0, 0, ?, ?, ?, 'active', ?, ?)`,
        [
          id,
          input.familyId,
          input.name,
          input.totalDoses,
          expiryDays,
          ts,
          expiryDate,
          ts,
          ts,
        ],
      );
      const rows = await powerSyncDb.getAll(
        "SELECT * FROM leftovers WHERE id = ?",
        [id],
      );
      return mapLeftover(rows[0]);
    } catch (err) {
      logger.error("LeftoverRepository", "create failed", err);
      throw new Error(
        `Erro ao criar resto: ${err instanceof Error ? err.message : "Erro"}`,
      );
    }
  }

  async update(id: string, data: UpdateLeftoverInput): Promise<Leftover> {
    const sets: string[] = [];
    const params: unknown[] = [];

    if (data.name !== undefined) {
      sets.push("name = ?");
      params.push(data.name);
    }
    if (data.totalDoses !== undefined) {
      sets.push("total_doses = ?");
      params.push(data.totalDoses);
    }
    if (data.expiryDate !== undefined) {
      sets.push("expiry_date = ?");
      params.push(data.expiryDate);
    }
    if (data.dosesEaten !== undefined) {
      sets.push("doses_eaten = ?");
      params.push(data.dosesEaten);
    }
    if (data.dosesThrownOut !== undefined) {
      sets.push("doses_thrown_out = ?");
      params.push(data.dosesThrownOut);
    }

    sets.push("updated_at = ?");
    params.push(now());

    params.push(id);

    try {
      await powerSyncDb.execute(
        `UPDATE leftovers SET ${sets.join(", ")} WHERE id = ?`,
        params,
      );

      // Recalculate status from committed values (separate UPDATE so it reads
      // the new column values, not the pre-UPDATE originals)
      const ts = now();
      await powerSyncDb.execute(
        `UPDATE leftovers SET
          status = CASE WHEN doses_eaten + doses_thrown_out >= total_doses THEN 'closed' ELSE 'active' END,
          updated_at = ?
        WHERE id = ?`,
        [ts, id],
      );

      const rows = await powerSyncDb.getAll(
        "SELECT * FROM leftovers WHERE id = ?",
        [id],
      );
      if (rows.length === 0) throw new Error("Resto não encontrado");
      return mapLeftover(rows[0]);
    } catch (err) {
      logger.error("LeftoverRepository", "update failed", err);
      throw new Error(
        `Erro ao actualizar resto: ${err instanceof Error ? err.message : "Erro"}`,
      );
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await powerSyncDb.execute("DELETE FROM leftovers WHERE id = ?", [id]);
    } catch (err) {
      logger.error("LeftoverRepository", "delete failed", err);
      throw new Error(
        `Erro ao eliminar resto: ${err instanceof Error ? err.message : "Erro"}`,
      );
    }
  }

  async getById(id: string): Promise<Leftover> {
    try {
      const rows = await powerSyncDb.getAll(
        "SELECT * FROM leftovers WHERE id = ?",
        [id],
      );
      if (rows.length === 0) throw new Error("Resto não encontrado");
      return mapLeftover(rows[0]);
    } catch (err) {
      logger.error("LeftoverRepository", "getById failed", err);
      throw new Error(
        `Erro ao carregar resto: ${err instanceof Error ? err.message : "Erro"}`,
      );
    }
  }

  async getActive(familyId: string): Promise<Leftover[]> {
    try {
      const rows = await powerSyncDb.getAll(
        `SELECT * FROM leftovers WHERE family_id = ? AND status = 'active' ORDER BY expiry_date ASC`,
        [familyId],
      );
      return rows.map(mapLeftover);
    } catch (err) {
      logger.error("LeftoverRepository", "getActive failed", err);
      throw new Error(
        `Erro ao carregar restos: ${err instanceof Error ? err.message : "Erro"}`,
      );
    }
  }

  async getAll(
    familyId: string,
    limit: number,
    offset: number,
  ): Promise<Leftover[]> {
    try {
      const rows = await powerSyncDb.getAll(
        `SELECT * FROM leftovers WHERE family_id = ?
         ORDER BY
           CASE WHEN status = 'active' THEN 0 ELSE 1 END,
           CASE WHEN status = 'active' THEN expiry_date END ASC,
           CASE WHEN status = 'closed' THEN expiry_date END DESC
         LIMIT ? OFFSET ?`,
        [familyId, limit, offset],
      );
      return rows.map(mapLeftover);
    } catch (err) {
      logger.error("LeftoverRepository", "getAll failed", err);
      throw new Error(
        `Erro ao carregar restos: ${err instanceof Error ? err.message : "Erro"}`,
      );
    }
  }

  async incrementEaten(id: string): Promise<Leftover> {
    const ts = now();
    try {
      await powerSyncDb.execute(
        `UPDATE leftovers SET
          doses_eaten = doses_eaten + 1,
          status = CASE WHEN doses_eaten + 1 + doses_thrown_out >= total_doses THEN 'closed' ELSE status END,
          updated_at = ?
        WHERE id = ? AND status = 'active' AND doses_eaten + doses_thrown_out < total_doses`,
        [ts, id],
      );
      const rows = await powerSyncDb.getAll(
        "SELECT * FROM leftovers WHERE id = ?",
        [id],
      );
      if (rows.length === 0) throw new Error("Resto não encontrado");
      return mapLeftover(rows[0]);
    } catch (err) {
      logger.error("LeftoverRepository", "incrementEaten failed", err);
      throw new Error(
        `Erro ao registar dose: ${err instanceof Error ? err.message : "Erro"}`,
      );
    }
  }

  async throwOutRemaining(id: string): Promise<Leftover> {
    const ts = now();
    try {
      await powerSyncDb.execute(
        `UPDATE leftovers SET
          doses_thrown_out = total_doses - doses_eaten,
          status = 'closed',
          updated_at = ?
        WHERE id = ? AND status = 'active'`,
        [ts, id],
      );
      const rows = await powerSyncDb.getAll(
        "SELECT * FROM leftovers WHERE id = ?",
        [id],
      );
      if (rows.length === 0) throw new Error("Resto não encontrado");
      return mapLeftover(rows[0]);
    } catch (err) {
      logger.error("LeftoverRepository", "throwOutRemaining failed", err);
      throw new Error(
        `Erro ao descartar resto: ${err instanceof Error ? err.message : "Erro"}`,
      );
    }
  }
}
