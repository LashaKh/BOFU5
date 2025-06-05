-- Migration: Add admin comment features
-- Date: 2025-06-01  
-- Purpose: Extend article_comments table with admin-specific features

-- Create admin comment type enum
CREATE TYPE IF NOT EXISTS admin_comment_type_enum AS ENUM (
  'admin_note',
  'approval_comment',
  'priority_comment',
  'review_comment',
  'system_notification'
);

-- Create comment priority enum
CREATE TYPE IF NOT EXISTS comment_priority_enum AS ENUM (
  'low',
  'normal', 
  'high',
  'urgent',
  'critical'
);

-- Create approval status enum
CREATE TYPE IF NOT EXISTS approval_status_enum AS ENUM (
  'pending',
  'approved', 
  'rejected',
  'requires_changes',
  'escalated'
);

-- Add new columns to article_comments table for admin features
ALTER TABLE article_comments 
ADD COLUMN IF NOT EXISTS admin_comment_type admin_comment_type_enum,
ADD COLUMN IF NOT EXISTS priority comment_priority_enum DEFAULT 'normal',
ADD COLUMN IF NOT EXISTS approval_status approval_status_enum,
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS admin_notes TEXT,
ADD COLUMN IF NOT EXISTS is_admin_only BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS requires_approval BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS admin_metadata JSONB DEFAULT '{}';

-- Create indexes for new admin columns
CREATE INDEX IF NOT EXISTS idx_article_comments_admin_type ON article_comments(admin_comment_type);
CREATE INDEX IF NOT EXISTS idx_article_comments_priority ON article_comments(priority);
CREATE INDEX IF NOT EXISTS idx_article_comments_approval_status ON article_comments(approval_status);
CREATE INDEX IF NOT EXISTS idx_article_comments_approved_by ON article_comments(approved_by);
CREATE INDEX IF NOT EXISTS idx_article_comments_is_admin_only ON article_comments(is_admin_only);
CREATE INDEX IF NOT EXISTS idx_article_comments_requires_approval ON article_comments(requires_approval);

