-- Migration 010: Revert current_user_family_id() to simple version
--
-- The LEFT JOIN to profiles in the previous version caused the function to
-- return NULL (self-referential RLS issue), silently breaking all family-scoped
-- UPDATE/DELETE operations. The inactive check is handled in the app layer
-- (getCurrentSession + provision_user_account) instead.

CREATE OR REPLACE FUNCTION current_user_family_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT family_id FROM user_accounts WHERE id = auth.uid();
$$;
