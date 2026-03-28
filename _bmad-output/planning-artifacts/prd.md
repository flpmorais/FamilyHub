---
stepsCompleted: ['step-01-init', 'step-02-discovery', 'step-02b-vision', 'step-02c-executive-summary', 'step-03-success', 'step-04-journeys', 'step-05-domain', 'step-06-innovation', 'step-07-project-type', 'step-08-scoping', 'step-09-functional', 'step-10-nonfunctional', 'step-11-polish', 'step-e-01-discovery', 'step-e-02-review', 'step-e-03-edit']
classification:
  projectType: 'mobile_app'
  domain: 'general'
  complexity: 'low-medium'
  projectContext: 'greenfield'
  distribution: 'private_apk_sideload'
  storeCompliance: 'none'
inputDocuments: ['_bmad-output/planning-artifacts/product-brief-FamilyHub-2026-03-24.md', '_bmad-output/brainstorming/brainstorming-session-2026-03-22-1830.md']
workflowType: 'prd'
briefCount: 1
brainstormingCount: 1
researchCount: 0
projectDocsCount: 0
lastEdited: '2026-03-27'
editHistory:
  - date: '2026-03-27'
    changes: 'V2 Leftovers module expansion — added user journey, full functional requirements, success criteria, product scope, phased development, offline scope, NFR'
---

# Product Requirements Document - FamilyHub

**Author:** Filipe
**Date:** 2026-03-24

## Executive Summary

FamilyHub is a personal family management mobile app built by Filipe Morais exclusively for the Morais household. It is not a commercial product. It exists to permanently eliminate three recurring failures in family life: vacation packing lists rebuilt from scratch before every trip, items forgotten at the supermarket, and leftovers spoiling unseen in the fridge.

The app is built for a specific household structure: two symmetric admin users (the couple), two child profiles that will eventually become accounts, and a scoped employee user (the maid). It consolidates vacation planning, shopping, leftovers tracking, household finances, maid billing, recipes, and meal planning into a single integrated system — built in Portuguese, with no generic defaults, and no design compromises for a hypothetical broader audience.

Delivered incrementally across six module versions (V1 Vacation → V6 Recipes), each version ships one complete, usable module. AI features and background jobs are explicitly post-V6. The backend runs on Supabase (free tier). Every external service is accessed through a swappable repository pattern interface. The app is distributed as a private APK — no app store involved.

### What Makes This Special

**One family, perfectly served.** No market fit to validate, no onboarding funnel, no generic defaults. Every design decision — budget category names, shopping list sections, UI language, the maid's purpose-built experience, private spending envelopes for each spouse — reflects the exact reality of this household.

**Modules that integrate meaningfully.** Vacation status adjusts household budget proportionally. Maid salary auto-posts as a household expense. Meal plan generates a deduplicated shopping list. Leftovers surface in meal planning before expiry. The system behaves as a coherent whole, not a collection of features.

**Built by the person who lives the problem.** The builder's prior OutSystems app validated the vacation module concept but was constrained by licensing. FamilyHub is the unconstrained successor — full-stack, properly architected, designed to grow with the family over years.

**Vendor-independent by design.** The repository pattern ensures no vendor lock-in. Replacing Supabase, Google Drive, or any other service means rewriting one module — nothing else.

## Project Classification

- **Project Type:** Cross-platform mobile app (Android-first), private APK sideload distribution — no app store
- **Domain:** General / Personal Productivity
- **Complexity:** Low-Medium — technically non-trivial (real-time sync, offline-first, multi-module integration, service abstraction) but zero regulatory or compliance overhead
- **Project Context:** Greenfield

---

## Success Criteria

### User Success

FamilyHub has no commercial success metrics. Success is personal and behavioural.

**Primary signal — Angela's willing adoption.**
Filipe built the app and will rationalise using it. Angela has no such bias. If she uses FamilyHub willingly and considers it a net improvement to how the family operates, the app works. If she describes it as extra work or stops using it, the app has failed — regardless of technical quality or feature completeness.

**V1 signal — one complete vacation planned end-to-end.**
Within six months of V1 shipping, at least one full family vacation must be planned entirely through FamilyHub: packing list built, items assigned to profiles, statuses tracked through to departure. The subjective test: did it feel better than before?

