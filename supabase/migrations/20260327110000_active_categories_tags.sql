-- Add active column to categories and tags (soft delete / deactivation support)

ALTER TABLE categories ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;
ALTER TABLE tags ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;
