-- Migration 008: Avatars storage bucket
--
-- Creates a public bucket for profile avatar images.
-- Path convention: avatars/{family_id}/{profile_id}.jpg
-- Public bucket: URLs are accessible without auth (fine for avatars).
-- RLS restricts upload/delete to authenticated family members.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  1048576,  -- 1 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Family members can read, upload, update, and delete avatars
-- in their own family's folder (first path segment = family_id).
CREATE POLICY "avatars_family_access"
  ON storage.objects FOR ALL
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = current_user_family_id()::text
  )
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = current_user_family_id()::text
  );
