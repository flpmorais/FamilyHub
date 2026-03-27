# Story 1.4: Family Profile Management

Status: done

## Story

As an Admin,
I want to create, edit, and delete family profiles with names and avatars,
So that the household's members are represented in the app before they have accounts.

## Acceptance Criteria

1. **Given** Filipe navigates to Settings → Profiles and taps "Adicionar perfil"
   **When** the bottom sheet opens and he fills in Nome (required) + Avatar URL (optional)
   **Then** on save, a new `profile` row is created with the family's `family_id`
   **And** the new profile appears in the list immediately

2. **Given** a profile exists
   **When** Filipe taps it, edits the name or avatar URL, and saves
   **Then** the `profile` row is updated via `ProfileRepository.updateProfile()`
   **And** the change is reflected in the list immediately

3. **Given** Filipe taps "Eliminar" on a profile and confirms the `Alert`
   **When** the profile has no linked `user_account`
   **Then** the `profile` row is deleted and removed from the list

4. **Given** Filipe taps "Eliminar" on a profile that has a linked `user_account`
   **When** he confirms the `Alert`
   **Then** deletion is blocked and a Portuguese error is shown: "Este perfil está associado a uma conta activa"

5. **Given** any Admin opens Settings → Profiles
   **When** the list renders
   **Then** all profiles are shown with avatar (or initials fallback) + display name
   **And** profiles with no linked `user_account` are visually distinct (greyed name, "Sem conta" badge)

## Tasks / Subtasks

- [x] Task 1: Extend `IProfileRepository` interface (AC: 1, 2, 3, 4)
  - [x] Add `createProfile(displayName: string, avatarUrl: string | null, familyId: string): Promise<Profile>` to `src/repositories/interfaces/profile.repository.interface.ts`
  - [x] Add `deleteProfile(id: string): Promise<void>` to the same interface

- [x] Task 2: Implement all profile repository methods (AC: 1, 2, 3, 4)
  - [x] Implement `createProfile()` in `src/repositories/supabase/profile.repository.ts`
  - [x] Implement `updateProfile()` — replace existing stub
  - [x] Implement `deleteProfile()` — check for linked `user_account` before deleting (application-level guard, see Dev Notes)

- [x] Task 3: Settings → Profiles screen (AC: 1, 2, 3, 4, 5)
  - [x] Create `src/app/(app)/settings/profiles.tsx` (see Dev Notes for full UI structure)
  - [x] Create `src/app/(app)/settings/_layout.tsx` **if Story 1.3 has not yet been implemented** (both stories share this layout file)

