# User Journeys

## Journey 1: Filipe — Planning the Summer Holiday (Primary Admin, Core Path)

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

## Journey 2: Angela — Contributing from the Kitchen (Co-Admin, Collaborative Path)

Angela is packing the kids' bag on Wednesday evening. She opens FamilyHub, navigates to the Algarve packing list, filters by **Isabel**. She sees 8 items assigned to Isabel. She ticks 5 as **Packed**, marks the sunscreen as **Buy**, adds a new item: "Baby wipes — Isabel — Essentials — qty: 2 — New". She closes the app.

On his phone, Filipe's list updates in real-time. He sees the new item, the ticked items, the sunscreen flagged as Buy. No message sent. No coordination call. The list is just current.

**Capabilities revealed:** real-time sync between admins, profile-filtered list view, item creation and status update by any admin.

---

## Journey 3: Filipe — First-Time Setup (Admin Operations, V1)

Filipe installs the APK, signs in with Google. App is empty.

**Step 1 — Create Profiles.** Settings → Profiles → Add. He creates four profiles: Filipe (linked to his Google account), Angela (no account yet), Aurora (no account), Isabel (no account). Each has a name and avatar. Profiles exist independently of accounts — Aurora and Isabel are full family members in the data model from day one.

**Step 2 — Add Angela.** Settings → Users → Add. He enters Angela's Google email, assigns Admin role. She installs the APK, signs in, her account automatically links to her Profile. She sees everything Filipe sees.

**Capabilities revealed:** profile CRUD (name + avatar, decoupled from accounts), account-to-profile linking on first sign-in, admin user addition.

---

## Journey 4: Filipe — Configuring Categories, Tags, and Templates (Setup & Configuration)

Before planning the first vacation, Filipe sets up the app's vocabulary.

**Categories:** Settings → Packing Categories. No defaults. He creates: Essentials, Clothes, Toiletries, Documents, Kids, Electronics, Beach. Each gets an icon.

**Tags:** He creates tags for cross-cutting concerns: Fragile, Buy Before Trip, Hand Luggage Only, Shared Item. Zero or multiple tags per item.

**Templates:** He creates "Beach Family" — Sunscreen (qty: 3, assigned to family), Swimwear (per person), Beach Towels (qty: 4), Sand Toys (assigned to Aurora + Isabel). Tagged "Beach", "Summer". He creates "Essential Documents" — Passports (check-documents item type), Health Insurance Cards, EHIC Cards. Tagged "All Trips".

When creating the Algarve vacation, he selects both templates. Items are merged, deduplicated, filtered by participants, and injected into the packing list as the starting point.

**Capabilities revealed:** user-defined categories (name + icon, no defaults), user-defined tags, template CRUD (items with profile + category + quantity + tags), template tagging, participant-filtered template application at trip creation.

---

## Journey 5: Filipe — Managing Leftovers (Daily Fridge Loop, V1)

It's Sunday evening. Filipe made lasagna — enough for the family plus leftovers. He opens FamilyHub, taps the Leftovers module, and adds: "Lasagna — 4 doses — 5 days". The item appears in the list immediately.

Monday. Angela cooked coq au vin. She adds: "Coq au vin — 3 doses — 4 days" (she overrides the default 5-day expiry because it has cream).

Tuesday morning. Filipe checks the dashboard. The Leftovers widget reads: **2 meals · 7 doses — Coq au vin expires Thursday**. He taps the widget, sees the full list. He reheated lasagna last night — taps "Eaten" twice on the lasagna row. Remaining: 2 doses.

Thursday. The dashboard widget now shows the coq au vin highlighted in red — it expires today. Filipe opens the list. The coq au vin sits at the top, visually flagged. Nobody wants it. He taps "Throw out" — all 3 remaining doses are discarded at once. The item closes and moves below the active section.

Friday. The lasagna still has 2 doses left, expiring Sunday. The widget reads: **1 meal · 2 doses — Lasagna expires Sunday**. Filipe eats one dose Friday, one Saturday. Two taps across two days. The lasagna closes naturally — all doses eaten, zero waste.

Scrolling down in the full list, Filipe can see the closed items: lasagna (4 eaten, 0 thrown), coq au vin (0 eaten, 3 thrown). A quiet record of what got used and what didn't.

**Capabilities revealed:** leftover CRUD with name/doses/expiry override, dashboard widget (meal count + dose count + nearest expiry), dose-level eaten tracking (one tap per dose), bulk throw-out of remaining doses, automatic close on zero remaining, expired item visual flagging, full list with active-first sorting by expiry, closed items visible with history, infinite scroll pagination.

---

## Journey 6: Filipe — Adding Items from the Kitchen (Alexa Voice Input, V2)

It's Wednesday evening. Filipe is cooking dinner and reaches for olive oil — nearly empty. Without touching his phone, he says: *"Alexa, tell FamilyHub to add olive oil."* The Alexa Skill sends "olive oil" to FamilyHub's backend. The system checks the shopping list — olive oil exists but is ticked (shopped last week). The system unticks it. No LLM call needed.

