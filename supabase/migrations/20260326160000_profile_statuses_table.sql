-- Migration 011: Profile statuses as a reference table
--
-- Replaces the CHECK constraint on profiles.status with a FK to a
-- profile_statuses lookup table.

CREATE TABLE profile_statuses (
  id   text PRIMARY KEY,
  name text NOT NULL
);

INSERT INTO profile_statuses (id, name) VALUES
  ('active',   'Activo'),
  ('invited',  'Convidado'),
  ('enrolled', 'Inscrito'),
  ('inactive', 'Inactivo');

-- Drop the inline CHECK constraint and add the FK
ALTER TABLE profiles DROP CONSTRAINT profiles_status_check;
ALTER TABLE profiles
  ADD CONSTRAINT profiles_status_fk FOREIGN KEY (status) REFERENCES profile_statuses(id);

-- Allow all authenticated users to read the lookup table
ALTER TABLE profile_statuses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profile_statuses_select_authenticated"
  ON profile_statuses FOR SELECT
  TO authenticated
  USING (true);
