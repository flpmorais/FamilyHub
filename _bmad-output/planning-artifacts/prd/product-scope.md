# Product Scope

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
