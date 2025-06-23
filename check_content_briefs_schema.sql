-- Check the actual structure of content_briefs table
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'content_briefs' 
ORDER BY ordinal_position;

-- Also check if there are any content briefs in the database
SELECT 
  id,
  user_id,
  product_name,
  created_at,
  CASE 
    WHEN brief_content IS NOT NULL THEN 'has_content'
    ELSE 'no_content'
  END as content_status
FROM content_briefs 
LIMIT 10;

-- Check all foreign key constraints on users table
SELECT 'Foreign key constraints on public.users:' as info;
SELECT
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    tc.constraint_name
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_name='users';

-- Check all foreign key constraints on user_dashboard_embeds table
SELECT 'Foreign key constraints on user_dashboard_embeds:' as info;
SELECT
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    tc.constraint_name
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_name='user_dashboard_embeds';

-- Check what tables exist that might be related
SELECT 'All tables in public schema:' as info;
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Check if there's a table that users.id should reference
SELECT 'Tables that might be the correct reference:' as info;
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE '%user%'
ORDER BY table_name;
