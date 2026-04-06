---
stepsCompleted: ['step-01-validate-prerequisites', 'step-02-design-epics', 'step-03-create-stories', 'step-04-final-validation']
status: 'complete'
completedAt: '2026-04-05'
totalEpics: 5
totalStories: 14
frsCovered: 'FR116-FR149 (34/34)'
nfrsCovered: 'NFR31-NFR37 (7/7)'
inputDocuments: ['_bmad-output/planning-artifacts/prd.md', '_bmad-output/planning-artifacts/architecture.md']
scope: 'V5 Recipes (FR116-FR149, NFR31-NFR37)'
---

# FamilyHub V5 Recipes - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for FamilyHub V5 Recipes module, decomposing the requirements from the PRD and Architecture into implementable stories.

## Requirements Inventory

### Functional Requirements

FR116: Admin can create a recipe with: name, type, ingredients (each with name and quantity), step-by-step instructions (ordered list of individual steps), servings, prep time (minutes), cook time (minutes), cost (manual entry), image, categories, and tags
FR117: Admin can edit any recipe's fields — name, type, ingredients, steps, servings, times, cost, image, categories, tags
FR118: Admin can delete a recipe
FR119: Recipe type is a static enum shared with the meal plan: meal, main, side, soup, dessert, other — defined at development time, not user-configurable
FR120: Admin can create, edit, and delete recipe categories — user-defined at runtime
FR121: Admin can create, edit, and delete recipe tags — user-defined at runtime
FR122: Admin can import a recipe by pasting a URL; the system fetches the page HTML and sends it to an LLM to extract recipe fields (name, ingredients with quantities, steps, servings, prep time, cook time, image URL)
FR123: After LLM extraction, the system presents the extracted recipe for admin review and editing before saving — no recipe is saved without admin confirmation
FR124: Admin can import a recipe by pasting a YouTube URL; the system retrieves the video transcript via YouTube Data API and sends it to an LLM to extract recipe fields
FR125: If the transcript contains no extractable recipe content, the system retrieves the video's top-level comments and sends them to the LLM as a fallback source
FR126: If neither transcript nor comments yield a recipe, the system informs the admin that extraction failed — no empty recipe is created
FR127: Admin can import a recipe by capturing a photo (camera) or selecting an image from the gallery; the system runs OCR to extract text, then sends the text to an LLM to structure it into recipe fields
FR128: After OCR + LLM structuring, the system presents the extracted recipe for admin review and editing before saving
FR129: Admin can create a recipe via manual entry with a structured form: name, type, ingredients (add/remove/reorder rows, each with name and quantity), steps (add/remove/reorder, each a separate text input), servings, prep time, cook time, cost, image (camera capture or gallery selection), categories, tags
FR130: Recipe list displays recipes grouped by type as the primary browsing view
FR131: Admin can filter recipes by: categories, tags, ingredients (text match against ingredient names), total time (prep + cook), prep time, cook time
FR132: Admin can search recipes by ingredient — the system matches the search term against ingredient names across all recipes and returns matching recipes
FR133: Filters are combinable — admin can apply multiple filters simultaneously
FR134: Admin can adjust a recipe's servings when viewing it; all ingredient quantities recalculate proportionally based on the ratio of new servings to original servings
FR135: Scaling is non-destructive — the original recipe retains its saved servings and quantities; scaling is applied as a view-time adjustment
FR136: Admin can link one or more recipes to a single meal plan slot — each linked recipe appears as a separate entry within the slot
FR137: Admin can set the servings for each linked recipe independently within a meal slot — ingredient scaling follows the specified servings
FR138: Admin can add a free-text entry to a meal slot alongside or instead of linked recipes — free-text is the fallback when no recipe exists or the admin lacks time to create one
FR139: Admin can remove a linked recipe from a meal slot without affecting the recipe itself
FR140: When linking a recipe to a meal slot, the system opens the recipe browser filtered to the slot's meal type context — admin can browse and select from the full recipe collection
FR141: Admin can tap "Generate Shopping List" in the meal plan view; the system scans all linked recipes for the displayed week, scales each recipe's ingredients to the specified servings for that meal, and produces a consolidated ingredient list
FR142: Shopping list generation sums quantities for the same ingredient across multiple recipes
FR143: The system presents a review screen showing each ingredient, its total quantity, and a checkbox — all items are unchecked by default
FR144: Admin checks the items they need and taps "Add to Shopping List"; only checked items are added
FR145: Checked items merge into the existing shopping list deduplicated: if the ingredient already exists and is ticked (shopped), it is unticked with the new quantity; if already unticked, the quantity is updated; if not present, a new item is created
FR146: Free-text meal entries (meals without linked recipes) are excluded from shopping list generation — only linked recipes contribute ingredients
FR147: Admin can share any recipe as a PDF; the system generates a formatted PDF on-device containing the recipe name, image, type, ingredients with quantities, steps, servings, prep time, cook time, and cost
FR148: After PDF generation, the system opens the Android share sheet so the admin can send the PDF via any installed app (WhatsApp, email, etc.)
FR149: System propagates recipe changes (create, edit, delete) from one Admin to all other connected Admin devices in real-time

