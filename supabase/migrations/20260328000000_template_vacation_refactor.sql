-- Template & vacation refactor: single template list, vacation categories/tags, all-family support

-- 1. Categories: add is_default
ALTER TABLE categories ADD COLUMN is_default boolean NOT NULL DEFAULT false;

-- 2. Packing items: add is_all_family
ALTER TABLE packing_items ADD COLUMN is_all_family boolean NOT NULL DEFAULT false;

-- 3. Template items: drop template_id, make category_id NOT NULL, add is_all_family
DELETE FROM template_item_tags WHERE template_item_id IN (
  SELECT id FROM template_items WHERE category_id IS NULL);
DELETE FROM template_items WHERE category_id IS NULL;
ALTER TABLE template_items DROP CONSTRAINT template_items_template_id_fkey;
ALTER TABLE template_items DROP COLUMN template_id;
ALTER TABLE template_items ALTER COLUMN category_id SET NOT NULL;
ALTER TABLE template_items ADD COLUMN is_all_family boolean NOT NULL DEFAULT false;

-- 4. Drop templates table
DROP TABLE templates;

-- 5. Vacation categories join table
CREATE TABLE vacation_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vacation_id uuid NOT NULL REFERENCES vacations(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  UNIQUE(vacation_id, category_id)
);
CREATE INDEX idx_vacation_categories_vacation ON vacation_categories(vacation_id);
ALTER TABLE vacation_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "family vacation categories" ON vacation_categories FOR ALL
  USING (vacation_id IN (
    SELECT id FROM vacations WHERE family_id = (SELECT family_id FROM user_accounts WHERE id = auth.uid())
  ));

-- 6. Vacation tags join table
CREATE TABLE vacation_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vacation_id uuid NOT NULL REFERENCES vacations(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  UNIQUE(vacation_id, tag_id)
);
CREATE INDEX idx_vacation_tags_vacation ON vacation_tags(vacation_id);
ALTER TABLE vacation_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "family vacation tags" ON vacation_tags FOR ALL
  USING (vacation_id IN (
    SELECT id FROM vacations WHERE family_id = (SELECT family_id FROM user_accounts WHERE id = auth.uid())
  ));
