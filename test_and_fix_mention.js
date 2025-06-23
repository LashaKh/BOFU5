import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://nhxjashreguofalhaofj.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5oeGphc2hyZWd1b2ZhbGhhb2ZqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzUwODg0NCwiZXhwIjoyMDU5MDg0ODQ0fQ.EZWUlp5MkaMBohd8VZEf_2qUO8xYz1jofkaAw1ITilQ'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function testCurrentFunction() {
  console.log('Testing current get_mentionable_users function...')
  
  try {
    const { data, error } = await supabase.rpc('get_mentionable_users', {
      article_id_param: null,
      search_term: ''
    })
    
    if (error) {
      console.error('❌ Current function has errors:', error)
      return false
    }
    
    console.log(`✓ Function exists and returned ${data.length} users`)
    data.forEach(user => {
      console.log(`  - ${user.email} (${user.full_name})`)
    })
    return true
  } catch (err) {
    console.error('❌ Function does not exist or has errors:', err)
    return false
  }
}

async function checkTables() {
  console.log('Checking user tables...')
  
  // Check user_profiles
  const { data: userProfiles, error: userError } = await supabase
    .from('user_profiles')
    .select('id, email, company_name')
    .limit(5)
  
  if (userError) {
    console.error('❌ Error accessing user_profiles:', userError)
  } else {
    console.log(`✓ user_profiles table accessible, ${userProfiles.length} records found`)
    userProfiles.forEach(user => {
      console.log(`  - ${user.email} (${user.company_name})`)
    })
  }
  
  // Check admin_profiles
  const { data: adminProfiles, error: adminError } = await supabase
    .from('admin_profiles')
    .select('id, email, full_name')
    .limit(5)
  
  if (adminError) {
    console.error('❌ Error accessing admin_profiles:', adminError)
  } else {
    console.log(`✓ admin_profiles table accessible, ${adminProfiles.length} records found`)
    adminProfiles.forEach(admin => {
      console.log(`  - ${admin.email} (${admin.full_name})`)
    })
  }
  
  return { userProfiles, adminProfiles }
}

async function createSampleData() {
  console.log('Creating sample data...')
  
  // Create sample admin
  const { data: adminData, error: adminError } = await supabase
    .from('admin_profiles')
    .upsert([
      {
        id: '550e8400-e29b-41d4-a716-446655440001',
        email: 'admin@bofu.ai',
        full_name: 'Test Admin User',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ])
    .select()
  
  if (adminError) {
    console.error('Error creating admin:', adminError)
  } else {
    console.log('✓ Sample admin created: admin@bofu.ai')
  }
  
  // Create sample user
  const { data: userData, error: userError } = await supabase
    .from('user_profiles')
    .upsert([
      {
        id: '550e8400-e29b-41d4-a716-446655440002',
        email: 'user@bofu.ai',
        company_name: 'BOFU Test Company',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ])
    .select()
  
  if (userError) {
    console.error('Error creating user:', userError)
  } else {
    console.log('✓ Sample user created: user@bofu.ai')
  }
  
  // Create another user
  const { data: userData2, error: userError2 } = await supabase
    .from('user_profiles')
    .upsert([
      {
        id: '550e8400-e29b-41d4-a716-446655440003',
        email: 'editor@bofu.ai',
        company_name: 'BOFU Editor Corp',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ])
    .select()
  
  if (userError2) {
    console.error('Error creating editor:', userError2)
  } else {
    console.log('✓ Sample editor created: editor@bofu.ai')
  }
}

async function testAgain() {
  console.log('Testing function again after creating sample data...')
  
  const { data, error } = await supabase.rpc('get_mentionable_users', {
    article_id_param: null,
    search_term: ''
  })
  
  if (error) {
    console.error('❌ Function still has errors:', error)
    return false
  }
  
  console.log(`✓ Function now returns ${data.length} users:`)
  data.forEach(user => {
    console.log(`  - ${user.email} (${user.full_name}) - ${user.mention_text}`)
  })
  
  return true
}

async function main() {
  console.log('🔍 Diagnosing mention system...\n')
  
  // Test current function
  const functionWorks = await testCurrentFunction()
  console.log('')
  
  // Check tables
  const { userProfiles, adminProfiles } = await checkTables()
  console.log('')
  
  // If function works but returns no users, or doesn't work, create sample data
  if (!functionWorks || (userProfiles && userProfiles.length === 0 && adminProfiles && adminProfiles.length === 0)) {
    await createSampleData()
    console.log('')
    
    // Test again
    await testAgain()
  }
  
  console.log('\n🎯 Diagnosis complete!')
  console.log('If the function is working and returns users, the mention system should work.')
  console.log('If not, you may need to manually recreate the function in the Supabase dashboard.')
}

main().catch(console.error)