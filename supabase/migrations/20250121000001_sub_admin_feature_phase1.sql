-- Sub-Admin Feature Implementation - Phase 1: Database Foundation
-- Migration: 20250121000001_sub_admin_feature_phase1.sql
-- Description: Implements role-based access control with client assignment system

-- =====================================================
-- STEP 1: Add admin_role column to admin_profiles
-- =====================================================

-- Add admin_role column with constraint
ALTER TABLE admin_profiles 
ADD COLUMN IF NOT EXISTS admin_role TEXT DEFAULT 'sub_admin' 
CHECK (admin_role IN ('super_admin', 'sub_admin'));

-- Update existing admin to super_admin (lashay@bofu.ai)
UPDATE admin_profiles 
SET admin_role = 'super_admin' 
WHERE email = 'lashay@bofu.ai';

-- =====================================================
-- STEP 2: Create admin_client_assignments table
-- =====================================================

CREATE TABLE IF NOT EXISTS admin_client_assignments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    admin_id UUID NOT NULL REFERENCES admin_profiles(id) ON DELETE CASCADE,
    client_user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    assigned_by UUID REFERENCES admin_profiles(id),
    is_active BOOLEAN DEFAULT TRUE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Prevent duplicate assignments
    UNIQUE(admin_id, client_user_id)
);

-- =====================================================
-- STEP 3: Create indexes for performance
-- =====================================================

-- Index for admin lookups
CREATE INDEX IF NOT EXISTS idx_admin_client_assignments_admin_id 
ON admin_client_assignments(admin_id) WHERE is_active = TRUE;

-- Index for client lookups
CREATE INDEX IF NOT EXISTS idx_admin_client_assignments_client_id 
ON admin_client_assignments(client_user_id) WHERE is_active = TRUE;

-- Index for assignment queries
CREATE INDEX IF NOT EXISTS idx_admin_client_assignments_active 
ON admin_client_assignments(is_active, assigned_at);

-- Index for admin_profiles role queries
CREATE INDEX IF NOT EXISTS idx_admin_profiles_role 
ON admin_profiles(admin_role) WHERE admin_role IS NOT NULL;

-- =====================================================
-- STEP 4: Create utility functions
-- =====================================================

-- Function to get current admin role
CREATE OR REPLACE FUNCTION get_current_admin_role()
RETURNS TEXT AS $$
DECLARE
    current_email TEXT;
    admin_role_val TEXT;
BEGIN
    -- Get current user email
    current_email := auth.jwt() ->> 'email';
    
    IF current_email IS NULL THEN
        RETURN NULL;
    END IF;
    
    -- Get admin role
    SELECT admin_role INTO admin_role_val
    FROM admin_profiles
    WHERE email = current_email;
    
    RETURN admin_role_val;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is super admin
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN get_current_admin_role() = 'super_admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get current admin ID
CREATE OR REPLACE FUNCTION get_current_admin_id()
RETURNS UUID AS $$
DECLARE
    current_email TEXT;
    admin_id_val UUID;
BEGIN
    current_email := auth.jwt() ->> 'email';
    
    IF current_email IS NULL THEN
        RETURN NULL;
    END IF;
    
    SELECT id INTO admin_id_val
    FROM admin_profiles
    WHERE email = current_email;
    
    RETURN admin_id_val;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if client is assigned to current admin
