-- Bag templates: reusable bag definitions for packing
CREATE TABLE bag_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#888888',
  size_liters integer NOT NULL DEFAULT 40,
  is_top_level boolean NOT NULL DEFAULT true,
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_bag_templates_family_id ON bag_templates(family_id);

ALTER TABLE bag_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "family members can manage bag_templates"
  ON bag_templates FOR ALL
  USING (family_id = (SELECT family_id FROM user_accounts WHERE id = auth.uid()));
