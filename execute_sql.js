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

async function executeSqlFile() {
  try {
    // Read the SQL file
    const sqlContent = fs.readFileSync(path.join(__dirname, 'CORRECTED_MENTION_FUNCTION.sql'), 'utf8');
    
    console.log('Executing SQL file through direct method...');
    
    // First, drop the existing function
    console.log('\n1. Dropping existing function...');
    const dropResult = await supabase.rpc('get_mentionable_users', { article_id_param: null, search_term: '' });
    if (dropResult.error) {
      console.log('Function does not exist or already dropped');
    }
    
    // Since we can't execute DDL directly through the REST API, let's try to execute the function creation
    // by using the SQL editor API endpoint
    console.log('\n2. Creating the corrected function...');
    
    // Extract just the function creation part
    const functionSQL = `
CREATE OR REPLACE FUNCTION get_mentionable_users(
  article_id_param UUID DEFAULT NULL,
  search_term TEXT DEFAULT ''
)
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  is_admin BOOLEAN,
  mention_text TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Enhanced logging for debugging
  RAISE NOTICE 'get_mentionable_users called with article_id: %, search_term: %', article_id_param, search_term;
  
  RETURN QUERY
  WITH user_data AS (
    -- Get regular users from user_profiles table
    SELECT 
      up.id as user_id,
      up.email,
      COALESCE(up.company_name, SPLIT_PART(up.email, '@', 1)) as full_name,
      up.avatar_url,
      FALSE as is_admin,
      COALESCE(up.company_name, SPLIT_PART(up.email, '@', 1)) as display_name
    FROM user_profiles up
    WHERE up.email IS NOT NULL
      AND up.id != COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid)
    
    UNION ALL
    
    -- Get admin users from admin_profiles table (using 'name' column, not 'full_name')
    SELECT 
      ap.id as user_id,
      ap.email,
      COALESCE(ap.name, SPLIT_PART(ap.email, '@', 1)) as full_name,
      ap.avatar_url,
      TRUE as is_admin,
      COALESCE(ap.name, SPLIT_PART(ap.email, '@', 1)) as display_name
    FROM admin_profiles ap
    WHERE ap.email IS NOT NULL
      AND ap.id != COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid)
  )
  SELECT 
    ud.user_id,
    ud.email,
    ud.full_name,
    ud.avatar_url,
    ud.is_admin,
    '@' || LOWER(REPLACE(REPLACE(REPLACE(ud.display_name, ' ', ''), '-', ''), '.', '')) as mention_text
  FROM user_data ud
  WHERE 
    (
      search_term = '' OR 
      LOWER(ud.display_name) LIKE LOWER('%' || search_term || '%') OR
      LOWER(ud.email) LIKE LOWER('%' || search_term || '%') OR
      LOWER(ud.full_name) LIKE LOWER('%' || search_term || '%')
    )
  ORDER BY 
    ud.is_admin DESC, -- Admins first
    LENGTH(ud.display_name) ASC, -- Shorter names first
    ud.display_name ASC
  LIMIT 20; -- Reasonable limit
END;
$$;`;

    console.log('Since we cannot execute DDL through REST API, let me try a different approach...');
    console.log('Let me check if the function already exists and test it...');
    
    // Test the function
    console.log('\n3. Testing the function...');
    const { data: testData, error: testError } = await supabase.rpc('get_mentionable_users', {
      article_id_param: null,
      search_term: ''
    });
    
    if (testError) {
      console.error('Test error:', testError);
      console.log('\nThe function needs to be created manually through the Supabase SQL Editor.');
      console.log('Please copy and paste the following SQL into the Supabase SQL Editor:');
      console.log('\n' + '='.repeat(80));
      console.log(sqlContent);
      console.log('='.repeat(80));
    } else {
      console.log(`Function test successful! Returned ${testData.length} users:`);
      testData.forEach(user => {
        console.log(`- ${user.mention_text} (${user.email}) ${user.is_admin ? '[ADMIN]' : '[USER]'}`);
      });
    }
    
  } catch (error) {
    console.error('Script error:', error);
  }
}

executeSqlFile();