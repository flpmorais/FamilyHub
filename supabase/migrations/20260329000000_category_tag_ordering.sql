-- Add sort_order to categories and tags

ALTER TABLE categories ADD COLUMN sort_order integer NOT NULL DEFAULT 0;
ALTER TABLE tags ADD COLUMN sort_order integer NOT NULL DEFAULT 0;

-- Set initial orders based on name
UPDATE categories SET sort_order = sub.rn FROM (
  SELECT id, ROW_NUMBER() OVER (ORDER BY name) AS rn FROM categories
) sub WHERE categories.id = sub.id;

UPDATE tags SET sort_order = sub.rn FROM (
  SELECT id, ROW_NUMBER() OVER (ORDER BY name) AS rn FROM tags
) sub WHERE tags.id = sub.id;
