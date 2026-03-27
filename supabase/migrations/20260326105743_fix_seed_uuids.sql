-- ============================================================
-- Migration 004: Replace sequential-padded seed UUIDs with
-- real randomly generated UUIDs.
-- Migration 003 inserted rows with fake IDs — this corrects them.
-- Safe to run on a DB with no user_accounts rows yet.
-- ============================================================

-- Temporarily disable FK triggers so we can update PKs freely
SET session_replication_role = replica;

-- Update family
UPDATE families
SET id = '276bd790-5213-4f75-be38-103c1a6a79df'
WHERE id = '00000000-0000-0000-0000-000000000001';

-- Update profiles (family_id column updated to match new family id)
UPDATE profiles SET
  id        = '05dda680-f3b1-4446-99ca-b64c2cace606',
  family_id = '276bd790-5213-4f75-be38-103c1a6a79df'
WHERE id = '00000000-0000-0000-0001-000000000001';

UPDATE profiles SET
  id        = 'ca176100-b436-4a7e-b375-aa3241b5adc4',
  family_id = '276bd790-5213-4f75-be38-103c1a6a79df'
WHERE id = '00000000-0000-0000-0001-000000000002';

UPDATE profiles SET
  id        = 'ffee1abc-7b26-4bd1-9294-58f471c21549',
  family_id = '276bd790-5213-4f75-be38-103c1a6a79df'
WHERE id = '00000000-0000-0000-0001-000000000003';

UPDATE profiles SET
  id        = '461085c4-ec3c-4b3c-a67c-c413d6121db6',
  family_id = '276bd790-5213-4f75-be38-103c1a6a79df'
WHERE id = '00000000-0000-0000-0001-000000000004';

-- Restore FK enforcement
SET session_replication_role = DEFAULT;
