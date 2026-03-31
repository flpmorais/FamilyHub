---
stepsCompleted: [1, 2, 3, 4]
v2EditedAt: '2026-03-31'
v2EditSummary: 'Added V2 Shopping epic (Epic 7) with 5 stories covering FR58-FR85 and NFR22-NFR28. Alexa Skill, AI categorization, living list, deduplication, offline sync.'
inputDocuments: ['_bmad-output/planning-artifacts/prd.md', '_bmad-output/planning-artifacts/ux-design-specification.md', '_bmad-output/planning-artifacts/architecture.md']
---

# FamilyHub - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for FamilyHub, decomposing the requirements from the PRD, UX Design Specification, and Architecture into implementable stories.

## Requirements Inventory

### Functional Requirements

**Identity & Access Management**
- FR1: Admin can sign in to the app using a Google account
- FR2: System links a Google account to an existing family Profile automatically on first sign-in
- FR3: Admin can invite another user by Google email and assign them the Admin role
- FR4: Admin can revoke access for any Maid user account

**Profile Management**
- FR5: Admin can create a family Profile with a name and avatar
- FR6: Admin can edit any family Profile's name and avatar
- FR7: Admin can delete a family Profile
- FR8: System maintains Profiles independently of User Accounts — Profiles exist before and without associated accounts

**Vacation Management**
- FR9: Admin can create a vacation with title, cover image, location, dates, and participant selection
- FR10: Admin can edit a vacation's title, image, location, dates, and participant list
- FR11: Admin can delete a vacation
- FR12: Admin can advance a vacation through its lifecycle: Planning → Upcoming → Active → Completed
- FR13: Admin can pin or unpin any vacation to the household dashboard
- FR14: System applies a pin state household-wide — pinned vacations appear on all Admin devices simultaneously
- FR15: System supports multiple simultaneously pinned vacations

**Booking Tasks**
- FR16: System generates standard booking tasks when a vacation is created (Flights 90d, Hotel 60d, Rent-a-car 30d) with pre-defined urgency deadlines stored as `deadline_days` on each task row
- FR17: Admin can add custom tasks to a vacation with a due date
- FR18: Admin can mark a booking task as complete
- FR19: Admin can create a Document Check task that validates family member documents against trip departure date
- FR20: System can generate a child task (e.g., passport renewal) from a Document Check task when a document is found to be expiring before the trip ends
- FR21: Vacation dashboard widget displays all incomplete booking tasks sorted by next due date

**Packing List**
- FR22: Admin can add a packing item with title, category, tag(s), profile assignment, quantity, and status
- FR23: Admin can edit any packing item's fields
- FR24: Admin can delete any packing item
- FR25: Admin can update a packing item's status (New, Buy, Ready, Issue, Last-Minute, Packed)
- FR26: Admin can filter the packing list by assigned Profile
- FR27: System propagates packing list changes from one Admin to all other connected Admin devices in real-time

**Categories, Tags & Templates**
- FR28: Admin can create, edit, and delete packing item categories with a name and icon
- FR29: Admin can create, edit, and delete item tags
- FR30: Admin can create a reusable packing template composed of items with profile assignments, categories, quantities, and tags
- FR31: Admin can tag a template for cross-cutting classification (e.g., "Beach", "All Trips")
- FR32: Admin can apply one or more templates when creating a vacation; items assigned to profiles not attending the trip are excluded from injection
- FR33: Admin can selectively reuse individual items or categories from past completed vacations

**Dashboard**
- FR34: Admin can view a home dashboard surfacing pinned vacation widgets and module entry points
- FR35: Vacation widget displays the vacation name, participant count, and incomplete booking tasks sorted by next due date
- FR36: Admin can navigate from a dashboard widget to the full vacation detail view

**Data Sync & Offline**
- FR37: System persists all vacation, packing, profile, and category data locally on-device for offline access
- FR38: System queues data changes made while offline and syncs them to the backend on reconnect
- FR39: System resolves concurrent Admin edit conflicts using last-write-wins without presenting conflict dialogs to the user
- FR40: System checks for a newer app version on launch and notifies the user non-blockingly if an update is available

**Data Privacy (V4+)**
- FR41: System ensures that one Admin's private spending envelope transactions are never visible to any other user — enforced at the data layer, not the display layer
- FR42: System partitions Maid account data such that a new Maid account cannot access any prior Maid's records
- FR43: System enforces all privacy boundaries through database-level Row Level Security, not application-level filtering

**Leftovers Management (V2)**
- FR44: Admin can add a leftover item with a name, total doses, and expiry duration in days (default: 5 days, overridable at creation)
- FR45: System records the date added automatically and calculates the expiry date from date added + expiry duration
- FR46: Admin can tap "Eaten" on an active leftover item to increment the eaten dose counter by one
- FR47: Admin can tap "Throw out" on an active leftover item to discard all remaining doses at once, setting thrown-out doses to the remaining count
- FR48: System enforces that doses eaten + doses thrown out never exceeds total doses
- FR49: System closes a leftover item automatically when doses eaten + doses thrown out equals total doses
- FR50: Admin can edit an active leftover item's name, total doses, and expiry duration
- FR51: Admin can delete a leftover item
- FR52: System visually flags active leftover items that have passed their expiry date (highlighted/red)
- FR53: Dashboard displays a Leftovers widget showing: count of active items (meals), sum of remaining doses across active items, and the name and expiry date of the nearest-expiring active item
- FR54: Admin can navigate from the Leftovers dashboard widget to the full leftovers list
- FR55: Full leftovers list displays all items (active and closed), sorted by status (active first) then by expiry date (nearest first for active, most recent first for closed)
- FR56: Full leftovers list loads items progressively via infinite scroll
- FR57: System persists all leftover data locally on-device for offline access and syncs changes to the backend on reconnect

**Future Module Capabilities (V3–V6)**
- FR58: Admin can maintain a shared household shopping list with sections organised by supermarket aisle (V3)
- FR59: Admin and Maid can add items to the shopping list; Admin can edit or delete any item; Maid can edit or delete only her own additions (V3)
- FR60: Admin can add shopping list items using voice input (V3)
- FR61: Admin can record household income and expenses against budget categories and envelopes (V4)
- FR62: Maid can log daily work hours with a single-tap interaction (V5)
- FR63: Admin can generate a billing statement and payslip for the Maid for any period (V5)
- FR64: Admin can import, search, scale, and organise recipes (V6)
- FR65: Admin can build a weekly meal plan and generate a deduplicated shopping list from it (V6)

---

### NonFunctional Requirements

**Performance**
- NFR1: App launches to an interactive state within 2 seconds from cold start on supported Android devices
- NFR2: Packing item status changes reflect in the UI immediately (optimistic update), confirmed to backend within 3 seconds on a normal mobile connection
- NFR3: Real-time sync changes from one Admin reach all other connected Admin devices within 3 seconds
- NFR4: App loads fully from local cache within 1 second of launch when offline — no degraded or loading state shown to the user
- NFR5: All list operations (add, edit, delete, filter) complete without perceptible lag on devices running Android 8.0+

**Security & Privacy**
- NFR6: All data in transit is encrypted using TLS 1.2 or higher
- NFR7: All data at rest is encrypted by the backend provider (Supabase default encryption)
- NFR8: Authentication is handled exclusively through Google Sign-In — no passwords are stored by FamilyHub
- NFR9: Session tokens are stored in secure, platform-provided credential storage — never in plaintext or shared storage
- NFR10: One Admin's private spending envelope transactions must not appear in any shared database query, API response, or sync payload — enforced at the Supabase RLS layer
- NFR11: A Maid user account must be incapable of reading any records belonging to a prior Maid account — enforced at the RLS layer
- NFR12: FamilyHub stores only the Google user ID and email from Google Sign-In — no additional personal data from Google is retained

**Reliability & Data Integrity**
- NFR13: No user action that successfully commits data to the local store may be silently discarded — all changes either sync to the backend or remain in the offline queue
- NFR14: The offline sync queue survives app restarts — changes queued while offline are not lost if the app is closed before reconnecting
- NFR15: Last-write-wins conflict resolution must always produce a valid, readable data state — no record may be left in a corrupted or null state after sync
- NFR16: The app installs cleanly via APK sideload on Android 8.0 (API 26) and above without requiring non-standard device configuration beyond enabling "Install from unknown sources"
- NFR17: Supabase free tier usage must not be exceeded at household scale (maximum ~5 concurrent users, low transaction volume)

**Integration**
- NFR18: If Google Sign-In is unavailable at launch, a valid cached session is used without forcing re-authentication
- NFR19: If Supabase is unreachable, the app remains fully functional for all offline-supported operations
- NFR20: An OTA update check failure is silent — it must not block app launch or display an error
- NFR21: Any external service must be accessed exclusively through its repository interface module — business logic may not call external services directly

**UX Principles**
- NFR22: The app must not present an onboarding wizard or guided setup flow on first launch. All configuration is performed through Settings at the user's own pace.
- NFR23: (V2) Leftover expiry date calculations and visual flagging must evaluate correctly using device-local time, including when the device is offline

---

### Additional Requirements

_Technical requirements from Architecture that affect implementation:_

- AR1: `expo-dev-client` is required from the first commit — Expo Go cannot run native modules (`@op-engineering/op-sqlite`). Development uses `expo run:android` or EAS Build `development` profile. This is an Epic 0 / Story 1 acceptance criterion.
- AR2: PowerSync schema (`utils/powersync.schema.ts`) must be updated in the same commit as any Supabase migration that adds or modifies synced columns. These are a coupled pair.
- AR3: `ISyncRepository.start()` must accept or retrieve a token provider callback that fetches the current Supabase JWT and handles refresh. Without this, sync silently fails after session expiry.
- AR4: Three EAS build profiles configured (`development` / `preview` / `production`) with corresponding `.env` files. Supabase URL and anon key in `.env`, never hardcoded.
- AR5: ESLint + Prettier (`eslint-config-expo` base) configured in Epic 0 — prevents agents from creating conflicting configs.
- AR6: All database schema changes via Supabase CLI migrations (`supabase migration new` + `supabase db push`). No manual edits in the Supabase dashboard.
- AR7: `expo-secure-store` for session token storage — never `AsyncStorage`.
- AR8: Repository pattern strictly enforced — zero Supabase SDK calls outside `src/repositories/supabase/`. Interfaces in `src/repositories/interfaces/`. Singleton injection via `RepositoryContext` at root `_layout.tsx`.
- AR9: All status/lifecycle values stored as lowercase string literals: `'new' | 'buy' | 'ready' | 'issue' | 'last_minute' | 'packed'` / `'planning' | 'upcoming' | 'active' | 'completed'` / `'admin' | 'maid'`. No integer codes.
- AR10: `snake_case` ↔ `camelCase` conversion happens exclusively in the repository layer. TypeScript domain types are always `camelCase`.

