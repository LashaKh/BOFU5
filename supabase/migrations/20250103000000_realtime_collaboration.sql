-- Migration: Real-time Collaboration Infrastructure
-- Description: Set up real-time channels and user presence tracking for collaborative editing

-- Enable realtime for content_briefs table (articles)
ALTER publication supabase_realtime ADD TABLE content_briefs;

-- Create user presence table to track active users per article
CREATE TABLE IF NOT EXISTS public.user_presence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  article_id UUID NOT NULL REFERENCES public.content_briefs(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('viewing', 'editing', 'idle')),
  cursor_position JSONB DEFAULT NULL, -- Store cursor position data
  user_metadata JSONB DEFAULT '{}', -- Store user name, avatar, etc.
  last_heartbeat TIMESTAMP WITH TIME ZONE DEFAULT now(),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_user_presence_article_id ON public.user_presence(article_id);
CREATE INDEX idx_user_presence_user_id ON public.user_presence(user_id);
CREATE INDEX idx_user_presence_last_heartbeat ON public.user_presence(last_heartbeat);
CREATE INDEX idx_user_presence_article_user ON public.user_presence(article_id, user_id);

-- Enable RLS
ALTER TABLE public.user_presence ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_presence
CREATE POLICY "Users can view presence for articles they can access" ON public.user_presence
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.content_briefs cb
      WHERE cb.id = user_presence.article_id
      AND (cb.user_id = auth.uid() OR public.is_admin())
    )
  );

CREATE POLICY "Users can manage their own presence" ON public.user_presence
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Admins can view all presence" ON public.user_presence
  FOR SELECT USING (public.is_admin());

-- Function to update user presence
CREATE OR REPLACE FUNCTION public.update_user_presence(
  p_article_id UUID,
  p_status TEXT DEFAULT 'viewing',
  p_cursor_position JSONB DEFAULT NULL,
  p_user_metadata JSONB DEFAULT '{}'
) RETURNS UUID AS $$
DECLARE
  v_presence_id UUID;
  v_user_id UUID := auth.uid();
BEGIN
  -- Check if user has access to this article
  IF NOT EXISTS (
    SELECT 1 FROM public.content_briefs 
    WHERE id = p_article_id 
    AND (user_id = v_user_id OR public.is_admin())
  ) THEN
    RAISE EXCEPTION 'Access denied to article';
  END IF;

  -- Upsert presence record
  INSERT INTO public.user_presence (
    user_id, article_id, status, cursor_position, user_metadata, last_heartbeat, updated_at
  )
  VALUES (
    v_user_id, p_article_id, p_status, p_cursor_position, p_user_metadata, now(), now()
  )
  ON CONFLICT (user_id, article_id) DO UPDATE SET
    status = EXCLUDED.status,
    cursor_position = EXCLUDED.cursor_position,
    user_metadata = EXCLUDED.user_metadata,
    last_heartbeat = now(),
    updated_at = now()
  RETURNING id INTO v_presence_id;

  RETURN v_presence_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add unique constraint to prevent duplicate presence records per user per article
ALTER TABLE public.user_presence 
ADD CONSTRAINT unique_user_article_presence 
UNIQUE (user_id, article_id);

-- Function to get active users for an article
CREATE OR REPLACE FUNCTION public.get_active_users(
  p_article_id UUID,
  p_timeout_minutes INTEGER DEFAULT 5
) RETURNS TABLE (
  user_id UUID,
  status TEXT,
  cursor_position JSONB,
  user_metadata JSONB,
  last_heartbeat TIMESTAMP WITH TIME ZONE,
  joined_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  -- Check if user has access to this article
  IF NOT EXISTS (
    SELECT 1 FROM public.content_briefs 
    WHERE id = p_article_id 
    AND (user_id = auth.uid() OR public.is_admin())
  ) THEN
    RAISE EXCEPTION 'Access denied to article';
  END IF;

  RETURN QUERY
  SELECT 
    up.user_id,
    up.status,
    up.cursor_position,
    up.user_metadata,
    up.last_heartbeat,
    up.joined_at
  FROM public.user_presence up
  WHERE up.article_id = p_article_id
    AND up.last_heartbeat > (now() - (p_timeout_minutes || ' minutes')::interval)
  ORDER BY up.joined_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to remove stale presence records
CREATE OR REPLACE FUNCTION public.cleanup_stale_presence(
  p_timeout_minutes INTEGER DEFAULT 10
) RETURNS INTEGER AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  DELETE FROM public.user_presence 
  WHERE last_heartbeat < (now() - (p_timeout_minutes || ' minutes')::interval);
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to leave article (remove presence)
CREATE OR REPLACE FUNCTION public.leave_article(
  p_article_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  DELETE FROM public.user_presence 
  WHERE user_id = v_user_id AND article_id = p_article_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a trigger to update the updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_presence_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_presence_timestamp
  BEFORE UPDATE ON public.user_presence
  FOR EACH ROW
  EXECUTE FUNCTION public.update_presence_timestamp();

-- Enable realtime for user_presence table
ALTER publication supabase_realtime ADD TABLE user_presence;

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_presence TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_user_presence TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_active_users TO authenticated;
GRANT EXECUTE ON FUNCTION public.leave_article TO authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_stale_presence TO authenticated;

-- Create scheduled job to clean up stale presence records (runs every 5 minutes)
-- Note: This requires pg_cron extension to be enabled
-- SELECT cron.schedule('cleanup-stale-presence', '*/5 * * * *', 'SELECT public.cleanup_stale_presence(10);'); 