# Project Context Analysis

## Requirements Overview

**Functional Requirements:** 154 total (FR1–FR154). V1 shipped (FR1–FR57). V4 scope covers FR100–FR116. V5 scope covers FR117–FR150.

Thirteen capability areas:
1. Identity & Access Management (FR1–FR4) — Google Sign-In, profile linking, admin invitation, maid revocation
2. Profile Management (FR5–FR8) — CRUD with name/avatar, profiles decoupled from accounts
3. Vacation Management (FR9–FR15) — full CRUD, lifecycle, household-wide pinning
4. Booking Tasks (FR16–FR21) — auto-generated tasks, document check with child task generation, urgency sorting
5. Packing List (FR22–FR27) — six-status items, quantity, profile assignment, real-time sync
6. Categories/Tags/Templates (FR28–FR33) — user-defined vocab, reusable templates with participant filtering
7. Dashboard (FR34–FR36) — pinned widgets, booking task urgency, leftovers widget, meal plan widget
8. Real-time Sync & OTA (FR37–FR40) — Supabase Realtime, last-write-wins, OTA check
9. Data Privacy (FR41–FR43) — RLS-enforced privacy (V6+)
10. Leftovers Management (FR44–FR57) — leftover CRUD with dose tracking, eaten/thrown-out counters, per-item configurable expiry (default 5 days), auto-close on zero remaining, expired item visual flagging, dashboard widget, full list with active/closed sorting, infinite scroll
11. **(V4) Language Learning (FR100–FR116)** — Pi-side session service (start/resume/end/status), first-use API key setup gate (OpenCode Zen/Go key submitted in-app, validated and written to per-user auth.json, provisions isolated environment), per-user WebSocket routing, TTS playback (el-GR double-speak), STT voice input (mic as keyboard replacement), skill system (learn/review/vocab/writing/speaking/reading/progress), connection status, skill-complete signals
12. **(V5) Recipe Management (FR117–FR150)** — recipe CRUD (name, type, steps, ingredients+quantities, servings, prep/cook time, cost, categories, tags, image), static recipe types (meal/main/side/soup/dessert/other shared with meal plan), import from URL (LLM extraction), YouTube (transcript via Data API + LLM), photo OCR (camera + LLM), manual entry, user-defined categories and tags, browse by type with filters, ingredient search, servings scaling, meal plan integration (multiple recipes per slot, per-recipe servings, free-text fallback), shopping list generation (ingredient aggregation, quantity summing, review screen with checkboxes, dedup merge into shopping list), PDF share via Android share sheet, real-time sync
13. Future modules (FR151–FR154) — V6 Finances, V7 Maid

**Non-Functional Requirements:** 39 total (NFR1–NFR39). Key architectural drivers:
- Cold start <2s, real-time sync <3s (NFR1–NFR4)
- TLS 1.2+, secure credential storage, RLS-enforced privacy (NFR5–NFR11)
- Last-write-wins produces valid state, APK sideload on API 26+ (NFR12–NFR13)
- Repository pattern — all external services behind swappable interface (NFR17)
- No onboarding wizard (NFR22)
- Expiry calculations correct on device-local time (NFR23)
- (V4) Session service <5s, TTS <500ms, STT <2s, double-speak timing 0.8s/1.2s (NFR27–NFR30)
- (V4) API key HTTPS transmission, per-user auth.json file permissions (NFR31–NFR32)
- (V5) URL import <10s, YouTube import <15s, OCR import <10s, search <300ms, shopping list gen <3s, PDF gen <3s, LLM cost <€2/month (NFR33–NFR39)

**Scale & Complexity:**

- Primary domain: Android-first cross-platform mobile, full-stack client-heavy
- Complexity level: **Low-Medium** — small user base, no regulatory overhead — with V4 introducing a second backend (Raspberry Pi) and WebSocket bridge, V5 adding LLM-based import pipelines
- Estimated architectural components: ~18 (Auth, Supabase Client, Realtime, Profile/Vacation/Packing/Leftovers/Shopping/MealPlan/Recipe repositories, OTA check, Pi Session Service, Pi WebSocket Server, TTS Engine, STT Engine, Recipe Import Service, PDF Generator)

---

## Technical Constraints & Dependencies