**(V2) Architecture Requirements:**
- AR-V2-1: New `leftovers` table with dose counters, expiry columns, check constraints, RLS — migration `20260327000001_leftovers_module.sql`
- AR-V2-2: PowerSync schema update in the same commit as the migration (coupled pair rule)
- AR-V2-3: `ILeftoverRepository` interface + Supabase implementation (9th repository, same singleton injection pattern)
- AR-V2-4: `leftoversStore` (Zustand) for pagination cursor and scroll position
- AR-V2-5: Auto-close logic in repository layer (not database trigger) — set `status = 'closed'` in same write as dose update
- AR-V2-6: Expiry flagging computed client-side against device-local time — no server dependency, works offline

---

### UX Design Requirements

_Actionable UX requirements from the UX Design Specification:_

**Design System & Theming**
- UX-DR1: Implement Material Design 3 theme with terracotta seed colour `#B5451B`. M3 tonal palette algorithm generates full light and dark schemes. Dark mode follows Android system preference — no in-app toggle.
- UX-DR2: Implement the fixed 6-status semantic colour palette: New `#757575`, Buy `#F59300`, Ready `#1976D2`, Issue `#D32F2F`, Last-Minute `#00897B`, Packed `#388E3C`. These are fixed semantic colours applied over M3 surface, stored as a `statusColorScheme` map consumed by all status-bearing components.
- UX-DR3: Implement a `statusColorScheme` constant map (`src/constants/status-colours.ts`) with `{ bg, text, border }` tokens per status. `Buy` status must use dark text `#1C1B1F` (white fails WCAG AA on amber). All other statuses use white text.
- UX-DR4: Apply Roboto typography at the M3 type scale: Body Large 16sp/400 (item name), Body Medium 14sp/400 (secondary line), Label Small 11sp/500 (status badges). System font scaling must not be locked — respect Android system font size setting.

**Custom Components — Phase 1 (launch-critical)**
- UX-DR5: Build `SwipeableItemWrapper` — gesture layer wrapping any list item. Left swipe reveals primary action (advance to next status, colour = next status colour). Right swipe reveals secondary action (flag Buy or Issue, context-dependent). 40% swipe threshold = confirm; <40% = snap back. Spring animation on release. States: `idle · swiping-left · swiping-right · confirming · snapping-back`. Long-press fallback menu duplicating swipe actions for accessibility.
- UX-DR6: Build `PackingItemCard` — 56dp height, 4dp left colour strip (status colour), item name (Body Large) + secondary line "Category · Profile · Qty" (Body Medium), `StatusBadge` trailing. States: `default · packed (strikethrough + 0.6 opacity) · issue · pressed · swiping`. Accessible as single semantic group: "[Name], [Status], [Category], [Person]".
- UX-DR7: Build `StatusBadge` — pill-shaped inline label, status background colour, Label Small 11sp text. Buy badge uses dark `#1C1B1F` text. Packed variant uses reduced opacity. Excluded from accessibility tree (parent card announces it).
- UX-DR8: Build `StatusCountPill` — header filter toggle: coloured dot + count + optional label. States: `inactive` (translucent, coloured dot), `active` (solid white, replicated as FilterChip in chip row), `zero` (hidden). Multiple pills active = OR filter. Accessible label: "Filtrar por [Status], [N] itens".

**Custom Components — Phase 2 (V1 polish)**
- UX-DR9: Build `PackingCompletionState` — full-screen success state replacing list when all items Packed. Terracotta/peach illustration + trip name + "Pronto para partir" heading + stats summary + "Ver resumo da viagem" action. Triggered on last item Packed or when opening an all-Packed list.
- UX-DR10: Build `CategoryCompletionIndicator` — inline separator with green checkmark + "Categoria completa" label. Fade-in animation on category completion. Disappears if an item is un-packed. Hidden in "Packed hidden" default view.

**Layout & Navigation**
- UX-DR11: Implement left `NavigationDrawer` for global module navigation. Active module uses M3 selected state (terracotta container). Future modules shown as disabled "Em breve" items — not hidden. Opens via TopAppBar hamburger or Android left-edge swipe.
- UX-DR12: Implement right-anchored `ModalDrawer` / `SideSheet` for the combinatorial filter panel. AND logic across dimensions (status AND category AND person), OR logic within a dimension. "Ver N itens" button shows live count as selections change. Scrim on open — tap scrim to dismiss without applying. Left drawer and right panel must never be open simultaneously.
- UX-DR13: Single `FloatingActionButton` (56dp, bottom-right, 16dp from screen edges) on all list screens. Always visible — never hidden by filter state, panel open state, or any other condition. FAB accessible label: "Adicionar item". One FAB, one action — no speed dial in V1.

**Packing List Screen**
- UX-DR14: Default packing list view: Packed items hidden, status distribution pills visible in header. Filter state persists per trip across app sessions.
- UX-DR15: Status count pills row beneath TopAppBar title. Tapping a pill activates that status filter and replicates it as a dismissible FilterChip in the chip row. 0-count pills hidden.
- UX-DR16: Active filter chip row (48dp height) beneath status pills. Chips from all sources (header pills + right panel). Each chip has `×` dismiss. "Limpar todos" appears when 2+ filters active. Row collapses to zero height when no filters active.
- UX-DR17: Add-item bottom sheet (FAB tap): auto-focus `Nome` field; fields: Nome (required) · Categoria (last-used pre-selected) · Pessoa (last-used pre-selected) · Quantidade (default 1) · Estado (default Novo). Sheet stays open after adding — explicit `×` or swipe-down to close. Defaults carry from previous item added.
- UX-DR18: Item detail bottom sheet (item tap): all fields editable. Sheet dismisses on save with immediate list update.

**Feedback & States**
- UX-DR19: Optimistic UI for all status changes. State changes instantly on device, sync in background. No "saving..." indicator. If sync fails, item reverts silently.
- UX-DR20: Snackbar "Desfazer" for 4 seconds after swipe-to-action. Snackbar is the only permitted non-blocking feedback channel — one at a time.
- UX-DR21: Offline state indicator: subtle app bar icon only (no banner) appearing after >5 minutes without connectivity. No indicator during normal online or brief-offline operation.
- UX-DR22: Implement 3 empty states: (1) no trips — "Ainda não há viagens" + "Criar a primeira viagem" CTA; (2) empty packing list — "Lista vazia — adiciona o primeiro item" + FAB; (3) no filter matches — "Nenhum item corresponde aos filtros activos" + "Limpar filtros" inline link.
- UX-DR23: Splash screen: terracotta background + logo using Android 12+ SplashScreen API.

**Accessibility**
- UX-DR24: All interactive elements minimum 48×48dp touch target. `PackingItemCard` 56dp height satisfies this.
- UX-DR25: TalkBack semantic labels: status pills "Filtrar por [Status], [N] itens"; FAB "Adicionar item"; filter chip dismiss "Remover filtro [label]". `StatusBadge` is decorative — excluded from accessibility tree.
- UX-DR26: Focus management: add-item sheet opens → focus to `Nome`; sheet closes → focus to FAB. Filter panel opens → focus to first chip in Estado section; panel closes → focus to filter icon in TopAppBar.
- UX-DR27: Status communicated by colour + icon + text label — never colour alone. Filter chip active state uses colour + checkmark.

**Forms & Destructive Actions**
- UX-DR28: Trip creation as full-screen bottom sheet (not a new route). Fields: Nome da viagem · Destino (optional) · Datas (date range picker) · Participantes (multi-select) · Template selection (same sheet, below participants). Dismissible via swipe-down with `AlertDialog` confirmation if data entered.
- UX-DR29: Destructive action pattern: long-press → context menu → `AlertDialog`. Destructive action on right in red, safe action on left. Delete is never a swipe gesture. Categories with items: warn "Esta categoria tem N itens. Os itens serão mantidos sem categoria."

---

### FR Coverage Map

