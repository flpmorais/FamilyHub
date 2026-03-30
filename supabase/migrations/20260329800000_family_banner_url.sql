-- Add banner_url column to families table
ALTER TABLE families ADD COLUMN IF NOT EXISTS banner_url text;

-- Create storage bucket for family banners
INSERT INTO storage.buckets (id, name, public) VALUES ('family-banners', 'family-banners', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload/read family banners
CREATE POLICY "family_banners_select" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'family-banners');
CREATE POLICY "family_banners_insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'family-banners');
CREATE POLICY "family_banners_update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'family-banners');
