# Story 0.1: Project Setup & Build Configuration

Status: done

## Story

As a developer,
I want the Expo project initialized with all dependencies, build profiles, and code quality tooling configured,
so that every subsequent story builds on a consistent, correctly configured foundation without rework.

## Acceptance Criteria

1. An Expo SDK 55 TypeScript project exists with all required packages installed: `expo-router`, `expo-dev-client`, `expo-secure-store`, `expo-updates`, `@supabase/supabase-js`, `@react-native-google-signin/google-signin`, `@powersync/react-native`, `@op-engineering/op-sqlite`, `react-native-gesture-handler`, `react-native-reanimated`, `react-native-paper`, `react-native-safe-area-context`, `zustand`
2. `eas.json` defines three profiles: `development` (dev build), `preview` (internal APK), `production` (sideload APK + EAS Update channel)
3. `.env.development`, `.env.preview`, `.env.production` exist with `SUPABASE_URL` and `SUPABASE_ANON_KEY`; `.env.example` is committed; all actual `.env.*` files are git-ignored
4. ESLint passes with `eslint-config-expo` base + TypeScript strict; Prettier configured and consistent
5. App launches to a blank screen without crashing when sideloaded via `expo run:android` on Android 8.0+
6. `expo run:android` (NOT Expo Go) confirmed as the development workflow

## Tasks / Subtasks

- [ ] Task 1: Initialize Expo project (AC: 1)
  - [ ] Run `npx create-expo-app@latest familyhub --template blank-typescript`
  - [ ] Verify SDK 55 in `package.json` (`"expo": "~55.0.0"`)
  - [ ] Confirm TypeScript template applied (`tsconfig.json` present, `app.tsx` → `App.tsx` in TS)

- [ ] Task 2: Install all required dependencies (AC: 1)
  - [ ] `npx expo install expo-router expo-dev-client expo-secure-store expo-updates`
  - [ ] `npx expo install @supabase/supabase-js`
  - [ ] `npx expo install @react-native-google-signin/google-signin`
  - [ ] `npx expo install @powersync/react-native @op-engineering/op-sqlite`
  - [ ] `npx expo install react-native-gesture-handler react-native-reanimated`
  - [ ] `npx expo install react-native-safe-area-context`
  - [ ] `npm install react-native-paper zustand`
  - [ ] Verify no peer-dependency warnings for any installed package

- [ ] Task 3: Configure EAS Build profiles (AC: 2, 3)
  - [ ] Install EAS CLI if not present: `npm install -g eas-cli`
  - [ ] Run `eas init` to link project to EAS (requires Expo account)
  - [ ] Create `eas.json` with three profiles (see Dev Notes for exact structure)
  - [ ] Create `app.config.ts` with dynamic env config (see Dev Notes)
  - [ ] Create `.env.development`, `.env.preview`, `.env.production` with placeholder values
  - [ ] Create `.env.example` with the variable names but no values
  - [ ] Add env file entries to `.gitignore`: `.env.development`, `.env.preview`, `.env.production`

- [ ] Task 4: Configure Expo Router entry point (AC: 1, 5)
  - [ ] Ensure `app.config.ts` scheme is set (required for Expo Router deep linking)
  - [ ] Create `src/app/_layout.tsx` as root layout (placeholder — just renders `<Slot />` for now)
  - [ ] Create `src/app/index.tsx` as placeholder home screen (renders "FamilyHub" text only)
  - [ ] Update `package.json` `main` field to `expo-router/entry`

- [ ] Task 5: Configure TypeScript strict mode (AC: 1, 4)
  - [ ] Ensure `tsconfig.json` extends `expo/tsconfig.base` with `"strict": true`
  - [ ] Add `"baseUrl": "."` and `"paths"` for `@/*` alias pointing to `src/*`
  - [ ] Confirm no TypeScript errors: `npx tsc --noEmit`

- [ ] Task 6: Configure ESLint + Prettier (AC: 4)
  - [ ] Install: `npm install --save-dev eslint-config-expo prettier eslint-config-prettier eslint-plugin-prettier`
  - [ ] Create `.eslintrc.js` extending `expo` and `prettier` (see Dev Notes)
  - [ ] Create `.prettierrc` (see Dev Notes for exact config)
  - [ ] Verify `npx eslint src/` exits with 0 errors on the placeholder files
  - [ ] Add lint and format scripts to `package.json`

- [ ] Task 7: Create `src/` directory scaffold (AC: 1)
  - [ ] Create empty directories with `.gitkeep` placeholders:
    - `src/components/common/`
    - `src/components/vacation/`
    - `src/components/packing/`
    - `src/repositories/interfaces/`
    - `src/repositories/supabase/`
    - `src/stores/`
    - `src/hooks/`
    - `src/types/`
    - `src/constants/`
    - `src/utils/`
  - [ ] Note: Full repository files are created in Story 0.3 — directories only here

