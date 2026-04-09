-- Generated column for server-side "max total time" filter on the recipes list.
-- Lets us `.lte('total_time_minutes', X)` without an RPC.

ALTER TABLE recipes
  ADD COLUMN total_time_minutes integer GENERATED ALWAYS AS (
    COALESCE(prep_time_minutes, 0) + COALESCE(cook_time_minutes, 0)
  ) STORED;

CREATE INDEX idx_recipes_family_total_time ON recipes(family_id, total_time_minutes);
