-- Add urgent flag to shopping items
ALTER TABLE shopping_items ADD COLUMN is_urgent boolean NOT NULL DEFAULT false;