### NonFunctional Requirements

NFR31: Recipe URL import (HTML fetch + LLM extraction) must complete and present the extracted recipe for review within 10 seconds
NFR32: Recipe YouTube import (transcript retrieval + LLM extraction) must complete and present the extracted recipe for review within 15 seconds
NFR33: Recipe photo OCR import (OCR text extraction + LLM structuring) must complete and present the extracted recipe for review within 10 seconds
NFR34: Recipe search and filter operations must return results within 300ms on devices running Android 8.0+
NFR35: Shopping list generation from the weekly meal plan (ingredient aggregation, deduplication, quantity summing across all linked recipes) must complete and display the review screen within 3 seconds
NFR36: Recipe PDF generation must complete within 3 seconds on-device and open the Android share sheet immediately after
NFR37: LLM API costs for recipe import (URL, YouTube, OCR extraction) must remain under €2/month at family-scale usage — combined with V2 categorization costs

### Additional Requirements

- Supabase migration: 7 new tables (recipes, recipe_steps, recipe_ingredients, recipe_categories, recipe_tags, recipe_category_assignments, recipe_tag_assignments) + meal_slot_recipes junction on existing V3 meal_slots + RLS policies + indexes
- 5 repository interfaces + implementations: IRecipeRepository, IRecipeCategoryRepository, IRecipeTagRepository, IRecipeImportRepository, ILlmRepository (shared with V2)
- 3 services: recipe-scaling.service.ts, shopping-list-generator.service.ts, recipe-pdf.service.ts
- Zustand recipesStore + Supabase Realtime subscription for recipe sync
- 4 hooks: use-recipes, use-recipe-import, use-recipe-scaling, use-shopping-list-generator
- V5 packages: expo-image-picker, expo-camera, react-native-mlkit-ocr, react-native-html-to-pdf, react-native-share
- Env config: LLM_API_URL, LLM_API_KEY, YOUTUBE_DATA_API_KEY
- Route group (recipes)/ with screens: index.tsx, new.tsx, [recipeId]/index.tsx, [recipeId]/edit.tsx, import-review.tsx
- Meal plan schema enhancement: meal_slot_recipes junction table, ON DELETE RESTRICT for linked recipes
- RecipeType and RecipeImportMethod type literals
- Quantity scaling: regex-based numeric extraction, non-numeric quantities returned unchanged

### UX Design Requirements

No UX Design specification exists for V5 Recipes. UX will be derived from the PRD user journey and architecture component specifications.

### FR Coverage Map

