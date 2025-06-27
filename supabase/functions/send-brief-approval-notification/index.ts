import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client with service role key for admin access
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const { briefId, briefTitle, userId } = await req.json()

    if (!briefId || !briefTitle || !userId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: briefId, briefTitle, userId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Processing notification request:', { briefId, briefTitle, userId })

    // Get user profile information
    const { data: userProfile, error: userError } = await supabaseAdmin
      .from('user_profiles')
      .select('id, email, company_name')
      .eq('id', userId)
      .single()

    if (userError || !userProfile) {
      console.error('Error fetching user profile:', userError)
      return new Response(
        JSON.stringify({ error: 'User profile not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('User profile found:', {
      email: userProfile.email,
      company: userProfile.company_name
    })

    // Get all admin IDs (main admin + sub-admins)
    const adminIds = await getTargetAdminIds(supabaseAdmin, userId)
    console.log('Target admin IDs:', adminIds)

    const notifications = []
    const emailResults = []

    // Create notifications for each admin
    for (const adminId of adminIds) {
      try {
        // Get admin details
        const { data: adminProfile, error: adminError } = await supabaseAdmin
          .from('admin_profiles')
          .select('id, email, name')
          .eq('id', adminId)
          .single()

        if (adminError || !adminProfile) {
          console.error('Error fetching admin profile:', adminError)
          continue
        }

        // Create in-app notification
        const notification = await createInAppNotification(supabaseAdmin, {
          adminId,
          briefId,
          briefTitle,
          userEmail: userProfile.email,
          userCompany: userProfile.company_name || 'Unknown Company'
        })

        if (notification) {
          notifications.push(notification)
        }

        // Send email notification
        const emailSent = await sendEmailNotification({
          adminEmail: adminProfile.email,
          adminName: adminProfile.name || 'Admin',
          userEmail: userProfile.email,
          userCompany: userProfile.company_name || 'Unknown Company',
          briefTitle
        })

        emailResults.push({
          adminEmail: adminProfile.email,
          emailSent,
          notification: notification ? 'created' : 'failed'
        })

        console.log(`Admin ${adminProfile.email}:`, {
          inAppNotification: notification ? 'created' : 'failed',
          emailNotification: emailSent ? 'sent' : 'failed'
        })
      } catch (error) {
        console.error(`Error processing admin ${adminId}:`, error)
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Notifications processed',
        notifications: notifications.length,
        emails: emailResults
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in send-brief-approval-notification:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

/**
 * Get target admin IDs (main admin + assigned sub-admins)
 */
async function getTargetAdminIds(supabaseAdmin: any, userId: string): Promise<string[]> {
  try {
    const adminIds: string[] = []

    // Always include main admin (lashay@bofu.ai)
    const { data: mainAdmin } = await supabaseAdmin
      .from('admin_profiles')
      .select('id')
      .eq('email', 'lashay@bofu.ai')
      .single()

    if (mainAdmin) {
      adminIds.push(mainAdmin.id)
      console.log('Added main admin:', mainAdmin.id)
    }

    // Get sub-admins assigned directly to this user
    const { data: assignments } = await supabaseAdmin
      .from('admin_client_assignments')
      .select('admin_id')
      .eq('client_user_id', userId)
      .eq('is_active', true)

    if (assignments) {
      for (const assignment of assignments) {
        if (!adminIds.includes(assignment.admin_id)) {
          adminIds.push(assignment.admin_id)
          console.log('Added sub-admin:', assignment.admin_id)
        }
      }
    }

    console.log('Total target admin IDs:', adminIds)
    return adminIds
  } catch (error) {
    console.error('Error getting target admin IDs:', error)
    return []
  }
}

/**
 * Create in-app notification record
 */
async function createInAppNotification(supabaseAdmin: any, {
  adminId,
  briefId,
  briefTitle,
  userEmail,
  userCompany
}: {
  adminId: string
  briefId: string
  briefTitle: string
  userEmail: string
  userCompany: string
}) {
  try {
    const message = `${userEmail} from ${userCompany} has approved a content brief: "${briefTitle}"`

    const { data, error } = await supabaseAdmin
      .from('brief_approval_notifications')
      .insert({
        admin_id: adminId,
        brief_id: briefId,
        brief_title: briefTitle,
        user_email: userEmail,
        user_company: userCompany,
        message,
        is_read: false
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating in-app notification:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Error in createInAppNotification:', error)
    return null
  }
}

/**
 * Send email notification (placeholder - replace with actual email service)
 */
async function sendEmailNotification({
  adminEmail,
  adminName,
  userEmail,
  userCompany,
  briefTitle
}: {
  adminEmail: string
  adminName: string
  userEmail: string
  userCompany: string
  briefTitle: string
}) {
  try {
    // TODO: Implement actual email sending logic
    // For now, just log the email details
    console.log('Email notification details:', {
      to: adminEmail,
      subject: `Content Brief Approved: ${briefTitle}`,
      content: `Hello ${adminName},\n\n${userEmail} from ${userCompany} has approved a content brief titled "${briefTitle}".\n\nPlease review the approval in the admin dashboard.`
    })
    
    // Return true to simulate successful email sending
    // Replace this with actual email service integration
    return true
  } catch (error) {
    console.error('Error sending email notification:', error)
    return false
  }
} 