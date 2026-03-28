-- Task templates + multi-profile support for template items

-- 1a. Multi-profile for template_items
CREATE TABLE template_item_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_item_id uuid NOT NULL REFERENCES template_items(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  UNIQUE(template_item_id, profile_id)
);
CREATE INDEX idx_template_item_profiles_item ON template_item_profiles(template_item_id);
ALTER TABLE template_item_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "family template item profiles" ON template_item_profiles FOR ALL
  USING (template_item_id IN (
    SELECT id FROM template_items WHERE family_id = (SELECT family_id FROM user_accounts WHERE id = auth.uid())
  ));

-- Migrate existing profile_id data
INSERT INTO template_item_profiles (template_item_id, profile_id)
SELECT id, profile_id FROM template_items WHERE profile_id IS NOT NULL;
ALTER TABLE template_items DROP COLUMN profile_id;

-- 1b. Task templates
CREATE TABLE task_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  title text NOT NULL,
  category_id uuid NOT NULL REFERENCES categories(id) ON DELETE SET NULL,
  deadline_days integer NOT NULL DEFAULT 30,
  is_all_family boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_task_templates_family ON task_templates(family_id);
ALTER TABLE task_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "family task templates" ON task_templates FOR ALL
  USING (family_id = (SELECT family_id FROM user_accounts WHERE id = auth.uid()));

CREATE TABLE task_template_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_template_id uuid NOT NULL REFERENCES task_templates(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  UNIQUE(task_template_id, tag_id)
);
ALTER TABLE task_template_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "family task template tags" ON task_template_tags FOR ALL
  USING (task_template_id IN (
    SELECT id FROM task_templates WHERE family_id = (SELECT family_id FROM user_accounts WHERE id = auth.uid())
  ));

CREATE TABLE task_template_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_template_id uuid NOT NULL REFERENCES task_templates(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  UNIQUE(task_template_id, profile_id)
);
ALTER TABLE task_template_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "family task template profiles" ON task_template_profiles FOR ALL
  USING (task_template_id IN (
    SELECT id FROM task_templates WHERE family_id = (SELECT family_id FROM user_accounts WHERE id = auth.uid())
  ));
