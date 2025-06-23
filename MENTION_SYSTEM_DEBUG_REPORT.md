# Mention System Database Issues - Debug Report

## Summary of Issues Found

After thorough investigation of the mention system database issues, I identified several critical problems preventing the @ mention autocomplete from working:

### 1. ❌ **Missing/Broken Function**: `get_mentionable_users`
- **Status**: Function exists but references non-existent table `profiles`
- **Problem**: The original migration references `profiles` table, but actual tables are `user_profiles` and `admin_profiles`
- **Impact**: Function fails with "Could not find the function in schema cache" error

### 2. ❌ **Table Schema Mismatch**
- **user_profiles columns**: `id`, `email`, `avatar_url`, `created_at`, `updated_at`, `company_name`
  - ⚠️ **Missing**: No `name`, `display_name`, or `full_name` field
- **admin_profiles columns**: `id`, `email`, `name`, `avatar_url`, `created_at`, `updated_at`, `role`, `permissions`, `admin_role`
  - ✅ **Has**: `name` field available

### 3. ✅ **Data Availability**
- **user_profiles**: 10 users found with valid emails
- **admin_profiles**: 2 admin users found with valid emails
- All users have proper UUIDs and email addresses

## Root Cause Analysis

The mention system was created with the migration `20250121230000_create_mention_system.sql`, but it assumed a table structure that doesn't match the actual database schema:

```sql
-- Original broken function references non-existent 'profiles' table
FROM profiles p  -- ❌ This table doesn't exist
WHERE p.email IS NOT NULL
```

The actual tables are:
- `user_profiles` (regular users)
- `admin_profiles` (admin users)

## Solution Provided

### 1. **Corrected SQL Migration**
Created `/Users/Lasha/Desktop/BOFU3.0-main/supabase/migrations/20250201000000_fix_get_mentionable_users_function.sql`

This migration:
- ✅ Drops the broken function
- ✅ Creates corrected function using actual table names
- ✅ Handles missing `name` field in `user_profiles` by using email prefix
- ✅ Uses available `name` field in `admin_profiles` with fallback to email prefix
- ✅ Provides backward compatibility with old function signature
- ✅ Grants proper permissions to `authenticated` and `anon` roles

### 2. **Function Signature Fixed**
```sql
-- New working function
CREATE OR REPLACE FUNCTION get_mentionable_users(
  search_term TEXT DEFAULT ''
)
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  display_name TEXT,
  avatar_url TEXT,
  user_type TEXT
)
```

### 3. **Data Source Logic**
```sql
-- Regular users (using email prefix as display name)
SELECT 
  up.id as user_id,
  up.email,
  split_part(up.email, '@', 1) as display_name,  -- Extract username from email
  up.avatar_url,
  'user' as user_type
FROM user_profiles up

UNION ALL

-- Admin users (using name field with email fallback)
SELECT 
  ap.id as user_id,
  ap.email,
  COALESCE(ap.name, split_part(ap.email, '@', 1)) as display_name,
  ap.avatar_url,
  'admin' as user_type
FROM admin_profiles ap
```

## Expected Results After Fix

Once the migration is applied, the mention system should:

1. ✅ Return both regular users and admin users
2. ✅ Show admin users first (prioritized in ORDER BY)
3. ✅ Display proper names (from `admin_profiles.name` or email prefix)
4. ✅ Support search filtering by name or email
5. ✅ Work with both authenticated and anonymous clients
6. ✅ Return up to 20 users per query

## Test Data Available

- **10 regular users** from `user_profiles`
- **2 admin users** from `admin_profiles`
- All users have valid email addresses and UUIDs
- Examples:
  - Regular users: `devoteai@gmail.com`, `test.12@gmail.com`, `lasha.khosht@gmail.com`
  - Admin users: `lashay@bofu.ai`, `admin1@gmail.com`

## Implementation Steps Required

1. **Apply the migration**:
   ```bash
   # Run the migration in Supabase Dashboard or via CLI
   supabase db push
   ```

2. **Or manually execute SQL**:
   Copy the contents of `20250201000000_fix_get_mentionable_users_function.sql` and run in Supabase SQL Editor

3. **Test the function**:
   ```sql
   SELECT * FROM get_mentionable_users('');
   SELECT * FROM get_mentionable_users('test');
   ```

## Files Created

1. `/Users/Lasha/Desktop/BOFU3.0-main/debug_mention_system.js` - Debugging script
2. `/Users/Lasha/Desktop/BOFU3.0-main/fix_mention_function.js` - Fix attempt script  
3. `/Users/Lasha/Desktop/BOFU3.0-main/supabase/migrations/20250201000000_fix_get_mentionable_users_function.sql` - **SOLUTION MIGRATION**

## Next Steps

1. Apply the migration to fix the function
2. Test @ mention autocomplete in the admin interface
3. Verify both regular users and admin users appear in the dropdown
4. Consider adding a `display_name` field to `user_profiles` table for better UX in future updates

---

**Investigation completed successfully** ✅  
**Solution provided and ready for deployment** 🚀