- [x] Task 4: Add "Perfis" navigation to dashboard placeholder (AC: 5)
  - [x] Add "Perfis" `TouchableOpacity` to `src/app/(app)/index.tsx` alongside existing "Utilizadores" button (or add it if Story 1.3 hasn't added it yet — see Dev Notes)

- [ ] Task 5: Verify (AC: 1, 2, 3, 4, 5)
  - [x] Run: `npm run type-check` — zero errors
  - [x] Run: `npm run lint` — zero errors
  - [ ] Build and run: `npx expo run:android`
  - [ ] Verify: create a new profile "Teste" — appears in list immediately
  - [ ] Verify: edit "Teste" display name — change reflected
  - [ ] Verify: delete "Teste" (no linked account) — removed from list
  - [ ] Verify: attempt to delete "Filipe" (has linked account) — blocked with Portuguese error
  - [ ] Verify: profiles with no account show "Sem conta" badge; linked profiles do not

## Dev Notes

### ⚠️ No Migration Needed

The `profiles` table already exists with `id`, `display_name`, `avatar_url`, `family_id`, `created_at`, `updated_at`. The existing `profiles_family_rw FOR ALL` policy covers INSERT, UPDATE, DELETE. The `profiles_select_authenticated` policy (from Migration 002) covers SELECT. No schema changes required.

### ⚠️ Deletion Guard — Application Level (Not FK)

`user_accounts.profile_id` is `REFERENCES profiles(id) ON DELETE SET NULL`. This means the DB allows deleting a linked profile (it NULLs the profile_id on the user_account). The deletion block is **application-level**:

```typescript
async deleteProfile(id: string): Promise<void> {
  // Check for linked user_account before deleting
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

  const { error } = await this.client.from('profiles').delete().eq('id', id);
  if (error) {
    logger.error('ProfileRepository', 'deleteProfile: delete failed', error);
    throw new Error(`Erro ao eliminar perfil: ${error.message}`);
  }
}
```

### Updated `IProfileRepository` Interface

```typescript
// src/repositories/interfaces/profile.repository.interface.ts
import { Profile } from '../../types/profile.types';

export interface IProfileRepository {
  getProfilesByFamily(familyId: string): Promise<Profile[]>;
  createProfile(displayName: string, avatarUrl: string | null, familyId: string): Promise<Profile>;
  updateProfile(id: string, data: Partial<Pick<Profile, 'displayName' | 'avatarUrl'>>): Promise<Profile>;
  deleteProfile(id: string): Promise<void>;
}
```

### `createProfile()` Implementation

```typescript
async createProfile(
  displayName: string,
  avatarUrl: string | null,
  familyId: string
): Promise<Profile> {
  const { data, error } = await this.client
    .from('profiles')
    .insert({ display_name: displayName, avatar_url: avatarUrl, family_id: familyId })
    .select('id, display_name, avatar_url, family_id, created_at, updated_at')
    .single();

  if (error || !data) {
    logger.error('ProfileRepository', 'createProfile failed', error);
    throw new Error(`Erro ao criar perfil: ${error?.message ?? 'Sem resposta'}`);
  }

  return {
    id: data.id,
    displayName: data.display_name,
    avatarUrl: data.avatar_url,
    familyId: data.family_id,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}
```

### `updateProfile()` Implementation

```typescript
async updateProfile(
  id: string,
  data: Partial<Pick<Profile, 'displayName' | 'avatarUrl'>>
): Promise<Profile> {
  const updates: Record<string, unknown> = {};
  if (data.displayName !== undefined) updates['display_name'] = data.displayName;
  if (data.avatarUrl !== undefined) updates['avatar_url'] = data.avatarUrl;

  const { data: row, error } = await this.client
    .from('profiles')
    .update(updates)
    .eq('id', id)
    .select('id, display_name, avatar_url, family_id, created_at, updated_at')
    .single();

  if (error || !row) {
    logger.error('ProfileRepository', 'updateProfile failed', error);
    throw new Error(`Erro ao actualizar perfil: ${error?.message ?? 'Sem resposta'}`);
  }

  return {
    id: row.id,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    familyId: row.family_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
```

### Profiles Screen Structure

`src/app/(app)/settings/profiles.tsx`:

```typescript
// State:
//   profiles: Profile[]
//   userAccountIds: Set<string>  — profile IDs that have a linked user_account (for visual distinction)
//   isLoading: boolean
//   error: string | null
//   bottomSheetVisible: boolean
//   editingProfile: Profile | null  — null = create mode, Profile = edit mode
//   formName: string
//   formAvatarUrl: string

// On mount:
//   1. profileRepository.getProfilesByFamily(authStore.userAccount.familyId) → profiles
//   2. Supabase query: user_accounts SELECT profile_id WHERE family_id → build Set<string> of linked profile IDs

// Avatar display helper:
//   If avatarUrl is non-empty string → <Image source={{ uri: avatarUrl }} />
//   Otherwise → <View style={circle}><Text>{displayName[0].toUpperCase()}</Text></View>

// Bottom sheet: React Native <Modal> with animationType='slide', positioned at bottom
//   Fields: TextInput for Nome (required), TextInput for Avatar URL (optional, hint: 'URL da imagem (opcional)')
//   Buttons: 'Cancelar' (dismiss) + 'Guardar' (validate & save)
//   On 'Guardar' (create mode): profileRepository.createProfile(name, avatarUrl || null, familyId)
//   On 'Guardar' (edit mode): profileRepository.updateProfile(editingProfile.id, { displayName: name, avatarUrl: avatarUrl || null })
//   After save: close modal, refresh list

// Profile row: avatar circle + display name + (if not in linkedIds) grey text 'Sem conta'
//   Tap row → open bottom sheet in edit mode with pre-filled values
//   Long press or delete icon → Alert.alert('Eliminar', 'Tem a certeza?', [Cancel, Confirmar])
//   On confirm: profileRepository.deleteProfile(id) → catch error → show Portuguese error message

// Error display: <Text style={errorStyle}>{error}</Text> (same pattern as sign-in screen)
```

### Avatar — V1 Scope

No image picker or file upload in V1. The `avatar_url` field accepts any URL string (manually entered). Initials-based avatar is the primary display for V1. The `avatarUrl` field in the form is a plain `TextInput` labelled "URL da imagem (opcional)". Leave empty to use initials fallback.

### `settings/_layout.tsx` — Shared with Story 1.3

`src/app/(app)/settings/_layout.tsx` is also created by Story 1.3. If Story 1.3 is already implemented, this file exists — **do not recreate it**. If not, create it:

```typescript
import { Stack } from 'expo-router';
export default function SettingsLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
```

### Navigation from `index.tsx` — Additive

Story 1.3 adds a "Utilizadores" button to `index.tsx`. Story 1.4 adds a "Perfis" button. Both additions are independent `TouchableOpacity` items. If Story 1.3 hasn't been implemented, only the "Perfis" button needs to be added. Do not remove any existing buttons.

```typescript
<TouchableOpacity onPress={() => router.push('/(app)/settings/profiles')}>
  <Text>Perfis</Text>
</TouchableOpacity>
```

### `useRepository('profile')` — Already Wired

`profile: IProfileRepository` is already in `RepositoryContextValue` and `RepositoryProvider`. `useRepository('profile')` works without any context changes. Only the interface and implementation files need updating.

### `authStore.userAccount.familyId` — Available in Screen

The profiles screen needs `familyId` to call `getProfilesByFamily()` and `createProfile()`. Access it via `useAuthStore().userAccount?.familyId`. The `(app)` layout uses `useAuthGuard()` which ensures `userAccount` is non-null when any `(app)` screen renders.

### Learnings from Stories 1.1 / 1.2 / 1.3

- **No `--clear` flag**: `npx expo run:android` only
- **Metro cache clear**: `lsof -ti:8081 | xargs kill -9` before rebuild if needed
- **Prettier before lint**: `npx prettier --write <files>` after editing
- **Logger**: `logger.error('ProfileRepository', 'message', error)` → filterable via `adb logcat ReactNativeJS:* *:S | grep "\[FH"`
- **Supabase `.single()`**: returns `{ data: Row | null, error }` — check both

### Project Structure Notes

- `profiles.tsx` follows the same kebab-case file naming as all other route files
- The repository methods follow the existing snake_case → camelCase conversion pattern in the repository layer
- `Alert.alert()` is the standard React Native confirmation dialog — no external dependency needed
- `Modal` (built-in React Native) is used for the bottom sheet — no external library

### References

- Epic 1 Story 1.4 AC — `_bmad-output/planning-artifacts/epics.md`
- Architecture: repository pattern, naming conventions — `_bmad-output/planning-artifacts/architecture.md`
- Existing profile repository — `familyhub/src/repositories/supabase/profile.repository.ts`
- Existing profile interface — `familyhub/src/repositories/interfaces/profile.repository.interface.ts`
- Logger utility — `familyhub/src/utils/logger.ts`

## File List

### New Files
- `familyhub/src/app/(app)/settings/profiles.tsx`
- `familyhub/src/app/(app)/settings/_layout.tsx` *(only if Story 1.3 not yet implemented)*

### Modified Files
- `familyhub/src/repositories/interfaces/profile.repository.interface.ts` (add createProfile, deleteProfile)
- `familyhub/src/repositories/supabase/profile.repository.ts` (implement createProfile, updateProfile, deleteProfile)
- `familyhub/src/app/(app)/index.tsx` (add "Perfis" navigation button)

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

- Implemented `createProfile`, `updateProfile`, `deleteProfile` in `SupabaseProfileRepository`
- `deleteProfile` includes application-level guard: queries `user_accounts` for linked profile before deleting; throws Portuguese error if found
- `profiles.tsx` uses `useRepository('user').getUsersAndInvitations()` to derive linked profile IDs — no raw client exposure needed
- `loadData` loads profiles + linked IDs in a single `Promise.all`; called on mount, after save, and after delete
- `settings/_layout.tsx` already existed from Story 1.3 — not recreated
- type-check and lint pass with zero errors

### File List

- `familyhub/src/repositories/interfaces/profile.repository.interface.ts` (modified)
- `familyhub/src/repositories/supabase/profile.repository.ts` (modified)
- `familyhub/src/app/(app)/settings/profiles.tsx` (new)
- `familyhub/src/app/(app)/index.tsx` (modified)