**V2 signal — leftovers tracked for one full month.**
Within one month of V2 shipping, both admins consistently log leftovers and act on them before expiry. The widget becomes part of the daily dashboard check. The subjective test: is less food being thrown away?

**Ongoing signal — modules used without friction.**
Each module in active use should feel like a shortcut, not an obligation. The moment any module becomes a chore, that module has failed its design goal.

### Business Success

N/A — no commercial objectives, no revenue targets, no user growth goals.

**Version gate:** Each version ships when its module is functionally complete and in active family use. V2 begins only after V1 is used willingly by both admins. Same gate applies at every version boundary.

### Technical Success

- **Offline-first:** Core features (packing lists, shopping list, hours logging) function fully without network connectivity. Changes sync on reconnect without data loss.
- **Real-time sync:** When both admins are online, list changes (shopping ticks, packing status updates) propagate without requiring manual refresh.
- **APK distribution:** App installs cleanly via sideloaded APK on Android devices. No Play Store dependency.
- **Free-tier backend:** Supabase usage stays within free tier limits at family scale. No unexpected cloud costs.
- **Service replaceability:** Any external service can be swapped by replacing its service module only — zero changes to business logic.

### Measurable Outcomes

| Outcome | Signal |
|---|---|
| Vacation packing improved | First trip planned end-to-end in app |
| Angela adopted | Using app without prompting or complaints |
| No leftover spoilage | Leftovers consistently logged and acted on before expiry — thrown-out doses trend downward over first 3 months of use (V2) |
| Shopping friction eliminated | Shopping list used every supermarket visit (V3) |
| Version gate reached | Each module in daily use before next version begins |

---

## Product Scope

| Version | Module | Core Capability |
|---|---|---|
| V1 | Vacation | Packing lists, booking tasks, templates, offline sync |
| V2 | Leftovers | Fridge inventory with dose tracking, per-item expiry (default 5 days), eaten/thrown-out counters, dashboard widget (meals + doses + nearest expiry), full list with active/closed items and infinite scroll |
| V3 | Shopping | Shared lists, sections, real-time sync, voice entry |
| V4 | Finances | Budgets, envelopes, expense tracking, maid salary integration |
| V5 | Maid | Hours logging, billing, payment register, PDF payslips |
| V6 | Recipes | Import, search, scaling, meal plan, shopping list generation |
| V7+ | Intelligence | AI features, push notifications, Google Drive/Calendar, child accounts |

See **Project Scoping & Phased Development** for full V1 capability list and phased roadmap.

---

## User Journeys

### Journey 1: Filipe — Planning the Summer Holiday (Primary Admin, Core Path)

It's February. Filipe creates a new vacation: "Algarve — August 2026". He sets:
- **Dates:** Aug 3–17
- **Location:** Algarve, Portugal
- **Image:** He picks a beach photo — the trip now has a visual identity in the dashboard widget
- **Who's going:** Filipe ✅ Angela ✅ Aurora ✅ Isabel ✅

He pins it — the widget appears on both his and Angela's dashboard immediately. A second vacation in Planning ("Christmas in Porto") stays pinned too — multiple pinned vacations are supported.

The widget shows **Tasks sorted by next due date**: *Flights — book by May 1. Hotel — book by June 1. Rent-a-car — book by July 1. Check documents — due March 15.*

Filipe taps "Check documents". The task prompts him to verify each family member's passport against the trip dates. Angela's passport expires July 2026 — before the trip ends. The task auto-generates a child task: "Renew Angela's passport — due by June 1". Both tasks appear in the widget sorted by due date.

He applies templates: "Beach Family" and "Essential Documents". The app filters template items by trip participants — items assigned to profiles not attending are excluded. All four are going, so the full list is injected: *"Diapers — Isabel — Essentials — qty: 40 — New"*, *"T-shirts — Filipe — Clothes — qty: 7 — New"*, passports, sunscreen, beach toys.

Over months, booking tasks complete one by one. Three days before departure, packing begins. Items move: **New → Buy → Ready → Packed**. Last-minute items stay in **Last-Minute** until morning of departure. One item flagged **Issue** — Filipe's passport at renewal office. Morning of departure: passport arrives, flipped to **Packed**. They leave.

