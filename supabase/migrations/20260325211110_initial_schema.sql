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
-- Table: families
-- No family_id FK on this table (it IS the family root)
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

-- ─────────────────────────────────────────────
-- Table: user_accounts
-- id = auth.users.id (one account per Supabase auth user)
-- role: 'admin' | 'maid' (lowercase string literals per AR9)
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

-- ─────────────────────────────────────────────
-- Table: profiles
-- Independent uuid — profiles exist without auth accounts (Aurora, Isabel in V1)
-- No FK to auth.users; linked to user_account via user_account.profile_id in V3+
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

-- ─────────────────────────────────────────────
-- RLS Helper: returns current user's family_id
-- Defined AFTER user_accounts so SQL function can resolve the table reference.
-- SECURITY DEFINER: runs as function owner (bypasses RLS on user_accounts)
-- STABLE: result can be cached per query
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION current_user_family_id()
RETURNS uuid AS $$
  SELECT family_id FROM user_accounts WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ─────────────────────────────────────────────
-- Row Level Security
-- ─────────────────────────────────────────────
ALTER TABLE families      ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles      ENABLE ROW LEVEL SECURITY;

-- families: authenticated user can see their own family
CREATE POLICY "families_select_own"
  ON families FOR SELECT
  USING (id = current_user_family_id());

-- user_accounts: all family members can read/write accounts in their family
CREATE POLICY "user_accounts_family_rw"
  ON user_accounts FOR ALL
  USING (family_id = current_user_family_id());

-- profiles: all family members can read/write profiles in their family
CREATE POLICY "profiles_family_rw"
  ON profiles FOR ALL
  USING (family_id = current_user_family_id());