FR116: Epic 1 — Recipe CRUD (create)
FR117: Epic 1 — Recipe CRUD (edit)
FR118: Epic 1 — Recipe CRUD (delete)
FR119: Epic 1 — Recipe type static enum
FR120: Epic 1 — Recipe categories CRUD
FR121: Epic 1 — Recipe tags CRUD
FR122: Epic 2 — URL import (HTML fetch + LLM extraction)
FR123: Epic 2 — Import review before saving
FR124: Epic 2 — YouTube import (transcript + LLM)
FR125: Epic 2 — YouTube fallback to comments
FR126: Epic 2 — YouTube extraction failure handling
FR127: Epic 2 — Photo OCR import (camera/gallery + OCR + LLM)
FR128: Epic 2 — OCR import review before saving
FR129: Epic 1 — Manual entry with structured form
FR130: Epic 3 — Recipe list grouped by type
FR131: Epic 3 — Filter by categories, tags, ingredients, time
FR132: Epic 3 — Search by ingredient
FR133: Epic 3 — Combinable filters
FR134: Epic 3 — Servings scaling with proportional ingredient recalc
FR135: Epic 3 — Non-destructive scaling (view-time only)
FR136: Epic 4 — Link multiple recipes to a meal slot
FR137: Epic 4 — Per-recipe servings override in meal slot
FR138: Epic 4 — Free-text entry alongside/instead of linked recipes
FR139: Epic 4 — Remove linked recipe from slot
FR140: Epic 4 — Recipe browser filtered to meal type context
FR141: Epic 5 — Generate Shopping List button in meal plan
FR142: Epic 5 — Ingredient quantity summing across recipes
FR143: Epic 5 — Review screen with checkboxes
FR144: Epic 5 — Add checked items to shopping list
FR145: Epic 5 — Dedup merge into existing shopping list
FR146: Epic 5 — Free-text entries excluded from generation

NFR31: Epic 2 — URL import <10s
NFR32: Epic 2 — YouTube import <15s
NFR33: Epic 2 — OCR import <10s
NFR34: Epic 3 — Search/filter <300ms
NFR35: Epic 5 — Shopping list generation <3s
NFR36: Epic 3 — PDF generation <3s
NFR37: Epic 2 — LLM cost <€2/month

## Epic List

### Epic 1: Recipe Foundation & Manual Entry
Admins can create, edit, delete, and organize recipes manually with structured ingredients, steps, categories, and tags — with real-time sync between devices.
**FRs covered:** FR116, FR117, FR118, FR119, FR120, FR121, FR129, FR149

### Epic 2: Smart Recipe Import
Admins can import recipes from web URLs, YouTube videos, and photos of printed/handwritten recipes — with LLM-powered extraction and a review screen before saving.
**FRs covered:** FR122, FR123, FR124, FR125, FR126, FR127, FR128
**NFRs:** NFR31, NFR32, NFR33, NFR37

### Epic 3: Recipe Discovery, Scaling & Sharing
Admins can browse recipes by type, filter by categories/tags/ingredients/time, scale servings with auto-calculated ingredients, and share recipes as formatted PDFs.
**FRs covered:** FR130, FR131, FR132, FR133, FR134, FR135, FR147, FR148
**NFRs:** NFR34, NFR36

### Epic 4: Meal Plan Recipe Integration
Admins can link multiple recipes to a single meal plan slot, set servings per recipe, and keep free-text as a fallback — enhancing the existing V3 meal plan.
**FRs covered:** FR136, FR137, FR138, FR139, FR140

### Epic 5: Shopping List Generation from Meal Plan
Admins can generate a shopping list from the week's meal plan — ingredients aggregated, quantities summed, reviewed with checkboxes, and merged deduplicated into the existing shopping list.
**FRs covered:** FR141, FR142, FR143, FR144, FR145, FR146
**NFRs:** NFR35

---

## Epic 1: Recipe Foundation & Manual Entry

Admins can create, edit, delete, and organize recipes manually with structured ingredients, steps, categories, and tags — with real-time sync between devices.