**Capabilities revealed:** vacation CRUD with image/location/dates/participants, lifecycle (Planning → Upcoming → Active → Completed), household-wide pinning (multi-vacation), task list with due dates and sorting, document check task type with child task generation, participant-filtered template application, packing list with quantity field and six-status model, template system, profile assignment, last-3-day packing phase.

---

### Journey 2: Angela — Contributing from the Kitchen (Co-Admin, Collaborative Path)

Angela is packing the kids' bag on Wednesday evening. She opens FamilyHub, navigates to the Algarve packing list, filters by **Isabel**. She sees 8 items assigned to Isabel. She ticks 5 as **Packed**, marks the sunscreen as **Buy**, adds a new item: "Baby wipes — Isabel — Essentials — qty: 2 — New". She closes the app.

On his phone, Filipe's list updates in real-time. He sees the new item, the ticked items, the sunscreen flagged as Buy. No message sent. No coordination call. The list is just current.

**Capabilities revealed:** real-time sync between admins, profile-filtered list view, item creation and status update by any admin.

---

### Journey 3: Filipe — Offline on the Plane (Edge Case, Offline Resilience)

The family boards the plane. Airplane mode on. Filipe opens FamilyHub — loads fully from local cache. He marks the last three items **Packed**, adds a note to one item. Angela, also offline, marks two overlapping items **Packed**.

The plane lands. Both phones reconnect. FamilyHub syncs. Overlapping changes resolve via last-write-wins — no conflict dialogs, no data loss. The list converges silently.

**Capabilities revealed:** offline-first data layer, full local cache, sync-on-reconnect, last-write-wins conflict resolution.

---

### Journey 4: Filipe — First-Time Setup (Admin Operations, V1)

Filipe installs the APK, signs in with Google. App is empty.

**Step 1 — Create Profiles.** Settings → Profiles → Add. He creates four profiles: Filipe (linked to his Google account), Angela (no account yet), Aurora (no account), Isabel (no account). Each has a name and avatar. Profiles exist independently of accounts — Aurora and Isabel are full family members in the data model from day one.

**Step 2 — Add Angela.** Settings → Users → Add. He enters Angela's Google email, assigns Admin role. She installs the APK, signs in, her account automatically links to her Profile. She sees everything Filipe sees.

**Capabilities revealed:** profile CRUD (name + avatar, decoupled from accounts), account-to-profile linking on first sign-in, admin user addition.

---

### Journey 5: Filipe — Configuring Categories, Tags, and Templates (Setup & Configuration)

Before planning the first vacation, Filipe sets up the app's vocabulary.

**Categories:** Settings → Packing Categories. No defaults. He creates: Essentials, Clothes, Toiletries, Documents, Kids, Electronics, Beach. Each gets an icon.

**Tags:** He creates tags for cross-cutting concerns: Fragile, Buy Before Trip, Hand Luggage Only, Shared Item. Zero or multiple tags per item.

**Templates:** He creates "Beach Family" — Sunscreen (qty: 3, assigned to family), Swimwear (per person), Beach Towels (qty: 4), Sand Toys (assigned to Aurora + Isabel). Tagged "Beach", "Summer". He creates "Essential Documents" — Passports (check-documents item type), Health Insurance Cards, EHIC Cards. Tagged "All Trips".

When creating the Algarve vacation, he selects both templates. Items are merged, deduplicated, filtered by participants, and injected into the packing list as the starting point.

**Capabilities revealed:** user-defined categories (name + icon, no defaults), user-defined tags, template CRUD (items with profile + category + quantity + tags), template tagging, participant-filtered template application at trip creation.

---

### Journey 6: Filipe — Managing Leftovers (Daily Fridge Loop, V2)

It's Sunday evening. Filipe made lasagna — enough for the family plus leftovers. He opens FamilyHub, taps the Leftovers module, and adds: "Lasagna — 4 doses — 5 days". The item appears in the list immediately.

Monday. Angela cooked coq au vin. She adds: "Coq au vin — 3 doses — 4 days" (she overrides the default 5-day expiry because it has cream).

Tuesday morning. Filipe checks the dashboard. The Leftovers widget reads: **2 meals · 7 doses — Coq au vin expires Thursday**. He taps the widget, sees the full list. He reheated lasagna last night — taps "Eaten" twice on the lasagna row. Remaining: 2 doses.

