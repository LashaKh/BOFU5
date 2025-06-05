-- =================================================================
-- COMPLETE REAL-TIME COLLABORATION SETUP SQL
-- =================================================================
-- This file contains all SQL needed to set up real-time collaboration
-- Run this entire script in your Supabase SQL editor or pgAdmin
-- =================================================================

-- First, ensure we have the necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =================================================================
-- MIGRATION 1: Real-time Collaboration Foundation
-- =================================================================

-- Create user_presence table for tracking active users
CREATE TABLE IF NOT EXISTS public.user_presence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  article_id UUID NOT NULL REFERENCES public.content_briefs(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('viewing', 'editing', 'idle')) DEFAULT 'viewing',
  cursor_position JSONB,
  user_metadata JSONB DEFAULT '{}',
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT now(),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes for user_presence table
CREATE INDEX IF NOT EXISTS idx_user_presence_user_id ON public.user_presence(user_id);
CREATE INDEX IF NOT EXISTS idx_user_presence_article_id ON public.user_presence(article_id);
CREATE INDEX IF NOT EXISTS idx_user_presence_status ON public.user_presence(status);
CREATE INDEX IF NOT EXISTS idx_user_presence_last_seen ON public.user_presence(last_seen);
CREATE INDEX IF NOT EXISTS idx_user_presence_article_user ON public.user_presence(article_id, user_id);

-- Enable RLS for user_presence
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
BEGIN
  -- Insert or update user presence
  INSERT INTO public.user_presence (
    user_id, 
    article_id, 
    status, 
    cursor_position, 
    user_metadata,
    last_seen,
    updated_at
  ) VALUES (
    auth.uid(), 
    p_article_id, 
    p_status, 
    p_cursor_position, 
    p_user_metadata,
    now(),
    now()
  )
  ON CONFLICT (user_id, article_id) 
  DO UPDATE SET
    status = EXCLUDED.status,
    cursor_position = EXCLUDED.cursor_position,
    user_metadata = EXCLUDED.user_metadata,
    last_seen = EXCLUDED.last_seen,
    updated_at = EXCLUDED.updated_at
  RETURNING id INTO v_presence_id;
  
  RETURN v_presence_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get active users for an article
CREATE OR REPLACE FUNCTION public.get_active_users(
  p_article_id UUID,
  p_since_minutes INTEGER DEFAULT 5
) RETURNS TABLE (
  user_id UUID,
  status TEXT,
  cursor_position JSONB,
  user_metadata JSONB,
  last_seen TIMESTAMP WITH TIME ZONE,
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
    up.last_seen,
    up.joined_at
  FROM public.user_presence up
  WHERE up.article_id = p_article_id
    AND up.last_seen > (now() - (p_since_minutes || ' minutes')::interval)
  ORDER BY up.last_seen DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cleanup stale presence records
CREATE OR REPLACE FUNCTION public.cleanup_stale_presence(
  p_timeout_minutes INTEGER DEFAULT 10
) RETURNS INTEGER AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  DELETE FROM public.user_presence 
  WHERE last_seen < (now() - (p_timeout_minutes || ' minutes')::interval);
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to leave an article (cleanup presence)
CREATE OR REPLACE FUNCTION public.leave_article(
  p_article_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
  DELETE FROM public.user_presence 
  WHERE user_id = auth.uid() 
    AND article_id = p_article_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_user_presence_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for user_presence
DROP TRIGGER IF EXISTS trigger_update_user_presence_updated_at ON public.user_presence;
CREATE TRIGGER trigger_update_user_presence_updated_at
  BEFORE UPDATE ON public.user_presence
  FOR EACH ROW
  EXECUTE FUNCTION public.update_user_presence_updated_at();

-- Enable realtime for content_briefs table (if not already enabled)
ALTER publication supabase_realtime ADD TABLE content_briefs;

-- Enable realtime for user_presence table
ALTER publication supabase_realtime ADD TABLE user_presence;

-- =================================================================
-- MIGRATION 2: Collaborative Operations for Conflict Resolution
-- =================================================================

-- Create collaborative operations table
CREATE TABLE IF NOT EXISTS public.collaborative_operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES public.content_briefs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  operation_data JSONB NOT NULL,
  client_id TEXT NOT NULL,
  vector_clock JSONB DEFAULT '{}',
  applied_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  timestamp TEXT NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_collaborative_operations_article_id ON public.collaborative_operations(article_id);
CREATE INDEX IF NOT EXISTS idx_collaborative_operations_user_id ON public.collaborative_operations(user_id);
CREATE INDEX IF NOT EXISTS idx_collaborative_operations_timestamp ON public.collaborative_operations(applied_at);
CREATE INDEX IF NOT EXISTS idx_collaborative_operations_client_id ON public.collaborative_operations(client_id);

-- Enable RLS
ALTER TABLE public.collaborative_operations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for collaborative_operations
CREATE POLICY "Users can view operations for articles they can access" ON public.collaborative_operations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.content_briefs cb
      WHERE cb.id = collaborative_operations.article_id
      AND (cb.user_id = auth.uid() OR public.is_admin())
    )
  );

