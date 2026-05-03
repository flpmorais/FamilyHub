# Starter Template Evaluation

## Primary Technology Domain

Cross-platform mobile app — Android-first, private APK sideload, real-time sync via Supabase Realtime.

## Framework Decision: Expo vs Flutter

| Factor | Expo (React Native) | Flutter |
|---|---|---|
| Language | TypeScript (web-familiar) | Dart (new language to learn) |
| M3 implementation | `react-native-paper` v5 — full M3 ✓ | Native Flutter M3 — first-class ✓ |
| Supabase SDK | `@supabase/supabase-js` v2 — primary SDK, best maintained ✓ | Flutter SDK — good but secondary |
| OTA updates | **EAS Update (native to Expo)** — JS layer, no APK rebuild | Custom version manifest only |
| Private APK | EAS Build `"distribution": "internal"` ✓ | `flutter build apk` ✓ |
| Solo dev speed | Fastest bootstrap, large ecosystem | Steeper initial setup |

## Selected Starter: Expo SDK 55 + TypeScript

**Rationale:** EAS Update is native to Expo and the cleanest OTA solution for sideloaded APKs. `@supabase/supabase-js` is the primary and best-maintained Supabase client SDK. TypeScript aligns with JavaScript-adjacent prior experience. Flutter's M3 is marginally more native but the Expo path is lower-risk for a solo developer.

**Initialization Command:**

```bash
npx create-expo-app@latest familyhub --template blank-typescript
```

**Core packages to add immediately:**

```bash
npx expo install expo-router expo-secure-store expo-updates expo-dev-client
npx expo install @supabase/supabase-js @react-native-google-signin/google-signin
npx expo install react-native-gesture-handler react-native-reanimated
npm install react-native-paper react-native-safe-area-context zustand
```

**V4 Language Learning packages:**

```bash
npx expo install expo-speech expo-speech-recognition
```

**V5 Recipes packages:**

```bash
npx expo install expo-image-picker expo-camera
npm install react-native-mlkit-ocr react-native-html-to-pdf react-native-share
```

**Architectural Decisions Provided by Starter:**

**Language & Runtime:** TypeScript strict mode — React Native via Expo Managed Workflow SDK 55

**Routing:** Expo Router (file-based routing, recommended for SDK 55+)

**OTA Updates:** `expo-updates` + EAS Update — JS bundle updates without APK rebuild

**Build/APK:** EAS Build with `"distribution": "internal"`, `"buildType": "apk"` for private sideload

**Styling/UI:** `react-native-paper` v5 — full Material Design 3 implementation

**Backend:** `@supabase/supabase-js` v2 — direct queries + Supabase Realtime for live updates

**Auth:** `@react-native-google-signin/google-signin` + Supabase Auth

**Secure Storage:** `expo-secure-store` (session tokens, private keystore)

**Gestures:** `react-native-gesture-handler` + `react-native-reanimated` (required for `SwipeableItemWrapper`)

**Testing:** Jest (included in Expo template)

**Code Organisation:** Feature-based folders under `src/` with repository pattern service modules

**Note:** Project initialisation using the above commands is the first implementation story (Epic 0 / Story 1).

---
