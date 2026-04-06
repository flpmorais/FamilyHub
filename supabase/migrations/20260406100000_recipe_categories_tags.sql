-- Recipe categories and tags (V5 Story 17.2)

-- recipe_categories table
CREATE TABLE recipe_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_recipe_categories_family_name UNIQUE (family_id, name)
);

CREATE UNIQUE INDEX idx_recipe_categories_family_lower_name
  ON recipe_categories(family_id, lower(name));

ALTER TABLE recipe_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage family recipe categories"
  ON recipe_categories FOR ALL
  USING (family_id = (SELECT family_id FROM user_accounts WHERE id = auth.uid()))
  WITH CHECK (family_id = (SELECT family_id FROM user_accounts WHERE id = auth.uid()));

CREATE TRIGGER set_updated_at BEFORE UPDATE ON recipe_categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- recipe_tags table
CREATE TABLE recipe_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_recipe_tags_family_name UNIQUE (family_id, name)
);

CREATE UNIQUE INDEX idx_recipe_tags_family_lower_name
  ON recipe_tags(family_id, lower(name));

ALTER TABLE recipe_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage family recipe tags"
  ON recipe_tags FOR ALL
  USING (family_id = (SELECT family_id FROM user_accounts WHERE id = auth.uid()))
  WITH CHECK (family_id = (SELECT family_id FROM user_accounts WHERE id = auth.uid()));

CREATE TRIGGER set_updated_at BEFORE UPDATE ON recipe_tags
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- recipe_category_assignments junction
CREATE TABLE recipe_category_assignments (
  recipe_id uuid NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES recipe_categories(id) ON DELETE CASCADE,
  PRIMARY KEY (recipe_id, category_id)
);

ALTER TABLE recipe_category_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage recipe category assignments"
  ON recipe_category_assignments FOR ALL
  USING (recipe_id IN (SELECT id FROM recipes WHERE family_id = (SELECT family_id FROM user_accounts WHERE id = auth.uid())))
  WITH CHECK (recipe_id IN (SELECT id FROM recipes WHERE family_id = (SELECT family_id FROM user_accounts WHERE id = auth.uid())));

CREATE INDEX idx_recipe_category_assignments_recipe ON recipe_category_assignments(recipe_id);

-- recipe_tag_assignments junction
CREATE TABLE recipe_tag_assignments (
  recipe_id uuid NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES recipe_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (recipe_id, tag_id)
);

ALTER TABLE recipe_tag_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage recipe tag assignments"
  ON recipe_tag_assignments FOR ALL
  USING (recipe_id IN (SELECT id FROM recipes WHERE family_id = (SELECT family_id FROM user_accounts WHERE id = auth.uid())))
  WITH CHECK (recipe_id IN (SELECT id FROM recipes WHERE family_id = (SELECT family_id FROM user_accounts WHERE id = auth.uid())));

CREATE INDEX idx_recipe_tag_assignments_recipe ON recipe_tag_assignments(recipe_id);
