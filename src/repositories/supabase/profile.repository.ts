import * as FileSystem from 'expo-file-system/legacy';
import { SupabaseClient } from '@supabase/supabase-js';
import { IProfileRepository } from '../interfaces/profile.repository.interface';
import { Profile, ProfileStatus, UserRole } from '../../types/profile.types';
import { logger } from '../../utils/logger';

function mapRow(row: {
  id: string;
  display_name: string;
  avatar_url: string | null;
  family_id: string;
  status: string;
  email: string | null;
  role: string;
  sort_order?: number;
  created_at: string;
  updated_at: string;
}): Profile {
  return {
    id: row.id,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    familyId: row.family_id,
    status: row.status as ProfileStatus,
    email: row.email,
    role: row.role as UserRole,
    sortOrder: Number(row.sort_order) || 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const SELECT_COLS =
  'id, display_name, avatar_url, family_id, status, email, role, sort_order, created_at, updated_at';

export class SupabaseProfileRepository implements IProfileRepository {
  constructor(private readonly client: SupabaseClient) {}

  async getProfilesByFamily(familyId: string): Promise<Profile[]> {
    const { data, error } = await this.client
      .from('profiles')
      .select(SELECT_COLS)
      .eq('family_id', familyId)
      .order('sort_order');

    if (error) {
      logger.error('ProfileRepository', 'getProfilesByFamily failed', error);
      throw new Error(`Erro ao carregar perfis: ${error.message}`);
    }

    return (data ?? []).map(mapRow);
  }

  async createProfile(
    displayName: string,
    avatarUrl: string | null,
    familyId: string,
    email?: string | null,
    role?: UserRole
  ): Promise<Profile> {
    const status = email ? 'invited' : 'active';

    const { data: maxRows } = await this.client
      .from('profiles')
      .select('sort_order')
      .eq('family_id', familyId)
      .order('sort_order', { ascending: false })
      .limit(1);
    const nextOrder = (Number(maxRows?.[0]?.sort_order) || 0) + 1;

    const { data, error } = await this.client
      .from('profiles')
      .insert({
        display_name: displayName,
        avatar_url: avatarUrl,
        family_id: familyId,
        status,
        email: email ?? null,
        role: role ?? 'child',
        sort_order: nextOrder,
      })
      .select(SELECT_COLS);

    if (error || !data || data.length === 0) {
      logger.error('ProfileRepository', 'createProfile failed', error);
      throw new Error(`Erro ao criar perfil: ${error?.message ?? 'Sem resposta'}`);
    }

    return mapRow(data[0]);
  }

  async updateProfile(
    id: string,
    data: Partial<Pick<Profile, 'displayName' | 'avatarUrl' | 'email' | 'role'>>
  ): Promise<Profile> {
    const updates: Record<string, unknown> = {};
    if (data.displayName !== undefined) updates['display_name'] = data.displayName;
    if (data.avatarUrl !== undefined) updates['avatar_url'] = data.avatarUrl;
    if (data.email !== undefined) updates['email'] = data.email;
    if (data.role !== undefined) updates['role'] = data.role;

    const { data: rows, error } = await this.client
      .from('profiles')
      .update(updates)
      .eq('id', id)
      .select(SELECT_COLS);

    if (error || !rows || rows.length === 0) {
      logger.error('ProfileRepository', 'updateProfile failed', { error, rowCount: rows?.length });
      throw new Error(`Erro ao actualizar perfil: ${error?.message ?? 'Perfil não encontrado'}`);
    }

    return mapRow(rows[0]);
  }

  async setProfileStatus(id: string, status: ProfileStatus): Promise<Profile> {
    // enrolled → active: revoke auth by deleting user_account
    if (status === 'active') {
      const { data: currentRows } = await this.client
        .from('profiles')
        .select('status')
        .eq('id', id);

      if (currentRows?.[0]?.status === 'enrolled') {
        const { error: deleteError } = await this.client
          .from('user_accounts')
          .delete()
          .eq('profile_id', id);

        if (deleteError) {
          logger.error(
            'ProfileRepository',
            'setProfileStatus: delete user_account failed',
            deleteError
          );
          throw new Error(`Erro ao revogar acesso: ${deleteError.message}`);
        }
      }
    }

    const { data: rows, error } = await this.client
      .from('profiles')
      .update({ status })
      .eq('id', id)
      .select(SELECT_COLS);

    if (error || !rows || rows.length === 0) {
      logger.error('ProfileRepository', 'setProfileStatus failed', {
        error,
        rowCount: rows?.length,
      });
      throw new Error(
        `Erro ao alterar estado do perfil: ${error?.message ?? 'Perfil não encontrado'}`
      );
    }

    return mapRow(rows[0]);
  }

  async uploadAvatar(profileId: string, familyId: string, localUri: string): Promise<string> {
    const storagePath = `${familyId}/${profileId}.jpg`;

    // Delete existing file first (ignore error — may not exist yet)
    await this.client.storage.from('avatars').remove([storagePath]);

    // Read file via expo-file-system — fetch() cannot handle file:// URIs on Android
    const base64 = await FileSystem.readAsStringAsync(localUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const { error } = await this.client.storage
      .from('avatars')
      .upload(storagePath, bytes, { contentType: 'image/jpeg', upsert: true });

    if (error) {
      logger.error('ProfileRepository', 'uploadAvatar failed', error);
      throw new Error(`Erro ao carregar imagem: ${error.message}`);
    }

    const { data } = this.client.storage.from('avatars').getPublicUrl(storagePath);
    return data.publicUrl;
  }

  async reorderProfile(id: string, newOrder: number): Promise<void> {
    const { data: rows } = await this.client
      .from('profiles')
      .select('sort_order, family_id')
      .eq('id', id);

    if (!rows || rows.length === 0) return;
    const { sort_order: oldOrder, family_id } = rows[0];
    if (oldOrder === newOrder) return;

    if (newOrder < oldOrder) {
      // Moving up: increment sort_order for items in [newOrder, oldOrder)
      const { data: toUpdate } = await this.client
        .from('profiles')
        .select('id, sort_order')
        .eq('family_id', family_id)
        .gte('sort_order', newOrder)
        .lt('sort_order', oldOrder);

      if (toUpdate) {
        for (const row of toUpdate) {
          await this.client
            .from('profiles')
            .update({ sort_order: row.sort_order + 1 })
            .eq('id', row.id);
        }
      }
    } else {
      // Moving down: decrement sort_order for items in (oldOrder, newOrder]
      const { data: toUpdate } = await this.client
        .from('profiles')
        .select('id, sort_order')
        .eq('family_id', family_id)
        .gt('sort_order', oldOrder)
        .lte('sort_order', newOrder);

      if (toUpdate) {
        for (const row of toUpdate) {
          await this.client
            .from('profiles')
            .update({ sort_order: row.sort_order - 1 })
            .eq('id', row.id);
        }
      }
    }

    await this.client
      .from('profiles')
      .update({ sort_order: newOrder })
      .eq('id', id);
  }

  async deleteProfile(id: string): Promise<void> {
    const { data: linked, error: checkError } = await this.client
      .from('user_accounts')
      .select('id')
      .eq('profile_id', id)
      .limit(1);

    if (checkError) {
      logger.error('ProfileRepository', 'deleteProfile: check query failed', checkError);
      throw new Error(`Erro ao verificar perfil: ${checkError.message}`);
    }

    if (linked && linked.length > 0) {
      throw new Error('Este perfil está associado a uma conta activa');
    }

    const { data: profileRows } = await this.client
      .from('profiles')
      .select('sort_order, family_id')
      .eq('id', id);

    const { error } = await this.client.from('profiles').delete().eq('id', id);
    if (error) {
      logger.error('ProfileRepository', 'deleteProfile: delete failed', error);
      throw new Error(`Erro ao eliminar perfil: ${error.message}`);
    }

    if (profileRows && profileRows.length > 0) {
      const { sort_order, family_id } = profileRows[0];
      // Decrement sort_order for profiles with higher order in the same family
      const { data: toUpdate } = await this.client
        .from('profiles')
        .select('id, sort_order')
        .eq('family_id', family_id)
        .gt('sort_order', sort_order);

      if (toUpdate) {
        for (const row of toUpdate) {
          await this.client
            .from('profiles')
            .update({ sort_order: row.sort_order - 1 })
            .eq('id', row.id);
        }
      }
    }
  }
}
