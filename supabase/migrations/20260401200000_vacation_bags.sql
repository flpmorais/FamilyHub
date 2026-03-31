-- Trip bags: association between a vacation and bag templates
CREATE TABLE vacation_bags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vacation_id uuid NOT NULL REFERENCES vacations(id) ON DELETE CASCADE,
  bag_template_id uuid NOT NULL REFERENCES bag_templates(id) ON DELETE CASCADE,
  is_top_level boolean NOT NULL DEFAULT true,
  UNIQUE(vacation_id, bag_template_id)
);

CREATE INDEX idx_vacation_bags_vacation ON vacation_bags(vacation_id);

ALTER TABLE vacation_bags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "family members can manage vacation_bags"
  ON vacation_bags FOR ALL
  USING (
    vacation_id IN (
      SELECT id FROM vacations
      WHERE family_id = (SELECT family_id FROM user_accounts WHERE id = auth.uid())
    )
  );

-- Add bag reference to packing items (nullable — item may not be in a bag yet)
ALTER TABLE packing_items ADD COLUMN vacation_bag_id uuid REFERENCES vacation_bags(id) ON DELETE SET NULL;
