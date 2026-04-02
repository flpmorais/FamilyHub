-- V3 Meal Plan configuration
-- Stores default participants and skip flags per day-of-week + meal slot

CREATE TABLE meal_plan_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL,
  meal_slot TEXT NOT NULL,
  participants JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_skip BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT chk_config_day CHECK (day_of_week BETWEEN 1 AND 7),
  CONSTRAINT chk_config_slot CHECK (meal_slot IN ('lunch', 'dinner')),
  CONSTRAINT uq_config_slot UNIQUE (family_id, day_of_week, meal_slot)
);

CREATE TRIGGER set_meal_plan_config_updated_at
  BEFORE UPDATE ON meal_plan_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE meal_plan_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY meal_plan_config_family_policy ON meal_plan_config
  FOR ALL
  USING (family_id IN (SELECT family_id FROM user_accounts WHERE id = auth.uid()))
  WITH CHECK (family_id IN (SELECT family_id FROM user_accounts WHERE id = auth.uid()));
