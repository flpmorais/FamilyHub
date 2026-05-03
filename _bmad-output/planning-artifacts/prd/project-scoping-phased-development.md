# Project Scoping & Phased Development

## MVP Strategy & Philosophy

**MVP Approach:** Problem-solving MVP — the minimum that eliminates the three identified household frictions (vacation packing rebuilt from scratch, supermarket memory test, invisible leftovers). V1 addresses only the first pain. Angela's willing adoption is the only gate that matters.

**Resource Requirements:** Solo developer (Filipe). No team size constraints — personal project. Scope control is the primary risk lever.

**Version Gate:** Each module version ships when the previous module is in active family use. V1 (Vacation & Leftovers) passed its gate — both modules are in willing daily use by both admins. V2 (Shopping) is next. Same gate applies at every version boundary.

## Phase 1 — V1: Vacation & Leftovers (Shipped)

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

## Phase 2 — V2: Shopping

**V2 — Shopping:** Living shared shopping list with Alexa Skill as the primary voice input channel. Items added via Alexa are auto-categorized by a cheap LLM (unknown items) or unticked (known items). The list has no lifecycle — items are ticked (shopped) or unticked (needed), carrying over indefinitely. Category-grouped display in-app. Real-time sync between admins at the supermarket. Dashboard widget shows open item count. Admin can reclassify items and manage categories. Addresses the second household pain (supermarket memory test).

**New infrastructure:** Supabase Edge Function (Alexa Skill backend), LLM API integration (AI categorization). Both within free/negligible cost tier at family scale.

**Deferred from V2:** Maid access, multiple lists, in-app voice input (nice-to-have only), cross-language deduplication.

## Phase 3 — V3–V6: Household Operations

**V3 — Meal Plan:** 7-day week grid with lunch and dinner slots. Configurable default participants per slot (which profiles eat at which day+meal). Slots can be marked "don't plan" by default (e.g., Thursday lunch — everyone eats at work). Four meal types: home-cooked (free text), eating out (with optional restaurant detail), takeaway (with optional order detail), leftovers (linked to a previous home-cooked meal in the plan). Per-meal participant overrides — add/remove profiles, enable skipped slots (public holidays), disable active slots (change of plans). Dashboard widget shows next upcoming meal; warns if no meal set or if next week is unplanned. Foundation for recipe-driven shopping list generation in V4.

**V4 — Language Learning (Greek):** Greek learning via a containerised harness API (Podman) running a LangChain/LangGraph ReAct agent with the Fluent language-learning skill, bridged to the mobile app via Cloudflare Tunnel over HTTPS (no VPN required on the phone — the tunnel is always-on). The harness adapts the Fluent skill — originally built for Claude Code — into a ReAct agent: each Fluent SKILL.md becomes a prompt template, the Python hook scripts (read-db, update-db) become LangChain tools, and the session flow is orchestrated by a LangGraph state machine with human-in-the-loop breakpoints. On first use, each admin enters their GLM 5.1 API key through an in-app setup screen; the harness API validates the key, stores it per-user within the container, and provisions the user's isolated data directory (Fluent's 6 JSON databases + session results) — no SSH, no terminal, no manual Pi access required. The Fluent agent runs learning skills (Setup, Learn, Review, Vocab, Writing, Speaking, Reading, Progress) as ReAct sessions with tools for reading/writing learner data and triggering speech on the phone. Progress tracking leverages Fluent's existing SM-2 spaced repetition algorithm and 6 interdependent JSON databases per user. The agent's responses stream to the phone; Greek text triggers TTS double-speak (el-GR). Users interact via a chat interface — typing answers or tapping a mic button (STT transcribes speech and sends it as a chat message; the agent is unaware of input method). Per-user API keys enable cost tracking per user. The containerised harness runs in Podman for both dev (this machine) and prod (Pi), configurable via environment variables. No dependency on V3 Meal Plan.

**V5 — Recipes:** Full recipe management with multi-source import and meal plan integration. Recipes are structured: name, type (meal/main/side/soup/dessert/other — static enum shared with meal plan), ingredients with quantities, step-by-step instructions, servings, prep time, cook time, cost, image, user-defined categories and tags. Four import paths: URL scraping (fetch page HTML, LLM extracts recipe), YouTube (pull transcript via YouTube Data API, LLM extracts recipe — falls back to comments if transcript has no recipe content), photo OCR (camera capture, OCR text extraction, LLM structures into recipe fields), and manual entry (full form with structured steps and ingredient rows). Browse by type as primary grouping; filter by categories, tags, ingredients, total time, prep time, cook time. Servings scaling recalculates ingredient quantities proportionally — available when browsing and when linking to a meal plan slot. Meal plan integration enhances V3: each meal slot supports multiple linked recipes (e.g., soup + main + side + dessert), with per-recipe servings override and free-text fallback for meals without a recipe. Shopping list generation: a button in the meal plan scans all linked recipes for the week, scales ingredients to specified servings, sums quantities across recipes for shared ingredients, and presents a review screen with checkboxes — checked items merge into the existing shopping list (deduplicated, quantities updated). Share any recipe as a formatted PDF via Android share sheet. Requires V3 Meal Plan as prerequisite.

