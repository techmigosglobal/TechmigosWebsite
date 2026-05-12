-- Create showcase-screenshots storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'showcase-screenshots',
  'showcase-screenshots',
  true,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to showcase-screenshots bucket
DROP POLICY IF EXISTS "Public read showcase screenshots" ON storage.objects;
CREATE POLICY "Public read showcase screenshots"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'showcase-screenshots');

-- Allow authenticated admins to upload screenshots
DROP POLICY IF EXISTS "Admin upload showcase screenshots" ON storage.objects;
CREATE POLICY "Admin upload showcase screenshots"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'showcase-screenshots'
  AND public.is_admin_from_auth()
);

-- Allow authenticated admins to delete screenshots
DROP POLICY IF EXISTS "Admin delete showcase screenshots" ON storage.objects;
CREATE POLICY "Admin delete showcase screenshots"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'showcase-screenshots'
  AND public.is_admin_from_auth()
);
