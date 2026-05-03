# Mobile App Specific Requirements

## Project-Type Overview

FamilyHub is an Android-first cross-platform mobile application distributed exclusively as a private sideloaded APK. No app store is involved at any point in the distribution chain. The app targets the Morais household — a fixed user base of two admins and two child profiles — with no ambitions to scale beyond this household.

The cross-platform requirement is non-negotiable: the framework must produce a native or near-native Android build while keeping the door open for iOS without a parallel codebase. Framework selection (Flutter / React Native / Expo) is an open architectural decision that must be resolved before V1 development begins.

## Technical Architecture Considerations

**Framework Decision (Required Before V1 Start)**

Three candidates remain under evaluation:

| Framework | Strengths | Concerns |
|---|---|---|
| Flutter | Dart type safety, high performance, single codebase | Larger APK size, Dart learning curve if unfamiliar |
| React Native | JavaScript ecosystem, large community, strong Supabase SDK support | Bridge overhead, more native setup complexity |
| Expo (React Native managed) | Fastest bootstrap, EAS OTA updates, easiest sideload APK generation | EAS build dependency, limited native module access in managed workflow |

**Recommended path:** Expo Managed → bare workflow if native modules are needed. Provides fastest V1 start with a clear escape hatch, and EAS Update handles OTA natively.

## Platform Requirements

- **Target platform:** Android (primary), iOS (future consideration — no active design work)
- **Distribution:** Private APK sideload for initial install — no Play Store, no TestFlight
- **OTA updates:** In-app version check on launch against a hosted version manifest. User prompted to download and install updated APK. Expo EAS Update preferred if Expo is selected (handles JS-layer updates without APK rebuild)
- **Minimum Android version:** API level 26 (Android 8.0) — covers >95% of active Android devices
- **APK signing:** Signed with a private keystore managed by Filipe. Required for Android sideload installation
- **No app store compliance:** No Play Store review, no store metadata, no privacy policy submission, no content rating required

## Device Permissions

Permissions scoped strictly to what is needed per version:

| Permission | Version | Purpose |
|---|---|---|
| `INTERNET` | V1 | Supabase sync, Google Sign-In |
| `CAMERA` | V2+ (optional) | Profile photo capture |
| `RECORD_AUDIO` | V4 | Speech-to-text voice input for language learning exercises (mic as keyboard replacement) |
| `CAMERA` (extended) | V5 | Recipe photo OCR (capture printed/handwritten recipes for LLM-based extraction) |
| `CAMERA` (extended) | V8+ | Receipt OCR |
| `POST_NOTIFICATIONS` | V8+ | Push notification delivery |

V1 requires only `INTERNET` — minimal permission surface.

## Push Notification Strategy

Push notifications are explicitly **out of scope for V1–V7**.

- V1–V7: In-app alerts only (e.g., leftover expiry banners in V1, booking task urgency indicators in V1 dashboard widget)
- V8+: Background jobs and push notifications added as a dedicated platform capability once core modules are stable
- No notification permission requested until V8+

## Store Compliance & Distribution

No app store compliance requirements apply.

- **Play Store:** Not used. No review process, no store listing, no compliance requirements
- **Initial install:** APK sideload with "Install from unknown sources" enabled on Android devices
- **APK signing:** Signed with a private keystore managed by Filipe. Required for Android installation

---
