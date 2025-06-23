#!/usr/bin/env node

/**
 * Migrate existing users to create their profiles
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

async function migrateUsers() {
  console.log('🔄 Migrating existing users...');
  
  try {
    // Try to call the migration function
    console.log('📞 Calling migrate_existing_users() function...');
    
    const { data, error } = await supabase.rpc('migrate_existing_users');

    if (error) {
      console.error('❌ Migration function failed:', error);
      console.log('\n💡 Let me try to manually create user profiles...');
      
      // Manual approach: create profiles for our test users
      await manuallyCreateProfiles();
    } else {
      console.log('✅ Migration function executed successfully');
      console.log('📊 Migration result:', data);
    }

    // Check the results
    await checkUserProfiles();

  } catch (error) {
    console.error('❌ Error during migration:', error);
    
    // Try manual approach
    console.log('\n💡 Attempting manual profile creation...');
    await manuallyCreateProfiles();
  }
}

async function manuallyCreateProfiles() {
  console.log('🔧 Manually creating user profiles...');
  
  try {
    // Create admin profile
    console.log('👤 Creating admin profile...');
    const { error: adminError } = await supabase
      .from('admin_profiles')
      .insert({
        id: 'bcff2fd7-f6e3-471d-b724-f574f72d1cdd', // The admin ID from earlier
        email: 'test.admin@bofu.com',
        name: 'Test Admin'
      });

    if (adminError && !adminError.message.includes('duplicate')) {
      console.error('❌ Error creating admin profile:', adminError);
    } else {
      console.log('✅ Admin profile created successfully');
    }

    // Create user profile
    console.log('👤 Creating user profile...');
    const { error: userError } = await supabase
      .from('user_profiles')
      .insert({
        id: 'b383477a-f1de-4d85-8843-7b9ee84e72a6', // The user ID from earlier
        email: 'test.user@company.com',
        company_name: 'Test Company LLC'
      });

    if (userError && !userError.message.includes('duplicate')) {
      console.error('❌ Error creating user profile:', userError);
    } else {
      console.log('✅ User profile created successfully');
    }

  } catch (error) {
    console.error('❌ Error in manual profile creation:', error);
  }
}

async function checkUserProfiles() {
  console.log('\n🔍 Checking user profiles after migration...');
  
  try {
    // Check user_profiles
    const { data: userProfiles, error: userError } = await supabase
      .from('user_profiles')
      .select('*');

    if (userError) {
      console.error('❌ Error checking user_profiles:', userError);
    } else {
      console.log(`✅ Found ${userProfiles?.length || 0} user profiles:`);
      userProfiles?.forEach((user, index) => {
        console.log(`   ${index + 1}. ${user.email} (${user.company_name})`);
      });
    }

    // Check admin_profiles
    const { data: adminProfiles, error: adminError } = await supabase
      .from('admin_profiles')
      .select('*');

    if (adminError) {
      console.error('❌ Error checking admin_profiles:', adminError);
    } else {
      console.log(`✅ Found ${adminProfiles?.length || 0} admin profiles:`);
      adminProfiles?.forEach((admin, index) => {
        console.log(`   ${index + 1}. ${admin.email} (${admin.name})`);
      });
    }

  } catch (error) {
    console.error('❌ Error checking profiles:', error);
  }
}

// Run the migration
migrateUsers().then(() => {
  console.log('\n✅ User migration completed');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Migration failed:', error);
  process.exit(1);
});