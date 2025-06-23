#!/usr/bin/env node

/**
 * Create a test regular user for testing the mention system
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

async function createTestUser() {
  console.log('🔄 Creating test user...');
  
  try {
    const testEmail = 'test.user@company.com';
    const testPassword = 'TestUser123!';
    const companyName = 'Test Company LLC';
    
    // Create regular user account
    const { data, error } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: { 
          company_name: companyName,
          is_admin: false,
          role: 'user'
        }
      }
    });

    if (error) {
      if (error.message.includes('already registered')) {
        console.log('✅ Test user already exists');
      } else {
        throw new Error(`Error creating user: ${error.message}`);
      }
    } else {
      console.log('✅ Test user created successfully!');
      console.log('User ID:', data.user?.id);
      console.log(`You can now log in with ${testEmail} and your password.`);
    }

  } catch (error) {
    console.error('❌ Error creating test user:', error);
  }
}

// Run the creation
createTestUser().then(() => {
  console.log('\n✅ Test user creation completed');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Creation failed:', error);
  process.exit(1);
});