-- Fix: qualify all bare "id" references in provision_user_account to avoid ambiguity
-- with the RETURNS TABLE output column named "id".

CREATE OR REPLACE FUNCTION provision_user_account(
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
  -- Case 1: Existing user_account (idempotent)
  IF EXISTS (SELECT 1 FROM user_accounts ua WHERE ua.id = auth.uid()) THEN
    IF EXISTS (
      SELECT 1
      FROM user_accounts ua
      JOIN profiles p ON p.id = ua.profile_id
      WHERE ua.id = auth.uid() AND p.status = 'inactive'
    ) THEN
      RAISE EXCEPTION 'Conta desactivada';
    END IF;

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

  -- Case 2: Invited profile for this email
  SELECT p.id, p.family_id
  INTO v_profile_id, v_family_id
  FROM profiles p
  WHERE lower(p.email) = lower(p_email)
    AND p.status = 'invited'
  LIMIT 1;

  IF v_profile_id IS NOT NULL THEN
    UPDATE profiles SET status = 'enrolled', email = p_email WHERE profiles.id = v_profile_id;

    INSERT INTO user_accounts (id, google_id, email, family_id, profile_id)
    VALUES (auth.uid(), p_google_id, p_email, v_family_id, v_profile_id);

    RETURN QUERY
      SELECT ua.id, ua.google_id, ua.email, ua.family_id, ua.profile_id,
             ua.created_at, ua.updated_at
      FROM user_accounts ua WHERE ua.id = auth.uid();
    RETURN;
  END IF;

  -- Case 3: First-time admin fallback (no accounts in family yet)
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
      WHERE profiles.id = v_profile_id;
    END IF;

    INSERT INTO user_accounts (id, google_id, email, family_id, profile_id)
    VALUES (auth.uid(), p_google_id, p_email, v_family_id, v_profile_id);

    RETURN QUERY
      SELECT ua.id, ua.google_id, ua.email, ua.family_id, ua.profile_id,
             ua.created_at, ua.updated_at
      FROM user_accounts ua WHERE ua.id = auth.uid();
    RETURN;
  END IF;

  RAISE EXCEPTION 'Conta não autorizada';
END;
$$;
