-- Step 1: Check what users exist in the auth.users table
SELECT id, email, created_at FROM auth.users ORDER BY created_at DESC;

-- Step 2: If you see the correct user, copy their exact email and user ID
-- Then run one of these insert statements:

-- Option A: If you know the exact email address, use this:
-- INSERT INTO user_dashboard_embeds (user_id, dashboard_identifier, dashboard_name)
-- VALUES (
--     (SELECT id FROM auth.users WHERE email = 'EXACT_EMAIL_HERE' LIMIT 1),
--     'b6a2de55021b1a97b8c8c255e645d3913d348186835debf',
--     'Analytics Dashboard'
-- );

-- Option B: If you know the exact user ID, use this (replace 'USER_ID_HERE'):
-- INSERT INTO user_dashboard_embeds (user_id, dashboard_identifier, dashboard_name)
-- VALUES (
--     'USER_ID_HERE',
--     'b6a2de55021b1a97b8c8c255e645d3913d348186835debf',
--     'Analytics Dashboard'
-- );

-- Step 3: Verify the insert worked
-- SELECT 
--     ude.*,
--     au.email
-- FROM user_dashboard_embeds ude
-- JOIN auth.users au ON ude.user_id = au.id; 