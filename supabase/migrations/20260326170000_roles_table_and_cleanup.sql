-- Migration 012: Roles reference table + remove role from user_accounts
--
-- 1. Create roles lookup table (admin, maid, child)
-- 2. Make profiles.role NOT NULL with FK to roles
-- 3. Drop role column from user_accounts
-- 4. Update provision_user_account() to stop writing/reading user_accounts.role

-- ─── 1. Create roles lookup table ────────────────────────────────────────────

CREATE TABLE roles (
  id   text PRIMARY KEY,
  name text NOT NULL
);

INSERT INTO roles (id, name) VALUES
  ('admin', 'Administrador'),
  ('maid',  'Empregada'),
  ('child', 'Criança');

ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "roles_select_authenticated"
  ON roles FOR SELECT
  TO authenticated
  USING (true);

-- ─── 2. profiles.role: fill NULLs, set NOT NULL, drop CHECK, add FK ─────────

-- Drop the old CHECK constraint FIRST (it only allows admin/maid)
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- Default existing NULL roles to 'child'
UPDATE profiles SET role = 'child' WHERE role IS NULL;

-- Make NOT NULL and add FK
ALTER TABLE profiles
  ALTER COLUMN role SET NOT NULL,
  ALTER COLUMN role SET DEFAULT 'child',
  ADD CONSTRAINT profiles_role_fk FOREIGN KEY (role) REFERENCES roles(id);

-- ─── 3. Drop role from user_accounts ─────────────────────────────────────────

ALTER TABLE user_accounts DROP COLUMN role;

-- ─── 4. Update provision_user_account() — no more user_accounts.role ─────────
-- The function no longer writes role to user_accounts. Role lives on profiles.
-- Must DROP first because return type changed (role column removed).

DROP FUNCTION IF EXISTS provision_user_account(text, text, text);

CREATE FUNCTION provision_user_account(
  p_google_id    text,
  p_email        text,
  p_display_name text DEFAULT NULL
)
RETURNS TABLE (
  id          uuid,
  google_id   text,
  email       text,
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
      SELECT ua.id, ua.google_id, ua.email, ua.family_id, ua.profile_id,
             ua.created_at, ua.updated_at
      FROM user_accounts ua WHERE ua.id = auth.uid();
    RETURN;
  END IF;

  -- ── Case 2: Invited profile for this email ───────────────────────────────
  SELECT p.id, p.family_id
  INTO v_profile_id, v_family_id
  FROM profiles p
  WHERE lower(p.email) = lower(p_email)
    AND p.status = 'invited'
  LIMIT 1;

  IF v_profile_id IS NOT NULL THEN
    UPDATE profiles SET status = 'enrolled' WHERE id = v_profile_id;

    INSERT INTO user_accounts (id, google_id, email, family_id, profile_id)
    VALUES (auth.uid(), p_google_id, p_email, v_family_id, v_profile_id);

    RETURN QUERY
      SELECT ua.id, ua.google_id, ua.email, ua.family_id, ua.profile_id,
             ua.created_at, ua.updated_at
      FROM user_accounts ua WHERE ua.id = auth.uid();
    RETURN;
  END IF;

  -- ── Case 3: First-time admin fallback (no accounts in family yet) ────────
  SELECT f.id INTO v_family_id FROM families f LIMIT 1;

  IF v_family_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM user_accounts ua WHERE ua.family_id = v_family_id
  ) THEN
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
      UPDATE profiles SET status = 'enrolled', email = p_email, role = 'admin'
      WHERE id = v_profile_id;
    END IF;

    INSERT INTO user_accounts (id, google_id, email, family_id, profile_id)
    VALUES (auth.uid(), p_google_id, p_email, v_family_id, v_profile_id);

    RETURN QUERY
      SELECT ua.id, ua.google_id, ua.email, ua.family_id, ua.profile_id,
             ua.created_at, ua.updated_at
      FROM user_accounts ua WHERE ua.id = auth.uid();
    RETURN;
  END IF;

  -- ── Case 4: No valid path → reject ───────────────────────────────────────
  RAISE EXCEPTION 'Conta não autorizada';
END;
$$;
