import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://nhxjashreguofalhaofj.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5oeGphc2hyZWd1b2ZhbGhhb2ZqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzUwODg0NCwiZXhwIjoyMDU5MDg0ODQ0fQ.EZWUlp5MkaMBohd8VZEf_2qUO8xYz1jofkaAw1ITilQ'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkTableStructures() {
  console.log('Checking table structures...\n')
  
  // Check user_profiles structure
  console.log('=== user_profiles structure ===')
  const { data: userProfiles, error: userError } = await supabase
    .from('user_profiles')
    .select('*')
    .limit(1)
  
  if (userError) {
    console.error('Error accessing user_profiles:', userError)
  } else if (userProfiles && userProfiles.length > 0) {
    console.log('Columns in user_profiles:', Object.keys(userProfiles[0]))
    console.log('Sample data:', userProfiles[0])
  }
  
  console.log('')
  
  // Check admin_profiles structure  
  console.log('=== admin_profiles structure ===')
  const { data: adminProfiles, error: adminError } = await supabase
    .from('admin_profiles')
    .select('*')
    .limit(1)
  
  if (adminError) {
    console.error('Error accessing admin_profiles:', adminError)
  } else if (adminProfiles && adminProfiles.length > 0) {
    console.log('Columns in admin_profiles:', Object.keys(adminProfiles[0]))
    console.log('Sample data:', adminProfiles[0])
  } else {
    console.log('admin_profiles table is empty')
  }
  
  console.log('')
  
  // Check all user_profiles
  console.log('=== All user_profiles ===')
  const { data: allUsers, error: allUsersError } = await supabase
    .from('user_profiles')
    .select('id, email, company_name')
  
  if (allUsersError) {
    console.error('Error fetching all users:', allUsersError)
  } else {
    console.log(`Found ${allUsers.length} users:`)
    allUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email} - ${user.company_name} (ID: ${user.id})`)
    })
  }
  
  console.log('')
  
  // Check all admin_profiles
  console.log('=== All admin_profiles ===')
  const { data: allAdmins, error: allAdminsError } = await supabase
    .from('admin_profiles')
    .select('*')
  
  if (allAdminsError) {
    console.error('Error fetching all admins:', allAdminsError)
  } else {
    console.log(`Found ${allAdmins.length} admins:`)
    allAdmins.forEach((admin, index) => {
      console.log(`${index + 1}. ${JSON.stringify(admin)}`)
    })
  }
}

async function testMentionFunction() {
  console.log('\n=== Testing mention function ===')
  
  const { data, error } = await supabase.rpc('get_mentionable_users', {
    article_id_param: null,
    search_term: ''
  })
  
  if (error) {
    console.error('Function error:', error)
  } else {
    console.log(`Function returned ${data.length} results:`)
    data.forEach((user, index) => {
      console.log(`${index + 1}. ${JSON.stringify(user)}`)
    })
  }
}

async function main() {
  await checkTableStructures()
  await testMentionFunction()
}

main().catch(console.error)