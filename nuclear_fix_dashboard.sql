-- NUCLEAR OPTION: Recreate the table completely with correct constraints

-- Step 1: Check what's currently in the table (backup any existing data)
SELECT 'Current data in user_dashboard_embeds:' as info;
SELECT * FROM user_dashboard_embeds;

-- Step 2: Save any existing data to a temporary table
CREATE TEMP TABLE user_dashboard_embeds_backup AS 
SELECT * FROM user_dashboard_embeds;

-- Step 3: Drop the entire table (this removes ALL constraints)
DROP TABLE IF EXISTS user_dashboard_embeds CASCADE;

-- Step 4: Recreate the table with the CORRECT foreign key constraint
CREATE TABLE user_dashboard_embeds (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    dashboard_identifier TEXT NOT NULL,
    dashboard_name TEXT DEFAULT 'Main Dashboard',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(user_id, dashboard_name)
);

-- Step 5: Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_user_dashboard_embeds_user_id ON user_dashboard_embeds(user_id);

-- Step 6: Enable RLS
ALTER TABLE user_dashboard_embeds ENABLE ROW LEVEL SECURITY;

-- Step 7: Create RLS policies
CREATE POLICY "Users can view their own dashboard embeds" ON user_dashboard_embeds
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own dashboard embeds" ON user_dashboard_embeds
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own dashboard embeds" ON user_dashboard_embeds
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own dashboard embeds" ON user_dashboard_embeds
    FOR DELETE USING (auth.uid() = user_id);

-- Step 8: Verify the table structure and constraints
SELECT 'New table constraints:' as info;
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    confrelid::regclass as referenced_table,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'user_dashboard_embeds'::regclass;

-- Step 9: Verify the user exists in auth.users
SELECT 'User exists in auth.users:' as info;
SELECT id, email FROM auth.users WHERE id = '7ebfe552-10e1-4f01-9178-86983ae48d43';

-- Step 10: Insert the dashboard embed data
INSERT INTO user_dashboard_embeds (user_id, dashboard_identifier, dashboard_name)
VALUES (
    '7ebfe552-10e1-4f01-9178-86983ae48d43',
    'b6a2de55021b1a97b8c8c255e645d3913d348186835debf',
    'Analytics Dashboard'
);

-- Step 11: Restore any backed up data (if there was any)
-- INSERT INTO user_dashboard_embeds SELECT * FROM user_dashboard_embeds_backup 
-- WHERE user_id != '7ebfe552-10e1-4f01-9178-86983ae48d43';

-- Step 12: Final verification
SELECT 'SUCCESS! Dashboard embed created with correct constraints:' as info;
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

-- Step 13: Show the final table structure
SELECT 'Final table structure:' as info;
\d user_dashboard_embeds; 