import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CreateUserRequest {
  email: string;
  password: string;
  profile_name: string;
  profile_role: 'admin' | 'manager' | 'editor' | 'viewer';
  profile_avatar_url?: string;
}

serve(async (req) => {
  console.log('[EdgeFunction] Request received - Method:', req.method, 'URL:', req.url)
  console.log('[EdgeFunction] Headers:', Object.fromEntries(req.headers.entries()))
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('[EdgeFunction] Returning CORS preflight response')
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('[EdgeFunction] Starting Edge Function execution')
    
    // Initialize Supabase clients
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    console.log('[EdgeFunction] Environment check - URL exists:', !!supabaseUrl, 'Service key exists:', !!supabaseServiceKey)
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('[EdgeFunction] Missing environment variables')
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Server configuration error: Missing environment variables' 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }
    
    // Regular client for checking current user
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      console.error('[EdgeFunction] Missing authorization header')
      return new Response(
        JSON.stringify({ success: false, error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Extract JWT token
    const token = authHeader.replace('Bearer ', '')
    
    // Verify the JWT token using the service role client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
    const { data: { user: currentUser }, error: userError } = await supabaseAdmin.auth.getUser(token)
    if (userError || !currentUser) {
      console.error('[EdgeFunction] Authentication failed:', userError)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Authentication failed' 
        }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('[EdgeFunction] Authenticated user:', currentUser.email, 'ID:', currentUser.id)

    // Parse request body
    let requestBody: CreateUserRequest
    try {
      requestBody = await req.json()
      console.log('[EdgeFunction] Request body received:', {
        email: requestBody.email,
        profile_name: requestBody.profile_name,
        profile_role: requestBody.profile_role,
        has_password: !!requestBody.password,
        has_avatar: !!requestBody.profile_avatar_url
      })
    } catch (parseError) {
      console.error('[EdgeFunction] Failed to parse request body:', parseError)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid request body - must be valid JSON' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Validate required fields
    const { email, password, profile_name, profile_role, profile_avatar_url } = requestBody
    
    if (!email || !password || !profile_name || !profile_role) {
      console.error('[EdgeFunction] Missing required fields:', {
        email: !!email,
        password: !!password,
        profile_name: !!profile_name,
        profile_role: !!profile_role
      })
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing required fields: email, password, profile_name, and profile_role are required' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      console.error('[EdgeFunction] Invalid email format:', email)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid email format' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Validate password strength
    if (password.length < 6) {
      console.error('[EdgeFunction] Password too short')
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Password must be at least 6 characters long' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Validate role
    const validRoles = ['admin', 'manager', 'editor', 'viewer']
    if (!validRoles.includes(profile_role)) {
      console.error('[EdgeFunction] Invalid role:', profile_role)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Invalid role. Must be one of: ${validRoles.join(', ')}` 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get current user's company profile to determine company_id using service role client
    console.log('[EdgeFunction] Fetching current user profile for company_id...')
    const { data: currentProfile, error: profileError } = await supabaseAdmin
      .from('company_profiles')
      .select('company_id, profile_role')
      .eq('user_id', currentUser.id)
      .eq('is_default', true)
      .single()

    if (profileError) {
      console.error('[EdgeFunction] Failed to get current user profile:', profileError)
      // Try to get any profile for this user
      const { data: anyProfile, error: anyProfileError } = await supabaseAdmin
        .from('company_profiles')
        .select('company_id, profile_role')
        .eq('user_id', currentUser.id)
        .limit(1)
        .single()
        
      if (anyProfileError) {
        console.error('[EdgeFunction] No profile found for user:', anyProfileError)
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Current user has no company profile. Please create a profile first.' 
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }
      
      currentProfile = anyProfile
    }

    const company_id = currentProfile?.company_id
    if (!company_id) {
      console.error('[EdgeFunction] No company_id found in user profile')
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Current user profile missing company_id' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('[EdgeFunction] Found company_id:', company_id)

    // Check if current user has permission to create users
    const currentUserRole = currentProfile?.profile_role
    if (!['admin', 'manager'].includes(currentUserRole || '')) {
      console.error('[EdgeFunction] Insufficient permissions:', currentUserRole)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Only admin and manager roles can create new users' 
        }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('[EdgeFunction] Permission check passed for role:', currentUserRole)

    // Check if email already exists
    console.log('[EdgeFunction] Checking if email already exists...')
    const { data: existingUser, error: existingUserError } = await supabaseAdmin.auth.admin.getUserByEmail(email)
    
    if (existingUser?.user) {
      console.error('[EdgeFunction] Email already exists:', email)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'A user with this email already exists' 
        }),
        { 
          status: 409, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Create new user in auth
    console.log('[EdgeFunction] Creating new auth user...')
    const { data: newUserData, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        created_by: currentUser.id,
        company_id: company_id,
        profile_name: profile_name
      }
    })

    if (createUserError || !newUserData.user) {
      console.error('[EdgeFunction] Failed to create auth user:', createUserError)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Failed to create user: ${createUserError?.message || 'Unknown error'}` 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const newUserId = newUserData.user.id
    console.log('[EdgeFunction] Created auth user with ID:', newUserId)

    // Define default permissions for the role
    const defaultPermissions = {
      admin: {
        canCreateContent: true,
        canEditContent: true,
        canDeleteContent: true,
        canManageUsers: true,
        canViewAnalytics: true,
        canExportData: true
      },
      manager: {
        canCreateContent: true,
        canEditContent: true,
        canDeleteContent: false,
        canManageUsers: false,
        canViewAnalytics: true,
        canExportData: true
      },
      editor: {
        canCreateContent: true,
        canEditContent: true,
        canDeleteContent: false,
        canManageUsers: false,
        canViewAnalytics: false,
        canExportData: false
      },
      viewer: {
        canCreateContent: false,
        canEditContent: false,
        canDeleteContent: false,
        canManageUsers: false,
        canViewAnalytics: false,
        canExportData: false
      }
    }

    // Create company profile
    console.log('[EdgeFunction] Creating company profile...')
    const { data: companyProfile, error: profileCreateError } = await supabaseAdmin
      .from('company_profiles')
      .insert({
        company_id: company_id,
        user_id: newUserId,
        profile_name: profile_name,
        profile_role: profile_role,
        profile_avatar_url: profile_avatar_url || null,
        profile_permissions: defaultPermissions[profile_role],
        is_default: true, // First profile for this user is default
        is_active: true
      })
      .select()
      .single()

    if (profileCreateError) {
      console.error('[EdgeFunction] Failed to create company profile:', profileCreateError)
      
      // Clean up - delete the auth user if profile creation failed
      console.log('[EdgeFunction] Cleaning up auth user due to profile creation failure...')
      await supabaseAdmin.auth.admin.deleteUser(newUserId)
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Failed to create user profile: ${profileCreateError.message}` 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('[EdgeFunction] Successfully created company profile:', companyProfile?.id)

    // Create initial user profile session
    console.log('[EdgeFunction] Creating initial profile session...')
    const { error: sessionError } = await supabaseAdmin
      .from('user_profile_sessions')
      .insert({
        user_id: newUserId,
        profile_id: companyProfile?.id,
        is_active: true,
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
      })

    if (sessionError) {
      console.warn('[EdgeFunction] Failed to create initial session (non-critical):', sessionError)
      // Don't fail the entire operation for session creation
    }

    console.log('[EdgeFunction] Company user creation completed successfully')

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          user: {
            id: newUserId,
            email: email
          },
          companyProfile: companyProfile
        }
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('[EdgeFunction] Unexpected error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: `Internal server error: ${error.message}` 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
}) 