---
stepsCompleted: [1, 2, 3, 4, 5, 6]
inputDocuments: ['_bmad-output/brainstorming/brainstorming-session-2026-03-22-1830.md']
date: 2026-03-24
author: Filipe
---

# Product Brief: FamilyHub

<!-- Content will be appended sequentially through collaborative workflow steps -->

## Executive Summary

FamilyHub is a personal family management app built by Filipe Morais for his household — a couple, two children, and a maid. It is not a commercial product. It exists because the builder identified specific, recurring friction in family life and has the skills to eliminate it permanently.

The app consolidates vacation planning, shopping, leftovers tracking, household finances, maid management, recipes, meal planning, and document deadlines into a single integrated system — built precisely for this family's structure, habits, and language, with no compromises for a hypothetical general audience.

---

## Core Vision

### Problem Statement

Three recurring failures define the problem FamilyHub solves:

1. **Vacation packing lists are rebuilt from scratch before every trip.** Nothing carries forward. Items are forgotten, duplicated, and never reused systematically. Each holiday begins with the same avoidable effort — despite the fact that most of what needs packing is identical to last time.
2. **The supermarket is a memory test the family regularly fails.** Items needed at home go unlogged, unshared, and unbought until the absence becomes an inconvenience.
3. **Leftovers spoil in the fridge because they are invisible.** Food is stored, forgotten, and discarded — a small but persistent waste that happens on a weekly cycle.

### Problem Impact

Low-grade, high-frequency frictions that accumulate into real cost: wasted food, repeated effort, and avoidable purchases.

### Why Build It Yourself

The builder's previous app (built in OutSystems) addressed vacation planning effectively but was constrained by tooling limitations and licensing scope. FamilyHub is its successor: a full-stack rebuild with no external constraints, covering every domain the family actually needs. The motivation is straightforward — the skills exist, the problem is real, and no existing tool solves it the way this family needs it solved.

### Proposed Solution

A cross-platform mobile app — Android-first, with a framework yet to be selected — that manages the full surface of family life in one place. Modules are integrated intentionally: vacation templates that carry forward across trips, a shared shopping list with real-time sync between family members, and a leftover tracker that surfaces forgotten food before it spoils.

The app is built for this family's specific structure: two equal admins (the couple), two child profiles that grow into full accounts over time, and a maid with a professionally scoped experience tailored to her role — not a restricted version of the admin view, but a purpose-built interface.

### Release Strategy

Delivered incrementally, one module per version, each shippable and useful on its own:

| Version | Module |
|---|---|
| V1 | Vacation — packing lists, templates, booking task timeline |
| V2 | Leftovers — fridge tracker, expiry alerts, meal plan bridge |
| V3 | Shopping — shared lists, real-time sync, sections |
| V4 | Finances — budgets, envelopes, expense tracking |
| V5 | Maid — hours logging, billing, payment register |
| V6 | Recipes — import, search, meal planning |
| V7+ | AI features, background jobs, push notifications |

### What Makes This Ours

- **Built for one family, exactly.** No generic defaults, no compromises for an imagined user base. The vocabulary, the language, the structure — all ours.
- **Modules that talk to each other.** Vacation status adjusts household budget proportionally. Maid salary auto-logs as a household expense. Meal plan generates a deduplicated shopping list. Leftovers surface in meal planning before they expire.
- **Designed to grow with the family.** Child profiles exist before children have accounts — when Aurora and Isabel are ready, their historical data is already there. No migration, no data loss.
- **Vendor independence built in.** Every external service sits behind a swappable interface. Replacing the database, storage provider, or any integration means rewriting one module, nothing else.

---

## Target Users

FamilyHub has a fixed, known user base. There is no market to address — the users are the family itself.

### Primary Users

**Filipe — Admin**
The builder and primary power user. Does the grocery shopping, manages household finances, and is the most frequent touchpoint with every module. Initiates trips, logs expenses, manages maid billing. Uses the app daily — checking the dashboard in the morning, shopping list at the supermarket, leftover tracker before cooking.

**Angela — Admin**
Co-admin with identical permissions to Filipe. Symmetric partner in household management — neither is subordinate to the other in the app's model. Contributes to shopping lists, meal planning, and finances. Usage pattern mirrors Filipe's.

### Secondary Users

**Aurora — Child (very future account)**
Eldest daughter, currently 3 years old. Exists as a Profile only — child accounts are a long-horizon architectural consideration, not an active design concern. Her profile is created now so that when she eventually has an account (years away), all historical data attributed to her is already there. No migration needed.

**Isabel — Child (very future account)**
Younger daughter, under 1 year old. Same situation as Aurora. Profile exists in the data model today; account is a distant future concern.

**The Maid — Scoped Employee**
A changing role — each maid is a separate Google account, hired and revoked by an admin. Her experience is purpose-built, not restricted: she lands on a dashboard designed for her role, with one-tap hour logging as the primary action. She also sees her billing history and can contribute to the shopping list. The app dignifies the employment relationship — she has a professional record of her work and compensation.

### User Journeys

**Filipe — Saturday Morning (primary daily loop)**
Opens dashboard: checks shopping list for items needed, sees today's meal and confirms it's ready, reviews leftover alerts, scans budget health, notes any urgent vacation booking tasks. Goes shopping with the list organised by supermarket section. Returns, logs the receipt amount, ticking completes the session.

