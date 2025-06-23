-- COMPREHENSIVE DEBUG: Let's figure out what's going on

-- Step 1: Check if the user actually exists in auth.users
SELECT 'Checking auth.users for our user:' as info;
SELECT id, email, created_at, email_confirmed_at 
FROM auth.users 
WHERE email = 'devoteal@gmail.com';

-- Step 2: Check if the user ID we're using is correct
SELECT 'All users in auth.users:' as info;
SELECT id, email, created_at 
FROM auth.users 
ORDER BY created_at DESC 
LIMIT 5;

-- Step 3: Check the actual constraint that was created
SELECT 'Current constraint details:' as info;
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    confrelid::regclass as table_name,
    confrelid::regnamespace::regnamespace as table_schema,
    confrelid as table_oid,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'user_dashboard_embeds'::regclass 
AND contype = 'f';

-- Step 4: Check what the auth.users table looks like
SELECT 'Auth users table info:' as info;
SELECT 
    schemaname,
    tablename,
    tableowner
FROM pg_tables 
WHERE tablename = 'users' 
AND schemaname = 'auth';

-- Step 5: Try a different approach - insert with a known working user
-- First, let's see if there are ANY users that would work
SELECT 'Testing with first available user:' as info;
SELECT id, email FROM auth.users LIMIT 1;

-- Step 6: Try inserting with the first available user to test the constraint
DO $$ 
DECLARE 
    test_user_id UUID;
    test_email TEXT;
BEGIN
    -- Get the first user
    SELECT id, email INTO test_user_id, test_email FROM auth.users LIMIT 1;
    
    IF test_user_id IS NOT NULL THEN
        RAISE NOTICE 'Testing insert with user: % (%)', test_email, test_user_id;
        
        -- Try to insert with this user
        INSERT INTO user_dashboard_embeds (user_id, dashboard_identifier, dashboard_name)
        VALUES (
            test_user_id,
            'test-identifier',
            'Test Dashboard'
        );
        
        RAISE NOTICE 'Test insert successful!';
        
        -- Clean up the test record
        DELETE FROM user_dashboard_embeds WHERE dashboard_identifier = 'test-identifier';
        
    ELSE
        RAISE NOTICE 'No users found in auth.users table!';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Test insert failed: %', SQLERRM;
END $$;

-- Step 7: Check if there's a schema search path issue
SELECT 'Current search path:' as info;
SHOW search_path;

-- Step 8: Try to access auth.users with full schema qualification
SELECT 'Direct auth.users access:' as info;
SELECT COUNT(*) as user_count FROM auth.users;

-- Step 9: Check if our target user exists with exact ID
SELECT 'Exact user ID check:' as info;
SELECT 
    id,
    email,
    CASE 
        WHEN id = '7ebfe552-10e1-4f01-9178-86983ae48d43' THEN 'EXACT MATCH'
        ELSE 'NO MATCH'
    END as match_status
FROM auth.users 
WHERE id = '7ebfe552-10e1-4f01-9178-86983ae48d43'
   OR email = 'devoteal@gmail.com'; 