-- Step 1: Check what users table exists and find the correct user
-- Check if there's a users table in public schema
SELECT 'Checking public.users table:' as info;
SELECT id, email, created_at FROM public.users WHERE email = 'devoteal@gmail.com' LIMIT 5;

-- If above fails, check auth.users (comment out if not accessible)
-- SELECT 'Checking auth.users table:' as info;
-- SELECT id, email, created_at FROM auth.users WHERE email = 'devoteal@gmail.com' LIMIT 5;

-- Step 2: Check foreign key constraints to understand the issue
SELECT 'Checking user_dashboard_embeds constraints:' as info;
SELECT
    tc.constraint_name,
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_name='user_dashboard_embeds';

-- Step 3: Check what tables exist
SELECT 'Available tables:' as info;
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE '%user%'
ORDER BY table_name;

-- Step 4: Check if we need to drop and recreate the constraint
-- First, let's see what the constraint actually references
SELECT 'Constraint details:' as info;
SELECT 
    conname as constraint_name,
    conrelid::regclass as table_name,
    confrelid::regclass as referenced_table
FROM pg_constraint 
WHERE conname LIKE '%user_dashboard_embeds%';

-- Step 5: Drop the problematic foreign key constraint
ALTER TABLE user_dashboard_embeds DROP CONSTRAINT IF EXISTS user_dashboard_embeds_user_id_fkey;

-- Step 6: Recreate the constraint to reference auth.users instead
ALTER TABLE user_dashboard_embeds 
ADD CONSTRAINT user_dashboard_embeds_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Step 7: Now insert the dashboard embed data
INSERT INTO user_dashboard_embeds (user_id, dashboard_identifier, dashboard_name)
VALUES (
    '7ebfe552-10e1-4f01-9178-86983ae48d43',
    'b6a2de55021b1a97b8c8c255e645d3913d348186835debf',
    'Analytics Dashboard'
)
ON CONFLICT (user_id, dashboard_name) 
DO UPDATE SET 
    dashboard_identifier = EXCLUDED.dashboard_identifier,
    updated_at = NOW();

-- Step 8: Verify it worked
SELECT 'Success! Dashboard embed created:' as info;
SELECT 
    ude.id,
    ude.user_id,
    ude.dashboard_identifier,
    ude.dashboard_name,
    ude.created_at,
    au.email
FROM user_dashboard_embeds ude
JOIN auth.users au ON ude.user_id = au.id
WHERE au.email = 'devoteal@gmail.com'; 