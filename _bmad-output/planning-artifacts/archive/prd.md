---
stepsCompleted: ['step-01-init', 'step-02-discovery', 'step-02b-vision', 'step-02c-executive-summary', 'step-03-success', 'step-04-journeys', 'step-05-domain', 'step-06-innovation', 'step-07-project-type', 'step-08-scoping', 'step-09-functional', 'step-10-nonfunctional', 'step-11-polish', 'step-e-01-discovery', 'step-e-02-review', 'step-e-03-edit', 'step-e-01-discovery-2', 'step-e-02-review-2', 'step-e-03-edit-2', 'step-e-01-discovery-3', 'step-e-02-review-3', 'step-e-03-edit-3', 'step-e-01-discovery-4', 'step-e-02-review-4', 'step-e-03-edit-4', 'step-e-01-discovery-5', 'step-e-02-review-5', 'step-e-03-edit-5', 'step-e-01-discovery-6', 'step-e-02-review-6', 'step-e-03-edit-6', 'step-e-01-discovery-7', 'step-e-02-review-7', 'step-e-03-edit-7']]
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
lastEdited: '2026-04-28'
editHistory:
  - date: '2026-03-27'
    changes: 'V2 Leftovers module expansion — added user journey, full functional requirements, success criteria, product scope, phased development, offline scope, NFR'
  - date: '2026-03-31'
    changes: 'Version rebrand — V1 now includes Vacation & Leftovers (both shipped). V3→V2, V4→V3, V5→V4, V6→V5, V7+→V6+. Updated success criteria (V1 shipped), product scope, phased development, all FR/NFR version refs. V2 Shopping module fully expanded — two user journeys (Alexa voice input, supermarket run), 29 FRs (living list, Alexa Skill, AI categorization, dedup, offline sync), 7 new NFRs (Alexa latency, LLM cost cap, category persistence). Risks updated for V2.'
  - date: '2026-04-01'
    changes: 'Version rebrand — split V5 (Recipes+Meal Planning) into V3 Meal Plan and V4 Recipes. Finances V3→V5, Maid V4→V6, Intelligence V6+→V7+. Maid salary integration moved from Finances to Maid. Shopping list generation from meal plan moved to V4 Recipes. Removed offline-first entirely (cancelled, never implemented). Removed Journey 3 (offline), offline FRs (FR37-38 old, FR57 old, FR83-85 old), offline NFRs (NFR4 old cache, NFR13-14 old queue, NFR19 old Supabase unreachable). Renumbered all FRs (88 total→88 total) and NFRs (28→24). Added V3/V4 dependency risk.'
  - date: '2026-04-01'
    changes: 'V3 Meal Plan full expansion — added Journey 8 (weekly meal planning), V3 success criteria signal, expanded Product Scope and Phase 3 descriptions. Replaced 2 placeholder FRs (FR81-82) with 19 detailed FRs (FR81-FR99): meal plan configuration (3), core CRUD (8), participant management (3), leftovers integration (2), dashboard widget (3). Renumbered future module FRs to FR100-FR105. Added 2 NFRs (NFR25 week view load, NFR26 default config propagation). Total FRs: 105. Total NFRs: 26.'
  - date: '2026-04-02'
    changes: 'V4 Language Learning (Greek) — replaced V4 Recipes with Language Learning module. Version rebrand: Recipes V4→V5, Finances V5→V6, Maid V6→V7, Intelligence V7+→V8+. Added Journey 9 (Greek learning with voice via Pi + WebSocket + TTS). Replaced 2 Recipes placeholder FRs (FR100-FR101) with 14 Language Learning FRs (FR100-FR113): session service (4), WebSocket + TTS (3), voice input (2), skill system (2), onboarding (2), learning profiles (1). Added 4 NFRs (NFR27-NFR30: session service response, WebSocket TTS latency, STT transcription time, TTS double-speak timing). Updated Executive Summary, Success Criteria, Product Scope, Device Permissions, Phased Development, Risk Mitigation. Added 2 FRs from validation (FR114 connection status, FR115 skill-complete signal). Renumbered future module FRs to FR114-FR115. Total FRs: 121. Total NFRs: 30.'
  - date: '2026-04-04'
    changes: 'V5 Recipes full expansion — added Journey 10 (recipe collection, import, cooking from plan, shopping list generation). Replaced 2 placeholder FRs (FR114-FR115) with 34 detailed FRs (FR114-FR115): recipe CRUD (6), URL import (2), YouTube import (3), photo OCR import (2), manual entry (1), browse & search (4), scaling (2), meal plan integration (5), shopping list generation (6), sharing (2), sync (1). Added 7 NFRs (NFR31-NFR37: URL/YouTube/OCR import times, search speed, shopping list generation, PDF generation, LLM cost cap). Updated Success Criteria (V5 signal), Measurable Outcomes (V5 row), Product Scope (V5 expanded), Device Permissions (CAMERA extended pulled to V5), Phased Development (V5 full paragraph + new infrastructure), Risk Mitigation (5 V5-specific risks), Journey Requirements Summary (Journey 10 row). Renumbered future module FRs to FR114-FR115. Total FRs: 153. Total NFRs: 37.'
  - date: '2026-04-28'
    changes: 'V4 Language Learning architecture migration — replaced Claude Code with OpenCode as the AI engine. Removed onboarding section entirely (FR111-FR112 deleted: setup-complete gate and Claude OAuth WebView). Switched from Tailscale to Cloudflare Tunnel (api.fh-morais.party / wss://ws.fh-morais.party). Added Podman containerization for session service (dev and prod). Added automatic per-user Linux user provisioning on first connection. Per-user isolation now runs OpenCode in separate home directories with Fluent skill progress tracked in md files. Updated all FRs, NFRs, Journey 9, Product Scope, Phased Development, Risk Mitigation, and Device Permissions. Renumbered FRs: FR111/FR112 removed, FR113→FR111, FR114→FR112, FR115→FR113, V5+ FRs shifted down by 2. Total FRs: 151. Total NFRs: 37.'
  - date: '2026-04-29'
    changes: 'V4 Language Learning API key configuration — added onboarding gate for OpenCode Zen/Go API key setup on first use. Each user must configure their API key before accessing the skill menu. Session service writes the key to per-user auth.json and provisions user infrastructure (Linux account, home directory, OpenCode, Fluent). Replaced "no onboarding gate" with API key setup gate. Updated Journey 9, Product Scope, Success Criteria, Risk Mitigation, Device Permissions. Learning profile field changed from claude_authenticated to api_key_configured. Added FR111-FR113 (API key setup gate, configuration, provisioning) and renumbered existing V4 FRs (FR111→FR114, FR112→FR115, FR113→FR116). Added NFR31-NFR32 (API key HTTPS transmission, encryption at rest). V5+ FRs shifted down by 3. Total FRs: 154. Total NFRs: 39.'
---

# Product Requirements Document - FamilyHub

**Author:** Filipe
**Date:** 2026-03-24

## Executive Summary

FamilyHub is a personal family management mobile app built by Filipe Morais exclusively for the Morais household. It is not a commercial product. It exists to permanently eliminate three recurring failures in family life: vacation packing lists rebuilt from scratch before every trip, items forgotten at the supermarket, and leftovers spoiling unseen in the fridge.

The app is built for a specific household structure: two symmetric admin users (the couple), two child profiles that will eventually become accounts, and a scoped employee user (the maid). It consolidates vacation planning, shopping, leftovers tracking, household finances, maid billing, recipes, and meal planning into a single integrated system — built in Portuguese, with no generic defaults, and no design compromises for a hypothetical broader audience.

V1 shipped Vacation and Leftovers together — both modules are in active family use. Remaining modules are delivered incrementally across six versions (V2 Shopping → V7 Maid), each shipping one complete, usable module. AI features and background jobs are explicitly post-V7. The backend runs on Supabase (free tier). Every external service is accessed through a swappable repository pattern interface. The app is distributed as a private APK — no app store involved.

### What Makes This Special

**One family, perfectly served.** No market fit to validate, no onboarding funnel, no generic defaults. Every design decision — budget category names, shopping list sections, UI language, the maid's purpose-built experience, private spending envelopes for each spouse — reflects the exact reality of this household.

**Modules that integrate meaningfully.** Vacation status adjusts household budget proportionally. Maid salary auto-posts as a household expense. Recipes generate a deduplicated shopping list from the meal plan. Leftovers surface in meal planning before expiry. Shopping list integrates with meal planning and recipes. Language learning bridges OpenCode on a Raspberry Pi with the mobile app via a Cloudflare Tunnel — Greek phrases spoken aloud on the phone via WebSocket, voice responses captured via STT. No VPN needed on the phone; the tunnel keeps the connection always-on. Each user configures their OpenCode Zen/Go API key on first use; the session service provisions their isolated environment and writes the key securely — no SSH, no terminal, no manual Pi access required. The system behaves as a coherent whole, not a collection of features.

**Built by the person who lives the problem.** The builder's prior OutSystems app validated the vacation module concept but was constrained by licensing. FamilyHub is the unconstrained successor — full-stack, properly architected, designed to grow with the family over years.

**Vendor-independent by design.** The repository pattern ensures no vendor lock-in. Replacing Supabase, Google Drive, or any other service means rewriting one service module — nothing else.

**Voice-first where it matters.** The shopping list integrates with Amazon Alexa via a custom Skill — items are added hands-free from the kitchen. AI categorization (cheap LLM) assigns items to shopping categories automatically, learning from admin reclassifications.

## Project Classification

