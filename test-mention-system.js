#!/usr/bin/env node

/**
 * Test script for the mention system
 * This script tests the get_mentionable_users RPC call directly
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

async function testMentionSystem() {
  console.log('🧪 Testing mention system...');
  console.log('📡 Supabase URL:', supabaseUrl);
  
  try {
    // Test 1: Check if get_mentionable_users RPC exists
    console.log('\n🔍 Test 1: Calling get_mentionable_users RPC...');
    
    const { data, error } = await supabase.rpc('get_mentionable_users', {
      article_id_param: null,
      search_term: ''
    });

    if (error) {
      console.error('❌ RPC call failed:', error);
      console.error('   Error code:', error.code);
      console.error('   Error message:', error.message);
      console.error('   Error details:', error.details);
      
      if (error.code === '42883') {
        console.log('\n💡 This error suggests the RPC function does not exist in the database.');
        console.log('   We need to create the get_mentionable_users function.');
      }
    } else {
      console.log('✅ RPC call successful!');
      console.log('📊 Returned data:', data);
      console.log('📊 Number of mentionable users:', data?.length || 0);
    }

    // Test 2: Check user tables directly
    console.log('\n🔍 Test 2: Checking user tables directly...');
    
    // Check user_profiles table
    const { data: userProfiles, error: userError } = await supabase
      .from('user_profiles')
      .select('id, email, company_name')
      .limit(5);

    if (userError) {
      console.error('❌ Error querying user_profiles:', userError);
    } else {
      console.log('✅ User profiles found:', userProfiles?.length || 0);
      if (userProfiles && userProfiles.length > 0) {
        console.log('   Sample user profile:', userProfiles[0]);
      }
    }

    // Check admin_profiles table
    const { data: adminProfiles, error: adminError } = await supabase
      .from('admin_profiles')
      .select('id, email, name')
      .limit(5);

    if (adminError) {
      console.error('❌ Error querying admin_profiles:', adminError);
    } else {
      console.log('✅ Admin profiles found:', adminProfiles?.length || 0);
      if (adminProfiles && adminProfiles.length > 0) {
        console.log('   Sample admin profile:', adminProfiles[0]);
      }
    }

    // Test 3: Check if comment_mentions table exists
    console.log('\n🔍 Test 3: Checking comment_mentions table...');
    
    const { data: mentions, error: mentionsError } = await supabase
      .from('comment_mentions')
      .select('*')
      .limit(1);

    if (mentionsError) {
      console.error('❌ Error querying comment_mentions:', mentionsError);
    } else {
      console.log('✅ Comment mentions table exists');
      console.log('📊 Sample mentions found:', mentions?.length || 0);
    }

    // Test 4: Test with search term
    console.log('\n🔍 Test 4: Testing with search term "admin"...');
    
    const { data: searchData, error: searchError } = await supabase.rpc('get_mentionable_users', {
      article_id_param: null,
      search_term: 'admin'
    });

    if (searchError) {
      console.error('❌ Search RPC call failed:', searchError);
    } else {
      console.log('✅ Search RPC call successful!');
      console.log('📊 Search results:', searchData?.length || 0);
      if (searchData && searchData.length > 0) {
        console.log('   Sample search result:', searchData[0]);
      }
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the test
testMentionSystem().then(() => {
  console.log('\n✅ Mention system test completed');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});