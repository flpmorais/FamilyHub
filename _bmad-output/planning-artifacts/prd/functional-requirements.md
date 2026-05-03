# Functional Requirements

## Identity & Access Management

- **FR1:** Admin can sign in to the app using a Google account
- **FR2:** System links a Google account to an existing family Profile automatically on first sign-in
- **FR3:** Admin can invite another user by Google email and assign them the Admin role
- **FR4:** Admin can revoke access for any Maid user account

## Profile Management

- **FR5:** Admin can create a family Profile with a name and avatar
- **FR6:** Admin can edit any family Profile's name and avatar
- **FR7:** Admin can delete a family Profile
- **FR8:** System maintains Profiles independently of User Accounts — Profiles exist before and without associated accounts

## Vacation Management

- **FR9:** Admin can create a vacation with title, cover image, location, dates, and participant selection
- **FR10:** Admin can edit a vacation's title, image, location, dates, and participant list
- **FR11:** Admin can delete a vacation
- **FR12:** Admin can advance a vacation through its lifecycle: Planning → Upcoming → Active → Completed
- **FR13:** Admin can pin or unpin any vacation to the household dashboard
- **FR14:** System applies a pin state household-wide — pinned vacations appear on all Admin devices simultaneously
- **FR15:** System supports two or more simultaneously pinned vacations

## Booking Tasks

- **FR16:** System generates standard booking tasks when a vacation is created (Flights 90d, Hotel 60d, Rent-a-car 30d, Insurance 14d) with pre-defined urgency deadlines relative to departure
- **FR17:** Admin can add custom tasks to a vacation with a due date
- **FR18:** Admin can mark a booking task as complete
- **FR19:** Admin can create a Document Check task that validates family member documents against trip departure date
- **FR20:** System can generate a child task (e.g., passport renewal) from a Document Check task when a document is found to be expiring before the trip ends
- **FR21:** Vacation dashboard widget displays all incomplete booking tasks sorted by next due date

## Packing List

- **FR22:** Admin can add a packing item with title, category, tag(s), profile assignment, quantity, and status
- **FR23:** Admin can edit any packing item's fields
- **FR24:** Admin can delete any packing item
- **FR25:** Admin can update a packing item's status (New, Buy, Ready, Issue, Last-Minute, Packed)
- **FR26:** Admin can filter the packing list by assigned Profile
- **FR27:** System propagates packing list changes from one Admin to all other connected Admin devices in real-time

## Categories, Tags & Templates

- **FR28:** Admin can create, edit, and delete packing item categories with a name and icon
- **FR29:** Admin can create, edit, and delete item tags
- **FR30:** Admin can create a reusable packing template composed of items with profile assignments, categories, quantities, and tags
- **FR31:** Admin can tag a template for cross-cutting classification (e.g., "Beach", "All Trips")
- **FR32:** Admin can apply one or more templates when creating a vacation; items assigned to profiles not attending the trip are excluded from injection
- **FR33:** Admin can selectively reuse individual items or categories from past completed vacations

## Dashboard

- **FR34:** Admin can view a home dashboard surfacing pinned vacation widgets, the Leftovers widget (V1), and module entry points
- **FR35:** Vacation widget displays the vacation name, participant count, and incomplete booking tasks sorted by next due date
- **FR36:** Admin can navigate from a dashboard widget to the full vacation detail view

## Data Sync & Updates

- **FR37:** System propagates data changes from one Admin to all other connected Admin devices in real-time
- **FR38:** System resolves concurrent Admin edit conflicts using last-write-wins without presenting conflict dialogs to the user
- **FR39:** System checks for a newer app version on launch and notifies the user non-blockingly if an update is available

## Data Privacy (V6+)

- **FR40:** System ensures that one Admin's private spending envelope transactions are never visible to any other user — enforced at the data layer, not the display layer (V6)
- **FR41:** System partitions Maid account data such that a new Maid account cannot access any prior Maid's records (V7)
- **FR42:** System enforces all privacy boundaries through database-level access control policies, not application-level filtering (V6+)

## Leftovers Management (V1)

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

## Shopping Management (V2)

### Shopping List Core

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

### AI Categorization

- **FR66:** When a new item is added that has never existed in the shopping list, the system auto-categorizes it using an AI classification service and assigns the returned category automatically
- **FR67:** When an item is added that already exists in the shopping list (ticked), the system unticks it without calling the LLM — the existing category is preserved
- **FR68:** Admin can reclassify any item to a different category; the system persists this reclassification as the item's permanent category for future additions
- **FR69:** Admin can create, edit, and delete shopping categories
- **FR70:** System ships with a default set of shopping categories: Dairy, Meat, Fish, Fruit, Vegetables, Bakery, Frozen, Pantry, Beverages, Snacks, Spices & Condiments, Eggs, Cleaning, Hygiene, Baby, Other
- **FR71:** If the LLM is unreachable, the item is added under the "Other" category — categorization failure never blocks item creation

