-- Unified dish types: source of truth for recipes / leftovers / meal_entry_dishes type styling.
-- Adds an "Entradas" (appetizer) type to the existing 6 system types.

-- ─────────────────────────────────────────────
-- 1. Extend CHECK constraints to accept 'appetizer'
-- ─────────────────────────────────────────────

ALTER TABLE recipes DROP CONSTRAINT IF EXISTS recipes_type_check;
ALTER TABLE recipes ADD CONSTRAINT recipes_type_check
  CHECK (type IN ('meal', 'main', 'side', 'soup', 'dessert', 'other', 'appetizer'));

ALTER TABLE leftovers DROP CONSTRAINT IF EXISTS leftovers_type_check;
ALTER TABLE leftovers ADD CONSTRAINT leftovers_type_check
  CHECK (type IN ('meal', 'main', 'side', 'soup', 'dessert', 'other', 'appetizer'));

ALTER TABLE meal_entry_dishes DROP CONSTRAINT IF EXISTS chk_manual_category;
ALTER TABLE meal_entry_dishes ADD CONSTRAINT chk_manual_category
  CHECK (
    manual_category IS NULL
    OR manual_category IN ('meal', 'main', 'side', 'soup', 'dessert', 'other', 'appetizer')
  );

-- ─────────────────────────────────────────────
-- 2. dish_types table — one row per (family, key)
-- ─────────────────────────────────────────────

CREATE TABLE dish_types (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id   uuid NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  key         text NOT NULL,
  name        text NOT NULL,
  color       text NOT NULL,
  icon        text NOT NULL,
  sort_order  integer NOT NULL DEFAULT 0,
  is_system   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (family_id, key)
);

CREATE INDEX idx_dish_types_family ON dish_types(family_id);

ALTER TABLE dish_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dish_types_family_read"
  ON dish_types FOR SELECT
  USING (family_id = current_user_family_id());

CREATE TRIGGER dish_types_updated_at
  BEFORE UPDATE ON dish_types
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─────────────────────────────────────────────
-- 3. Seed for every existing family
-- ─────────────────────────────────────────────

INSERT INTO dish_types (family_id, key, name, color, icon, sort_order)
SELECT f.id, t.key, t.name, t.color, t.icon, t.sort_order
FROM families f
CROSS JOIN (VALUES
  ('appetizer', 'Entradas',        '#00ACC1', 'bowl-mix-outline', 10),
  ('soup',      'Sopa',            '#D32F2F', 'bowl-mix',         20),
  ('meal',      'Refeição',        '#388E3C', 'pot-steam',        30),
  ('main',      'Prato Principal', '#1976D2', 'food-steak',       40),
  ('side',      'Acompanhamento',  '#F59300', 'food-apple',       50),
  ('dessert',   'Sobremesa',       '#E91E63', 'cupcake',          60),
  ('other',     'Outro',           '#888888', 'food',             70)
) AS t(key, name, color, icon, sort_order);

-- ─────────────────────────────────────────────
-- 4. Trigger to seed dish_types for new families automatically
-- ─────────────────────────────────────────────

CREATE OR REPLACE FUNCTION seed_dish_types_for_family()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO dish_types (family_id, key, name, color, icon, sort_order)
  VALUES
    (NEW.id, 'appetizer', 'Entradas',        '#00ACC1', 'bowl-mix-outline', 10),
    (NEW.id, 'soup',      'Sopa',            '#D32F2F', 'bowl-mix',         20),
    (NEW.id, 'meal',      'Refeição',        '#388E3C', 'pot-steam',        30),
    (NEW.id, 'main',      'Prato Principal', '#1976D2', 'food-steak',       40),
    (NEW.id, 'side',      'Acompanhamento',  '#F59300', 'food-apple',       50),
    (NEW.id, 'dessert',   'Sobremesa',       '#E91E63', 'cupcake',          60),
    (NEW.id, 'other',     'Outro',           '#888888', 'food',             70);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER families_seed_dish_types
  AFTER INSERT ON families
  FOR EACH ROW EXECUTE FUNCTION seed_dish_types_for_family();
