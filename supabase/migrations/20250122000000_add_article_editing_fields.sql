-- Migration: Add article editing fields to content_briefs table
-- Date: 2025-01-22
-- Purpose: Add fields needed for the BOFU AI Article Editing System

-- Create editing_status enum if it doesn't exist
CREATE TYPE IF NOT EXISTS editing_status_enum AS ENUM (
  'draft',
  'editing', 
  'review',
  'final'
);

-- Add the new article editing fields to content_briefs table
ALTER TABLE content_briefs 
ADD COLUMN IF NOT EXISTS article_content TEXT,
ADD COLUMN IF NOT EXISTS article_version INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS last_edited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS last_edited_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS editing_status editing_status_enum DEFAULT 'draft';

-- Create index for better performance on common queries
CREATE INDEX IF NOT EXISTS idx_content_briefs_last_edited_at ON content_briefs(last_edited_at);
CREATE INDEX IF NOT EXISTS idx_content_briefs_editing_status ON content_briefs(editing_status);
CREATE INDEX IF NOT EXISTS idx_content_briefs_last_edited_by ON content_briefs(last_edited_by);

-- Add a trigger to automatically update last_edited_at when article_content changes
CREATE OR REPLACE FUNCTION update_article_last_edited()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update if article_content has actually changed
  IF OLD.article_content IS DISTINCT FROM NEW.article_content THEN
    NEW.last_edited_at = NOW();
    -- Increment version number
    NEW.article_version = COALESCE(OLD.article_version, 0) + 1;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_update_article_last_edited ON content_briefs;
CREATE TRIGGER trigger_update_article_last_edited
  BEFORE UPDATE ON content_briefs
  FOR EACH ROW
  EXECUTE FUNCTION update_article_last_edited();

-- Update existing records to have proper defaults
UPDATE content_briefs 
SET 
  article_version = 1,
  last_edited_at = updated_at,
  editing_status = 'draft'
WHERE 
  article_version IS NULL 
  OR last_edited_at IS NULL 
  OR editing_status IS NULL; 