-- Create table for admin comment notifications
CREATE TABLE IF NOT EXISTS admin_comment_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES article_comments(id) ON DELETE CASCADE,
  admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL, -- 'new_comment', 'priority_escalation', 'approval_request', etc.
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  read_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for notifications
CREATE INDEX IF NOT EXISTS idx_admin_notifications_admin_id ON admin_comment_notifications(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_comment_id ON admin_comment_notifications(comment_id);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_is_read ON admin_comment_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_created_at ON admin_comment_notifications(created_at);

-- Create table for comment approval workflow
CREATE TABLE IF NOT EXISTS comment_approval_workflow (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES article_comments(id) ON DELETE CASCADE,
  workflow_step INTEGER NOT NULL DEFAULT 1,
  approver_id UUID REFERENCES auth.users(id),
  action_taken TEXT, -- 'approved', 'rejected', 'escalated', 'requested_changes'
  comments TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for approval workflow
CREATE INDEX IF NOT EXISTS idx_approval_workflow_comment_id ON comment_approval_workflow(comment_id);
CREATE INDEX IF NOT EXISTS idx_approval_workflow_approver_id ON comment_approval_workflow(approver_id);
CREATE INDEX IF NOT EXISTS idx_approval_workflow_step ON comment_approval_workflow(workflow_step);

-- Enable RLS on new tables
ALTER TABLE admin_comment_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_approval_workflow ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for admin_comment_notifications
CREATE POLICY "Admins can view their notifications"
ON admin_comment_notifications FOR SELECT
USING (
  admin_id = auth.uid() AND
  EXISTS (SELECT 1 FROM admin_profiles WHERE id = auth.uid())
);

CREATE POLICY "System can create admin notifications"
ON admin_comment_notifications FOR INSERT
WITH CHECK (
  EXISTS (SELECT 1 FROM admin_profiles WHERE id = admin_id)
);

CREATE POLICY "Admins can update their notifications"
ON admin_comment_notifications FOR UPDATE
USING (
  admin_id = auth.uid() AND
  EXISTS (SELECT 1 FROM admin_profiles WHERE id = auth.uid())
);

-- Create RLS policies for comment_approval_workflow
CREATE POLICY "Admins can view approval workflow"
ON comment_approval_workflow FOR SELECT
USING (
  EXISTS (SELECT 1 FROM admin_profiles WHERE id = auth.uid())
);

CREATE POLICY "Admins can manage approval workflow"
ON comment_approval_workflow FOR ALL
USING (
  EXISTS (SELECT 1 FROM admin_profiles WHERE id = auth.uid())
);

-- Update article_comments RLS policies to handle admin-only comments
DROP POLICY IF EXISTS "Users can view comments on accessible articles" ON article_comments;
CREATE POLICY "Users can view non-admin comments on accessible articles" 
ON article_comments FOR SELECT 
USING (
  (is_admin_only = false OR is_admin_only IS NULL) AND
  article_id IN (
    SELECT id FROM content_briefs 
    WHERE user_id = auth.uid()
  )
);

-- New policy for admins to view all comments including admin-only ones
CREATE POLICY "Admins can view all comments"
ON article_comments FOR SELECT 
USING (
  EXISTS (SELECT 1 FROM admin_profiles WHERE id = auth.uid())
);

-- Create functions for admin comment operations

-- Function to create admin comment with automatic notification
CREATE OR REPLACE FUNCTION create_admin_comment(
  p_article_id UUID,
  p_content TEXT,
  p_admin_comment_type admin_comment_type_enum,
  p_priority comment_priority_enum DEFAULT 'normal',
  p_is_admin_only BOOLEAN DEFAULT false,
  p_admin_notes TEXT DEFAULT NULL,
  p_parent_comment_id UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  new_comment_id UUID;
  admin_id UUID;
BEGIN
  -- Get current admin user
  admin_id := auth.uid();
  
  -- Verify user is admin
  IF NOT EXISTS (SELECT 1 FROM admin_profiles WHERE id = admin_id) THEN
    RAISE EXCEPTION 'Only admins can create admin comments';
  END IF;
  
  -- Insert the comment
  INSERT INTO article_comments (
    article_id,
    user_id,
    parent_comment_id,
    content,
    admin_comment_type,
    priority,
    is_admin_only,
    admin_notes,
    status
  ) VALUES (
    p_article_id,
    admin_id,
    p_parent_comment_id,
    p_content,
    p_admin_comment_type,
    p_priority,
    p_is_admin_only,
    p_admin_notes,
    'active'
  ) RETURNING id INTO new_comment_id;
  
  -- Create notification for other admins if this is a priority comment
  IF p_priority IN ('high', 'urgent', 'critical') THEN
    INSERT INTO admin_comment_notifications (
      comment_id,
      admin_id,
      notification_type,
      message,
      metadata
    )
    SELECT 
      new_comment_id,
      ap.id,
      'priority_comment',
      'New ' || p_priority || ' priority admin comment created',
      jsonb_build_object('comment_type', p_admin_comment_type, 'priority', p_priority)
    FROM admin_profiles ap
    WHERE ap.id != admin_id; -- Don't notify the creator
  END IF;
  
  RETURN new_comment_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to approve a comment
CREATE OR REPLACE FUNCTION approve_comment(
  p_comment_id UUID,
  p_approval_comments TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  admin_id UUID;
  workflow_id UUID;
BEGIN
  admin_id := auth.uid();
  
  -- Verify user is admin
  IF NOT EXISTS (SELECT 1 FROM admin_profiles WHERE id = admin_id) THEN
    RAISE EXCEPTION 'Only admins can approve comments';
  END IF;
  
  -- Update comment approval status
  UPDATE article_comments 
  SET 
    approval_status = 'approved',
    approved_by = admin_id,
    approved_at = NOW()
  WHERE id = p_comment_id;
  
  -- Add to approval workflow
  INSERT INTO comment_approval_workflow (
    comment_id,
    approver_id,
    action_taken,
    comments,
    completed_at
  ) VALUES (
    p_comment_id,
    admin_id,
    'approved',
    p_approval_comments,
    NOW()
  );
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to bulk update comment priorities
CREATE OR REPLACE FUNCTION bulk_update_comment_priority(
  p_comment_ids UUID[],
  p_priority comment_priority_enum,
  p_admin_notes TEXT DEFAULT NULL
) RETURNS INTEGER AS $$
DECLARE
  admin_id UUID;
  updated_count INTEGER;
BEGIN
  admin_id := auth.uid();
  
  -- Verify user is admin
  IF NOT EXISTS (SELECT 1 FROM admin_profiles WHERE id = admin_id) THEN
    RAISE EXCEPTION 'Only admins can bulk update comment priorities';
  END IF;
  
  -- Update comments
  UPDATE article_comments 
  SET 
    priority = p_priority,
    admin_notes = COALESCE(p_admin_notes, admin_notes)
  WHERE id = ANY(p_comment_ids);
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  
  -- Create notifications for high priority updates
  IF p_priority IN ('high', 'urgent', 'critical') THEN
    INSERT INTO admin_comment_notifications (
      comment_id,
      admin_id,
      notification_type,
      message
    )
    SELECT 
      unnest(p_comment_ids),
      ap.id,
      'priority_update',
      'Comment priority updated to ' || p_priority
    FROM admin_profiles ap
    WHERE ap.id != admin_id;
  END IF;
  
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get admin comment analytics
CREATE OR REPLACE FUNCTION get_admin_comment_analytics(
  p_date_from TIMESTAMP WITH TIME ZONE DEFAULT NOW() - INTERVAL '30 days',
  p_date_to TIMESTAMP WITH TIME ZONE DEFAULT NOW()
) RETURNS JSON AS $$
DECLARE
  analytics_data JSON;
BEGIN
  -- Verify user is admin
  IF NOT EXISTS (SELECT 1 FROM admin_profiles WHERE id = auth.uid()) THEN
    RAISE EXCEPTION 'Only admins can access comment analytics';
  END IF;
  
  SELECT json_build_object(
    'total_comments', COUNT(*),
    'admin_comments', COUNT(*) FILTER (WHERE admin_comment_type IS NOT NULL),
    'priority_breakdown', json_build_object(
      'low', COUNT(*) FILTER (WHERE priority = 'low'),
      'normal', COUNT(*) FILTER (WHERE priority = 'normal'),
      'high', COUNT(*) FILTER (WHERE priority = 'high'),
      'urgent', COUNT(*) FILTER (WHERE priority = 'urgent'),
      'critical', COUNT(*) FILTER (WHERE priority = 'critical')
    ),
    'status_breakdown', json_build_object(
      'active', COUNT(*) FILTER (WHERE status = 'active'),
      'resolved', COUNT(*) FILTER (WHERE status = 'resolved'),
      'archived', COUNT(*) FILTER (WHERE status = 'archived')
    ),
    'approval_breakdown', json_build_object(
      'pending', COUNT(*) FILTER (WHERE approval_status = 'pending'),
      'approved', COUNT(*) FILTER (WHERE approval_status = 'approved'),
      'rejected', COUNT(*) FILTER (WHERE approval_status = 'rejected')
    ),
    'admin_comment_types', json_build_object(
      'admin_note', COUNT(*) FILTER (WHERE admin_comment_type = 'admin_note'),
      'approval_comment', COUNT(*) FILTER (WHERE admin_comment_type = 'approval_comment'),
      'priority_comment', COUNT(*) FILTER (WHERE admin_comment_type = 'priority_comment'),
      'review_comment', COUNT(*) FILTER (WHERE admin_comment_type = 'review_comment'),
      'system_notification', COUNT(*) FILTER (WHERE admin_comment_type = 'system_notification')
    ),
    'date_range', json_build_object(
      'from', p_date_from,
      'to', p_date_to
    )
  ) INTO analytics_data
  FROM article_comments
  WHERE created_at BETWEEN p_date_from AND p_date_to;
  
  RETURN analytics_data;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION create_admin_comment TO authenticated;
GRANT EXECUTE ON FUNCTION approve_comment TO authenticated;
GRANT EXECUTE ON FUNCTION bulk_update_comment_priority TO authenticated;
GRANT EXECUTE ON FUNCTION get_admin_comment_analytics TO authenticated; 