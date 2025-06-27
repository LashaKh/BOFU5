-- Fix RLS policy for brief_approval_notifications to allow service role access
-- This enables Edge Functions to create notifications on behalf of users

-- Add policy to allow service role to manage brief approval notifications
CREATE POLICY "Service role can manage brief approval notifications"
ON brief_approval_notifications
FOR ALL
TO service_role
USING (true)
WITH CHECK (true); 