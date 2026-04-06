-- Meal plan recipe integration (V5 Story 20.1)
-- Junction table linking meal_entries to recipes with per-slot servings override

CREATE TABLE meal_entry_recipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_entry_id uuid NOT NULL REFERENCES meal_entries(id) ON DELETE CASCADE,
  recipe_id uuid NOT NULL REFERENCES recipes(id) ON DELETE RESTRICT,
  servings_override integer NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_meal_entry_recipe UNIQUE (meal_entry_id, recipe_id),
  CONSTRAINT chk_servings_positive CHECK (servings_override > 0)
);

ALTER TABLE meal_entry_recipes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage meal entry recipes"
  ON meal_entry_recipes FOR ALL
  USING (meal_entry_id IN (SELECT id FROM meal_entries WHERE family_id = (SELECT family_id FROM user_accounts WHERE id = auth.uid())))
  WITH CHECK (meal_entry_id IN (SELECT id FROM meal_entries WHERE family_id = (SELECT family_id FROM user_accounts WHERE id = auth.uid())));

CREATE TRIGGER set_updated_at BEFORE UPDATE ON meal_entry_recipes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX idx_meal_entry_recipes_meal_entry ON meal_entry_recipes(meal_entry_id);
