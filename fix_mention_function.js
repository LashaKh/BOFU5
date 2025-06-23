#!/usr/bin/env node

// Script to fix the get_mentionable_users function using Supabase client
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase URL or service key in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const correctedFunctionSQL = `
-- =====================================================
-- CORRECTED GET_MENTIONABLE_USERS FUNCTION
-- =====================================================
-- This fixes the column references based on actual table structure
-- admin_profiles has 'name' column, not 'full_name'

DROP FUNCTION IF EXISTS get_mentionable_users(UUID, TEXT);

CREATE OR REPLACE FUNCTION get_mentionable_users(
  article_id_param UUID DEFAULT NULL,
  search_term TEXT DEFAULT ''
)
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  is_admin BOOLEAN,
  mention_text TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Enhanced logging for debugging
  RAISE NOTICE 'get_mentionable_users called with article_id: %, search_term: %', article_id_param, search_term;
  
  RETURN QUERY
  WITH user_data AS (
    -- Get regular users from user_profiles table
    SELECT 
      up.id as user_id,
      up.email,
      COALESCE(up.company_name, SPLIT_PART(up.email, '@', 1)) as full_name,
      up.avatar_url,
      FALSE as is_admin,
      COALESCE(up.company_name, SPLIT_PART(up.email, '@', 1)) as display_name
    FROM user_profiles up
    WHERE up.email IS NOT NULL
      AND up.id != COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid)
    
    UNION ALL
    
    -- Get admin users from admin_profiles table (using 'name' column, not 'full_name')
    SELECT 
      ap.id as user_id,
      ap.email,
      COALESCE(ap.name, SPLIT_PART(ap.email, '@', 1)) as full_name,
      ap.avatar_url,
      TRUE as is_admin,
      COALESCE(ap.name, SPLIT_PART(ap.email, '@', 1)) as display_name
    FROM admin_profiles ap
    WHERE ap.email IS NOT NULL
      AND ap.id != COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid)
  )
  SELECT 
    ud.user_id,
    ud.email,
    ud.full_name,
    ud.avatar_url,
    ud.is_admin,
    '@' || LOWER(REPLACE(REPLACE(REPLACE(ud.display_name, ' ', ''), '-', ''), '.', '')) as mention_text
  FROM user_data ud
  WHERE 
    (
      search_term = '' OR 
      LOWER(ud.display_name) LIKE LOWER('%' || search_term || '%') OR
      LOWER(ud.email) LIKE LOWER('%' || search_term || '%') OR
      LOWER(ud.full_name) LIKE LOWER('%' || search_term || '%')
    )
  ORDER BY 
    ud.is_admin DESC, -- Admins first
    LENGTH(ud.display_name) ASC, -- Shorter names first
    ud.display_name ASC
  LIMIT 20; -- Reasonable limit
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_mentionable_users(UUID, TEXT) TO authenticated;
`;

async function fixMentionFunction() {
  try {
    console.log('🔧 Applying corrected get_mentionable_users function...');
    
    // Execute the corrected function SQL
    const { data, error } = await supabase.rpc('sql', {
      query: correctedFunctionSQL
    });
    
    if (error) {
      console.error('❌ Error executing function creation SQL:', error);
      // Try direct SQL execution instead
      const { data: directData, error: directError } = await supabase
        .from('pg_stat_statements')
        .select('*')
        .limit(1);
      
      if (directError) {
        console.log('💡 Trying alternative approach with raw SQL...');
        
        // Use the REST API approach
        const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'Content-Type': 'application/json',
            'apikey': supabaseServiceKey
          },
          body: JSON.stringify({ sql: correctedFunctionSQL })
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        console.log('✅ Function successfully created via REST API');
      }
    } else {
      console.log('✅ Function successfully created');
    }
    
    // Test the function
    console.log('🧪 Testing the corrected function...');
    
    const { data: testData, error: testError } = await supabase.rpc('get_mentionable_users', {
      article_id_param: null,
      search_term: ''
    });
    
    if (testError) {
      console.error('❌ Error testing function:', testError);
    } else {
      console.log(`✅ Function test successful! Found ${testData.length} mentionable users:`);
      
      // Group by admin/regular users
      const admins = testData.filter(user => user.is_admin);
      const regularUsers = testData.filter(user => !user.is_admin);
      
      console.log(`   📊 ${admins.length} admin users`);
      console.log(`   👥 ${regularUsers.length} regular users`);
      console.log(`   🎯 Total: ${testData.length} users`);
      
      // Show a few examples
      if (testData.length > 0) {
        console.log('\n📋 Sample users:');
        testData.slice(0, 5).forEach(user => {
          console.log(`   ${user.is_admin ? '👑' : '👤'} ${user.full_name} (${user.email}) - ${user.mention_text}`);
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

fixMentionFunction();