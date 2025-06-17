-- Multi-Profile System Implementation - Phase 1: Database Foundation
-- Migration: 20250121000002_multi_profile_system_phase1.sql
-- Description: Implements multi-profile system allowing multiple user profiles per company account

-- =====================================================
-- STEP 1: Create company_profiles table
-- =====================================================

CREATE TABLE IF NOT EXISTS company_profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id TEXT NOT NULL, -- Reference to company (using company_name from user_profiles)
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    profile_name VARCHAR(255) NOT NULL,
    profile_role VARCHAR(100) NOT NULL DEFAULT 'viewer', -- 'admin', 'manager', 'editor', 'viewer'
    profile_avatar_url TEXT,
    profile_permissions JSONB DEFAULT '{
        "canCreateContent": false,
        "canEditContent": false,
        "canDeleteContent": false,
        "canManageUsers": false,
        "canViewAnalytics": false,
        "canExportData": false
    }'::jsonb,
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique profile names per company-user combination
    UNIQUE(company_id, user_id, profile_name),
    
    -- Validate profile role values
    CHECK (profile_role IN ('admin', 'manager', 'editor', 'viewer')),
    
    -- Ensure profile name is not empty
    CHECK (LENGTH(TRIM(profile_name)) > 0)
);

-- =====================================================
-- STEP 2: Create user_profile_sessions table
-- =====================================================

CREATE TABLE IF NOT EXISTS user_profile_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    active_profile_id UUID REFERENCES company_profiles(id) ON DELETE SET NULL,
    session_token TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one active session per user
    UNIQUE(user_id)
);

-- =====================================================
-- STEP 3: Create indexes for performance
-- =====================================================

-- Index for company-user lookups
CREATE INDEX IF NOT EXISTS idx_company_profiles_company_user 
ON company_profiles(company_id, user_id) WHERE is_active = TRUE;

-- Index for user profile lookups
CREATE INDEX IF NOT EXISTS idx_company_profiles_user_id 
ON company_profiles(user_id) WHERE is_active = TRUE;

-- Index for company lookups
CREATE INDEX IF NOT EXISTS idx_company_profiles_company_id 
ON company_profiles(company_id) WHERE is_active = TRUE;

-- Index for default profile lookups
CREATE INDEX IF NOT EXISTS idx_company_profiles_default 
ON company_profiles(user_id, is_default) WHERE is_default = TRUE AND is_active = TRUE;

-- Index for profile sessions
CREATE INDEX IF NOT EXISTS idx_user_profile_sessions_user_id 
ON user_profile_sessions(user_id);

CREATE INDEX IF NOT EXISTS idx_user_profile_sessions_token 
ON user_profile_sessions(session_token);

-- Index for session cleanup
CREATE INDEX IF NOT EXISTS idx_user_profile_sessions_expires 
ON user_profile_sessions(expires_at);

-- =====================================================
-- STEP 4: Create utility functions
-- =====================================================

-- Function to get user's company name
CREATE OR REPLACE FUNCTION get_user_company()
RETURNS TEXT AS $$
DECLARE
    current_user_id UUID;
    company_name TEXT;
BEGIN
    current_user_id := auth.uid();
    
    IF current_user_id IS NULL THEN
        RETURN NULL;
    END IF;
    
    -- Get company name from user_profiles
    SELECT up.company_name INTO company_name
    FROM user_profiles up
    WHERE up.id = current_user_id;
    
    RETURN company_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get active profile for current user
CREATE OR REPLACE FUNCTION get_active_profile()
RETURNS UUID AS $$
DECLARE
    current_user_id UUID;
    active_profile_id UUID;
BEGIN
    current_user_id := auth.uid();
    
    IF current_user_id IS NULL THEN
        RETURN NULL;
    END IF;
    
    -- Get active profile from session
    SELECT ups.active_profile_id INTO active_profile_id
    FROM user_profile_sessions ups
    WHERE ups.user_id = current_user_id
    AND ups.expires_at > NOW();
    
    RETURN active_profile_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check profile permissions
