# Story 0.2: Supabase Schema & Migrations Foundation

Status: review

## Story

As a developer,
I want the Supabase project configured with the initial schema and RLS scaffold,
so that all subsequent epics can add their tables to a correctly structured, RLS-ready database.

## Acceptance Criteria

1. `supabase/config.toml` references the linked Supabase project; `supabase db push` applies migration 001 without errors.
2. Migration 001 creates tables: `families`, `user_accounts`, `profiles` — each with `id` (uuid PK), `created_at`, `updated_at`; `user_accounts` and `profiles` have `family_id` (uuid FK → families).
3. `user_accounts.id` is a foreign key to `auth.users(id)` ON DELETE CASCADE; `profiles.id` is an independent uuid (profiles can exist without an auth account).
4. RLS is enabled on all three tables; V1 permissive policy: authenticated users can SELECT/INSERT/UPDATE/DELETE rows where `family_id = current_user_family_id()` (helper function defined in migration).
5. `families` RLS allows authenticated users to SELECT their own family row (`id = current_user_family_id()`).
6. `supabase/seed.sql` inserts: 1 family (`Morais`) + 4 profiles (Filipe, Angela, Aurora, Isabel); zero `user_account` rows.
7. `supabase db reset` (dev only) applies migration 001 then seed.sql cleanly, resulting in 1 family + 4 profiles.

## Tasks / Subtasks

- [ ] Task 1: Install Supabase CLI and initialize project (AC: 1)
  - [ ] `npm install --save-dev supabase --legacy-peer-deps` (adds to devDependencies)
  - [ ] `npx supabase init` in `familyhub/` — creates `supabase/config.toml` and `supabase/.gitignore`
  - [ ] `npx supabase link --project-ref <your-project-ref>` (ref from Supabase dashboard → Project Settings → General)
  - [ ] Update `.env.development` with real `SUPABASE_URL` and `SUPABASE_ANON_KEY` from dashboard
  - [ ] Verify: `npx supabase status` returns project info without errors

- [ ] Task 2: Create migration 001 (AC: 2, 3)
  - [ ] `npx supabase migration new initial_schema` — creates `supabase/migrations/<timestamp>_initial_schema.sql`
  - [ ] Write exact SQL from Dev Notes into that file

- [ ] Task 3: Add RLS helper function and policies to migration 001 (AC: 4, 5)
  - [ ] `update_updated_at()` trigger function (auto-updates `updated_at` on row change)
  - [ ] `current_user_family_id()` SECURITY DEFINER helper (see Dev Notes for exact SQL)
  - [ ] `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` for all 3 tables
  - [ ] `CREATE POLICY` statements (see Dev Notes for exact SQL)

- [ ] Task 4: Create seed.sql (AC: 6)
  - [ ] Create `supabase/seed.sql` with deterministic UUIDs for family + 4 profiles (see Dev Notes)
  - [ ] Confirm no `user_account` rows in seed — accounts are created on first Google Sign-In (Story 1.1)

- [ ] Task 5: Apply and verify (AC: 1, 7)
  - [ ] `npx supabase db push` — applies migration to remote
  - [ ] Verify in Supabase dashboard: Tables → `families`, `user_accounts`, `profiles` all exist
  - [ ] Verify in Supabase dashboard: Authentication → Policies → RLS enabled on all 3 tables
  - [ ] `npx supabase db reset` (dev) — should produce 1 family + 4 profile rows
  - [ ] Commit: `supabase/config.toml`, `supabase/.gitignore`, `supabase/seed.sql`, `supabase/migrations/*.sql`

## Dev Notes

### ⚠️ CRITICAL: All Schema Changes Via Migrations Only (AR6)

NEVER edit schema in the Supabase dashboard. Always:
1. `npx supabase migration new <descriptive-name>` — creates timestamped `.sql` file
2. Write SQL in generated file
3. `npx supabase db push` — applies to remote database

Migration files are committed to git and must be reproducible. Dashboard edits are invisible to other developers and CI.

### Exact Migration 001 SQL

**File:** `supabase/migrations/<timestamp>_initial_schema.sql`

```sql
-- ============================================================
-- Migration 001: Initial Schema
-- Tables: families, user_accounts, profiles
-- ============================================================

-- ─────────────────────────────────────────────
-- Utility: auto-update updated_at on row changes
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ─────────────────────────────────────────────
-- RLS Helper: returns current user's family_id
-- SECURITY DEFINER: runs as function owner (bypasses RLS on user_accounts)
-- STABLE: result can be cached per query
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION current_user_family_id()
RETURNS uuid AS $$
  SELECT family_id FROM user_accounts WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ─────────────────────────────────────────────
-- Table: families
-- No family_id FK on this table (it IS the family)
-- ─────────────────────────────────────────────
CREATE TABLE families (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name        text NOT NULL,
  created_at  timestamptz DEFAULT now() NOT NULL,
  updated_at  timestamptz DEFAULT now() NOT NULL
);

CREATE TRIGGER families_updated_at
  BEFORE UPDATE ON families
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE families ENABLE ROW LEVEL SECURITY;

CREATE POLICY "families_select_own"
  ON families FOR SELECT
  USING (id = current_user_family_id());

-- ─────────────────────────────────────────────
-- Table: user_accounts
-- id = auth.users.id (one account per Supabase auth user)
-- role: 'admin' | 'maid' (AR9: lowercase string literals)
-- ─────────────────────────────────────────────
CREATE TABLE user_accounts (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  google_id   text UNIQUE NOT NULL,
  email       text NOT NULL,
  role        text NOT NULL CHECK (role IN ('admin', 'maid')),
  family_id   uuid NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  created_at  timestamptz DEFAULT now() NOT NULL,
  updated_at  timestamptz DEFAULT now() NOT NULL
);

CREATE TRIGGER user_accounts_updated_at
  BEFORE UPDATE ON user_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE user_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_accounts_family_rw"
  ON user_accounts FOR ALL
  USING (family_id = current_user_family_id());

-- ─────────────────────────────────────────────
-- Table: profiles
-- Independent uuid — profiles exist without auth accounts (Aurora, Isabel in V1)
-- Linked to user_account via user_account.profile_id in future (V3+)
-- ─────────────────────────────────────────────
CREATE TABLE profiles (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  display_name  text NOT NULL,
  avatar_url    text,
  family_id     uuid NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  created_at    timestamptz DEFAULT now() NOT NULL,
  updated_at    timestamptz DEFAULT now() NOT NULL
);

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_family_rw"
  ON profiles FOR ALL
  USING (family_id = current_user_family_id());
```

