#!/usr/bin/env node

/**
 * Create test profiles directly for testing the mention system
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

async function createTestProfiles() {
  console.log('🔧 Creating test profiles for mention system...');
  
  try {
    // Create test admin profile with a random UUID
    const adminId = 'aaaaaaaa-bbbb-cccc-dddd-111111111111';
    console.log('👤 Creating test admin profile...');
    
    const { data: adminData, error: adminError } = await supabase
      .from('admin_profiles')
      .insert({
        id: adminId,
        email: 'admin@testcompany.com',
        name: 'Admin User'
      })
      .select();

    if (adminError) {
      console.error('❌ Error creating admin profile:', adminError);
    } else {
      console.log('✅ Admin profile created:', adminData);
    }

    // Create test user profile with a random UUID
    const userId = 'bbbbbbbb-cccc-dddd-eeee-222222222222';
    console.log('👤 Creating test user profile...');
    
    const { data: userData, error: userError } = await supabase
      .from('user_profiles')
      .insert({
        id: userId,
        email: 'user@testcompany.com',
        company_name: 'Test Company'
      })
      .select();

    if (userError) {
      console.error('❌ Error creating user profile:', userError);
    } else {
      console.log('✅ User profile created:', userData);
    }

    // Create another test user
    const user2Id = 'cccccccc-dddd-eeee-ffff-333333333333';
    console.log('👤 Creating second test user profile...');
    
    const { data: user2Data, error: user2Error } = await supabase
      .from('user_profiles')
      .insert({
        id: user2Id,
        email: 'editor@testcompany.com',
        company_name: 'Editor User'
      })
      .select();

    if (user2Error) {
      console.error('❌ Error creating second user profile:', user2Error);
    } else {
      console.log('✅ Second user profile created:', user2Data);
    }

    // Now test the mention system
    console.log('\n🧪 Testing mention system with test profiles...');
    
    const { data: mentionData, error: mentionError } = await supabase.rpc('get_mentionable_users', {
      article_id_param: null,
      search_term: ''
    });

    if (mentionError) {
      console.error('❌ Mention system test failed:', mentionError);
    } else {
      console.log('✅ Mention system test successful!');
      console.log(`📊 Found ${mentionData?.length || 0} mentionable users:`);
      
      if (mentionData && mentionData.length > 0) {
        mentionData.forEach((user, index) => {
          console.log(`   ${index + 1}. ${user.mention_text || user.email} (${user.email}) - ${user.is_admin ? 'Admin' : 'User'}`);
        });
      }
    }

    // Test with search term
    console.log('\n🔍 Testing search with term "admin"...');
    
    const { data: searchData, error: searchError } = await supabase.rpc('get_mentionable_users', {
      article_id_param: null,
      search_term: 'admin'
    });

    if (searchError) {
      console.error('❌ Search test failed:', searchError);
    } else {
      console.log('✅ Search test successful!');
      console.log(`📊 Found ${searchData?.length || 0} users matching "admin":`);
      
      if (searchData && searchData.length > 0) {
        searchData.forEach((user, index) => {
          console.log(`   ${index + 1}. ${user.mention_text || user.email} (${user.email}) - ${user.is_admin ? 'Admin' : 'User'}`);
        });
      }
    }

  } catch (error) {
    console.error('❌ Error creating test profiles:', error);
  }
}

// Run the profile creation
createTestProfiles().then(() => {
  console.log('\n✅ Test profile creation completed');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Profile creation failed:', error);
  process.exit(1);
});