Thursday. The dashboard widget now shows the coq au vin highlighted in red — it expires today. Filipe opens the list. The coq au vin sits at the top, visually flagged. Nobody wants it. He taps "Throw out" — all 3 remaining doses are discarded at once. The item closes and moves below the active section.

Friday. The lasagna still has 2 doses left, expiring Sunday. The widget reads: **1 meal · 2 doses — Lasagna expires Sunday**. Filipe eats one dose Friday, one Saturday. Two taps across two days. The lasagna closes naturally — all doses eaten, zero waste.

Scrolling down in the full list, Filipe can see the closed items: lasagna (4 eaten, 0 thrown), coq au vin (0 eaten, 3 thrown). A quiet record of what got used and what didn't.

**Capabilities revealed:** leftover CRUD with name/doses/expiry override, dashboard widget (meal count + dose count + nearest expiry), dose-level eaten tracking (one tap per dose), bulk throw-out of remaining doses, automatic close on zero remaining, expired item visual flagging, full list with active-first sorting by expiry, closed items visible with history, infinite scroll pagination.

---

### Journey Requirements Summary

| Journey | Capabilities Required |
|---|---|
| 1. Vacation planning | Vacation CRUD (image/location/dates/participants), lifecycle, pinning, tasks, document check + child tasks, template application with participant filter, packing list with quantities and six statuses |
| 2. Collaborative packing | Real-time sync, profile filtering, multi-admin item management |
| 3. Offline use | Offline-first, local cache, sync-on-reconnect, last-write-wins |
| 4. First-time setup | Profile CRUD, account-to-profile linking, admin user management |
| 5. Configuration | User-defined categories + tags, template CRUD, template tagging |
| 6. Leftovers (V2) | Leftover CRUD (name/doses/expiry), eaten counter (per dose), throw out (bulk remaining), auto-close, expiry flagging, dashboard widget (meals + doses + nearest expiry), full list with active/closed sorting, infinite scroll |

---

## Domain-Specific Requirements

### Data Privacy Between Users

FamilyHub enforces intra-household privacy boundaries as first-class data model constraints — not UI-layer restrictions:

- **Private spending envelopes:** Each admin's personal budget category is a data black box to the other admin. The dashboard shows "Personal — Filipe: 80% spent" without line items. Neither spouse can read the other's personal transactions. Enforced at the data model level, not the display layer.
- **Maid billing isolation:** Each maid account sees only her own billing history. Historical records from prior maids are visible only to admins, isolated by account period. A new maid cannot access any prior maid's data.
- **Child profiles:** Aurora and Isabel exist as profiles but have no account credentials. Their data is accessible to admins only until they have their own accounts.

### GDPR Considerations (Portugal / EU)

FamilyHub stores personal data of EU residents, including two minors. Risk profile is minimal:

- **No third-party data sharing:** All data stays within the family's Supabase instance. No analytics, no advertising, no external APIs beyond Google Sign-In and (future) Google Drive.
- **Data subject rights:** Filipe is both data controller and data subject. Full data export available at any time via automated backups. Deletion is a Settings action.
- **Children's data:** Aurora and Isabel's profiles are created and managed by their parents (parental consent). No external consent mechanism required.
- **Google Sign-In:** FamilyHub stores only the Google user ID and email — no passwords, no sensitive auth data.

### Technical Privacy Constraints

- Private envelope transactions must never appear in any shared query, API response, or sync payload visible to the other admin.
- Maid account data must be partitioned such that a new maid account cannot traverse or query prior maid records.
- Supabase Row Level Security (RLS) is the enforcement mechanism — privacy boundaries are database-level, not application-level.

---

## Mobile App Specific Requirements

### Project-Type Overview

FamilyHub is an Android-first cross-platform mobile application distributed exclusively as a private sideloaded APK. No app store is involved at any point in the distribution chain. The app targets the Morais household — a fixed user base of two admins and two child profiles — with no ambitions to scale beyond this household.

The cross-platform requirement is non-negotiable: the framework must produce a native or near-native Android build while keeping the door open for iOS without a parallel codebase. Framework selection (Flutter / React Native / Expo) is an open architectural decision that must be resolved before V1 development begins.

