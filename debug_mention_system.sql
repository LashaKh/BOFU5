-- Debug the mention system by checking if the function works
-- Run this in Supabase SQL editor to test

-- First, check if the function exists
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_name = 'get_mentionable_users';

-- Test the function with sample parameters
SELECT * FROM get_mentionable_users(null, '');

-- Check if user_profiles and admin_profiles tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_name IN ('user_profiles', 'admin_profiles', 'profiles');

-- Check sample data in user_profiles
SELECT id, email, company_name FROM user_profiles LIMIT 5;

-- Check sample data in admin_profiles  
SELECT id, email, full_name FROM admin_profiles LIMIT 5;

-- Check comment_mentions table
SELECT * FROM comment_mentions LIMIT 5;