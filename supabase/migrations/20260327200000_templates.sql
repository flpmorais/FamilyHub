-- Reusable packing templates (Story 4.2)

CREATE TABLE templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_templates_family_id ON templates(family_id);
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "family members can manage templates"
  ON templates FOR ALL
  USING (family_id = (SELECT family_id FROM user_accounts WHERE id = auth.uid()));

CREATE TABLE template_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
  family_id uuid NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  title text NOT NULL,
  profile_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  quantity integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_template_items_template_id ON template_items(template_id);
ALTER TABLE template_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "family members can manage template items"
  ON template_items FOR ALL
  USING (family_id = (SELECT family_id FROM user_accounts WHERE id = auth.uid()));

CREATE TABLE template_item_tags (
  template_item_id uuid NOT NULL REFERENCES template_items(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (template_item_id, tag_id)
);

ALTER TABLE template_item_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "family members can manage template item tags"
  ON template_item_tags FOR ALL
  USING (
    template_item_id IN (
      SELECT id FROM template_items
      WHERE family_id = (SELECT family_id FROM user_accounts WHERE id = auth.uid())
    )
  );