### Technical Architecture Considerations

**Framework Decision (Required Before V1 Start)**

Three candidates remain under evaluation:

| Framework | Strengths | Concerns |
|---|---|---|
| Flutter | Strong offline support, Dart type safety, high performance, single codebase | Larger APK size, Dart learning curve if unfamiliar |
| React Native | JavaScript ecosystem, large community, strong Supabase SDK support | Bridge overhead, more native setup complexity |
| Expo (React Native managed) | Fastest bootstrap, EAS OTA updates, easiest sideload APK generation | EAS build dependency, limited native module access in managed workflow |

**Recommended path:** Expo Managed → bare workflow if native modules are needed. Provides fastest V1 start with a clear escape hatch, and EAS Update handles OTA natively.

### Platform Requirements

- **Target platform:** Android (primary), iOS (future consideration — no active design work)
- **Distribution:** Private APK sideload for initial install — no Play Store, no TestFlight
- **OTA updates:** In-app version check on launch against a hosted version manifest. User prompted to download and install updated APK. Expo EAS Update preferred if Expo is selected (handles JS-layer updates without APK rebuild)
- **Minimum Android version:** API level 26 (Android 8.0) — covers >95% of active Android devices
- **APK signing:** Signed with a private keystore managed by Filipe. Required for Android sideload installation
- **No app store compliance:** No Play Store review, no store metadata, no privacy policy submission, no content rating required

### Device Permissions

Permissions scoped strictly to what is needed per version:

| Permission | Version | Purpose |
|---|---|---|
| `INTERNET` | V1 | Supabase sync, Google Sign-In |
| `READ/WRITE_EXTERNAL_STORAGE` | V1 | Local offline cache persistence |
| `CAMERA` | V3+ (optional) | Profile photo capture |
| `RECORD_AUDIO` | V3 | Voice entry for shopping list items |
| `CAMERA` (extended) | V7+ | Receipt OCR, recipe photo scanning |
| `POST_NOTIFICATIONS` | V7+ | Push notification delivery |

V1 requires only `INTERNET` and storage permissions — minimal permission surface.

### Offline Mode

Offline-first is a first-class architectural requirement from V1, not a progressive enhancement.

- **Scope:** Core features must function fully without network: packing list CRUD, vacation data, item status updates
- **Local cache:** All user data persisted locally on device. App loads from cache on startup regardless of connectivity state
- **Sync strategy:** Changes made offline are queued and applied to Supabase on reconnect
- **Conflict resolution:** Last-write-wins — no conflict dialogs, no manual merge required. Silent convergence
- **Per-version offline scope:**
  - V1: Packing lists, vacation data, profile data
  - V2: Leftover item CRUD, dose tracking, expiry calculations
  - V3: Shopping list tick/add operations
  - V5: Maid hours logging (critical — maid may be on-site without reliable connectivity)

### Push Notification Strategy

Push notifications are explicitly **out of scope for V1–V6**.

- V1–V6: In-app alerts only (e.g., leftover expiry banners in V2, booking task urgency indicators in V1 dashboard widget)
- V7+: Background jobs and push notifications added as a dedicated platform capability once core modules are stable
- No notification permission requested until V7+

### Store Compliance & Distribution

No app store compliance requirements apply.

- **Play Store:** Not used. No review process, no store listing, no compliance requirements
- **Initial install:** APK sideload with "Install from unknown sources" enabled on Android devices
- **APK signing:** Signed with a private keystore managed by Filipe. Required for Android installation

---

## Project Scoping & Phased Development

### MVP Strategy & Philosophy

**MVP Approach:** Problem-solving MVP — the minimum that eliminates the three identified household frictions (vacation packing rebuilt from scratch, supermarket memory test, invisible leftovers). V1 addresses only the first pain. Angela's willing adoption is the only gate that matters.

**Resource Requirements:** Solo developer (Filipe). No team size constraints — personal project. Scope control is the primary risk lever.

**Version Gate:** Each module version ships when the previous module is in active family use. V2 does not start until V1 is used willingly by both admins for at least one complete vacation. Same gate applies at every version boundary.

### Phase 1 — V1: Vacation (MVP)

