---
stepsCompleted: ['step-01-validate-prerequisites', 'step-02-design-epics', 'step-03-create-stories', 'step-04-final-validation']
inputDocuments: ['_bmad-output/planning-artifacts/prd.md', '_bmad-output/planning-artifacts/architecture.md']
scope: 'V3 Meal Plan'
---

# FamilyHub V3 Meal Plan - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for FamilyHub V3 Meal Plan, decomposing the V3 requirements (FR81-FR99, NFR25-NFR26) into implementable stories.

## Requirements Inventory

### Functional Requirements

FR81: Admin can configure default participants per meal slot — assigning which family profiles eat at each day-of-week + meal combination
FR82: Admin can mark any day-of-week + meal slot as "don't plan" by default
FR83: System applies the configured defaults automatically when a new meal plan week is created
FR84: Admin can view the meal plan for any week — current, past, or future — displayed as a 7-day grid with lunch and dinner rows
FR85: Admin can navigate between weeks: previous, current, next, and jump to any specific week
FR86: Admin can create a meal entry for any lunch or dinner slot with a free-text name
FR87: Admin can edit any existing meal entry's name, type, detail, or participants
FR88: Admin can delete a meal entry from any slot
FR89: Admin can set a meal type for each entry: home-cooked, eating out, takeaway, or leftovers
FR90: For eating out or takeaway meals, admin can add an optional free-text detail
FR91: System propagates meal plan changes from one Admin to all other connected Admin devices in real-time
FR92: Admin can override the default participants for any specific meal — adding or removing profiles
FR93: Admin can enable a normally-skipped slot for a specific week
FR94: Admin can disable a normally-enabled slot for a specific week
FR95: Admin can set a meal's type to "leftovers" and link it to a previous home-cooked meal
FR96: Admin can adjust the meal plan when leftover quantities don't match expectations
FR97: Dashboard displays a Meal Plan widget showing the next upcoming meal's name, type, and participants
FR98: If the next upcoming meal slot has no meal set and is not skipped, the widget displays a warning
FR99: If it is Sunday and the following week has no meals planned, the widget displays a planning reminder

### NonFunctional Requirements

NFR25: Meal plan week view must load and render the full 7-day grid within 500ms when navigating between weeks
NFR26: Meal plan default configuration changes must apply to all future unedited weeks without requiring manual propagation

### Additional Requirements

- Repository pattern: IMealPlanRepository interface + Supabase implementation
- Supabase migration for meal plan tables + RLS (family_id on every table)
- Zustand store: mealPlanStore (current week selection, transient UI state)
- Expo Router screens under src/app/(app)/meal-plan/
- Types: MealEntry, MealType, MealPlanConfig, MealPlanWeek

### UX Design Requirements

No UX design specification available for V3. Stories will reference existing app patterns and Material Design 3 conventions.

### FR Coverage Map

| FR | Epic | Description |
|---|---|---|
| FR84 | 8 | View week grid |
| FR85 | 8 | Navigate weeks |
| FR86 | 8 | Create meal |
| FR87 | 8 | Edit meal |
| FR88 | 8 | Delete meal |
| FR89 | 8 | Meal types |
| FR90 | 8 | Eating out/takeaway detail |
| ~~FR91~~ | — | Dropped — real-time sync not needed for meal planning |
| FR81 | 9 | Configure default participants |
| FR82 | 9 | Mark slots "don't plan" |
| FR83 | 9 | Auto-apply defaults |
| FR92 | 10 | Override participants |
| FR93 | 10 | Enable skipped slot |
| FR94 | 10 | Disable active slot |
| FR95 | 11 | Leftovers linking |
| FR96 | 11 | Adjust leftovers plan |
| FR97 | 12 | Widget: next meal |
| FR98 | 12 | Widget: no meal warning |
| FR99 | 12 | Widget: planning reminder |

## Epic List

### Epic 8: Weekly Meal Plan Core
Users can view a 7-day meal plan grid and create, edit, and delete meals for any week.
**FRs covered:** FR84, FR85, FR86, FR87, FR88, FR89, FR90
**NFRs covered:** NFR25
**Dropped:** FR91 (real-time sync not needed for meal planning)

### Epic 9: Meal Plan Configuration
Admins can configure who eats at which meal by default, mark slots as "don't plan", and have the system auto-apply defaults to future weeks.
**FRs covered:** FR81, FR82, FR83
**NFRs covered:** NFR26

### Epic 10: Participant Overrides & Slot Exceptions
Users can adjust participants for individual meals and manage slot exceptions for specific weeks (holidays, change of plans).
**FRs covered:** FR92, FR93, FR94

### Epic 11: Leftovers Linking
Users can plan leftovers from previous meals and adjust when reality doesn't match the plan.
**FRs covered:** FR95, FR96

### Epic 12: Meal Plan Dashboard Widget
Users see their next meal at a glance with warnings and planning reminders on the dashboard.
**FRs covered:** FR97, FR98, FR99

---

## Epic 8: Weekly Meal Plan Core

Users can view a 7-day meal plan grid and create, edit, and delete meals for any week.

### Story 8.1: View Weekly Meal Plan Grid

