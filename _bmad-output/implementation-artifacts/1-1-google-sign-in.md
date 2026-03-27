# Story 1.1: Google Sign-In

Status: done

## Story

As an Admin,
I want to sign in to FamilyHub using my Google account,
So that I can access the app securely without creating a separate password.

## Acceptance Criteria

1. **Given** the sign-in screen is displayed
   **When** the user taps "Entrar com Google"
   **Then** the Google account picker opens via `@react-native-google-signin/google-signin`
   **And** on successful Google auth, `supabase.auth.signInWithIdToken()` is called with the Google ID token
   **And** the Supabase JWT session is stored in `expo-secure-store` (not AsyncStorage) — Supabase client handles this via the custom storage adapter
   **And** the user is navigated to `(app)/index.tsx`

2. **Given** a valid session exists in `expo-secure-store`
   **When** the app launches
   **Then** the user is navigated directly to `(app)/index.tsx` without seeing the sign-in screen
   **And** Google Sign-In is not triggered again (NFR18 — cached session used)

3. **Given** the user is signed in
   **When** `authStore` is read
   **Then** `authStore.session` contains the `UserAccount` domain object
   **And** `authStore.isLoading` is `false` and `authStore.error` is `null`

4. **Given** Google Sign-In fails or is cancelled
   **When** the error is caught in `SupabaseAuthRepository`
   **Then** a `RepositoryError` is thrown with a human-readable message
   **And** the sign-in screen remains visible with a Portuguese error message
   **And** the app does not crash

## Tasks / Subtasks

- [x] Task 1: Configure Google Sign-In and add env variables (AC: 1)
  - [x] Add `GOOGLE_WEB_CLIENT_ID=` to `.env.development`, `.env.preview`, `.env.production`
  - [x] Add `googleWebClientId: process.env.GOOGLE_WEB_CLIENT_ID` to `app.config.ts` `extra` block
  - [x] Add `@react-native-google-signin/google-signin` plugin to `app.config.ts` `plugins` array with `{ iosUrlScheme: '' }` (Android-only — iosUrlScheme required by plugin schema but not used)
  - [x] **Note:** Dev must set `GOOGLE_WEB_CLIENT_ID` to their actual Web Client ID from Google Cloud Console OAuth 2.0 credentials, and run `expo run:android` to rebuild the native layer

- [x] Task 2: Configure Supabase client to use SecureStore (AC: 1, 2)
  - [x] Update `src/repositories/supabase/supabase.client.ts` — add `ExpoSecureStoreAdapter` and pass `storage: ExpoSecureStoreAdapter` to `createClient()` auth options (plain object adapter, not class)

- [x] Task 3: Implement `SupabaseAuthRepository` (AC: 1, 2, 4)
  - [x] Replace stub implementations in `src/repositories/supabase/auth.repository.ts`
  - [x] Implement `signInWithGoogle()` — calls `GoogleSignin.configure()`, then `GoogleSignin.signIn()`, extracts `idToken`, calls `supabase.auth.signInWithIdToken()`, maps result to `UserAccount`
  - [x] Implement `getCurrentSession()` — calls `supabase.auth.getSession()`, maps to `UserAccount | null`
  - [x] Implement `signOut()` — calls `GoogleSignin.signOut()` + `supabase.auth.signOut()`
  - [x] Verify: zero Supabase or GoogleSignin imports outside `src/repositories/supabase/` ✅

- [x] Task 4: Update `useAuthGuard` hook (AC: 2)
  - [x] Replace stub in `src/hooks/use-auth-guard.ts` — check `useAuthStore().session`, only redirect to sign-in if `session` is `null` and `isLoading` is `false`

- [x] Task 5: Update `(auth)/_layout.tsx` to redirect if session exists (AC: 2)
  - [x] Update `src/app/(auth)/_layout.tsx` — add session check using `useAuthStore()`, redirect to `/(app)` if session is already set

- [x] Task 6: Implement sign-in screen (AC: 1, 3, 4)
  - [x] Replace placeholder in `src/app/(auth)/sign-in.tsx` — full Google Sign-In screen
  - [x] Screen calls `authRepository.signInWithGoogle()`, sets `authStore.session`; navigation driven by `(auth)/_layout.tsx` session watcher
  - [x] Handles `isLoading` state and displays Portuguese error messages

