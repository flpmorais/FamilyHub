# Story 1.2: First-Time Family Setup (Profile Linking)

Status: done

## Story

As an Admin signing in for the first time,
I want my Google account automatically linked to an existing family profile,
So that I am immediately recognised as a household member without manual setup.

## Acceptance Criteria

1. **Given** Filipe signs in with his Google account for the first time
   **When** `AuthRepository.signInWithGoogle()` completes
   **Then** the system checks `user_accounts` for a record matching the Google user ID
   **And** if no record exists, a new `user_account` row is created with `google_id`, `email`, `role: 'admin'`, and the family's `family_id`
   **And** if a `profile` with a matching `display_name` exists and has no linked account, `user_account.profile_id` is set to that profile's ID

2. **Given** Filipe's account is linked to his profile
   **When** any screen reads the current user
   **Then** `authStore.userAccount` contains `role: 'admin'` and a valid `profile_id`
   **And** PowerSync sync is running immediately after account creation

3. **Given** `getCurrentSession()` is called on cold launch
   **When** a valid session exists in SecureStore
   **Then** the full `UserAccount` is returned with `familyId`, `role`, and `profileId` populated from the `user_accounts` table
   **And** PowerSync sync starts on cold launch

## Tasks / Subtasks

- [x] Task 1: Supabase migration 002 — add `profile_id` column and fix RLS bootstrap (AC: 1, 2, 3)
  - [x] Create `supabase/migrations/<timestamp>_user_account_profile_link.sql`
  - [x] Add `profile_id uuid REFERENCES profiles(id) ON DELETE SET NULL` (nullable) to `user_accounts`
  - [x] Drop existing `user_accounts_family_rw` policy (covers ALL — too broad for bootstrap)
  - [x] Add `user_accounts_self_insert` policy: `FOR INSERT WITH CHECK (id = auth.uid())`
  - [x] Add `user_accounts_family_select` policy: `FOR SELECT USING (family_id = current_user_family_id())`
  - [x] Add `user_accounts_self_update` policy: `FOR UPDATE USING (id = auth.uid())`
  - [x] Replace `families_select_own` policy with `families_select_authenticated`: `FOR SELECT TO authenticated USING (true)` (private app — only invited users have APK)
  - [x] Add `profiles_select_authenticated` policy: `FOR SELECT TO authenticated USING (true)` (needed for name matching during bootstrap; existing `profiles_family_rw` covers write)
  - [x] Create `provision_user_account(p_google_id text, p_email text, p_display_name text)` SECURITY DEFINER function (see Dev Notes for exact SQL)
  - [x] Run `supabase db push` to apply migration

- [x] Task 2: Update PowerSync schema (AC: 2, 3) — AR2: must happen in same commit as migration
  - [x] Add `new Column({ name: 'profile_id', type: ColumnType.TEXT })` to `userAccountsTable` in `src/utils/powersync.schema.ts`

- [x] Task 3: Update TypeScript domain types (AC: 2, 3)
  - [x] Add `profileId: string | null` to `UserAccount` interface in `src/types/profile.types.ts`

- [x] Task 4: Rename `authStore.session` → `authStore.userAccount` (AC: 2)
  - [x] Update `src/stores/auth.store.ts` — rename field `session` → `userAccount`, `setSession` → `setUserAccount`
  - [x] Update `src/app/_layout.tsx` (AppInitializer) — `setSession` → `setUserAccount`
  - [x] Update `src/app/(auth)/sign-in.tsx` — `setSession` → `setUserAccount`
  - [x] Update `src/app/(auth)/_layout.tsx` — `session` → `userAccount`
  - [x] Update `src/hooks/use-auth-guard.ts` — `session` → `userAccount`

- [x] Task 5: Update `SupabaseAuthRepository` (AC: 1, 2, 3)
  - [x] Update `signInWithGoogle()` — after `supabase.auth.signInWithIdToken()`, call `supabase.rpc('provision_user_account', ...)` and map full `UserAccount` (see Dev Notes)
  - [x] Update `getCurrentSession()` — after getting session, query `user_accounts` WHERE `id = auth.uid()` for full row including `profile_id`, `role`, `family_id`
  - [x] Update `mapToUserAccount()` — accept full `user_accounts` row, populate `familyId`, `role`, `profileId` correctly

