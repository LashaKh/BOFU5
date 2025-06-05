-- Migration: Fix enum values and ensure is_admin function exists
-- Date: 2025-01-31
-- Purpose: Fix editing_status_enum to include 'published' and ensure is_admin function exists

-- First, add 'published' to the existing editing_status_enum if it doesn't already exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'published' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'editing_status_enum')) THEN
        ALTER TYPE editing_status_enum ADD VALUE 'published';
    END IF;
END $$;

-- Ensure the is_admin function exists (recreate if missing)
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if user exists in admin_profiles table
  RETURN EXISTS (
    SELECT 1 FROM public.admin_profiles 
    WHERE id = user_id
  );
EXCEPTION
  WHEN others THEN
    -- If admin_profiles table doesn't exist, fall back to metadata check
    RETURN COALESCE(
      (auth.jwt() ->> 'is_admin')::boolean,
      false
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.is_admin TO authenticated;

-- Update any existing 'published' status records that might be stored as text
-- (This handles any data inconsistencies)
UPDATE content_briefs 
SET editing_status = 'final'::editing_status_enum 
WHERE editing_status::text = 'published' 
AND editing_status::text NOT IN ('draft', 'editing', 'review', 'final', 'published');

-- Create index on editing_status if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_content_briefs_editing_status ON content_briefs(editing_status);

-- Comment for reference
COMMENT ON FUNCTION public.is_admin IS 'Checks if a user is an admin by looking up admin_profiles table or falling back to JWT metadata'; 