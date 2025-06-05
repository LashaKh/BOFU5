-- Create comment_status_history table for tracking comment resolution workflow
CREATE TABLE comment_status_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  comment_id UUID NOT NULL REFERENCES article_comments(id) ON DELETE CASCADE,
  old_status TEXT NOT NULL CHECK (old_status IN ('active', 'resolved', 'archived')),
  new_status TEXT NOT NULL CHECK (new_status IN ('active', 'resolved', 'archived')),
  changed_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  changed_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  reason TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes for performance
CREATE INDEX idx_comment_status_history_comment_id ON comment_status_history(comment_id);
CREATE INDEX idx_comment_status_history_changed_by ON comment_status_history(changed_by);
CREATE INDEX idx_comment_status_history_changed_at ON comment_status_history(changed_at);
CREATE INDEX idx_comment_status_history_new_status ON comment_status_history(new_status);

-- Create composite index for analytics queries
CREATE INDEX idx_comment_status_history_analytics ON comment_status_history(new_status, changed_at) 
  WHERE new_status IN ('resolved', 'archived');

-- Enable RLS
ALTER TABLE comment_status_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view status history for comments on articles they have access to
CREATE POLICY "Users can view comment status history for accessible articles" ON comment_status_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM article_comments ac
      JOIN content_briefs cb ON ac.article_id = cb.id
      WHERE ac.id = comment_status_history.comment_id
      AND cb.user_id = auth.uid()
    )
  );

-- Users can insert status history records for their own status changes
CREATE POLICY "Users can insert status history for own changes" ON comment_status_history
  FOR INSERT WITH CHECK (changed_by = auth.uid());

-- Admins can view all status history
CREATE POLICY "Admins can view all comment status history" ON comment_status_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() 
      AND raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Admins can insert status history for any comment
CREATE POLICY "Admins can insert any status history" ON comment_status_history
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() 
      AND raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Create function to automatically record status changes
CREATE OR REPLACE FUNCTION record_comment_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only record if status actually changed
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO comment_status_history (
      comment_id,
      old_status,
      new_status,
      changed_by,
      reason,
      metadata
    ) VALUES (
      NEW.id,
      COALESCE(OLD.status, 'active'),
      NEW.status,
      auth.uid(),
      NULL, -- Will be filled by application logic if needed
      '{}'::jsonb
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically record status changes
-- Note: This is a backup mechanism; the application should handle this explicitly
DROP TRIGGER IF EXISTS comment_status_change_trigger ON article_comments;
CREATE TRIGGER comment_status_change_trigger
  AFTER UPDATE ON article_comments
  FOR EACH ROW
  EXECUTE FUNCTION record_comment_status_change();

-- Add helpful comments
COMMENT ON TABLE comment_status_history IS 'Tracks the history of comment status changes for resolution workflow analytics';
COMMENT ON COLUMN comment_status_history.metadata IS 'Stores additional information like template_used, resolution_time_days, bulk_operation flags, etc.';
COMMENT ON COLUMN comment_status_history.reason IS 'Human-readable reason for the status change, often from resolution templates';

-- Create a view for easy status analytics
CREATE OR REPLACE VIEW comment_resolution_analytics AS
SELECT 
  csh.comment_id,
  ac.article_id,
  ac.content_type,
  ac.created_at as comment_created_at,
  csh.changed_at as resolved_at,
  csh.reason as resolution_reason,
  csh.metadata,
  EXTRACT(EPOCH FROM (csh.changed_at - ac.created_at)) / 86400 as resolution_time_days,
  u.email as resolved_by_email,
  u.raw_user_meta_data->>'name' as resolved_by_name
FROM comment_status_history csh
JOIN article_comments ac ON csh.comment_id = ac.id
JOIN auth.users u ON csh.changed_by = u.id
WHERE csh.new_status = 'resolved'
ORDER BY csh.changed_at DESC;

-- Grant appropriate permissions
GRANT SELECT ON comment_resolution_analytics TO authenticated;

-- Create function for getting resolution stats by article
CREATE OR REPLACE FUNCTION get_article_resolution_stats(article_uuid UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_comments', COUNT(DISTINCT ac.id),
    'resolved_comments', COUNT(DISTINCT CASE WHEN ac.status = 'resolved' THEN ac.id END),
    'active_comments', COUNT(DISTINCT CASE WHEN ac.status = 'active' THEN ac.id END),
    'archived_comments', COUNT(DISTINCT CASE WHEN ac.status = 'archived' THEN ac.id END),
    'resolution_rate', CASE 
      WHEN COUNT(DISTINCT ac.id) > 0 
      THEN ROUND((COUNT(DISTINCT CASE WHEN ac.status = 'resolved' THEN ac.id END)::DECIMAL / COUNT(DISTINCT ac.id) * 100), 2)
      ELSE 0 
    END,
    'avg_resolution_time_days', COALESCE(AVG(
      CASE WHEN csh.new_status = 'resolved' 
      THEN EXTRACT(EPOCH FROM (csh.changed_at - ac.created_at)) / 86400 
      END
    ), 0),
    'total_status_changes', COUNT(csh.id),
    'recent_resolutions', COUNT(CASE WHEN csh.new_status = 'resolved' AND csh.changed_at > NOW() - INTERVAL '7 days' THEN 1 END)
  ) INTO result
  FROM article_comments ac
  LEFT JOIN comment_status_history csh ON ac.id = csh.comment_id
  WHERE ac.article_id = article_uuid;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execution permission
GRANT EXECUTE ON FUNCTION get_article_resolution_stats(UUID) TO authenticated; 