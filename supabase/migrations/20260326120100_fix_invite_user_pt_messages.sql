-- Migration 007: Translate invite_user error messages to Portuguese
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
    RAISE EXCEPTION 'Apenas administradores podem convidar utilizadores';
  END IF;

  SELECT ua.family_id INTO v_family_id FROM user_accounts ua WHERE ua.id = auth.uid();

  -- Block duplicate active account
  IF EXISTS (
    SELECT 1 FROM user_accounts ua
    WHERE lower(ua.email) = lower(p_email) AND ua.family_id = v_family_id
  ) THEN
    RAISE EXCEPTION 'Já existe um utilizador com este email na sua família';
  END IF;

  -- Block duplicate pending invitation
  IF EXISTS (
    SELECT 1 FROM invitations inv
    WHERE lower(inv.email) = lower(p_email) AND inv.family_id = v_family_id
  ) THEN
    RAISE EXCEPTION 'Este email já foi convidado';
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
