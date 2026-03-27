-- ============================================================
-- Migration 005: Invitations
-- ============================================================

CREATE TABLE invitations (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  email       text NOT NULL,
  role        text NOT NULL CHECK (role IN ('admin', 'maid')) DEFAULT 'admin',
  family_id   uuid NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  invited_by  uuid REFERENCES user_accounts(id) ON DELETE SET NULL,
  created_at  timestamptz DEFAULT now() NOT NULL,
  updated_at  timestamptz DEFAULT now() NOT NULL
);

CREATE TRIGGER invitations_updated_at
  BEFORE UPDATE ON invitations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- Family members can read and manage invitations
CREATE POLICY "invitations_family_rw"
  ON invitations FOR ALL
  USING (family_id = current_user_family_id());

-- ─────────────────────────────────────────────
-- SECURITY DEFINER: invite_user
-- Validates caller is admin, prevents duplicates,
-- creates invitation row.
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION invite_user(
  p_email text,
  p_role  text DEFAULT 'admin'
)
RETURNS TABLE (
  id          uuid,
  email       text,
  role        text,
  family_id   uuid,
  invited_by  uuid,
  created_at  timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_family_id uuid;
BEGIN
  -- Only admins can invite
  IF NOT EXISTS (
    SELECT 1 FROM user_accounts ua WHERE ua.id = auth.uid() AND ua.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only admins can invite users';
  END IF;

  SELECT ua.family_id INTO v_family_id FROM user_accounts ua WHERE ua.id = auth.uid();

  -- Block duplicate active account
  IF EXISTS (
    SELECT 1 FROM user_accounts ua
    WHERE lower(ua.email) = lower(p_email) AND ua.family_id = v_family_id
  ) THEN
    RAISE EXCEPTION 'A user with this email already exists in your family';
  END IF;

  -- Block duplicate pending invitation
  IF EXISTS (
    SELECT 1 FROM invitations inv
    WHERE lower(inv.email) = lower(p_email) AND inv.family_id = v_family_id
  ) THEN
    RAISE EXCEPTION 'This email has already been invited';
  END IF;

  INSERT INTO invitations (email, role, family_id, invited_by)
  VALUES (lower(p_email), p_role, v_family_id, auth.uid());

  RETURN QUERY
    SELECT inv.id, inv.email, inv.role, inv.family_id, inv.invited_by, inv.created_at
    FROM invitations inv
    WHERE inv.email = lower(p_email) AND inv.family_id = v_family_id
    ORDER BY inv.created_at DESC
    LIMIT 1;
END;
$$;

-- ─────────────────────────────────────────────
-- Replace provision_user_account with invitation-aware version.
-- Checks invitations table for matching email → uses that role.
-- Deletes invitation after account is created (idempotent).
-- ─────────────────────────────────────────────
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
  v_invite_id  uuid;
BEGIN
  -- Idempotent: return existing account if already provisioned
  IF EXISTS (SELECT 1 FROM user_accounts ua WHERE ua.id = auth.uid()) THEN
    RETURN QUERY
      SELECT ua.id, ua.google_id, ua.email, ua.role, ua.family_id, ua.profile_id,
             ua.created_at, ua.updated_at
      FROM user_accounts ua WHERE ua.id = auth.uid();
    RETURN;
  END IF;

  -- Check invitations: if found, use that role and family
  SELECT inv.id, inv.role, inv.family_id
  INTO v_invite_id, v_role, v_family_id
  FROM invitations inv
  WHERE lower(inv.email) = lower(p_email)
  LIMIT 1;

  -- Fall back to single family if no invitation
  IF v_family_id IS NULL THEN
    SELECT f.id INTO v_family_id FROM families f LIMIT 1;
  END IF;

  -- Match profile by first word of display name (case-insensitive)
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

  INSERT INTO user_accounts (id, google_id, email, role, family_id, profile_id)
  VALUES (auth.uid(), p_google_id, p_email, v_role, v_family_id, v_profile_id);

  -- Consume invitation
  IF v_invite_id IS NOT NULL THEN
    DELETE FROM invitations WHERE id = v_invite_id;
  END IF;

  RETURN QUERY
    SELECT ua.id, ua.google_id, ua.email, ua.role, ua.family_id, ua.profile_id,
           ua.created_at, ua.updated_at
    FROM user_accounts ua WHERE ua.id = auth.uid();
END;
$$;
