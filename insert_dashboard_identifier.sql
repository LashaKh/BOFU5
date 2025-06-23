-- Insert dashboard identifier for devote ai top user
-- Replace 'your-actual-user-id' with the actual user ID from auth.users table

-- First, find the user ID (run this to get the user ID):
-- SELECT id, email FROM auth.users WHERE email = 'devoteal@gmail.com';

-- Then insert the dashboard embed record:
INSERT INTO user_dashboard_embeds (user_id, dashboard_identifier, dashboard_name)
VALUES (
    (SELECT id FROM auth.users WHERE email = 'devoteal@gmail.com' LIMIT 1),
    'b6a2de55021b1a97b8c8c255e645d3913d348186835debf',
    'Analytics Dashboard'
)
ON CONFLICT (user_id, dashboard_name) 
DO UPDATE SET 
    dashboard_identifier = EXCLUDED.dashboard_identifier,
    updated_at = NOW();

-- Verify the insert worked:
SELECT 
    ude.*,
    au.email
FROM user_dashboard_embeds ude
JOIN auth.users au ON ude.user_id = au.id
WHERE au.email = 'devoteal@gmail.com'; 