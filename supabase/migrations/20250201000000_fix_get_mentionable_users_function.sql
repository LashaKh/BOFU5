-- Fix the get_mentionable_users function to work with actual table schema
-- Drop existing function first
DROP FUNCTION IF EXISTS get_mentionable_users(UUID, TEXT);
DROP FUNCTION IF EXISTS get_mentionable_users(TEXT);

-- Create corrected function that works with actual table schema
CREATE OR REPLACE FUNCTION get_mentionable_users(
  search_term TEXT DEFAULT ''
)
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  display_name TEXT,
  avatar_url TEXT,
  user_type TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH user_data AS (
    -- Get regular users from user_profiles (no name field, use email prefix)
    SELECT 
      up.id as user_id,
      up.email,
      split_part(up.email, '@', 1) as display_name,
      up.avatar_url,
      'user' as user_type
    FROM user_profiles up
    WHERE up.email IS NOT NULL
    
    UNION ALL
    
    -- Get admin users from admin_profiles (has name field)
    SELECT 
      ap.id as user_id,
      ap.email,
      COALESCE(ap.name, split_part(ap.email, '@', 1)) as display_name,
      ap.avatar_url,
      'admin' as user_type
    FROM admin_profiles ap
    WHERE ap.email IS NOT NULL
  )
  SELECT 
    ud.user_id,
    ud.email,
    ud.display_name,
    ud.avatar_url,
    ud.user_type
  FROM user_data ud
  WHERE 
    (
      search_term = '' OR 
      LOWER(ud.display_name) LIKE LOWER('%' || search_term || '%') OR
      LOWER(ud.email) LIKE LOWER('%' || search_term || '%')
    )
  ORDER BY 
    CASE WHEN ud.user_type = 'admin' THEN 0 ELSE 1 END, -- Admins first
    ud.display_name ASC
  LIMIT 20;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_mentionable_users(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_mentionable_users(TEXT) TO anon;

-- Also create a version that accepts the old signature for backward compatibility
CREATE OR REPLACE FUNCTION get_mentionable_users(
  article_id_param UUID,
  search_term TEXT DEFAULT ''
)
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  display_name TEXT,
  avatar_url TEXT,
  user_type TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Ignore article_id_param for now, just call the main function
  RETURN QUERY
  SELECT * FROM get_mentionable_users(search_term);
END;
$$;

-- Grant permissions for the backward compatibility version
GRANT EXECUTE ON FUNCTION get_mentionable_users(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_mentionable_users(UUID, TEXT) TO anon;