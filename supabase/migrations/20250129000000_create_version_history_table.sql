-- Migration: Create version history tracking system
-- Date: 2025-01-29
-- Purpose: Add comprehensive version history tracking for article changes

-- Create version tag enum for milestone labeling
CREATE TYPE IF NOT EXISTS version_tag_enum AS ENUM (
  'auto_save',
  'manual_save',
  'published',
  'review',
  'milestone',
  'restored',
  'workflow_change'
);

-- Create the version_history table
CREATE TABLE IF NOT EXISTS version_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES content_briefs(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}' NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  change_summary TEXT,
  version_tag version_tag_enum DEFAULT 'manual_save' NOT NULL,
  
  -- Ensure unique version numbers per article
  UNIQUE(article_id, version_number)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_version_history_article_id ON version_history(article_id);
CREATE INDEX IF NOT EXISTS idx_version_history_created_at ON version_history(created_at);
CREATE INDEX IF NOT EXISTS idx_version_history_version_number ON version_history(article_id, version_number);
CREATE INDEX IF NOT EXISTS idx_version_history_created_by ON version_history(created_by);
CREATE INDEX IF NOT EXISTS idx_version_history_version_tag ON version_history(version_tag);

-- Add current_version field to content_briefs table
ALTER TABLE content_briefs 
ADD COLUMN IF NOT EXISTS current_version INTEGER DEFAULT 1;

-- Create index for current_version
CREATE INDEX IF NOT EXISTS idx_content_briefs_current_version ON content_briefs(current_version);

-- Enable RLS on version_history table
ALTER TABLE version_history ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for version_history
-- Users can view versions for their own articles
CREATE POLICY "Users can view their own article versions"
ON version_history
FOR SELECT
TO authenticated
USING (
  article_id IN (
    SELECT id FROM content_briefs WHERE user_id = auth.uid()
  )
);

-- Users can create versions for their own articles
CREATE POLICY "Users can create versions for their own articles"
ON version_history
FOR INSERT
TO authenticated
WITH CHECK (
  created_by = auth.uid() AND
  article_id IN (
    SELECT id FROM content_briefs WHERE user_id = auth.uid()
  )
);

-- Admins can view all versions
CREATE POLICY "Admins can view all versions"
ON version_history
FOR SELECT
TO authenticated
USING (public.is_admin());

-- Admins can create versions for any article
CREATE POLICY "Admins can create versions for any article"
ON version_history
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

-- Function to create a version history entry
CREATE OR REPLACE FUNCTION create_version_history(
  p_article_id UUID,
  p_content TEXT,
  p_metadata JSONB DEFAULT '{}',
  p_change_summary TEXT DEFAULT NULL,
  p_version_tag version_tag_enum DEFAULT 'manual_save'
) RETURNS UUID AS $$
DECLARE
  v_version_number INTEGER;
  v_version_id UUID;
  v_user_id UUID;
BEGIN
  -- Get current user
  SELECT auth.uid() INTO v_user_id;
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;
  
  -- Verify user has access to this article
  IF NOT EXISTS (
    SELECT 1 FROM content_briefs 
    WHERE id = p_article_id 
    AND (user_id = v_user_id OR public.is_admin())
  ) THEN
    RAISE EXCEPTION 'Access denied to article';
  END IF;
  
  -- Get the next version number for this article
  SELECT COALESCE(MAX(version_number), 0) + 1
  INTO v_version_number
  FROM version_history 
  WHERE article_id = p_article_id;
  
  -- Create the version history entry
  INSERT INTO version_history (
    article_id,
    version_number,
    content,
    metadata,
    created_by,
    change_summary,
    version_tag
  ) VALUES (
    p_article_id,
    v_version_number,
    p_content,
    p_metadata,
    v_user_id,
    p_change_summary,
    p_version_tag
  ) RETURNING id INTO v_version_id;
  
  -- Update the current_version in content_briefs
  UPDATE content_briefs 
  SET current_version = v_version_number
  WHERE id = p_article_id;
  
  RETURN v_version_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to automatically create version on significant saves
CREATE OR REPLACE FUNCTION auto_create_version_on_save()
RETURNS TRIGGER AS $$
DECLARE
  v_should_create_version BOOLEAN := FALSE;
  v_version_tag version_tag_enum := 'manual_save';
  v_metadata JSONB;
BEGIN
  -- Only create version if article_content has actually changed
  IF OLD.article_content IS DISTINCT FROM NEW.article_content THEN
    v_should_create_version := TRUE;
    
    -- Determine version tag based on editing_status changes
    IF OLD.editing_status IS DISTINCT FROM NEW.editing_status THEN
      CASE NEW.editing_status
        WHEN 'published' THEN v_version_tag := 'published';
        WHEN 'review' THEN v_version_tag := 'review';
        ELSE v_version_tag := 'workflow_change';
      END CASE;
    END IF;
    
    -- Create metadata object
    v_metadata := jsonb_build_object(
      'title', NEW.product_name,
      'editing_status', NEW.editing_status,
      'previous_status', OLD.editing_status,
      'content_length', length(NEW.article_content)
    );
    
    -- Create the version history entry
    PERFORM create_version_history(
      NEW.id,
      NEW.article_content,
      v_metadata,
      CASE 
        WHEN OLD.editing_status IS DISTINCT FROM NEW.editing_status 
        THEN format('Status changed from %s to %s', OLD.editing_status, NEW.editing_status)
        ELSE 'Article content updated'
      END,
      v_version_tag
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic version creation
DROP TRIGGER IF EXISTS trigger_auto_create_version ON content_briefs;
CREATE TRIGGER trigger_auto_create_version
  AFTER UPDATE ON content_briefs
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_version_on_save();

-- Function to get version history for an article
CREATE OR REPLACE FUNCTION get_article_version_history(p_article_id UUID)
RETURNS TABLE (
  id UUID,
  version_number INTEGER,
  created_at TIMESTAMP WITH TIME ZONE,
  created_by UUID,
  change_summary TEXT,
  version_tag version_tag_enum,
  metadata JSONB,
  user_email TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    vh.id,
    vh.version_number,
    vh.created_at,
    vh.created_by,
    vh.change_summary,
    vh.version_tag,
    vh.metadata,
    COALESCE(au.email, 'Unknown User') as user_email
  FROM version_history vh
  LEFT JOIN auth.users au ON vh.created_by = au.id
  WHERE vh.article_id = p_article_id
  ORDER BY vh.version_number DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create initial version entries for existing articles with content
INSERT INTO version_history (
  article_id,
  version_number,
  content,
  metadata,
  created_by,
  change_summary,
  version_tag,
  created_at
)
SELECT 
  cb.id,
  1,
  COALESCE(cb.article_content, ''),
  jsonb_build_object(
    'title', cb.product_name,
    'editing_status', cb.editing_status,
    'content_length', length(COALESCE(cb.article_content, ''))
  ),
  cb.user_id,
  'Initial version created during migration',
  'milestone',
  cb.created_at
FROM content_briefs cb
WHERE cb.article_content IS NOT NULL 
AND cb.article_content != ''
AND NOT EXISTS (
  SELECT 1 FROM version_history vh WHERE vh.article_id = cb.id
);

-- Update current_version for existing articles
UPDATE content_briefs 
SET current_version = 1
WHERE current_version IS NULL OR current_version = 0; 