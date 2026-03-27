-- Categories, tags, and packing item tag associations (Story 4.1)

CREATE TABLE categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  name text NOT NULL,
  icon text NOT NULL DEFAULT 'category',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_categories_family_id ON categories(family_id);
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "family members can manage categories"
  ON categories FOR ALL
  USING (family_id = (SELECT family_id FROM user_accounts WHERE id = auth.uid()));

CREATE TABLE tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_tags_family_id ON tags(family_id);
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "family members can manage tags"
  ON tags FOR ALL
  USING (family_id = (SELECT family_id FROM user_accounts WHERE id = auth.uid()));

CREATE TABLE packing_item_tags (
  packing_item_id uuid NOT NULL REFERENCES packing_items(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (packing_item_id, tag_id)
);

ALTER TABLE packing_item_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "family members can manage packing item tags"
  ON packing_item_tags FOR ALL
  USING (
    packing_item_id IN (
      SELECT id FROM packing_items
      WHERE family_id = (SELECT family_id FROM user_accounts WHERE id = auth.uid())
    )
  );

-- Add category_id to packing_items
ALTER TABLE packing_items ADD COLUMN category_id uuid REFERENCES categories(id) ON DELETE SET NULL;