CREATE OR REPLACE FUNCTION check_profile_permission(permission_key TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    current_user_id UUID;
    active_profile_id UUID;
    has_permission BOOLEAN DEFAULT FALSE;
BEGIN
    current_user_id := auth.uid();
    active_profile_id := get_active_profile();
    
    IF current_user_id IS NULL OR active_profile_id IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Check permission in active profile
    SELECT (cp.profile_permissions->>permission_key)::boolean INTO has_permission
    FROM company_profiles cp
    WHERE cp.id = active_profile_id
    AND cp.user_id = current_user_id
    AND cp.is_active = TRUE;
    
    RETURN COALESCE(has_permission, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create default profile for existing users
CREATE OR REPLACE FUNCTION create_default_profile_for_user(target_user_id UUID)
RETURNS UUID AS $$
DECLARE
    user_company TEXT;
    new_profile_id UUID;
    user_email TEXT;
BEGIN
    -- Get user's company and email
    SELECT up.company_name, up.email INTO user_company, user_email
    FROM user_profiles up
    WHERE up.id = target_user_id;
    
    IF user_company IS NULL THEN
        RAISE EXCEPTION 'User not found or has no company';
    END IF;
    
    -- Create default profile
    INSERT INTO company_profiles (
        company_id,
        user_id,
        profile_name,
        profile_role,
        profile_permissions,
        is_default,
        is_active
    ) VALUES (
        user_company,
        target_user_id,
        'Default Profile',
        'manager',
        '{
            "canCreateContent": true,
            "canEditContent": true,
            "canDeleteContent": true,
            "canManageUsers": false,
            "canViewAnalytics": true,
            "canExportData": true
        }'::jsonb,
        true,
        true
    ) RETURNING id INTO new_profile_id;
    
    RETURN new_profile_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to migrate existing users to profile system
CREATE OR REPLACE FUNCTION migrate_users_to_profiles()
RETURNS TEXT AS $$
DECLARE
    user_record RECORD;
    profile_count INTEGER := 0;
    error_count INTEGER := 0;
    result_text TEXT;
BEGIN
    -- For each user in user_profiles, create a default profile
    FOR user_record IN 
        SELECT id, email, company_name 
        FROM user_profiles
        WHERE company_name IS NOT NULL
    LOOP
        BEGIN
            -- Check if user already has profiles
            IF NOT EXISTS (
                SELECT 1 FROM company_profiles 
                WHERE user_id = user_record.id
            ) THEN
                -- Create default profile
                PERFORM create_default_profile_for_user(user_record.id);
                profile_count := profile_count + 1;
            END IF;
            
        EXCEPTION WHEN OTHERS THEN
            error_count := error_count + 1;
            RAISE NOTICE 'Error creating profile for user %: %', user_record.email, SQLERRM;
        END;
    END LOOP;
    
    result_text := format('Migration completed: %s profiles created, %s errors', profile_count, error_count);
    RAISE NOTICE '%', result_text;
    RETURN result_text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- STEP 5: Enable RLS and create policies
-- =====================================================

-- Enable RLS on company_profiles
ALTER TABLE company_profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can manage their own profiles
CREATE POLICY "Users can manage own profiles" ON company_profiles
    FOR ALL USING (auth.uid() = user_id);

-- Policy: Users can view profiles in their company (read-only for collaboration)
CREATE POLICY "Users can view company profiles" ON company_profiles
    FOR SELECT USING (
        company_id = get_user_company()
        AND is_active = TRUE
    );

-- Enable RLS on user_profile_sessions
ALTER TABLE user_profile_sessions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can manage their own sessions
CREATE POLICY "Users can manage own sessions" ON user_profile_sessions
    FOR ALL USING (auth.uid() = user_id);

-- =====================================================
-- STEP 6: Create trigger for updated_at
-- =====================================================

-- Add trigger to company_profiles
CREATE TRIGGER update_company_profiles_updated_at
    BEFORE UPDATE ON company_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- STEP 7: Create initial data migration
-- =====================================================

-- Run the migration to create default profiles for existing users
SELECT migrate_users_to_profiles();

-- =====================================================
-- STEP 8: Create cleanup function for expired sessions
-- =====================================================

-- Function to cleanup expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_profile_sessions()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM user_profile_sessions 
    WHERE expires_at <= NOW();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- STEP 9: Log migration completion
-- =====================================================

-- Insert migration log entry
INSERT INTO migration_log (
    migration_name,
    migration_timestamp,
    migration_notes
) VALUES (
    '20250121000002_multi_profile_system_phase1',
    NOW(),
    'Phase 1: Database foundation for multi-profile system - Created company_profiles and user_profile_sessions tables with RLS policies and utility functions'
);

-- Show migration summary
DO $$
DECLARE
    profile_count INTEGER;
    user_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO profile_count FROM company_profiles;
    SELECT COUNT(*) INTO user_count FROM user_profiles;
    
    RAISE NOTICE '=== Multi-Profile System Phase 1 Migration Complete ===';
    RAISE NOTICE 'Created % default profiles for % users', profile_count, user_count;
    RAISE NOTICE 'Company profiles table: Ready for multi-profile management';
    RAISE NOTICE 'User profile sessions table: Ready for profile switching';
    RAISE NOTICE 'RLS policies: Enabled for secure profile access';
    RAISE NOTICE 'Utility functions: Available for profile operations';
    RAISE NOTICE '=== Next: Phase 2 - API Development ===';
END $$; 