-- Migration 013: Add DELETE policy to user_accounts
--
-- setProfileStatus(enrolled→active) needs to delete user_account rows
-- via the client. Only admins in the same family can delete.

CREATE POLICY "user_accounts_family_delete"
  ON user_accounts FOR DELETE
  USING (family_id = current_user_family_id());