### Story 1.1: Create and View Recipes via Manual Entry

As an admin,
I want to create recipes with structured ingredients, steps, and metadata, and see them in a list,
So that I can build a personal recipe collection from scratch.

**FRs:** FR116, FR119, FR129

**Acceptance Criteria:**

**Given** the admin opens the Recipes module for the first time
**When** the recipe list loads
**Then** an empty state is displayed with a prompt to add the first recipe

**Given** the admin taps "Add Recipe" and selects "Manual Entry"
**When** the manual entry form loads
**Then** the form displays fields for: name, type (dropdown: meal/main/side/soup/dessert/other), servings (default 4), prep time (minutes), cook time (minutes), cost (free text), image (camera capture or gallery picker)
**And** an ingredients section with add/remove/reorder rows (each row: name + quantity)
**And** a steps section with add/remove/reorder rows (each row: single text input)

**Given** the admin fills in all required fields (name, type, at least one ingredient, at least one step)
**When** they tap "Save"
**Then** the recipe is created in Supabase (recipes + recipe_steps + recipe_ingredients tables)
**And** the recipe appears in the recipe list grouped under its type

**Given** the admin taps a recipe in the list
**When** the recipe detail screen loads
**Then** all recipe fields are displayed: name, type, image, servings, prep time, cook time, cost, ingredients with quantities, numbered steps

**Technical notes:**
- Creates Supabase migration: `recipes`, `recipe_steps`, `recipe_ingredients` tables with RLS + indexes
- Creates `IRecipeRepository` interface + Supabase implementation
- Creates `recipe.types.ts` with `Recipe`, `RecipeStep`, `RecipeIngredient`, `RecipeType`, `RecipeImportMethod`
- Creates `recipesStore` (Zustand)
- Creates route group `(recipes)/` with `index.tsx`, `new.tsx`, `[recipeId]/index.tsx`
- Installs V5 packages: `expo-image-picker`
- Adds `(recipes)` entry to sidebar navigation

---

### Story 1.2: Recipe Categories & Tags

As an admin,
I want to create custom categories and tags for recipes and assign them during creation,
So that I can organize my recipe collection the way my family thinks about food.

**FRs:** FR120, FR121

**Acceptance Criteria:**

**Given** the admin navigates to Settings → Recipe Categories
**When** they tap "Add Category"
**Then** they can create a new category with a name and optional icon
**And** the category appears in the list immediately

**Given** the admin has created categories
**When** they edit or delete a category
**Then** the change is persisted and reflected across all recipes using that category

**Given** the admin navigates to Settings → Recipe Tags
**When** they create, edit, or delete tags
**Then** tags are managed with the same UX pattern as categories (name only, no icon)

**Given** the admin is creating or editing a recipe
**When** they reach the categories and tags fields
**Then** they can assign zero or more categories and zero or more tags from the existing lists
**And** they can create a new category or tag inline without leaving the form

**Technical notes:**
- Creates `recipe_categories`, `recipe_tags`, `recipe_category_assignments`, `recipe_tag_assignments` tables + migration + RLS
- Creates `IRecipeCategoryRepository`, `IRecipeTagRepository` interfaces + implementations
- Extends recipe creation form with category/tag pickers

---

### Story 1.3: Edit and Delete Recipes

As an admin,
I want to edit any recipe's fields and delete recipes I no longer want,
So that I can keep my collection accurate and up to date.

**FRs:** FR117, FR118

**Acceptance Criteria:**

**Given** the admin is viewing a recipe detail screen
**When** they tap "Edit"
**Then** the edit form loads pre-populated with all current recipe data (name, type, ingredients, steps, servings, times, cost, image, categories, tags)

**Given** the admin modifies any fields in the edit form
**When** they tap "Save"
**Then** the recipe is updated in Supabase (including any added/removed/reordered ingredients and steps)
**And** the recipe detail screen reflects the changes immediately

