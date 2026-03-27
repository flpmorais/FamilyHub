-- Add packing/cancelled lifecycle values, drop subtask support, add tag colors (Plan: lifecycle + UX improvements)

-- 1. Update lifecycle CHECK constraint to include packing and cancelled
-- The vacations table uses a text column with no CHECK constraint (verified), so no ALTER needed for lifecycle.
-- If a CHECK exists, this removes and re-adds it:
DO $$
BEGIN
  ALTER TABLE vacations DROP CONSTRAINT IF EXISTS vacations_lifecycle_check;
EXCEPTION WHEN undefined_object THEN
  NULL;
END $$;

-- 2. Drop parent_task_id from booking_tasks (remove subtask support)
ALTER TABLE booking_tasks DROP COLUMN IF EXISTS parent_task_id;

-- 3. Add color column to tags
ALTER TABLE tags ADD COLUMN IF NOT EXISTS color text NOT NULL DEFAULT '#888888';
