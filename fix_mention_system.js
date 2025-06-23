import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://nhxjashreguofalhaofj.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5oeGphc2hyZWd1b2ZhbGhhb2ZqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzUwODg0NCwiZXhwIjoyMDU5MDg0ODQ0fQ.EZWUlp5MkaMBohd8VZEf_2qUO8xYz1jofkaAw1ITilQ'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function createMentionFunction() {
  console.log('Creating get_mentionable_users function...')
  
  const { data, error } = await supabase.rpc('exec_sql', {
    sql: `
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
        RETURN QUERY
        WITH user_data AS (
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
          
          SELECT 
            ap.id as user_id,
            ap.email,
            COALESCE(ap.full_name, SPLIT_PART(ap.email, '@', 1)) as full_name,
            ap.avatar_url,
            TRUE as is_admin,
            COALESCE(ap.full_name, SPLIT_PART(ap.email, '@', 1)) as display_name
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
          ud.is_admin DESC,
          LENGTH(ud.display_name) ASC,
          ud.display_name ASC
        LIMIT 20;
      END;
      $$;
    `
  })
  
  if (error) {
    console.error('Error creating function:', error)
    return false
  }
  
  console.log('✓ Function created successfully')
  return true
}

async function createSampleData() {
  console.log('Creating sample user data...')
  
  // First check if any users exist
  const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()
  
  if (authError) {
    console.error('Error fetching auth users:', authError)
    return false
  }
  
  console.log(`Found ${authUsers.users.length} auth users`)
  
  if (authUsers.users.length === 0) {
    console.log('No auth users found, creating sample profiles...')
    
    // Create sample admin profile
    const { error: adminError } = await supabase
      .from('admin_profiles')
      .upsert([
        {
          id: crypto.randomUUID(),
          email: 'admin@test.com',
          full_name: 'Test Admin',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ])
    
    if (adminError) {
      console.error('Error creating admin profile:', adminError)
    } else {
      console.log('✓ Sample admin profile created')
    }
    
    // Create sample user profile
    const { error: userError } = await supabase
      .from('user_profiles')
      .upsert([
        {
          id: crypto.randomUUID(),
          email: 'user@test.com',
          company_name: 'Test Company',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ])
    
    if (userError) {
      console.error('Error creating user profile:', userError)
    } else {
      console.log('✓ Sample user profile created')
    }
  } else {
    console.log('Auth users exist, creating profiles from auth data...')
    
    // Create profiles for existing auth users
    for (const user of authUsers.users) {
      if (user.email?.includes('admin')) {
        const { error } = await supabase
          .from('admin_profiles')
          .upsert([
            {
              id: user.id,
              email: user.email,
              full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Admin User',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }
          ])
        
        if (!error) {
          console.log(`✓ Admin profile created for ${user.email}`)
        }
      } else {
        const { error } = await supabase
          .from('user_profiles')
          .upsert([
            {
              id: user.id,
              email: user.email,
              company_name: user.user_metadata?.company_name || 'Test Company',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }
          ])
        
        if (!error) {
          console.log(`✓ User profile created for ${user.email}`)
        }
      }
    }
  }
  
  return true
}

async function testFunction() {
  console.log('Testing get_mentionable_users function...')
  
  const { data, error } = await supabase.rpc('get_mentionable_users', {
    article_id_param: null,
    search_term: ''
  })
  
  if (error) {
    console.error('Error testing function:', error)
    return false
  }
  
  console.log(`✓ Function test successful! Found ${data.length} mentionable users:`)
  data.forEach(user => {
    console.log(`  - ${user.email} (${user.full_name}) - ${user.mention_text}`)
  })
  
  return true
}

async function main() {
  console.log('🚀 Starting mention system fix...\n')
  
  // Step 1: Create the function
  const functionCreated = await createMentionFunction()
  if (!functionCreated) {
    console.error('❌ Failed to create function')
    return
  }
  
  console.log('')
  
  // Step 2: Create sample data
  const dataCreated = await createSampleData()
  if (!dataCreated) {
    console.error('❌ Failed to create sample data')
    return
  }
  
  console.log('')
  
  // Step 3: Test the function
  const testPassed = await testFunction()
  if (!testPassed) {
    console.error('❌ Function test failed')
    return
  }
  
  console.log('\n🎉 Mention system fix completed successfully!')
  console.log('The mention autocomplete should now work in comment fields.')
}

main().catch(console.error)