**Given** the admin is viewing a recipe detail screen
**When** they tap "Delete" and confirm the deletion dialog
**Then** the recipe and all related data (steps, ingredients, category/tag assignments) are deleted via CASCADE
**And** the recipe is removed from the list immediately

**Given** the admin attempts to delete a recipe that is linked to a meal plan slot
**When** they confirm deletion
**Then** the system blocks deletion and informs the admin that the recipe must be unlinked from meal plan slots first (ON DELETE RESTRICT)

**Technical notes:**
- Creates `(recipes)/[recipeId]/edit.tsx` screen
- Deletion respects `meal_slot_recipes` RESTRICT constraint (Epic 4 dependency — until then, no linked recipes exist, so deletion always succeeds)

---

### Story 1.4: Real-Time Recipe Sync

As an admin,
I want recipe changes made by my partner to appear on my device in real-time,
So that we both always see the same recipe collection without refreshing.

**FRs:** FR149

**Acceptance Criteria:**

**Given** both admins have the Recipes module open
**When** one admin creates, edits, or deletes a recipe
**Then** the change propagates to the other admin's device within 3 seconds (NFR3)
**And** the recipe list and detail views update without manual refresh

**Given** one admin adds a new recipe
**When** the other admin's recipe list receives the Realtime event
**Then** the new recipe appears in the correct type group in the list

**Technical notes:**
- Adds Supabase Realtime subscription to `recipe.repository.ts` for the `recipes` table
- `recipesStore` updated via subscription callback — same pattern as all other modules

---

## Epic 2: Smart Recipe Import

Admins can import recipes from web URLs, YouTube videos, and photos of printed/handwritten recipes — with LLM-powered extraction and a review screen before saving.

### Story 2.1: Import Recipe from URL

As an admin,
I want to paste a recipe URL and have the system extract the recipe automatically,
So that I can quickly add recipes I find online without typing everything manually.

**FRs:** FR122, FR123
**NFRs:** NFR31, NFR37

**Acceptance Criteria:**

**Given** the admin taps "Add Recipe" and selects "Import from URL"
**When** they paste a URL and tap "Import"
**Then** the system fetches the page HTML and sends it to the LLM for extraction
**And** a loading indicator is displayed during extraction

**Given** the LLM extraction completes successfully
**When** the result is returned
**Then** the import review screen displays the extracted recipe fields (name, ingredients with quantities, steps, servings, prep time, cook time, image)
**And** all fields are editable by the admin before saving
**And** the extraction completes within 10 seconds (NFR31)

**Given** the admin reviews and adjusts the extracted recipe
**When** they tap "Save"
**Then** the recipe is saved with `import_method: 'url'` and `source_url` set to the original URL

**Given** the LLM extraction fails or returns incomplete data
**When** the error is returned
**Then** the admin is informed of the failure with a clear message
**And** offered the option to retry or enter the recipe manually

**Technical notes:**
- Creates `ILlmRepository` interface + implementation (shared with V2 categorization)
- Creates `IRecipeImportRepository` interface + implementation
- Creates `(recipes)/import-review.tsx` screen
- Creates `use-recipe-import` hook
- Adds `LLM_API_URL`, `LLM_API_KEY` to env config
- LLM prompt template in `src/constants/recipe-defaults.ts`

---

### Story 2.2: Import Recipe from YouTube

As an admin,
I want to paste a YouTube URL and have the system extract the recipe from the video,
So that I can save recipes from cooking videos without transcribing them myself.

**FRs:** FR124, FR125, FR126
**NFRs:** NFR32, NFR37

**Acceptance Criteria:**

**Given** the admin selects "Import from URL" and pastes a YouTube URL
**When** the system detects it is a YouTube link
**Then** it retrieves the video transcript via YouTube Data API and sends it to the LLM for extraction