CREATE POLICY "Users can insert operations for articles they can access" ON public.collaborative_operations
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.content_briefs cb
      WHERE cb.id = collaborative_operations.article_id
      AND (cb.user_id = auth.uid() OR public.is_admin())
    )
    AND user_id = auth.uid()
  );

CREATE POLICY "Admins can view all operations" ON public.collaborative_operations
  FOR SELECT USING (public.is_admin());

-- Function to get operations for an article with conflict resolution
CREATE OR REPLACE FUNCTION public.get_collaborative_operations(
  p_article_id UUID,
  p_since_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NULL
) RETURNS TABLE (
  id UUID,
  operation_data JSONB,
  user_id UUID,
  client_id TEXT,
  vector_clock JSONB,
  applied_at TIMESTAMP WITH TIME ZONE
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
    co.id,
    co.operation_data,
    co.user_id,
    co.client_id,
    co.vector_clock,
    co.applied_at
  FROM public.collaborative_operations co
  WHERE co.article_id = p_article_id
    AND (p_since_timestamp IS NULL OR co.applied_at > p_since_timestamp)
  ORDER BY co.applied_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up old operations (keep only recent ones for performance)
CREATE OR REPLACE FUNCTION public.cleanup_old_operations(
  p_retention_days INTEGER DEFAULT 30
) RETURNS INTEGER AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  DELETE FROM public.collaborative_operations 
  WHERE applied_at < (now() - (p_retention_days || ' days')::interval);
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable realtime for collaborative_operations table
ALTER publication supabase_realtime ADD TABLE collaborative_operations;

-- =================================================================
-- GRANT PERMISSIONS
-- =================================================================

-- Grant necessary permissions for user_presence
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_presence TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_user_presence TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_active_users TO authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_stale_presence TO authenticated;
GRANT EXECUTE ON FUNCTION public.leave_article TO authenticated;

-- Grant necessary permissions for collaborative_operations
GRANT SELECT, INSERT ON public.collaborative_operations TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_collaborative_operations TO authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_old_operations TO authenticated;

-- =================================================================
-- VERIFICATION QUERIES
-- =================================================================
-- Run these to verify the setup worked correctly

-- Check if tables were created
SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('user_presence', 'collaborative_operations');

-- Check if indexes were created
SELECT schemaname, tablename, indexname 
FROM pg_indexes 
WHERE tablename IN ('user_presence', 'collaborative_operations')
  AND schemaname = 'public';

-- Check if RLS is enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('user_presence', 'collaborative_operations')
  AND schemaname = 'public';

-- Check if functions were created
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name LIKE '%presence%' 
   OR routine_name LIKE '%collaborative%';

-- =================================================================
-- SETUP COMPLETE
-- =================================================================
-- Your real-time collaboration infrastructure is now ready!
-- 
-- Next steps:
-- 1. Test the presence system by joining/leaving articles
-- 2. Test collaborative editing with multiple browser tabs
-- 3. Monitor the performance with the cleanup functions
-- ================================================================= 