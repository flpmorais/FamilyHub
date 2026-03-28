import { ITemplateRepository } from '../interfaces/template.repository.interface';
import { TemplateItem, CreateTemplateItemInput } from '../../types/packing.types';
import { powerSyncDb } from '../../utils/powersync.database';
import { logger } from '../../utils/logger';
import { uuid } from '../../utils/uuid';

function mapTemplateItem(row: any, tagIds: string[] = [], profileIds: string[] = []): TemplateItem {
  return {
    id: row.id,
    familyId: row.family_id,
    title: row.title,
    profileIds,
    categoryId: row.category_id,
    quantity: Number(row.quantity) || 1,
    isAllFamily: row.is_all_family === 1 || row.is_all_family === true,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    tagIds,
  };
}

function now(): string {
  return new Date().toISOString();
}

async function loadTagIdsForItem(itemId: string): Promise<string[]> {
  const rows = await powerSyncDb.getAll(
    'SELECT tag_id FROM template_item_tags WHERE template_item_id = ?',
    [itemId]
  );
  return rows.map((r: any) => r.tag_id as string);
}

async function saveTagsForItem(itemId: string, tagIds: string[]): Promise<void> {
  await powerSyncDb.execute('DELETE FROM template_item_tags WHERE template_item_id = ?', [itemId]);
  for (const tagId of tagIds) {
    await powerSyncDb.execute(
      'INSERT INTO template_item_tags (id, template_item_id, tag_id) VALUES (?, ?, ?)',
      [uuid(), itemId, tagId]
    );
  }
}

async function loadProfileIdsForItem(itemId: string): Promise<string[]> {
  const rows = await powerSyncDb.getAll(
    'SELECT profile_id FROM template_item_profiles WHERE template_item_id = ?',
    [itemId]
  );
  return rows.map((r: any) => r.profile_id as string);
}

async function saveProfilesForItem(itemId: string, profileIds: string[]): Promise<void> {
  await powerSyncDb.execute('DELETE FROM template_item_profiles WHERE template_item_id = ?', [itemId]);
  for (const profileId of profileIds) {
    await powerSyncDb.execute(
      'INSERT INTO template_item_profiles (id, template_item_id, profile_id) VALUES (?, ?, ?)',
      [uuid(), itemId, profileId]
    );
  }
}

export class SupabaseTemplateRepository implements ITemplateRepository {
  async getTemplateItems(familyId: string): Promise<TemplateItem[]> {
    try {
      const rows = await powerSyncDb.getAll(
        'SELECT * FROM template_items WHERE family_id = ? ORDER BY title',
        [familyId]
      );
      const items: TemplateItem[] = [];
      for (const row of rows as any[]) {
        const [tagIds, profileIds] = await Promise.all([
          loadTagIdsForItem(row.id),
          loadProfileIdsForItem(row.id),
        ]);
        items.push(mapTemplateItem(row, tagIds, profileIds));
      }
      return items;
    } catch (err) {
      logger.error('TemplateRepository', 'getTemplateItems failed', err);
      throw new Error(`Erro ao carregar modelos: ${err instanceof Error ? err.message : 'Erro'}`);
    }
  }

  async createTemplateItem(familyId: string, item: CreateTemplateItemInput): Promise<TemplateItem> {
    const id = uuid();
    const ts = now();
    try {
      await powerSyncDb.execute(
        'INSERT INTO template_items (id, family_id, title, category_id, quantity, is_all_family, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [id, familyId, item.title, item.categoryId, item.quantity ?? 1, item.isAllFamily ? 1 : 0, ts, ts]
      );
      if (item.tagIds && item.tagIds.length > 0) {
        await saveTagsForItem(id, item.tagIds);
      }
      if (item.profileIds && item.profileIds.length > 0) {
        await saveProfilesForItem(id, item.profileIds);
      }
      const [tagIds, profileIds] = await Promise.all([
        loadTagIdsForItem(id),
        loadProfileIdsForItem(id),
      ]);
      const rows = await powerSyncDb.getAll('SELECT * FROM template_items WHERE id = ?', [id]);
      return mapTemplateItem(rows[0], tagIds, profileIds);
    } catch (err) {
      logger.error('TemplateRepository', 'createTemplateItem failed', err);
      throw new Error(`Erro ao criar modelo: ${err instanceof Error ? err.message : 'Erro'}`);
    }
  }

