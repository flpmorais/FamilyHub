-- Add type field to leftovers (meal, main, soup, side)
ALTER TABLE leftovers ADD COLUMN type text NOT NULL DEFAULT 'meal'
  CHECK (type IN ('meal', 'main', 'soup', 'side'));
