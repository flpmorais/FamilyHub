-- Junction table: bags associated with vacation templates
CREATE TABLE vacation_template_bags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vacation_template_id uuid NOT NULL REFERENCES vacation_templates(id) ON DELETE CASCADE,
  bag_template_id uuid NOT NULL REFERENCES bag_templates(id) ON DELETE CASCADE,
  is_top_level boolean NOT NULL DEFAULT true,
  UNIQUE(vacation_template_id, bag_template_id)
);

ALTER TABLE vacation_template_bags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "family members can manage vacation_template_bags"
  ON vacation_template_bags FOR ALL
  USING (
    vacation_template_id IN (
      SELECT id FROM vacation_templates
      WHERE family_id = (SELECT family_id FROM user_accounts WHERE id = auth.uid())
    )
  );