- [x] Task 7: Wire sync start after sign-in (AC: 3)
  - [x] In `sign-in.tsx`, after successful sign-in: `syncRepository.startSync(() => supabaseClient.auth.getSession().then(s => s.data.session?.access_token ?? ''))` called
  - [x] `syncRepository` accessed via `useRepository('sync')`, `supabaseClient` imported from `src/repositories/supabase/supabase.client.ts`

- [x] Task 8: Verify (AC: 1, 2, 3, 4)
  - [x] Run: `npm run type-check` — zero TypeScript errors ✅
  - [x] Run: `npm run lint` — zero errors ✅
  - [x] Run: `expo run:android` — sign-in screen appears, "Entrar com Google" opens Google account picker ✅
  - [x] Verify: After sign-in, app navigates to `(app)/index.tsx` ✅
  - [x] Verify: Force-close and reopen app — navigates directly to `(app)/index.tsx` (cached session) ✅
  - [x] Verify: `adb logcat -s ReactNativeJS` shows no JS errors ✅

## Dev Notes

### ⚠️ CRITICAL: GoogleWebClientId Must Come From `Constants.expoConfig?.extra`

Same pattern as `supabaseUrl` and `powerSyncUrl`. Never read from `process.env` in app code:

```
app.config.ts → extra: { googleWebClientId: process.env.GOOGLE_WEB_CLIENT_ID }
↓
Runtime: Constants.expoConfig?.extra?.googleWebClientId
```

Call `GoogleSignin.configure()` once before the first sign-in attempt — best place is in `SupabaseAuthRepository.signInWithGoogle()` itself (idempotent call).

### ⚠️ CRITICAL: `@react-native-google-signin/google-signin` v16.1.2 API

This is a **new-style** API (v13+). The old `signIn()` that returned `UserInfo` directly is gone.

#### `GoogleSignin.configure()`
```typescript
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import Constants from 'expo-constants';

GoogleSignin.configure({
  webClientId: Constants.expoConfig?.extra?.googleWebClientId as string,
  // scopes: ['profile', 'email'], // default — omit unless adding extra scopes
});
```

#### `GoogleSignin.signIn()` — returns `SignInResponse`
```typescript
import {
  GoogleSignin,
  isSuccessResponse,
  isCancelledResponse,
  isErrorWithCode,
  statusCodes,
} from '@react-native-google-signin/google-signin';

const response = await GoogleSignin.signIn();

if (isSuccessResponse(response)) {
  const idToken = response.data.idToken; // string | null
  // idToken is null only when `offlineAccess` is enabled without `forceCodeForRefreshToken`
  // For this app: idToken will always be present
}
if (isCancelledResponse(response)) {
  // User pressed back — not an error
}
```

#### Error handling with `isErrorWithCode()`
```typescript
if (isErrorWithCode(error)) {
  switch (error.code) {
    case statusCodes.IN_PROGRESS:
      // sign-in already in progress
      break;
    case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
      // Google Play Services not available
      break;
    default:
      // other error
  }
}
```

#### `GoogleSignin.signInSilently()` — for cached session check
```typescript
const response = await GoogleSignin.signInSilently();
if (isSuccessResponse(response)) {
  const idToken = response.data.idToken;
}
// throws if no previous sign-in
```

#### `GoogleSignin.signOut()`
```typescript
await GoogleSignin.signOut();
```

### ⚠️ CRITICAL: Supabase Client Must Use `expo-secure-store` Adapter

The `supabase-js` client accepts a `storage` option. We must pass a `SecureStore`-backed adapter so sessions are never written to `AsyncStorage` (AR7).

The standard adapter pattern for `@supabase/supabase-js` v2 with `expo-secure-store`:

```typescript
// src/repositories/supabase/supabase.client.ts — FULL REPLACEMENT
import Constants from 'expo-constants';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';

// SecureStore adapter for Supabase session persistence (AR7: no AsyncStorage)
const ExpoSecureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl as string;
const supabaseAnonKey = Constants.expoConfig?.extra?.supabaseAnonKey as string;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase configuration. Check .env.development and app.config.ts extra fields.'
  );
}

export const supabaseClient: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
```

**Note:** `expo-secure-store` key length limit is 256 characters. Supabase uses short keys (`supabase.auth.token`) — no issue.

### `SupabaseAuthRepository` — Full Implementation