**Given** the transcript contains recipe content
**When** the LLM extraction completes
**Then** the import review screen displays the extracted recipe (same review flow as URL import)
**And** the extraction completes within 15 seconds (NFR32)

**Given** the transcript contains no extractable recipe content
**When** the system detects extraction failure from transcript
**Then** the system automatically retrieves the video's top-level comments and sends them to the LLM as a fallback

**Given** neither transcript nor comments yield a recipe
**When** both extraction attempts fail
**Then** the admin is informed that no recipe could be extracted
**And** offered the option to enter the recipe manually
**And** no empty recipe is created

**Technical notes:**
- Extends `IRecipeImportRepository` with YouTube path
- Adds `YOUTUBE_DATA_API_KEY` to env config
- YouTube detection: regex check for youtube.com/watch or youtu.be URLs

---

### Story 2.3: Import Recipe from Photo (OCR)

As an admin,
I want to take a photo of a printed or handwritten recipe and have the system extract it,
So that I can digitize family recipes and recipes from books or magazines.

**FRs:** FR127, FR128
**NFRs:** NFR33

**Acceptance Criteria:**

**Given** the admin taps "Add Recipe" and selects "Import from Photo"
**When** they choose to capture a photo or select from gallery
**Then** the system requests CAMERA permission on first use (if capturing)
**And** runs OCR on the image to extract text

**Given** OCR text extraction completes
**When** the text is sent to the LLM for structuring
**Then** the import review screen displays the extracted recipe fields for review and editing
**And** the full OCR → LLM pipeline completes within 10 seconds (NFR33)

**Given** the OCR produces garbled or incomplete text
**When** the LLM structures whatever it receives
**Then** the admin can correct any errors in the review screen before saving
**And** the recipe is saved with `import_method: 'ocr'`

**Technical notes:**
- Installs `expo-camera`, `react-native-mlkit-ocr`
- CAMERA permission requested on first photo capture, not at module entry
- If `react-native-mlkit-ocr` is incompatible with Expo SDK 55, fallback: ship without OCR import and add it in a later patch

---

## Epic 3: Recipe Discovery, Scaling & Sharing

Admins can browse recipes by type, filter by categories/tags/ingredients/time, scale servings with auto-calculated ingredients, and share recipes as formatted PDFs.

### Story 3.1: Browse and Filter Recipes

As an admin,
I want to browse my recipes by type and filter by categories, tags, ingredients, and cooking time,
So that I can quickly find the recipe I'm looking for.

**FRs:** FR130, FR131, FR132, FR133
**NFRs:** NFR34

**Acceptance Criteria:**

**Given** the admin opens the recipe list
**When** recipes exist in the collection
**Then** they are displayed grouped by type (meal, main, side, soup, dessert, other) as the primary view
**And** each type section shows a count of recipes

**Given** the admin taps a type tab (e.g., "Soup")
**When** the filter is applied
**Then** only recipes of that type are displayed

**Given** the admin opens the filter panel
**When** they apply filters for categories, tags, ingredients (text match), total time, prep time, or cook time
**Then** results update to show only matching recipes
**And** filters are combinable (e.g., type "Soup" + category "Portuguese" + total time under 30 min)
**And** results return within 300ms (NFR34)

**Given** the admin types an ingredient name in the search field
**When** the search executes
**Then** the system matches against ingredient names across all recipes and returns matching recipes

**Given** the admin clears all filters
**When** the filters are reset
**Then** the full recipe list grouped by type is restored

**Technical notes:**
- Creates `recipe-type-filter.tsx` (type tab bar), `recipe-filter-panel.tsx` (expandable filter panel)
- Creates `use-recipes` hook with filter state management
- Supabase query with `family_id` + `type` index; client-side filtering for tags/ingredients/time

---

### Story 3.2: Recipe Scaling

As an admin,
I want to adjust a recipe's servings and see all ingredients scale proportionally,
So that I can cook for more or fewer people without doing mental math.

**FRs:** FR134, FR135

