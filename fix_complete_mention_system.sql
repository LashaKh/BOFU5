-- Complete fix for the mention system
-- This addresses the table name issues and enhances the function

-- First, drop and recreate the get_mentionable_users function with correct table references
DROP FUNCTION IF EXISTS get_mentionable_users(UUID, TEXT);

CREATE OR REPLACE FUNCTION get_mentionable_users(
  article_id_param UUID DEFAULT NULL,
  search_term TEXT DEFAULT ''
)
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  is_admin BOOLEAN,
  mention_text TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Debug logging
  RAISE NOTICE 'get_mentionable_users called with article_id: %, search_term: %', article_id_param, search_term;
  
  RETURN QUERY
  WITH user_data AS (
    -- Get regular users from user_profiles table
    SELECT 
      up.id as user_id,
      up.email,
      COALESCE(up.company_name, split_part(up.email, '@', 1)) as full_name,
      up.avatar_url,
      FALSE as is_admin,
      COALESCE(up.company_name, split_part(up.email, '@', 1)) as display_name
    FROM user_profiles up
    WHERE up.email IS NOT NULL
      AND up.id != COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid)
    
    UNION ALL
    
    -- Get admin users from admin_profiles table
    SELECT 
      ap.id as user_id,
      ap.email,
      COALESCE(ap.full_name, split_part(ap.email, '@', 1)) as full_name,
      ap.avatar_url,
      TRUE as is_admin,
      COALESCE(ap.full_name, split_part(ap.email, '@', 1)) as display_name
    FROM admin_profiles ap
    WHERE ap.email IS NOT NULL
      AND ap.id != COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid)
  )
  SELECT 
    ud.user_id,
    ud.email,
    ud.full_name,
    ud.avatar_url,
    ud.is_admin,
    '@' || LOWER(REPLACE(REPLACE(REPLACE(ud.display_name, ' ', ''), '-', ''), '.', '')) as mention_text
  FROM user_data ud
  WHERE 
    (
      search_term = '' OR 
      LOWER(ud.display_name) LIKE LOWER('%' || search_term || '%') OR
      LOWER(ud.email) LIKE LOWER('%' || search_term || '%') OR
      LOWER(ud.full_name) LIKE LOWER('%' || search_term || '%')
    )
  ORDER BY 
    ud.is_admin DESC, -- Admins first
    LENGTH(ud.display_name) ASC, -- Shorter names first for better UX
    ud.display_name ASC
  LIMIT 10; -- Reasonable limit for autocomplete
END;
$$;

-- Ensure the comment_mentions table exists with proper structure
CREATE TABLE IF NOT EXISTS comment_mentions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  comment_id UUID NOT NULL REFERENCES article_comments(id) ON DELETE CASCADE,
  mentioned_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mentioned_by_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mention_text TEXT NOT NULL,
  notification_sent BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Prevent duplicate mentions in the same comment
  UNIQUE(comment_id, mentioned_user_id)
);

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_comment_mentions_comment_id ON comment_mentions(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_mentions_mentioned_user_id ON comment_mentions(mentioned_user_id);
CREATE INDEX IF NOT EXISTS idx_comment_mentions_mentioned_by_user_id ON comment_mentions(mentioned_by_user_id);
CREATE INDEX IF NOT EXISTS idx_comment_mentions_notification_sent ON comment_mentions(notification_sent) WHERE notification_sent = FALSE;

-- Enable RLS on comment_mentions
ALTER TABLE comment_mentions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view relevant mentions" ON comment_mentions;
DROP POLICY IF EXISTS "Users can create mentions" ON comment_mentions;
DROP POLICY IF EXISTS "Users can update their mentions" ON comment_mentions;

-- Recreate RLS policies
CREATE POLICY "Users can view relevant mentions" ON comment_mentions
FOR SELECT TO authenticated
USING (
  mentioned_user_id = auth.uid() OR 
  mentioned_by_user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM article_comments ac 
    WHERE ac.id = comment_mentions.comment_id 
    AND ac.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create mentions" ON comment_mentions
FOR INSERT TO authenticated
WITH CHECK (mentioned_by_user_id = auth.uid());

CREATE POLICY "Users can update their mentions" ON comment_mentions
FOR UPDATE TO authenticated
USING (mentioned_by_user_id = auth.uid() OR mentioned_user_id = auth.uid());

-- Fix the extract_mentions_from_content function
CREATE OR REPLACE FUNCTION extract_mentions_from_content(content_text TEXT)
RETURNS TABLE (mention_text TEXT)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT 
    regexp_matches[1] as mention_text
  FROM regexp_split_to_table(content_text, '\s+') as word,
       regexp_matches(word, '^(@\w+)', 'g') as regexp_matches
  WHERE LENGTH(regexp_matches[1]) > 1; -- At least @x
END;
$$;

-- Update the process_comment_mentions function to handle the mention creation properly
CREATE OR REPLACE FUNCTION process_comment_mentions()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  mention_record RECORD;
  mentioned_user RECORD;
BEGIN
  -- Only process for INSERT and UPDATE
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    RAISE NOTICE 'Processing mentions for comment ID: %, content: %', NEW.id, NEW.content;
    
    -- Clear existing mentions for UPDATE
    IF TG_OP = 'UPDATE' THEN
      DELETE FROM comment_mentions WHERE comment_id = NEW.id;
    END IF;
    
    -- Extract mentions from the content
    FOR mention_record IN 
      SELECT mention_text FROM extract_mentions_from_content(NEW.content)
    LOOP
      RAISE NOTICE 'Processing mention: %', mention_record.mention_text;
      
      -- Find the mentioned user by matching the mention text
      SELECT user_id, email, full_name, is_admin
      INTO mentioned_user
      FROM get_mentionable_users(NEW.article_id, SUBSTRING(mention_record.mention_text FROM 2))
      WHERE mention_text = mention_record.mention_text
      LIMIT 1;
      
      -- If user found, create the mention
      IF mentioned_user.user_id IS NOT NULL THEN
        RAISE NOTICE 'Creating mention for user: % (%)', mentioned_user.email, mentioned_user.user_id;
        
        INSERT INTO comment_mentions (
          comment_id,
          mentioned_user_id,
          mentioned_by_user_id,
          mention_text
        ) VALUES (
          NEW.id,
          mentioned_user.user_id,
          NEW.user_id,
          mention_record.mention_text
        )
        ON CONFLICT (comment_id, mentioned_user_id) DO NOTHING;
      ELSE
        RAISE NOTICE 'No user found for mention: %', mention_record.mention_text;
      END IF;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Drop existing trigger and recreate
DROP TRIGGER IF EXISTS process_mentions_trigger ON article_comments;

CREATE TRIGGER process_mentions_trigger
  AFTER INSERT OR UPDATE ON article_comments
  FOR EACH ROW
  EXECUTE FUNCTION process_comment_mentions();

-- Grant necessary permissions
GRANT ALL ON comment_mentions TO authenticated;
GRANT EXECUTE ON FUNCTION get_mentionable_users(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION extract_mentions_from_content(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION process_comment_mentions() TO authenticated;

-- Test the function
SELECT 'Testing get_mentionable_users function:' as message;
SELECT user_id, email, full_name, is_admin, mention_text 
FROM get_mentionable_users(null, '') 
LIMIT 5;