**Core User Journeys Supported:** All five V1 journeys — vacation planning, collaborative packing, offline use, first-time setup, configuration.

**Must-Have Capabilities:**

- Google Sign-In + Supabase Auth
- Family Profiles (4 profiles, decoupled from accounts)
- Admin role (Filipe + Angela, symmetric)
- Vacation CRUD with image, location, dates, participant selection
- Vacation lifecycle: Planning → Upcoming → Active → Completed
- Pinnable dashboard widget (household-wide, multi-vacation)
- Booking task timeline with fixed urgency deadlines (Flights 90d, Hotel 60d, Rent-a-car 30d, Insurance 14d)
- Document check task type with child task generation
- Packing list with six statuses (New, Buy, Ready, Issue, Last-Minute, Packed), quantity field, profile assignment
- User-defined categories (name + icon) and tags
- Reusable templates with participant-filtered application
- Past trip selective reuse
- Offline-first with last-write-wins sync
- Real-time sync between admins
- Private APK distribution with OTA update check

### Phase 2 — V2–V3: Core Daily Loops

**V2 — Leftovers:** Fridge inventory with dose-level consumption tracking. Each leftover has a name, total doses, and configurable expiry (default 5 days). Admins log consumption one dose at a time or discard all remaining doses at once. Items close automatically when all doses are accounted for. Dashboard widget surfaces active meal count, total remaining doses, and the nearest-expiring item. Full list shows active and closed items with infinite scroll. Expired items are visually flagged. Offline-first with same sync model as V1. Addresses the third household pain (invisible leftovers).

**V3 — Shopping:** Shared lists, real-time sync, supermarket sections, voice entry. Addresses the second pain (supermarket memory test).

### Phase 3 — V4–V6: Household Operations

**V4 — Finances:** Budgets, expense tracking, private spending envelopes per admin (RLS-enforced).

**V5 — Maid:** Hours logging, billing, payment register, PDF payslips.

**V6 — Recipes + Meal Planning:** Import, search, scaling, meal plan, deduplicated shopping list generation.

### Vision — V7+: Intelligence Layer

AI features (receipt OCR, recipe URL/video/photo import), push notifications, background jobs, Google Drive vault, Google Calendar deadline sync. Child accounts (Aurora, Isabel) also deferred here.

### Risk Mitigation Strategy

**Technical Risks:**
- *Offline-first + real-time sync is the hardest V1 requirement.* Mitigation: adopt a proven sync library (e.g., PowerSync or Supabase Realtime with local SQLite) rather than building the sync layer from scratch. Framework choice must support this pattern.
- *Framework decision is a V1 blocker.* Mitigation: resolve Flutter vs React Native / Expo before any V1 code is written. Expo recommended for fastest path to OTA-capable APK with Supabase.

**Adoption Risks:**
- *Angela doesn't adopt V1.* Mitigation: Angela is a design reviewer for V1 UX, not just an end user. Her feedback incorporated before V1 ships. The version gate enforces honest evaluation before V2 starts.
- *Any module becomes a chore.* Mitigation: module-per-version strategy means each release is a complete, useful unit. If a module fails, it's isolated — it doesn't block others.

**Resource Risks:**
- *Scope creep (solo developer).* Mitigation: strict version gates. Nothing from V2+ is added to V1, even if implementation seems easy. The gate is behavioural, not feature-based.
- *Supabase free tier limits.* Mitigation: family-scale traffic is negligible. Free tier monitored; paid upgrade is a defined fallback (low cost, no architecture change needed).

---

## Functional Requirements

### Identity & Access Management

- **FR1:** Admin can sign in to the app using a Google account
- **FR2:** System links a Google account to an existing family Profile automatically on first sign-in
- **FR3:** Admin can invite another user by Google email and assign them the Admin role
- **FR4:** Admin can revoke access for any Maid user account

### Profile Management

- **FR5:** Admin can create a family Profile with a name and avatar
- **FR6:** Admin can edit any family Profile's name and avatar
- **FR7:** Admin can delete a family Profile
- **FR8:** System maintains Profiles independently of User Accounts — Profiles exist before and without associated accounts

### Vacation Management