As an Admin,
I want to view a 7-day meal plan grid with lunch and dinner rows and navigate between weeks,
So that I can see what meals are planned for any week.

**Acceptance Criteria:**

**Given** the admin is on the meal plan screen
**When** the screen loads
**Then** a 7-day grid (Monday–Sunday) with two rows (Lunch, Dinner) is displayed for the current week
**And** each slot shows the meal name if one exists, or is empty

**Given** the admin is viewing a week
**When** they tap "next week" or "previous week"
**Then** the grid navigates to the adjacent week within 500ms (NFR25)

**Given** the admin wants to view a specific week
**When** they use the week picker to jump to a date
**Then** the grid displays the week containing that date

**Given** this is the first V3 feature
**When** the story is implemented
**Then** the Supabase migration creates meal plan tables with `family_id` and RLS, the `IMealPlanRepository` interface and Supabase implementation exist, types (`MealEntry`, `MealType`, `MealPlanWeek`) are defined, `mealPlanStore` (current week selection) exists, and the screen is routed at `src/app/(app)/meal-plan/`

### Story 8.2: Create, Edit, and Delete Meals

As an Admin,
I want to create, edit, and delete meal entries in any slot,
So that I can plan what the family will eat.

**Acceptance Criteria:**

**Given** the admin taps an empty slot
**When** they enter a meal name (free text)
**Then** a meal entry is created in that slot with type "home-cooked" by default
**And** all family profiles are assigned as participants (default until Epic 2 configuration)

**Given** a meal exists in a slot
**When** the admin taps it and edits the name
**Then** the meal name is updated

**Given** a meal exists in a slot
**When** the admin deletes it
**Then** the slot becomes empty

**Given** the admin creates a meal for a past week
**When** the entry is saved
**Then** it persists — past weeks are editable, not read-only

### Story 8.3: Meal Types & Eating Out/Takeaway Details

As an Admin,
I want to set a meal type (home-cooked, eating out, takeaway) and add details for eating out or takeaway meals,
So that the plan reflects different kinds of meals.

**Acceptance Criteria:**

**Given** the admin is creating or editing a meal
**When** they select the meal type
**Then** they can choose from: home-cooked, eating out, takeaway
**And** "leftovers" type is visible but disabled (enabled in Epic 4)

**Given** the meal type is "eating out"
**When** the admin optionally enters a detail
**Then** the detail is saved and displayed (e.g., "Cervejaria Ramiro")

**Given** the meal type is "takeaway"
**When** the admin optionally enters a detail
**Then** the detail is saved and displayed (e.g., "Sushi from Noori")

**Given** the meal type is "home-cooked"
**When** the admin views the meal
**Then** no detail field is shown — only the meal name

---

## Epic 9: Meal Plan Configuration

Admins can configure who eats at which meal by default, mark slots as "don't plan", and have the system auto-apply defaults to future weeks.

### Story 9.1: Configure Default Participants Per Meal Slot

As an Admin,
I want to configure which family members eat at each day-of-week and meal combination,
So that new weeks auto-populate with the right participants without manual setup.

**Acceptance Criteria:**

**Given** the admin navigates to Settings > Meal Plan Configuration
**When** the configuration screen loads
**Then** a grid of 7 days × 2 meals (lunch, dinner) is displayed, each slot showing the currently assigned profiles

**Given** the admin taps a slot (e.g., Monday Dinner)
**When** they select/deselect family profiles
**Then** the default participants for that slot are saved

**Given** the admin sets "Filipe + Angela" for weekday lunches and "Filipe + Angela + Aurora" for all dinners and weekend lunches
**When** they save and a new meal plan week is created
**Then** each slot is pre-populated with the configured participants (FR83, NFR26)

**Given** the admin changes the defaults
**When** future weeks that have not been manually edited are viewed
**Then** they reflect the updated defaults

### Story 9.2: Mark Slots as "Don't Plan"

As an Admin,
I want to mark certain meal slots as "don't plan" by default,
So that slots where the family doesn't eat together are automatically skipped.

**Acceptance Criteria:**

**Given** the admin is on the Meal Plan Configuration screen
**When** they toggle a slot to "don't plan" (e.g., Thursday Lunch)
**Then** that slot is saved as skipped by default

**Given** a slot is marked "don't plan"
**When** a new meal plan week is created
**Then** that slot appears greyed out/skipped in the week grid — no meal entry expected

**Given** a slot is marked "don't plan"
**When** the admin views the week grid
**Then** the skipped slot is visually distinct from empty plannable slots

---

## Epic 10: Participant Overrides & Slot Exceptions

Users can adjust participants for individual meals and manage slot exceptions for specific weeks (holidays, change of plans).

### Story 10.1: Override Participants for a Specific Meal

