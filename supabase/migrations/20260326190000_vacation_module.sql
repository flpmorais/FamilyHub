-- Migration 015: Vacation Module
--
-- Creates vacation_lifecycles lookup, vacations table,
-- and vacation_participants join table.

-- ─── 1. Vacation Lifecycles lookup table ─────────────────────────────────────

CREATE TABLE vacation_lifecycles (
  id   text PRIMARY KEY,
  name text NOT NULL
);

INSERT INTO vacation_lifecycles (id, name) VALUES
  ('planning',  'Planeamento'),
  ('upcoming',  'Próxima'),
  ('active',    'Em curso'),
  ('completed', 'Concluída');

ALTER TABLE vacation_lifecycles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vacation_lifecycles_select_authenticated"
  ON vacation_lifecycles FOR SELECT
  TO authenticated
  USING (true);

-- ─── 2. Vacations table ─────────────────────────────────────────────────────

CREATE TABLE vacations (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id       uuid NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  title           text NOT NULL,
  destination     text,
  cover_image_url text,
  departure_date  date NOT NULL,
  return_date     date NOT NULL,
  lifecycle       text NOT NULL DEFAULT 'planning'
                  REFERENCES vacation_lifecycles(id),
  is_pinned       boolean DEFAULT false NOT NULL,
  created_at      timestamptz DEFAULT now() NOT NULL,
  updated_at      timestamptz DEFAULT now() NOT NULL
);

CREATE TRIGGER vacations_updated_at
  BEFORE UPDATE ON vacations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE vacations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vacations_family_rw"
  ON vacations FOR ALL
  USING (family_id = current_user_family_id());

CREATE INDEX idx_vacations_family_id ON vacations(family_id);

-- ─── 3. Vacation Participants join table ─────────────────────────────────────

CREATE TABLE vacation_participants (
  vacation_id uuid NOT NULL REFERENCES vacations(id) ON DELETE CASCADE,
  profile_id  uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at  timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (vacation_id, profile_id)
);

ALTER TABLE vacation_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vacation_participants_family_rw"
  ON vacation_participants FOR ALL
  USING (EXISTS (
    SELECT 1 FROM vacations v
    WHERE v.id = vacation_participants.vacation_id
      AND v.family_id = current_user_family_id()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM vacations v
    WHERE v.id = vacation_participants.vacation_id
      AND v.family_id = current_user_family_id()
  ));

CREATE INDEX idx_vacation_participants_vacation_id ON vacation_participants(vacation_id);
CREATE INDEX idx_vacation_participants_profile_id ON vacation_participants(profile_id);
