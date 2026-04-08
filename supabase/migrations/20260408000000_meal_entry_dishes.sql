-- Meal entry dishes redesign: replace meal_entry_recipes with multi-type dish system
-- Supports: recipe, manual, resto (reuse from recent meals), fridge (from leftovers)

-- 1. Create the new meal_entry_dishes table
CREATE TABLE meal_entry_dishes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_entry_id uuid NOT NULL REFERENCES meal_entries(id) ON DELETE CASCADE,
  dish_type text NOT NULL,
  -- For 'recipe' type
  recipe_id uuid REFERENCES recipes(id) ON DELETE RESTRICT,
  -- For 'manual' type
  manual_name text,
  manual_category text,
  -- For 'resto' type (links to a previous dish)
  source_dish_id uuid REFERENCES meal_entry_dishes(id) ON DELETE SET NULL,
  -- For 'fridge' type (links to a leftover)
  leftover_id uuid REFERENCES leftovers(id) ON DELETE SET NULL,
  -- Shared
  servings_override integer,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT chk_dish_type CHECK (dish_type IN ('recipe', 'manual', 'resto', 'fridge')),
  CONSTRAINT chk_manual_category CHECK (
    manual_category IS NULL OR manual_category IN ('meal', 'main', 'side', 'soup', 'dessert', 'other')
  ),
  CONSTRAINT chk_servings_positive CHECK (servings_override IS NULL OR servings_override > 0),
  -- Type-specific NOT NULL enforcement
  CONSTRAINT chk_recipe_dish CHECK (dish_type != 'recipe' OR recipe_id IS NOT NULL),
  CONSTRAINT chk_manual_dish CHECK (dish_type != 'manual' OR (manual_name IS NOT NULL AND manual_category IS NOT NULL)),
  CONSTRAINT chk_resto_dish CHECK (dish_type != 'resto' OR source_dish_id IS NOT NULL),
  CONSTRAINT chk_fridge_dish CHECK (dish_type != 'fridge' OR leftover_id IS NOT NULL)
);

CREATE INDEX idx_meal_entry_dishes_entry ON meal_entry_dishes(meal_entry_id);
CREATE INDEX idx_meal_entry_dishes_recipe ON meal_entry_dishes(recipe_id) WHERE recipe_id IS NOT NULL;
CREATE INDEX idx_meal_entry_dishes_source ON meal_entry_dishes(source_dish_id) WHERE source_dish_id IS NOT NULL;
CREATE INDEX idx_meal_entry_dishes_leftover ON meal_entry_dishes(leftover_id) WHERE leftover_id IS NOT NULL;

ALTER TABLE meal_entry_dishes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "family members manage meal entry dishes"
  ON meal_entry_dishes FOR ALL
  USING (meal_entry_id IN (
    SELECT id FROM meal_entries WHERE family_id = (
      SELECT family_id FROM user_accounts WHERE id = auth.uid()
    )
  ))
  WITH CHECK (meal_entry_id IN (
    SELECT id FROM meal_entries WHERE family_id = (
      SELECT family_id FROM user_accounts WHERE id = auth.uid()
    )
  ));

CREATE TRIGGER set_meal_entry_dishes_updated_at
  BEFORE UPDATE ON meal_entry_dishes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 2. Migrate existing data from meal_entry_recipes
INSERT INTO meal_entry_dishes (id, meal_entry_id, dish_type, recipe_id, servings_override, sort_order, created_at, updated_at)
SELECT id, meal_entry_id, 'recipe', recipe_id, servings_override, sort_order, created_at, updated_at
FROM meal_entry_recipes;

-- 3. Drop the old table
DROP TABLE meal_entry_recipes;

-- 4. Convert existing 'leftovers' meal entries to 'home_cooked'
UPDATE meal_entries SET meal_type = 'home_cooked' WHERE meal_type = 'leftovers';

-- 5. Remove linked_meal_id column (no longer needed)
ALTER TABLE meal_entries DROP COLUMN linked_meal_id;

-- 6. Update meal_type constraint (remove 'leftovers')
ALTER TABLE meal_entries DROP CONSTRAINT chk_meal_type;
ALTER TABLE meal_entries ADD CONSTRAINT chk_meal_type
  CHECK (meal_type IN ('home_cooked', 'eating_out', 'takeaway'));

-- 7. Expand leftover type categories to match recipe types
ALTER TABLE leftovers DROP CONSTRAINT IF EXISTS leftovers_type_check;
ALTER TABLE leftovers ADD CONSTRAINT leftovers_type_check
  CHECK (type IN ('meal', 'main', 'side', 'soup', 'dessert', 'other'));
