import { MD3LightTheme, MD3DarkTheme, adaptNavigationTheme } from 'react-native-paper';
import {
  DefaultTheme as NavigationDefaultTheme,
  DarkTheme as NavigationDarkTheme,
} from '@react-navigation/native';
import { useColorScheme } from 'react-native';

// Terracotta seed #B5451B — M3 palette roles from UX Design Specification
const lightColors = {
  ...MD3LightTheme.colors,
  primary: '#9D3510',
  onPrimary: '#FFFFFF',
  primaryContainer: '#FFDBCF',
  onPrimaryContainer: '#370E00',
  secondary: '#77574C',
  onSecondary: '#FFFFFF',
  secondaryContainer: '#FFDBCF',
  onSecondaryContainer: '#2C1510',
  surface: '#FFF8F6',
  onSurface: '#1A1110',
  surfaceVariant: '#F5EDEB',
  onSurfaceVariant: '#534341',
  background: '#FFF8F6',
  onBackground: '#1A1110',
  error: '#BA1A1A',
  onError: '#FFFFFF',
  errorContainer: '#FFDAD6',
  onErrorContainer: '#410002',
  outline: '#857371',
  surfaceDisabled: 'rgba(26, 17, 16, 0.12)',
  onSurfaceDisabled: 'rgba(26, 17, 16, 0.38)',
  elevation: {
    ...MD3LightTheme.colors.elevation,
    level0: '#FFF8F6',
    level1: '#FCEFEB',
    level2: '#F9E8E2',
    level3: '#F6E1D9',
    level4: '#F5DED5',
    level5: '#F3D9CE',
  },
};

const darkColors = {
  ...MD3DarkTheme.colors,
  primary: '#FFB59A',
  onPrimary: '#5B1A00',
  primaryContainer: '#7A2800',
  onPrimaryContainer: '#FFDBCF',
  secondary: '#E7BDB0',
  onSecondary: '#442A21',
  secondaryContainer: '#5D4036',
  onSecondaryContainer: '#FFDBCF',
  surface: '#1A1110',
  onSurface: '#F0DEDB',
  surfaceVariant: '#261917',
  onSurfaceVariant: '#D8C2BE',
  background: '#1A1110',
  onBackground: '#F0DEDB',
  error: '#FFB4AB',
  onError: '#690005',
  errorContainer: '#93000A',
  onErrorContainer: '#FFDAD6',
  outline: '#A08C89',
  surfaceDisabled: 'rgba(240, 222, 219, 0.12)',
  onSurfaceDisabled: 'rgba(240, 222, 219, 0.38)',
  elevation: {
    ...MD3DarkTheme.colors.elevation,
    level0: '#1A1110',
    level1: '#261917',
    level2: '#2E1F1C',
    level3: '#362521',
    level4: '#382723',
    level5: '#3E2B27',
  },
};

export const lightTheme = {
  ...MD3LightTheme,
  colors: lightColors,
};

export const darkTheme = {
  ...MD3DarkTheme,
  colors: darkColors,
};

// Adapted navigation themes for expo-router/react-navigation compatibility
const { LightTheme: adaptedLightNav, DarkTheme: adaptedDarkNav } = adaptNavigationTheme({
  reactNavigationLight: NavigationDefaultTheme,
  reactNavigationDark: NavigationDarkTheme,
  materialLight: lightTheme,
  materialDark: darkTheme,
});

export const navigationLightTheme = adaptedLightNav;
export const navigationDarkTheme = adaptedDarkNav;

export function useAppTheme() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  return {
    paperTheme: isDark ? darkTheme : lightTheme,
    navigationTheme: isDark ? navigationDarkTheme : navigationLightTheme,
    isDark,
  };
}