```typescript
// src/repositories/supabase/auth.repository.ts
import { SupabaseClient } from '@supabase/supabase-js';
import {
  GoogleSignin,
  isSuccessResponse,
  isCancelledResponse,
  isErrorWithCode,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import Constants from 'expo-constants';
import { IAuthRepository } from '../interfaces/auth.repository.interface';
import { UserAccount } from '../../types/profile.types';

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

    const { data, error } = await this.client.auth.signInWithIdToken({
      provider: 'google',
      token: idToken,
    });

    if (error) {
      throw new Error(`Erro ao autenticar com Supabase: ${error.message}`);
    }

    if (!data.user) {
      throw new Error('Sessão inválida após autenticação.');
    }

    return this.mapToUserAccount(data.user);
  }

  async signOut(): Promise<void> {
    await GoogleSignin.signOut();
    const { error } = await this.client.auth.signOut();
    if (error) {
      throw new Error(`Erro ao terminar sessão: ${error.message}`);
    }
  }

  async getCurrentSession(): Promise<UserAccount | null> {
    const { data, error } = await this.client.auth.getSession();
    if (error || !data.session?.user) {
      return null;
    }
    return this.mapToUserAccount(data.session.user);
  }

  // Maps Supabase User to UserAccount domain type
  // Note: user_metadata from Google contains google_id and email
  private mapToUserAccount(user: { id: string; email?: string | null; user_metadata?: Record<string, unknown>; created_at?: string }): UserAccount {
    return {
      id: user.id,
      googleId: (user.user_metadata?.['sub'] as string | undefined) ?? user.id,
      email: user.email ?? '',
      role: 'admin', // Story 1.1: all sign-ins are admin (Story 1.2 adds family linking with role inference)
      familyId: '', // Story 1.2 populates this after user_account row creation
      createdAt: user.created_at ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }
}
```

**Note on `familyId` and `role`:** Story 1.1 is only the auth mechanism. The `UserAccount` returned maps the Supabase auth user. `familyId` will be populated in Story 1.2 when the `user_accounts` Supabase table row is read/created. For now `familyId: ''` is acceptable — the session is stored and navigation works.

### `use-auth-guard.ts` — Replacement

```typescript
// src/hooks/use-auth-guard.ts
import { useEffect } from 'react';
import { router } from 'expo-router';
import { useAuthStore } from '../stores/auth.store';

// Redirects to sign-in if no session. No-op while loading.
export function useAuthGuard(): void {
  const { session, isLoading } = useAuthStore();
  useEffect(() => {
    if (!isLoading && session === null) {
      router.replace('/(auth)/sign-in');
    }
  }, [session, isLoading]);
}
```

### `(auth)/_layout.tsx` — Redirect If Session Exists

```typescript
// src/app/(auth)/_layout.tsx
import { useEffect } from 'react';
import { Stack, router } from 'expo-router';
import { useAuthStore } from '../../stores/auth.store';

export default function AuthLayout() {
  const { session } = useAuthStore();

  useEffect(() => {
    if (session !== null) {
      router.replace('/(app)');
    }
  }, [session]);

  return <Stack screenOptions={{ headerShown: false }} />;
}
```

### `sign-in.tsx` — Full Implementation

```typescript
// src/app/(auth)/sign-in.tsx
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRepository } from '../../hooks/use-repository';
import { useAuthStore } from '../../stores/auth.store';
import { supabaseClient } from '../../repositories/supabase/supabase.client';

export default function SignInScreen() {
  const authRepository = useRepository('auth');
  const syncRepository = useRepository('sync');
  const { setSession, setLoading, setError, isLoading, error } = useAuthStore();

  async function handleSignIn() {
    setLoading(true);
    setError(null);
    try {
      const userAccount = await authRepository.signInWithGoogle();
      setSession(userAccount);
      // Start PowerSync sync after authentication
      await syncRepository.startSync(
        () => supabaseClient.auth.getSession().then((s) => s.data.session?.access_token ?? '')
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido ao iniciar sessão.';
      setError(message);
    } finally {
      setLoading(false);
    }
    // Navigation is handled by (auth)/_layout.tsx reacting to session change
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>FamilyHub</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <TouchableOpacity
        style={[styles.button, isLoading && styles.buttonDisabled]}
        onPress={handleSignIn}
        disabled={isLoading}
        accessibilityLabel="Entrar com Google"
      >
        {isLoading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.buttonText}>Entrar com Google</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#FFFFFF',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 48,
    color: '#B5451B',
  },
  error: {
    color: '#D32F2F',
    marginBottom: 16,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#B5451B',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 8,
    minWidth: 200,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
```

