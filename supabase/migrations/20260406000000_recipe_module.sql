-- Recipe module tables (V5 Story 17.1)

-- recipes table
CREATE TABLE recipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL REFERENCES families(id),
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('meal', 'main', 'side', 'soup', 'dessert', 'other')),
  servings integer NOT NULL DEFAULT 4,
  prep_time_minutes integer,
  cook_time_minutes integer,
  cost text,
  image_url text,
  import_method text NOT NULL DEFAULT 'manual' CHECK (import_method IN ('manual', 'url', 'youtube', 'ocr')),
  source_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- recipe_ingredients table
CREATE TABLE recipe_ingredients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id uuid NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  ingredient_name text NOT NULL,
  quantity text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- recipe_steps table
CREATE TABLE recipe_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id uuid NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  step_number integer NOT NULL,
  step_text text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage family recipes"
  ON recipes FOR ALL
  USING (family_id = (SELECT family_id FROM user_accounts WHERE id = auth.uid()))
  WITH CHECK (family_id = (SELECT family_id FROM user_accounts WHERE id = auth.uid()));

CREATE POLICY "Admins manage recipe ingredients"
  ON recipe_ingredients FOR ALL
  USING (recipe_id IN (SELECT id FROM recipes WHERE family_id = (SELECT family_id FROM user_accounts WHERE id = auth.uid())))
  WITH CHECK (recipe_id IN (SELECT id FROM recipes WHERE family_id = (SELECT family_id FROM user_accounts WHERE id = auth.uid())));

CREATE POLICY "Admins manage recipe steps"
  ON recipe_steps FOR ALL
  USING (recipe_id IN (SELECT id FROM recipes WHERE family_id = (SELECT family_id FROM user_accounts WHERE id = auth.uid())))
  WITH CHECK (recipe_id IN (SELECT id FROM recipes WHERE family_id = (SELECT family_id FROM user_accounts WHERE id = auth.uid())));

-- updated_at triggers
CREATE TRIGGER set_updated_at BEFORE UPDATE ON recipes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON recipe_ingredients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON recipe_steps
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Indexes
CREATE INDEX idx_recipes_family_type ON recipes(family_id, type);
CREATE INDEX idx_recipe_ingredients_recipe ON recipe_ingredients(recipe_id);
CREATE INDEX idx_recipe_steps_recipe ON recipe_steps(recipe_id);
