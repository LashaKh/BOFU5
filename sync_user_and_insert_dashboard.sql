-- Step 1: Check if user exists in auth.users
SELECT 'User in auth.users:' as info;
SELECT id, email, created_at FROM auth.users WHERE email = 'devoteal@gmail.com';

-- Step 2: Insert/sync user from auth.users to public.users
INSERT INTO public.users (id, email, full_name, created_at, updated_at)
SELECT 
    au.id,
    au.email,
    COALESCE(au.raw_user_meta_data->>'full_name', au.email) as full_name,
    au.created_at,
    NOW() as updated_at
FROM auth.users au
WHERE au.email = 'devoteal@gmail.com'
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    updated_at = NOW();

-- Step 3: Verify user is now in public.users
SELECT 'User now in public.users:' as info;
SELECT id, email, full_name, created_at FROM public.users WHERE email = 'devoteal@gmail.com';

-- Step 4: Insert the dashboard embed data
INSERT INTO user_dashboard_embeds (user_id, dashboard_identifier, dashboard_name)
VALUES (
    (SELECT id FROM public.users WHERE email = 'devoteal@gmail.com' LIMIT 1),
    'b6a2de55021b1a97b8c8c255e645d3913d348186835debf',
    'Analytics Dashboard'
)
ON CONFLICT (user_id, dashboard_name) 
DO UPDATE SET 
    dashboard_identifier = EXCLUDED.dashboard_identifier,
    updated_at = NOW();

-- Step 5: Verify the dashboard embed insert worked
SELECT 'Dashboard embed created:' as info;
SELECT 
    ude.id,
    ude.dashboard_identifier,
    ude.dashboard_name,
    ude.created_at,
    u.email
FROM user_dashboard_embeds ude
JOIN public.users u ON ude.user_id = u.id
WHERE u.email = 'devoteal@gmail.com'; 