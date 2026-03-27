import { useContext, useEffect } from 'react';
import { Stack } from 'expo-router';
import { PaperProvider } from 'react-native-paper';
import { PowerSyncContext } from '@powersync/react';
import { powerSyncDb } from '../utils/powersync.database';
import { RepositoryProvider, RepositoryContext } from '../repositories/repository.context';
import { useAuthStore } from '../stores/auth.store';
import { supabaseClient } from '../repositories/supabase/supabase.client';
import { useAppTheme } from '../theme';

// Hydrates authStore from persisted SecureStore session on cold launch.
// Must be inside RepositoryProvider to access RepositoryContext.
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
          repositories!.sync
            .startSync(() =>
              supabaseClient.auth.getSession().then((s) => s.data.session?.access_token ?? '')
            )
            .catch(() => {
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

// PowerSyncContext.Provider must be the outermost wrapper so RepositoryProvider
// and all screens below it can call useQuery hooks.
// PaperProvider sits below RepositoryProvider (no Paper dependency) and above
// AppInitializer/Stack so all screens can use Paper components.
export default function RootLayout() {
  const { paperTheme } = useAppTheme();

  return (
    <PowerSyncContext.Provider value={powerSyncDb}>
      <RepositoryProvider>
        <PaperProvider theme={paperTheme}>
          <AppInitializer>
            <Stack screenOptions={{ headerShown: false }} />
          </AppInitializer>
        </PaperProvider>
      </RepositoryProvider>
    </PowerSyncContext.Provider>
  );
}
