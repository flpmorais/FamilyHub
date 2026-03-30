import { useContext, useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { PaperProvider, Snackbar } from 'react-native-paper';
import { RepositoryProvider, RepositoryContext } from '../repositories/repository.context';
import { useAuthStore } from '../stores/auth.store';
import { useAppTheme } from '../theme';

// Hydrates authStore from persisted SecureStore session on cold launch.
// Must be inside RepositoryProvider to access RepositoryContext.
function AppInitializer({ children }: { children: React.ReactNode }) {
  const repositories = useContext(RepositoryContext);
  const { setUserAccount, setLoading } = useAuthStore();
  const [otaVisible, setOtaVisible] = useState(false);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    repositories!.auth
      .getCurrentSession()
      .then(async (userAccount) => {
        if (!mounted) return;
        setUserAccount(userAccount);
        setLoading(false);
        // OTA update check — fire and forget, never blocks launch
        void repositories!.ota.checkForUpdate(() => setOtaVisible(true));
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

  return (
    <>
      {children}
      <Snackbar
        visible={otaVisible}
        onDismiss={() => setOtaVisible(false)}
        duration={3000}
        style={{ position: 'absolute', top: 48, backgroundColor: '#1976D2' }}
        theme={{ colors: { inverseSurface: '#1976D2', inverseOnSurface: '#FFFFFF' } }}
      >
        Actualização instalada. A reiniciar...
      </Snackbar>
    </>
  );
}

export default function RootLayout() {
  const { paperTheme } = useAppTheme();

  return (
    <RepositoryProvider>
      <PaperProvider theme={paperTheme}>
        <AppInitializer>
          <Stack screenOptions={{ headerShown: false }} />
        </AppInitializer>
      </PaperProvider>
    </RepositoryProvider>
  );
}