CREATE OR REPLACE FUNCTION is_client_assigned_to_admin(client_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    current_admin_id UUID;
    assignment_exists BOOLEAN DEFAULT FALSE;
BEGIN
    -- Super admins have access to all clients
    IF is_super_admin() THEN
        RETURN TRUE;
    END IF;
    
    -- Get current admin ID
    current_admin_id := get_current_admin_id();
    
    IF current_admin_id IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Check if assignment exists
    SELECT EXISTS(
        SELECT 1 FROM admin_client_assignments
        WHERE admin_id = current_admin_id 
        AND client_user_id = client_id 
        AND is_active = TRUE
    ) INTO assignment_exists;
    
    RETURN assignment_exists;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- STEP 5: Update RLS Policies
-- =====================================================

-- Enable RLS on admin_client_assignments
ALTER TABLE admin_client_assignments ENABLE ROW LEVEL SECURITY;

-- Policy for admin_client_assignments
DROP POLICY IF EXISTS "Admin assignment access" ON admin_client_assignments;
CREATE POLICY "Admin assignment access" ON admin_client_assignments
    FOR ALL USING (
        -- Super admins can see all assignments
        is_super_admin() 
        OR 
        -- Sub-admins can only see their own assignments
        admin_id = get_current_admin_id()
    );

-- Update user_profiles RLS for sub-admin access
DROP POLICY IF EXISTS "Admin user profile access" ON user_profiles;
CREATE POLICY "Admin user profile access" ON user_profiles
    FOR ALL USING (
        -- Super admins can access all profiles
        is_super_admin()
        OR
        -- Sub-admins can only access assigned clients
        is_client_assigned_to_admin(id)
        OR
        -- Users can access their own profile
        auth.uid() = id
    );

-- Update content_briefs RLS for sub-admin access
DROP POLICY IF EXISTS "Admin content brief access" ON content_briefs;
CREATE POLICY "Admin content brief access" ON content_briefs
    FOR ALL USING (
        -- Super admins can access all content briefs
        is_super_admin()
        OR
        -- Sub-admins can only access briefs from assigned clients
        is_client_assigned_to_admin(user_id)
        OR
        -- Users can access their own content briefs
        auth.uid() = user_id
    );

-- Update research_results RLS for sub-admin access
DROP POLICY IF EXISTS "Admin research results access" ON research_results;
CREATE POLICY "Admin research results access" ON research_results
    FOR ALL USING (
        -- Super admins can access all research results
        is_super_admin()
        OR
        -- Sub-admins can only access results from assigned clients
        EXISTS (
            SELECT 1 FROM content_briefs cb
            WHERE cb.id = research_results.content_brief_id
            AND is_client_assigned_to_admin(cb.user_id)
        )
        OR
        -- Users can access their own research results
        EXISTS (
            SELECT 1 FROM content_briefs cb
            WHERE cb.id = research_results.content_brief_id
            AND auth.uid() = cb.user_id
        )
    );

-- Update article_comments RLS for sub-admin access
DROP POLICY IF EXISTS "Admin article comment access" ON article_comments;
CREATE POLICY "Admin article comment access" ON article_comments
    FOR ALL USING (
        -- Super admins can access all comments
        is_super_admin()
        OR
        -- Sub-admins can only access comments from assigned clients
        EXISTS (
            SELECT 1 FROM research_results rr
            JOIN content_briefs cb ON cb.id = rr.content_brief_id
            WHERE rr.id = article_comments.research_result_id
            AND is_client_assigned_to_admin(cb.user_id)
        )
        OR
        -- Users can access comments on their own content
        EXISTS (
            SELECT 1 FROM research_results rr
            JOIN content_briefs cb ON cb.id = rr.content_brief_id
            WHERE rr.id = article_comments.research_result_id
            AND auth.uid() = cb.user_id
        )
    );

-- =====================================================
-- STEP 6: Create trigger for updated_at
-- =====================================================

-- Create trigger function if not exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to admin_client_assignments
DROP TRIGGER IF EXISTS update_admin_client_assignments_updated_at ON admin_client_assignments;
CREATE TRIGGER update_admin_client_assignments_updated_at
    BEFORE UPDATE ON admin_client_assignments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- STEP 7: Grant permissions
-- =====================================================

-- Grant necessary permissions
GRANT ALL ON admin_client_assignments TO authenticated;
GRANT ALL ON admin_client_assignments TO service_role;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION get_current_admin_role() TO authenticated;
GRANT EXECUTE ON FUNCTION is_super_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION get_current_admin_id() TO authenticated;
GRANT EXECUTE ON FUNCTION is_client_assigned_to_admin(UUID) TO authenticated;

-- =====================================================
-- STEP 8: Verification queries
-- =====================================================

-- Insert verification comment
INSERT INTO migration_log (migration_name, applied_at, description) 
VALUES (
    '20250121000001_sub_admin_feature_phase1', 
    NOW(), 
    'Sub-admin feature Phase 1: Database foundation with role hierarchy, client assignments, and RLS policies'
) ON CONFLICT (migration_name) DO UPDATE SET 
    applied_at = NOW(),
    description = EXCLUDED.description;

-- Create migration_log table if it doesn't exist
CREATE TABLE IF NOT EXISTS migration_log (
    id SERIAL PRIMARY KEY,
    migration_name TEXT UNIQUE NOT NULL,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    description TEXT
);

-- Final verification
DO $$
BEGIN
    -- Verify admin_role column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'admin_profiles' AND column_name = 'admin_role'
    ) THEN
        RAISE EXCEPTION 'admin_role column not created properly';
    END IF;
    
    -- Verify admin_client_assignments table exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'admin_client_assignments'
    ) THEN
        RAISE EXCEPTION 'admin_client_assignments table not created properly';
    END IF;
    
    RAISE NOTICE 'Sub-admin Phase 1 migration completed successfully!';
END
$$; 