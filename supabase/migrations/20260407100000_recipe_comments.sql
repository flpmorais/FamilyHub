-- Recipe comments: one or more comments per profile per recipe
CREATE TABLE recipe_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id uuid NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content text NOT NULL CHECK (char_length(content) > 0),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE recipe_comments ENABLE ROW LEVEL SECURITY;

-- Family members can read comments for recipes in their family
CREATE POLICY "family_read_comments" ON recipe_comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM recipes r
      JOIN profiles p ON p.family_id = r.family_id
      WHERE r.id = recipe_comments.recipe_id
        AND p.id = recipe_comments.profile_id
    )
  );

-- Users can create comments linked to their profile
CREATE POLICY "own_comment_insert" ON recipe_comments
  FOR INSERT WITH CHECK (
    profile_id = (SELECT profile_id FROM user_accounts WHERE id = auth.uid())
  );

-- Users can update only their own comments
CREATE POLICY "own_comment_update" ON recipe_comments
  FOR UPDATE USING (
    profile_id = (SELECT profile_id FROM user_accounts WHERE id = auth.uid())
  );

-- Users can delete only their own comments
CREATE POLICY "own_comment_delete" ON recipe_comments
  FOR DELETE USING (
    profile_id = (SELECT profile_id FROM user_accounts WHERE id = auth.uid())
  );

CREATE INDEX idx_recipe_comments_recipe ON recipe_comments(recipe_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE recipe_comments;
