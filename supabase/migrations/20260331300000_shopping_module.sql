-- Shopping module (V2 — Story 7.1)

-- Shopping categories (user-manageable, seeded with defaults)
CREATE TABLE shopping_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  name text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT uq_shopping_categories_family_name UNIQUE (family_id, name)
);

-- Case-insensitive uniqueness (prevents "Dairy" and "dairy" coexisting)
CREATE UNIQUE INDEX idx_shopping_categories_family_lower_name
  ON shopping_categories(family_id, lower(name));

ALTER TABLE shopping_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "family members can manage shopping categories"
  ON shopping_categories FOR ALL
  USING (family_id = (SELECT family_id FROM user_accounts WHERE id = auth.uid()));

CREATE TRIGGER set_shopping_categories_updated_at
  BEFORE UPDATE ON shopping_categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Shopping items (living list — tick/untick, no lifecycle)
CREATE TABLE shopping_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  name text NOT NULL,
  category_id uuid NOT NULL REFERENCES shopping_categories(id) ON DELETE SET NULL,
  quantity_note text,
  is_ticked boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Case-insensitive unique index on item names per family
CREATE UNIQUE INDEX idx_shopping_items_family_lower_name
  ON shopping_items(family_id, lower(name));

CREATE INDEX idx_shopping_items_family_id_is_ticked
  ON shopping_items(family_id, is_ticked);

ALTER TABLE shopping_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "family members can manage shopping items"
  ON shopping_items FOR ALL
  USING (family_id = (SELECT family_id FROM user_accounts WHERE id = auth.uid()));

CREATE TRIGGER set_shopping_items_updated_at
  BEFORE UPDATE ON shopping_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Seed default categories for all existing families
INSERT INTO shopping_categories (family_id, name, sort_order)
SELECT f.id, c.name, c.sort_order
FROM families f
CROSS JOIN (VALUES
  ('Dairy', 1),
  ('Meat', 2),
  ('Fish', 3),
  ('Fruit', 4),
  ('Vegetables', 5),
  ('Bakery', 6),
  ('Frozen', 7),
  ('Pantry', 8),
  ('Beverages', 9),
  ('Snacks', 10),
  ('Spices & Condiments', 11),
  ('Eggs', 12),
  ('Cleaning', 13),
  ('Hygiene', 14),
  ('Baby', 15),
  ('Other', 16)
) AS c(name, sort_order)
ON CONFLICT DO NOTHING;
