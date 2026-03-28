-- Add sort_order to profiles and template_items

ALTER TABLE profiles ADD COLUMN sort_order integer NOT NULL DEFAULT 0;

-- Set initial order for Morais family
UPDATE profiles SET sort_order = 1 WHERE display_name = 'Filipe';
UPDATE profiles SET sort_order = 2 WHERE display_name = 'Angela';
UPDATE profiles SET sort_order = 3 WHERE display_name = 'Aurora';
UPDATE profiles SET sort_order = 4 WHERE display_name = 'Isabel';
-- Fallback for any without order
UPDATE profiles SET sort_order = (
  SELECT COALESCE(MAX(p2.sort_order), 0) + 1 FROM profiles p2
) WHERE sort_order = 0;

ALTER TABLE template_items ADD COLUMN sort_order integer NOT NULL DEFAULT 0;
UPDATE template_items SET sort_order = sub.rn FROM (
  SELECT id, ROW_NUMBER() OVER (ORDER BY title) AS rn FROM template_items
) sub WHERE template_items.id = sub.id;
