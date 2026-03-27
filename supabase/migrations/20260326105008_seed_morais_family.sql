-- ============================================================
-- Migration 003: Seed Morais family data (cloud bootstrap)
-- seed.sql only runs on local `supabase db reset` — this
-- migration applies the same rows idempotently to cloud.
-- ============================================================

INSERT INTO families (id, name)
VALUES ('00000000-0000-0000-0000-000000000001', 'Morais')
ON CONFLICT (id) DO NOTHING;

INSERT INTO profiles (id, display_name, family_id) VALUES
  ('00000000-0000-0000-0001-000000000001', 'Filipe', '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0001-000000000002', 'Angela', '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0001-000000000003', 'Aurora', '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0001-000000000004', 'Isabel', '00000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;
