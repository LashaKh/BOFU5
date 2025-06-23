-- =====================================================
-- CORRECTED GET_MENTIONABLE_USERS FUNCTION
-- =====================================================
-- This fixes the column references based on actual table structure
-- admin_profiles has 'name' column, not 'full_name'

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
    
    -- Get admin users from admin_profiles table (using 'name' column, not 'full_name')
    SELECT 
      ap.id as user_id,
      ap.email,
      COALESCE(ap.name, SPLIT_PART(ap.email, '@', 1)) as full_name,
      ap.avatar_url,
      TRUE as is_admin,
      COALESCE(ap.name, SPLIT_PART(ap.email, '@', 1)) as display_name
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

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_mentionable_users(UUID, TEXT) TO authenticated;

-- Test the corrected function
SELECT 'Testing corrected get_mentionable_users function:' as test_message;

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