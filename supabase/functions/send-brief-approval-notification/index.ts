import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  console.log('🔄 [HARDCODED VARS] Edge Function started - using direct API keys')
  
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
          console.log('✅ Notification created:', notification.id)
        } else {
          console.error('❌ Failed to create notification for admin:', adminId)
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

    console.log(`Final results: ${notifications.length} notifications created, ${emailResults.length} emails processed`)

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
    const title = `Content Brief Approved: ${briefTitle}`

    console.log('Creating notification with data:', {
      admin_id: adminId,
      brief_id: briefId,
      title,
      brief_title: briefTitle,
      user_email: userEmail,
      user_company: userCompany,
      message
    })

    const { data, error } = await supabaseAdmin
      .from('brief_approval_notifications')
      .insert({
        admin_id: adminId,
        brief_id: briefId,
        title: title,
        brief_title: briefTitle,
        user_email: userEmail,
        user_company: userCompany,
        message,
        notification_type: 'brief_approved',
        is_read: false
      })
      .select()
      .single()

    if (error) {
      console.error('Database error creating in-app notification:', error)
      return null
    }

    console.log('Successfully created notification:', data)
    return data
  } catch (error) {
    console.error('Exception in createInAppNotification:', error)
    return null
  }
}

/**
 * Send email notification using Resend API
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
    // 🔧 EMAIL CONFIGURATION
    const RESEND_API_KEY = "re_NVLwoaTM_PUxwR9fcMoD3jfdCzERYgQKb";
    
    // 🚀 PRODUCTION SETTINGS (uncomment when domain is verified)
    // const FROM_EMAIL = "noreply@notifications.bofu.ai";  
    // const RECIPIENT_EMAIL = adminEmail; // Send to actual admin
    
    // 🧪 TESTING MODE (comment out for production)
    const FROM_EMAIL = "noreply@resend.dev";  
    const RECIPIENT_EMAIL = "lasha.khosht@gmail.com"; // Your verified test email
    
    // 📝 TO SWITCH TO PRODUCTION:
    // 1. Verify your domain shows "Verified" status in Resend dashboard
    // 2. Comment out the 2 TESTING MODE lines above  
    // 3. Uncomment the 2 PRODUCTION SETTINGS lines above
    // 4. Deploy this function to Supabase
    // 5. Test with a content brief approval
    
    console.log("🔑 Using hardcoded variables:");
    console.log(`📧 FROM_EMAIL value: ${FROM_EMAIL}`);
    console.log(`🔑 RESEND_API_KEY exists: ${!!RESEND_API_KEY}`);
    console.log(`📧 Sending email via Resend: { to: "${RECIPIENT_EMAIL}", from: "${FROM_EMAIL}" }`);

    if (!RESEND_API_KEY) {
      console.error('❌ RESEND_API_KEY not configured')
      return false
    }

    const emailData = {
      from: FROM_EMAIL,
      to: RECIPIENT_EMAIL,
      subject: `Content Brief Approved: ${briefTitle}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Content Brief Approved</h2>
          <p>Hello ${adminName},</p>
          <p><strong>${userEmail}</strong> from <strong>${userCompany}</strong> has approved a content brief titled:</p>
          <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin: 0; color: #1f2937;">"${briefTitle}"</h3>
          </div>
          <p>Please review the approval in the admin dashboard.</p>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 14px;">This is an automated notification from BOFU AI.</p>
        </div>
      `
    }

    console.log('📧 Sending email via Resend:', { to: RECIPIENT_EMAIL, from: FROM_EMAIL })

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailData),
    })

    const result = await response.json()
    console.log('📧 Resend API response:', { status: response.status, result })

    if (!response.ok) {
      console.error('❌ Resend API error:', result)
      return false
    }

    console.log('✅ Email sent successfully via Resend:', result.id)
    return true
  } catch (error) {
    console.error('❌ Error sending email notification:', error)
    return false
  }
} 