### ⚠️ RLS Bootstrap Note

`current_user_family_id()` queries `user_accounts`. Until Story 1.1 creates the user's `user_account` row on first sign-in, the function returns NULL and all RLS policies deny access. This is expected — seed data is applied via the service role key (bypasses RLS). App users cannot access data until their `user_account` is created (Story 1.1).

### Exact seed.sql

**File:** `supabase/seed.sql`

```sql
-- Seed: Morais family — dev/test only
-- Applied by `supabase db reset` — never runs in production automatically.
-- Uses deterministic UUIDs for easy reference across stories.

INSERT INTO families (id, name) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Morais');

INSERT INTO profiles (id, display_name, family_id) VALUES
  ('00000000-0000-0000-0001-000000000001', 'Filipe',  '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0001-000000000002', 'Angela',  '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0001-000000000003', 'Aurora',  '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0001-000000000004', 'Isabel',  '00000000-0000-0000-0000-000000000001');

-- No user_account rows: created on first Google Sign-In (Story 1.1)
```

### CLI Commands Reference

```bash
# One-time project setup
npm install --save-dev supabase --legacy-peer-deps
npx supabase init
npx supabase link --project-ref <ref>   # ref from dashboard → Project Settings → General

# Development workflow
npx supabase migration new <name>        # creates timestamped migration file
npx supabase db push                     # applies pending migrations to remote
npx supabase db reset                    # (dev only) drops + recreates + applies seed
npx supabase status                      # shows linked project info
```

### What This Story Does NOT Create (Scope Boundary)

| Item | Story |
|---|---|
| `vacations`, `booking_tasks` tables | Story 2.1 |
| `packing_items`, `categories`, `tags`, `templates` tables | Story 3.2 |
| `src/repositories/supabase/supabase.client.ts` | Story 0.3 |
| TypeScript domain types (`profile.types.ts` etc.) | Story 0.3 |
| PowerSync schema (`powersync.schema.ts`) | Story 0.4 |

Do not create any of the above in this story.

### From Story 0.1 Learnings

- All `npm install` commands require `--legacy-peer-deps` (Expo SDK 55 peer dep conflicts)
- Files live in `familyhub/` (project root is `/var/home/fmorais/Projects/FamilyHub/familyhub/`)
- `ANDROID_HOME=/home/fmorais/.Android` is required for any Android commands

### Project Structure Notes

**Files created in this story:**
```
familyhub/
└── supabase/
    ├── config.toml                                      ← generated by supabase init + link
    ├── .gitignore                                       ← generated by supabase init
    ├── seed.sql                                         ← created manually
    └── migrations/
        └── <timestamp>_initial_schema.sql               ← created by supabase migration new
```

`supabase/` lives at `familyhub/` root (same level as `package.json`, `app.config.ts`).

### References

- [Source: epics.md#Story-0.2] — Acceptance criteria, seed data (Filipe, Angela, Aurora, Isabel)
- [Source: epics.md#AR6] — Supabase CLI migrations mandatory; no dashboard schema edits
- [Source: epics.md#AR8] — Repository pattern: `supabase.client.ts` is Story 0.3, not here
- [Source: epics.md#AR9] — Role values must be lowercase: `'admin' | 'maid'`
- [Source: architecture.md#Data-Architecture] — RLS from V1, `family_id` on every table
- [Source: architecture.md#Auth-Security] — `user_accounts.id` FK to `auth.users`, profile decoupling
- [Source: architecture.md#Project-Structure] — `supabase/migrations/` naming convention

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

None.

### Completion Notes List

1. **SQL function ordering**: `current_user_family_id()` (LANGUAGE sql) is validated at creation time — `user_accounts` must exist first. Moved function definition after all table CREATE statements.
2. **supabase db push prompt**: CLI prompts for confirmation interactively; piped `Y` via `echo "Y" |` for automation.
3. **supabase status requires Docker**: `supabase status` attempts to inspect local containers — irrelevant for remote-only workflow. Link success confirmed from `supabase link` output.

### File List

- `familyhub/supabase/config.toml`
- `familyhub/supabase/.gitignore`
- `familyhub/supabase/migrations/20260325211110_initial_schema.sql`
- `familyhub/supabase/seed.sql`
- `familyhub/package.json` (supabase devDependency added)
- `familyhub/package-lock.json`
