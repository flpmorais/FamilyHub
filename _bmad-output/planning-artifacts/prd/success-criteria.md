# Success Criteria

## User Success

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

## Business Success

N/A — no commercial objectives, no revenue targets, no user growth goals.

**Version gate:** Each version ships when its module is functionally complete and in active family use. V1 (Vacation & Leftovers) has passed its gate — both modules are in willing daily use by both admins. V2 begins now. Same gate applies at every version boundary.

## Technical Success

- **Real-time sync:** When both admins are online, list changes (shopping ticks, packing status updates) propagate without requiring manual refresh.
- **APK distribution:** App installs cleanly via sideloaded APK on Android devices. No Play Store dependency.
- **Free-tier backend:** Supabase usage stays within free tier limits at family scale. No unexpected cloud costs.
- **Service replaceability:** Any external service can be swapped by replacing its service module only — zero changes to business logic.

## Measurable Outcomes

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
