-- Suggestions feature: statuses lookup, suggestions, comments, status history

-- ─── 1. Suggestion statuses lookup ────────────────────────────────────────────
CREATE TABLE suggestion_statuses (
  id   text PRIMARY KEY,
  name text NOT NULL
);

INSERT INTO suggestion_statuses (id, name) VALUES
  ('new',         'Novo'),
  ('rejected',    'Rejeitado'),
  ('accepted',    'Aceite'),
  ('planned',     'Planeado'),
  ('implemented', 'Implementado');

ALTER TABLE suggestion_statuses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_read_statuses" ON suggestion_statuses
  FOR SELECT TO authenticated USING (true);

-- ─── 2. Suggestions table ─────────────────────────────────────────────────────
CREATE TABLE suggestions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id   uuid NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  title       text NOT NULL CHECK (char_length(title) > 0),
  description text NOT NULL DEFAULT '',
  status      text NOT NULL DEFAULT 'new' REFERENCES suggestion_statuses(id),
  created_by  uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

ALTER TABLE suggestions ENABLE ROW LEVEL SECURITY;

-- Family members can read suggestions
CREATE POLICY "family_read_suggestions" ON suggestions
  FOR SELECT USING (
    family_id = (SELECT ua.family_id FROM user_accounts ua WHERE ua.id = auth.uid())
  );

-- Users can create suggestions for their family
CREATE POLICY "own_suggestion_insert" ON suggestions
  FOR INSERT WITH CHECK (
    created_by = (SELECT ua.profile_id FROM user_accounts ua WHERE ua.id = auth.uid())
    AND family_id = (SELECT ua.family_id FROM user_accounts ua WHERE ua.id = auth.uid())
  );

-- Creator can update title/description; admin can update anything (incl. status)
CREATE POLICY "suggestion_update" ON suggestions
  FOR UPDATE USING (
    created_by = (SELECT ua.profile_id FROM user_accounts ua WHERE ua.id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM profiles p
      JOIN user_accounts ua ON ua.profile_id = p.id
      WHERE ua.id = auth.uid() AND p.role = 'admin'
    )
  );

-- Only admin can delete suggestions
CREATE POLICY "admin_suggestion_delete" ON suggestions
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN user_accounts ua ON ua.profile_id = p.id
      WHERE ua.id = auth.uid() AND p.role = 'admin'
    )
  );

CREATE INDEX idx_suggestions_family ON suggestions(family_id);

ALTER PUBLICATION supabase_realtime ADD TABLE suggestions;

-- ─── 3. Suggestion comments ──────────────────────────────────────────────────
CREATE TABLE suggestion_comments (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  suggestion_id uuid NOT NULL REFERENCES suggestions(id) ON DELETE CASCADE,
  profile_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content       text NOT NULL CHECK (char_length(content) > 0),
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

ALTER TABLE suggestion_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "family_read_scomments" ON suggestion_comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM suggestions s
      WHERE s.id = suggestion_comments.suggestion_id
        AND s.family_id = (SELECT ua.family_id FROM user_accounts ua WHERE ua.id = auth.uid())
    )
  );

CREATE POLICY "own_scomment_insert" ON suggestion_comments
  FOR INSERT WITH CHECK (
    profile_id = (SELECT ua.profile_id FROM user_accounts ua WHERE ua.id = auth.uid())
  );

CREATE POLICY "own_scomment_update" ON suggestion_comments
  FOR UPDATE USING (
    profile_id = (SELECT ua.profile_id FROM user_accounts ua WHERE ua.id = auth.uid())
  );

CREATE POLICY "own_scomment_delete" ON suggestion_comments
  FOR DELETE USING (
    profile_id = (SELECT ua.profile_id FROM user_accounts ua WHERE ua.id = auth.uid())
  );

CREATE INDEX idx_suggestion_comments_suggestion ON suggestion_comments(suggestion_id);

ALTER PUBLICATION supabase_realtime ADD TABLE suggestion_comments;

-- ─── 4. Suggestion status history ────────────────────────────────────────────
CREATE TABLE suggestion_status_history (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  suggestion_id uuid NOT NULL REFERENCES suggestions(id) ON DELETE CASCADE,
  old_status    text REFERENCES suggestion_statuses(id),
  new_status    text NOT NULL REFERENCES suggestion_statuses(id),
  changed_by    uuid NOT NULL REFERENCES profiles(id),
  changed_at    timestamptz DEFAULT now()
);

ALTER TABLE suggestion_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "family_read_shistory" ON suggestion_status_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM suggestions s
      WHERE s.id = suggestion_status_history.suggestion_id
        AND s.family_id = (SELECT ua.family_id FROM user_accounts ua WHERE ua.id = auth.uid())
    )
  );

CREATE POLICY "admin_insert_shistory" ON suggestion_status_history
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN user_accounts ua ON ua.profile_id = p.id
      WHERE ua.id = auth.uid() AND p.role = 'admin'
    )
  );

CREATE INDEX idx_suggestion_status_history_suggestion ON suggestion_status_history(suggestion_id);