**Acceptance Criteria:**

**Given** the admin is viewing a recipe detail screen (e.g., "Bacalhau à Brás — serves 4")
**When** they adjust the servings to 6
**Then** all ingredient quantities recalculate proportionally (e.g., potatoes 600g → 900g, eggs 6 → 9)
**And** the scaled quantities display inline next to the original quantities

**Given** an ingredient has a non-numeric quantity (e.g., "q.b.", "a pinch")
**When** the recipe is scaled
**Then** the non-numeric quantity is displayed unchanged

**Given** the admin navigates away from the recipe and returns later
**When** the recipe detail loads
**Then** the original servings and quantities are shown (scaling is view-time only, non-destructive)

**Technical notes:**
- Creates `recipe-scaling.service.ts` with pure `scaleQuantity(originalQty, originalServings, targetServings)` function
- Creates `servings-scaler.tsx` component (+/- buttons with scaled ingredient display)
- Creates `use-recipe-scaling` hook
- Regex extraction: `/^(\d+\.?\d*)/` for numeric portion; non-numeric quantities returned unchanged

---

### Story 3.3: Share Recipe as PDF

As an admin,
I want to share a recipe as a formatted PDF via WhatsApp, email, or any other app,
So that I can send recipes to family and friends who don't use FamilyHub.

**FRs:** FR147, FR148
**NFRs:** NFR36

**Acceptance Criteria:**

**Given** the admin is viewing a recipe detail screen
**When** they tap the "Share" button
**Then** the system generates a PDF on-device containing: recipe name, image, type, ingredients with quantities, steps, servings, prep time, cook time, and cost
**And** PDF generation completes within 3 seconds (NFR36)

**Given** the PDF is generated
**When** generation completes
**Then** the Android share sheet opens immediately
**And** the admin can send the PDF via any installed app (WhatsApp, email, etc.)

**Technical notes:**
- Installs `react-native-html-to-pdf`, `react-native-share`
- Creates `recipe-pdf.service.ts` (HTML template → PDF)
- Creates `recipe-pdf-template.ts` in `src/constants/` (HTML string template)
- Runs entirely on-device — no network call

---

## Epic 4: Meal Plan Recipe Integration

Admins can link multiple recipes to a single meal plan slot, set servings per recipe, and keep free-text as a fallback — enhancing the existing V3 meal plan.

### Story 4.1: Link Recipes to Meal Plan Slots

As an admin,
I want to link recipes to my meal plan slots and set servings for each,
So that I know exactly what I'm cooking and in what quantity for each meal.

**FRs:** FR136, FR137, FR138, FR139

**Acceptance Criteria:**

**Given** the admin is viewing a meal plan slot (e.g., Monday dinner)
**When** they tap "Link Recipe"
**Then** a recipe browser opens showing the recipe collection
**And** they can select one or more recipes to link to the slot

**Given** the admin links multiple recipes to a single slot (e.g., canja as soup + green salad as side)
**When** the slot is saved
**Then** each linked recipe appears as a separate entry in the slot with its name and type

