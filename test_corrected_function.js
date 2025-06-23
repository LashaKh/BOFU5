import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://nhxjashreguofalhaofj.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5oeGphc2hyZWd1b2ZhbGhhb2ZqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzUwODg0NCwiZXhwIjoyMDU5MDg0ODQ0fQ.EZWUlp5MkaMBohd8VZEf_2qUO8xYz1jofkaAw1ITilQ'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function manualUserQuery() {
  console.log('=== Manual query to simulate the function ===\n')
  
  // Simulate the function logic manually
  console.log('1. Fetching user_profiles...')
  const { data: users, error: usersError } = await supabase
    .from('user_profiles')
    .select('id, email, company_name, avatar_url')
    .not('email', 'is', null)
  
  if (usersError) {
    console.error('Error fetching users:', usersError)
    return
  }
  
  console.log(`Found ${users.length} regular users`)
  
  console.log('\n2. Fetching admin_profiles...')
  const { data: admins, error: adminsError } = await supabase
    .from('admin_profiles')
    .select('id, email, name, avatar_url')
    .not('email', 'is', null)
  
  if (adminsError) {
    console.error('Error fetching admins:', adminsError)
    return
  }
  
  console.log(`Found ${admins.length} admin users`)
  
  console.log('\n3. Combining and formatting results...')
  
  // Format user data
  const formattedUsers = users.map(user => ({
    user_id: user.id,
    email: user.email,
    full_name: user.company_name || user.email.split('@')[0],
    avatar_url: user.avatar_url,
    is_admin: false,
    mention_text: '@' + (user.company_name || user.email.split('@')[0]).toLowerCase().replace(/[ -.]/g, '')
  }))
  
  // Format admin data
  const formattedAdmins = admins.map(admin => ({
    user_id: admin.id,
    email: admin.email,
    full_name: admin.name || admin.email.split('@')[0],
    avatar_url: admin.avatar_url,
    is_admin: true,
    mention_text: '@' + (admin.name || admin.email.split('@')[0]).toLowerCase().replace(/[ -.]/g, '')
  }))
  
  // Combine and sort (admins first)
  const allUsers = [...formattedAdmins, ...formattedUsers]
    .sort((a, b) => {
      if (a.is_admin && !b.is_admin) return -1
      if (!a.is_admin && b.is_admin) return 1
      return a.full_name.localeCompare(b.full_name)
    })
    .slice(0, 20) // Limit to 20
  
  console.log(`\n✅ Combined result: ${allUsers.length} mentionable users`)
  console.log('\nFirst 10 users:')
  allUsers.slice(0, 10).forEach((user, index) => {
    const adminBadge = user.is_admin ? ' [ADMIN]' : ''
    console.log(`${index + 1}. ${user.email} (${user.full_name})${adminBadge} - ${user.mention_text}`)
  })
  
  return allUsers
}

async function testActualFunction() {
  console.log('\n=== Testing actual function ===')
  
  const { data, error } = await supabase.rpc('get_mentionable_users', {
    article_id_param: null,
    search_term: ''
  })
  
  if (error) {
    console.error('❌ Function error:', error)
    return null
  }
  
  console.log(`✅ Function returned ${data.length} users`)
  if (data.length > 0) {
    console.log('\nFirst 5 results from function:')
    data.slice(0, 5).forEach((user, index) => {
      const adminBadge = user.is_admin ? ' [ADMIN]' : ''
      console.log(`${index + 1}. ${user.email} (${user.full_name})${adminBadge} - ${user.mention_text}`)
    })
  }
  
  return data
}

async function main() {
  console.log('🔍 Testing mention system functionality...\n')
  
  // Test manual simulation
  const manualResults = await manualUserQuery()
  
  // Test actual function
  const functionResults = await testActualFunction()
  
  console.log('\n📊 Summary:')
  console.log(`Manual simulation: ${manualResults ? manualResults.length : 0} users`)
  console.log(`Actual function: ${functionResults ? functionResults.length : 0} users`)
  
  if (functionResults && functionResults.length > 0) {
    console.log('\n🎉 SUCCESS: The mention function is working!')
    console.log('The issue might be in the frontend implementation.')
    console.log('Check if the frontend is calling the function correctly.')
  } else {
    console.log('\n❌ ISSUE: The function is not returning users.')
    console.log('You need to apply the corrected SQL in the Supabase dashboard.')
    console.log('\nSteps to fix:')
    console.log('1. Go to Supabase Dashboard > SQL Editor')
    console.log('2. Run the SQL from CORRECTED_MENTION_FUNCTION.sql')
    console.log('3. Test the function again')
  }
}

main().catch(console.error)