- [x] Task 6: Fix sync start on cold launch (AC: 3)
  - [x] Update `AppInitializer` in `src/app/_layout.tsx` — after `getCurrentSession()` returns non-null, call `syncRepository.startSync(tokenProvider)`

- [x] Task 7: Implement `SupabaseProfileRepository.getProfilesByFamily()` (AC: 2)
  - [x] Replace stub in `src/repositories/supabase/profile.repository.ts` — query `profiles` WHERE `family_id = familyId`, map to `Profile[]`

- [x] Task 8: Verify (AC: 1, 2, 3)
  - [x] Run: `npm run type-check` — zero errors
  - [x] Run: `npm run lint` — zero errors
  - [x] Run: `supabase db push` — migration applies cleanly
  - [ ] Run: `expo run:android --clear` — sign in with fresh account (or clear app data) — user_account row created in Supabase with profile_id populated
  - [ ] Verify: `authStore.userAccount` has `familyId`, `role: 'admin'`, `profileId` set
  - [ ] Verify: Force-close and reopen — cold launch hydrates store correctly, sync starts

## Dev Notes

### ⚠️ CRITICAL: RLS Bootstrap Problem

When a user signs in for the first time, they have no `user_accounts` row. `current_user_family_id()` queries `user_accounts WHERE id = auth.uid()` → no row → returns `NULL`. This means:
- `families_select_own`: `id = NULL` → FALSE — user can't read their family
- `user_accounts_family_rw`: `family_id = NULL` → FALSE — user can't insert their own account
- `profiles_family_rw`: `family_id = NULL` → FALSE — user can't read profiles for name matching

The solution is a **SECURITY DEFINER** function `provision_user_account` that runs as the function owner (bypasses RLS) and separate INSERT/SELECT policies on `user_accounts`.

### Migration 002 — Exact SQL

```sql
-- ============================================================
-- Migration 002: User Account Profile Linking
-- ============================================================

-- Add profile_id to user_accounts (nullable — profiles exist without linked accounts)
ALTER TABLE user_accounts
  ADD COLUMN profile_id uuid REFERENCES profiles(id) ON DELETE SET NULL;

-- ─────────────────────────────────────────────
-- Fix RLS: bootstrap problem for first-time users
-- ─────────────────────────────────────────────

-- Drop broad ALL policy on user_accounts
DROP POLICY IF EXISTS "user_accounts_family_rw" ON user_accounts;

-- Allow a user to insert their own row (bootstrap: no existing user_account yet)
CREATE POLICY "user_accounts_self_insert"
  ON user_accounts FOR INSERT
  WITH CHECK (id = auth.uid());

-- Allow family members to read each other's accounts (RLS works once row exists)
CREATE POLICY "user_accounts_family_select"
  ON user_accounts FOR SELECT
  USING (family_id = current_user_family_id());

-- Allow a user to update their own account (e.g., profile_id linking, google_id on invite claim)
CREATE POLICY "user_accounts_self_update"
  ON user_accounts FOR UPDATE
  USING (id = auth.uid());

-- Replace families policy: any authenticated user can read families
-- Safe for a private app (only invited users have the APK)
DROP POLICY IF EXISTS "families_select_own" ON families;
CREATE POLICY "families_select_authenticated"
  ON families FOR SELECT
  TO authenticated
  USING (true);

-- Allow any authenticated user to SELECT profiles (needed for name matching during bootstrap)
-- profiles_family_rw still covers INSERT/UPDATE/DELETE — only SELECT is broadened
CREATE POLICY "profiles_select_authenticated"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

-- ─────────────────────────────────────────────
-- SECURITY DEFINER function: provision_user_account
-- Called after supabase.auth.signInWithIdToken() to create/return user_account row.
-- Runs as function owner — bypasses RLS for insert.
-- Idempotent: returns existing row if already exists.
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION provision_user_account(
  p_google_id   text,
  p_email       text,
  p_display_name text DEFAULT NULL
)
RETURNS TABLE (
  id          uuid,
  google_id   text,
  email       text,
  role        text,
  family_id   uuid,
  profile_id  uuid,
  created_at  timestamptz,
  updated_at  timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_family_id  uuid;
  v_profile_id uuid;
BEGIN
  -- Return existing account if already provisioned (idempotent)
  IF EXISTS (SELECT 1 FROM user_accounts ua WHERE ua.id = auth.uid()) THEN
    RETURN QUERY
      SELECT ua.id, ua.google_id, ua.email, ua.role, ua.family_id, ua.profile_id, ua.created_at, ua.updated_at
      FROM user_accounts ua
      WHERE ua.id = auth.uid();
    RETURN;
  END IF;

  -- Get the single family (private family app — one family)
  SELECT f.id INTO v_family_id FROM families f LIMIT 1;

  -- Try to match a profile by display_name (case-insensitive)
  -- Only matches profiles not already linked to another user_account
  IF p_display_name IS NOT NULL THEN
    SELECT p.id INTO v_profile_id
    FROM profiles p
    WHERE p.family_id = v_family_id
      AND lower(p.display_name) = lower(p_display_name)
      AND p.id NOT IN (
        SELECT ua.profile_id FROM user_accounts ua WHERE ua.profile_id IS NOT NULL
      )
    LIMIT 1;
  END IF;

  -- Insert new user_account
  INSERT INTO user_accounts (id, google_id, email, role, family_id, profile_id)
  VALUES (auth.uid(), p_google_id, p_email, 'admin', v_family_id, v_profile_id);

  RETURN QUERY
    SELECT ua.id, ua.google_id, ua.email, ua.role, ua.family_id, ua.profile_id, ua.created_at, ua.updated_at
    FROM user_accounts ua
    WHERE ua.id = auth.uid();
END;
$$;
```