**The Maid — Monday Morning (weekly work loop)**
Arrives at the house. Opens FamilyHub. Taps to log today's hours. Notices the family is out of bleach — adds it to the shopping list. Views her monthly billing statement. Done. The entire interaction takes under two minutes.

**Filipe + Angela — Pre-Trip (seasonal loop)**
From the moment a trip is created, the vacation widget is pinnable to the dashboard. Filipe pins it when preparation intensity warrants it. Both admins see packing progress and booking task urgency at a glance throughout the Planning → Upcoming → Active lifecycle — coordinating without needing to talk explicitly.

---

## Success Metrics

### What Success Looks Like

FamilyHub has no commercial success metrics. Success is personal and behavioural.

**Primary success signal — Angela's willing adoption.**
Filipe built the app and will rationalise using it regardless. Angela has no such bias. If she uses FamilyHub willingly and considers it an improvement over how the family managed before, the app is working. If she stops using it or names it as extra work rather than reduced work, the app has failed — regardless of technical quality.

**V1 success signal — one complete vacation planned end-to-end.**
Within six months of V1 shipping, at least one full family vacation must have been planned entirely through FamilyHub — packing lists built, items assigned, statuses tracked through to departure. The subjective test: did it feel better than before? Did it reduce the effort of preparation?

### Version Gate: What V1 Must Deliver

V1 ships when the vacation module includes, at minimum:

- Packing list items with **status** — six states: New (just added), Buy (needs purchasing), Ready (prepared and set aside), Issue (blocked), Last-Minute (can only be packed at departure), Packed (in the bag)
- **Categories** (user-defined, e.g., Essentials, Clothes, Documents, Toiletries)
- **Tags** for additional classification
- **Profile assignment** per item — each item belongs to a named family member (e.g., Isabel — Diapers — Essentials — New)

This is the feature set required before V2 development begins. Anything beyond this is enhancement, not gate.

### Failure Signals

- Angela stops using the app or describes it as additional work
- A vacation is planned outside the app because FamilyHub was too cumbersome
- Any module becomes a chore rather than a shortcut

### Business Objectives

N/A — FamilyHub is a personal family tool with no commercial objectives.

### KPIs

No formal KPIs tracked. The family's day-to-day behaviour is the only measurement that matters.

---

## MVP Scope

FamilyHub uses a module-per-version release strategy. "MVP" means V1 — the Vacation module — not the full product.

### Core Features (V1 — Vacation)

**Foundation (required for all modules):**
- Google Sign-In authentication
- Admin role (Filipe + Angela, symmetric permissions)
- Family member Profiles (Filipe, Angela, Aurora, Isabel) — decoupled from user accounts
- Supabase backend with repository pattern service layer
- Cross-platform frontend (framework TBD)

**Vacation module:**
- Vacation as a structured object with lifecycle: Planning → Upcoming → Active → Completed
- Multiple vacations in any status simultaneously
- Pinnable vacation dashboard widget (available from Planning onwards)
- Packing list items with:
  - **Status** — six states: New (just added), Buy (needs purchasing), Ready (prepared and set aside), Issue (blocked — something prevents preparation), Last-Minute (can only be packed at departure), Packed (in the bag)
  - **Category** (user-defined, e.g., Essentials, Clothes, Documents, Toiletries)
  - **Tags** for additional classification
  - **Profile assignment** — each item linked to a family member (e.g., Isabel — Diapers — Essentials — New)
- Reusable packing templates (tagged by trip type, composable at trip creation)
- Past trip selective reuse — cherry-pick items or categories from prior vacations
- Booking task timeline with fixed urgency deadlines: Flights → 90d, Hotel → 60d, Rent-a-car → 30d, Travel insurance → 14d
- Dashboard shows most urgent incomplete booking task

### Out of Scope for V1

All non-Vacation modules (V2–V6+), AI features, push notifications, background jobs, file storage, and Maid/Child user roles.

### MVP Success Criteria

V1 is complete when at least one full family vacation is planned end-to-end through the app, Angela uses it willingly, and the family no longer rebuilds packing lists from scratch. V2 begins only after this is confirmed.

### Future Vision

V2 Leftovers → V3 Shopping → V4 Finances → V5 Maid → V6 Recipes → V7+ AI & automation. Child accounts (Aurora, Isabel) are a long-horizon consideration — no design work planned until relevant.

---

## Decisions Register

### Confirmed Decisions

| Decision | Choice |
|---|---|
| Target platform | Android-first |
| Platform requirement | Cross-platform (framework TBD) |
| Database | Supabase (PostgreSQL, free tier) |
| Auth | Google Sign-In |
| UI language | Portuguese |
| Backend cost constraint | Free tier or very low cost |
| Service architecture | Repository pattern — every external service behind a swappable interface |
| Release order | V1 Vacation → V2 Leftovers → V3 Shopping → V4 Finances → V5 Maid → V6 Recipes → V7+ AI |

### Open Decisions

| Decision | Status |
|---|---|
| Frontend framework | Under evaluation — Flutter / React Native / Expo |
| V1 data model | Not yet designed |
| Offline sync conflict resolution | Not yet defined |