- **FR9:** Admin can create a vacation with title, cover image, location, dates, and participant selection
- **FR10:** Admin can edit a vacation's title, image, location, dates, and participant list
- **FR11:** Admin can delete a vacation
- **FR12:** Admin can advance a vacation through its lifecycle: Planning → Upcoming → Active → Completed
- **FR13:** Admin can pin or unpin any vacation to the household dashboard
- **FR14:** System applies a pin state household-wide — pinned vacations appear on all Admin devices simultaneously
- **FR15:** System supports multiple simultaneously pinned vacations

### Booking Tasks

- **FR16:** System generates standard booking tasks when a vacation is created (Flights 90d, Hotel 60d, Rent-a-car 30d, Insurance 14d) with pre-defined urgency deadlines relative to departure
- **FR17:** Admin can add custom tasks to a vacation with a due date
- **FR18:** Admin can mark a booking task as complete
- **FR19:** Admin can create a Document Check task that validates family member documents against trip departure date
- **FR20:** System can generate a child task (e.g., passport renewal) from a Document Check task when a document is found to be expiring before the trip ends
- **FR21:** Vacation dashboard widget displays all incomplete booking tasks sorted by next due date

### Packing List

- **FR22:** Admin can add a packing item with title, category, tag(s), profile assignment, quantity, and status
- **FR23:** Admin can edit any packing item's fields
- **FR24:** Admin can delete any packing item
- **FR25:** Admin can update a packing item's status (New, Buy, Ready, Issue, Last-Minute, Packed)
- **FR26:** Admin can filter the packing list by assigned Profile
- **FR27:** System propagates packing list changes from one Admin to all other connected Admin devices in real-time

### Categories, Tags & Templates

- **FR28:** Admin can create, edit, and delete packing item categories with a name and icon
- **FR29:** Admin can create, edit, and delete item tags
- **FR30:** Admin can create a reusable packing template composed of items with profile assignments, categories, quantities, and tags
- **FR31:** Admin can tag a template for cross-cutting classification (e.g., "Beach", "All Trips")
- **FR32:** Admin can apply one or more templates when creating a vacation; items assigned to profiles not attending the trip are excluded from injection
- **FR33:** Admin can selectively reuse individual items or categories from past completed vacations

### Dashboard

- **FR34:** Admin can view a home dashboard surfacing pinned vacation widgets, the Leftovers widget (V2), and module entry points
- **FR35:** Vacation widget displays the vacation name, participant count, and incomplete booking tasks sorted by next due date
- **FR36:** Admin can navigate from a dashboard widget to the full vacation detail view

### Data Sync & Offline

- **FR37:** System persists all vacation, packing, profile, category, and leftover (V2) data locally on-device for offline access
- **FR38:** System queues data changes made while offline and syncs them to the backend on reconnect
- **FR39:** System resolves concurrent Admin edit conflicts using last-write-wins without presenting conflict dialogs to the user
- **FR40:** System checks for a newer app version on launch and notifies the user non-blockingly if an update is available

### Data Privacy (V4+)

- **FR41:** System ensures that one Admin's private spending envelope transactions are never visible to any other user — enforced at the data layer, not the display layer
- **FR42:** System partitions Maid account data such that a new Maid account cannot access any prior Maid's records
- **FR43:** System enforces all privacy boundaries through database-level Row Level Security, not application-level filtering

### Leftovers Management (V2)

- **FR44:** Admin can add a leftover item with a name, total doses, and expiry duration in days (default: 5 days, overridable at creation)
- **FR45:** System records the date added automatically and calculates the expiry date from date added + expiry duration
- **FR46:** Admin can tap "Eaten" on an active leftover item to increment the eaten dose counter by one
- **FR47:** Admin can tap "Throw out" on an active leftover item to discard all remaining doses at once, setting thrown-out doses to the remaining count
- **FR48:** System enforces that doses eaten + doses thrown out never exceeds total doses
- **FR49:** System closes a leftover item automatically when doses eaten + doses thrown out equals total doses
- **FR50:** Admin can edit an active leftover item's name, total doses, and expiry duration
- **FR51:** Admin can delete a leftover item
- **FR52:** System visually flags active leftover items that have passed their expiry date (highlighted/red)
- **FR53:** Dashboard displays a Leftovers widget showing: count of active items (meals), sum of remaining doses across active items, and the name and expiry date of the nearest-expiring active item
- **FR54:** Admin can navigate from the Leftovers dashboard widget to the full leftovers list
- **FR55:** Full leftovers list displays all items (active and closed), sorted by status (active first) then by expiry date (nearest first for active, most recent first for closed)
- **FR56:** Full leftovers list loads items progressively via infinite scroll
- **FR57:** System persists all leftover data locally on-device for offline access and syncs changes to the backend on reconnect

