-- Vacation templates table
CREATE TABLE vacation_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  country_code TEXT NOT NULL DEFAULT 'PRT',
  cover_image_url TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Vacation template participants join table
CREATE TABLE vacation_template_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vacation_template_id UUID NOT NULL REFERENCES vacation_templates(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Vacation template tags join table
CREATE TABLE vacation_template_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vacation_template_id UUID NOT NULL REFERENCES vacation_templates(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE
);

-- RLS
ALTER TABLE vacation_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE vacation_template_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE vacation_template_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Family members can manage vacation_templates"
  ON vacation_templates FOR ALL
  USING (family_id IN (SELECT family_id FROM user_accounts WHERE id = auth.uid()));

CREATE POLICY "Family members can manage vacation_template_participants"
  ON vacation_template_participants FOR ALL
  USING (vacation_template_id IN (
    SELECT id FROM vacation_templates
    WHERE family_id IN (SELECT family_id FROM user_accounts WHERE id = auth.uid())
  ));

CREATE POLICY "Family members can manage vacation_template_tags"
  ON vacation_template_tags FOR ALL
  USING (vacation_template_id IN (
    SELECT id FROM vacation_templates
    WHERE family_id IN (SELECT family_id FROM user_accounts WHERE id = auth.uid())
  ));