Still cooking. He realises there's no coriander left. *"Alexa, tell FamilyHub to add coriander."* Coriander has never been on the list before. The system calls a cheap LLM with the item name and the category list. The LLM returns "Vegetables". Coriander appears in the shopping list under Vegetables, unticked.

Angela walks in: "We need diapers." Filipe: *"Alexa, tell FamilyHub to add diapers."* Diapers exist, ticked. Unticked. Done. Three items added in 30 seconds, hands never left the stove.

Later, Filipe opens the app to check. The dashboard widget reads: **12 items**. He taps through to the full list. Items are grouped by category — Dairy (3), Vegetables (2), Cleaning (1), Baby (1), etc. He notices the LLM classified "coriander" under Vegetables — correct. Last week it classified "toilet paper" under Hygiene, but he'd prefer it under Cleaning. He taps the item, reclassifies it. The system remembers: toilet paper is Cleaning from now on.

He also notices "azeite" and "olive oil" both on the list — Alexa sometimes captures items in Portuguese, sometimes English. He deletes the duplicate manually. The system has no automatic cross-language dedup — that's a known limitation he accepts.

*"Alexa, do I have milk on the FamilyHub list?"* — "Yes, milk is on your list." — *"Alexa, set the quantity of milk to 3 packs."* — Quantity updated. It's a free-text note attached to the item, not a structured number.

**Capabilities revealed:** Alexa Skill integration (add, remove, query, set quantity), AI categorization via cheap LLM for unknown items, automatic untick for known items, category memory (reclassification persists), free-text quantity field, dashboard widget (open item count).

---

## Journey 7: Angela — Saturday Supermarket Run (Shopping at the Store, V2)

Saturday morning. Angela grabs her phone and heads to Continente. She opens FamilyHub, taps the Shopping widget. **14 items** unticked.

The list is grouped by category. She starts in Fruit & Vegetables — sees bananas, coriander, tomatoes. She ticks each as she drops them in the cart. On Filipe's phone at home, the items tick in real-time.

She reaches Dairy — milk (3 packs), butter, yoghurts. She ticks all three. Moves to Meat — chicken breast. Ticked. Cleaning — trash bags, laundry detergent. Ticked.

Two items she can't find at Continente: a specific brand of cereal and a particular cleaning product. She leaves them unticked. They'll carry over — she'll get them at Auchan next week.

She finishes shopping: 12 items ticked, 2 remaining. The dashboard widget now reads: **2 items**. The list is never "completed" or "archived" — it's always alive. Ticked items stay visible (greyed out) below unticked ones so she can see what was already bought.

Back home, Filipe checks the app. He sees what Angela bought, what's still pending. No coordination needed — the list is the single source of truth.

**Capabilities revealed:** living list (no lifecycle/status), category-grouped display, real-time sync between admins at supermarket, ticked items visible but greyed, unticked items carry over indefinitely, dashboard widget shows open count only.

---

## Journey 8: Filipe — Planning the Week's Meals (Meal Plan, V3)

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

## Journey 9: Filipe & Angela — Greek Learning with Voice (Language Learning, V4)

Filipe opens FamilyHub and taps the Language Learning module for the first time. The app checks Supabase for his learning profile — none exists. The app connects to the harness API via Cloudflare Tunnel (`https://api.fh-morais.party`) — no VPN required. The connection status shows green.

Since no API key is configured for Filipe yet, the app shows the setup screen instead of the skill menu. The screen explains: "To use Language Learning, you need a GLM 5.1 API key. This key is stored securely and used only for your learning sessions." Filipe taps "I have an API key" and pastes his key. The app sends the key to the harness API via HTTPS (`POST /auth/configure`), which validates the key with a test API call, stores it per-user within the container, and provisions Filipe's isolated data directory (Fluent's 6 JSON databases + session results directory). The app creates a learning profile in Supabase with `api_key_configured = true`.

Filipe's first session auto-starts with the Setup skill. A chat interface opens. The Fluent agent (a ReAct agent with tools for reading and writing learner data) greets Filipe and asks about his target language, current level, and learning goals. Filipe types his answers in the chat. After the onboarding conversation, the agent creates his learner profile in the 6 JSON databases and signals setup-complete. The app ends the session and navigates Filipe to the skill selection screen.

Filipe taps Learn. The app calls `POST /session/start?userId=filipe&skill=learn`. The harness API creates a LangGraph state machine, loads Filipe's learner data from the 6 JSON databases, and returns a session token. The chat interface opens with a streaming response.

The Fluent agent presents an exercise. The streamed response contains Greek text: "Καλημέρα" and "Με λένε". The chat displays the Greek text in a bubble, and the phone speaks each phrase aloud twice — "Καλημέρα", pause, "Καλημέρα", longer pause, "Με λένε", pause, "Με λένε". Filipe reads the exercise in the chat and hears the new vocabulary twice each.

He types his answer in the chat input. The agent evaluates it — incorrect. The response contains the correction with Greek text, which the phone speaks twice: "Με λίνε Φίλιππε". Filipe tries again, this time correctly. The correct answer is spoken twice regardless of whether he got it right or wrong.