| Constraint | Source | Impact |
|---|---|---|
| Supabase (PostgreSQL, free tier) | Confirmed | Backend, auth, RLS, realtime |
| Google Sign-In | Confirmed | Auth provider — no passwords stored |
| Repository pattern (mandatory) | NFR21 | Every external service behind swappable module interface |
| Android-first, APK sideload | PRD | Private keystore, no Play Store |
| Real-time sync between admins | FR27, NFR3 (<3s) | Supabase Realtime subscription required |
| OTA update check | FR40 | Version manifest or Expo EAS Update |
| Flutter / React Native / Expo | **Resolved — Expo SDK 55** | Determines M3 path, OTA, APK toolchain |
| Material Design 3 | UX Spec | Flutter native M3 or `react-native-paper` |
| WCAG AA, TalkBack | UX Spec | Semantic grouping, 48dp touch targets, no colour-only status |
| Minimum Android 8.0 (API 26) | PRD | Modern crypto APIs available |
| RLS enforcement | NFR9–NFR10, FR41–FR43 | Privacy at DB layer — V6+ required, V1 schema must anticipate |
| Raspberry Pi (session service + WebSocket) | V4 | Second backend — OpenCode sessions, Greek TTS relay |
| Cloudflare Tunnel | V4 | Public HTTPS/WSS endpoints — api.fh-morais.party / ws.fh-morais.party — no VPN required on phone |
| expo-speech (el-GR TTS) | V4 | Greek text-to-speech with double-speak pattern |
| expo-speech-recognition (el-GR STT) | V4 | Mic as keyboard replacement — voice input for Greek |
| RECORD_AUDIO permission | V4 | Required for STT — requested on first mic tap |
| LLM API (recipe extraction) | V5 | Reuses V2 LLM provider via repository pattern — URL, YouTube, OCR extraction |
| YouTube Data API | V5 | Transcript retrieval for recipe import — API key required |
| OCR (on-device) | V5 | Text extraction from recipe photos — `react-native-mlkit-ocr` or `expo-camera` + cloud OCR |
| PDF generation (on-device) | V5 | Recipe export — `react-native-html-to-pdf` or similar |
| CAMERA (extended) | V5 | Recipe photo OCR capture — permission requested on first photo import |

---

## Cross-Cutting Concerns Identified

1. **Real-time sync between admins** — Supabase Realtime pushes changes from one admin's device to the other. All list-based modules (packing, shopping, leftovers, meal plan) subscribe to Realtime channels for live updates. No offline-first layer — the app requires network connectivity.

2. **Repository pattern enforcement** — Every service (Supabase, Google Sign-In, Pi session service, future Drive/Calendar/AI) lives behind a typed interface. Business logic has zero direct dependency on any vendor SDK. This is an architecture-level constraint affecting folder structure and module boundaries.

3. **Profile ↔ Account decoupling** — Aurora and Isabel exist as Profiles without accounts. The data model must separate `profile` (name, avatar, family membership) from `user_account` (Google ID, email, role). Profiles are referenced by packing items, templates, etc.

4. **RLS design from V1** — Private envelopes and maid isolation are V6/V7 concerns but the Supabase schema and RLS policies must be designed with those boundaries in mind from V1. Retrofitting RLS is painful.

5. **Custom component layer** — Bespoke UI components (SwipeableItemWrapper, PackingItemCard, StatusCountPill, StatusBadge, etc.) define the interaction contract used across list-based modules.

6. **Expiry calculation locality** — leftover expiry dates are computed as `date_added + expiry_days`. Visual flagging (expired = red) must evaluate against device-local time, not server time (NFR23). The calculation is pure — no server round-trip needed.

7. **(V4) Pi as second backend** — Language Learning introduces a Raspberry Pi as an external service alongside Supabase. The Pi runs OpenCode sessions via Podman containers, relays Greek text via WebSocket, manages session lifecycle via HTTP REST, and provisions per-user environments on API key configuration. The phone treats the Pi with the same isolation principle as Supabase — all access through repository interfaces and a dedicated WebSocket service.

8. **(V4) Connection reliability** — The Pi is a home device, not a cloud service. Cloudflare Tunnel (api.fh-morais.party / wss://ws.fh-morais.party) keeps the connection always-on — no VPN toggle required on the phone. Connection status (FR115) must be prominent in the UI. Auto-reconnect with exponential backoff handles transient disconnections.

9. **(V4) Per-user isolation on Pi** — Each admin is a separate Linux user on the Pi. Separate Podman containers, separate OpenCode installations, separate API keys in per-user auth.json, separate WebSocket message routing. Zero cross-talk between users (FR104).

10. **(V4) API key configuration on first use** — Each user must configure their OpenCode Zen/Go API key before accessing the skill menu (FR111). The key is submitted in-app over HTTPS, validated by the session service, written to the user's per-user auth.json on the Pi, and their isolated environment (Linux account, home directory, OpenCode, Fluent) is provisioned automatically. Per-user keys enable cost tracking per user in the OpenCode dashboard.

11. **(V5) LLM reuse across modules** — V2 Shopping introduced LLM-based AI categorisation. V5 Recipes reuses the same LLM provider (via repository pattern) for recipe extraction from HTML, YouTube transcripts, and OCR text. The `ILlmRepository` interface serves both modules — same cost monitoring, same fallback strategy, same swappable provider.

12. **(V5) Meal plan ↔ Recipes integration** — V5 enhances V3 meal plan slots to support multiple linked recipes. This requires a junction table (`meal_slot_recipes`) and changes to the meal plan data flow. The meal plan store and repository must be extended — not replaced — to support recipe linking alongside the existing free-text fallback.

13. **(V5) Shopping list generation pipeline** — The "Generate Shopping List" button in the meal plan triggers a client-side aggregation: read all linked recipes for the week → scale ingredients to per-slot servings → sum quantities by ingredient name (exact match) → present review screen → merge checked items into the shopping list (dedup against existing items). This is a read-heavy, compute-light operation that runs entirely client-side.

---