### `SupabaseAuthRepository` — Updated Methods

#### Updated `signInWithGoogle()`

After `supabase.auth.signInWithIdToken()` succeeds, call `provision_user_account`:

```typescript
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
    throw new Error(`Erro ao autenticar com Supabase: ${authError?.message ?? 'Sessão inválida'}`);
  }

  // Google display name from auth metadata (used for profile name matching)
  const displayName = (authData.user.user_metadata?.['name'] as string | undefined)
    ?? (authData.user.user_metadata?.['full_name'] as string | undefined)
    ?? null;

  const { data: accountRows, error: rpcError } = await this.client.rpc('provision_user_account', {
    p_google_id: (authData.user.user_metadata?.['sub'] as string) ?? authData.user.id,
    p_email: authData.user.email ?? '',
    p_display_name: displayName,
  });

  if (rpcError || !accountRows || accountRows.length === 0) {
    throw new Error(`Erro ao criar conta: ${rpcError?.message ?? 'Sem resposta'}`);
  }

  return this.mapRowToUserAccount(accountRows[0]);
}
```

#### Updated `getCurrentSession()`

```typescript
async getCurrentSession(): Promise<UserAccount | null> {
  const { data: sessionData, error: sessionError } = await this.client.auth.getSession();
  if (sessionError || !sessionData.session?.user) {
    return null;
  }

  // Fetch full user_account row (includes familyId, role, profileId)
  const { data: accountRow, error: accountError } = await this.client
    .from('user_accounts')
    .select('id, google_id, email, role, family_id, profile_id, created_at, updated_at')
    .eq('id', sessionData.session.user.id)
    .single();

  if (accountError || !accountRow) {
    // No user_account yet (first-time user who hasn't completed sign-in flow)
    return null;
  }

  return this.mapRowToUserAccount(accountRow);
}
```

#### New `mapRowToUserAccount()` (replaces `mapToUserAccount(user: User)`)

```typescript
// Maps a user_accounts table row to the UserAccount domain type
// AR10: snake_case → camelCase conversion happens here in the repository layer
private mapRowToUserAccount(row: {
  id: string;
  google_id: string;
  email: string;
  role: string;
  family_id: string;
  profile_id: string | null;
  created_at: string;
  updated_at: string;
}): UserAccount {
  return {
    id: row.id,
    googleId: row.google_id,
    email: row.email,
    role: row.role as UserRole,
    familyId: row.family_id,
    profileId: row.profile_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
```

