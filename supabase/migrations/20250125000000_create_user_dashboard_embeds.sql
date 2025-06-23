-- Create table for storing user dashboard embed identifiers
CREATE TABLE IF NOT EXISTS user_dashboard_embeds (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    dashboard_identifier TEXT NOT NULL,
    dashboard_name TEXT DEFAULT 'Main Dashboard',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(user_id, dashboard_name)
);

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_user_dashboard_embeds_user_id ON user_dashboard_embeds(user_id);

-- Enable RLS
ALTER TABLE user_dashboard_embeds ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own dashboard embeds" ON user_dashboard_embeds
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own dashboard embeds" ON user_dashboard_embeds
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own dashboard embeds" ON user_dashboard_embeds
    FOR UPDATE USING (auth.uid() = user_id);

-- Create trigger for updating the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_dashboard_embeds_updated_at
    BEFORE UPDATE ON user_dashboard_embeds
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert the initial record for devote ai top user (will be populated after users exist)
-- You can manually add this record later through the Supabase dashboard or admin interface
-- INSERT INTO user_dashboard_embeds (user_id, dashboard_identifier, dashboard_name)
-- VALUES ('your-user-id-here', 'b6a2de55021b1a97b8c8c255e645d3913d348186835debf', 'Main Dashboard'); 