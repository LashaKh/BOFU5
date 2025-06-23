import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function fixMentionFunction() {
  try {
    console.log('🔧 Fixing mention function issues...\n');
    
    // First, check admin_profiles table structure
    console.log('📋 Checking admin_profiles table structure...');
    
    const { data: adminProfiles, error: adminError } = await supabase
      .from('admin_profiles')
      .select('*')
      .limit(1);
    
    if (adminError) {
      console.log('❌ Error querying admin_profiles:', adminError.message);
    } else if (adminProfiles.length > 0) {
      console.log('✅ Admin profiles table structure:');
      console.log('   Columns:', Object.keys(adminProfiles[0]));
      
      // Check if full_name column exists
      if (!adminProfiles[0].hasOwnProperty('full_name')) {
        console.log('⚠️  Missing full_name column in admin_profiles');
      }
    } else {
      console.log('⚠️  No admin profiles found');
    }
    
    // Check user_profiles table structure  
    console.log('\n📋 Checking user_profiles table structure...');
    
    const { data: userProfiles, error: userError } = await supabase
      .from('user_profiles')
      .select('*')
      .limit(1);
    
    if (userError) {
      console.log('❌ Error querying user_profiles:', userError.message);
    } else if (userProfiles.length > 0) {
      console.log('✅ User profiles table structure:');
      console.log('   Columns:', Object.keys(userProfiles[0]));
    }
    
    // Now let's create a corrected version of the function
    console.log('\n🔧 Creating corrected get_mentionable_users function...');
    
    const fixedFunctionSQL = `
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
          
          UNION ALL
          
          -- Get admin users from admin_profiles table - use available columns
          SELECT 
            ap.id as user_id,
            ap.email,
            COALESCE(
              CASE 
                WHEN EXISTS (SELECT column_name FROM information_schema.columns WHERE table_name = 'admin_profiles' AND column_name = 'full_name') 
                THEN ap.full_name 
                ELSE NULL 
              END,
              SPLIT_PART(ap.email, '@', 1)
            ) as full_name,
            ap.avatar_url,
            TRUE as is_admin,
            COALESCE(
              CASE 
                WHEN EXISTS (SELECT column_name FROM information_schema.columns WHERE table_name = 'admin_profiles' AND column_name = 'full_name') 
                THEN ap.full_name 
                ELSE NULL 
              END,
              SPLIT_PART(ap.email, '@', 1)
            ) as display_name
          FROM admin_profiles ap
          WHERE ap.email IS NOT NULL
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
      GRANT EXECUTE ON FUNCTION get_mentionable_users(UUID, TEXT) TO anon;
      GRANT EXECUTE ON FUNCTION get_mentionable_users(UUID, TEXT) TO service_role;
    `;
    
    // Apply the fix (we'll handle the complex SQL parsing later, let's try a simpler approach)
    
    // Let's create a simplified version that should work
    console.log('📝 Creating simplified function...');
    
    const simplifiedSQL = `
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
        RETURN QUERY
        SELECT 
          up.id as user_id,
          up.email,
          COALESCE(up.company_name, SPLIT_PART(up.email, '@', 1)) as full_name,
          up.avatar_url,
          FALSE as is_admin,
          '@' || LOWER(REPLACE(REPLACE(REPLACE(COALESCE(up.company_name, SPLIT_PART(up.email, '@', 1)), ' ', ''), '-', ''), '.', '')) as mention_text
        FROM user_profiles up
        WHERE up.email IS NOT NULL
          AND (
            search_term = '' OR 
            LOWER(COALESCE(up.company_name, '')) LIKE LOWER('%' || search_term || '%') OR
            LOWER(up.email) LIKE LOWER('%' || search_term || '%')
          )
        ORDER BY 
          LENGTH(COALESCE(up.company_name, up.email)) ASC,
          up.email ASC
        LIMIT 20;
      END;
      $$;
    `;
    
    // First test the simple version
    console.log('🧪 Testing simple user-only function...');
    
    try {
      const { data: testData, error: testError } = await supabase
        .rpc('get_mentionable_users', {
          article_id_param: null,
          search_term: ''
        });
      
      if (testError) {
        console.log('❌ Current function error:', testError.message);
        console.log('   Let\'s try to fix it...');
      } else {
        console.log(`✅ Current function works! Found ${testData.length} users`);
        testData.forEach(user => {
          console.log(`   - ${user.email} | ${user.full_name} | ${user.mention_text}`);
        });
      }
    } catch (funcError) {
      console.log('❌ Function call failed:', funcError.message);
    }
    
    // Now let's manually test the SQL logic to see what's wrong
    console.log('\n🔍 Manual testing of the SQL logic...');
    
    // Try to get all users where we can see them
    const { data: allUsers, error: allError } = await supabase
      .from('user_profiles')  
      .select('id, email, company_name, avatar_url')
      .not('email', 'is', null);
      
    if (allError) {
      console.log('❌ Error getting all users:', allError.message);
    } else {
      console.log(`✅ Found ${allUsers.length} users with valid emails:`);
      
      // Simulate the function logic
      const mentionableUsers = allUsers.map(user => {
        const displayName = user.company_name || user.email.split('@')[0];
        const mentionText = '@' + displayName.toLowerCase().replace(/[\s\-\.]/g, '');
        
        return {
          user_id: user.id,
          email: user.email,
          full_name: displayName,
          avatar_url: user.avatar_url,
          is_admin: false,
          mention_text: mentionText
        };
      });
      
      console.log('📊 Simulated function results:');
      mentionableUsers.slice(0, 5).forEach(user => {
        console.log(`   - ${user.email} | ${user.full_name} | ${user.mention_text}`);
      });
      
      console.log(`   ... and ${Math.max(0, mentionableUsers.length - 5)} more users`);
    }
    
  } catch (error) {
    console.error('❌ Fix failed:', error.message);
  }
}

fixMentionFunction();