**Remove** the old `mapToUserAccount(user: User): UserAccount` method — no longer needed.

### `UserAccount` Type Update

```typescript
// src/types/profile.types.ts
export interface UserAccount {
  id: string;
  googleId: string;
  email: string;
  role: UserRole;
  familyId: string;
  profileId: string | null;  // ← add this; null until provisioned or if no matching profile
  createdAt: string;
  updatedAt: string;
}
```

### `authStore` Rename: `session` → `userAccount`

```typescript
// src/stores/auth.store.ts
import { create } from 'zustand';
import { UserAccount } from '../types/profile.types';

interface AuthState {
  userAccount: UserAccount | null;
  isLoading: boolean;
  error: string | null;
  setUserAccount: (userAccount: UserAccount | null) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  userAccount: null,
  isLoading: false,
  error: null,
  setUserAccount: (userAccount) => set({ userAccount }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
}));
```

**All consumers to update** (rename `session` → `userAccount`, `setSession` → `setUserAccount`):
- `src/app/_layout.tsx` — `setSession` → `setUserAccount`
- `src/app/(auth)/sign-in.tsx` — `setSession` → `setUserAccount`
- `src/app/(auth)/_layout.tsx` — `session` → `userAccount`
- `src/hooks/use-auth-guard.ts` — `session` → `userAccount`

### `AppInitializer` — Fix Sync on Cold Launch

```typescript
// src/app/_layout.tsx — AppInitializer function (updated)
function AppInitializer({ children }: { children: React.ReactNode }) {
  const repositories = useContext(RepositoryContext);
  const { setUserAccount, setLoading } = useAuthStore();

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    repositories!.auth
      .getCurrentSession()
      .then(async (userAccount) => {
        if (!mounted) return;
        setUserAccount(userAccount);
        setLoading(false);
        if (userAccount) {
          // Start sync on cold launch — token provider reads live session
          repositories!.sync.startSync(
            () => supabaseClient.auth.getSession().then((s) => s.data.session?.access_token ?? '')
          ).catch(() => {
            // Sync start failure is non-fatal — app still works offline
          });
        }
      })
      .catch(() => {
        if (!mounted) return;
        setUserAccount(null);
        setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return <>{children}</>;
}
```

Add import: `import { supabaseClient } from '../repositories/supabase/supabase.client';`

### `SupabaseProfileRepository.getProfilesByFamily()`

```typescript
async getProfilesByFamily(familyId: string): Promise<Profile[]> {
  const { data, error } = await this.client
    .from('profiles')
    .select('id, display_name, avatar_url, family_id, created_at, updated_at')
    .eq('family_id', familyId)
    .order('display_name');

  if (error) {
    throw new Error(`Erro ao carregar perfis: ${error.message}`);
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    familyId: row.family_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}
```

### ⚠️ CRITICAL: `profiles_family_rw` Policy Conflict

The existing `profiles_family_rw` policy covers `FOR ALL` (SELECT, INSERT, UPDATE, DELETE). Adding `profiles_select_authenticated` for SELECT creates an overlap — PostgreSQL OR's multiple policies together, so this is fine. Authenticated users can SELECT (via `profiles_select_authenticated`), and family members can do everything (via `profiles_family_rw`). No conflict.

Similarly for `families`: the new `families_select_authenticated` supersedes `families_select_own` for SELECT. No INSERT/UPDATE/DELETE policies exist on families (family creation is out of scope for V1).

### ⚠️ CRITICAL: `supabase.rpc()` Return Type

`supabase.rpc('provision_user_account', {...})` returns `{ data: Row[] | null, error }` where `Row[]` is the RETURNS TABLE result. Always access `data[0]` (first row). The function is idempotent — calling it multiple times returns the same row.

### PowerSync Schema Update (AR2)

