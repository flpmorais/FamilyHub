# Story 1.3: Admin Invitation

Status: done

## Story

As an Admin,
I want to invite Angela by her Google email and assign her the Admin role,
So that she can sign in and access the full household data.

## Acceptance Criteria

1. **Given** Filipe is signed in and navigates to Settings → Users
   **When** he enters Angela's Google email and taps "Convidar"
   **Then** an `invitations` row is created with Angela's email, `role: 'admin'`, and the family's `family_id`
   **And** Angela appears in the users list with status "Pendente"

2. **Given** Angela installs the APK and signs in with her Google account
   **When** `AuthRepository.signInWithGoogle()` runs and `provision_user_account` finds an invitation matching her email
   **Then** her `user_account` is created using the invitation's role (not the 'admin' default)
   **And** the invitation row is deleted (consumed)
   **And** her account links to the "Angela" profile (`profile_id` populated)
   **And** she is navigated to `(app)/index.tsx` with full Admin access

3. **Given** Filipe views the users list after Angela has signed in
   **When** he opens Settings → Users
   **Then** Angela shows as "Admin" — not "Pendente"
   **And** pending invitations no longer show Angela

## Tasks / Subtasks

- [x] Task 1: Supabase migration 005 — `invitations` table + `invite_user` function + updated `provision_user_account` (AC: 1, 2, 3)
  - [x] Create `supabase/migrations/<timestamp>_invitations.sql`
  - [x] Create `invitations` table (see Dev Notes for exact SQL)
  - [x] Create `invite_user(p_email, p_role)` SECURITY DEFINER function (see Dev Notes)
  - [x] Replace `provision_user_account` with invitation-aware version (see Dev Notes)
  - [x] Run `supabase db push`

- [x] Task 2: Update PowerSync schema (AC: 1, 2, 3) — AR2: same commit as migration
  - [x] Add `invitationsTable` with columns: `email`, `role`, `family_id`, `invited_by`, `created_at`, `updated_at` to `src/utils/powersync.schema.ts`

- [x] Task 3: Add `Invitation` TypeScript type (AC: 1, 3)
  - [x] Add `Invitation` interface to `src/types/profile.types.ts` (see Dev Notes)

- [x] Task 4: New `IUserRepository` interface + `SupabaseUserRepository` (AC: 1, 2, 3)
  - [x] Create `src/repositories/interfaces/user.repository.interface.ts`
  - [x] Create `src/repositories/supabase/user.repository.ts` (see Dev Notes)
  - [x] `inviteUser(email, role)` — calls `invite_user` RPC, returns `Invitation`
  - [x] `getUsersAndInvitations()` — queries `user_accounts` + `invitations` via Supabase (direct, not PowerSync — data freshness required for this admin view)

- [x] Task 5: Wire `user` repository into context (AC: 1, 3)
  - [x] Add `IUserRepository` + `SupabaseUserRepository` imports to `src/repositories/repository.context.tsx`
  - [x] Add `user: IUserRepository` to `RepositoryContextValue` interface
  - [x] Instantiate `new SupabaseUserRepository(supabaseClient)` in `RepositoryProvider`
  - [x] Export `IUserRepository` type from `src/repositories/index.ts`

- [x] Task 6: Settings → Users screen (AC: 1, 3)
  - [x] Create `src/app/(app)/settings/_layout.tsx` (Stack, `headerShown: false`)
  - [x] Create `src/app/(app)/settings/users.tsx` (see Dev Notes for UI structure)
  - [x] Add "Utilizadores" navigation button to `src/app/(app)/index.tsx`

- [x] Task 7: Verify (AC: 1, 2, 3)
  - [x] Run: `npm run type-check` — zero errors
  - [x] Run: `npm run lint` — zero errors
  - [x] Run: `supabase db push` — migration applies cleanly
  - [ ] Build and run: `npx expo run:android`
  - [ ] Verify: sign in as Filipe → navigate to Users → invite `angela@gmail.com` → invitation appears as "Pendente"
  - [ ] Verify: sign in as Angela on a second device/fresh install → navigates to `(app)` with Admin access → invitation row deleted in Supabase dashboard
  - [ ] Verify: Filipe's Users screen shows Angela as "Admin"