As an Admin,
I want to add or remove participants from a specific meal without changing the defaults,
So that I can reflect who is actually eating that meal (e.g., Aurora sleeping at a friend's house).

**Acceptance Criteria:**

**Given** a meal exists in a slot with default participants (e.g., Filipe, Angela, Aurora)
**When** the admin taps the participants and removes Aurora
**Then** that meal shows only Filipe and Angela
**And** the global defaults remain unchanged

**Given** a meal exists with overridden participants
**When** the admin views it later
**Then** the override is persisted — it does not revert to defaults

### Story 10.2: Enable a Skipped Slot for a Specific Week

As an Admin,
I want to enable a normally-skipped slot for a specific week,
So that I can plan a meal on a public holiday or special occasion.

**Acceptance Criteria:**

**Given** a slot is marked "don't plan" by default (e.g., Wednesday Lunch)
**When** the admin taps the greyed-out slot and chooses to enable it for this week
**Then** the slot becomes plannable with the default participants for that meal type
**And** the admin can create a meal entry in it

**Given** the admin enabled a skipped slot for one week
**When** they view the same slot in other weeks
**Then** it remains skipped — the override is week-specific only

### Story 10.3: Disable an Active Slot for a Specific Week

As an Admin,
I want to disable a normally-active slot for a specific week,
So that I can skip a meal when plans change (e.g., family eating elsewhere).

**Acceptance Criteria:**

**Given** a slot has a planned meal
**When** the admin chooses to disable/skip the slot for this week
**Then** the planned meal is removed and the slot is marked as skipped

**Given** the admin disabled a slot for one week
**When** they view the same slot in other weeks
**Then** it remains active with its default configuration — the override is week-specific only

**Given** a slot was disabled for a specific week
**When** the admin changes their mind
**Then** they can re-enable it for that week

---

## Epic 11: Leftovers Linking

Users can plan leftovers from previous meals and adjust when reality doesn't match the plan.

### Story 11.1: Link a Meal Slot to Leftovers from a Previous Meal

As an Admin,
I want to set a meal as "leftovers" and link it to a previous home-cooked meal,
So that I can plan to use leftovers before they go to waste.

**Acceptance Criteria:**

**Given** the admin is creating or editing a meal
**When** they select the "leftovers" meal type
**Then** a list of recent home-cooked meals from the current and previous weeks is presented for linking

**Given** the admin selects a home-cooked meal to link (e.g., Tuesday's Lasagna)
**When** the leftovers entry is saved
**Then** the slot displays "Leftovers — Lasagna" with a visual indicator linking it to the source meal

**Given** a leftovers entry is linked to a source meal
**When** the admin views it
**Then** the source meal's name and date are visible

### Story 11.2: Adjust the Meal Plan When Leftovers Don't Match Expectations

As an Admin,
I want to adjust leftovers entries when reality doesn't match the plan,
So that the meal plan stays accurate (e.g., not enough leftovers, or unexpected surplus).

**Acceptance Criteria:**

**Given** a slot is set as "leftovers" linked to a previous meal
**When** the admin determines there aren't enough leftovers
**Then** they can unlink the leftovers entry and replace it with a new meal (any type)

**Given** a meal was planned as home-cooked
**When** there is unexpected surplus
**Then** the admin can create a new leftovers entry in a subsequent slot and link it to that meal

**Given** a leftovers entry is unlinked
**When** the admin replaces it with a new meal
**Then** the source meal is unaffected — only the leftovers slot changes

---

## Epic 12: Meal Plan Dashboard Widget

Users see their next meal at a glance with warnings and planning reminders on the dashboard.

### Story 12.1: Display Next Upcoming Meal on Dashboard

As an Admin,
I want to see my next meal on the dashboard,
So that I know what's planned without opening the full meal plan.

**Acceptance Criteria:**

**Given** meals are planned for the current week
**When** the admin views the dashboard
**Then** a Meal Plan widget displays the next upcoming meal's name, type, and participants

**Given** the next meal is "Dinner — Cervejaria Ramiro (Filipe, Angela, Aurora)"
**When** the admin views the widget
**Then** the meal name, type (eating out), and participant names are visible

**Given** the next plannable slot is skipped (marked "don't plan" or disabled)
**When** the system determines the next meal
**Then** it skips over skipped slots and shows the next active meal with an entry

**Given** the admin taps the widget
**When** the tap is registered
**Then** the app navigates to the meal plan week view for the current week

### Story 12.2: Warning When No Meal Is Planned

As an Admin,
I want to see a warning when the next meal slot has nothing planned,
So that I know I need to decide what to eat.

**Acceptance Criteria:**

**Given** the next upcoming active slot has no meal set
**When** the admin views the dashboard
**Then** the widget displays a warning (e.g., "No meal planned for tonight's dinner")

**Given** the next slot is skipped (don't plan / disabled)
**When** the system evaluates the warning
**Then** skipped slots do not trigger a warning — only active, empty slots do

### Story 12.3: Planning Reminder for Next Week

As an Admin,
I want to see a reminder on Sunday if next week has no meals planned,
So that I'm nudged to plan ahead before the week starts.

**Acceptance Criteria:**

**Given** it is Sunday
**When** the following week has zero meal entries
**Then** the widget displays a planning reminder (e.g., "No meals planned for next week")

**Given** it is Sunday
**When** the following week has at least one meal entry
**Then** no planning reminder is shown

**Given** it is any day other than Sunday
**When** the admin views the dashboard
**Then** no planning reminder for next week is shown, regardless of next week's state