| FR | Epic | Description |
|---|---|---|
| FR1 | Epic 1 | Google Sign-In |
| FR2 | Epic 1 | Auto-link Google account to Profile on first sign-in |
| FR3 | Epic 1 | Admin invitation by email |
| FR4 | Epic 1 | Maid access revocation |
| FR5 | Epic 1 | Create family Profile |
| FR6 | Epic 1 | Edit family Profile |
| FR7 | Epic 1 | Delete family Profile |
| FR8 | Epic 1 | Profiles independent of User Accounts |
| FR9 | Epic 2 | Create vacation with title/image/location/dates/participants |
| FR10 | Epic 2 | Edit vacation |
| FR11 | Epic 2 | Delete vacation |
| FR12 | Epic 2 | Vacation lifecycle: Planning → Upcoming → Active → Completed |
| FR13 | Epic 2 | Pin / unpin vacation to dashboard |
| FR14 | Epic 2 | Household-wide pin state |
| FR15 | Epic 2 | Multiple simultaneously pinned vacations |
| FR16 | Epic 2 | Auto-generate booking tasks on vacation creation |
| FR17 | Epic 2 | Add custom booking tasks |
| FR18 | Epic 2 | Mark booking task complete |
| FR19 | Epic 2 | Document Check task type |
| FR20 | Epic 2 | Child task generation from Document Check |
| FR21 | Epic 2 | Dashboard widget: incomplete tasks sorted by due date |
| FR22 | Epic 3 | Add packing item with all fields |
| FR23 | Epic 3 | Edit packing item |
| FR24 | Epic 3 | Delete packing item |
| FR25 | Epic 3 | Update packing item status (6-state model) |
| FR26 | Epic 3 | Filter packing list by assigned Profile |
| FR27 | Epic 3 | Real-time sync across Admin devices |
| FR28 | Epic 4 | Create/edit/delete packing categories |
| FR29 | Epic 4 | Create/edit/delete item tags |
| FR30 | Epic 4 | Create reusable packing template |
| FR31 | Epic 4 | Tag templates for classification |
| FR32 | Epic 4 | Apply templates at vacation creation with participant filtering |
| FR33 | Out of V1 scope | Selectively reuse items/categories from past vacations — removed; not implemented in V1 |
| FR34 | Epic 5 | Home dashboard with pinned widgets |
| FR35 | Epic 5 | Vacation widget with booking tasks sorted by due date |
| FR36 | Epic 5 | Navigate from widget to vacation detail |
| FR37 | Epic 3 | Offline-first local persistence |
| FR38 | Epic 3 | Offline sync queue |
| FR39 | Epic 3 | Last-write-wins conflict resolution |
| FR40 | Epic 5 | OTA update check on launch |
| FR41–FR43 | Out of V1 scope | RLS privacy enforcement — architecturally pre-positioned |
| FR44 | Epic 6 | (V2) Add leftover with name, doses, expiry duration |
| FR45 | Epic 6 | (V2) Auto date-added + expiry date calculation |
| FR46 | Epic 6 | (V2) Eaten button: increment dose counter |
| FR47 | Epic 6 | (V2) Throw out: discard all remaining doses |
| FR48 | Epic 6 | (V2) Dose constraint enforcement |
| FR49 | Epic 6 | (V2) Auto-close on zero remaining |
| FR50 | Epic 6 | (V2) Edit active leftover |
| FR51 | Epic 6 | (V2) Delete leftover |
| FR52 | Epic 6 | (V2) Visual flag for expired items |
| FR53 | Epic 6 | (V2) Dashboard widget: meals + doses + nearest expiry |
| FR54 | Epic 6 | (V2) Navigate from widget to full list |
| FR55 | Epic 6 | (V2) List sorted by status then expiry |
| FR56 | Epic 6 | (V2) Infinite scroll pagination |
| FR57 | Epic 6 | (V2) Offline persistence + sync |
| FR58–FR65 | Out of V2 scope | V3–V6 module capabilities |

---

## Epic List

### Epic 0: Project Foundation
A runnable app skeleton with all infrastructure in place — authentication flow navigable, repository pattern wired, local database syncing, APK buildable. No user-facing features, but every subsequent epic builds on this without rework.

**Technical requirements covered:** AR1–AR10, NFR6, NFR16, NFR21

---

### Epic 1: Authentication & Family Profiles
Admins can sign in with their Google accounts, set up the four family profiles (Filipe, Angela, Aurora, Isabel), and invite each other. The family exists in the app — ready for everything built on top.

**FRs covered:** FR1, FR2, FR3, FR4, FR5, FR6, FR7, FR8
**NFRs covered:** NFR8, NFR9, NFR18

---

### Epic 2: Vacation Creation & Booking Tasks
Admins can create a vacation, track booking deadlines (flights, hotel, car, insurance), manage the document check flow with child task generation, and advance the vacation through its lifecycle. A trip has a name, dates, participants, and a managed task list — from creation to departure.

**FRs covered:** FR9, FR10, FR11, FR12, FR13, FR14, FR15, FR16, FR17, FR18, FR19, FR20, FR21
**UX-DRs covered:** UX-DR11, UX-DR22, UX-DR28, UX-DR29

---

### Epic 3: Packing List — Core, UX & Sync
Admins can build and manage a packing list with the full six-status model, swipe-to-action, real-time sync between devices, and offline operation. This is the defining V1 experience — including all custom components, the filter system, optimistic updates, and accessibility. Angela can collaborate from her phone while Filipe's list updates silently.

**FRs covered:** FR22, FR23, FR24, FR25, FR26, FR27, FR37, FR38, FR39
**UX-DRs covered:** UX-DR1–UX-DR27
**NFRs covered:** NFR1–NFR5, NFR13, NFR14, NFR15, NFR19

---

### Epic 4: Categories, Tags & Templates
Admins can define their own vocabulary (categories and tags) and create reusable packing templates. When creating a vacation, the trip's selected profiles, categories, and tags are matched against all template items — the system auto-injects everything that matches. No manual template selection required.

**FRs covered:** FR28, FR29, FR30, FR31, FR32

---

### Epic 5: Dashboard & OTA Updates
Admins see a home dashboard with pinned vacation widgets showing packing progress and upcoming booking tasks. The app checks for a new version on launch and notifies the user non-blockingly. V1 is complete and usable end-to-end.

**FRs covered:** FR34, FR35, FR36, FR40
**NFRs covered:** NFR20

---

### Epic 6: Leftovers — Fridge Inventory & Dose Tracking (V2)
Admins can log leftover food in the fridge with dose quantities and expiry dates, track consumption one dose at a time or discard remaining doses in bulk, and see at a glance from the dashboard what's in the fridge and what's about to expire. Expired items are visually flagged. The full list shows active and closed items with infinite scroll. Works offline with the same sync model as V1.

**FRs covered:** FR44, FR45, FR46, FR47, FR48, FR49, FR50, FR51, FR52, FR53, FR54, FR55, FR56, FR57
**NFRs covered:** NFR23
**Architecture requirements:** AR-V2-1 through AR-V2-6

---

### Epic 7: Shopping — Living List, Alexa Skill & AI Categorization (V2)
Admins can maintain a shared shopping list that lives indefinitely — items are ticked (shopped) or unticked (needed), never archived. Items are added hands-free via Alexa Skill from the kitchen, auto-categorized by an AI classification service, and grouped by category in the app. Real-time sync at the supermarket. Dashboard widget shows open item count. Admins can reclassify items and manage categories. New infrastructure: Supabase Edge Function (Alexa backend), LLM API integration.

**FRs covered:** FR58, FR59, FR60, FR61, FR62, FR63, FR64, FR65, FR66, FR67, FR68, FR69, FR70, FR71, FR72, FR73, FR74, FR75, FR76, FR77, FR78, FR79, FR80, FR81, FR82, FR83, FR84, FR85
**NFRs covered:** NFR5, NFR22, NFR23, NFR24, NFR25, NFR28

---

## Epic 0: Project Foundation

A runnable app skeleton with all infrastructure in place — authentication flow navigable, repository pattern wired, local database syncing, APK buildable. No user-facing features, but every subsequent epic builds on this without rework.

### Story 0.1: Project Setup & Build Configuration

As a developer,
I want the Expo project initialized with all dependencies, build profiles, and code quality tooling configured,
So that every subsequent story builds on a consistent, correctly configured foundation without rework.

**Acceptance Criteria:**

**Given** the project repository is empty
**When** the setup commands are executed
**Then** an Expo SDK 55 TypeScript project exists with all packages installed: `expo-router`, `expo-dev-client`, `expo-secure-store`, `expo-updates`, `@supabase/supabase-js`, `@react-native-google-signin/google-signin`, `@powersync/react-native`, `@op-engineering/op-sqlite`, `react-native-gesture-handler`, `react-native-reanimated`, `react-native-paper`, `react-native-safe-area-context`, `zustand`

**Given** the EAS configuration is applied
**When** `eas build --profile development` is run
**Then** `eas.json` defines three profiles: `development` (development build), `preview` (internal APK), `production` (sideload APK + EAS Update channel)
**And** `.env.development`, `.env.preview`, `.env.production` files exist with `SUPABASE_URL` and `SUPABASE_ANON_KEY` variables
**And** `.env.example` is committed; all `.env.*` files (except `.example`) are git-ignored

**Given** the code quality tooling is applied
**When** `npx eslint src/` runs
**Then** ESLint passes with `eslint-config-expo` as base and TypeScript strict mode enabled
**And** Prettier is configured and consistent with ESLint

**Given** the development build is produced
**When** the APK is sideloaded on an Android 8.0+ device
**Then** the app launches to a blank screen without crashing
**And** `expo run:android` (not Expo Go) is confirmed as the development workflow

---

### Story 0.2: Supabase Schema & Migrations Foundation

As a developer,
I want the Supabase project configured with the initial schema and RLS scaffold,
So that all subsequent epics can add their tables to a correctly structured, RLS-ready database.

**Acceptance Criteria:**

**Given** the Supabase CLI is configured
**When** `supabase db push` is run
**Then** `supabase/config.toml` references the project and migration 001 applies without errors
**And** the following tables exist: `families`, `user_accounts`, `profiles`
**And** every table has `id` (uuid PK), `family_id` (uuid FK → families), `created_at`, `updated_at` columns
**And** RLS is enabled on all tables with a V1 permissive policy: authenticated users can read/write rows where `family_id` matches their session

**Given** the seed file is applied
**When** `supabase db reset` (dev only) runs
**Then** one family record and four profiles exist: Filipe, Angela, Aurora, Isabel
**And** no `user_account` rows exist (created on first sign-in)

**Given** a new migration is needed in future stories
**When** `supabase migration new <name>` is run
**Then** a new timestamped file appears in `supabase/migrations/` ready for schema changes

---

### Story 0.3: Repository Pattern & App Shell

As a developer,
I want the full folder structure, all repository interfaces, and the app route groups in place,
So that every feature story has a clear, consistent location for its files and can inject repositories without calling Supabase directly.

**Acceptance Criteria:**

**Given** the folder structure is created
**When** any developer opens `src/`
**Then** the following directories exist: `app/`, `components/common/`, `components/vacation/`, `components/packing/`, `repositories/interfaces/`, `repositories/supabase/`, `stores/`, `hooks/`, `types/`, `constants/`, `utils/`

