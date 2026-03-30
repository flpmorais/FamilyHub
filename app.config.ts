import { ExpoConfig, ConfigContext } from 'expo/config';

const IS_DEV = process.env.APP_ENV === 'development';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: IS_DEV ? 'FamilyHub (Dev)' : 'FamilyHub',
  slug: 'familyhub',
  version: '1.0.0',
  orientation: 'portrait',
  scheme: IS_DEV ? 'familyhub-dev' : 'familyhub',
  platforms: ['android'],
  android: {
    adaptiveIcon: {
      foregroundImage: IS_DEV
        ? './assets/android-icon-foreground-dev.png'
        : './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: IS_DEV
        ? './assets/android-icon-monochrome-dev.png'
        : './assets/android-icon-monochrome.png',
      backgroundColor: '#B5451B',
    },
    package: IS_DEV ? 'com.morais.familyhub.dev' : 'com.morais.familyhub',
  },
  plugins: [
    'expo-router',
    'expo-secure-store',
    [
      'expo-build-properties',
      { android: { minSdkVersion: 26 } },
    ],
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
    [
      'expo-image-picker',
      { photosPermission: 'FamilyHub precisa de acesso às suas fotos para escolher um avatar.' },
    ],
  ],
  extra: {
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
    googleWebClientId: process.env.GOOGLE_WEB_CLIENT_ID,
    eas: {
      projectId: process.env.EAS_PROJECT_ID ?? '373701cc-d3cf-495d-9853-e36487965d6e',
    },
  },
  updates: {
    url: 'https://u.expo.dev/' + (process.env.EAS_PROJECT_ID ?? '373701cc-d3cf-495d-9853-e36487965d6e'),
    enabled: true,
    fallbackToCacheTimeout: 0,
  },
  runtimeVersion: {
    policy: 'appVersion',
  },
});