**Note:** `GoogleSigninButton` from the library is also available as a drop-in — use it if preferred. The custom `TouchableOpacity` above matches the app's terracotta theme and keeps zero extra dependencies.

### Session Initialization on App Launch

When the app launches, `(app)/_layout.tsx` calls `useAuthGuard()`. The guard reads `useAuthStore().session`. On first launch, `session` is `null` — the guard redirects to sign-in.

On subsequent launches (cached session in SecureStore), the `SupabaseAuthRepository.getCurrentSession()` must be called at app startup to hydrate `authStore`. This needs to happen in `_layout.tsx` or a dedicated `AppInitializer` component.

Add session initialization to `src/app/_layout.tsx`:

```typescript
// src/app/_layout.tsx — FULL REPLACEMENT
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { PowerSyncContext } from '@powersync/react';
import { powerSyncDb } from '../utils/powersync.database';
import { RepositoryProvider, RepositoryContext } from '../repositories/repository.context';
import { useAuthStore } from '../stores/auth.store';
import { useContext } from 'react';

function AppInitializer({ children }: { children: React.ReactNode }) {
  const repositories = useContext(RepositoryContext);
  const { setSession, setLoading } = useAuthStore();

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    repositories!.auth.getCurrentSession().then((userAccount) => {
      if (mounted) {
        setSession(userAccount);
        setLoading(false);
      }
    }).catch(() => {
      if (mounted) {
        setSession(null);
        setLoading(false);
      }
    });
    return () => { mounted = false; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <PowerSyncContext.Provider value={powerSyncDb}>
      <RepositoryProvider>
        <AppInitializer>
          <Stack screenOptions={{ headerShown: false }} />
        </AppInitializer>
      </RepositoryProvider>
    </PowerSyncContext.Provider>
  );
}
```

**Why `AppInitializer` inside `RepositoryProvider`:** `RepositoryContext` is only available below `RepositoryProvider`. `AppInitializer` needs `repositories.auth` — it must be a child of `RepositoryProvider`.

### app.config.ts — Required Changes

```typescript
// app.config.ts plugins array — replace the comment with:
plugins: [
  'expo-router',
  'expo-secure-store',
  [
    'expo-updates',
    { username: 'filipe-morais' },
  ],
  [
    '@react-native-google-signin/google-signin',
    { iosUrlScheme: '' }, // Android-only app — iosUrlScheme required by plugin schema but unused
  ],
],
// extra block:
extra: {
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
  powerSyncUrl: process.env.POWERSYNC_URL,
  googleWebClientId: process.env.GOOGLE_WEB_CLIENT_ID,
  eas: {
    projectId: process.env.EAS_PROJECT_ID ?? '',
  },
},
```

### Android Native Build Note

`@react-native-google-signin/google-signin` requires a native rebuild after adding the config plugin. After updating `app.config.ts`:

```bash
# Kill existing Metro (if running)
lsof -ti:8081 | xargs kill -9
# Rebuild and launch
ANDROID_HOME=/home/fmorais/.Android npx expo run:android --clear
```

The `google-services.json` file is NOT required for the `webClientId` flow — it is only needed for Firebase push notifications. For Supabase + Google Sign-In, only `webClientId` is needed.

**To get the `GOOGLE_WEB_CLIENT_ID`:**
1. Go to Google Cloud Console → APIs & Services → Credentials
2. Create OAuth 2.0 Client ID → Web application
3. Copy the Client ID value
4. Set it in `.env.development`: `GOOGLE_WEB_CLIENT_ID=<your-web-client-id>`

### Repository Architecture Compliance (AR8)

The following imports are FORBIDDEN outside `src/repositories/supabase/`:
- `@supabase/supabase-js`
- `@react-native-google-signin/google-signin`

The sign-in screen (`sign-in.tsx`) accesses Supabase only indirectly:
1. `authRepository.signInWithGoogle()` — via IAuthRepository interface
2. `supabaseClient` is imported only to pass the token provider lambda to `syncRepository.startSync()`. This lambda is a closure — it does not import Supabase types, it references the already-imported singleton.

If this `supabaseClient` import in `sign-in.tsx` is considered a violation, the token provider can instead be defined inside `SupabaseSyncRepository.startSync()` using `this.client`. In that case, `startSync()` takes no arguments. This is a valid refactor but requires updating the `ISyncRepository` interface back to `startSync(): Promise<void>`. Check with the project lead before changing this.

