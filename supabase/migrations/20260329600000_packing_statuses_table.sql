-- Canonical packing status order lookup table
CREATE TABLE packing_statuses (
  id text PRIMARY KEY,
  label text NOT NULL,
  sort_order integer NOT NULL
);

INSERT INTO packing_statuses (id, label, sort_order) VALUES
  ('new',         'Novo',        1),
  ('buy',         'Comprar',     2),
  ('issue',       'Problema',    3),
  ('ready',       'Pronto',      4),
  ('last_minute', 'Última hora', 5),
  ('packed',      'Embalado',    6);

ALTER TABLE packing_statuses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "packing_statuses_select_authenticated"
  ON packing_statuses FOR SELECT TO authenticated USING (true);
