-- Companies with content briefs that should appear in Content Brief Management
SELECT 
  up.company_name,
  up.email as owner_email,
  COUNT(cb.id) as brief_count,
  up.user_type
FROM user_profiles up
LEFT JOIN content_briefs cb ON up.id = cb.user_id 
WHERE up.company_name IS NOT NULL 
  AND up.company_name != ''
  AND cb.id IS NOT NULL
GROUP BY up.company_name, up.email, up.user_type
HAVING COUNT(cb.id) > 0
ORDER BY up.company_name;

-- Also check content briefs by company including sub-accounts
SELECT 
  COALESCE(up.company_name, cp.company_id) as company_name,
  cb.user_id,
  cb.product_name,
  cb.id as brief_id,
  CASE 
    WHEN up.id IS NOT NULL THEN 'main'
    ELSE 'sub'
  END as user_type
FROM content_briefs cb
LEFT JOIN user_profiles up ON cb.user_id = up.id
LEFT JOIN company_profiles cp ON cb.user_id = cp.user_id
WHERE (up.company_name IS NOT NULL AND up.company_name != '') 
   OR (cp.company_id IS NOT NULL AND cp.company_id != '')
ORDER BY company_name, user_type;

-- Step 1: Check what happened with the user sync
SELECT 'Checking auth.users:' as info;
SELECT id, email, created_at FROM auth.users WHERE email = 'devoteal@gmail.com';

SELECT 'Checking public.users after sync:' as info;
SELECT id, email, full_name, created_at FROM public.users WHERE email = 'devoteal@gmail.com';

-- Step 2: Check if there are ANY users in public.users now
SELECT 'All users in public.users:' as info;
SELECT id, email, full_name, created_at FROM public.users ORDER BY created_at DESC LIMIT 5;

-- Step 3: Let's try a direct insert with the known user ID
-- First, let's see what the actual user ID is from auth.users
SELECT 'Getting exact user ID:' as info;
SELECT id as user_id FROM auth.users WHERE email = 'devoteal@gmail.com';

-- Step 4: Try direct insert with explicit user ID (replace with actual ID from above)
-- We'll use a manual approach first
