-- Fix icons RLS policy to match project pattern
DROP POLICY IF EXISTS "authenticated users can read icons" ON icons;
CREATE POLICY "icons_select_authenticated"
  ON icons FOR SELECT TO authenticated USING (true);

NOTIFY pgrst, 'reload schema';