**New infrastructure:** LLM API integration (recipe extraction from HTML, YouTube transcripts, and OCR text — reuses V2 LLM provider via repository pattern), YouTube Data API (transcript retrieval), OCR library (on-device text extraction from photos), PDF generation (on-device). All within free/negligible cost tier at family scale.

**V6 — Finances:** Budgets, expense tracking, private spending envelopes per admin (RLS-enforced).

**V7 — Maid:** Hours logging, billing, payment register, PDF payslips. Maid salary auto-posts as a household expense (integrates with V6 Finances).

## Vision — V8+: Intelligence Layer

AI features (receipt OCR, recipe URL/video/photo import), push notifications, background jobs, Google Drive vault, Google Calendar deadline sync. Child accounts (Aurora, Isabel) also deferred here.

## Risk Mitigation Strategy

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
- *Cloudflare Tunnel dependency (V4).* Language learning requires the phone to reach the harness API via Cloudflare Tunnel (https://api.fh-morais.party). If Cloudflare or the tunnel is down, the module is unusable. Mitigation: Cloudflare Tunnel is highly reliable for personal use (free tier). The tunnel is always-on — no VPN toggle required on the phone. Pi runs headless with Podman auto-restart. App shows clear connection status so the user knows immediately if the service is unreachable.
- *Greek TTS quality (V4).* expo-speech el-GR voice quality varies by Android device and OS version. Some devices may lack a Greek TTS voice entirely. Mitigation: test on both admins' devices before shipping. Fallback: install Google TTS engine (free) which includes high-quality Greek voices.
- *Pi availability (V4).* Raspberry Pi must be powered on and running the containerised harness API (Podman). Power outage or SD card failure kills all sessions. Mitigation: Podman restarts the container automatically on boot. LangGraph checkpointing allows session resume after restart. SD card backup strategy recommended. Dev testing on this machine via Podman provides a fast feedback loop before deploying to Pi.
- *LangChain/LangGraph harness maturity (V4).* The harness wraps the Fluent skill (originally built for Claude Code) into a LangGraph ReAct agent. Prompt templates, tool definitions, and state machine design must faithfully reproduce the Fluent skill's teaching behaviour. Mitigation: the Fluent skill's SKILL.md files provide detailed step-by-step instructions that translate directly into prompt templates and graph nodes. The Python hook scripts (read-db, update-db) are pure Python and work as-is in LangChain tools. Dev testing validates agent behaviour against expected Fluent skill output before deployment.
- *Per-user data isolation (V4).* Each user's learner data (6 JSON databases), session results, and API key must be isolated within the container. Mitigation: the harness API enforces per-user data directories at the application level. No OS-level user isolation required — isolation is by data directory path within the container.
- *API key management (V4).* Each user's GLM 5.1 API key is stored per-user within the container. If a key is revoked or expires, the user must re-enter it in the app. Mitigation: the app detects an invalid key (harness API validation on configuration) and prompts for re-entry. Per-user keys enable cost tracking per user. If a user loses access to their GLM 5.1 account, they generate a new key and re-configure — no data loss occurs (progress is stored in per-user JSON databases within the container, not in the LLM provider account).
- *V4/V5 independence.* V4 Language Learning has no dependency on V3 Meal Plan — unlike the previous V4 Recipes. V5 Recipes still depends on V3.
- *URL scraping fragility (V5).* Recipe websites change their HTML structure without notice — LLM extraction may fail or produce incomplete results. Mitigation: LLM-based extraction is inherently adaptive (no hard-coded selectors). Failed extraction presents an error; the admin can retry or fall back to manual entry. No recipe is saved without admin review.
- *YouTube transcript availability (V5).* Not all YouTube videos have transcripts — auto-generated captions may be absent or inaccurate, especially for non-English content. Mitigation: fallback to video comments. If neither yields a recipe, the system reports extraction failure clearly. Admin can fall back to manual entry.
- *OCR accuracy (V5).* Handwritten recipes and low-quality photos may produce garbled OCR text, leading to poor LLM extraction. Mitigation: admin always reviews and edits extracted recipes before saving. The LLM structures whatever text it receives — partial extraction is better than none.
- *Ingredient deduplication complexity (V5).* Different recipes may name the same ingredient differently (e.g., "onion" vs "yellow onion" vs "cebola"). Shopping list generation sums by exact ingredient name match — no fuzzy matching or cross-language dedup. Mitigation: accepted limitation. Admin can manually merge items on the shopping list. Same trade-off as V2 Alexa cross-language dedup.
- *LLM cost scaling (V5).* Recipe imports use larger LLM prompts than V2 categorization (full HTML pages, transcripts). Mitigation: use cheapest capable model. Cost cap NFR40 (€2/month combined) monitored. At family scale, import volume is low (a few recipes per week).
- *Supabase free tier limits.* Mitigation: family-scale traffic is negligible. Free tier monitored; paid upgrade is a defined fallback (low cost, no architecture change needed).

---