Next exercise. Instead of typing, Filipe taps the mic button on his phone. He speaks his answer in Greek. Android's speech-to-text transcribes it and the app sends the transcript as a user message to the harness API — no enter key needed. The agent receives plain text and evaluates it exactly as if Filipe had typed it. The agent is unaware of which input method was used.

Mid-lesson, Filipe decides he wants vocabulary drills. He navigates to the skill menu and taps Vocab. The app calls `POST /session/start?userId=filipe&skill=vocab`. The harness API ends the existing Learn session (persisting progress to the 6 JSON databases) and starts a fresh Vocab session. Switching skills always starts fresh.

After fifteen minutes of flashcards, the Fluent agent signals skill-complete in its streamed response. The app calls `POST /session/end`, the harness persists final progress, and Filipe returns to the skill selection screen.

The next evening, Angela opens Language Learning. No learning profile exists for her either. She sees the same setup screen — "Configure your GLM 5.1 API key." Angela enters her own key (each user has their own key, enabling per-user cost tracking). The harness API stores her key separately and provisions her isolated data directory. Her API key, session history, and progress are completely isolated from Filipe's. The app creates her learning profile with `api_key_configured = true`.

Angela taps Learn. Her session runs in complete isolation — separate data directory, separate Fluent learner databases, separate session history. The chat interface opens. The Fluent agent calls its speak tool with the phrase "Γεια σου". She hears it twice. She taps the mic, speaks her answer, the transcript goes to the harness as a chat message. For Angela, the mic is how she interacts — she rarely touches the keyboard.

The next morning, Filipe opens the app on the bus. `GET /session/status?userId=filipe` returns an active session for Learn from last night — he closed the app mid-lesson. Learn is highlighted with a "Resume" badge. He taps Learn and sees "Resume" or "New Session". He taps Resume — `POST /session/resume?userId=filipe`. The LangGraph state is rehydrated from the checkpoint, the chat interface loads with the conversation history, and Filipe picks up mid-lesson through his earbuds. If he'd selected a different skill, the old session would have been ended.

**Capabilities revealed:** First-use API key setup gate (GLM 5.1 key submitted in-app, validated by harness API, stored per-user within container, no SSH or terminal access required), containerised harness API (Podman) running a LangChain/LangGraph ReAct agent with Fluent skill tools over HTTPS via Cloudflare Tunnel (no VPN, no public IP, always-on), chat interface for learning sessions (agent messages as chat bubbles, user input as text or voice), automatic data directory provisioning on first API key configuration (isolated Fluent 6 JSON databases per user), per-user API keys enabling cost tracking per user, Fluent skill selection screen available after setup (Setup, Learn, Review, Vocab, Writing, Speaking, Reading, Progress), one session at a time per user (switching kills existing), resume only within same skill, session persistence via LangGraph checkpointing (survives app close), TTS double-speak (el-GR, each phrase spoken twice with pause, multiple phrases in sequence), mic button as keyboard replacement (STT → chat message, agent unaware of input method), agent-triggered speech via Fluent's speak tool (exercises and correct answers spoken), connection status visibility, configurable dev/prod deployment (Podman + env vars).

---

## Journey 10: Filipe — Building a Recipe Collection and Cooking from the Plan (Recipes, V5)

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

## Journey Requirements Summary

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
| 9. Greek learning with voice (V4) | V4 Language Learning | First-use API key setup gate (GLM 5.1 key submitted in-app, validated by harness API, stored per-user within container over HTTPS, no SSH or terminal access required), containerised harness API (Podman) running LangChain/LangGraph ReAct agent with Fluent skill tools over HTTPS via Cloudflare Tunnel (start/resume/end/status with skill parameter), chat interface for learning sessions (agent messages as chat bubbles, user input as text or voice), automatic data directory provisioning on first API key configuration (isolated Fluent 6 JSON databases per user), per-user API keys enabling cost tracking per user, Fluent skill selection (Setup/Learn/Review/Vocab/Writing/Speaking/Reading/Progress) available after setup, one session at a time, resume within same skill, session persistence via LangGraph checkpointing (survives app close), TTS double-speak (el-GR) triggered by agent speak tool, mic as keyboard replacement (STT → chat message, agent unaware of input method), agent-triggered speech on exercises and answers, connection status visibility, configurable dev/prod deployment (Podman + env vars) |
| 10. Recipe collection & meal plan cooking (V5) | V5 Recipes | Recipe CRUD (name, type, steps, ingredients+quantities, servings, prep/cook time, cost, categories, tags, image), static types (meal/main/side/soup/dessert/other), import from URL (LLM parsing), YouTube import (transcript + LLM), photo OCR import (camera + OCR + LLM), manual entry (structured steps + ingredient rows), user-defined categories + tags, browse by type, filter (categories/tags/ingredients/time), ingredient search, servings scaling (proportional ingredient recalc), meal plan integration (multiple recipes per slot, per-recipe servings, free-text fallback), shopping list generation (ingredient aggregation, quantity summing, review screen with checkboxes, dedup merge into shopping list), PDF share via Android share sheet |

---
