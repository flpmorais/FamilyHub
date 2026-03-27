-- Migration 006: Fix user_accounts.family_id stale value
--
-- Migration 004 updated families.id from the fake UUID to the real UUID
-- using SET session_replication_role = replica (which disables FK triggers).
-- However, user_accounts.family_id was not updated at the same time,
-- leaving existing rows pointing to a non-existent families.id.
-- This migration corrects that.

SET session_replication_role = replica;

UPDATE user_accounts
SET family_id = '276bd790-5213-4f75-be38-103c1a6a79df'
WHERE family_id = '00000000-0000-0000-0000-000000000001';

SET session_replication_role = DEFAULT;
