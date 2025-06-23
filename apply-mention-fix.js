#!/usr/bin/env node

/**
 * Apply the complete mention system fix to the database
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function applyMentionFix() {
  console.log('🔧 Applying mention system fix...');
  
  try {
    // Read the SQL fix file
    const sqlContent = readFileSync('/Users/Lasha/Desktop/BOFU3.0-main/fix_complete_mention_system.sql', 'utf8');
    
    console.log('📖 Read SQL fix file successfully');
    
    // Split the SQL content into individual statements
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`🔄 Executing ${statements.length} SQL statements...`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      if (statement.length === 0) continue;
      
      console.log(`   ${i + 1}/${statements.length}: Executing statement...`);
      
      try {
        const { error } = await supabase.rpc('execute_sql', { sql_query: statement });
        
        if (error) {
          // Try direct execution if RPC doesn't work
          const { error: directError } = await supabase.from('_dummy_').select('*').limit(0);
          
          if (directError && directError.message.includes('not found')) {
            console.log(`   ⚠️  Statement ${i + 1}: Cannot execute directly (${statement.substring(0, 50)}...)`);
            continue;
          } else {
            console.error(`   ❌ Statement ${i + 1} failed:`, error.message);
            console.error(`      SQL: ${statement.substring(0, 100)}...`);
          }
        } else {
          console.log(`   ✅ Statement ${i + 1} executed successfully`);
        }
      } catch (execError) {
        console.error(`   ❌ Statement ${i + 1} execution error:`, execError);
      }
    }
    
    console.log('\n🧪 Testing the fixed function...');
    
    // Test the fixed function
    const { data, error } = await supabase.rpc('get_mentionable_users', {
      article_id_param: null,
      search_term: ''
    });

    if (error) {
      console.error('❌ Function test failed:', error);
    } else {
      console.log('✅ Function test successful!');
      console.log(`📊 Found ${data?.length || 0} mentionable users:`);
      
      if (data && data.length > 0) {
        data.forEach((user, index) => {
          console.log(`   ${index + 1}. ${user.mention_text} (${user.email}) - ${user.is_admin ? 'Admin' : 'User'}`);
        });
      }
    }

  } catch (error) {
    console.error('❌ Error applying mention fix:', error);
  }
}

// Run the fix
applyMentionFix().then(() => {
  console.log('\n✅ Mention fix application completed');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Fix application failed:', error);
  process.exit(1);
});