-- Add icon to tags (mandatory, like categories)
ALTER TABLE tags ADD COLUMN icon text NOT NULL DEFAULT 'tag';
