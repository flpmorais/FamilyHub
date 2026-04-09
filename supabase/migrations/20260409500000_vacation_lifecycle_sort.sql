-- Generated column mapping lifecycle → sort rank so server-side ORDER BY
-- matches the client-side sortVacations() order:
--   active → packing → upcoming → planning → completed → cancelled

ALTER TABLE vacations
  ADD COLUMN lifecycle_sort integer GENERATED ALWAYS AS (
    CASE lifecycle
      WHEN 'active'    THEN 1
      WHEN 'packing'   THEN 2
      WHEN 'upcoming'  THEN 3
      WHEN 'planning'  THEN 4
      WHEN 'completed' THEN 5
      WHEN 'cancelled' THEN 6
      ELSE 99
    END
  ) STORED;

CREATE INDEX idx_vacations_family_sort
  ON vacations(family_id, lifecycle_sort, departure_date DESC);
