-- FINAL COMPREHENSIVE SOLUTION
-- This script addresses all possible issues with the foreign key constraint

-- Step 1: Completely drop and recreate with explicit schema references
DROP TABLE IF EXISTS user_dashboard_embeds CASCADE;

-- Step 2: Create table with FULLY QUALIFIED schema reference
CREATE TABLE user_dashboard_embeds (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    dashboard_identifier TEXT NOT NULL,
    dashboard_name TEXT DEFAULT 'Main Dashboard',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(user_id, dashboard_name)
);

-- Step 3: Add the foreign key constraint SEPARATELY with explicit schema
ALTER TABLE user_dashboard_embeds 
ADD CONSTRAINT user_dashboard_embeds_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Step 4: Create index
CREATE INDEX IF NOT EXISTS idx_user_dashboard_embeds_user_id ON user_dashboard_embeds(user_id);

-- Step 5: Enable RLS
ALTER TABLE user_dashboard_embeds ENABLE ROW LEVEL SECURITY;

-- Step 6: Create RLS policies
CREATE POLICY "Users can view their own dashboard embeds" ON user_dashboard_embeds
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own dashboard embeds" ON user_dashboard_embeds
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own dashboard embeds" ON user_dashboard_embeds
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own dashboard embeds" ON user_dashboard_embeds
    FOR DELETE USING (auth.uid() = user_id);

-- Step 7: ALTERNATIVE APPROACH - Create user in public.users if needed
-- This ensures compatibility with both auth.users and public.users patterns
INSERT INTO public.users (id, email, created_at, updated_at)
SELECT 
    id,
    email,
    created_at,
    NOW() as updated_at
FROM auth.users 
WHERE email = 'devoteal@gmail.com'
ON CONFLICT (id) DO NOTHING;

-- Step 8: Now try the insert with the dashboard data
INSERT INTO user_dashboard_embeds (user_id, dashboard_identifier, dashboard_name)
VALUES (
    '7ebfe552-10e1-4f01-9178-86983ae48d43',
    'b6a2de55021b1a97b8c8c255e645d3913d348186835debf',
    'Analytics Dashboard'
);

-- Step 9: Verify success
SELECT 'SUCCESS! Final verification:' as status;
SELECT 
    ude.id,
    ude.user_id,
    ude.dashboard_identifier,
    ude.dashboard_name,
    ude.created_at
FROM user_dashboard_embeds ude
WHERE ude.user_id = '7ebfe552-10e1-4f01-9178-86983ae48d43';

-- Step 10: Show constraint details for confirmation
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'user_dashboard_embeds'::regclass 
AND contype = 'f'; 