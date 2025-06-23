-- Step 1: Check what happened with the user sync
SELECT 'Checking auth.users:' as info;
SELECT id, email, created_at FROM auth.users WHERE email = 'devoteal@gmail.com';

SELECT 'Checking public.users after sync:' as info;
SELECT id, email, full_name, created_at FROM public.users WHERE email = 'devoteal@gmail.com';

-- Step 2: Check if there are ANY users in public.users now
SELECT 'All users in public.users:' as info;
SELECT id, email, full_name, created_at FROM public.users ORDER BY created_at DESC LIMIT 5;

-- Step 3: Let's get the exact user ID from auth.users
SELECT 'Getting exact user ID from auth.users:' as info;
SELECT id as user_id, email FROM auth.users WHERE email = 'devoteal@gmail.com';

-- Step 4: Manual insert into public.users with the exact ID
-- Replace '7ebfe552-10e1-4f01-9178-86983ae48d43' with the actual ID from Step 3
INSERT INTO public.users (id, email, full_name, created_at, updated_at)
VALUES (
    '7ebfe552-10e1-4f01-9178-86983ae48d43',
    'devoteal@gmail.com',
    'Devote AI',
    NOW(),
    NOW()
)
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    updated_at = NOW();

-- Step 5: Verify the user is now in public.users
SELECT 'User now in public.users:' as info;
SELECT id, email, full_name, created_at FROM public.users WHERE email = 'devoteal@gmail.com';

-- Step 6: Now insert the dashboard embed
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

-- Step 7: Verify everything worked
SELECT 'Final verification:' as info;
SELECT 
    ude.id,
    ude.dashboard_identifier,
    ude.dashboard_name,
    ude.created_at,
    u.email,
    u.full_name
FROM user_dashboard_embeds ude
JOIN public.users u ON ude.user_id = u.id
WHERE u.email = 'devoteal@gmail.com'; 