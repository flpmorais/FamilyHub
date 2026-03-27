-- ============================================================
-- Migration 002: User Account Profile Linking
-- ============================================================

-- Add profile_id to user_accounts (nullable — profiles exist without linked accounts)
ALTER TABLE user_accounts
  ADD COLUMN profile_id uuid REFERENCES profiles(id) ON DELETE SET NULL;

-- ─────────────────────────────────────────────
-- Fix RLS: bootstrap problem for first-time users
-- ─────────────────────────────────────────────

-- Drop broad ALL policy on user_accounts
DROP POLICY IF EXISTS "user_accounts_family_rw" ON user_accounts;

-- Allow a user to insert their own row (bootstrap: no existing user_account yet)
CREATE POLICY "user_accounts_self_insert"
  ON user_accounts FOR INSERT
  WITH CHECK (id = auth.uid());

-- Allow family members to read each other's accounts (RLS works once row exists)
CREATE POLICY "user_accounts_family_select"
  ON user_accounts FOR SELECT
  USING (family_id = current_user_family_id());

-- Allow a user to update their own account (e.g., profile_id linking, google_id on invite claim)
CREATE POLICY "user_accounts_self_update"
  ON user_accounts FOR UPDATE
  USING (id = auth.uid());

-- Replace families policy: any authenticated user can read families
-- Safe for a private app (only invited users have the APK)
DROP POLICY IF EXISTS "families_select_own" ON families;
CREATE POLICY "families_select_authenticated"
  ON families FOR SELECT
  TO authenticated
  USING (true);

-- Allow any authenticated user to SELECT profiles (needed for name matching during bootstrap)
-- profiles_family_rw still covers INSERT/UPDATE/DELETE — only SELECT is broadened
CREATE POLICY "profiles_select_authenticated"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

-- ─────────────────────────────────────────────
-- SECURITY DEFINER function: provision_user_account
-- Called after supabase.auth.signInWithIdToken() to create/return user_account row.
-- Runs as function owner — bypasses RLS for insert.
-- Idempotent: returns existing row if already exists.
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
BEGIN
  -- Return existing account if already provisioned (idempotent)
  IF EXISTS (SELECT 1 FROM user_accounts ua WHERE ua.id = auth.uid()) THEN
    RETURN QUERY
      SELECT ua.id, ua.google_id, ua.email, ua.role, ua.family_id, ua.profile_id, ua.created_at, ua.updated_at
      FROM user_accounts ua
      WHERE ua.id = auth.uid();
    RETURN;
  END IF;

  -- Get the single family (private family app — one family)
  SELECT f.id INTO v_family_id FROM families f LIMIT 1;

  -- Try to match a profile by first word of display_name (case-insensitive)
  -- Only matches profiles not already linked to another user_account
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

  -- Insert new user_account
  INSERT INTO user_accounts (id, google_id, email, role, family_id, profile_id)
  VALUES (auth.uid(), p_google_id, p_email, 'admin', v_family_id, v_profile_id);

  RETURN QUERY
    SELECT ua.id, ua.google_id, ua.email, ua.role, ua.family_id, ua.profile_id, ua.created_at, ua.updated_at
    FROM user_accounts ua
    WHERE ua.id = auth.uid();
END;
$$;