**Given** the 8 repository interfaces are defined
**When** `grep -r "import.*supabase" src/` is run excluding `src/repositories/supabase/`
**Then** zero matches are found — Supabase SDK is imported only inside `src/repositories/supabase/`
**And** all 8 interfaces exist in `src/repositories/interfaces/`: `IAuthRepository`, `IProfileRepository`, `IVacationRepository`, `IPackingItemRepository`, `ICategoryRepository`, `ITemplateRepository`, `ISyncRepository`, `IOtaRepository`

**Given** the RepositoryContext is wired
**When** any screen calls `useRepository('auth')`
**Then** it receives the `IAuthRepository` implementation without importing it directly
**And** `src/repositories/repository.context.tsx` provides all 8 repository singletons as singleton instances
**And** `RepositoryProvider` wraps the root `_layout.tsx`

**Given** the Expo Router route groups exist
**When** the app launches
**Then** `(auth)/sign-in.tsx` and `(app)/index.tsx` exist as placeholder screens
**And** `(app)/_layout.tsx` contains a `useAuthGuard` hook stub that always redirects to sign-in (for now)
**And** the app navigates correctly between the two route groups

---

### Story 0.4: PowerSync Offline Sync Foundation

As a developer,
I want PowerSync initialized with SQLite and a working token provider,
So that every feature story can write to local SQLite knowing changes will sync to Supabase automatically.

**Acceptance Criteria:**

**Given** the PowerSync schema is defined
**When** `src/utils/powersync.schema.ts` is read
**Then** it declares the same tables as migration 001: `families`, `user_accounts`, `profiles`
**And** column definitions match the migration exactly (same names and types)

**Given** the SyncRepository is implemented
**When** `SyncRepository.start(tokenProvider)` is called
**Then** PowerSync connects using the Supabase JWT returned by `tokenProvider`
**And** `tokenProvider` calls `supabase.auth.getSession()` and handles token refresh if the JWT is expired
**And** `uiStore.isOffline` is set to `true` when PowerSync loses connectivity and `false` on reconnect

**Given** the PowerSync provider wraps the app
**When** the app launches and a user session exists
**Then** PowerSync initializes SQLite on-device without error
**And** `useQuery` hooks are available to any component below the provider
**And** offline writes queue automatically without any additional code in feature stories

---

## Epic 1: Authentication & Family Profiles

Admins can sign in with their Google accounts, set up the four family profiles (Filipe, Angela, Aurora, Isabel), and invite each other. The family exists in the app — ready for everything built on top.

### Story 1.1: Google Sign-In

As an Admin,
I want to sign in to FamilyHub using my Google account,
So that I can access the app securely without creating a separate password.

**Acceptance Criteria:**

**Given** the sign-in screen is displayed
**When** the user taps "Entrar com Google"
**Then** the Google account picker opens via `@react-native-google-signin/google-signin`
**And** on successful Google auth, `supabase.auth.signInWithIdToken()` is called with the Google ID token
**And** the Supabase JWT session is stored in `expo-secure-store` (not AsyncStorage)
**And** the user is navigated to `(app)/index.tsx`

**Given** a valid session exists in `expo-secure-store`
**When** the app launches
**Then** the user is navigated directly to `(app)/index.tsx` without seeing the sign-in screen
**And** Google Sign-In is not triggered again (NFR18 — cached session)

**Given** the user is signed in
**When** `authStore` is read
**Then** `authStore.session` contains the Supabase session
**And** `authStore.isLoading` is `false` and `authStore.error` is `null`

**Given** Google Sign-In fails or is cancelled
**When** the error is caught in `AuthRepository`
**Then** a `RepositoryError` is thrown with a human-readable message
**And** the sign-in screen remains visible with a Portuguese error message
**And** the app does not crash

---

### Story 1.2: First-Time Family Setup (Profile Linking)

As an Admin signing in for the first time,
I want my Google account automatically linked to an existing family profile,
So that I am immediately recognised as a household member without manual setup.

**Acceptance Criteria:**

**Given** Filipe signs in with his Google account for the first time
**When** `AuthRepository.signIn()` completes
**Then** the system checks `user_accounts` for a record matching the Google user ID
**And** if no record exists, a new `user_account` row is created with `google_id`, `email`, `role: 'admin'`, and the family's `family_id`
**And** if a `profile` with a matching name exists and has no linked account, `user_account.profile_id` is set to that profile's ID

**Given** Filipe's account is linked to his profile
**When** any screen reads the current user
**Then** `authStore.userAccount` contains `role: 'admin'` and a valid `profile_id`
**And** PowerSync sync starts immediately after account creation

---

### Story 1.3: Admin Invitation

As an Admin,
I want to invite Angela by her Google email and assign her the Admin role,
So that she can sign in and access the full household data.

**Acceptance Criteria:**

**Given** Filipe is signed in and navigates to Settings → Users
**When** he enters Angela's Google email and taps "Convidar"
**Then** a `user_account` record is created with Angela's email, `role: 'admin'`, and the family's `family_id`
**And** Angela appears in the users list with status "Pendente" (no Google ID yet)

**Given** Angela installs the APK and signs in with her Google account
**When** `AuthRepository.signIn()` runs and finds a `user_account` matching her email
**Then** her `user_account.google_id` is populated with her Google user ID
**And** she is navigated to `(app)/index.tsx` with full Admin access
**And** her account links to the "Angela" profile (profile_id populated)

**Given** Filipe views the users list after Angela has signed in
**When** he opens Settings → Users
**Then** Angela shows as "Admin" with her name — not "Pendente"

---

### Story 1.4: Family Profile Management

As an Admin,
I want to create, edit, and delete family profiles with names and avatars,
So that the household's members are represented in the app before they have accounts.

**Acceptance Criteria:**

**Given** Filipe navigates to Settings → Profiles
**When** he taps "Adicionar perfil"
**Then** a bottom sheet opens with fields: Nome (required) and Avatar (optional — initials fallback)
**And** on save, a new `profile` row is created in the `profiles` table with the family's `family_id`
**And** the new profile appears in the profiles list immediately

**Given** four profiles exist (Filipe, Angela, Aurora, Isabel)
**When** Filipe taps on a profile and edits the name or avatar
**Then** the `profile` row is updated via `ProfileRepository.update()`
**And** the change is reflected in the list immediately

**Given** Filipe taps "Eliminar" on a profile
**When** he confirms the `AlertDialog`
**Then** the `profile` row is removed and no longer appears in the profiles list
**And** if the profile has a linked `user_account`, deletion is blocked with a warning: "Este perfil está associado a uma conta activa"

**Given** the profiles list is viewed
**When** any Admin opens Settings → Profiles
**Then** all profiles are displayed with name and avatar (or initials fallback if no avatar)
**And** profiles with no linked account are visually distinct from those with accounts

---

## Epic 2: Vacation Creation & Booking Tasks

Admins can create a vacation, track booking deadlines (flights, hotel, car), manage document checks per participant with child task generation, and advance the vacation through its lifecycle.

### Story 2.1: Vacation CRUD & Lifecycle

As an Admin,
I want to create, edit, and delete vacations with title, destination, dates, and participants,
So that trips are structured objects in the app that the whole household can reference.

**Acceptance Criteria:**

**Given** Supabase migration 002 is applied
**When** the schema is inspected
**Then** a `vacations` table exists with: `id`, `family_id`, `title`, `destination`, `cover_image_url`, `departure_date`, `return_date`, `lifecycle` (`'planning'|'upcoming'|'active'|'completed'`), `is_pinned`, `created_at`, `updated_at`
**And** a `vacation_participants` join table exists: `vacation_id`, `profile_id`
**And** RLS policies are applied with `family_id` enforcement
**And** `utils/powersync.schema.ts` is updated to include `vacations` and `vacation_participants`

**Given** an Admin taps "Nova viagem" in the navigation drawer or dashboard FAB
**When** the trip creation bottom sheet opens
**Then** fields are presented: Nome da viagem (required), Destino (optional), Datas (date range picker), Participantes (multi-select from family profiles)
**And** on save, a `vacation` row is created via `VacationRepository.create()` with `lifecycle: 'planning'`
**And** the new vacation appears in the vacation list immediately

**Given** an existing vacation
**When** an Admin taps edit and changes any field
**Then** `VacationRepository.update()` is called and the change reflects immediately
**And** participant changes update the `vacation_participants` join table

**Given** an Admin taps "Eliminar viagem" in vacation settings
**When** the `AlertDialog` showing the trip name is confirmed
**Then** the vacation and all associated data (tasks, packing items) are deleted via `VacationRepository.delete()`
**And** the vacation no longer appears in the vacation list

**Given** a vacation exists
**When** an Admin taps the lifecycle advance button
**Then** `lifecycle` progresses: `'planning'` → `'upcoming'` → `'active'` → `'completed'`
**And** each state change is persisted immediately

---

### Story 2.2: Vacation Pinning & Navigation

As an Admin,
I want to pin vacations to the dashboard and navigate between them,
So that active trips are always one tap away on both my and Angela's device.

**Acceptance Criteria:**

**Given** a vacation exists
**When** an Admin taps the pin toggle on a vacation
**Then** `vacation.is_pinned` is set to `true` and syncs to all Admin devices via PowerSync
**And** Angela's app shows the same pin state without refresh (NFR3)

**Given** multiple vacations are pinned
**When** any Admin opens the app
**Then** all pinned vacations appear on the dashboard (no limit)
**And** unpinned vacations are accessible from the vacation list screen

**Given** an Admin taps a pinned vacation widget
**When** the widget is tapped
**Then** the app navigates to `vacations/[vacationId]/index.tsx`

**Given** the navigation drawer is open
**When** an Admin views the module list
**Then** "Viagens" is the active module shown with M3 selected state (terracotta container)
**And** future modules (V2–V6) appear as disabled "Em breve" items — not hidden

---

### Story 2.3: Booking Task Timeline

