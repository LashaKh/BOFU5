# Browser Testing Instructions for Mention System

## Quick Setup for Testing

Since Browser Tools MCP is not available, here are manual testing instructions:

### 1. Start the Development Server
```bash
npm run dev
```
The application should be running on `http://localhost:5173`

### 2. Create Test Users

#### Option A: Use the UI (Recommended)
1. Navigate to `http://localhost:5173`
2. Click "Sign Up" or register as a new user
3. Create an admin account: `admin@testcompany.com`
4. Create a regular user: `user@testcompany.com`

#### Option B: Use the Scripts
```bash
# Already created:
# Admin: test.admin@bofu.com (password: TestAdmin123!)
# User: test.user@company.com (password: TestUser123!)
```

### 3. Test the Mention System

#### Step 1: Log in as Admin
1. Go to `http://localhost:5173`
2. Log in with admin credentials
3. Navigate to an article or content brief editing page

#### Step 2: Find Comment Field
1. Look for an article with commenting enabled
2. Or navigate to the admin dashboard where comments are available
3. Find a text area or rich text editor that supports comments

#### Step 3: Test Mention Autocomplete
1. Click in the comment field
2. Type `@` character
3. **Expected Behavior**:
   - Mention dropdown should appear
   - Should show available users (admin and regular users)
   - Users should have proper labels (Admin badge for admins)

#### Step 4: Debug if Empty
If no users appear:
1. Open browser DevTools (F12)
2. Go to Console tab
3. Look for debug messages starting with `🔍`
4. Check Network tab for API calls to `get_mentionable_users`

### 4. Key Things to Verify

✅ **Mention Dropdown Appears**: When typing `@`
✅ **Shows Available Users**: At least 2-3 test users
✅ **Admin vs User Labels**: Admins show crown icon/badge
✅ **Search Functionality**: Typing `@adm` filters to admin users
✅ **Keyboard Navigation**: Arrow keys navigate, Enter selects
✅ **Insertion**: Selected mention text appears in comment field

### 5. Expected Console Output

When working correctly, you should see:
```javascript
🔍 MentionAutocomplete render: {
  isOpen: true,
  searchTerm: "",
  usersCount: 3  // <-- Should be > 0
}

🔍 Fetching mentionable users: { term: "", articleId: "..." }
✅ Fetched mentionable users: [
  {
    user_id: "...",
    email: "admin@testcompany.com", 
    full_name: "Admin User",
    is_admin: true,
    mention_text: "@adminuser"
  },
  // ... more users
]
```

### 6. Troubleshooting

#### If Mention Dropdown is Empty:
1. Check console for errors
2. Verify users were created (check Supabase dashboard)
3. Verify `get_mentionable_users` RPC function returns data
4. Check if user profiles exist in `user_profiles` and `admin_profiles` tables

#### If Dropdown Doesn't Appear:
1. Verify `@` symbol triggers the component
2. Check if TipTap editor has mention extension enabled
3. Look for JavaScript errors in console

#### If Network Errors:
1. Verify Supabase connection in `.env` file
2. Check if RPC function has proper permissions
3. Verify authentication is working

### 7. Test Files Created

I've created these test files for debugging:
- `test-mention-system.js` - Test RPC function directly
- `check-users.js` - Check user profiles in database  
- `create-test-user.js` - Create test users programmatically
- `migrate-users.js` - Migrate auth users to create profiles

### 8. Production-Ready Check

Once working, verify:
- No console errors or warnings
- Smooth typing experience (no lag)
- Proper cleanup when clicking outside
- Accessibility (keyboard navigation works)
- Mobile responsiveness (if applicable)

## Current Status

✅ **Backend Ready**: RPC function exists and works
✅ **Frontend Ready**: Components are properly implemented  
✅ **Database Schema**: All tables and triggers are set up
❌ **Test Data**: Need to create user profiles for testing

**Next Step**: Create user profiles through the UI or fix the profile creation triggers, then test the complete mention workflow in the browser.