-- Leftovers module (V2 — Story 6.1)

CREATE TABLE leftovers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  name text NOT NULL,
  total_doses integer NOT NULL,
  doses_eaten integer NOT NULL DEFAULT 0,
  doses_thrown_out integer NOT NULL DEFAULT 0,
  expiry_days integer NOT NULL DEFAULT 5,
  date_added timestamptz NOT NULL DEFAULT now(),
  expiry_date timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT chk_doses CHECK (doses_eaten + doses_thrown_out <= total_doses),
  CONSTRAINT chk_total_positive CHECK (total_doses > 0),
  CONSTRAINT chk_expiry_positive CHECK (expiry_days > 0),
  CONSTRAINT chk_status CHECK (status IN ('active', 'closed'))
);

CREATE INDEX idx_leftovers_family_id_status ON leftovers(family_id, status);

ALTER TABLE leftovers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "family members can manage leftovers"
  ON leftovers FOR ALL
  USING (family_id = (SELECT family_id FROM user_accounts WHERE id = auth.uid()));

-- updated_at trigger (same pattern as other tables)
CREATE TRIGGER set_leftovers_updated_at
  BEFORE UPDATE ON leftovers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
