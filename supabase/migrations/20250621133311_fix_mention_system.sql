-- =====================================================
-- COMPLETE MENTION SYSTEM SOLUTION
-- =====================================================
-- This file contains the final working solution for the mention system

-- Step 1: Drop all variations of the function to clean slate
DROP FUNCTION IF EXISTS get_mentionable_users(UUID, TEXT);
DROP FUNCTION IF EXISTS get_mentionable_users(TEXT);
DROP FUNCTION IF EXISTS get_mentionable_users(UUID);
DROP FUNCTION IF EXISTS get_mentionable_users();

-- Step 2: Create the properly working function
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
      AND (auth.uid() IS NULL OR up.id != auth.uid())
    
    UNION ALL
    
    -- Get admin users from admin_profiles table (using 'name' column)
    SELECT 
      ap.id as user_id,
      ap.email,
      COALESCE(ap.name, SPLIT_PART(ap.email, '@', 1)) as full_name,
      ap.avatar_url,
      TRUE as is_admin,
      COALESCE(ap.name, SPLIT_PART(ap.email, '@', 1)) as display_name
    FROM admin_profiles ap
    WHERE ap.email IS NOT NULL
      AND (auth.uid() IS NULL OR ap.id != auth.uid())
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
  LIMIT 20;
END;
$$;

-- Step 3: Grant comprehensive permissions
GRANT EXECUTE ON FUNCTION get_mentionable_users(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_mentionable_users(UUID, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION get_mentionable_users(UUID, TEXT) TO service_role;

-- Step 4: Create alternative simpler function if needed
CREATE OR REPLACE FUNCTION get_all_mentionable_users()
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  is_admin BOOLEAN,
  mention_text TEXT
) 
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    id as user_id,
    email,
    COALESCE(company_name, SPLIT_PART(email, '@', 1)) as full_name,
    avatar_url,
    FALSE as is_admin,
    '@' || LOWER(REPLACE(REPLACE(REPLACE(COALESCE(company_name, SPLIT_PART(email, '@', 1)), ' ', ''), '-', ''), '.', '')) as mention_text
  FROM user_profiles
  WHERE email IS NOT NULL
  
  UNION ALL
  
  SELECT 
    id as user_id,
    email,
    COALESCE(name, SPLIT_PART(email, '@', 1)) as full_name,
    avatar_url,
    TRUE as is_admin,
    '@' || LOWER(REPLACE(REPLACE(REPLACE(COALESCE(name, SPLIT_PART(email, '@', 1)), ' ', ''), '-', ''), '.', '')) as mention_text
  FROM admin_profiles
  WHERE email IS NOT NULL
  
  ORDER BY is_admin DESC, email ASC
  LIMIT 50;
$$;

GRANT EXECUTE ON FUNCTION get_all_mentionable_users() TO authenticated;
GRANT EXECUTE ON FUNCTION get_all_mentionable_users() TO anon;
GRANT EXECUTE ON FUNCTION get_all_mentionable_users() TO service_role;

-- Step 5: Test both functions
SELECT 'Testing get_mentionable_users with empty search:' as test;
SELECT count(*) as total_users FROM get_mentionable_users(null, '');

SELECT 'Testing get_mentionable_users with search term:' as test;
SELECT count(*) as matching_users FROM get_mentionable_users(null, 'test');

SELECT 'Testing get_all_mentionable_users:' as test;
SELECT count(*) as total_users FROM get_all_mentionable_users();

-- Step 6: Show sample results
SELECT 'Sample mentionable users:' as info;
SELECT user_id, email, full_name, is_admin, mention_text 
FROM get_all_mentionable_users() 
LIMIT 5;