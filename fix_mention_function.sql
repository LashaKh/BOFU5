-- Fix the get_mentionable_users function to use correct table names
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
    -- Get regular users from user_profiles
    SELECT 
      up.id as user_id,
      up.email,
      up.company_name as full_name,  -- Using company_name as display name
      up.avatar_url,
      FALSE as is_admin,
      COALESCE(up.company_name, split_part(up.email, '@', 1)) as display_name
    FROM user_profiles up
    WHERE up.email IS NOT NULL
    
    UNION ALL
    
    -- Get admin users from admin_profiles
    SELECT 
      ap.id as user_id,
      ap.email,
      COALESCE(ap.full_name, ap.email) as full_name,
      ap.avatar_url,
      TRUE as is_admin,
      COALESCE(ap.full_name, split_part(ap.email, '@', 1)) as display_name
    FROM admin_profiles ap
    WHERE ap.email IS NOT NULL
  )
  SELECT 
    ud.user_id,
    ud.email,
    ud.full_name,
    ud.avatar_url,
    ud.is_admin,
    '@' || LOWER(REPLACE(REPLACE(ud.display_name, ' ', ''), '-', '')) as mention_text
  FROM user_data ud
  WHERE 
    ud.user_id != auth.uid() -- Don't include self
    AND (
      search_term = '' OR 
      LOWER(ud.display_name) LIKE LOWER('%' || search_term || '%') OR
      LOWER(ud.email) LIKE LOWER('%' || search_term || '%')
    )
  ORDER BY 
    ud.is_admin DESC, -- Admins first
    ud.display_name ASC
  LIMIT 20;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_mentionable_users(UUID, TEXT) TO authenticated;