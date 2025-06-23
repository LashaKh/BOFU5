#!/usr/bin/env node

/**
 * Check if there are any users in the database
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkUsers() {
  console.log('🔍 Checking for users in the database...');
  
  try {
    // Check auth.users (if accessible)
    console.log('\n📋 Checking user_profiles table:');
    const { data: userProfiles, error: userError } = await supabase
      .from('user_profiles')
      .select('*');

    if (userError) {
      console.error('❌ Error querying user_profiles:', userError);
    } else {
      console.log(`✅ Found ${userProfiles?.length || 0} user profiles`);
      if (userProfiles && userProfiles.length > 0) {
        userProfiles.forEach((user, index) => {
          console.log(`   ${index + 1}. ID: ${user.id}, Email: ${user.email}, Company: ${user.company_name || 'N/A'}`);
        });
      }
    }

    console.log('\n📋 Checking admin_profiles table:');
    const { data: adminProfiles, error: adminError } = await supabase
      .from('admin_profiles')
      .select('*');

    if (adminError) {
      console.error('❌ Error querying admin_profiles:', adminError);
    } else {
      console.log(`✅ Found ${adminProfiles?.length || 0} admin profiles`);
      if (adminProfiles && adminProfiles.length > 0) {
        adminProfiles.forEach((admin, index) => {
          console.log(`   ${index + 1}. ID: ${admin.id}, Email: ${admin.email}, Name: ${admin.name || 'N/A'}`);
        });
      }
    }

    // Try to check the RPC function implementation
    console.log('\n🔍 Testing RPC function with debug info...');
    const { data: rpcData, error: rpcError } = await supabase.rpc('get_mentionable_users', {
      article_id_param: null,
      search_term: ''
    });

    if (rpcError) {
      console.error('❌ RPC Error:', rpcError);
    } else {
      console.log('✅ RPC function returned:', rpcData);
    }

    // Check if we can create a test user profile
    console.log('\n💭 Summary:');
    const totalUsers = (userProfiles?.length || 0) + (adminProfiles?.length || 0);
    console.log(`   Total users in database: ${totalUsers}`);
    
    if (totalUsers === 0) {
      console.log('❌ No users found in database. This explains why the mention system shows no users.');
      console.log('💡 Solution: Create some user accounts to test the mention system.');
      console.log('   You can:');
      console.log('   1. Sign up through the application UI');
      console.log('   2. Run the create-admin.js script to create an admin user');
      console.log('   3. Use Supabase dashboard to manually create users');
    } else {
      console.log('✅ Users exist in database, but RPC is not returning them.');
      console.log('💡 This suggests an issue with the get_mentionable_users RPC function logic.');
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the check
checkUsers().then(() => {
  console.log('\n✅ User check completed');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Check failed:', error);
  process.exit(1);
});