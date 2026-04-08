-- Recipe ratings: one rating per profile per recipe
CREATE TABLE recipe_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id uuid NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rating smallint NOT NULL CHECK (rating >= 1 AND rating <= 5),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (recipe_id, profile_id)
);

ALTER TABLE recipe_ratings ENABLE ROW LEVEL SECURITY;

-- Family members can read ratings for recipes in their family
CREATE POLICY "family_read_ratings" ON recipe_ratings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM recipes r
      JOIN profiles p ON p.family_id = r.family_id
      WHERE r.id = recipe_ratings.recipe_id
        AND p.id = recipe_ratings.profile_id
    )
  );

-- Users can manage their own ratings (matched via user_accounts.profile_id)
CREATE POLICY "own_rating_insert" ON recipe_ratings
  FOR INSERT WITH CHECK (
    profile_id = (SELECT profile_id FROM user_accounts WHERE id = auth.uid())
  );

CREATE POLICY "own_rating_update" ON recipe_ratings
  FOR UPDATE USING (
    profile_id = (SELECT profile_id FROM user_accounts WHERE id = auth.uid())
  );

CREATE POLICY "own_rating_delete" ON recipe_ratings
  FOR DELETE USING (
    profile_id = (SELECT profile_id FROM user_accounts WHERE id = auth.uid())
  );

CREATE INDEX idx_recipe_ratings_recipe ON recipe_ratings(recipe_id);
