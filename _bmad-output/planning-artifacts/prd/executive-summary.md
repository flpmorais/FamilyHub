# Executive Summary

FamilyHub is a personal family management mobile app built by Filipe Morais exclusively for the Morais household. It is not a commercial product. It exists to permanently eliminate three recurring failures in family life: vacation packing lists rebuilt from scratch before every trip, items forgotten at the supermarket, and leftovers spoiling unseen in the fridge.

The app is built for a specific household structure: two symmetric admin users (the couple), two child profiles that will eventually become accounts, and a scoped employee user (the maid). It consolidates vacation planning, shopping, leftovers tracking, household finances, maid billing, recipes, and meal planning into a single integrated system — built in Portuguese, with no generic defaults, and no design compromises for a hypothetical broader audience.

V1 shipped Vacation and Leftovers together — both modules are in active family use. Remaining modules are delivered incrementally across six versions (V2 Shopping → V7 Maid), each shipping one complete, usable module. AI features and background jobs are explicitly post-V7. The backend runs on Supabase (free tier). Every external service is accessed through a swappable repository pattern interface. The app is distributed as a private APK — no app store involved.

## What Makes This Special

**One family, perfectly served.** No market fit to validate, no onboarding funnel, no generic defaults. Every design decision — budget category names, shopping list sections, UI language, the maid's purpose-built experience, private spending envelopes for each spouse — reflects the exact reality of this household.

**Modules that integrate meaningfully.** Vacation status adjusts household budget proportionally. Maid salary auto-posts as a household expense. Recipes generate a deduplicated shopping list from the meal plan. Leftovers surface in meal planning before expiry. Shopping list integrates with meal planning and recipes. Language learning bridges OpenCode on a Raspberry Pi with the mobile app via a Cloudflare Tunnel — Greek phrases spoken aloud on the phone via WebSocket, voice responses captured via STT. No VPN needed on the phone; the tunnel keeps the connection always-on. Each user configures their OpenCode Zen/Go API key on first use; the session service provisions their isolated environment and writes the key securely — no SSH, no terminal, no manual Pi access required. The system behaves as a coherent whole, not a collection of features.

**Built by the person who lives the problem.** The builder's prior OutSystems app validated the vacation module concept but was constrained by licensing. FamilyHub is the unconstrained successor — full-stack, properly architected, designed to grow with the family over years.

**Vendor-independent by design.** The repository pattern ensures no vendor lock-in. Replacing Supabase, Google Drive, or any other service means rewriting one service module — nothing else.

**Voice-first where it matters.** The shopping list integrates with Amazon Alexa via a custom Skill — items are added hands-free from the kitchen. AI categorization (cheap LLM) assigns items to shopping categories automatically, learning from admin reclassifications.