As an Admin,
I want standard booking tasks auto-generated when I create a vacation, with urgency deadlines I can track,
So that I never miss a flight booking or hotel deadline because it wasn't on my radar.

**Acceptance Criteria:**

**Given** Supabase migration 002 includes the booking tasks table
**When** the schema is inspected
**Then** a `booking_tasks` table exists with: `id`, `vacation_id`, `family_id`, `title`, `task_type` (`'flights'|'hotel'|'car'|'document_check'|'custom'`), `deadline_days` (integer, nullable), `due_date`, `is_complete`, `parent_task_id` (nullable), `profile_id` (nullable), `created_at`, `updated_at`
**And** `utils/powersync.schema.ts` is updated to include `booking_tasks`

**Given** a new vacation is created with a `departure_date`
**When** `VacationRepository.create()` completes
**Then** three standard booking tasks are auto-generated: Voos (`deadline_days: 90`), Hotel (`deadline_days: 60`), Rent-a-car (`deadline_days: 30`)
**And** `due_date` = `departure_date − deadline_days` for each task
**And** `deadline_days` is stored on each task row

**Given** booking tasks exist for a vacation
**When** an Admin views `vacations/[vacationId]/booking-tasks.tsx`
**Then** incomplete tasks are sorted by `due_date` ascending (most urgent first)
**And** each task row shows title, due date, and days remaining
**And** completed tasks appear with strikethrough at the bottom of the list

**Given** an Admin taps "Marcar como concluída" on a task
**When** the action completes
**Then** `booking_task.is_complete` is set to `true` and the task moves to the completed section

**Given** an Admin taps "Adicionar tarefa"
**When** they enter a title and due date
**Then** a new `booking_task` row is created with `task_type: 'custom'` and `deadline_days: null`

---

### Story 2.4: Document Check Tasks per Participant

As an Admin,
I want one document check task per trip participant, which I can mark complete or extend with child tasks,
So that each family member's documents are tracked individually and I can add a renewal task if needed.

**Acceptance Criteria:**

**Given** a new vacation is created with participants (e.g., Filipe, Angela, Aurora, Isabel)
**When** `VacationRepository.create()` completes
**Then** one `document_check` booking task is auto-generated per participant: "Verificar documentos — [Nome]" with `task_type: 'document_check'` and `profile_id` set to each participant's profile ID
**And** these tasks appear in the booking task list sorted by `due_date` alongside the standard tasks

**Given** a document check task exists for Angela
**When** an Admin marks it complete
**Then** `is_complete: true` is set on that task only
**And** the task moves to the completed section

**Given** a document check task exists for Angela and her passport needs renewal
**When** an Admin taps "Adicionar subtarefa" on the document check task
**Then** a bottom sheet opens with fields: Título and Data limite
**And** on save, a child task is created with `parent_task_id` pointing to the document check task
**And** the child task appears in the list sorted by its `due_date`

**Given** child tasks exist under a document check task
**When** an Admin views the booking task list
**Then** child tasks are visually nested or grouped under their parent document check task
**And** each child task has its own complete/incomplete state independent of the parent

---

## Epic 3: Packing List — Core, UX & Sync

Admins can build and manage a packing list with the full six-status model, swipe-to-action, real-time sync between devices, and offline operation. Includes all custom components, the filter system, optimistic updates, and accessibility.

### Story 3.1: M3 Theme & Design System Foundation

As an Admin,
I want the app to use a warm Material Design 3 theme with the correct status colour palette,
So that every screen has a consistent, family-forward look and all status colours work correctly in both light and dark modes.

**Acceptance Criteria:**

**Given** the M3 theme is configured at the app root
**When** any screen renders
**Then** the terracotta seed colour `#B5451B` is set as the M3 theme seed
**And** dark mode follows Android system preference automatically — no in-app toggle
**And** `react-native-paper`'s `PaperProvider` wraps the app below `RepositoryProvider`

**Given** the status colour map is defined
**When** `src/constants/status-colours.ts` is read
**Then** it exports a `STATUS_COLOURS` map with `{ bg, text, border }` tokens for all six statuses: New `#757575`, Buy `#F59300`, Ready `#1976D2`, Issue `#D32F2F`, Last-Minute `#00897B`, Packed `#388E3C`
**And** Buy status has `text: '#1C1B1F'` (dark) — all other statuses have `text: '#FFFFFF'`
**And** all status badge text meets WCAG AA contrast (4.5:1 minimum)

**Given** the typography is applied
**When** any packing list item renders
**Then** item name uses Body Large (16sp/400), secondary line uses Body Medium (14sp/400), status badge label uses Label Small (11sp/500)
**And** system font scaling is not locked — Android font size setting is respected

---

### Story 3.2: Packing List Data Layer & Basic CRUD

As an Admin,
I want to add, edit, and delete packing items on a vacation's list,
So that the list reflects everything that needs to be packed, assigned to the right person.

**Acceptance Criteria:**

**Given** Supabase migration 003 is applied
**When** the schema is inspected
**Then** a `packing_items` table exists with: `id`, `vacation_id`, `family_id`, `title`, `status` (`'new'|'buy'|'ready'|'issue'|'last_minute'|'packed'`), `profile_id` (nullable), `quantity` (integer, default 1), `notes` (nullable), `created_at`, `updated_at`
**And** RLS policies are applied with `family_id` enforcement
**And** `utils/powersync.schema.ts` is updated to include `packing_items`

**Given** an Admin views a vacation's packing list screen
**When** they tap the FAB
**Then** an add-item bottom sheet opens with: Nome (required, auto-focused), Categoria (nullable — categories added in Epic 4), Pessoa (profile selector, nullable), Quantidade (default 1), Estado (default `'new'`)
**And** the sheet stays open after saving so multiple items can be added in sequence
**And** the last-used Pessoa and Categoria values pre-populate on subsequent entries

**Given** an Admin taps an existing packing item
**When** the item detail bottom sheet opens
**Then** all fields are editable: Nome, Categoria, Pessoa, Quantidade, Estado, Notas
**And** on save, `PackingItemRepository.update()` is called and the list updates immediately

**Given** an Admin long-presses a packing item
**When** the context menu appears
**Then** an "Eliminar" option is shown
**And** tapping "Eliminar" shows an `AlertDialog` with the item name
**And** on confirm, `PackingItemRepository.delete()` is called and the item is removed

---

### Story 3.3: Status Update — Swipe-to-Action & StatusBadge

As an Admin,
I want to update a packing item's status with a swipe gesture,
So that moving items through the packing workflow takes one gesture — under one second.

**Acceptance Criteria:**

**Given** the `SwipeableItemWrapper` component is built
**When** an item is swiped left past the 40% threshold
**Then** the primary action is confirmed — status advances to the next logical state: `new→buy`, `buy→ready`, `ready→packed`, `issue→ready`, `last_minute→packed`
**And** the item's colour strip and `StatusBadge` update instantly (optimistic update — no loading indicator)
**And** a Snackbar "Desfazer" appears for 4 seconds
**And** tapping "Desfazer" reverts the status change

**Given** an item is swiped right past the 40% threshold
**When** the secondary action is confirmed
**Then** if current status is `new` or `ready`: status changes to `buy`
**And** if current status is `buy` or `ready`: status changes to `issue`
**And** the same optimistic update and Snackbar behaviour applies

**Given** a swipe is released below the 40% threshold
**When** the gesture ends
**Then** the item snaps back to its original position with a spring animation
**And** no status change occurs

**Given** a `StatusBadge` renders for any status
**When** viewed in both light and dark mode
**Then** the badge background matches `STATUS_COLOURS[status].bg`
**And** the badge text matches `STATUS_COLOURS[status].text` (dark for Buy, white for all others)
**And** the 4dp left strip on `PackingItemCard` matches the same `bg` colour

**Given** a user with TalkBack enabled interacts with a packing item
**When** they long-press the item
**Then** a context menu appears with the same actions as swipe-left and swipe-right (accessibility fallback)

---

### Story 3.4: Packing List Screen Layout & Filter System

As an Admin,
I want to see my packing list with status count pills in the header and a composable filter system,
So that I can orient myself instantly and narrow to exactly the items I need to work on.

**Acceptance Criteria:**

**Given** a packing list has items
**When** the packing list screen opens
**Then** Packed items are hidden by default
**And** a row of `StatusCountPill` components appears beneath the TopAppBar title showing counts per non-zero status
**And** a floating FAB (56dp, bottom-right, 16dp margins) is always visible regardless of scroll or filter state

**Given** an Admin taps a `StatusCountPill` (e.g., "Comprar · 4")
**When** the pill is tapped
**Then** the list filters to show only items with that status
**And** the pill shows as active (solid white background)
**And** a dismissible `FilterChip` for that status appears in the chip row below the pills
**And** tapping the pill again or the chip's `×` removes the filter

**Given** an Admin taps the "+ Filtros" chip
**When** the right filter panel opens
**Then** a right-anchored `ModalDrawer` slides in with sections: Estado (status chips), Pessoa (profile chips)
**And** AND logic applies across dimensions (status AND person), OR logic within (Buy OR Issue)
**And** a "Ver N itens" button shows the live count as selections change
**And** dismissing the panel applies the selection and shows active chips in the chip row
**And** the left drawer and right filter panel cannot be open simultaneously

**Given** filters are active
**When** no items match the current filter combination
**Then** an empty state is shown: "Nenhum item corresponde aos filtros activos" with a "Limpar filtros" inline link

**Given** an Admin closes and reopens the packing list for a vacation
**When** the screen loads
**Then** the previously active filter state is restored (persisted per trip)

---

### Story 3.5: Real-Time Sync & Offline Operation

As an Admin,
I want packing list changes to appear on Angela's phone silently and to work fully when I'm offline,
So that we never need to coordinate or wonder if the list is current.

**Acceptance Criteria:**

**Given** Filipe updates a packing item status on his phone
**When** Angela's phone is connected
**Then** Angela's list updates within 3 seconds without any refresh action (NFR3)
**And** no toast, banner, or visual disruption appears — the list is just current