### Future Module Capabilities (V3–V6)

- **FR58:** Admin can maintain a shared household shopping list with sections organised by supermarket aisle (V3)
- **FR59:** Admin and Maid can add items to the shopping list; Admin can edit or delete any item; Maid can edit or delete only her own additions (V3)
- **FR60:** Admin can add shopping list items using voice input (V3)
- **FR61:** Admin can record household income and expenses against budget categories and envelopes (V4)
- **FR62:** Maid can log daily work hours with a single-tap interaction (V5)
- **FR63:** Admin can generate a billing statement and payslip for the Maid for any period (V5)
- **FR64:** Admin can import, search, scale, and organise recipes (V6)
- **FR65:** Admin can build a weekly meal plan and generate a deduplicated shopping list from it (V6)

---

## Non-Functional Requirements

### Performance

- **NFR1:** App launches to an interactive state within 2 seconds from cold start on supported Android devices
- **NFR2:** Packing item status changes reflect in the UI immediately (optimistic update), confirmed to backend within 3 seconds on a normal mobile connection
- **NFR3:** Real-time sync changes from one Admin reach all other connected Admin devices within 3 seconds
- **NFR4:** App loads fully from local cache within 1 second of launch when offline — no degraded or loading state shown to the user
- **NFR5:** All list operations (add, edit, delete, filter) complete without perceptible lag on devices running Android 8.0+

### Security & Privacy

- **NFR6:** All data in transit is encrypted using TLS 1.2 or higher
- **NFR7:** All data at rest is encrypted by the backend provider (Supabase default encryption)
- **NFR8:** Authentication is handled exclusively through Google Sign-In — no passwords are stored by FamilyHub
- **NFR9:** Session tokens are stored in secure, platform-provided credential storage — never in plaintext or shared storage
- **NFR10:** One Admin's private spending envelope transactions must not appear in any shared database query, API response, or sync payload — enforced at the Supabase RLS layer, not the application layer
- **NFR11:** A Maid user account must be incapable of reading any records belonging to a prior Maid account — enforced at the RLS layer
- **NFR12:** FamilyHub stores only the Google user ID and email from Google Sign-In — no additional personal data from Google is retained

### Reliability & Data Integrity

- **NFR13:** No user action that successfully commits data to the local store may be silently discarded — all changes either sync to the backend or remain in the offline queue until they do
- **NFR14:** The offline sync queue survives app restarts — changes queued while offline are not lost if the app is closed before reconnecting
- **NFR15:** Last-write-wins conflict resolution must always produce a valid, readable data state — no record may be left in a corrupted or null state after sync
- **NFR16:** The app installs cleanly via APK sideload on Android 8.0 (API 26) and above without requiring non-standard device configuration beyond enabling "Install from unknown sources"
- **NFR17:** Supabase free tier usage must not be exceeded at household scale (maximum ~5 concurrent users, low transaction volume)

### Integration

- **NFR18:** If Google Sign-In is unavailable at launch, a valid cached session is used without forcing re-authentication
- **NFR19:** If Supabase is unreachable, the app remains fully functional for all offline-supported operations — unavailability is never surfaced as an app error to the user
- **NFR20:** An OTA update check failure is silent — it must not block app launch or display an error
- **NFR21:** Any external service (Supabase, Google Sign-In, future Google Drive/Calendar) must be accessed exclusively through its repository interface module — business logic may not call external services directly

### UX Principles

- **NFR22:** The app must not present an onboarding wizard or guided setup flow on first launch. All configuration (profiles, categories, tags, templates, user management) is performed through Settings at the user's own pace. The app is usable immediately after sign-in.
- **NFR23:** Leftover expiry date calculations and visual flagging must evaluate correctly using device-local time, including when the device is offline
