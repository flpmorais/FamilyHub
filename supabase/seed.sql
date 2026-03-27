-- Seed: Morais family — dev/test only
-- Applied by `supabase db reset` — never runs in production automatically.

INSERT INTO families (id, name) VALUES
  ('276bd790-5213-4f75-be38-103c1a6a79df', 'Morais');

INSERT INTO profiles (id, display_name, family_id, status, role) VALUES
  ('05dda680-f3b1-4446-99ca-b64c2cace606', 'Filipe', '276bd790-5213-4f75-be38-103c1a6a79df', 'active', 'admin'),
  ('ca176100-b436-4a7e-b375-aa3241b5adc4', 'Angela', '276bd790-5213-4f75-be38-103c1a6a79df', 'active', 'admin'),
  ('ffee1abc-7b26-4bd1-9294-58f471c21549', 'Aurora', '276bd790-5213-4f75-be38-103c1a6a79df', 'active', 'child'),
  ('461085c4-ec3c-4b3c-a67c-c413d6121db6', 'Isabel', '276bd790-5213-4f75-be38-103c1a6a79df', 'active', 'child');

-- No user_account rows: created on first Google Sign-In (Story 1.2)