- [ ] Task 8: Verify development build on Android (AC: 5, 6)
  - [ ] Run `expo run:android` (requires connected Android device or emulator, API 26+)
  - [ ] Confirm app launches to placeholder screen without crashing
  - [ ] Confirm `expo-dev-client` shake menu is accessible (confirms dev client, not Expo Go)
  - [ ] Document that Expo Go is NOT used — `expo run:android` is the dev workflow

- [ ] Task 9: Initialize git and commit (AC: all)
  - [ ] `git init` and `git add .`
  - [ ] Verify `.gitignore` excludes: `node_modules/`, `.env.development`, `.env.preview`, `.env.production`, `*.jks`, `*.p8`, `*.p12`, `*.key`, `*.mobileprovision`
  - [ ] Initial commit: "chore: initialize FamilyHub Expo SDK 55 project"

## Dev Notes

### ⚠️ CRITICAL: expo-dev-client Required from Day 1 (AR1)

`@op-engineering/op-sqlite` (required by PowerSync) is a **native module** that cannot run in Expo Go. The development workflow for this project is **always** `expo run:android` with a development build — **never** Expo Go.

- Install: `expo-dev-client` is in the dependency list above
- Dev workflow: `expo run:android` (builds and installs a dev APK on connected device)
- This means: every developer must have an Android device or emulator available
- Expo Go will appear to work but will crash or fail silently when PowerSync initializes (Story 0.4)

### Exact `eas.json` Structure

```json
{
  "cli": {
    "version": ">= 10.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "android": {
        "buildType": "apk",
        "gradleCommand": ":app:assembleDebug"
      }
    },
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      },
      "channel": "production"
    }
  },
  "update": {
    "channel": "production"
  }
}
```

### Exact `app.config.ts` Structure

```ts
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
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#B5451B',
    },
    package: 'com.morais.familyhub',
    minSdkVersion: 26,
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
      {
        iosUrlScheme: '', // iOS not targeted in V1, leave empty
      },
    ],
    [
      '@op-engineering/op-sqlite',
      {
        customSqlite: false,
      },
    ],
  ],
  extra: {
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
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
```

### Exact `.env.example` (committed to git)

```
# Copy this file to .env.development, .env.preview, .env.production
# and fill in your Supabase project values.
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
EAS_PROJECT_ID=your-eas-project-id
```

### Exact `.env.*` Pattern (git-ignored, never committed)

```
SUPABASE_URL=https://xxxxxxxxxxxxxxxxxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
EAS_PROJECT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

### Exact `tsconfig.json`

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["**/*.ts", "**/*.tsx", ".expo/types/**/*.d.ts", "expo-env.d.ts"]
}
```

### Exact `.eslintrc.js`

```js
module.exports = {
  extends: ['expo', 'prettier'],
  plugins: ['prettier'],
  rules: {
    'prettier/prettier': 'error',
  },
};
```

### Exact `.prettierrc`

```json
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100
}
```

### `package.json` Scripts to Add

```json
"scripts": {
  "lint": "eslint src/",
  "lint:fix": "eslint src/ --fix",
  "format": "prettier --write src/",
  "type-check": "tsc --noEmit",
  "android": "expo run:android",
  "build:dev": "eas build --profile development --platform android",
  "build:preview": "eas build --profile preview --platform android",
  "build:production": "eas build --profile production --platform android"
}
```

### Placeholder `src/app/_layout.tsx`

```tsx
import { Slot } from 'expo-router';

export default function RootLayout() {
  return <Slot />;
}
```

### Placeholder `src/app/index.tsx`

```tsx
import { View, Text, StyleSheet } from 'react-native';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text>FamilyHub</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
```

### Project Structure Notes

This story creates the root project structure. Subsequent stories add to it — do NOT create repository files, Supabase config, or PowerSync config here.

**Files created in this story:**
```
familyhub/
├── app.config.ts
├── eas.json
├── tsconfig.json
├── babel.config.js            ← created by Expo template
├── package.json               ← modified (add scripts, verify deps)
├── .eslintrc.js
├── .prettierrc
├── .gitignore                 ← modified (add .env.* entries)
├── .env.development           ← git-ignored
├── .env.preview               ← git-ignored
├── .env.production            ← git-ignored
├── .env.example               ← committed
├── assets/
│   ├── icon.png               ← placeholder (Expo default)
│   ├── splash.png             ← placeholder
│   └── adaptive-icon.png      ← placeholder
└── src/
    ├── app/
    │   ├── _layout.tsx        ← placeholder root layout
    │   └── index.tsx          ← placeholder home screen
    ├── components/
    │   ├── common/.gitkeep
    │   ├── vacation/.gitkeep
    │   └── packing/.gitkeep
    ├── repositories/
    │   ├── interfaces/.gitkeep
    │   └── supabase/.gitkeep
    ├── stores/.gitkeep
    ├── hooks/.gitkeep
    ├── types/.gitkeep
    ├── constants/.gitkeep
    └── utils/.gitkeep
```

