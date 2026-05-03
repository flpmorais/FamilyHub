# Non-Functional Requirements

## Performance

- **NFR1:** App launches to an interactive state within 2 seconds from cold start on supported Android devices
- **NFR2:** Packing item status changes reflect in the UI immediately (optimistic update), confirmed to backend within 3 seconds on a normal mobile connection
- **NFR3:** Real-time sync changes from one Admin reach all other connected Admin devices within 3 seconds
- **NFR4:** All list operations (add, edit, delete, filter) complete within 100ms on devices running Android 8.0+

## Security & Privacy

- **NFR5:** All data in transit is encrypted using TLS 1.2 or higher
- **NFR6:** All data at rest is encrypted by the backend provider's default encryption
- **NFR7:** Authentication is handled exclusively through Google Sign-In — no passwords are stored by FamilyHub
- **NFR8:** Session tokens are stored in secure, platform-provided credential storage — never in plaintext or shared storage
- **NFR9:** One Admin's private spending envelope transactions must not appear in any shared database query, API response, or sync payload — enforced at the database access control layer, not the application layer (V6)
- **NFR10:** A Maid user account must be incapable of reading any records belonging to a prior Maid account — enforced at the database access control layer (V7)
- **NFR11:** FamilyHub stores only the Google user ID and email from Google Sign-In — no additional personal data from Google is retained

## Reliability & Data Integrity

- **NFR12:** Last-write-wins conflict resolution must always produce a valid, readable data state — no record may be left in a corrupted or null state after sync
- **NFR13:** The app installs cleanly via APK sideload on Android 8.0 (API 26) and above without requiring non-standard device configuration beyond enabling "Install from unknown sources"
- **NFR14:** Backend free tier usage must not be exceeded at household scale (maximum ~5 concurrent users, low transaction volume)

## Integration

- **NFR15:** If Google Sign-In is unavailable at launch, a valid cached session is used without forcing re-authentication
- **NFR16:** An OTA update check failure is silent — it must not block app launch or display an error
- **NFR17:** Any external service (Supabase, Google Sign-In, Alexa Skill, LLM API, future Google Drive/Calendar) must be accessed exclusively through its repository interface module — business logic may not call external services directly
- **NFR18:** The Alexa Skill backend endpoint must respond to Alexa within 3 seconds to avoid Alexa timeout errors (V2)
- **NFR19:** AI categorization (LLM call) must complete within 2 seconds; if exceeded, the item is assigned to "Other" category and the user is not blocked (V2)
- **NFR20:** Alexa Skill endpoint must authenticate requests using a household-level API key — unauthenticated requests are rejected (V2)
- **NFR21:** LLM API costs for AI categorization must remain under €1/month at family-scale usage (V2)

## UX Principles

- **NFR22:** The app must not present an onboarding wizard or guided setup flow on first launch. All configuration (profiles, categories, tags, templates, user management) is performed through Settings at the user's own pace. The app is usable immediately after sign-in.
- **NFR23:** Leftover expiry date calculations and visual flagging must evaluate correctly using device-local time
- **NFR24:** Shopping list category reclassifications by an admin must persist permanently — the system must not re-categorize an item that has been manually reclassified (V2)
- **NFR25:** Meal plan week view must load and render the full 7-day grid within 500ms when navigating between weeks (V3)
- **NFR26:** Meal plan default configuration changes must apply to all future unedited weeks without requiring manual propagation (V3)

## Language Learning (V4)

- **NFR27:** Harness API endpoints (start/resume/end/status) must respond within 5 seconds — session start includes LangGraph state creation and Fluent learner data loading (V4)
- **NFR28:** Greek text in the agent's streamed response must begin TTS playback within 500ms of message arrival on the phone (V4)
- **NFR29:** Android STT transcription must complete and send the transcript to the harness API within 2 seconds of the user finishing speech (V4)
- **NFR30:** TTS double-speak must play each phrase twice with a 0.8-second pause between repetitions and a 1.2-second pause between distinct phrases, matching the Fluent skill speak timing (V4)
- **NFR31:** API keys submitted through the app must be transmitted over HTTPS (Cloudflare Tunnel) — the key never travels over an unencrypted connection (V4)
- **NFR32:** API keys stored in the container must be isolated per-user at the application level — one user's API key must never be accessible by another user's session (V4)
- **NFR33:** The harness agent's first streamed token must arrive within 3 seconds of receiving a user message (V4)

## Recipes (V5)

- **NFR34:** Recipe URL import (HTML fetch + LLM extraction) must complete and present the extracted recipe for review within 10 seconds (V5)
- **NFR35:** Recipe YouTube import (transcript retrieval + LLM extraction) must complete and present the extracted recipe for review within 15 seconds (V5)
- **NFR36:** Recipe photo OCR import (OCR text extraction + LLM structuring) must complete and present the extracted recipe for review within 10 seconds (V5)
- **NFR37:** Recipe search and filter operations must return results within 300ms on devices running Android 8.0+ (V5)
- **NFR38:** Shopping list generation from the weekly meal plan (ingredient aggregation, deduplication, quantity summing across all linked recipes) must complete and display the review screen within 3 seconds (V5)
- **NFR39:** Recipe PDF generation must complete within 3 seconds on-device and open the Android share sheet immediately after (V5)
- **NFR40:** LLM API costs for recipe import (URL, YouTube, OCR extraction) must remain under €2/month at family-scale usage — combined with V2 categorization costs (V5)
