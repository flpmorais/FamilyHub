-- Migration 009: Unified Profile Status
--
-- Merges the invitations table into profiles.
-- Profiles now own: status, email, role.
-- Statuses: active | invited | enrolled | inactive
-- Drops invitations table and invite_user() RPC.
-- Updates provision_user_account() and current_user_family_id().

-- ─── 1. Add columns to profiles ──────────────────────────────────────────────

ALTER TABLE profiles
  ADD COLUMN status text NOT NULL
    CHECK (status IN ('active', 'invited', 'enrolled', 'inactive'))
    DEFAULT 'active',
  ADD COLUMN email  text,
  ADD COLUMN role   text
    CHECK (role IN ('admin', 'maid'));

-- ─── 2. Migrate existing data ────────────────────────────────────────────────

-- Profiles linked to a user_account → enrolled; copy email from user_accounts
UPDATE profiles p
SET status = 'enrolled',
    email  = ua.email,
    role   = ua.role
FROM user_accounts ua
WHERE ua.profile_id = p.id;

-- Invitation rows whose email prefix matches a profile display_name → invited
UPDATE profiles p
SET status = 'invited',
    email  = inv.email,
    role   = inv.role
FROM invitations inv
WHERE p.family_id = inv.family_id
  AND lower(p.display_name) = lower(split_part(inv.email, '@', 1))
  AND p.status = 'active';

-- Remaining invitations with no matching profile → create new profiles
INSERT INTO profiles (display_name, family_id, status, email, role)
SELECT
  split_part(inv.email, '@', 1),
  inv.family_id,
  'invited',
  inv.email,
  inv.role
FROM invitations inv
WHERE NOT EXISTS (
  SELECT 1 FROM profiles p
  WHERE lower(p.email) = lower(inv.email)
    AND p.family_id = inv.family_id
);

-- ─── 3. Drop invitations table ───────────────────────────────────────────────

DROP TABLE invitations;

-- ─── 4. Drop invite_user() RPC ───────────────────────────────────────────────

DROP FUNCTION IF EXISTS invite_user(text, text);

-- ─── 5. Update current_user_family_id() ─────────────────────────────────────
-- Inactive users get NULL → all family-scoped RLS queries return nothing.

CREATE OR REPLACE FUNCTION current_user_family_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT ua.family_id
  FROM user_accounts ua
  LEFT JOIN profiles p ON p.id = ua.profile_id
  WHERE ua.id = auth.uid()
    AND (ua.profile_id IS NULL OR p.status != 'inactive');
$$;

-- ─── 6. Update provision_user_account() ─────────────────────────────────────
-- New logic:
--   1. Existing user_account → check profile not inactive → auto-heal status to
--      enrolled → return account.
--   2. Invited profile matching p_email → enroll: set status=enrolled, insert
--      user_account with profile's role.
--   3. First-time fallback (no user_accounts in family yet) → create admin
--      account, match profile by first name.
--   4. Otherwise → reject with Portuguese error.

CREATE OR REPLACE FUNCTION provision_user_account(
  p_google_id    text,
  p_email        text,
  p_display_name text DEFAULT NULL
)
RETURNS TABLE (
  id          uuid,
  google_id   text,
  email       text,
  role        text,
  family_id   uuid,
  profile_id  uuid,
  created_at  timestamptz,
  updated_at  timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_family_id  uuid;
  v_profile_id uuid;
  v_role       text := 'admin';
BEGIN
  -- ── Case 1: Existing user_account (idempotent) ───────────────────────────
  IF EXISTS (SELECT 1 FROM user_accounts ua WHERE ua.id = auth.uid()) THEN
    -- Check if linked profile is inactive
    IF EXISTS (
      SELECT 1
      FROM user_accounts ua
      JOIN profiles p ON p.id = ua.profile_id
      WHERE ua.id = auth.uid() AND p.status = 'inactive'
    ) THEN
      RAISE EXCEPTION 'Conta desactivada';
    END IF;

    -- Auto-heal: ensure profile status is enrolled
    UPDATE profiles p
    SET status = 'enrolled'
    FROM user_accounts ua
    WHERE ua.id = auth.uid()
      AND ua.profile_id = p.id
      AND p.status != 'enrolled';

    RETURN QUERY
      SELECT ua.id, ua.google_id, ua.email, ua.role, ua.family_id, ua.profile_id,
             ua.created_at, ua.updated_at
      FROM user_accounts ua WHERE ua.id = auth.uid();
    RETURN;
  END IF;

  -- ── Case 2: Invited profile for this email ───────────────────────────────
  SELECT p.id, p.family_id, p.role
  INTO v_profile_id, v_family_id, v_role
  FROM profiles p
  WHERE lower(p.email) = lower(p_email)
    AND p.status = 'invited'
  LIMIT 1;

  IF v_profile_id IS NOT NULL THEN
    -- Enroll: update profile status and create user_account
    UPDATE profiles SET status = 'enrolled' WHERE id = v_profile_id;

    INSERT INTO user_accounts (id, google_id, email, role, family_id, profile_id)
    VALUES (auth.uid(), p_google_id, p_email, COALESCE(v_role, 'admin'), v_family_id, v_profile_id);

    RETURN QUERY
      SELECT ua.id, ua.google_id, ua.email, ua.role, ua.family_id, ua.profile_id,
             ua.created_at, ua.updated_at
      FROM user_accounts ua WHERE ua.id = auth.uid();
    RETURN;
  END IF;

  -- ── Case 3: First-time admin fallback (no accounts in family yet) ────────
  SELECT f.id INTO v_family_id FROM families f LIMIT 1;

  IF v_family_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM user_accounts ua WHERE ua.family_id = v_family_id
  ) THEN
    -- Match profile by first word of display name
    IF p_display_name IS NOT NULL THEN
      SELECT p.id INTO v_profile_id
      FROM profiles p
      WHERE p.family_id = v_family_id
        AND lower(p.display_name) = lower(split_part(p_display_name, ' ', 1))
        AND p.id NOT IN (
          SELECT ua.profile_id FROM user_accounts ua WHERE ua.profile_id IS NOT NULL
        )
      LIMIT 1;
    END IF;

    IF v_profile_id IS NOT NULL THEN
      UPDATE profiles SET status = 'enrolled', email = p_email WHERE id = v_profile_id;
    END IF;

    INSERT INTO user_accounts (id, google_id, email, role, family_id, profile_id)
    VALUES (auth.uid(), p_google_id, p_email, 'admin', v_family_id, v_profile_id);

    RETURN QUERY
      SELECT ua.id, ua.google_id, ua.email, ua.role, ua.family_id, ua.profile_id,
             ua.created_at, ua.updated_at
      FROM user_accounts ua WHERE ua.id = auth.uid();
    RETURN;
  END IF;

  -- ── Case 4: No valid path → reject ───────────────────────────────────────
  RAISE EXCEPTION 'Conta não autorizada';
END;
$$;
