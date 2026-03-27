-- Migration 018: Booking Tasks

-- ─── 1. Booking task types lookup table ──────────────────────────────────────

CREATE TABLE booking_task_types (
  id   text PRIMARY KEY,
  name text NOT NULL
);

INSERT INTO booking_task_types (id, name) VALUES
  ('flights',        'Voos'),
  ('hotel',          'Hotel'),
  ('car',            'Rent-a-car'),
  ('insurance',      'Seguro'),
  ('document_check', 'Documentos'),
  ('custom',         'Personalizada');

ALTER TABLE booking_task_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "booking_task_types_select_authenticated"
  ON booking_task_types FOR SELECT TO authenticated USING (true);

-- ─── 2. Booking tasks table ─────────────────────────────────────────────────

CREATE TABLE booking_tasks (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  vacation_id     uuid NOT NULL REFERENCES vacations(id) ON DELETE CASCADE,
  family_id       uuid NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  title           text NOT NULL,
  task_type       text NOT NULL DEFAULT 'custom'
                  REFERENCES booking_task_types(id),
  deadline_days   integer,
  due_date        date,
  is_complete     boolean DEFAULT false NOT NULL,
  parent_task_id  uuid REFERENCES booking_tasks(id) ON DELETE CASCADE,
  profile_id      uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at      timestamptz DEFAULT now() NOT NULL,
  updated_at      timestamptz DEFAULT now() NOT NULL
);

CREATE TRIGGER booking_tasks_updated_at
  BEFORE UPDATE ON booking_tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE booking_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "booking_tasks_family_rw"
  ON booking_tasks FOR ALL
  USING (family_id = current_user_family_id());

CREATE INDEX idx_booking_tasks_vacation_id ON booking_tasks(vacation_id);
CREATE INDEX idx_booking_tasks_family_id ON booking_tasks(family_id);