### Alexa Skill Integration

- **FR72:** A custom Alexa Skill allows users to add items to the FamilyHub shopping list by voice command (e.g., "Alexa, tell FamilyHub to add olive oil")
- **FR73:** The Alexa Skill supports removing items from the shopping list by voice (e.g., "Alexa, tell FamilyHub to remove olive oil")
- **FR74:** The Alexa Skill supports querying whether an item exists on the list (e.g., "Alexa, do I have milk on the FamilyHub list?")
- **FR75:** The Alexa Skill supports querying the last item added (e.g., "Alexa, what was the last item I added to FamilyHub?")
- **FR76:** The Alexa Skill supports setting a quantity note on an item (e.g., "Alexa, tell FamilyHub to set the quantity of milk to 3 packs")
- **FR77:** The Alexa Skill communicates with FamilyHub's backend via a dedicated API endpoint authenticated with a household-level API key
- **FR78:** If the Alexa Skill receives a duplicate item (already unticked on the list), it responds with a confirmation that the item is already on the list without creating a duplicate

### Deduplication

- **FR79:** When an admin adds an item via the app that matches an existing ticked item (case-insensitive), the system prompts to untick the existing item rather than creating a duplicate
- **FR80:** When an admin adds an item that matches an existing unticked item, the system flags the duplicate and prevents creation

## Meal Plan Management (V3)

### Meal Plan Configuration

- **FR81:** Admin can configure default participants per meal slot — assigning which family profiles eat at each day-of-week + meal combination (e.g., Filipe + Angela + Aurora for all dinners, Filipe + Angela for weekday lunches)
- **FR82:** Admin can mark any day-of-week + meal slot as "don't plan" by default (e.g., Thursday lunch — everyone eats at work/school)
- **FR83:** System applies the configured defaults automatically when a new meal plan week is created — pre-populating participant lists and skipping "don't plan" slots

### Meal Plan Core

- **FR84:** Admin can view the meal plan for any week — current, past, or future — displayed as a 7-day grid with lunch and dinner rows
- **FR85:** Admin can navigate between weeks: previous, current, next, and jump to any specific week
- **FR86:** Admin can create a meal entry for any lunch or dinner slot with a free-text name (e.g., "Grilled chicken with rice")
- **FR87:** Admin can edit any existing meal entry's name, type, detail, or participants
- **FR88:** Admin can delete a meal entry from any slot
- **FR89:** Admin can set a meal type for each entry: home-cooked, eating out, takeaway, or leftovers
- **FR90:** For eating out or takeaway meals, admin can add an optional free-text detail (restaurant name, order description)
- **FR91:** System propagates meal plan changes from one Admin to all other connected Admin devices in real-time

### Participant Management

