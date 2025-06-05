-- Migration: Collaborative Operations Table
-- Description: Store Y.js collaborative operations for conflict resolution and audit

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
CREATE INDEX idx_collaborative_operations_article_id ON public.collaborative_operations(article_id);
CREATE INDEX idx_collaborative_operations_user_id ON public.collaborative_operations(user_id);
CREATE INDEX idx_collaborative_operations_timestamp ON public.collaborative_operations(applied_at);
CREATE INDEX idx_collaborative_operations_client_id ON public.collaborative_operations(client_id);

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

-- Grant necessary permissions
GRANT SELECT, INSERT ON public.collaborative_operations TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_collaborative_operations TO authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_old_operations TO authenticated; 