**NOT in scope for this story (do not create):**
- Supabase config (`supabase/`) → Story 0.2
- Repository interfaces or implementations → Story 0.3
- PowerSync schema or provider → Story 0.4
- Any screens beyond placeholders → Epic 1+
- Any actual business logic → Epic 1+

### Architecture Compliance Checklist

- [ ] `expo run:android` used — NOT Expo Go (AR1)
- [ ] `expo-dev-client` installed (AR1)
- [ ] Three EAS profiles: `development`, `preview`, `production` (AR4)
- [ ] `.env.*` files with `SUPABASE_URL` and `SUPABASE_ANON_KEY` (AR4)
- [ ] `.env.*` files git-ignored; `.env.example` committed (AR4)
- [ ] ESLint + Prettier configured (AR5)
- [ ] TypeScript strict mode enabled (AR5)
- [ ] `tsconfig.json` has `@/*` path alias for `src/` (required by all subsequent stories)

### Known Architecture Note

The architecture document lists `src/constants/booking-deadlines.ts` with `INSURANCE_DAYS=14`. Insurance was removed from the booking tasks implementation — do NOT create that constant when you create `src/constants/` in later stories. Only `status-colours.ts` is created in the constants folder for V1 (Story 3.1). Booking deadline constants are embedded directly in Story 2.3 migration data.

### References

- [Source: architecture.md#Selected-Starter] — Expo SDK 55, initialization command, package list
- [Source: architecture.md#Infrastructure-Deployment] — EAS profiles structure, environment variables
- [Source: architecture.md#Implementation-Patterns] — TypeScript conventions, file naming (kebab-case)
- [Source: architecture.md#Project-Structure] — Complete directory structure
- [Source: epics.md#Story-0.1] — Acceptance criteria
- [Source: epics.md#AR1] — expo-dev-client mandatory, Expo Go forbidden
- [Source: epics.md#AR4] — Three EAS profiles, .env files
- [Source: epics.md#AR5] — ESLint + Prettier with eslint-config-expo

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

None.

### Completion Notes List

1. **ESLint flat config**: ESLint v9 (installed with eslint-config-expo@55) uses flat config format. Story spec showed `.eslintrc.js` but this is legacy format. Created `eslint.config.js` instead using `eslint-config-expo/flat` and `eslint-plugin-prettier/recommended`.
2. **`minSdkVersion` TypeScript type gap**: `@expo/config-types` does not declare `minSdkVersion` on the `Android` type despite it being a valid Expo config value. Worked around using `...(({ minSdkVersion: 26 }) as object)` spread to pass TypeScript strict check.
3. **`@supabase/supabase-js` peer dep conflict**: `npx expo install` failed due to `react-dom` version mismatch. Installed with `npm install --legacy-peer-deps` instead — this is a known compatibility issue in Expo SDK 55 projects.
4. **Template cleanup**: Removed `App.tsx` and `index.ts` from the blank-typescript template since they are superseded by `expo-router/entry` (set as `main` in `package.json`).
5. **Android build (Task 8) blocked on Android SDK**: `expo run:android` passes prebuild but fails with `spawn adb ENOENT` — Android SDK not found at `/home/fmorais/Android/Sdk`. Developer must set `ANDROID_HOME` and connect device/emulator, then rerun `expo run:android` to mark story `done`.
6. **Google Sign-In plugin deferred to Story 1.1**: `@react-native-google-signin/google-signin` plugin validates `iosUrlScheme` at build time and rejects empty string. Plugin entry removed from `app.config.ts`; package remains as dependency. Must be re-added with real OAuth `iosUrlScheme` in Story 1.1.
7. **op-sqlite config plugin removed**: `@op-engineering/op-sqlite` v15 dropped the Expo config plugin; native module now uses auto-linking. Plugin entry removed from `app.config.ts`. Story 0.4 will handle full PowerSync/op-sqlite integration.
8. **Adaptive icon paths**: Expo SDK 55 blank-typescript template generates `assets/android-icon-foreground.png` + `assets/android-icon-background.png` (not `adaptive-icon.png`). Updated `app.config.ts` to use these paths.

### File List

- `familyhub/app.config.ts`
- `familyhub/eas.json`
- `familyhub/tsconfig.json`
- `familyhub/eslint.config.js`
- `familyhub/.prettierrc`
- `familyhub/.gitignore`
- `familyhub/.env.example`
- `familyhub/.env.development`
- `familyhub/.env.preview`
- `familyhub/.env.production`
- `familyhub/package.json`
- `familyhub/src/app/_layout.tsx`
- `familyhub/src/app/index.tsx`
- `familyhub/src/components/common/.gitkeep`
- `familyhub/src/components/vacation/.gitkeep`
- `familyhub/src/components/packing/.gitkeep`
- `familyhub/src/repositories/interfaces/.gitkeep`
- `familyhub/src/repositories/supabase/.gitkeep`
- `familyhub/src/stores/.gitkeep`
- `familyhub/src/hooks/.gitkeep`
- `familyhub/src/types/.gitkeep`
- `familyhub/src/constants/.gitkeep`
- `familyhub/src/utils/.gitkeep`
