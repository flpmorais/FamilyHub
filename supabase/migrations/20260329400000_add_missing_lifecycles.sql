-- Add missing lifecycle values (packing, cancelled) to the lookup table
INSERT INTO vacation_lifecycles (id, name) VALUES
  ('packing',   'A embalar'),
  ('cancelled', 'Cancelada')
ON CONFLICT (id) DO NOTHING;
