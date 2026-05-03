# Domain-Specific Requirements

## Data Privacy Between Users (V6+)

FamilyHub enforces intra-household privacy boundaries as first-class data model constraints — not UI-layer restrictions:

- **Private spending envelopes (V6):** Each admin's personal budget category is a data black box to the other admin. The dashboard shows "Personal — Filipe: 80% spent" without line items. Neither spouse can read the other's personal transactions. Enforced at the data model level, not the display layer.
- **Maid billing isolation (V7):** Each maid account sees only her own billing history. Historical records from prior maids are visible only to admins, isolated by account period. A new maid cannot access any prior maid's data.
- **Child profiles:** Aurora and Isabel exist as profiles but have no account credentials. Their data is accessible to admins only until they have their own accounts.

## GDPR Considerations (Portugal / EU)

FamilyHub stores personal data of EU residents, including two minors. Risk profile is minimal:

- **No third-party data sharing:** All data stays within the family's Supabase instance. No analytics, no advertising, no external APIs beyond Google Sign-In and (future) Google Drive.
- **Data subject rights:** Filipe is both data controller and data subject. Full data export available at any time via automated backups. Deletion is a Settings action.
- **Children's data:** Aurora and Isabel's profiles are created and managed by their parents (parental consent). No external consent mechanism required.
- **Google Sign-In:** FamilyHub stores only the Google user ID and email — no passwords, no sensitive auth data.

## Technical Privacy Constraints

- Private envelope transactions must never appear in any shared query, API response, or sync payload visible to the other admin.
- Maid account data must be partitioned such that a new maid account cannot traverse or query prior maid records.
- Supabase Row Level Security (RLS) is the enforcement mechanism — privacy boundaries are database-level, not application-level.

---