- **Project Type:** Cross-platform mobile app (Android-first), private APK sideload distribution — no app store
- **Domain:** General / Personal Productivity
- **Complexity:** Low-Medium — technically non-trivial (real-time sync, multi-module integration, service abstraction) but zero regulatory or compliance overhead
- **Project Context:** Greenfield

---

## Success Criteria

### User Success

FamilyHub has no commercial success metrics. Success is personal and behavioural.

**Primary signal — Angela's willing adoption.**
Filipe built the app and will rationalise using it. Angela has no such bias. If she uses FamilyHub willingly and considers it a net improvement to how the family operates, the app works. If she describes it as extra work or stops using it, the app has failed — regardless of technical quality or feature completeness.

**V1 signal — one complete vacation planned end-to-end. ✅ SHIPPED**
V1 Vacation module is in active family use. Packing lists, templates, and task tracking are operational.

**V1 signal — leftovers tracked for one full month. ✅ SHIPPED**
V1 Leftovers module is in active family use. Both admins log leftovers, track doses, and act on expiry through the dashboard widget.

**V2 signal — shopping list used every supermarket visit.**
Within one month of V2 shipping, both admins use the shared shopping list for every supermarket trip. Voice entry and real-time sync eliminate the memory test. The subjective test: did anyone forget something they needed?

**V3 signal — meal plan used every week.**
Within one month of V3 shipping, both admins use the weekly meal plan consistently. The plan is prepared before the week starts, adjusted as reality changes, and the family stops asking "what are we eating tonight?" The subjective test: does the family eat better and waste less because meals are planned?

**V4 signal — Greek learning sessions used regularly with voice.**
Within one month of V4 shipping, both admins use the language learning module for Greek practice at least twice per week. Each admin configures their OpenCode Zen/Go API key on first use without needing terminal or SSH access. Voice playback works reliably via Cloudflare Tunnel — phrases spoken aloud on the phone without manual intervention. At least one admin uses the mic for voice input regularly. The session service is accessible without VPN. The subjective test: is Greek improving faster with audio reinforcement than with text-only learning?

**V5 signal — recipes used for meal planning and shopping list generation.**
Within one month of V5 shipping, both admins use the Recipes module to plan home-cooked meals. At least half of home-cooked meals in the weekly plan are linked to recipes rather than free-text entries. Shopping list generation from the meal plan is used weekly — the manual "check what ingredients I need" step is eliminated. The subjective test: does having recipes linked to the meal plan make cooking and shopping easier, or does it feel like admin overhead?

**Ongoing signal — modules used without friction.**
Each module in active use should feel like a shortcut, not an obligation. The moment any module becomes a chore, that module has failed its design goal.

### Business Success

N/A — no commercial objectives, no revenue targets, no user growth goals.

**Version gate:** Each version ships when its module is functionally complete and in active family use. V1 (Vacation & Leftovers) has passed its gate — both modules are in willing daily use by both admins. V2 begins now. Same gate applies at every version boundary.

### Technical Success

- **Real-time sync:** When both admins are online, list changes (shopping ticks, packing status updates) propagate without requiring manual refresh.
- **APK distribution:** App installs cleanly via sideloaded APK on Android devices. No Play Store dependency.
- **Free-tier backend:** Supabase usage stays within free tier limits at family scale. No unexpected cloud costs.
- **Service replaceability:** Any external service can be swapped by replacing its service module only — zero changes to business logic.

### Measurable Outcomes

| Outcome | Signal | Status |
|---|---|---|
| Vacation packing improved | First trip planned end-to-end in app | ✅ Shipped (V1) |
| Angela adopted | Using app without prompting or complaints | ✅ Achieved |
| No leftover spoilage | Leftovers consistently logged and acted on before expiry — thrown-out doses trend downward over first 3 months of use | ✅ Shipped (V1) |
| Shopping friction eliminated | Shopping list used every supermarket visit | V2 (next) |
| Meal planning adopted | Meal plan prepared weekly, adjusted in real-time, "what's for dinner?" eliminated | V3 (planned) |
| Greek learning with voice | Both admins use language learning with voice playback at least twice per week; each admin configures their API key on first use without terminal access | V4 (planned) |
| Recipes adopted for meal planning | At least half of home-cooked meals linked to recipes; shopping list generated from plan weekly | V5 (planned) |
| Version gate reached | Each module in daily use before next version begins | V1 gate passed |

---

## Product Scope

| Version | Module | Core Capability | Status |
|---|---|---|---|
| V1 | Vacation & Leftovers | Packing lists, booking tasks, templates; fridge inventory with dose tracking, per-item expiry, eaten/thrown-out counters, dashboard widget, full list with infinite scroll | ✅ Shipped |
| V2 | Shopping | Living shared list (tick/untick), Alexa Skill voice input, AI categorization (cheap LLM), category-grouped display, real-time sync, dashboard widget (open item count) | Next |
| V3 | Meal Plan | 7-day week grid (lunch + dinner), configurable default participants per slot, meal types (home-cooked, eating out, takeaway, leftovers), per-meal participant overrides, slot skip/enable overrides, leftovers linking to previous meals, dashboard widget (next meal + planning reminders) | Planned |
| V4 | Language Learning (Greek) | Greek learning via OpenCode on a Raspberry Pi, bridged to the mobile app via Cloudflare Tunnel (no VPN required on phone). Containerised session service (Podman) manages session lifecycle (start/resume/end/status) via HTTP. On first use, each admin configures their OpenCode Zen/Go API key through an in-app setup screen — the session service provisions their isolated environment (Linux account, home directory, OpenCode binary, Fluent skill files, auth.json) and writes the API key securely. No SSH or terminal access required. Fluent learning skills (Learn, Review, Vocab, Writing, Speaking, Reading, Progress) run inside separate home directories per user — complete session, credential, and progress isolation. TTS playback (el-GR, double-speak) via WebSocket, STT voice input as keyboard replacement. Per-user Linux accounts provisioned automatically on first API key configuration. One session at a time per user, skill switching kills existing session, resume within same skill only | Planned |
| V5 | Recipes | Recipe CRUD (name, type, structured steps, ingredients with quantities, servings, prep/cook time, cost, image), static recipe types (meal, main, side, soup, dessert, other — shared with meal plan), import from URL (LLM parsing), YouTube (transcript via Data API + LLM extraction), photo OCR (camera + LLM structuring), manual entry, user-defined categories and tags, browse by type with filters (categories, tags, ingredients, total/prep/cook time), servings scaling with auto-calculated ingredient quantities, meal plan integration (link multiple recipes per meal slot, free-text fallback, per-recipe servings override), shopping list generation from weekly plan (review screen with checkboxes, checked items merge deduplicated into shopping list), share recipe as PDF via Android share sheet | Planned |
| V6 | Finances | Budgets, envelopes, expense tracking | Planned |
| V7 | Maid | Hours logging, billing, payment register, PDF payslips, maid salary as household expense | Planned |
| V8+ | Intelligence | AI features, push notifications, Google Drive/Calendar, child accounts | Vision |

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

### Journey 3: Filipe — First-Time Setup (Admin Operations, V1)

Filipe installs the APK, signs in with Google. App is empty.

**Step 1 — Create Profiles.** Settings → Profiles → Add. He creates four profiles: Filipe (linked to his Google account), Angela (no account yet), Aurora (no account), Isabel (no account). Each has a name and avatar. Profiles exist independently of accounts — Aurora and Isabel are full family members in the data model from day one.

**Step 2 — Add Angela.** Settings → Users → Add. He enters Angela's Google email, assigns Admin role. She installs the APK, signs in, her account automatically links to her Profile. She sees everything Filipe sees.

**Capabilities revealed:** profile CRUD (name + avatar, decoupled from accounts), account-to-profile linking on first sign-in, admin user addition.

---

### Journey 4: Filipe — Configuring Categories, Tags, and Templates (Setup & Configuration)

Before planning the first vacation, Filipe sets up the app's vocabulary.

**Categories:** Settings → Packing Categories. No defaults. He creates: Essentials, Clothes, Toiletries, Documents, Kids, Electronics, Beach. Each gets an icon.

**Tags:** He creates tags for cross-cutting concerns: Fragile, Buy Before Trip, Hand Luggage Only, Shared Item. Zero or multiple tags per item.

**Templates:** He creates "Beach Family" — Sunscreen (qty: 3, assigned to family), Swimwear (per person), Beach Towels (qty: 4), Sand Toys (assigned to Aurora + Isabel). Tagged "Beach", "Summer". He creates "Essential Documents" — Passports (check-documents item type), Health Insurance Cards, EHIC Cards. Tagged "All Trips".

When creating the Algarve vacation, he selects both templates. Items are merged, deduplicated, filtered by participants, and injected into the packing list as the starting point.

**Capabilities revealed:** user-defined categories (name + icon, no defaults), user-defined tags, template CRUD (items with profile + category + quantity + tags), template tagging, participant-filtered template application at trip creation.

---

### Journey 5: Filipe — Managing Leftovers (Daily Fridge Loop, V1)

It's Sunday evening. Filipe made lasagna — enough for the family plus leftovers. He opens FamilyHub, taps the Leftovers module, and adds: "Lasagna — 4 doses — 5 days". The item appears in the list immediately.

Monday. Angela cooked coq au vin. She adds: "Coq au vin — 3 doses — 4 days" (she overrides the default 5-day expiry because it has cream).

Tuesday morning. Filipe checks the dashboard. The Leftovers widget reads: **2 meals · 7 doses — Coq au vin expires Thursday**. He taps the widget, sees the full list. He reheated lasagna last night — taps "Eaten" twice on the lasagna row. Remaining: 2 doses.