- **FR92:** Admin can override the default participants for any specific meal — adding or removing profiles from that meal only, without changing the global defaults
- **FR93:** Admin can enable a normally-skipped slot for a specific week (e.g., a public holiday falls on a day normally marked "don't plan") — the slot becomes plannable with the default participants for that meal type
- **FR94:** Admin can disable a normally-enabled slot for a specific week (e.g., plans changed, family won't be eating that meal) — the slot is marked as skipped and any planned meal is removed

### Leftovers Integration

- **FR95:** Admin can set a meal's type to "leftovers" and link it to a previous home-cooked meal in the same or a prior week's plan — the slot displays the linked meal's name with a visual indicator (e.g., "Leftovers — Lasagna")
- **FR96:** Admin can adjust the meal plan when leftover quantities don't match expectations — unlinking a leftovers entry and replacing it with a new meal, or converting a home-cooked meal to leftovers if surplus remains

### Dashboard Widget

- **FR97:** Dashboard displays a Meal Plan widget showing the next upcoming meal's name, type, and participants
- **FR98:** If the next upcoming meal slot has no meal set and the slot is not marked as skipped, the widget displays a warning indicating no meal is planned
- **FR99:** If it is the last day of the current planned week (Sunday) and the following week has no meals planned, the widget displays a planning reminder

## Language Learning — Harness API (V4)

- **FR100:** App can start a new learning session by calling the harness API with a userId and skill parameter — the API creates a LangGraph state machine for the specified Fluent skill, loads the user's learner data, and returns a session token (V4)
- **FR101:** App can resume an existing session for a user by calling the harness API — the API rehydrates the LangGraph state from the checkpoint and returns the session token (V4)
- **FR102:** App can end an active session by calling the harness API — the API persists final learner data (Fluent's 6 JSON databases), writes a session result file, and terminates the session (V4)
- **FR103:** App can query session status for a user — the API returns whether an active session exists and which skill is running (V4)
- **FR104:** App sends user messages to the harness API and receives streamed responses — each response contains the agent's reply text and optional structured events (e.g., speak, skill-complete) (V4)

## Language Learning — Chat Interface & TTS (V4)

- **FR105:** App displays the learning session as a chat interface — the agent's messages appear as chat bubbles, the user's typed or spoken input appears as user bubbles (V4)
- **FR106:** When the agent's response contains Greek text, the app speaks each phrase aloud twice via TTS (el-GR) with a 0.8-second pause between repetitions and a 1.2-second pause between distinct phrases; multiple phrases in a single response are spoken in sequence (V4)
- **FR107:** App displays Greek text in a visually distinct area alongside TTS playback so the user can read while listening (V4)

## Language Learning — Voice Input (V4)

- **FR108:** App provides a mic button that captures spoken Greek via Android's built-in speech-to-text (el-GR locale), transcribes it, and sends the transcript as a user message to the harness API — no enter key required (V4)
- **FR109:** The harness receives voice-originated text identically to keyboard-originated text — the input method is invisible to the Fluent skill (V4)

## Language Learning — Skill System (V4)

- **FR110:** App presents a skill selection screen with available Fluent learning skills: Setup (one-time onboarding), Learn (default), Review, Vocab, Writing, Speaking, Reading, Progress — each starts a new session with the corresponding skill parameter (V4)
- **FR111:** Only one session per user is active at any time — selecting a different skill ends the existing session and starts a fresh one; resume is only offered within the same skill (V4)

## Language Learning — API Key Configuration (V4)

- **FR112:** When a user enters the Language Learning module and their learning profile does not have `api_key_configured` set to true, the app presents an API key setup screen — the user cannot access the skill menu or start a session until the key is configured (V4)
- **FR113:** App provides an input for the user to enter their GLM 5.1 API key; on submission, the app sends the key to the harness API over HTTPS (`POST /auth/configure?userId=X`), which validates the key by making a test API call, stores the key per-user within the container, and provisions the user's isolated data directory (Fluent's 6 JSON databases + session results) — no SSH or terminal access required (V4)
- **FR114:** Once the API key is validated and the user's data directory is provisioned, the harness API returns success; the app creates a learning profile in Supabase with `api_key_configured = true` and navigates the user to the skill selection screen (V4)

## Language Learning — User Isolation & Session Lifecycle (V4)

- **FR115:** Each admin has an isolated data directory within the container containing their own Fluent learner data (6 JSON databases), session results, and API key — one user's learning data, session history, and API key are never visible to another user (V4)
- **FR116:** App displays connection status to the harness API — connected, disconnected, or reconnecting — so the user knows immediately if the service is unreachable (V4)
- **FR117:** When the harness sends a skill-complete event in the streamed response, the app automatically calls the session end endpoint and returns the user to the skill selection screen (V4)
- **FR118:** On first use, the app auto-starts a session with the Setup skill — no other skills are available until setup completes and the learner profile is created in Fluent's database (V4)

## Recipe Management (V5)

### Recipe CRUD

- **FR119:** Admin can create a recipe with: name, type, ingredients (each with name and quantity), step-by-step instructions (ordered list of individual steps), servings, prep time (minutes), cook time (minutes), cost (manual entry), image, categories, and tags (V5)
- **FR120:** Admin can edit any recipe's fields — name, type, ingredients, steps, servings, times, cost, image, categories, tags (V5)
- **FR121:** Admin can delete a recipe (V5)
- **FR122:** Recipe type is a static enum shared with the meal plan: meal, main, side, soup, dessert, other — defined at development time, not user-configurable (V5)
- **FR123:** Admin can create, edit, and delete recipe categories — user-defined at runtime (V5)
- **FR124:** Admin can create, edit, and delete recipe tags — user-defined at runtime (V5)

### Recipe Import — URL

- **FR125:** Admin can import a recipe by pasting a URL; the system fetches the page HTML and sends it to an LLM to extract recipe fields (name, ingredients with quantities, steps, servings, prep time, cook time, image URL) (V5)
- **FR126:** After LLM extraction, the system presents the extracted recipe for admin review and editing before saving — no recipe is saved without admin confirmation (V5)

### Recipe Import — YouTube

- **FR127:** Admin can import a recipe by pasting a YouTube URL; the system retrieves the video transcript via YouTube Data API and sends it to an LLM to extract recipe fields (V5)
- **FR128:** If the transcript contains no extractable recipe content, the system retrieves the video's top-level comments and sends them to the LLM as a fallback source (V5)
- **FR129:** If neither transcript nor comments yield a recipe, the system informs the admin that extraction failed — no empty recipe is created (V5)

### Recipe Import — Photo OCR

- **FR130:** Admin can import a recipe by capturing a photo (camera) or selecting an image from the gallery; the system runs OCR to extract text, then sends the text to an LLM to structure it into recipe fields (V5)
- **FR131:** After OCR + LLM structuring, the system presents the extracted recipe for admin review and editing before saving (V5)

### Recipe Import — Manual Entry

- **FR132:** Admin can create a recipe via manual entry with a structured form: name, type, ingredients (add/remove/reorder rows, each with name and quantity), steps (add/remove/reorder, each a separate text input), servings, prep time, cook time, cost, image (camera capture or gallery selection), categories, tags (V5)

### Recipe Browse & Search

- **FR133:** Recipe list displays recipes grouped by type as the primary browsing view (V5)
- **FR134:** Admin can filter recipes by: categories, tags, ingredients (text match against ingredient names), total time (prep + cook), prep time, cook time (V5)
- **FR135:** Admin can search recipes by ingredient — the system matches the search term against ingredient names across all recipes and returns matching recipes (V5)
- **FR136:** Filters are combinable — admin can apply multiple filters simultaneously (e.g., type "Soup" + category "Portuguese" + total time under 30 min) (V5)

### Recipe Scaling

- **FR137:** Admin can adjust a recipe's servings when viewing it; all ingredient quantities recalculate proportionally based on the ratio of new servings to original servings (V5)
- **FR138:** Scaling is non-destructive — the original recipe retains its saved servings and quantities; scaling is applied as a view-time adjustment (V5)

### Meal Plan Integration (V5 Enhancement on V3)

- **FR139:** Admin can link one or more recipes to a single meal plan slot — each linked recipe appears as a separate entry within the slot (e.g., a soup, a main, and a dessert in one dinner slot) (V5)
- **FR140:** Admin can set the servings for each linked recipe independently within a meal slot — ingredient scaling follows the specified servings (V5)
- **FR141:** Admin can add a free-text entry to a meal slot alongside or instead of linked recipes — free-text is the fallback when no recipe exists or the admin lacks time to create one (V5)
- **FR142:** Admin can remove a linked recipe from a meal slot without affecting the recipe itself (V5)
- **FR143:** When linking a recipe to a meal slot, the system opens the recipe browser filtered to the slot's meal type context — admin can browse and select from the full recipe collection (V5)

### Shopping List Generation

- **FR144:** Admin can tap "Generate Shopping List" in the meal plan view; the system scans all linked recipes for the displayed week, scales each recipe's ingredients to the specified servings for that meal, and produces a consolidated ingredient list (V5)
- **FR145:** Shopping list generation sums quantities for the same ingredient across multiple recipes (e.g., onion: 1 from recipe A + 2 from recipe B = 3 onions) (V5)
- **FR146:** The system presents a review screen showing each ingredient, its total quantity, and a checkbox — all items are unchecked by default (V5)
- **FR147:** Admin checks the items they need and taps "Add to Shopping List"; only checked items are added (V5)
- **FR148:** Checked items merge into the existing shopping list deduplicated: if the ingredient already exists and is ticked (shopped), it is unticked with the new quantity; if already unticked, the quantity is updated; if not present, a new item is created (V5)
- **FR149:** Free-text meal entries (meals without linked recipes) are excluded from shopping list generation — only linked recipes contribute ingredients (V5)

### Recipe Sharing

- **FR150:** Admin can share any recipe as a PDF; the system generates a formatted PDF on-device containing the recipe name, image, type, ingredients with quantities, steps, servings, prep time, cook time, and cost (V5)
- **FR151:** After PDF generation, the system opens the Android share sheet so the admin can send the PDF via any installed app (WhatsApp, email, etc.) (V5)

### Recipe Sync

- **FR152:** System propagates recipe changes (create, edit, delete) from one Admin to all other connected Admin devices in real-time (V5)

## Future Module Capabilities (V6–V7)

- **FR153:** Admin can record household income and expenses against budget categories and envelopes (V6)
- **FR154:** Maid can log daily work hours with a single-tap interaction (V7)
- **FR155:** Admin can generate a billing statement and payslip for the Maid for any period (V7)
- **FR156:** Maid salary auto-posts as a household expense in the Finances module (V7)

---
