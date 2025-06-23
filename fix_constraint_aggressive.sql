-- Step 1: Check all constraints on the table
SELECT 'All constraints on user_dashboard_embeds:' as info;
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    conrelid::regclass as table_name,
    confrelid::regclass as referenced_table,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'user_dashboard_embeds'::regclass;

-- Step 2: Drop ALL foreign key constraints on user_dashboard_embeds
DO $$ 
DECLARE 
    constraint_name text;
BEGIN
    FOR constraint_name IN 
        SELECT conname 
        FROM pg_constraint 
        WHERE conrelid = 'user_dashboard_embeds'::regclass 
        AND contype = 'f'
    LOOP
        EXECUTE 'ALTER TABLE user_dashboard_embeds DROP CONSTRAINT IF EXISTS ' || constraint_name;
        RAISE NOTICE 'Dropped constraint: %', constraint_name;
    END LOOP;
END $$;

-- Step 3: Verify all foreign key constraints are gone
SELECT 'Remaining constraints after drop:' as info;
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    confrelid::regclass as referenced_table
FROM pg_constraint 
WHERE conrelid = 'user_dashboard_embeds'::regclass 
AND contype = 'f';

-- Step 4: Create the correct foreign key constraint
ALTER TABLE user_dashboard_embeds 
ADD CONSTRAINT user_dashboard_embeds_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Step 5: Verify the new constraint is correct
SELECT 'New constraint created:' as info;
SELECT 
    conname as constraint_name,
    confrelid::regclass as referenced_table,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'user_dashboard_embeds'::regclass 
AND contype = 'f';

-- Step 6: Verify the user exists in auth.users
SELECT 'User exists in auth.users:' as info;
SELECT id, email FROM auth.users WHERE id = '7ebfe552-10e1-4f01-9178-86983ae48d43';

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

-- Step 8: Final verification
SELECT 'SUCCESS! Dashboard embed created:' as info;
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