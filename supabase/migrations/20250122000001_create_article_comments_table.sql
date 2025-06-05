-- Migration: Create article_comments table for commenting system
-- Date: 2025-01-22
-- Purpose: Create table structure for inline article comments and collaboration

-- Create content_type enum for comments
CREATE TYPE IF NOT EXISTS comment_content_type_enum AS ENUM (
  'text',
  'image', 
  'suggestion'
);

-- Create comment status enum
CREATE TYPE IF NOT EXISTS comment_status_enum AS ENUM (
  'active',
  'resolved',
  'archived'
);

-- Create the article_comments table
CREATE TABLE IF NOT EXISTS article_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES content_briefs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_comment_id UUID REFERENCES article_comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  content_type comment_content_type_enum DEFAULT 'text',
  selection_start INTEGER,
  selection_end INTEGER,
  status comment_status_enum DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_article_comments_article_id ON article_comments(article_id);
CREATE INDEX IF NOT EXISTS idx_article_comments_user_id ON article_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_article_comments_parent_id ON article_comments(parent_comment_id);
CREATE INDEX IF NOT EXISTS idx_article_comments_status ON article_comments(status);
CREATE INDEX IF NOT EXISTS idx_article_comments_created_at ON article_comments(created_at);

-- Create index for text selection queries
CREATE INDEX IF NOT EXISTS idx_article_comments_selection ON article_comments(article_id, selection_start, selection_end);

-- Add trigger to automatically update updated_at
CREATE OR REPLACE FUNCTION update_comment_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_comment_updated_at
  BEFORE UPDATE ON article_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_comment_updated_at();

-- Enable Row Level Security
ALTER TABLE article_comments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for article_comments
-- Users can view comments on articles they have access to
CREATE POLICY "Users can view comments on accessible articles" 
ON article_comments FOR SELECT 
USING (
  article_id IN (
    SELECT id FROM content_briefs 
    WHERE user_id = auth.uid()
  )
);

-- Users can create comments on articles they have access to
CREATE POLICY "Users can create comments on accessible articles" 
ON article_comments FOR INSERT 
WITH CHECK (
  user_id = auth.uid() AND
  article_id IN (
    SELECT id FROM content_briefs 
    WHERE user_id = auth.uid()
  )
);

-- Users can update their own comments
CREATE POLICY "Users can update their own comments" 
ON article_comments FOR UPDATE 
USING (user_id = auth.uid());

-- Users can delete their own comments
CREATE POLICY "Users can delete their own comments" 
ON article_comments FOR DELETE 
USING (user_id = auth.uid());

-- Admin policies (assuming admin users have a role)
-- Note: Adjust this based on your admin authentication setup
CREATE POLICY "Admins can manage all comments" 
ON article_comments FOR ALL 
USING (
  auth.jwt() ->> 'role' = 'admin' OR
  EXISTS (
    SELECT 1 FROM admin_profiles 
    WHERE id = auth.uid()
  )
); 