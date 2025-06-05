-- Create the article-images storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'article-images',
  'article-images', 
  true,
  10485760, -- 10MB limit (larger for article images)
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for the article-images bucket
CREATE POLICY "Allow authenticated users to upload article images" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'article-images');

CREATE POLICY "Allow authenticated users to view article images" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'article-images');

CREATE POLICY "Allow authenticated users to delete their article images" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'article-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Allow authenticated users to update their article images" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'article-images' AND auth.uid()::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'article-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow public access to view images (since bucket is public)
CREATE POLICY "Allow public to view article images" ON storage.objects
FOR SELECT TO anon
USING (bucket_id = 'article-images');

-- Additional policy for admin access (if admin_profiles table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'admin_profiles') THEN
    -- Allow admins to manage all article images
    EXECUTE 'CREATE POLICY "Allow admins to manage all article images" ON storage.objects
      FOR ALL TO authenticated
      USING (bucket_id = ''article-images'' AND EXISTS (SELECT 1 FROM admin_profiles WHERE id = auth.uid()))
      WITH CHECK (bucket_id = ''article-images'' AND EXISTS (SELECT 1 FROM admin_profiles WHERE id = auth.uid()))';
  END IF;
END $$; 