Thursday. The dashboard widget now shows the coq au vin highlighted in red — it expires today. Filipe opens the list. The coq au vin sits at the top, visually flagged. Nobody wants it. He taps "Throw out" — all 3 remaining doses are discarded at once. The item closes and moves below the active section.

Friday. The lasagna still has 2 doses left, expiring Sunday. The widget reads: **1 meal · 2 doses — Lasagna expires Sunday**. Filipe eats one dose Friday, one Saturday. Two taps across two days. The lasagna closes naturally — all doses eaten, zero waste.

Scrolling down in the full list, Filipe can see the closed items: lasagna (4 eaten, 0 thrown), coq au vin (0 eaten, 3 thrown). A quiet record of what got used and what didn't.

**Capabilities revealed:** leftover CRUD with name/doses/expiry override, dashboard widget (meal count + dose count + nearest expiry), dose-level eaten tracking (one tap per dose), bulk throw-out of remaining doses, automatic close on zero remaining, expired item visual flagging, full list with active-first sorting by expiry, closed items visible with history, infinite scroll pagination.

---

### Journey 6: Filipe — Adding Items from the Kitchen (Alexa Voice Input, V2)

It's Wednesday evening. Filipe is cooking dinner and reaches for olive oil — nearly empty. Without touching his phone, he says: *"Alexa, tell FamilyHub to add olive oil."* The Alexa Skill sends "olive oil" to FamilyHub's backend. The system checks the shopping list — olive oil exists but is ticked (shopped last week). The system unticks it. No LLM call needed.

Still cooking. He realises there's no coriander left. *"Alexa, tell FamilyHub to add coriander."* Coriander has never been on the list before. The system calls a cheap LLM with the item name and the category list. The LLM returns "Vegetables". Coriander appears in the shopping list under Vegetables, unticked.

Angela walks in: "We need diapers." Filipe: *"Alexa, tell FamilyHub to add diapers."* Diapers exist, ticked. Unticked. Done. Three items added in 30 seconds, hands never left the stove.

Later, Filipe opens the app to check. The dashboard widget reads: **12 items**. He taps through to the full list. Items are grouped by category — Dairy (3), Vegetables (2), Cleaning (1), Baby (1), etc. He notices the LLM classified "coriander" under Vegetables — correct. Last week it classified "toilet paper" under Hygiene, but he'd prefer it under Cleaning. He taps the item, reclassifies it. The system remembers: toilet paper is Cleaning from now on.

He also notices "azeite" and "olive oil" both on the list — Alexa sometimes captures items in Portuguese, sometimes English. He deletes the duplicate manually. The system has no automatic cross-language dedup — that's a known limitation he accepts.

*"Alexa, do I have milk on the FamilyHub list?"* — "Yes, milk is on your list." — *"Alexa, set the quantity of milk to 3 packs."* — Quantity updated. It's a free-text note attached to the item, not a structured number.

**Capabilities revealed:** Alexa Skill integration (add, remove, query, set quantity), AI categorization via cheap LLM for unknown items, automatic untick for known items, category memory (reclassification persists), free-text quantity field, dashboard widget (open item count).

---

### Journey 7: Angela — Saturday Supermarket Run (Shopping at the Store, V2)

Saturday morning. Angela grabs her phone and heads to Continente. She opens FamilyHub, taps the Shopping widget. **14 items** unticked.

The list is grouped by category. She starts in Fruit & Vegetables — sees bananas, coriander, tomatoes. She ticks each as she drops them in the cart. On Filipe's phone at home, the items tick in real-time.

She reaches Dairy — milk (3 packs), butter, yoghurts. She ticks all three. Moves to Meat — chicken breast. Ticked. Cleaning — trash bags, laundry detergent. Ticked.

Two items she can't find at Continente: a specific brand of cereal and a particular cleaning product. She leaves them unticked. They'll carry over — she'll get them at Auchan next week.

She finishes shopping: 12 items ticked, 2 remaining. The dashboard widget now reads: **2 items**. The list is never "completed" or "archived" — it's always alive. Ticked items stay visible (greyed out) below unticked ones so she can see what was already bought.

Back home, Filipe checks the app. He sees what Angela bought, what's still pending. No coordination needed — the list is the single source of truth.

**Capabilities revealed:** living list (no lifecycle/status), category-grouped display, real-time sync between admins at supermarket, ticked items visible but greyed, unticked items carry over indefinitely, dashboard widget shows open count only.

---

### Journey 8: Filipe — Planning the Week's Meals (Meal Plan, V3)

It's Sunday afternoon. Filipe opens FamilyHub and taps the Meal Plan widget. It reads: **"No meals planned for next week."** He taps through to the weekly view.

The week grid shows Monday through Sunday, two rows: Lunch and Dinner. Some slots are greyed out — Thursday lunch is marked "don't plan" (everyone eats at work/school). Weekend lunches and all dinners show the default participants: Filipe, Angela, Aurora. Weekday lunches show Filipe and Angela only. Isabel is too young to be in the defaults.

Filipe starts filling in the week. Monday dinner: "Grilled chicken with rice". Tuesday dinner: "Lasagna". He taps Wednesday dinner, selects meal type **Leftovers**, and links it to Tuesday's lasagna. The slot shows "Leftovers — Lasagna" with a visual link indicator.

Thursday dinner: he selects **Eating out** and types "Cervejaria Ramiro". Friday dinner: "Fish and chips". Saturday lunch: **Takeaway** — "Sushi from Noori". Saturday dinner: "Steak". Sunday lunch: "Roast lamb". Sunday dinner: he leaves empty for now.

For Monday lunch, he and Angela are both working from home. He types "Salads". Wednesday lunch — it's a public holiday. The slot is normally skipped (weekday lunch, they usually eat separately), but Filipe taps it to **enable** it for this week. He types "Grilled sardines" and the default participants (Filipe + Angela) appear. He adds Aurora — she'll be home too.

For Saturday dinner, Aurora is sleeping at a friend's house. Filipe taps the participants and removes Aurora from that meal. The steak is now for two.

The week is mostly planned. The dashboard widget now reads: **"Next: Monday Lunch — Salads (Filipe, Angela)"**.

Tuesday evening. Filipe made lasagna but the family ate more than expected — only 1 dose left instead of the planned 2 dinners' worth. He opens the meal plan, removes Wednesday dinner's leftovers link, and replaces it with "Pasta carbonara". Quick adjustment, plan stays current.

Thursday. Angela checks the dashboard at 5pm. Widget reads: **"Next: Dinner — Cervejaria Ramiro (Filipe, Angela, Aurora)"**. She knows exactly where the family is eating tonight.

The following Sunday, Filipe hasn't opened the meal plan yet. The widget reads: **"No meals planned for next week"** — a gentle nudge to plan ahead.

**Capabilities revealed:** 7-day week grid (lunch + dinner), configurable default participants per slot, meal types (home-cooked, eating out, takeaway, leftovers), leftovers linking to previous meals, optional detail for eating out/takeaway, per-meal participant override (add/remove), enable a normally-skipped slot, disable a normally-enabled slot, multi-week navigation (current, next, past, future), dashboard widget (next meal + planning reminder), real-time sync between admins.

---

### Journey 9: Filipe & Angela — Greek Learning with Voice (Language Learning, V4)

Filipe opens FamilyHub and taps the Language Learning module for the first time. The app checks Supabase for his learning profile — none exists. The app connects to the Pi's session service via Cloudflare Tunnel (`https://api.fh-morais.party`) — no VPN required. The connection status shows green.

Since no API key is configured for Filipe yet, the app shows the setup screen instead of the skill menu. The screen explains: "To use Language Learning, you need an OpenCode Zen or Go API key. This key is stored securely on the Pi and used only for your learning sessions." Filipe taps "I have an API key" and pastes his OpenCode Zen key. The app sends the key to the session service via HTTPS (`POST /auth/configure`), which validates the key, writes it to Filipe's `~/.local/share/opencode/auth.json`, and provisions his isolated environment: creates a Linux user, sets up a home directory with OpenCode and Fluent skill files, and allocates an isolated data directory. The app creates a learning profile in Supabase with `api_key_configured = true` and navigates Filipe to the skill selection screen.

Filipe taps Learn. The app calls `POST /session/start?userId=filipe&skill=learn`.

The session service spins up an OpenCode process under Filipe's home directory with the Fluent Learn skill. The terminal output streams to Filipe's phone via WebSocket (`wss://ws.fh-morais.party`). Filipe sees the lesson begin immediately.

OpenCode (running the Fluent Learn skill) presents an exercise and calls the session service's `/speak` endpoint with `userId=filipe` and phrases `["Καλημέρα", "Με λένε"]`. The phone receives the phrases via WebSocket. It speaks "Καλημέρα", pauses, speaks "Καλημέρα" again, pauses, then speaks "Με λένε", pauses, speaks "Με λίνε" again. Filipe reads the exercise on the terminal, hears the new vocabulary twice each on his phone.

He types his answer in the terminal. The Fluent skill evaluates it — incorrect. It prints the correction and calls `/speak` with the correct answer. The phone speaks "Με λίνε Φίλιππε" twice. Filipe tries again, this time correctly. The correct answer is spoken twice regardless of whether he got it right or wrong.

Next exercise. Instead of typing, Filipe taps the mic button on his phone. He speaks his answer in Greek. Android's speech-to-text transcribes it and the app sends the transcript as a text message via WebSocket — no enter key needed. The Fluent skill receives plain text and evaluates it exactly as if Filipe had typed it. The skill is unaware of which input method was used.