**Given** both phones are online and Angela adds a new item
**When** Filipe views his list
**Then** Angela's new item appears without Filipe taking any action

**Given** an Admin enables airplane mode
**When** they add items, update statuses, and delete items offline
**Then** all operations complete normally with immediate local feedback
**And** no connectivity banner appears during the operation
**And** a subtle app bar icon appears (no banner, no text) after more than 5 minutes without connectivity

**Given** the Admin reconnects after offline changes
**When** PowerSync sync runs
**Then** all queued changes sync to Supabase without data loss (NFR13, NFR14)
**And** if Angela made overlapping changes, last-write-wins resolves silently — no conflict dialog (FR39)
**And** the list converges to a valid, readable state (NFR15)

**Given** the app is launched with no connectivity
**When** the packing list screen opens
**Then** the list loads from local SQLite within 1 second (NFR4)
**And** the user can interact normally — all reads and writes work against local SQLite

---

### Story 3.6: PackingItemCard & Trip Completion State

As an Admin,
I want the packing list to show clear item status at a glance and signal when the whole trip is fully packed,
So that I know where things stand without reading every item, and leaving day has a satisfying "done" moment.

**Acceptance Criteria:**

**Given** the `PackingItemCard` component is built
**When** an item renders in the list
**Then** the card is 56dp height with a 4dp left colour strip (status colour), item name on the primary line (Body Large), "Category · Person · Qty" on the secondary line (Body Medium, quantity hidden if 1), `StatusBadge` trailing
**And** a Packed item renders with strikethrough text and 0.6 opacity
**And** the full item announces as a single TalkBack group: "[Name], [Status], [Category], [Person]"

**Given** all items on the packing list reach `packed` status
**When** the last item is packed (or the list is opened with all items already packed)
**Then** `PackingCompletionState` replaces the list — terracotta/peach illustration, trip name, "Pronto para partir" heading, stats summary, "Ver resumo da viagem" action

**Given** the packing list is empty (no items added yet)
**When** the screen renders
**Then** an empty state shows: "Lista vazia — adiciona o primeiro item" with the FAB visible

---

### Story 3.7: Accessibility & System Integration

As an Admin,
I want the packing list to be fully accessible and honour Android system settings,
So that it works correctly under TalkBack, at high font sizes, and in dark mode.

**Acceptance Criteria:**

**Given** TalkBack is enabled
**When** the packing list screen is navigated
**Then** every `StatusCountPill` announces: "Filtrar por [Status], [N] itens"
**And** the FAB announces: "Adicionar item"
**And** filter chip dismiss buttons announce: "Remover filtro [label]"
**And** `StatusBadge` is excluded from the accessibility tree (parent card announces it)

**Given** the add-item bottom sheet opens
**When** focus is managed
**Then** focus moves to the `Nome` field automatically (keyboard appears)
**And** when the sheet closes, focus returns to the FAB

**Given** the right filter panel opens
**When** focus is managed
**Then** focus moves to the first chip in the Estado section
**And** when the panel closes, focus returns to the filter icon in the TopAppBar

**Given** Android system font size is set to 150% or 200%
**When** the packing list renders
**Then** `PackingItemCard` does not clip text — item name wraps or truncates gracefully
**And** filter chips remain readable and tappable

**Given** the Android splash screen launches
**When** the app starts cold
**Then** the splash screen uses a terracotta background with the app logo (Android 12+ SplashScreen API)
**And** transition to the first screen is smooth

---

## Epic 4: Categories, Tags & Templates

Admins can define their own vocabulary (categories and tags) and create reusable packing templates. When creating a vacation, the system automatically injects all template items that match the trip's selected profiles, categories, and tags.

### Story 4.1: Packing Categories & Tags

As an Admin,
I want to create, edit, and delete my own packing item categories and tags,
So that I can organise items with vocabulary that makes sense for my family.

**Acceptance Criteria:**

**Given** Supabase migration 004 is applied
**When** the schema is inspected
**Then** a `categories` table exists with: `id`, `family_id`, `name`, `icon` (string — Material Symbols name), `created_at`, `updated_at`
**And** a `tags` table exists with: `id`, `family_id`, `name`, `created_at`, `updated_at`
**And** a `packing_item_tags` join table exists: `packing_item_id`, `tag_id`
**And** `utils/powersync.schema.ts` is updated to include all three tables

**Given** an Admin navigates to Settings → Categorias
**When** they tap "Adicionar categoria"
**Then** a bottom sheet opens with fields: Nome (required) and Ícone (Material Symbols picker)
**And** on save, a `category` row is created and appears in the list immediately
**And** categories can be edited (name + icon) and deleted
**And** deleting a category with associated packing items shows a warning: "Esta categoria tem N itens. Os itens serão mantidos sem categoria." and the items' `category_id` is set to null on confirm

**Given** an Admin navigates to Settings → Etiquetas
**When** they tap "Adicionar etiqueta"
**Then** a bottom sheet opens with a Nome field
**And** on save, a `tag` row is created and appears in the list immediately
**And** tags can be edited and deleted

**Given** categories and tags exist
**When** an Admin adds or edits a packing item
**Then** the Categoria field shows a picker with all family categories
**And** a Tags field allows zero or more tags to be selected from the family tags list

---

### Story 4.2: Reusable Packing Templates

As an Admin,
I want to create reusable templates with items that carry optional profile, category, and tag filters,
So that the right items are automatically added to any trip that matches those filters.

**Acceptance Criteria:**

**Given** Supabase migration 004 includes template tables
**When** the schema is inspected
**Then** a `templates` table exists with: `id`, `family_id`, `name`, `created_at`, `updated_at`
**And** a `template_items` table exists with: `id`, `template_id`, `family_id`, `title`, `profile_id` (nullable), `category_id` (nullable), `quantity` (integer, default 1)
**And** a `template_item_tags` join table exists: `template_item_id`, `tag_id`
**And** `utils/powersync.schema.ts` is updated to include all template tables

**Given** an Admin navigates to Settings → Modelos and taps "Criar modelo"
**When** the template form opens
**Then** fields are: Nome do modelo (required) and an item list (initially empty)
**And** items can be added with: Título (required), Perfil (optional — from family profiles), Categoria (optional), Etiquetas (optional, multi-select)
**And** on save, the template and all its items are persisted

**Given** a template item has no profile set
**When** that item is injected into a trip
**Then** one packing item is generated per trip participant

**Given** a template item has a specific profile set (e.g., Filipe)
**When** that item is injected into a trip where Filipe is a participant
**Then** one packing item is generated assigned to Filipe only

**Given** a template exists
**When** an Admin edits it
**Then** they can add, remove, or edit template items and update the template name
**And** tapping "Eliminar" on the template shows an `AlertDialog` and deletes the template and its items on confirm (existing packing items already generated are unaffected)

---

### Story 4.3: Automatic Template Application at Trip Creation

As an Admin,
I want to configure a trip with profiles, categories, and tags so the system automatically injects all matching template items,
So that the packing list is populated without me manually selecting which templates to apply.

**Acceptance Criteria:**

**Given** templates exist and a new vacation is being created
**When** the trip creation bottom sheet is open
**Then** in addition to title, destination, and dates, the Admin selects: Participantes (profiles going), Categorias (which categories to include), and Etiquetas da viagem (tags that describe this trip, e.g., "fora-schengen", "praia")

**Given** the trip configuration is complete and the Admin taps "Criar"
**When** `VacationRepository.create()` runs
**Then** the system queries all template items and applies the following matching rules:
- Category filter: item's `category_id` is null OR matches one of the trip's selected categories
- Tag filter: item has no tags OR at least one of the item's tags is in the trip's selected tags
**And** items that pass both filters are injected

**Given** a matching template item has `profile_id = null`
**When** it is injected
**Then** one packing item is created per trip participant, each assigned to their respective profile

**Given** a matching template item has `profile_id = Filipe`
**When** Filipe is in the trip participants
**Then** one packing item is created assigned to Filipe only

**Given** a matching template item has `profile_id = Isabel`
**When** Isabel is NOT in the trip participants
**Then** no packing item is created for that template item

**Given** two matching template items have the same title and category
**When** injected into the same trip
**Then** they are treated as separate items — no automatic deduplication

**Given** the trip is created with no categories or no tags selected
**When** template matching runs
**Then** only template items with null category (if no categories selected) and no tags (if no tags selected) are injected

---

## Epic 5: Dashboard & OTA Updates

Admins see a home dashboard with pinned vacation widgets showing booking task urgency. The app silently updates itself on launch. V1 is complete end-to-end.

### Story 5.1: Home Dashboard with Pinned Vacation Widgets

As an Admin,
I want a home dashboard showing all pinned vacations as widgets with booking task status,
So that I can see where every active trip stands the moment I open the app.

**Acceptance Criteria:**

**Given** an Admin opens the app and is signed in
**When** the dashboard screen (`(app)/index.tsx`) renders
**Then** all pinned vacations appear as `ElevatedCard` widgets, one per pinned vacation
**And** each widget displays: vacation title, participant count, and all incomplete booking tasks sorted by `due_date` ascending (most urgent first)
**And** unpinned vacations are not shown on the dashboard (accessible via the Viagens list in the drawer)

**Given** no vacations are pinned
**When** the dashboard renders
**Then** an empty state is shown: "Ainda não há viagens" with a "Criar a primeira viagem" CTA
**And** the FAB is visible for quick vacation creation

**Given** a vacation has no incomplete booking tasks
**When** its widget renders
**Then** the task section shows "Sem tarefas pendentes"

**Given** an Admin taps a vacation widget
**When** the tap is registered
**Then** the app navigates to `vacations/[vacationId]/index.tsx`

**Given** Filipe pins a new vacation on his phone
**When** Angela's dashboard is viewed
**Then** the newly pinned vacation widget appears on Angela's dashboard within 3 seconds (real-time sync via PowerSync)

---

### Story 5.2: OTA Update — Silent Auto-Apply

As an Admin,
I want the app to silently download and apply any available update on launch,
So that I'm always on the latest version without any prompts or interruptions.