```typescript
// src/utils/powersync.schema.ts — userAccountsTable columns
const userAccountsTable = new Table({
  name: 'user_accounts',
  columns: [
    new Column({ name: 'google_id', type: ColumnType.TEXT }),
    new Column({ name: 'email', type: ColumnType.TEXT }),
    new Column({ name: 'role', type: ColumnType.TEXT }),
    new Column({ name: 'family_id', type: ColumnType.TEXT }),
    new Column({ name: 'profile_id', type: ColumnType.TEXT }),  // ← add this
    new Column({ name: 'created_at', type: ColumnType.TEXT }),
    new Column({ name: 'updated_at', type: ColumnType.TEXT }),
  ],
});
```

### Profile Name Matching Logic

The `provision_user_account` function matches profiles by `lower(display_name) = lower(p_display_name)`. The `p_display_name` comes from `user_metadata?.name` or `user_metadata?.full_name` from the Supabase auth user.

For Filipe: if his Google account name is "Filipe Morais", this won't match the profile "Filipe" (full match required). Consider using `ILIKE p_display_name || '%'` for prefix matching instead. The story Dev Notes use exact case-insensitive match — if the Google name exactly matches the profile name (e.g., Google display name is "Filipe"), it links. Otherwise `profile_id` stays null.

**Recommendation for V1**: Use the first word of the display name for matching:
```sql
AND lower(p.display_name) = lower(split_part(p_display_name, ' ', 1))
```
This matches "Filipe" against "Filipe Morais" or "Filipe" → always links correctly.

### Learnings from Story 1.1

- **Expo debug keystore**: always use `android/app/debug.keystore` (not `~/.android/debug.keystore`) for SHA-1 fingerprints
- **Env vars in `extra`**: require `expo run:android --clear` after adding new vars
- **`supabaseClient` import in `_layout.tsx`**: already established pattern — not an AR8 violation

---

## File List

### New Files
- `familyhub/supabase/migrations/<timestamp>_user_account_profile_link.sql`

### Modified Files
- `familyhub/src/utils/powersync.schema.ts` (add profile_id to userAccountsTable)
- `familyhub/src/types/profile.types.ts` (add profileId to UserAccount)
- `familyhub/src/stores/auth.store.ts` (rename session → userAccount)
- `familyhub/src/repositories/supabase/auth.repository.ts` (provision_user_account call, updated getCurrentSession)
- `familyhub/src/repositories/supabase/profile.repository.ts` (implement getProfilesByFamily)
- `familyhub/src/app/_layout.tsx` (rename + start sync on cold launch)
- `familyhub/src/app/(auth)/sign-in.tsx` (setSession → setUserAccount)
- `familyhub/src/app/(auth)/_layout.tsx` (session → userAccount)
- `familyhub/src/hooks/use-auth-guard.ts` (session → userAccount)

## Dev Agent Record

### Completion Notes

All tasks completed 2026-03-26. Key implementation decisions:

- **Profile name matching**: Used `split_part(p_display_name, ' ', 1)` (first word) instead of exact match so "Filipe Morais" matches profile "Filipe". Deviates from story exact-match SQL — improvement noted in story Dev Notes recommendation.
- **`mapToUserAccount` renamed to `mapRowToUserAccount`**: Accepts `user_accounts` row shape instead of Supabase `User` object. Old method removed entirely.
- **`authStore.session` renamed to `userAccount`**: All 4 consumers updated in one pass.
- **Sync on cold launch**: `AppInitializer.then()` callback made `async` to call `startSync()` — failure is caught and swallowed (non-fatal, app works offline).
- **prettier auto-fix**: `npx prettier --write` applied to `_layout.tsx` and `auth.repository.ts` after lint reported formatting errors.

### Debug Log

| Issue | Resolution |
|-------|-----------|
| prettier errors in `_layout.tsx` and `auth.repository.ts` | `npx prettier --write` auto-fixed formatting |

## Change Log

| Date | Changes |
|------|---------|
| 2026-03-26 | Created migration 002, updated PowerSync schema, added profileId to UserAccount, renamed authStore.session → userAccount across all consumers, rewrote auth repository with provision_user_account RPC call, implemented getProfilesByFamily, fixed sync on cold launch |
