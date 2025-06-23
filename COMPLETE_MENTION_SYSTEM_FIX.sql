-- =====================================================
-- COMPLETE MENTION SYSTEM FIX
-- =====================================================
-- This fixes both the broken database function AND creates sample data for testing

-- 1. DROP AND RECREATE THE BROKEN FUNCTION
-- =====================================================

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
  -- Enhanced logging for debugging
  RAISE NOTICE 'get_mentionable_users called with article_id: %, search_term: %', article_id_param, search_term;
  
  RETURN QUERY
  WITH user_data AS (
    -- Get regular users from user_profiles table
    SELECT 
      up.id as user_id,
      up.email,
      COALESCE(up.company_name, SPLIT_PART(up.email, '@', 1)) as full_name,
      up.avatar_url,
      FALSE as is_admin,
      COALESCE(up.company_name, SPLIT_PART(up.email, '@', 1)) as display_name
    FROM user_profiles up
    WHERE up.email IS NOT NULL
      AND up.id != COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid)
    
    UNION ALL
    
    -- Get admin users from admin_profiles table  
    SELECT 
      ap.id as user_id,
      ap.email,
      COALESCE(ap.full_name, SPLIT_PART(ap.email, '@', 1)) as full_name,
      ap.avatar_url,
      TRUE as is_admin,
      COALESCE(ap.full_name, SPLIT_PART(ap.email, '@', 1)) as display_name
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
    LENGTH(ud.display_name) ASC, -- Shorter names first
    ud.display_name ASC
  LIMIT 20; -- Reasonable limit
END;
$$;

-- 2. ENSURE COMMENT_MENTIONS TABLE EXISTS WITH PROPER STRUCTURE
-- =====================================================

CREATE TABLE IF NOT EXISTS comment_mentions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  comment_id UUID NOT NULL REFERENCES article_comments(id) ON DELETE CASCADE,
  mentioned_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mentioned_by_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mention_text TEXT NOT NULL,
  notification_sent BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  UNIQUE(comment_id, mentioned_user_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_comment_mentions_comment_id ON comment_mentions(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_mentions_mentioned_user_id ON comment_mentions(mentioned_user_id);
CREATE INDEX IF NOT EXISTS idx_comment_mentions_mentioned_by_user_id ON comment_mentions(mentioned_by_user_id);
CREATE INDEX IF NOT EXISTS idx_comment_mentions_notification_sent ON comment_mentions(notification_sent) WHERE notification_sent = FALSE;

-- Enable RLS
ALTER TABLE comment_mentions ENABLE ROW LEVEL SECURITY;

-- Drop and recreate RLS policies
DROP POLICY IF EXISTS "Users can view relevant mentions" ON comment_mentions;
DROP POLICY IF EXISTS "Users can create mentions" ON comment_mentions;
DROP POLICY IF EXISTS "Users can update their mentions" ON comment_mentions;

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

-- 3. GRANT NECESSARY PERMISSIONS
-- =====================================================

GRANT ALL ON comment_mentions TO authenticated;
GRANT EXECUTE ON FUNCTION get_mentionable_users(UUID, TEXT) TO authenticated;

-- 4. CREATE SAMPLE USER PROFILES FOR TESTING
-- =====================================================

-- First, let's ensure we have some admin profiles for testing
-- NOTE: Replace these UUIDs with actual user IDs from your auth.users table if they exist

-- Insert sample admin profiles (these will only insert if the user exists in auth.users)
INSERT INTO admin_profiles (id, email, full_name, created_at, updated_at)
SELECT 
  auth_users.id,
  auth_users.email,
  COALESCE(auth_users.raw_user_meta_data->>'full_name', SPLIT_PART(auth_users.email, '@', 1)) as full_name,
  now(),
  now()
FROM auth.users auth_users
WHERE auth_users.email IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM admin_profiles ap WHERE ap.id = auth_users.id)
  AND auth_users.email ILIKE '%admin%' -- Only users with 'admin' in email
ON CONFLICT (id) DO NOTHING;

-- Insert sample user profiles for any remaining auth users
INSERT INTO user_profiles (id, email, company_name, created_at, updated_at)
SELECT 
  auth_users.id,
  auth_users.email,
  COALESCE(auth_users.raw_user_meta_data->>'company_name', 'Test Company') as company_name,
  now(),
  now()
FROM auth.users auth_users
WHERE auth_users.email IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM user_profiles up WHERE up.id = auth_users.id)
  AND NOT EXISTS (SELECT 1 FROM admin_profiles ap WHERE ap.id = auth_users.id)
ON CONFLICT (id) DO NOTHING;

-- 5. CREATE SAMPLE PROFILES IF NO AUTH USERS EXIST
-- =====================================================

-- If no auth users exist, create some sample profiles with dummy UUIDs for testing
-- (This is for development/testing only)

DO $$
DECLARE
  sample_admin_id UUID := gen_random_uuid();
  sample_user_id UUID := gen_random_uuid();
  auth_user_count INTEGER;
BEGIN
  -- Check if any auth users exist
  SELECT COUNT(*) INTO auth_user_count FROM auth.users;
  
  IF auth_user_count = 0 THEN
    -- No auth users exist, create sample profiles for testing
    
    -- Sample admin profile
    INSERT INTO admin_profiles (id, email, full_name, created_at, updated_at)
    VALUES (
      sample_admin_id,
      'admin@test.com',
      'Test Admin',
      now(),
      now()
    );
    
    -- Sample user profile
    INSERT INTO user_profiles (id, email, company_name, created_at, updated_at)
    VALUES (
      sample_user_id,
      'user@test.com',
      'Test Company',
      now(),
      now()
    );
    
    RAISE NOTICE 'Created sample profiles: admin@test.com and user@test.com';
  ELSE
    RAISE NOTICE 'Auth users exist, sample profiles created from auth data';
  END IF;
END $$;

-- 6. TEST THE FUNCTION
-- =====================================================

-- Test the function to make sure it works
SELECT 'Testing get_mentionable_users function:' as test_message;

-- Test with empty search
SELECT 
  user_id, 
  email, 
  full_name, 
  is_admin, 
  mention_text 
FROM get_mentionable_users(null, '')
ORDER BY is_admin DESC, email ASC;

-- Test with search term
SELECT 
  user_id, 
  email, 
  full_name, 
  is_admin, 
  mention_text 
FROM get_mentionable_users(null, 'test')
ORDER BY is_admin DESC, email ASC;

-- 7. VERIFY TABLE CONTENTS
-- =====================================================

SELECT 'User profiles count:' as label, COUNT(*) as count FROM user_profiles
UNION ALL
SELECT 'Admin profiles count:' as label, COUNT(*) as count FROM admin_profiles
UNION ALL
SELECT 'Auth users count:' as label, COUNT(*) as count FROM auth.users;

-- Show some sample data
SELECT 'Sample user profiles:' as data_type, id, email, company_name FROM user_profiles LIMIT 3
UNION ALL
SELECT 'Sample admin profiles:' as data_type, id, email, full_name FROM admin_profiles LIMIT 3;