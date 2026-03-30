-- Allow authenticated users to update their family
CREATE POLICY "families_update_authenticated"
  ON families FOR UPDATE
  TO authenticated
  USING (
    id IN (SELECT family_id FROM user_accounts WHERE id = auth.uid())
  )
  WITH CHECK (
    id IN (SELECT family_id FROM user_accounts WHERE id = auth.uid())
  );