Mid-lesson, Filipe decides he wants vocabulary drills. He navigates to the skill menu and taps Vocab. The app calls `POST /session/start?userId=filipe&skill=vocab`. The session service ends the existing Learn session and starts a fresh OpenCode process with the Fluent Vocab skill. Switching skills always starts fresh.

After fifteen minutes of flashcards, the Fluent skill sends a "skill complete" signal. The app closes the session and returns Filipe to the skill selection screen.

The next evening, Angela opens Language Learning. No learning profile exists for her either. She sees the same setup screen — "Configure your OpenCode API key." Angela enters her own OpenCode Go key (each user has their own key, enabling per-user cost tracking in the OpenCode dashboard). The session service provisions her isolated environment — separate Linux user, separate home directory, separate auth.json. Her API key, session history, and progress are completely isolated from Filipe's. The app creates her learning profile with `api_key_configured = true` and navigates to the skill menu.

Angela taps Learn. Her session is completely isolated — separate home directory, separate Fluent progress files (md-based skill tracking), separate OpenCode history. The terminal is visible but Angela focuses on the audio. The Fluent skill calls `/speak` with `userId=angela` and the phrase "Γεια σου". She hears it twice. She taps the mic, speaks her answer, the transcript goes to the terminal via WebSocket. For Angela, the mic is how she interacts — she rarely touches the keyboard.

The next morning, Filipe opens the app on the bus. `GET /session/status?userId=filipe` returns an active session for Learn from last night — he closed the app mid-lesson. Learn is highlighted with a "Resume" badge. He taps Learn and sees "Resume" or "New Session". He taps Resume — `POST /session/resume?userId=filipe`. The OpenCode session reconnects, WebSocket re-established. He picks up mid-lesson through his earbuds. If he'd selected a different skill, the old session would have been ended.

**Capabilities revealed:** First-use API key setup gate (OpenCode Zen/Go key submitted in-app, validated by session service, written securely to per-user auth.json, no SSH or terminal access required), containerised session service (Podman) over HTTPS via Cloudflare Tunnel (no VPN, no public IP, always-on), automatic per-user Linux provisioning on first API key configuration (separate home directory, isolated Fluent progress files, separate OpenCode history, per-user auth.json), per-user API keys enabling cost tracking per user in the OpenCode dashboard, per-user WebSocket routing via Cloudflare (`wss://ws.fh-morais.party?userId=...`, zero cross-talk), terminal display of OpenCode session output, Fluent skill selection screen available after API key configuration (Learn, Review, Vocab, Writing, Speaking, Reading, Progress), one session at a time per user (switching kills existing), resume only within same skill, session persistence (survives app close), TTS playback via WebSocket (el-GR, each phrase spoken twice with pause, multiple phrases in sequence, timing matches Fluent speak-greek timing), mic button as keyboard replacement (STT transcript sent as WebSocket text message, no enter key, Fluent skill unaware of input method), speak command triggered by Fluent skill after presenting exercises and after evaluating answers (correct answer always spoken), connection status visibility, configurable dev/prod deployment (Podman + env vars).

---

### Journey 10: Filipe — Building a Recipe Collection and Cooking from the Plan (Recipes, V5)

It's Sunday afternoon. Filipe has been using the meal plan for a few weeks — free-text entries like "Grilled chicken with rice" and "Lasagna". It works, but he keeps forgetting quantities and steps mid-cook. He opens the Recipes module for the first time.

**Importing from a URL.** He found a bacalhau à Brás recipe on a Portuguese cooking blog last week. He taps "Add Recipe", selects "Import from URL", pastes the link. The system fetches the page, sends the HTML to an LLM, and extracts: name, ingredients with quantities, structured steps, servings (4), prep time (20 min), cook time (25 min). Filipe reviews the extracted recipe — the LLM missed the salt quantity. He edits the ingredient row, adds "q.b." as quantity. He sets the type to **Meal**, assigns categories "Portuguese" and "Fish", tags "Quick" and "Family Favourite", and saves. The recipe appears in his collection with the blog's image auto-extracted.

**Importing from YouTube.** Angela sent him a YouTube link — a Greek moussaka tutorial. He taps "Import from URL", pastes the YouTube link. The system pulls the video transcript via YouTube Data API, sends it to the LLM, and extracts the recipe. The transcript is chatty — the cook rambles about her grandmother — but the LLM isolates the recipe cleanly: ingredients, steps, times. Filipe reviews, adjusts the servings from 6 to 4, sets type to **Meal**, categories "Greek", tags "Weekend Project". Saved.

**Manual entry.** His mother's canja (chicken soup) has no URL — it's a family recipe. He taps "Add Recipe", selects "Manual Entry". He fills in: name "Canja da Mãe", type **Soup**, servings 6, prep time 15 min, cook time 45 min, cost €5. He adds ingredients one by one: chicken thighs (500g), rice (150g), carrot (2), onion (1), lemon (1), salt (q.b.), water (2L). Then the steps — step 1: boil chicken with carrot and onion for 30 min. Step 2: shred chicken, discard bones. Step 3: add rice, cook 15 min. Step 4: squeeze lemon, season. Four clean steps. Categories "Portuguese" and "Soup", tags "Comfort Food". He takes a photo of his mother's handwritten recipe card — it saves as the recipe image. Saved.

**Photo OCR import.** Angela's colleague gave her a printed recipe for bolo de laranja (orange cake). Angela takes a photo of the paper. The app runs OCR on the image, extracts the text, sends it to the LLM for structuring. The LLM returns: name, ingredients, steps, servings. Angela reviews — the OCR misread "raspa" as "rasps". She corrects it to "raspa de laranja" (orange zest). Type: **Dessert**. Categories "Baking". Saved.

**Browsing recipes.** A week later, Filipe has 12 recipes in the collection. He opens Recipes and sees them grouped by type: 2 soups, 6 meals, 2 sides, 2 desserts. He taps **Meal** — sees all 6. He filters by category "Portuguese" — 3 results. He filters by tag "Quick" — 2 results. He clears filters, searches by ingredient "chicken" — 3 recipes that use chicken. He filters by total time under 30 minutes — 4 quick recipes.

**Scaling a recipe.** He taps the bacalhau à Brás (serves 4). His in-laws are visiting — 6 people eating. He adjusts servings to 6. All ingredient quantities recalculate: potatoes from 600g to 900g, eggs from 6 to 9, bacalhau from 400g to 600g. He reads the scaled recipe while cooking.

**Linking recipes to the meal plan.** Sunday evening — time to plan next week. He opens the meal plan. Monday dinner: he taps the slot, and now instead of just free text, he sees "Link Recipe" as the primary option. He taps it, the recipe browser opens filtered to **Meal** type. He selects bacalhau à Brás. The slot shows "Bacalhau à Brás" with a recipe link indicator. He adjusts servings for this meal to 4 (just the family). The slot shows: "Bacalhau à Brás (4 servings)".

