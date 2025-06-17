-- Update Content Access Policies for Company-Wide Sharing
-- Migration: 20250122000004_update_company_content_access.sql
-- Description: Update RLS policies to allow all users under the same company to access all company content

-- =====================================================
-- STEP 1: Create helper function to get user's company
-- =====================================================

CREATE OR REPLACE FUNCTION get_user_company_name(user_id UUID DEFAULT auth.uid())
RETURNS TEXT AS $$
DECLARE
    company_name TEXT;
BEGIN
    -- Try to get company from user_profiles first (original accounts)
    SELECT up.company_name INTO company_name
    FROM user_profiles up
    WHERE up.id = user_id;
    
    -- If not found, get company from company_profiles (sub-accounts)
    IF company_name IS NULL THEN
        SELECT cp.company_id INTO company_name
        FROM company_profiles cp
        WHERE cp.user_id = user_id
        AND cp.is_active = TRUE
        LIMIT 1;
    END IF;
    
    RETURN company_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- STEP 2: Update content_briefs RLS policies
-- =====================================================

-- Drop existing policies to recreate with company-level access
DROP POLICY IF EXISTS "Users and admins can view content briefs" ON public.content_briefs;
DROP POLICY IF EXISTS "Users and admins can update content briefs" ON public.content_briefs;
DROP POLICY IF EXISTS "Users and admins can insert content briefs" ON public.content_briefs;
DROP POLICY IF EXISTS "Users and admins can delete content briefs" ON public.content_briefs;

-- Policy for SELECT - users can view content from their company, admins can view all
CREATE POLICY "Company users and admins can view content briefs" 
  ON public.content_briefs 
  FOR SELECT 
  TO authenticated 
  USING (
    -- Admin access
    public.is_admin() OR
    -- Same company access
    (
      SELECT get_user_company_name(auth.uid()) = get_user_company_name(user_id)
      WHERE get_user_company_name(auth.uid()) IS NOT NULL
    )
  );

-- Policy for UPDATE - users can update content from their company, admins can update all
CREATE POLICY "Company users and admins can update content briefs" 
  ON public.content_briefs 
  FOR UPDATE 
  TO authenticated 
  USING (
    -- Admin access
    public.is_admin() OR
    -- Same company access
    (
      SELECT get_user_company_name(auth.uid()) = get_user_company_name(user_id)
      WHERE get_user_company_name(auth.uid()) IS NOT NULL
    )
  )
  WITH CHECK (
    -- Admin access
    public.is_admin() OR
    -- Same company access
    (
      SELECT get_user_company_name(auth.uid()) = get_user_company_name(user_id)
      WHERE get_user_company_name(auth.uid()) IS NOT NULL
    )
  );

-- Policy for INSERT - users can insert content for their company, admins can insert for anyone
CREATE POLICY "Company users and admins can insert content briefs" 
  ON public.content_briefs 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (
    -- Admin access
    public.is_admin() OR
    -- Same company access
    (
      SELECT get_user_company_name(auth.uid()) = get_user_company_name(user_id)
      WHERE get_user_company_name(auth.uid()) IS NOT NULL
    )
  );

-- Policy for DELETE - users can delete content from their company, admins can delete any
CREATE POLICY "Company users and admins can delete content briefs" 
  ON public.content_briefs 
  FOR DELETE 
  TO authenticated 
  USING (
    -- Admin access
    public.is_admin() OR
    -- Same company access
    (
      SELECT get_user_company_name(auth.uid()) = get_user_company_name(user_id)
      WHERE get_user_company_name(auth.uid()) IS NOT NULL
    )
  );

-- =====================================================
-- STEP 3: Update research_results RLS policies
-- =====================================================

-- Drop existing policies to recreate with company-level access
DROP POLICY IF EXISTS "Users can view their own research results" ON public.research_results;
DROP POLICY IF EXISTS "Users can update their own research results" ON public.research_results;
DROP POLICY IF EXISTS "Users can delete their own research results" ON public.research_results;
DROP POLICY IF EXISTS "Users can create their own research results" ON public.research_results;

-- Policy for SELECT - users can view research results from their company
CREATE POLICY "Company users can view research results" 
  ON public.research_results 
  FOR SELECT 
  TO authenticated 
  USING (
    -- Same company access
    (
      SELECT get_user_company_name(auth.uid()) = get_user_company_name(user_id)
      WHERE get_user_company_name(auth.uid()) IS NOT NULL
    )
  );

-- Policy for UPDATE - users can update research results from their company
CREATE POLICY "Company users can update research results" 
  ON public.research_results 
  FOR UPDATE 
  TO authenticated 
  USING (
    -- Same company access
    (
      SELECT get_user_company_name(auth.uid()) = get_user_company_name(user_id)
      WHERE get_user_company_name(auth.uid()) IS NOT NULL
    )
  );

-- Policy for INSERT - users can create research results for their company
CREATE POLICY "Company users can create research results" 
  ON public.research_results 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (
    user_id = auth.uid() -- User can only create for themselves, but others in company can see
  );

-- Policy for DELETE - users can delete research results from their company
CREATE POLICY "Company users can delete research results" 
  ON public.research_results 
  FOR DELETE 
  TO authenticated 
  USING (
    -- Same company access
    (
      SELECT get_user_company_name(auth.uid()) = get_user_company_name(user_id)
      WHERE get_user_company_name(auth.uid()) IS NOT NULL
    )
  );

-- =====================================================
-- STEP 4: Grant permissions
-- =====================================================

GRANT EXECUTE ON FUNCTION get_user_company_name TO authenticated;

-- =====================================================
-- STEP 5: Add migration completion notice
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE 'Migration 20250122000004_update_company_content_access completed successfully';
  RAISE NOTICE 'Updated RLS policies: All users under same company can now access all company content';
  RAISE NOTICE 'Profile creation restrictions: Maintained through application-level permissions';
END $$; 