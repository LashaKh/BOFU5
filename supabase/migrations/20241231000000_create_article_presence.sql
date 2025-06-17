-- Create article_presence table for real-time collaboration tracking
CREATE TABLE IF NOT EXISTS article_presence (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    article_id uuid NOT NULL,
    status text CHECK (status IN ('viewing', 'editing', 'idle')) DEFAULT 'viewing',
    last_seen timestamp with time zone DEFAULT NOW(),
    user_metadata jsonb DEFAULT '{}',
    created_at timestamp with time zone DEFAULT NOW(),
    updated_at timestamp with time zone DEFAULT NOW(),
    UNIQUE(user_id, article_id)
);

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_article_presence_article_id ON article_presence(article_id);
CREATE INDEX IF NOT EXISTS idx_article_presence_user_id ON article_presence(user_id);
CREATE INDEX IF NOT EXISTS idx_article_presence_last_seen ON article_presence(last_seen);

-- Enable RLS
ALTER TABLE article_presence ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view presence for articles they have access to"
ON article_presence FOR SELECT
TO authenticated
USING (
    -- Users can see presence for articles they can access
    EXISTS (
        SELECT 1 FROM articles 
        WHERE articles.id = article_presence.article_id 
        AND (
            articles.user_id = auth.uid() OR 
            EXISTS (
                SELECT 1 FROM profiles 
                WHERE profiles.user_id = auth.uid() 
                AND profiles.role IN ('admin', 'manager')
            )
        )
    )
);

CREATE POLICY "Users can manage their own presence"
ON article_presence FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Admins can view all presence
CREATE POLICY "Admins can view all presence"
ON article_presence FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.user_id = auth.uid() 
        AND profiles.role IN ('admin', 'manager')
    )
);

-- Function to clean up old presence records
CREATE OR REPLACE FUNCTION cleanup_old_presence()
RETURNS trigger AS $$
BEGIN
    -- Remove presence records older than 10 minutes
    DELETE FROM article_presence 
    WHERE last_seen < NOW() - INTERVAL '10 minutes';
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically cleanup old presence
CREATE TRIGGER cleanup_presence_trigger
    AFTER INSERT OR UPDATE ON article_presence
    EXECUTE FUNCTION cleanup_old_presence();

-- Function to update presence timestamp
CREATE OR REPLACE FUNCTION update_presence_timestamp()
RETURNS trigger AS $$
BEGIN
    NEW.updated_at = NOW();
    NEW.last_seen = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update timestamps
CREATE TRIGGER update_presence_timestamp_trigger
    BEFORE UPDATE ON article_presence
    FOR EACH ROW
    EXECUTE FUNCTION update_presence_timestamp(); 