  async updateTemplateItem(
    id: string,
    data: Partial<Pick<TemplateItem, 'title' | 'categoryId' | 'quantity' | 'isAllFamily'>> & { profileIds?: string[]; tagIds?: string[] }
  ): Promise<TemplateItem> {
    const sets: string[] = [];
    const params: unknown[] = [];
    if (data.title !== undefined) { sets.push('title = ?'); params.push(data.title); }
    if (data.categoryId !== undefined) { sets.push('category_id = ?'); params.push(data.categoryId); }
    if (data.quantity !== undefined) { sets.push('quantity = ?'); params.push(data.quantity); }
    if (data.isAllFamily !== undefined) { sets.push('is_all_family = ?'); params.push(data.isAllFamily ? 1 : 0); }
    sets.push('updated_at = ?');
    params.push(now());
    params.push(id);

    try {
      await powerSyncDb.execute(`UPDATE template_items SET ${sets.join(', ')} WHERE id = ?`, params);
      if (data.tagIds !== undefined) {
        await saveTagsForItem(id, data.tagIds);
      }
      if (data.profileIds !== undefined) {
        await saveProfilesForItem(id, data.profileIds);
      }
      const [tagIds, profileIds] = await Promise.all([
        loadTagIdsForItem(id),
        loadProfileIdsForItem(id),
      ]);
      const rows = await powerSyncDb.getAll('SELECT * FROM template_items WHERE id = ?', [id]);
      if (rows.length === 0) throw new Error('Modelo não encontrado');
      return mapTemplateItem(rows[0], tagIds, profileIds);
    } catch (err) {
      logger.error('TemplateRepository', 'updateTemplateItem failed', err);
      throw new Error(`Erro ao actualizar modelo: ${err instanceof Error ? err.message : 'Erro'}`);
    }
  }

  async deleteTemplateItem(id: string): Promise<void> {
    try {
      await powerSyncDb.execute('DELETE FROM template_item_profiles WHERE template_item_id = ?', [id]);
      await powerSyncDb.execute('DELETE FROM template_item_tags WHERE template_item_id = ?', [id]);
      await powerSyncDb.execute('DELETE FROM template_items WHERE id = ?', [id]);
    } catch (err) {
      logger.error('TemplateRepository', 'deleteTemplateItem failed', err);
      throw new Error(`Erro ao eliminar modelo: ${err instanceof Error ? err.message : 'Erro'}`);
    }
  }

  async applyTemplates(
    familyId: string,
    vacationId: string,
    participantProfileIds: string[],
    vacationCategoryIds: string[],
    vacationTagIds: string[]
  ): Promise<number> {
    try {
      const items = await this.getTemplateItems(familyId);
      const participantSet = new Set(participantProfileIds);
      const categorySet = new Set(vacationCategoryIds);
      const tagSet = new Set(vacationTagIds);
      let count = 0;

      for (const item of items) {
        if (!categorySet.has(item.categoryId)) continue;
        if (item.tagIds.length > 0 && !item.tagIds.some((tid) => tagSet.has(tid))) continue;

        if (item.isAllFamily) {
          const id = uuid();
          const ts = now();
          await powerSyncDb.execute(
            `INSERT INTO packing_items (id, vacation_id, family_id, title, status, profile_id, quantity, notes, category_id, is_all_family, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, vacationId, familyId, item.title, 'new', null, item.quantity, null, item.categoryId, 1, ts, ts]
          );
          count++;
        } else if (item.profileIds.length > 0) {
          for (const profileId of item.profileIds) {
            if (participantSet.has(profileId)) {
              const id = uuid();
              const ts = now();
              await powerSyncDb.execute(
                `INSERT INTO packing_items (id, vacation_id, family_id, title, status, profile_id, quantity, notes, category_id, is_all_family, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [id, vacationId, familyId, item.title, 'new', profileId, item.quantity, null, item.categoryId, 0, ts, ts]
              );
              count++;
            }
          }
        } else {
          for (const profileId of participantProfileIds) {
            const id = uuid();
            const ts = now();
            await powerSyncDb.execute(
              `INSERT INTO packing_items (id, vacation_id, family_id, title, status, profile_id, quantity, notes, category_id, is_all_family, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [id, vacationId, familyId, item.title, 'new', profileId, item.quantity, null, item.categoryId, 0, ts, ts]
            );
            count++;
          }
        }
      }

      logger.info('TemplateRepository', `applyTemplates: injected ${count} packing items for vacation ${vacationId}`);
      return count;
    } catch (err) {
      logger.error('TemplateRepository', 'applyTemplates failed', err);
      throw new Error(`Erro ao aplicar modelos: ${err instanceof Error ? err.message : 'Erro'}`);
    }
  }
}