Tuesday dinner: he wants a fuller meal. He links the canja (soup, 4 servings) and a green salad (side — he hasn't added this recipe yet, so he types "Green salad" as free text). The slot shows two entries: "Canja da Mãe (soup, 4 servings)" linked to a recipe, and "Green salad" as free text. Multiple items per meal — soup and a side.

Wednesday dinner: he doesn't have a recipe for what he wants to cook. He types "Improvised stir-fry" as free text. No recipe linked — the free-text fallback works exactly as before.

Thursday dinner: eating out — unchanged from V3 behaviour.

Friday dinner: Angela links the moussaka (meal, 4 servings) and the bolo de laranja (dessert, 4 servings). A full meal: main and dessert, both from recipes.

**Generating the shopping list.** The week is planned. Filipe taps "Generate Shopping List" in the meal plan. The system scans all linked recipes for the week, scales each recipe's ingredients to the specified servings, and produces a consolidated ingredient list. A review screen appears:

| Ingredient | Quantity (total) | ☐ |
|---|---|---|
| Chicken thighs | 500g | ☐ |
| Bacalhau | 400g | ☐ |
| Potatoes | 600g | ☐ |
| Eggs | 6 | ☐ |
| Rice | 150g | ☐ |
| Onion | 3 | ☐ |
| Carrot | 2 | ☐ |
| Lemon | 1 | ☐ |
| Aubergine | 3 | ☐ |
| Minced lamb | 500g | ☐ |
| Flour | 200g | ☐ |
| Orange | 4 | ☐ |
| Sugar | 200g | ☐ |
| ... | ... | ... |

Quantities are summed where the same ingredient appears in multiple recipes (e.g., onion: 1 from canja + 2 from moussaka = 3). Filipe checks the items he needs — he already has rice, eggs, and sugar at home. He checks 18 of 24 items. Taps "Add to Shopping List". The 18 checked items merge into the existing shopping list — deduplicated against items already there. If "potatoes" already exists on the shopping list (ticked from last week), it gets unticked with the new quantity. If "onion" is already unticked, the quantity updates.

**Sharing a recipe.** Angela's sister asks for the moussaka recipe. Angela opens it, taps the share button. The app generates a PDF — recipe name, image, ingredients, steps, prep/cook time, servings — and opens the Android share sheet. She sends it via WhatsApp. Clean, formatted, no app required on the receiving end.

**Capabilities revealed:** Recipe CRUD (name, type, structured steps, ingredients with quantities, servings, prep time, cook time, cost, categories, tags, image), static recipe types (meal, main, side, soup, dessert, other), import from URL (HTML fetch + LLM extraction), import from YouTube (transcript via Data API + LLM extraction, fallback to comments), import via photo OCR (camera capture + OCR + LLM structuring), manual entry with structured steps and ingredient rows, user-defined categories and tags, browse by type (primary grouping), filter by categories/tags/ingredients/total time/prep time/cook time, search by ingredient, servings scaling with proportional ingredient recalculation, meal plan integration (link multiple recipes per meal slot, per-recipe servings override, free-text fallback), shopping list generation from weekly plan (ingredient aggregation with quantity summing across recipes, review screen with checkboxes, checked items merge deduplicated into shopping list with quantity updates), recipe sharing as PDF via Android share sheet, real-time sync between admins.

---

### Journey Requirements Summary

| Journey | Module | Capabilities Required |
|---|---|---|
| 1. Vacation planning | V1 Vacation | Vacation CRUD (image/location/dates/participants), lifecycle, pinning, tasks, document check + child tasks, template application with participant filter, packing list with quantities and six statuses |
| 2. Collaborative packing | V1 Vacation | Real-time sync, profile filtering, multi-admin item management |
| 3. First-time setup | V1 Cross-cutting | Profile CRUD, account-to-profile linking, admin user management |
| 4. Configuration | V1 Cross-cutting | User-defined categories + tags, template CRUD, template tagging |
| 5. Leftovers (V1) | V1 Leftovers | Leftover CRUD (name/doses/expiry), eaten counter (per dose), throw out (bulk remaining), auto-close, expiry flagging, dashboard widget (meals + doses + nearest expiry), full list with active/closed sorting, infinite scroll |
| 6. Alexa voice input (V2) | V2 Shopping | Alexa Skill (add/remove/query/set quantity), AI categorization (cheap LLM) for unknown items, untick for known items, category reclassification, free-text quantity |
| 7. Supermarket shopping (V2) | V2 Shopping | Living list (tick/untick, no lifecycle), category-grouped display, real-time sync, ticked items greyed, carry-over, dashboard widget (open item count) |
| 8. Weekly meal planning (V3) | V3 Meal Plan | 7-day week grid (lunch + dinner), configurable default participants, meal types (home-cooked, eating out, takeaway, leftovers), leftovers linking, participant overrides, slot skip/enable overrides, dashboard widget (next meal + planning reminder), real-time sync |
| 9. Greek learning with voice (V4) | V4 Language Learning | First-use API key setup gate (OpenCode Zen/Go key submitted in-app, validated by session service, written to per-user auth.json over HTTPS, no SSH or terminal access required), containerised session service (Podman) over HTTPS via Cloudflare Tunnel (start/resume/end/status with skill parameter), per-user WebSocket routing via Cloudflare, terminal display, Fluent skill selection (Learn/Review/Vocab/Writing/Speaking/Reading/Progress) available after API key configuration, one session at a time, resume within same skill, session persistence (survives app close), automatic per-user Linux provisioning on first API key configuration (separate home directory, isolated Fluent progress md files, separate OpenCode history, per-user auth.json), per-user API keys enabling cost tracking per user in OpenCode dashboard, TTS double-speak (el-GR) via /speak endpoint, mic as keyboard replacement (STT → WebSocket text message), speak command on exercises and answers, connection status visibility, configurable dev/prod deployment (Podman + env vars) |
| 10. Recipe collection & meal plan cooking (V5) | V5 Recipes | Recipe CRUD (name, type, steps, ingredients+quantities, servings, prep/cook time, cost, categories, tags, image), static types (meal/main/side/soup/dessert/other), import from URL (LLM parsing), YouTube import (transcript + LLM), photo OCR import (camera + OCR + LLM), manual entry (structured steps + ingredient rows), user-defined categories + tags, browse by type, filter (categories/tags/ingredients/time), ingredient search, servings scaling (proportional ingredient recalc), meal plan integration (multiple recipes per slot, per-recipe servings, free-text fallback), shopping list generation (ingredient aggregation, quantity summing, review screen with checkboxes, dedup merge into shopping list), PDF share via Android share sheet |

---

## Domain-Specific Requirements

### Data Privacy Between Users (V6+)

FamilyHub enforces intra-household privacy boundaries as first-class data model constraints — not UI-layer restrictions:

- **Private spending envelopes (V6):** Each admin's personal budget category is a data black box to the other admin. The dashboard shows "Personal — Filipe: 80% spent" without line items. Neither spouse can read the other's personal transactions. Enforced at the data model level, not the display layer.
- **Maid billing isolation (V7):** Each maid account sees only her own billing history. Historical records from prior maids are visible only to admins, isolated by account period. A new maid cannot access any prior maid's data.
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
| Flutter | Dart type safety, high performance, single codebase | Larger APK size, Dart learning curve if unfamiliar |
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
| `CAMERA` | V2+ (optional) | Profile photo capture |
| `RECORD_AUDIO` | V4 | Speech-to-text voice input for language learning exercises (mic as keyboard replacement) |
| `CAMERA` (extended) | V5 | Recipe photo OCR (capture printed/handwritten recipes for LLM-based extraction) |
| `CAMERA` (extended) | V8+ | Receipt OCR |
| `POST_NOTIFICATIONS` | V8+ | Push notification delivery |

V1 requires only `INTERNET` — minimal permission surface.

### Push Notification Strategy

Push notifications are explicitly **out of scope for V1–V7**.

- V1–V7: In-app alerts only (e.g., leftover expiry banners in V1, booking task urgency indicators in V1 dashboard widget)
- V8+: Background jobs and push notifications added as a dedicated platform capability once core modules are stable
- No notification permission requested until V8+

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

**Version Gate:** Each module version ships when the previous module is in active family use. V1 (Vacation & Leftovers) passed its gate — both modules are in willing daily use by both admins. V2 (Shopping) is next. Same gate applies at every version boundary.

### Phase 1 — V1: Vacation & Leftovers (Shipped)

**Status:** ✅ Shipped and in active family use.

**Core User Journeys Supported:** All five V1 journeys — vacation planning, collaborative packing, first-time setup, configuration, leftovers management.

**Shipped Capabilities:**

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
- Leftover CRUD with name, doses, configurable expiry (default 5 days)
- Dose-level eaten tracking, bulk throw-out, auto-close on zero remaining
- Leftovers dashboard widget (meal count + dose count + nearest expiry)
- Full leftovers list with active/closed sorting and infinite scroll
- Expired item visual flagging
- Real-time sync between admins
- Private APK distribution with OTA update check

### Phase 2 — V2: Shopping

**V2 — Shopping:** Living shared shopping list with Alexa Skill as the primary voice input channel. Items added via Alexa are auto-categorized by a cheap LLM (unknown items) or unticked (known items). The list has no lifecycle — items are ticked (shopped) or unticked (needed), carrying over indefinitely. Category-grouped display in-app. Real-time sync between admins at the supermarket. Dashboard widget shows open item count. Admin can reclassify items and manage categories. Addresses the second household pain (supermarket memory test).

**New infrastructure:** Supabase Edge Function (Alexa Skill backend), LLM API integration (AI categorization). Both within free/negligible cost tier at family scale.

**Deferred from V2:** Maid access, multiple lists, in-app voice input (nice-to-have only), cross-language deduplication.

### Phase 3 — V3–V6: Household Operations

**V3 — Meal Plan:** 7-day week grid with lunch and dinner slots. Configurable default participants per slot (which profiles eat at which day+meal). Slots can be marked "don't plan" by default (e.g., Thursday lunch — everyone eats at work). Four meal types: home-cooked (free text), eating out (with optional restaurant detail), takeaway (with optional order detail), leftovers (linked to a previous home-cooked meal in the plan). Per-meal participant overrides — add/remove profiles, enable skipped slots (public holidays), disable active slots (change of plans). Dashboard widget shows next upcoming meal; warns if no meal set or if next week is unplanned. Foundation for recipe-driven shopping list generation in V4.

**V4 — Language Learning (Greek):** Greek learning via OpenCode running on a Raspberry Pi, bridged to the mobile app via Cloudflare Tunnel over HTTPS and WSS (no VPN required on the phone — the tunnel is always-on). A containerised session service (Podman) manages session lifecycle (start/resume/end/status) via HTTP. On first use, each admin enters their OpenCode Zen/Go API key through an in-app setup screen; the session service validates the key, writes it to the user's per-user auth.json on the Pi, and provisions their isolated environment (Linux account, home directory, OpenCode installation, Fluent skill files, isolated data directory) — no SSH, no terminal, no manual Pi access required. OpenCode runs Fluent learning skills (Learn, Review, Vocab, Writing, Speaking, Reading, Progress) inside separate home directories per user — complete session, API key, and progress isolation. Fluent tracks learning progress in per-user md files. The session service calls a /speak endpoint to send Greek text to the phone via WebSocket; the phone speaks each phrase aloud twice via TTS (el-GR). Users interact via the terminal — typing answers on the keyboard or tapping a mic button on the phone (STT transcribes speech and sends it as a WebSocket text message; OpenCode is unaware of input method). Per-user API keys enable cost tracking per user in the OpenCode dashboard. The containerised service runs in Podman for both dev (this machine) and prod (Pi), configurable via environment variables. No dependency on V3 Meal Plan.

**V5 — Recipes:** Full recipe management with multi-source import and meal plan integration. Recipes are structured: name, type (meal/main/side/soup/dessert/other — static enum shared with meal plan), ingredients with quantities, step-by-step instructions, servings, prep time, cook time, cost, image, user-defined categories and tags. Four import paths: URL scraping (fetch page HTML, LLM extracts recipe), YouTube (pull transcript via YouTube Data API, LLM extracts recipe — falls back to comments if transcript has no recipe content), photo OCR (camera capture, OCR text extraction, LLM structures into recipe fields), and manual entry (full form with structured steps and ingredient rows). Browse by type as primary grouping; filter by categories, tags, ingredients, total time, prep time, cook time. Servings scaling recalculates ingredient quantities proportionally — available when browsing and when linking to a meal plan slot. Meal plan integration enhances V3: each meal slot supports multiple linked recipes (e.g., soup + main + side + dessert), with per-recipe servings override and free-text fallback for meals without a recipe. Shopping list generation: a button in the meal plan scans all linked recipes for the week, scales ingredients to specified servings, sums quantities across recipes for shared ingredients, and presents a review screen with checkboxes — checked items merge into the existing shopping list (deduplicated, quantities updated). Share any recipe as a formatted PDF via Android share sheet. Requires V3 Meal Plan as prerequisite.

**New infrastructure:** LLM API integration (recipe extraction from HTML, YouTube transcripts, and OCR text — reuses V2 LLM provider via repository pattern), YouTube Data API (transcript retrieval), OCR library (on-device text extraction from photos), PDF generation (on-device). All within free/negligible cost tier at family scale.

**V6 — Finances:** Budgets, expense tracking, private spending envelopes per admin (RLS-enforced).

**V7 — Maid:** Hours logging, billing, payment register, PDF payslips. Maid salary auto-posts as a household expense (integrates with V6 Finances).

### Vision — V8+: Intelligence Layer

AI features (receipt OCR, recipe URL/video/photo import), push notifications, background jobs, Google Drive vault, Google Calendar deadline sync. Child accounts (Aurora, Isabel) also deferred here.

### Risk Mitigation Strategy

**Technical Risks:**
- *Framework decision is a V1 blocker.* ✅ Resolved — Expo selected, V1 shipped.
- *Alexa Skill certification (V2).* Mitigation: Alexa Skills for personal/household use can be deployed without public certification. If Amazon changes policy, the Skill can be replaced with a webhook-based alternative.
- *LLM API dependency (V2).* Mitigation: categorization failure falls back to "Other" category — LLM unavailability never blocks item creation. LLM provider is swappable via repository pattern.
- *Alexa voice recognition quality (V2).* Known limitation — Alexa may misinterpret items or mix languages (Portuguese/English). No automated cross-language dedup. Users correct manually. Accepted trade-off for hands-free convenience.

**Adoption Risks:**
- *Angela doesn't adopt V1.* ✅ Mitigated — Angela is actively using both Vacation and Leftovers modules. V1 gate passed.
- *Any module becomes a chore.* Mitigation: module-per-version strategy means each release is a complete, useful unit. If a module fails, it's isolated — it doesn't block others.

**Resource Risks:**
- *Scope creep (solo developer).* Mitigation: strict version gates. Nothing from V3+ is added to V2, even if implementation seems easy. The gate is behavioural, not feature-based.
- *Cloudflare Tunnel dependency (V4).* Language learning requires the phone to reach the Pi via Cloudflare Tunnel (https://api.fh-morais.party and wss://ws.fh-morais.party). If Cloudflare or the tunnel is down, the module is unusable. Mitigation: Cloudflare Tunnel is highly reliable for personal use (free tier). The tunnel is always-on — no VPN toggle required on the phone. Pi runs headless with Podman auto-restart. App shows clear connection status so the user knows immediately if the service is unreachable.
- *Greek TTS quality (V4).* expo-speech el-GR voice quality varies by Android device and OS version. Some devices may lack a Greek TTS voice entirely. Mitigation: test on both admins' devices before shipping. Fallback: install Google TTS engine (free) which includes high-quality Greek voices.
- *Pi availability (V4).* Raspberry Pi must be powered on and running the containerised session service (Podman). Power outage or SD card failure kills all sessions. Mitigation: Podman restarts the container automatically on boot. OpenCode sessions can be resumed after restart. SD card backup strategy recommended. Dev testing on this machine via Podman provides a fast feedback loop before deploying to Pi.
- *Per-user provisioning (V4).* First-time users must have their Linux account, home directory, OpenCode installation, Fluent skill files, and API key configured on the Pi. Mitigation: the session service provisions accounts automatically when the user submits their OpenCode Zen/Go API key through the app — no SSH, no terminal, no manual Pi access required. The key is written to the user's per-user auth.json and the environment is provisioned in one step.
- *API key management (V4).* Each user's OpenCode Zen/Go API key is stored on the Pi in their per-user auth.json. If a key is revoked or expires, the user must re-enter it in the app. Mitigation: the app detects an invalid key (session service validation on configuration) and prompts for re-entry. Per-user keys enable cost tracking per user in the OpenCode dashboard. If a user loses access to their OpenCode account, they generate a new key and re-configure — no data loss occurs (progress is stored in per-user md files on the Pi, not in the LLM provider account).
- *V4/V5 independence.* V4 Language Learning has no dependency on V3 Meal Plan — unlike the previous V4 Recipes. V5 Recipes still depends on V3.
- *URL scraping fragility (V5).* Recipe websites change their HTML structure without notice — LLM extraction may fail or produce incomplete results. Mitigation: LLM-based extraction is inherently adaptive (no hard-coded selectors). Failed extraction presents an error; the admin can retry or fall back to manual entry. No recipe is saved without admin review.
- *YouTube transcript availability (V5).* Not all YouTube videos have transcripts — auto-generated captions may be absent or inaccurate, especially for non-English content. Mitigation: fallback to video comments. If neither yields a recipe, the system reports extraction failure clearly. Admin can fall back to manual entry.
- *OCR accuracy (V5).* Handwritten recipes and low-quality photos may produce garbled OCR text, leading to poor LLM extraction. Mitigation: admin always reviews and edits extracted recipes before saving. The LLM structures whatever text it receives — partial extraction is better than none.
- *Ingredient deduplication complexity (V5).* Different recipes may name the same ingredient differently (e.g., "onion" vs "yellow onion" vs "cebola"). Shopping list generation sums by exact ingredient name match — no fuzzy matching or cross-language dedup. Mitigation: accepted limitation. Admin can manually merge items on the shopping list. Same trade-off as V2 Alexa cross-language dedup.
- *LLM cost scaling (V5).* Recipe imports use larger LLM prompts than V2 categorization (full HTML pages, transcripts). Mitigation: use cheapest capable model. Cost cap NFR37 (€2/month combined) monitored. At family scale, import volume is low (a few recipes per week).
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
- **FR15:** System supports two or more simultaneously pinned vacations

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

- **FR34:** Admin can view a home dashboard surfacing pinned vacation widgets, the Leftovers widget (V1), and module entry points
- **FR35:** Vacation widget displays the vacation name, participant count, and incomplete booking tasks sorted by next due date
- **FR36:** Admin can navigate from a dashboard widget to the full vacation detail view

### Data Sync & Updates

- **FR37:** System propagates data changes from one Admin to all other connected Admin devices in real-time
- **FR38:** System resolves concurrent Admin edit conflicts using last-write-wins without presenting conflict dialogs to the user
- **FR39:** System checks for a newer app version on launch and notifies the user non-blockingly if an update is available

### Data Privacy (V6+)

- **FR40:** System ensures that one Admin's private spending envelope transactions are never visible to any other user — enforced at the data layer, not the display layer (V6)
- **FR41:** System partitions Maid account data such that a new Maid account cannot access any prior Maid's records (V7)
- **FR42:** System enforces all privacy boundaries through database-level access control policies, not application-level filtering (V6+)

### Leftovers Management (V1)

- **FR43:** Admin can add a leftover item with a name, total doses, and expiry duration in days (default: 5 days, overridable at creation)
- **FR44:** System records the date added automatically and calculates the expiry date from date added + expiry duration
- **FR45:** Admin can tap "Eaten" on an active leftover item to increment the eaten dose counter by one
- **FR46:** Admin can tap "Throw out" on an active leftover item to discard all remaining doses at once, setting thrown-out doses to the remaining count
- **FR47:** System enforces that doses eaten + doses thrown out never exceeds total doses
- **FR48:** System closes a leftover item automatically when doses eaten + doses thrown out equals total doses
- **FR49:** Admin can edit an active leftover item's name, total doses, and expiry duration
- **FR50:** Admin can delete a leftover item
- **FR51:** System visually flags active leftover items that have passed their expiry date (highlighted/red)
- **FR52:** Dashboard displays a Leftovers widget showing: count of active items (meals), sum of remaining doses across active items, and the name and expiry date of the nearest-expiring active item
- **FR53:** Admin can navigate from the Leftovers dashboard widget to the full leftovers list
- **FR54:** Full leftovers list displays all items (active and closed), sorted by status (active first) then by expiry date (nearest first for active, most recent first for closed)
- **FR55:** Full leftovers list loads items progressively via infinite scroll

### Shopping Management (V2)

#### Shopping List Core

- **FR56:** The household has a single shared shopping list with no lifecycle or status — items are either unticked (needed) or ticked (shopped)
- **FR57:** Admin can add an item to the shopping list with a name and optional free-text quantity note
- **FR58:** Admin can tick an item to mark it as shopped or untick a previously ticked item to mark it as needed again
- **FR59:** Admin can edit any shopping item's name, category, and quantity note
- **FR60:** Admin can delete any shopping item from the list
- **FR61:** Shopping list displays items grouped by category, with unticked items above ticked items within each group
- **FR62:** Ticked items remain visible (greyed out) in the list — they are not hidden or archived
- **FR63:** System propagates shopping list changes from one Admin to all other connected Admin devices in real-time
- **FR64:** Dashboard displays a Shopping widget showing the count of unticked (open) items
- **FR65:** Admin can navigate from the Shopping dashboard widget to the full shopping list

#### AI Categorization

- **FR66:** When a new item is added that has never existed in the shopping list, the system auto-categorizes it using an AI classification service and assigns the returned category automatically
- **FR67:** When an item is added that already exists in the shopping list (ticked), the system unticks it without calling the LLM — the existing category is preserved
- **FR68:** Admin can reclassify any item to a different category; the system persists this reclassification as the item's permanent category for future additions
- **FR69:** Admin can create, edit, and delete shopping categories
- **FR70:** System ships with a default set of shopping categories: Dairy, Meat, Fish, Fruit, Vegetables, Bakery, Frozen, Pantry, Beverages, Snacks, Spices & Condiments, Eggs, Cleaning, Hygiene, Baby, Other
- **FR71:** If the LLM is unreachable, the item is added under the "Other" category — categorization failure never blocks item creation

#### Alexa Skill Integration

- **FR72:** A custom Alexa Skill allows users to add items to the FamilyHub shopping list by voice command (e.g., "Alexa, tell FamilyHub to add olive oil")
- **FR73:** The Alexa Skill supports removing items from the shopping list by voice (e.g., "Alexa, tell FamilyHub to remove olive oil")
- **FR74:** The Alexa Skill supports querying whether an item exists on the list (e.g., "Alexa, do I have milk on the FamilyHub list?")
- **FR75:** The Alexa Skill supports querying the last item added (e.g., "Alexa, what was the last item I added to FamilyHub?")
- **FR76:** The Alexa Skill supports setting a quantity note on an item (e.g., "Alexa, tell FamilyHub to set the quantity of milk to 3 packs")
- **FR77:** The Alexa Skill communicates with FamilyHub's backend via a dedicated API endpoint authenticated with a household-level API key
- **FR78:** If the Alexa Skill receives a duplicate item (already unticked on the list), it responds with a confirmation that the item is already on the list without creating a duplicate

#### Deduplication

- **FR79:** When an admin adds an item via the app that matches an existing ticked item (case-insensitive), the system prompts to untick the existing item rather than creating a duplicate
- **FR80:** When an admin adds an item that matches an existing unticked item, the system flags the duplicate and prevents creation

### Meal Plan Management (V3)

#### Meal Plan Configuration

- **FR81:** Admin can configure default participants per meal slot — assigning which family profiles eat at each day-of-week + meal combination (e.g., Filipe + Angela + Aurora for all dinners, Filipe + Angela for weekday lunches)
- **FR82:** Admin can mark any day-of-week + meal slot as "don't plan" by default (e.g., Thursday lunch — everyone eats at work/school)
- **FR83:** System applies the configured defaults automatically when a new meal plan week is created — pre-populating participant lists and skipping "don't plan" slots

#### Meal Plan Core

- **FR84:** Admin can view the meal plan for any week — current, past, or future — displayed as a 7-day grid with lunch and dinner rows
- **FR85:** Admin can navigate between weeks: previous, current, next, and jump to any specific week
- **FR86:** Admin can create a meal entry for any lunch or dinner slot with a free-text name (e.g., "Grilled chicken with rice")
- **FR87:** Admin can edit any existing meal entry's name, type, detail, or participants
- **FR88:** Admin can delete a meal entry from any slot
- **FR89:** Admin can set a meal type for each entry: home-cooked, eating out, takeaway, or leftovers
- **FR90:** For eating out or takeaway meals, admin can add an optional free-text detail (restaurant name, order description)
- **FR91:** System propagates meal plan changes from one Admin to all other connected Admin devices in real-time

#### Participant Management

- **FR92:** Admin can override the default participants for any specific meal — adding or removing profiles from that meal only, without changing the global defaults
- **FR93:** Admin can enable a normally-skipped slot for a specific week (e.g., a public holiday falls on a day normally marked "don't plan") — the slot becomes plannable with the default participants for that meal type
- **FR94:** Admin can disable a normally-enabled slot for a specific week (e.g., plans changed, family won't be eating that meal) — the slot is marked as skipped and any planned meal is removed

#### Leftovers Integration

- **FR95:** Admin can set a meal's type to "leftovers" and link it to a previous home-cooked meal in the same or a prior week's plan — the slot displays the linked meal's name with a visual indicator (e.g., "Leftovers — Lasagna")
- **FR96:** Admin can adjust the meal plan when leftover quantities don't match expectations — unlinking a leftovers entry and replacing it with a new meal, or converting a home-cooked meal to leftovers if surplus remains

#### Dashboard Widget

- **FR97:** Dashboard displays a Meal Plan widget showing the next upcoming meal's name, type, and participants
- **FR98:** If the next upcoming meal slot has no meal set and the slot is not marked as skipped, the widget displays a warning indicating no meal is planned
- **FR99:** If it is the last day of the current planned week (Sunday) and the following week has no meals planned, the widget displays a planning reminder

### Language Learning — Session Service (V4)

- **FR100:** App can start a new learning session on the Pi by calling the session service with a userId and skill parameter — the service starts an OpenCode process with the specified Fluent skill under the user's home directory and returns success (V4)
- **FR101:** App can resume an existing session for a user by calling the session service — the service reconnects to the OpenCode process and returns success (V4)
- **FR102:** App can end an active session by calling the session service — the service terminates the OpenCode process and returns success (V4)
- **FR103:** App can query session status for a user — the service returns whether an active session exists and which skill is running (V4)

### Language Learning — WebSocket & TTS (V4)

- **FR104:** App connects to the WebSocket server via Cloudflare Tunnel (`wss://ws.fh-morais.party`) with a userId parameter and receives only messages routed to that user — zero cross-talk between users (V4)
- **FR105:** When the app receives Greek text via WebSocket, it speaks each phrase aloud twice via TTS (el-GR) with a pause between repetitions; multiple phrases received in a single message are spoken in sequence (V4)
- **FR106:** App displays received Greek text on screen alongside TTS playback so the user can read while listening (V4)

### Language Learning — Voice Input (V4)

- **FR107:** App provides a mic button that captures spoken Greek via Android's built-in speech-to-text (el-GR locale), transcribes it, and sends the transcript as a WebSocket text message — no enter key required (V4)
- **FR108:** OpenCode receives voice-originated text input identically to keyboard-originated text input — the input method is invisible to the Fluent skill (V4)

### Language Learning — Skill System (V4)

- **FR109:** App presents a skill selection screen with available Fluent learning skills: Learn (default), Review, Vocab, Writing, Speaking, Reading, Progress — each starts a new session with the corresponding skill parameter (V4)
- **FR110:** Only one session per user is active at any time — selecting a different skill ends the existing session and starts a fresh one; resume is only offered within the same skill (V4)

### Language Learning — API Key Configuration (V4)

- **FR111:** When a user enters the Language Learning module and their learning profile does not have `api_key_configured` set to true, the app presents an API key setup screen — the user cannot access the skill menu or start a session until the key is configured (V4)
- **FR112:** App provides an input for the user to enter their OpenCode Zen/Go API key; on submission, the app sends the key to the session service over HTTPS (`POST /auth/configure?userId=X`), which validates the key by making a test API call, writes it to the user's `~/.local/share/opencode/auth.json` on the Pi, and provisions the user's isolated environment (Linux account, home directory, OpenCode installation, Fluent skill files, isolated data directory) — no SSH or terminal access required (V4)
- **FR113:** Once the API key is validated and the user's infrastructure is provisioned, the session service returns success; the app creates a learning profile in Supabase with `api_key_configured = true` and navigates the user to the skill selection screen (V4)

### Language Learning — User Isolation & Provisioning (V4)

- **FR114:** Each admin is a separate Linux user on the Pi with an isolated home directory containing their own OpenCode installation, Fluent skill files, and md-based progress tracking — one user's learning data, session history, and API key are never visible to another user (V4)
- **FR115:** App displays connection status to the session service — connected, disconnected, or reconnecting — so the user knows immediately if the service is unreachable (V4)
- **FR116:** When the Fluent skill sends a skill-complete signal via WebSocket, the app automatically calls the session end endpoint and returns the user to the skill selection screen (V4)

### Recipe Management (V5)

#### Recipe CRUD

- **FR117:** Admin can create a recipe with: name, type, ingredients (each with name and quantity), step-by-step instructions (ordered list of individual steps), servings, prep time (minutes), cook time (minutes), cost (manual entry), image, categories, and tags (V5)
- **FR118:** Admin can edit any recipe's fields — name, type, ingredients, steps, servings, times, cost, image, categories, tags (V5)
- **FR119:** Admin can delete a recipe (V5)
- **FR120:** Recipe type is a static enum shared with the meal plan: meal, main, side, soup, dessert, other — defined at development time, not user-configurable (V5)
- **FR121:** Admin can create, edit, and delete recipe categories — user-defined at runtime (V5)
- **FR122:** Admin can create, edit, and delete recipe tags — user-defined at runtime (V5)

#### Recipe Import — URL

- **FR123:** Admin can import a recipe by pasting a URL; the system fetches the page HTML and sends it to an LLM to extract recipe fields (name, ingredients with quantities, steps, servings, prep time, cook time, image URL) (V5)
- **FR124:** After LLM extraction, the system presents the extracted recipe for admin review and editing before saving — no recipe is saved without admin confirmation (V5)

#### Recipe Import — YouTube

- **FR125:** Admin can import a recipe by pasting a YouTube URL; the system retrieves the video transcript via YouTube Data API and sends it to an LLM to extract recipe fields (V5)
- **FR126:** If the transcript contains no extractable recipe content, the system retrieves the video's top-level comments and sends them to the LLM as a fallback source (V5)
- **FR127:** If neither transcript nor comments yield a recipe, the system informs the admin that extraction failed — no empty recipe is created (V5)

#### Recipe Import — Photo OCR

- **FR128:** Admin can import a recipe by capturing a photo (camera) or selecting an image from the gallery; the system runs OCR to extract text, then sends the text to an LLM to structure it into recipe fields (V5)
- **FR129:** After OCR + LLM structuring, the system presents the extracted recipe for admin review and editing before saving (V5)

#### Recipe Import — Manual Entry

- **FR130:** Admin can create a recipe via manual entry with a structured form: name, type, ingredients (add/remove/reorder rows, each with name and quantity), steps (add/remove/reorder, each a separate text input), servings, prep time, cook time, cost, image (camera capture or gallery selection), categories, tags (V5)

#### Recipe Browse & Search

- **FR131:** Recipe list displays recipes grouped by type as the primary browsing view (V5)
- **FR132:** Admin can filter recipes by: categories, tags, ingredients (text match against ingredient names), total time (prep + cook), prep time, cook time (V5)
- **FR133:** Admin can search recipes by ingredient — the system matches the search term against ingredient names across all recipes and returns matching recipes (V5)
- **FR134:** Filters are combinable — admin can apply multiple filters simultaneously (e.g., type "Soup" + category "Portuguese" + total time under 30 min) (V5)

#### Recipe Scaling

- **FR135:** Admin can adjust a recipe's servings when viewing it; all ingredient quantities recalculate proportionally based on the ratio of new servings to original servings (V5)
- **FR136:** Scaling is non-destructive — the original recipe retains its saved servings and quantities; scaling is applied as a view-time adjustment (V5)

#### Meal Plan Integration (V5 Enhancement on V3)

- **FR137:** Admin can link one or more recipes to a single meal plan slot — each linked recipe appears as a separate entry within the slot (e.g., a soup, a main, and a dessert in one dinner slot) (V5)
- **FR138:** Admin can set the servings for each linked recipe independently within a meal slot — ingredient scaling follows the specified servings (V5)
- **FR139:** Admin can add a free-text entry to a meal slot alongside or instead of linked recipes — free-text is the fallback when no recipe exists or the admin lacks time to create one (V5)
- **FR140:** Admin can remove a linked recipe from a meal slot without affecting the recipe itself (V5)
- **FR141:** When linking a recipe to a meal slot, the system opens the recipe browser filtered to the slot's meal type context — admin can browse and select from the full recipe collection (V5)

#### Shopping List Generation

- **FR142:** Admin can tap "Generate Shopping List" in the meal plan view; the system scans all linked recipes for the displayed week, scales each recipe's ingredients to the specified servings for that meal, and produces a consolidated ingredient list (V5)
- **FR143:** Shopping list generation sums quantities for the same ingredient across multiple recipes (e.g., onion: 1 from recipe A + 2 from recipe B = 3 onions) (V5)
- **FR144:** The system presents a review screen showing each ingredient, its total quantity, and a checkbox — all items are unchecked by default (V5)
- **FR145:** Admin checks the items they need and taps "Add to Shopping List"; only checked items are added (V5)
- **FR146:** Checked items merge into the existing shopping list deduplicated: if the ingredient already exists and is ticked (shopped), it is unticked with the new quantity; if already unticked, the quantity is updated; if not present, a new item is created (V5)
- **FR147:** Free-text meal entries (meals without linked recipes) are excluded from shopping list generation — only linked recipes contribute ingredients (V5)

#### Recipe Sharing

- **FR148:** Admin can share any recipe as a PDF; the system generates a formatted PDF on-device containing the recipe name, image, type, ingredients with quantities, steps, servings, prep time, cook time, and cost (V5)
- **FR149:** After PDF generation, the system opens the Android share sheet so the admin can send the PDF via any installed app (WhatsApp, email, etc.) (V5)

#### Recipe Sync

- **FR150:** System propagates recipe changes (create, edit, delete) from one Admin to all other connected Admin devices in real-time (V5)

### Future Module Capabilities (V6–V7)

- **FR151:** Admin can record household income and expenses against budget categories and envelopes (V6)
- **FR152:** Maid can log daily work hours with a single-tap interaction (V7)
- **FR153:** Admin can generate a billing statement and payslip for the Maid for any period (V7)
- **FR154:** Maid salary auto-posts as a household expense in the Finances module (V7)

---

## Non-Functional Requirements

### Performance

- **NFR1:** App launches to an interactive state within 2 seconds from cold start on supported Android devices
- **NFR2:** Packing item status changes reflect in the UI immediately (optimistic update), confirmed to backend within 3 seconds on a normal mobile connection
- **NFR3:** Real-time sync changes from one Admin reach all other connected Admin devices within 3 seconds
- **NFR4:** All list operations (add, edit, delete, filter) complete within 100ms on devices running Android 8.0+

### Security & Privacy

- **NFR5:** All data in transit is encrypted using TLS 1.2 or higher
- **NFR6:** All data at rest is encrypted by the backend provider's default encryption
- **NFR7:** Authentication is handled exclusively through Google Sign-In — no passwords are stored by FamilyHub
- **NFR8:** Session tokens are stored in secure, platform-provided credential storage — never in plaintext or shared storage
- **NFR9:** One Admin's private spending envelope transactions must not appear in any shared database query, API response, or sync payload — enforced at the database access control layer, not the application layer (V6)
- **NFR10:** A Maid user account must be incapable of reading any records belonging to a prior Maid account — enforced at the database access control layer (V7)
- **NFR11:** FamilyHub stores only the Google user ID and email from Google Sign-In — no additional personal data from Google is retained

### Reliability & Data Integrity

- **NFR12:** Last-write-wins conflict resolution must always produce a valid, readable data state — no record may be left in a corrupted or null state after sync
- **NFR13:** The app installs cleanly via APK sideload on Android 8.0 (API 26) and above without requiring non-standard device configuration beyond enabling "Install from unknown sources"
- **NFR14:** Backend free tier usage must not be exceeded at household scale (maximum ~5 concurrent users, low transaction volume)

### Integration

- **NFR15:** If Google Sign-In is unavailable at launch, a valid cached session is used without forcing re-authentication
- **NFR16:** An OTA update check failure is silent — it must not block app launch or display an error
- **NFR17:** Any external service (Supabase, Google Sign-In, Alexa Skill, LLM API, future Google Drive/Calendar) must be accessed exclusively through its repository interface module — business logic may not call external services directly
- **NFR18:** The Alexa Skill backend endpoint must respond to Alexa within 3 seconds to avoid Alexa timeout errors (V2)
- **NFR19:** AI categorization (LLM call) must complete within 2 seconds; if exceeded, the item is assigned to "Other" category and the user is not blocked (V2)
- **NFR20:** Alexa Skill endpoint must authenticate requests using a household-level API key — unauthenticated requests are rejected (V2)
- **NFR21:** LLM API costs for AI categorization must remain under €1/month at family-scale usage (V2)

### UX Principles

- **NFR22:** The app must not present an onboarding wizard or guided setup flow on first launch. All configuration (profiles, categories, tags, templates, user management) is performed through Settings at the user's own pace. The app is usable immediately after sign-in.
- **NFR23:** Leftover expiry date calculations and visual flagging must evaluate correctly using device-local time
- **NFR24:** Shopping list category reclassifications by an admin must persist permanently — the system must not re-categorize an item that has been manually reclassified (V2)
- **NFR25:** Meal plan week view must load and render the full 7-day grid within 500ms when navigating between weeks (V3)
- **NFR26:** Meal plan default configuration changes must apply to all future unedited weeks without requiring manual propagation (V3)

### Language Learning (V4)

- **NFR27:** Session service endpoints (start/resume/end/status) must respond within 5 seconds — session start includes OpenCode process creation and Fluent skill loading (V4)
- **NFR28:** Greek text received via WebSocket must begin TTS playback within 500ms of message arrival on the phone (V4)
- **NFR29:** Android STT transcription must complete and send the transcript via WebSocket within 2 seconds of the user finishing speech (V4)
- **NFR30:** TTS double-speak must play each phrase twice with a 0.8-second pause between repetitions and a 1.2-second pause between distinct phrases, matching the Fluent skill speak timing (V4)
- **NFR31:** API keys submitted through the app must be transmitted over HTTPS (Cloudflare Tunnel) — the key never travels over an unencrypted connection (V4)
- **NFR32:** API keys stored on the Pi must be written to per-user auth.json files with file permissions restricted to the owning user only — one user's API key must never be readable by another user (V4)

### Recipes (V5)

- **NFR33:** Recipe URL import (HTML fetch + LLM extraction) must complete and present the extracted recipe for review within 10 seconds (V5)
- **NFR34:** Recipe YouTube import (transcript retrieval + LLM extraction) must complete and present the extracted recipe for review within 15 seconds (V5)
- **NFR35:** Recipe photo OCR import (OCR text extraction + LLM structuring) must complete and present the extracted recipe for review within 10 seconds (V5)
- **NFR36:** Recipe search and filter operations must return results within 300ms on devices running Android 8.0+ (V5)
- **NFR37:** Shopping list generation from the weekly meal plan (ingredient aggregation, deduplication, quantity summing across all linked recipes) must complete and display the review screen within 3 seconds (V5)
- **NFR38:** Recipe PDF generation must complete within 3 seconds on-device and open the Android share sheet immediately after (V5)
- **NFR39:** LLM API costs for recipe import (URL, YouTube, OCR extraction) must remain under €2/month at family-scale usage — combined with V2 categorization costs (V5)