**Acceptance Criteria:**

**Given** the app launches
**When** `OtaRepository.checkForUpdate()` is called in the background
**Then** if a new JS bundle is available, it is fetched and applied immediately via `expo-updates` `fetchUpdateAsync()` + `reloadAsync()`
**And** the reload happens before the user has interacted with any content — no visible transition or prompt
**And** if no update is available, nothing happens and nothing is shown

**Given** the OTA check or fetch fails (network error, EAS Update unavailable)
**When** the error is caught in `OtaRepository`
**Then** the failure is silently swallowed — no error message, no crash, no impact on app launch (NFR20)
**And** the app continues to run on the currently installed bundle

---

## Epic 6: Leftovers — Fridge Inventory & Dose Tracking (V2)

Admins can log leftover food in the fridge with dose quantities and expiry dates, track consumption one dose at a time or discard remaining doses in bulk, and see at a glance from the dashboard what's in the fridge and what's about to expire. Expired items are visually flagged. The full list shows active and closed items with infinite scroll. Works offline with the same sync model as V1.

### Story 6.1: Leftovers Data Layer & Repository

As a developer,
I want the leftovers database table, PowerSync schema, repository interface, and implementation in place,
So that all subsequent leftovers stories can persist and sync data using the same patterns as V1.

**Acceptance Criteria:**

**Given** the Supabase CLI is configured
**When** migration `20260327000001_leftovers_module.sql` is applied via `supabase db push`
**Then** the `leftovers` table exists with columns: `id` (uuid PK), `family_id` (uuid FK), `name` (text NOT NULL), `total_doses` (integer NOT NULL), `doses_eaten` (integer NOT NULL DEFAULT 0), `doses_thrown_out` (integer NOT NULL DEFAULT 0), `expiry_days` (integer NOT NULL DEFAULT 5), `date_added` (timestamptz NOT NULL), `expiry_date` (timestamptz NOT NULL), `status` (text NOT NULL DEFAULT 'active'), `created_at`, `updated_at`
**And** check constraints enforce: `doses_eaten + doses_thrown_out <= total_doses`, `total_doses > 0`, `expiry_days > 0`, `status IN ('active', 'closed')`
**And** RLS is enabled: admins can read/write rows matching their `family_id`
**And** index `idx_leftovers_family_id_status` exists

**Given** the PowerSync schema is updated
**When** `src/utils/powersync.schema.ts` is read
**Then** the `leftovers` table is declared with columns matching the migration exactly
**And** this update is in the same commit as the migration

**Given** the repository interface is defined
**When** `src/repositories/interfaces/leftover.repository.interface.ts` is read
**Then** `ILeftoverRepository` declares methods: `create`, `update`, `delete`, `getById`, `getActive`, `getAll` (paginated), `incrementEaten`, `throwOutRemaining`
**And** all methods use `camelCase` domain types (`Leftover`, `LeftoverStatus`)

**Given** the Supabase implementation exists
**When** `src/repositories/supabase/leftover.repository.ts` is read
**Then** it implements `ILeftoverRepository` with `snake_case` ↔ `camelCase` conversion at the repository boundary
**And** `RepositoryContext` provides the 9th repository singleton

**Given** types and constants are defined
**When** `src/types/leftover.types.ts` is read
**Then** `Leftover`, `LeftoverStatus`, and `LeftoverWidgetData` types exist
**And** `src/constants/leftover-defaults.ts` exports `DEFAULT_EXPIRY_DAYS = 5` and `PAGINATION_PAGE_SIZE`
**And** `src/stores/leftovers.store.ts` exports `leftoversStore` with pagination cursor

---

### Story 6.2: Leftover CRUD & Dose Tracking

As an Admin,
I want to add leftovers to the fridge, eat doses one at a time, throw out what nobody wants, and edit or delete items,
So that I have an accurate, up-to-date record of what's in the fridge and how it's being consumed.

**Acceptance Criteria:**

**Given** the admin is on the leftovers screen
**When** they tap the FAB and fill in the add form with name "Lasagna", total doses 4, expiry days 5
**Then** a new leftover is created with `date_added` set to now, `expiry_date` calculated as `date_added + 5 days`, `doses_eaten = 0`, `doses_thrown_out = 0`, `status = 'active'`
**And** the item appears in the active list immediately (optimistic update)

**Given** the admin leaves expiry days blank
**When** the leftover is created
**Then** `expiry_days` defaults to 5 and `expiry_date` is calculated accordingly

**Given** an active leftover "Lasagna" has `total_doses = 4`, `doses_eaten = 1`, `doses_thrown_out = 0`
**When** the admin taps the "Eaten" button once
**Then** `doses_eaten` increments to 2
**And** the remaining dose count displayed updates immediately

**Given** an active leftover has `total_doses = 4`, `doses_eaten = 3`, `doses_thrown_out = 0`
**When** the admin taps "Eaten" once more
**Then** `doses_eaten` becomes 4, `doses_eaten + doses_thrown_out = total_doses`
**And** `status` is set to `'closed'` automatically (FR49)
**And** the item moves to the closed section of the list

**Given** an active leftover "Coq au vin" has `total_doses = 3`, `doses_eaten = 0`, `doses_thrown_out = 0`
**When** the admin taps "Throw out"
**Then** `doses_thrown_out` is set to 3 (all remaining)
**And** `status` is set to `'closed'` automatically
**And** the item moves to the closed section

**Given** an active leftover has `doses_eaten + doses_thrown_out = total_doses`
**When** the admin attempts to tap "Eaten" or "Throw out"
**Then** neither button is available — the item is closed and no further dose actions are possible (FR48)

**Given** an active leftover exists
**When** the admin edits its name, total doses, or expiry duration
**Then** the changes are saved immediately
**And** if `total_doses` is changed, `expiry_date` recalculates if expiry duration changed
**And** the constraint `doses_eaten + doses_thrown_out <= total_doses` is enforced — the admin cannot reduce `total_doses` below the sum already consumed/thrown

**Given** a leftover item exists (active or closed)
**When** the admin deletes it
**Then** the item is removed from the list permanently

---

### Story 6.3: Leftovers List Screen

As an Admin,
I want to see all my leftovers in a single scrollable list — active items first with expired ones flagged in red, closed items below — loading more as I scroll,
So that I can quickly assess what's in the fridge and review the history of what was consumed or wasted.

**Acceptance Criteria:**

**Given** the admin navigates to `leftovers/index.tsx`
**When** the screen loads
**Then** all active leftover items appear first, sorted by expiry date ascending (nearest expiry at top)
**And** all closed items appear below active items, sorted by expiry date descending (most recently expired first)

**Given** an active leftover's `expiry_date` is earlier than or equal to the current device-local time
**When** the list renders
**Then** that item is visually flagged with red/highlighted styling (FR52)
**And** the flagging evaluates against `Date.now()` on-device — no server round-trip (NFR23)

**Given** an active leftover's `expiry_date` is in the future
**When** the list renders
**Then** that item displays in normal (non-flagged) styling

**Given** the leftovers list contains more items than one screen can display
**When** the admin scrolls to the bottom
**Then** the next page of items loads automatically (infinite scroll, FR56)
**And** `leftoversStore` pagination cursor updates to track the current position
**And** page size is defined by `PAGINATION_PAGE_SIZE` constant

**Given** there are no leftover items at all
**When** the screen loads
**Then** an empty state is shown with guidance to add the first leftover via the FAB

**Given** the device is offline
**When** the admin opens the leftovers list
**Then** the list loads from local SQLite cache without error or degraded state
**And** expiry flagging still evaluates correctly using device-local time

**Given** each leftover item card is displayed
**When** the admin views it
**Then** they see: item name, remaining doses (total − eaten − thrown out), expiry date, and the "Eaten" / "Throw out" action buttons (for active items)
**And** closed items show final counts: doses eaten and doses thrown out

---

### Story 6.4: Dashboard Leftovers Widget

As an Admin,
I want a widget on the home dashboard that tells me how many meals and doses are in the fridge and what expires next,
So that I can decide at a glance whether to cook something new or use what's already there.

**Acceptance Criteria:**

**Given** there are active leftover items in the database
**When** the admin views the home dashboard
**Then** the Leftovers widget displays: count of active items (labeled as meals), sum of remaining doses across all active items, and the name and expiry date of the nearest-expiring active item (FR53)

**Given** there are 2 active leftovers: "Lasagna" (2 remaining doses, expires Sunday) and "Coq au vin" (3 remaining doses, expires Thursday)
**When** the widget renders
**Then** it shows: "2 meals · 5 doses — Coq au vin expires Thursday"

**Given** there are no active leftover items
**When** the dashboard loads
**Then** the Leftovers widget shows a zero/empty state (e.g., "Frigorífico vazio") with no meal or dose counts

**Given** the nearest-expiring item has passed its expiry date
**When** the widget renders
**Then** the expiry information is visually flagged (red/highlighted), consistent with the list screen flagging

**Given** the admin taps the Leftovers widget
**When** the navigation executes
**Then** the app navigates to `leftovers/index.tsx` (full leftovers list) (FR54)

**Given** the device is offline
**When** the dashboard loads
**Then** the Leftovers widget renders correctly from local SQLite data
**And** expiry flagging evaluates against device-local time

## Epic 7: Shopping — Living List, Alexa Skill & AI Categorization (V2)

Admins can maintain a shared shopping list that lives indefinitely — items are ticked (shopped) or unticked (needed), never archived. Items are added hands-free via Alexa Skill from the kitchen, auto-categorized by an AI classification service, and grouped by category in the app. Real-time sync at the supermarket. Dashboard widget shows open item count. New infrastructure: Supabase Edge Function (Alexa backend), LLM API integration.

### Story 7.1: Shopping Data Layer, Categories & Repository

As a developer,
I want the shopping list database tables, default categories, PowerSync schema, repository interfaces, and implementations in place,
So that all subsequent shopping stories can persist and sync data using the same patterns as V1/V2.

**Acceptance Criteria:**

