import { SupabaseClient } from '@supabase/supabase-js';
import {
  GoogleSignin,
  isSuccessResponse,
  isCancelledResponse,
} from '@react-native-google-signin/google-signin';
import Constants from 'expo-constants';
import { IAuthRepository } from '../interfaces/auth.repository.interface';
import { UserAccount } from '../../types/profile.types';
import { logger } from '../../utils/logger';

export class SupabaseAuthRepository implements IAuthRepository {
  constructor(private readonly client: SupabaseClient) {}

  async signInWithGoogle(): Promise<UserAccount> {
    GoogleSignin.configure({
      webClientId: Constants.expoConfig?.extra?.googleWebClientId as string,
    });

    const signInResponse = await GoogleSignin.signIn();

    if (isCancelledResponse(signInResponse)) {
      throw new Error('Início de sessão cancelado.');
    }
    if (!isSuccessResponse(signInResponse)) {
      throw new Error('Falha ao iniciar sessão com Google.');
    }

    const idToken = signInResponse.data.idToken;
    if (!idToken) {
      throw new Error('Não foi possível obter o token de autenticação Google.');
    }

    const { data: authData, error: authError } = await this.client.auth.signInWithIdToken({
      provider: 'google',
      token: idToken,
    });

    if (authError || !authData.user) {
      const msg = `Erro ao autenticar com Supabase: ${authError?.message ?? 'Sessão inválida'}`;
      logger.error('Auth', 'signInWithIdToken failed', { message: authError?.message });
      throw new Error(msg);
    }

    logger.info('Auth', 'Supabase auth OK', { userId: authData.user.id });

    // Google display name from auth metadata (used for profile name matching)
    const displayName =
      (authData.user.user_metadata?.['name'] as string | undefined) ??
      (authData.user.user_metadata?.['full_name'] as string | undefined) ??
      null;

    logger.info('Auth', 'Calling provision_user_account', { displayName });

    const { data: accountRows, error: rpcError } = await this.client.rpc('provision_user_account', {
      p_google_id: (authData.user.user_metadata?.['sub'] as string | undefined) ?? authData.user.id,
      p_email: authData.user.email ?? '',
      p_display_name: displayName,
    });

    if (rpcError || !accountRows || accountRows.length === 0) {
      logger.error('Auth', 'provision_user_account failed', { rpcError, accountRows });
      throw new Error(`Erro ao criar conta: ${rpcError?.message ?? 'Sem resposta'}`);
    }

    logger.info('Auth', 'provision_user_account OK', accountRows[0]);

    return this.mapRowToUserAccount(accountRows[0]);
  }

  async signOut(): Promise<void> {
    GoogleSignin.configure({
      webClientId: Constants.expoConfig?.extra?.googleWebClientId as string,
    });
    await GoogleSignin.signOut();
    const { error } = await this.client.auth.signOut();
    if (error) {
      throw new Error(`Erro ao terminar sessão: ${error.message}`);
    }
  }

  async getCurrentSession(): Promise<UserAccount | null> {
    const { data: sessionData, error: sessionError } = await this.client.auth.getSession();
    if (sessionError || !sessionData.session?.user) {
      return null;
    }

    // Fetch full user_account row (includes familyId, profileId)
    const { data: accountRow, error: accountError } = await this.client
      .from('user_accounts')
      .select('id, google_id, email, family_id, profile_id, created_at, updated_at')
      .eq('id', sessionData.session.user.id)
      .single();

    if (accountError || !accountRow) {
      // No user_account yet (first-time user who hasn't completed sign-in flow)
      logger.warn('Auth', 'getCurrentSession: no user_account row', {
        error: accountError?.message,
      });
      return null;
    }

    // Check if linked profile is inactive → force logout
    if (accountRow.profile_id) {
      const { data: profileRow } = await this.client
        .from('profiles')
        .select('status')
        .eq('id', accountRow.profile_id)
        .single();

      if (profileRow?.status === 'inactive') {
        logger.warn('Auth', 'getCurrentSession: profile inactive, blocking access', {
          profileId: accountRow.profile_id,
        });
        return null;
      }
    }

    logger.info('Auth', 'getCurrentSession OK', { userId: accountRow.id });

    return this.mapRowToUserAccount(accountRow);
  }

  // Maps a user_accounts table row to the UserAccount domain type
  // AR10: snake_case → camelCase conversion happens here in the repository layer
  private mapRowToUserAccount(row: {
    id: string;
    google_id: string;
    email: string;
    family_id: string;
    profile_id: string | null;
    created_at: string;
    updated_at: string;
  }): UserAccount {
    return {
      id: row.id,
      googleId: row.google_id,
      email: row.email,
      familyId: row.family_id,
      profileId: row.profile_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
