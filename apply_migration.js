import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// ES6 module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testCurrentFunction() {
  console.log('Testing current get_mentionable_users function...');
  
  try {
    // Test the current function
    const { data, error } = await supabase.rpc('get_mentionable_users', {
      article_id_param: null,
      search_term: ''
    });
    
    if (error) {
      console.error('Function error:', error);
      return false;
    }
    
    console.log(`Current function returns ${data.length} users`);
    if (data.length > 0) {
      console.log('Sample users:');
      data.slice(0, 5).forEach(user => {
        console.log(`  - ${user.mention_text} (${user.email}) ${user.is_admin ? '[ADMIN]' : '[USER]'}`);
      });
    }
    
    return data.length > 0;
  } catch (err) {
    console.error('Exception testing function:', err);
    return false;
  }
}

async function testAlternativeFunction() {
  console.log('\nTesting alternative get_all_mentionable_users function...');
  
  try {
    // Test the alternative function
    const { data, error } = await supabase.rpc('get_all_mentionable_users');
    
    if (error) {
      console.error('Alternative function error:', error);
      return false;
    }
    
    console.log(`Alternative function returns ${data.length} users`);
    if (data.length > 0) {
      console.log('Sample users:');
      data.slice(0, 5).forEach(user => {
        console.log(`  - ${user.mention_text} (${user.email}) ${user.is_admin ? '[ADMIN]' : '[USER]'}`);
      });
    }
    
    return data.length > 0;
  } catch (err) {
    console.error('Exception testing alternative function:', err);
    return false;
  }
}

async function checkTableStructures() {
  console.log('\nChecking table structures...');
  
  try {
    // Check user_profiles table
    const { data: userProfiles, error: userError } = await supabase
      .from('user_profiles')
      .select('id, email, company_name, avatar_url')
      .limit(3);
    
    if (userError) {
      console.error('Error querying user_profiles:', userError);
    } else {
      console.log(`Found ${userProfiles.length} user profiles`);
      if (userProfiles.length > 0) {
        console.log('Sample user profile:', userProfiles[0]);
      }
    }
    
    // Check admin_profiles table
    const { data: adminProfiles, error: adminError } = await supabase
      .from('admin_profiles')
      .select('id, email, name, avatar_url')
      .limit(3);
    
    if (adminError) {
      console.error('Error querying admin_profiles:', adminError);
    } else {
      console.log(`Found ${adminProfiles.length} admin profiles`);
      if (adminProfiles.length > 0) {
        console.log('Sample admin profile:', adminProfiles[0]);
      }
    }
    
    // Count total users
    const { count: userCount } = await supabase
      .from('user_profiles')
      .select('*', { count: 'exact', head: true });
    
    const { count: adminCount } = await supabase
      .from('admin_profiles')
      .select('*', { count: 'exact', head: true });
    
    console.log(`Total users: ${userCount} regular users + ${adminCount} admin users = ${userCount + adminCount} total`);
    
    return { userCount, adminCount };
  } catch (err) {
    console.error('Exception checking tables:', err);
    return { userCount: 0, adminCount: 0 };
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('MENTION SYSTEM DIAGNOSTIC AND VERIFICATION');
  console.log('='.repeat(60));
  
  // Check table structures first
  const counts = await checkTableStructures();
  
  // Test the current function
  const currentWorks = await testCurrentFunction();
  
  // Test the alternative function
  const alternativeWorks = await testAlternativeFunction();
  
  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total users in database: ${counts.userCount + counts.adminCount}`);
  console.log(`Main function (get_mentionable_users) working: ${currentWorks ? 'YES' : 'NO'}`);
  console.log(`Alternative function (get_all_mentionable_users) working: ${alternativeWorks ? 'YES' : 'NO'}`);
  
  if (currentWorks) {
    console.log('\n✅ SUCCESS: The mention system is working correctly!');
    console.log('The migration has been applied and the function is returning users.');
  } else if (alternativeWorks) {
    console.log('\n⚠️ PARTIAL SUCCESS: The alternative function works but the main function doesn\'t.');
    console.log('The migration may need to be re-applied.');
  } else {
    console.log('\n❌ ISSUE: Neither function is working properly.');
    console.log('The migration needs to be applied to fix the mention system.');
    
    if (counts.userCount + counts.adminCount > 0) {
      console.log('\nSince users exist in the database, the issue is likely:');
      console.log('1. The migration has not been applied yet');
      console.log('2. The function has the wrong column references (full_name vs name)');
      console.log('\nRecommendation: Apply the migration in /supabase/migrations/20250621133311_fix_mention_system.sql');
    }
  }
}

main().catch(console.error);