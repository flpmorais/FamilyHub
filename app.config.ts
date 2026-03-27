import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'FamilyHub',
  slug: 'familyhub',
  version: '1.0.0',
  orientation: 'portrait',
  scheme: 'familyhub',
  platforms: ['android'],
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      backgroundColor: '#B5451B',
    },
    package: 'com.morais.familyhub',
    // minSdkVersion is a valid Expo Android config value but missing from @expo/config-types typedefs
    ...(({ minSdkVersion: 26 }) as object),
  },
  plugins: [
    'expo-router',
    'expo-secure-store',
    [
      'expo-updates',
      {
        username: 'filipe-morais',
      },
    ],
    [
      '@react-native-google-signin/google-signin',
      { iosUrlScheme: 'com.googleusercontent.apps.19946395703-j0gfhpu3ibm8hupu885s50p0rqvdnm5n' }, // Android-only app — iosUrlScheme unused at runtime but plugin requires reversed client ID format
    ],
    // @op-engineering/op-sqlite v15+ uses auto-linking only — no Expo config plugin needed
  ],
  extra: {
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
    powerSyncUrl: process.env.POWERSYNC_URL,
    googleWebClientId: process.env.GOOGLE_WEB_CLIENT_ID,
    eas: {
      projectId: process.env.EAS_PROJECT_ID ?? '',
    },
  },
  updates: {
    url: 'https://u.expo.dev/' + (process.env.EAS_PROJECT_ID ?? ''),
    enabled: true,
    fallbackToCacheTimeout: 0,
  },
  runtimeVersion: {
    policy: 'appVersion',
  },
});