**Given** the Supabase CLI is configured
**When** the shopping migration is applied via `supabase db push`
**Then** the `shopping_categories` table exists with columns: `id` (uuid PK), `family_id` (uuid FK), `name` (text NOT NULL), `sort_order` (integer), `created_at`, `updated_at`
**And** the `shopping_items` table exists with columns: `id` (uuid PK), `family_id` (uuid FK), `name` (text NOT NULL), `category_id` (uuid FK → `shopping_categories.id`), `quantity_note` (text, nullable), `is_ticked` (boolean NOT NULL DEFAULT false), `created_at`, `updated_at`
**And** RLS is enabled: admins in the same `family_id` can read/write all shopping items and categories
**And** index `idx_shopping_items_family_id_is_ticked` exists
**And** a unique index on `shopping_items(family_id, lower(name))` prevents exact duplicates at the database level

**Given** the migration includes seed data for default categories
**When** a new family is created (or migration runs against an existing family)
**Then** 16 default shopping categories are created: Dairy, Meat, Fish, Fruit, Vegetables, Bakery, Frozen, Pantry, Beverages, Snacks, Spices & Condiments, Eggs, Cleaning, Hygiene, Baby, Other (FR72)

**Given** the PowerSync schema is updated
**When** `src/utils/powersync.schema.ts` is read
**Then** `shopping_categories` and `shopping_items` tables are declared with columns matching the migration
**And** this update is in the same commit as the migration

**Given** the repository interfaces are defined
**When** `src/repositories/interfaces/shopping.repository.interface.ts` is read
**Then** `IShoppingRepository` declares methods: `addItem`, `tickItem`, `untickItem`, `editItem`, `deleteItem`, `getItems` (grouped by category, unticked first), `findByName` (case-insensitive)
**And** `IShoppingCategoryRepository` declares methods: `getAll`, `create`, `edit`, `delete`, `reclassifyItem`
**And** all methods use `camelCase` domain types (`ShoppingItem`, `ShoppingCategory`)

**Given** the Supabase implementations exist
**When** the repository files are read
**Then** they implement the interfaces with `snake_case` ↔ `camelCase` conversion at the repository boundary
**And** `RepositoryContext` provides the new repository singletons (11th and 12th repositories)

**Given** types and constants are defined
**When** `src/types/shopping.types.ts` is read
**Then** `ShoppingItem`, `ShoppingCategory`, and `ShoppingWidgetData` types exist
**And** `src/stores/shopping.store.ts` exports `shoppingStore` with scroll position and category filter state

---

### Story 7.2: Shopping List Screen — Living List & Category Grouping

As an Admin,
I want to see my shopping list grouped by category with ticked items greyed out below unticked ones, and add/tick/untick/edit/delete items,
So that I can manage my shopping at the supermarket with a clear, organized view.

**Acceptance Criteria:**

**Given** the admin navigates to the shopping list
**When** the screen renders
**Then** items are displayed grouped by category headers
**And** within each category group, unticked items appear above ticked items (FR63)
**And** ticked items are visually greyed out but remain visible — they are not hidden (FR64)

**Given** the admin taps the FAB to add an item
**When** they enter "Milk" and optionally a quantity note "3 packs"
**Then** a new shopping item is created with `is_ticked = false` (FR59)
**And** the item appears in the list immediately (optimistic update)
**And** if "Milk" already exists and is ticked, the system prompts to untick the existing item instead of creating a duplicate (FR81)
**And** if "Milk" already exists and is unticked, the system flags the duplicate and prevents creation (FR82)
**And** name matching is case-insensitive

**Given** the admin taps an unticked item
**When** the tick action executes
**Then** `is_ticked` is set to true (FR60)
**And** the item moves to the ticked (greyed) section within its category group immediately

**Given** the admin taps a ticked item
**When** the untick action executes
**Then** `is_ticked` is set to false (FR60)
**And** the item moves back to the unticked section within its category group

**Given** the admin long-presses or swipes an item
**When** the edit action is selected
**Then** the admin can edit the item's name, category (reclassify), and quantity note (FR61)
**And** if the category is changed, the system persists this as the item's permanent category (FR70)

**Given** the admin swipes to delete
**When** the delete action executes
**Then** the item is removed from the list (FR62)

**Given** another admin ticks/unticks/adds/deletes on their device
**When** the change syncs
**Then** this admin's list updates in real-time within 3 seconds (FR65, NFR5)

---

### Story 7.3: AI Categorization Service

As a developer,
I want new shopping items to be auto-categorized by an AI classification service when they're first added,
So that items land in the correct category without manual effort.

**Acceptance Criteria:**

**Given** the repository interface is defined
**When** `src/repositories/interfaces/classification.repository.interface.ts` is read
**Then** `IClassificationRepository` declares a method: `classifyItem(itemName: string, categories: string[]): Promise<string>` returning a category name
**And** the interface follows the repository pattern (NFR21 — all external services behind swappable interface)

**Given** the LLM implementation exists
**When** `src/repositories/llm/classification.repository.ts` is read
**Then** it calls the LLM API with the item name and current category list
**And** returns the LLM's category selection as a string
**And** `RepositoryContext` provides the singleton

**Given** a new item "coriander" is added that has never existed in the shopping list
**When** the add flow executes
**Then** the system calls `IClassificationRepository.classifyItem("coriander", [category list])` (FR68)
**And** the returned category (e.g., "Vegetables") is assigned to the item automatically
**And** the item is saved with the assigned category

**Given** an item "milk" is added that already exists in the shopping list (ticked)
**When** the add flow executes
**Then** the system unticks the existing "milk" item without calling the classification service (FR69)
**And** the existing category is preserved

**Given** the admin previously reclassified "toilet paper" from "Hygiene" to "Cleaning"
**When** "toilet paper" is added again (unticked from ticked)
**Then** the system uses "Cleaning" (the admin's reclassification) — it does not call the classification service (FR70)

**Given** the LLM API is unreachable or times out (>2 seconds, NFR23)
**When** a new item is added
**Then** the item is assigned to the "Other" category (FR73)
**And** the item is created successfully — classification failure never blocks item creation

**Given** the LLM API costs
**When** measured over a month of family-scale usage (~100 items)
**Then** total cost remains under €1/month (NFR25)

---

### Story 7.4: Alexa Skill & Edge Function Backend

As an Admin,
I want to add, remove, and query shopping items hands-free via Alexa while cooking,
So that I never have to stop what I'm doing to update the shopping list.

**Acceptance Criteria:**

**Given** a Supabase Edge Function exists at a dedicated endpoint
**When** the Alexa Skill sends a request
**Then** the endpoint authenticates the request using a household-level API key (FR79, NFR24)
**And** unauthenticated requests are rejected with a 401 response

**Given** the user says "Alexa, tell FamilyHub to add olive oil"
**When** the Alexa Skill processes the intent
**Then** the Edge Function checks if "olive oil" exists in the shopping list (case-insensitive)
**And** if it exists and is ticked: unticks it, responds "Olive oil is back on your list" (FR69)
**And** if it exists and is unticked: responds "Olive oil is already on your list" without creating a duplicate (FR80)
**And** if it doesn't exist: creates the item, triggers AI categorization, responds "Added olive oil to your list" (FR74)

**Given** the user says "Alexa, tell FamilyHub to remove olive oil"
**When** the Alexa Skill processes the intent
**Then** the Edge Function ticks the item (marks as shopped), responds "Removed olive oil from your list" (FR75)
**And** if the item doesn't exist, responds "Olive oil is not on your list"

**Given** the user says "Alexa, do I have milk on the FamilyHub list?"
**When** the Alexa Skill processes the intent
**Then** the Edge Function queries for "milk" (case-insensitive)
**And** responds "Yes, milk is on your list" or "No, milk is not on your list" (FR76)

**Given** the user says "Alexa, what was the last item I added to FamilyHub?"
**When** the Alexa Skill processes the intent
**Then** the Edge Function queries for the most recently created unticked item
**And** responds with the item name (FR77)

**Given** the user says "Alexa, tell FamilyHub to set the quantity of milk to 3 packs"
**When** the Alexa Skill processes the intent
**Then** the Edge Function updates the `quantity_note` field on the "milk" item to "3 packs" (FR78)
**And** responds "Set milk quantity to 3 packs"

**Given** the Edge Function receives any request
**When** it processes the request
**Then** it responds within 3 seconds to avoid Alexa timeout errors (NFR22)

**Given** the Alexa Skill is a custom skill
**When** deployed
**Then** it is deployed as a personal/household skill (no public certification required)
**And** the skill invocation name is "FamilyHub" (or user-configured)

---

### Story 7.5: Dashboard Shopping Widget & Offline Sync

As an Admin,
I want a shopping widget on the dashboard showing how many items I need to buy, and I want the list to work offline,
So that I always know what to shop for and can use the list even without connectivity.

**Acceptance Criteria:**

**Given** there are unticked shopping items in the database
**When** the admin views the home dashboard
**Then** the Shopping widget displays the count of unticked (open) items (FR66)
**And** the widget text reads e.g., "12 itens" (Portuguese)

**Given** there are no unticked shopping items
**When** the dashboard loads
**Then** the Shopping widget shows a zero state (e.g., "Lista vazia")

**Given** the admin taps the Shopping widget
**When** the navigation executes
**Then** the app navigates to the full shopping list screen (FR67)

**Given** the device is offline
**When** the admin opens the shopping list
**Then** all items load from local SQLite cache (FR83)
**And** tick/untick operations work and are queued for sync (FR84)

**Given** two admins tick/untick the same item while both are online
**When** the changes sync
**Then** last-write-wins resolves the conflict silently — no conflict dialog (FR85)

**Given** the admin ticks 5 items at the supermarket
**When** they return home and the device reconnects
**Then** all 5 tick changes sync to the backend
**And** the dashboard widget count updates to reflect the new unticked count

**Given** shopping category reclassifications are made by an admin
**When** any future addition of that item occurs (via app or Alexa)
**Then** the system uses the admin's reclassified category permanently — it does not re-categorize (NFR28)