**Given** the admin links a recipe to a slot
**When** the link is created
**Then** a servings override control is available for that recipe in the slot (default: recipe's base servings)
**And** the admin can adjust servings independently for each linked recipe

**Given** the admin wants to add a meal without a recipe
**When** they type free text in the slot's name field
**Then** the free-text entry is saved alongside or instead of linked recipes

**Given** the admin wants to unlink a recipe from a slot
**When** they tap remove on a linked recipe
**Then** the link is removed without affecting the recipe itself

**Technical notes:**
- Creates `meal_slot_recipes` table + migration + RLS
- Extends `IMealPlanRepository` with link/unlink/updateServings methods
- Extends `meal-plan.store.ts` to include linked recipes per slot
- Free-text `name` field on `meal_slots` continues to work as before (V3 compatibility)

---

### Story 4.2: Recipe Browser from Meal Plan Context

As an admin,
I want the recipe browser to open filtered to relevant recipe types when I'm linking from a meal plan slot,
So that I can quickly find the right recipe for each part of a meal.

**FRs:** FR140

**Acceptance Criteria:**

**Given** the admin taps "Link Recipe" from a meal plan slot
**When** the recipe browser opens
**Then** it displays the full recipe collection with type filter tabs
**And** the admin can browse, search, and filter recipes using the same controls as the Recipes module (Epic 3)

**Given** the admin selects a recipe from the browser
**When** they confirm the selection
**Then** the recipe is linked to the meal slot and the browser closes
**And** the slot displays the newly linked recipe

**Technical notes:**
- Reuses `recipe-type-filter.tsx` and `recipe-filter-panel.tsx` from Epic 3
- Recipe browser is a modal/bottom sheet overlay on the meal plan screen
- Selection callback returns the selected recipe to the meal plan slot

---

## Epic 5: Shopping List Generation from Meal Plan

Admins can generate a shopping list from the week's meal plan — ingredients aggregated across all linked recipes, quantities summed, reviewed with checkboxes, and merged deduplicated into the existing shopping list.

### Story 5.1: Generate and Review Ingredient List

As an admin,
I want to generate a consolidated ingredient list from the week's meal plan,
So that I know exactly what I need to buy for the week's cooking.

**FRs:** FR141, FR142, FR143, FR146
**NFRs:** NFR35

**Acceptance Criteria:**

**Given** the admin is viewing the meal plan for a week with linked recipes
**When** they tap "Generate Shopping List"
**Then** the system scans all linked recipes for the week
**And** scales each recipe's ingredients to the specified servings for that meal slot
**And** sums quantities for the same ingredient across multiple recipes (case-insensitive exact name match)
**And** presents the result within 3 seconds (NFR35)

**Given** the generation completes
**When** the review screen displays
**Then** each ingredient is shown with its total quantity and a checkbox (unchecked by default)

**Given** some meal slots have only free-text entries (no linked recipes)
**When** the shopping list is generated
**Then** free-text entries are excluded — only linked recipes contribute ingredients

**Given** no recipes are linked to any slot in the week
**When** the admin taps "Generate Shopping List"
**Then** the system informs the admin that there are no linked recipes to generate from

**Technical notes:**
- Creates `shopping-list-generator.service.ts` (client-side aggregation)
- Creates `shopping-list-review.tsx` component (ingredient list with checkboxes)
- Creates `use-shopping-list-generator` hook
- Reuses `recipe-scaling.service.ts` for ingredient scaling

---

### Story 5.2: Merge Ingredients into Shopping List

As an admin,
I want to add the ingredients I need to the shopping list with correct quantities, deduplicated against what's already there,
So that I don't have to manually copy items from the meal plan to the shopping list.

**FRs:** FR144, FR145

**Acceptance Criteria:**

**Given** the admin is on the shopping list review screen with generated ingredients
**When** they check the items they need (e.g., 18 of 24 items)
**And** tap "Add to Shopping List"
**Then** only the checked items are processed

**Given** a checked ingredient already exists on the shopping list and is ticked (shopped)
**When** it is merged
**Then** the item is unticked (marked as needed again) with the new quantity

**Given** a checked ingredient already exists on the shopping list and is unticked (already needed)
**When** it is merged
**Then** the item's quantity is updated to the generated quantity

**Given** a checked ingredient does not exist on the shopping list
**When** it is merged
**Then** a new shopping item is created with the ingredient name and quantity

**Given** the merge completes
**When** the admin navigates to the Shopping module
**Then** the merged items are visible in the shopping list with correct quantities

**Technical notes:**
- Extends `IShoppingRepository` with `mergeItems(items)` method
- Dedup matching: case-insensitive exact name match against existing shopping list items
- Shopping list AI categorization (V2) runs on newly created items — existing items retain their category
