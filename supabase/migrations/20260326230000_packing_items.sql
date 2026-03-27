-- packing_items table for vacation packing list (Story 3.2)

CREATE TABLE packing_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vacation_id uuid NOT NULL REFERENCES vacations(id) ON DELETE CASCADE,
  family_id uuid NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  title text NOT NULL,
  status text NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'buy', 'ready', 'issue', 'last_minute', 'packed')),
  profile_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  quantity integer NOT NULL DEFAULT 1,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_packing_items_vacation_id ON packing_items(vacation_id);

ALTER TABLE packing_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "family members can manage packing items"
  ON packing_items FOR ALL
  USING (family_id = (SELECT family_id FROM user_accounts WHERE id = auth.uid()));
