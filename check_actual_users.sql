-- Check all users in public.users table
SELECT 'All users in public.users:' as info;
SELECT id, email, created_at FROM public.users ORDER BY created_at DESC LIMIT 10;

-- Check if there are any users with similar email patterns
SELECT 'Users with similar emails:' as info;
SELECT id, email, created_at FROM public.users WHERE email ILIKE '%devote%' OR email ILIKE '%gmail%' ORDER BY created_at DESC;

-- Check the structure of the users table
SELECT 'Table structure:' as info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'users' AND table_schema = 'public'; 