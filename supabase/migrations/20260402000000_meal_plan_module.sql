-- V3 Meal Plan module
-- Stores meal entries for the weekly meal plan grid (lunch + dinner, Mon-Sun)

CREATE TABLE meal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  day_of_week INTEGER NOT NULL,
  meal_slot TEXT NOT NULL,
  name TEXT NOT NULL,
  meal_type TEXT NOT NULL DEFAULT 'home_cooked',
  detail TEXT,
  linked_meal_id UUID REFERENCES meal_entries(id) ON DELETE SET NULL,
  participants JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_slot_overridden BOOLEAN NOT NULL DEFAULT false,
  is_slot_skipped BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT chk_day_of_week CHECK (day_of_week BETWEEN 1 AND 7),
  CONSTRAINT chk_meal_slot CHECK (meal_slot IN ('lunch', 'dinner')),
  CONSTRAINT chk_meal_type CHECK (meal_type IN ('home_cooked', 'eating_out', 'takeaway', 'leftovers')),
  CONSTRAINT uq_meal_slot_per_day UNIQUE (family_id, week_start, day_of_week, meal_slot)
);

CREATE TRIGGER set_meal_entries_updated_at
  BEFORE UPDATE ON meal_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX idx_meal_entries_family_week ON meal_entries(family_id, week_start);

ALTER TABLE meal_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY meal_entries_family_policy ON meal_entries
  FOR ALL
  USING (family_id IN (SELECT family_id FROM user_accounts WHERE id = auth.uid()))
  WITH CHECK (family_id IN (SELECT family_id FROM user_accounts WHERE id = auth.uid()));