## Dev Notes

### ⚠️ CRITICAL: Why `invitations` Table — Not Nullable `google_id`

`user_accounts.id` is `uuid PRIMARY KEY REFERENCES auth.users(id)`. You **cannot** insert a `user_accounts` row without a matching `auth.users` entry — Supabase Auth creates those rows only when someone actually authenticates. Therefore:

- **Do NOT** make `google_id` nullable and try to pre-insert a `user_accounts` row at invite time
- **Do** use a separate `invitations` table for pending invites
- `provision_user_account` (called at Angela's first sign-in) checks `invitations` for matching email, uses that role, and deletes the invitation row

### Migration 005 — Exact SQL

```sql
-- ============================================================
-- Migration 005: Invitations
-- ============================================================

CREATE TABLE invitations (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  email       text NOT NULL,
  role        text NOT NULL CHECK (role IN ('admin', 'maid')) DEFAULT 'admin',
  family_id   uuid NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  invited_by  uuid REFERENCES user_accounts(id) ON DELETE SET NULL,
  created_at  timestamptz DEFAULT now() NOT NULL,
  updated_at  timestamptz DEFAULT now() NOT NULL
);

CREATE TRIGGER invitations_updated_at
  BEFORE UPDATE ON invitations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- Family members can read and manage invitations
CREATE POLICY "invitations_family_rw"
  ON invitations FOR ALL
  USING (family_id = current_user_family_id());

-- ─────────────────────────────────────────────
-- SECURITY DEFINER: invite_user
-- Validates caller is admin, prevents duplicates,
-- creates invitation row.
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION invite_user(
  p_email text,
  p_role  text DEFAULT 'admin'
)
RETURNS TABLE (
  id          uuid,
  email       text,
  role        text,
  family_id   uuid,
  invited_by  uuid,
  created_at  timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_family_id uuid;
BEGIN
  -- Only admins can invite
  IF NOT EXISTS (
    SELECT 1 FROM user_accounts ua WHERE ua.id = auth.uid() AND ua.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only admins can invite users';
  END IF;

  SELECT ua.family_id INTO v_family_id FROM user_accounts ua WHERE ua.id = auth.uid();

  -- Block duplicate active account
  IF EXISTS (
    SELECT 1 FROM user_accounts ua
    WHERE lower(ua.email) = lower(p_email) AND ua.family_id = v_family_id
  ) THEN
    RAISE EXCEPTION 'A user with this email already exists in your family';
  END IF;

  -- Block duplicate pending invitation
  IF EXISTS (
    SELECT 1 FROM invitations inv
    WHERE lower(inv.email) = lower(p_email) AND inv.family_id = v_family_id
  ) THEN
    RAISE EXCEPTION 'This email has already been invited';
  END IF;

  INSERT INTO invitations (email, role, family_id, invited_by)
  VALUES (lower(p_email), p_role, v_family_id, auth.uid());

  RETURN QUERY
    SELECT inv.id, inv.email, inv.role, inv.family_id, inv.invited_by, inv.created_at
    FROM invitations inv
    WHERE inv.email = lower(p_email) AND inv.family_id = v_family_id
    ORDER BY inv.created_at DESC
    LIMIT 1;
END;
$$;

-- ─────────────────────────────────────────────
-- Replace provision_user_account with invitation-aware version.
-- Checks invitations table for matching email → uses that role.
-- Deletes invitation after account is created (idempotent).
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION provision_user_account(
  p_google_id    text,
  p_email        text,
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
  v_role       text := 'admin';
  v_invite_id  uuid;
BEGIN
  -- Idempotent: return existing account if already provisioned
  IF EXISTS (SELECT 1 FROM user_accounts ua WHERE ua.id = auth.uid()) THEN
    RETURN QUERY
      SELECT ua.id, ua.google_id, ua.email, ua.role, ua.family_id, ua.profile_id,
             ua.created_at, ua.updated_at
      FROM user_accounts ua WHERE ua.id = auth.uid();
    RETURN;
  END IF;

  -- Check invitations: if found, use that role and family
  SELECT inv.id, inv.role, inv.family_id
  INTO v_invite_id, v_role, v_family_id
  FROM invitations inv
  WHERE lower(inv.email) = lower(p_email)
  LIMIT 1;

  -- Fall back to single family if no invitation
  IF v_family_id IS NULL THEN
    SELECT f.id INTO v_family_id FROM families f LIMIT 1;
  END IF;

  -- Match profile by first word of display name (case-insensitive)
  IF p_display_name IS NOT NULL THEN
    SELECT p.id INTO v_profile_id
    FROM profiles p
    WHERE p.family_id = v_family_id
      AND lower(p.display_name) = lower(split_part(p_display_name, ' ', 1))
      AND p.id NOT IN (
        SELECT ua.profile_id FROM user_accounts ua WHERE ua.profile_id IS NOT NULL
      )
    LIMIT 1;
  END IF;

  INSERT INTO user_accounts (id, google_id, email, role, family_id, profile_id)
  VALUES (auth.uid(), p_google_id, p_email, v_role, v_family_id, v_profile_id);

  -- Consume invitation
  IF v_invite_id IS NOT NULL THEN
    DELETE FROM invitations WHERE id = v_invite_id;
  END IF;

  RETURN QUERY
    SELECT ua.id, ua.google_id, ua.email, ua.role, ua.family_id, ua.profile_id,
           ua.created_at, ua.updated_at
    FROM user_accounts ua WHERE ua.id = auth.uid();
END;
$$;
```

### PowerSync Schema — `invitations` Table

Add to `src/utils/powersync.schema.ts`:

```typescript
// migration 005 — invitations table
const invitationsTable = new Table({
  name: 'invitations',
  columns: [
    new Column({ name: 'email', type: ColumnType.TEXT }),
    new Column({ name: 'role', type: ColumnType.TEXT }),
    new Column({ name: 'family_id', type: ColumnType.TEXT }),
    new Column({ name: 'invited_by', type: ColumnType.TEXT }),
    new Column({ name: 'created_at', type: ColumnType.TEXT }),
    new Column({ name: 'updated_at', type: ColumnType.TEXT }),
  ],
});
```

Add `invitationsTable` to the `new Schema([...])` call.

### `Invitation` TypeScript Type

Add to `src/types/profile.types.ts`:

```typescript
export interface Invitation {
  id: string;
  email: string;
  role: UserRole;
  familyId: string;
  invitedBy: string | null;
  createdAt: string;
  updatedAt: string;
}
```

### `IUserRepository` Interface

`src/repositories/interfaces/user.repository.interface.ts`:

```typescript
import { UserAccount, Invitation, UserRole } from '../../types/profile.types';

export interface IUserRepository {
  getUsersAndInvitations(): Promise<{ users: UserAccount[]; invitations: Invitation[] }>;
  inviteUser(email: string, role: UserRole): Promise<Invitation>;
}
```

### `SupabaseUserRepository` Implementation

`src/repositories/supabase/user.repository.ts`:

```typescript
import { SupabaseClient } from '@supabase/supabase-js';
import { IUserRepository } from '../interfaces/user.repository.interface';
import { UserAccount, Invitation, UserRole } from '../../types/profile.types';
import { logger } from '../../utils/logger';

export class SupabaseUserRepository implements IUserRepository {
  constructor(private readonly client: SupabaseClient) {}

  async getUsersAndInvitations(): Promise<{ users: UserAccount[]; invitations: Invitation[] }> {
    const [usersResult, invitesResult] = await Promise.all([
      this.client
        .from('user_accounts')
        .select('id, google_id, email, role, family_id, profile_id, created_at, updated_at')
        .order('created_at'),
      this.client
        .from('invitations')
        .select('id, email, role, family_id, invited_by, created_at, updated_at')
        .order('created_at'),
    ]);

    if (usersResult.error) {
      logger.error('UserRepository', 'getUsersAndInvitations: users query failed', usersResult.error);
      throw new Error(`Erro ao carregar utilizadores: ${usersResult.error.message}`);
    }
    if (invitesResult.error) {
      logger.error('UserRepository', 'getUsersAndInvitations: invitations query failed', invitesResult.error);
      throw new Error(`Erro ao carregar convites: ${invitesResult.error.message}`);
    }

    const users: UserAccount[] = (usersResult.data ?? []).map((row) => ({
      id: row.id,
      googleId: row.google_id,
      email: row.email,
      role: row.role as UserRole,
      familyId: row.family_id,
      profileId: row.profile_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    const invitations: Invitation[] = (invitesResult.data ?? []).map((row) => ({
      id: row.id,
      email: row.email,
      role: row.role as UserRole,
      familyId: row.family_id,
      invitedBy: row.invited_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    return { users, invitations };
  }

  async inviteUser(email: string, role: UserRole): Promise<Invitation> {
    const { data, error } = await this.client.rpc('invite_user', {
      p_email: email,
      p_role: role,
    });

    if (error || !data || data.length === 0) {
      logger.error('UserRepository', 'inviteUser RPC failed', { error, email });
      throw new Error(`Erro ao convidar utilizador: ${error?.message ?? 'Sem resposta'}`);
    }

    const row = data[0];
    return {
      id: row.id,
      email: row.email,
      role: row.role as UserRole,
      familyId: row.family_id,
      invitedBy: row.invited_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
```

### `repository.context.tsx` Update

Add to imports:
```typescript
import { SupabaseUserRepository } from './supabase/user.repository';
import type { IUserRepository } from './interfaces/user.repository.interface';
```

Add to `RepositoryContextValue`:
```typescript
user: IUserRepository;
```

Add to `RepositoryProvider` useMemo:
```typescript
user: new SupabaseUserRepository(supabaseClient),
```

### `repositories/index.ts` Update

Add:
```typescript
export type { IUserRepository } from './interfaces/user.repository.interface';
```

### Settings → Users Screen Structure

`src/app/(app)/settings/_layout.tsx` — minimal Stack layout, identical to `(auth)/_layout.tsx`:
```typescript
import { Stack } from 'expo-router';
export default function SettingsLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
```

`src/app/(app)/settings/users.tsx` — key structure:

```typescript
// State: users (UserAccount[]), invitations (Invitation[]), emailInput, isLoading, error
// On mount: call userRepository.getUsersAndInvitations()
// On "Convidar": validate email, call userRepository.inviteUser(email, 'admin'), refresh list

// UI sections:
// 1. "Utilizadores" heading
// 2. Active users list — each row: email + role badge ('Admin')
// 3. Pending invitations list — each row: email + badge 'Pendente'
// 4. Invite form: TextInput (keyboardType='email-address', autoCapitalize='none') + TouchableOpacity 'Convidar'
// 5. Error text (Portuguese)
```

Access via `useRepository('user')` hook — the pattern is already established in `use-repository.ts`.

### Navigation from `(app)/index.tsx`

Add a minimal "Utilizadores" button that calls `router.push('/(app)/settings/users')`. Keep the placeholder text intact — do NOT implement the full dashboard (Story 5.1).

```typescript
import { router } from 'expo-router';
// In the View:
<TouchableOpacity onPress={() => router.push('/(app)/settings/users')}>
  <Text>Utilizadores</Text>
</TouchableOpacity>
```

### `use-repository` Hook — Verify `'user'` Key is Supported

`src/hooks/use-repository.ts` maps string keys to repository instances from `RepositoryContext`. After adding `user` to `RepositoryContextValue`, verify the hook's key type is updated (or uses a generic accessor) so `useRepository('user')` compiles correctly. Check the hook implementation and update if needed.

### ⚠️ CRITICAL: `getUsersAndInvitations` Uses Supabase Direct (Not PowerSync)

The Users screen reads directly from Supabase (not PowerSync `useQuery`) because:
- Admin management screens require fresh data (not cached SQLite)
- Invitations are transient and should not live in the local SQLite cache long-term

`user_accounts` and `invitations` ARE still in the PowerSync schema (required for AR2 consistency), but the Users screen reads via `userRepository.getUsersAndInvitations()` on component mount, not via `useQuery`.

### Learnings from Stories 1.1 / 1.2

- **No `--clear` flag**: use `npx expo run:android` (not `npx expo run:android --clear`)
- **Metro cache clear if needed**: `lsof -ti:8081 | xargs kill -9` before rebuild
- **Prettier**: run `npx prettier --write` on modified files before `npm run lint`
- **logger utility**: use `logger.info/warn/error` from `src/utils/logger.ts` for all log output — filter in logcat with `adb logcat ReactNativeJS:* *:S | grep "\[FH"`
- **`supabase.rpc()` returns `{ data: Row[] | null, error }`**: always check `data[0]`
- **SECURITY DEFINER** functions bypass RLS — test that they work for both invited and non-invited users

### Project Structure Notes

- New files follow existing `kebab-case` naming: `user.repository.ts`, `user.repository.interface.ts`, `users.tsx`
- All new DB columns: `snake_case` in SQL, `camelCase` in TypeScript (converted in repository layer only)
- New `Invitation` type follows the same interface shape as `UserAccount` and `Profile`
- `settings/` sub-directory under `(app)/` is new — the Stack navigator in `(app)/_layout.tsx` handles nested routes automatically via Expo Router file-based routing

### References

- Architecture: repository pattern, store boundaries, RLS design — `_bmad-output/planning-artifacts/architecture.md`
- Epics: Story 1.3 AC — `_bmad-output/planning-artifacts/epics.md`
- Migration 002 SQL (pattern reference) — `familyhub/supabase/migrations/20260326093104_user_account_profile_link.sql`
- Logger utility — `familyhub/src/utils/logger.ts`
- Repository context pattern — `familyhub/src/repositories/repository.context.tsx`

## File List

### New Files
- `familyhub/supabase/migrations/<timestamp>_invitations.sql`
- `familyhub/src/repositories/interfaces/user.repository.interface.ts`
- `familyhub/src/repositories/supabase/user.repository.ts`
- `familyhub/src/app/(app)/settings/_layout.tsx`
- `familyhub/src/app/(app)/settings/users.tsx`

### Modified Files
- `familyhub/src/utils/powersync.schema.ts` (add invitationsTable)
- `familyhub/src/types/profile.types.ts` (add Invitation interface)
- `familyhub/src/repositories/repository.context.tsx` (add user repository)
- `familyhub/src/repositories/index.ts` (export IUserRepository)
- `familyhub/src/app/(app)/index.tsx` (add navigation button to users screen)
- `familyhub/src/hooks/use-repository.ts` (verify 'user' key is supported)

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

- Migration 005 applied: `invitations` table, `invite_user` SECURITY DEFINER function, `provision_user_account` updated to check invitations by email and consume them on sign-in
- PowerSync schema updated with `invitationsTable`
- `Invitation` TypeScript type added to `profile.types.ts`
- New `IUserRepository` interface + `SupabaseUserRepository` with `getUsersAndInvitations()` and `inviteUser()`
- `user` key added to `RepositoryContextValue` and `RepositoryProvider`
- `settings/_layout.tsx` created (shared with Story 1.4)
- `settings/users.tsx`: lists active users with role badges, pending invitations with "Pendente" badge, and invite form
- `index.tsx` updated with "Utilizadores" and "Perfis" nav buttons (Perfis pre-added for Story 1.4)
- Device verification (invite flow + Angela sign-in) to be done by developer

### File List

- `familyhub/supabase/migrations/20260326111649_invitations.sql` (new)
- `familyhub/src/utils/powersync.schema.ts` (modified — added invitationsTable)
- `familyhub/src/types/profile.types.ts` (modified — added Invitation interface)
- `familyhub/src/repositories/interfaces/user.repository.interface.ts` (new)
- `familyhub/src/repositories/supabase/user.repository.ts` (new)
- `familyhub/src/repositories/repository.context.tsx` (modified — added user repository)
- `familyhub/src/repositories/index.ts` (modified — exported IUserRepository)
- `familyhub/src/app/(app)/settings/_layout.tsx` (new)
- `familyhub/src/app/(app)/settings/users.tsx` (new)
- `familyhub/src/app/(app)/index.tsx` (modified — added Utilizadores + Perfis nav buttons)
