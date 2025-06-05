-- Migration: Admin Article Access System
-- Date: 2025-01-01
-- Purpose: Add admin article access functionality with audit logging and RLS policy overrides

-- Create action_type enum for admin article access tracking
-- Note: PostgreSQL doesn't support IF NOT EXISTS for CREATE TYPE
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'admin_action_type') THEN
    CREATE TYPE admin_action_type AS ENUM (
      'view',
      'edit',
      'status_change',
      'ownership_transfer',
      'delete',
      'restore',
      'export',
      'comment_add',
      'comment_resolve',
      'bulk_operation'
    );
  END IF;
END $$;

-- Create admin_article_access table for audit logging
CREATE TABLE IF NOT EXISTS public.admin_article_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES public.admin_profiles(id) ON DELETE CASCADE,
  article_id UUID NOT NULL REFERENCES public.content_briefs(id) ON DELETE CASCADE,
  access_time TIMESTAMP WITH TIME ZONE DEFAULT now(),
  action_type admin_action_type NOT NULL,
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes for admin_article_access table
CREATE INDEX IF NOT EXISTS idx_admin_article_access_admin_id ON public.admin_article_access(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_article_access_article_id ON public.admin_article_access(article_id);
CREATE INDEX IF NOT EXISTS idx_admin_article_access_access_time ON public.admin_article_access(access_time);
CREATE INDEX IF NOT EXISTS idx_admin_article_access_action_type ON public.admin_article_access(action_type);

-- Enable RLS on admin_article_access table
ALTER TABLE public.admin_article_access ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for admin_article_access - only admins can read/write
CREATE POLICY "Admins can manage article access logs" 
  ON public.admin_article_access 
  FOR ALL 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_profiles 
      WHERE id = auth.uid()
    )
  );

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.admin_profiles 
    WHERE id = user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create enhanced RLS policy for content_briefs to allow admin access
-- First, let's check existing policies and create admin override policy
-- Drop existing policies if they exist to recreate them with admin access
DROP POLICY IF EXISTS "Users can only view their own content briefs" ON public.content_briefs;
DROP POLICY IF EXISTS "Users can only edit their own content briefs" ON public.content_briefs;
DROP POLICY IF EXISTS "Users can only insert their own content briefs" ON public.content_briefs;
DROP POLICY IF EXISTS "Users can only delete their own content briefs" ON public.content_briefs;

-- Recreate policies with admin access
-- Policy for SELECT - users can view their own content, admins can view all
CREATE POLICY "Users and admins can view content briefs" 
  ON public.content_briefs 
  FOR SELECT 
  TO authenticated 
  USING (
    user_id = auth.uid() OR public.is_admin()
  );

-- Policy for UPDATE - users can update their own content, admins can update all
CREATE POLICY "Users and admins can update content briefs" 
  ON public.content_briefs 
  FOR UPDATE 
  TO authenticated 
  USING (
    user_id = auth.uid() OR public.is_admin()
  )
  WITH CHECK (
    user_id = auth.uid() OR public.is_admin()
  );

-- Policy for INSERT - users can insert their own content, admins can insert for anyone
CREATE POLICY "Users and admins can insert content briefs" 
  ON public.content_briefs 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (
    user_id = auth.uid() OR public.is_admin()
  );

-- Policy for DELETE - users can delete their own content, admins can delete any
CREATE POLICY "Users and admins can delete content briefs" 
  ON public.content_briefs 
  FOR DELETE 
  TO authenticated 
  USING (
    user_id = auth.uid() OR public.is_admin()
  );

-- Function to log admin article access
CREATE OR REPLACE FUNCTION public.log_admin_article_access(
  p_article_id UUID,
  p_action_type admin_action_type,
  p_notes TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
  access_id UUID;
BEGIN
  -- Only log if the current user is an admin
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: Only admins can log article access';
  END IF;

  INSERT INTO public.admin_article_access (
    admin_id,
    article_id,
    action_type,
    notes,
    metadata
  ) VALUES (
    auth.uid(),
    p_article_id,
    p_action_type,
    p_notes,
    p_metadata
  ) RETURNING id INTO access_id;

  RETURN access_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get admin article access logs with filtering
CREATE OR REPLACE FUNCTION public.get_admin_article_access_logs(
  p_article_id UUID DEFAULT NULL,
  p_admin_id UUID DEFAULT NULL,
  p_action_type admin_action_type DEFAULT NULL,
  p_from_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_to_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_limit INTEGER DEFAULT 100,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  admin_id UUID,
  admin_email TEXT,
  admin_name TEXT,
  article_id UUID,
  article_title TEXT,
  access_time TIMESTAMP WITH TIME ZONE,
  action_type admin_action_type,
  notes TEXT,
  metadata JSONB
) AS $$
BEGIN
  -- Only admins can access logs
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: Only admins can view article access logs';
  END IF;

  RETURN QUERY
  SELECT 
    aal.id,
    aal.admin_id,
    ap.email as admin_email,
    ap.name as admin_name,
    aal.article_id,
    COALESCE(cb.title, 'Untitled Article') as article_title,
    aal.access_time,
    aal.action_type,
    aal.notes,
    aal.metadata
  FROM public.admin_article_access aal
  LEFT JOIN public.admin_profiles ap ON aal.admin_id = ap.id
  LEFT JOIN public.content_briefs cb ON aal.article_id = cb.id
  WHERE 
    (p_article_id IS NULL OR aal.article_id = p_article_id) AND
    (p_admin_id IS NULL OR aal.admin_id = p_admin_id) AND
    (p_action_type IS NULL OR aal.action_type = p_action_type) AND
    (p_from_date IS NULL OR aal.access_time >= p_from_date) AND
    (p_to_date IS NULL OR aal.access_time <= p_to_date)
  ORDER BY aal.access_time DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.admin_article_access TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_admin_article_access TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_article_access_logs TO authenticated; 