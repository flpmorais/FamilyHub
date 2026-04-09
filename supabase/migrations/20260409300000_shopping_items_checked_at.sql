-- `checked_at` records when a shopping item was most recently ticked.
-- Closed section is sorted by this column DESC so newly-checked items appear at the top.

ALTER TABLE shopping_items ADD COLUMN checked_at timestamptz;

-- Backfill existing ticked rows so they have a sane ordering until the next check event.
UPDATE shopping_items SET checked_at = updated_at WHERE is_ticked = true;

CREATE INDEX idx_shopping_items_family_checked_at
  ON shopping_items(family_id, is_ticked, checked_at DESC);
