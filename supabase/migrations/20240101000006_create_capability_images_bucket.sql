-- Create the capability-images storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'capability-images',
  'capability-images', 
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for the capability-images bucket
CREATE POLICY "Allow authenticated users to upload capability images" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'capability-images');

CREATE POLICY "Allow authenticated users to view capability images" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'capability-images');

CREATE POLICY "Allow authenticated users to delete their capability images" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'capability-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Allow authenticated users to update their capability images" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'capability-images' AND auth.uid()::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'capability-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow public access to view images (since bucket is public)
CREATE POLICY "Allow public to view capability images" ON storage.objects
FOR SELECT TO anon
USING (bucket_id = 'capability-images'); 