### `useRepository` Hook Pattern

Existing screens access repositories via:
```typescript
import { useRepository } from '../../hooks/use-repository';
const authRepository = useRepository('auth');
```

The `useRepository` hook reads from `RepositoryContext`. The key names match `RepositoryContextValue` fields: `'auth' | 'profile' | 'vacation' | 'packingItem' | 'category' | 'template' | 'sync' | 'ota'`.

---

## File List

### New Files
_(none — all files already exist as stubs)_

### Modified Files
- `familyhub/src/repositories/supabase/supabase.client.ts` (add SecureStore adapter)
- `familyhub/src/repositories/supabase/auth.repository.ts` (replace all 3 stubs)
- `familyhub/src/hooks/use-auth-guard.ts` (replace stub — check session before redirect)
- `familyhub/src/app/_layout.tsx` (add AppInitializer for session hydration)
- `familyhub/src/app/(auth)/_layout.tsx` (add redirect-if-session logic)
- `familyhub/src/app/(auth)/sign-in.tsx` (replace placeholder with full screen)
- `familyhub/app.config.ts` (add Google plugin + googleWebClientId to extra)
- `familyhub/.env.development` (add GOOGLE_WEB_CLIENT_ID)
- `familyhub/.env.preview` (add GOOGLE_WEB_CLIENT_ID)
- `familyhub/.env.production` (add GOOGLE_WEB_CLIENT_ID)

## Dev Agent Record

### Completion Notes

All 7 executable tasks completed. Tasks 8 sub-items that require a physical device + `GOOGLE_WEB_CLIENT_ID` value are left unchecked — those are developer-run verifications requiring an actual Google OAuth credential.

**AC coverage:**
- AC1: `sign-in.tsx` calls `authRepository.signInWithGoogle()` → `GoogleSignin.signIn()` → `supabase.auth.signInWithIdToken()` → session stored in SecureStore via `ExpoSecureStoreAdapter` ✅
- AC2: `AppInitializer` in `_layout.tsx` hydrates `authStore` on cold launch via `getCurrentSession()`; `useAuthGuard` only redirects when `session === null && !isLoading`; `(auth)/_layout.tsx` redirects to `/(app)` if session already set ✅
- AC3: `setSession(userAccount)` called in `sign-in.tsx` after successful sign-in; `setLoading(false)` + `setError(null)` set in finally block ✅
- AC4: Cancelled sign-in throws `'Início de sessão cancelado.'`; Supabase error thrown as Portuguese message; sign-in screen stays visible via `setError()` ✅

**Key decisions:**
- `ExpoSecureStoreAdapter` uses plain object pattern (not class) — compatible with `supabase-js` v2 `StorageAdapter` interface
- `AppInitializer` placed inside `RepositoryProvider` to access `RepositoryContext`; uses `mounted` flag to prevent state updates after unmount
- Navigation after sign-in driven by `(auth)/_layout.tsx` session watcher (not `router.push` in sign-in.tsx) — cleaner unidirectional flow
- `familyId: ''` and `role: 'admin'` in `mapToUserAccount` are explicit Story 1.2 stubs; comments document intent

### Debug Log

| Issue | Resolution |
|-------|-----------|
| Prettier error in sign-in.tsx: arrow function formatting on lines 18-19 | `npx prettier --write` reformatted `startSync(() =>\n  ...)` multiline arrow |
| DEVELOPER_ERROR (code 10) on sign-in | Expo uses `android/app/debug.keystore`, not `~/.android/debug.keystore`. Registered wrong SHA-1 in Google Cloud Console. Fix: get SHA-1 from `android/app/debug.keystore` using keytool. |
| `Constants.expoConfig?.extra?.googleWebClientId` returning `undefined` | App was built before `GOOGLE_WEB_CLIENT_ID` was added to `.env.development`. Fix: `lsof -ti:8081 \| xargs kill -9` then `expo run:android --clear`. |

## Change Log

- Implemented Google Sign-In auth flow: `SupabaseAuthRepository`, `useAuthGuard`, sign-in screen, `AppInitializer` session hydration (Date: 2026-03-26)
- Added `ExpoSecureStoreAdapter` to Supabase client (Date: 2026-03-26)
- Added `GOOGLE_WEB_CLIENT_ID` env var to all three `.env` files and `app.config.ts` (Date: 2026-03-26)
- Added `@react-native-google-signin/google-signin` config plugin to `app.config.ts` (Date: 2026-03-26)
