-- Migration: Create article_images table for image metadata storage
-- Date: 2025-01-22
-- Purpose: Create table structure for storing article image metadata and relationships

-- Create the article_images table
CREATE TABLE IF NOT EXISTS article_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES content_briefs(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  filename TEXT NOT NULL,
  alt_text TEXT,
  caption TEXT,
  position_data JSONB DEFAULT '{}',
  file_size INTEGER,
  mime_type TEXT,
  width INTEGER,
  height INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_article_images_article_id ON article_images(article_id);
CREATE INDEX IF NOT EXISTS idx_article_images_created_at ON article_images(created_at);
CREATE INDEX IF NOT EXISTS idx_article_images_storage_path ON article_images(storage_path);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_article_images_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER article_images_updated_at
  BEFORE UPDATE ON article_images
  FOR EACH ROW
  EXECUTE FUNCTION update_article_images_updated_at();

-- Enable Row Level Security
ALTER TABLE article_images ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Allow users to view images for their own articles
CREATE POLICY "Users can view images for their own articles" ON article_images
  FOR SELECT USING (
    article_id IN (
      SELECT id FROM content_briefs WHERE user_id = auth.uid()
    )
  );

-- Allow users to insert images for their own articles
CREATE POLICY "Users can insert images for their own articles" ON article_images
  FOR INSERT WITH CHECK (
    article_id IN (
      SELECT id FROM content_briefs WHERE user_id = auth.uid()
    )
  );

-- Allow users to update images for their own articles
CREATE POLICY "Users can update images for their own articles" ON article_images
  FOR UPDATE USING (
    article_id IN (
      SELECT id FROM content_briefs WHERE user_id = auth.uid()
    )
  );

-- Allow users to delete images for their own articles
CREATE POLICY "Users can delete images for their own articles" ON article_images
  FOR DELETE USING (
    article_id IN (
      SELECT id FROM content_briefs WHERE user_id = auth.uid()
    )
  );

-- Admin policies (if admin_profiles table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'admin_profiles') THEN
    -- Allow admins to view all images
    EXECUTE 'CREATE POLICY "Admins can view all article images" ON article_images
      FOR SELECT USING (
        EXISTS (SELECT 1 FROM admin_profiles WHERE id = auth.uid())
      )';
    
    -- Allow admins to update all images
    EXECUTE 'CREATE POLICY "Admins can update all article images" ON article_images
      FOR UPDATE USING (
        EXISTS (SELECT 1 FROM admin_profiles WHERE id = auth.uid())
      )';
    
    -- Allow admins to delete all images
    EXECUTE 'CREATE POLICY "Admins can delete all article images" ON article_images
      FOR DELETE USING (
        EXISTS (SELECT 1 FROM admin_profiles WHERE id = auth.uid())
      )';
  END IF;
END $$;

-- Comments for documentation
COMMENT ON TABLE article_images IS 'Stores metadata for images used in articles';
COMMENT ON COLUMN article_images.storage_path IS 'Path to the image file in Supabase Storage';
COMMENT ON COLUMN article_images.position_data IS 'JSON data for image positioning within article content';
COMMENT ON COLUMN article_images.alt_text IS 'Alternative text for accessibility';
COMMENT ON COLUMN article_images.caption IS 'Optional caption text displayed with the image'; 