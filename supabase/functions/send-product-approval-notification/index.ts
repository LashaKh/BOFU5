import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  console.log('🔄 [PRODUCT APPROVAL] Edge Function started - using direct API keys')
  
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

    const { productId, productName, userId } = await req.json()

    if (!productId || !productName || !userId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: productId, productName, userId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Processing product approval notification request:', { productId, productName, userId })

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
    console.log('Target admin IDs for product approval:', adminIds)

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
        const notification = await createInAppProductNotification(supabaseAdmin, {
          adminId,
          productId,
          productName,
          userEmail: userProfile.email,
          userCompany: userProfile.company_name || 'Unknown Company'
        })

        if (notification) {
          notifications.push(notification)
          console.log('✅ Product notification created:', notification.id)
        } else {
          console.error('❌ Failed to create product notification for admin:', adminId)
        }

        // Send email notification
        const emailSent = await sendProductEmailNotification({
          adminEmail: adminProfile.email,
          adminName: adminProfile.name || 'Admin',
          userEmail: userProfile.email,
          userCompany: userProfile.company_name || 'Unknown Company',
          productName
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

    console.log(`Final results: ${notifications.length} product notifications created, ${emailResults.length} emails processed`)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Product approval notifications processed',
        notifications: notifications.length,
        emails: emailResults
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in send-product-approval-notification:', error)
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
      console.log('Added main admin for product approval:', mainAdmin.id)
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
          console.log('Added sub-admin for product approval:', assignment.admin_id)
        }
      }
    }

    console.log('Total target admin IDs for product approval:', adminIds)
    return adminIds
  } catch (error) {
    console.error('Error getting target admin IDs for product approval:', error)
    return []
  }
}

/**
 * Create in-app product notification record
 */
async function createInAppProductNotification(supabaseAdmin: any, {
  adminId,
  productId,
  productName,
  userEmail,
  userCompany
}: {
  adminId: string
  productId: string
  productName: string
  userEmail: string
  userCompany: string
}) {
  try {
    const message = `${userEmail} from ${userCompany} has approved a product card: "${productName}"`

    const { data, error } = await supabaseAdmin
      .from('brief_approval_notifications')
      .insert({
        admin_id: adminId,
        brief_id: productId, // Using existing column for product ID
        brief_title: productName, // Using existing column for product name
        user_email: userEmail,
        user_company: userCompany,
        message,
        notification_type: 'product_approved', // Different type for product approvals
        title: `Product Card Approved: ${productName}`,
        is_read: false
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating in-app product notification:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Error in createInAppProductNotification:', error)
    return null
  }
}

/**
 * Send email notification about product approval
 */
async function sendProductEmailNotification({
  adminEmail,
  adminName,
  userEmail,
  userCompany,
  productName
}: {
  adminEmail: string
  adminName: string
  userEmail: string
  userCompany: string
  productName: string
}) {
  try {
    console.log('🔄 Sending product approval email notification...')
    
    // Using Resend API for email notifications
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
    
    if (!RESEND_API_KEY) {
      console.error('❌ RESEND_API_KEY not found in environment variables')
      return false
    }

    const emailBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
      <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <h2 style="color: #2563eb; margin-bottom: 20px; font-size: 24px;">🎉 Product Card Approved!</h2>
        
        <p style="font-size: 16px; line-height: 1.6; color: #374151; margin-bottom: 15px;">
          Hello ${adminName},
        </p>
        
        <p style="font-size: 16px; line-height: 1.6; color: #374151; margin-bottom: 20px;">
          Great news! A product card has been approved on your platform:
        </p>
        
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #10b981;">
          <h3 style="margin: 0 0 10px 0; color: #059669; font-size: 18px;">Product Details:</h3>
          <p style="margin: 5px 0; color: #374151;"><strong>Product Name:</strong> ${productName}</p>
          <p style="margin: 5px 0; color: #374151;"><strong>Approved by:</strong> ${userEmail}</p>
          <p style="margin: 5px 0; color: #374151;"><strong>Company:</strong> ${userCompany}</p>
        </div>
        
        <p style="font-size: 16px; line-height: 1.6; color: #374151; margin-bottom: 25px;">
          This product card is now available in your admin dashboard for review and management.
        </p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="https://nhxjashreguofalhaofj.supabase.co" 
             style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
            View Admin Dashboard
          </a>
        </div>
        
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 25px 0;">
        
        <p style="font-size: 14px; color: #6b7280; text-align: center; margin: 0;">
          This is an automated notification from BOFU AI Platform.<br>
          If you have any questions, please contact your system administrator.
        </p>
      </div>
    </div>
    `

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'BOFU AI Platform <noreply@bofu.ai>',
        to: [adminEmail],
        subject: `🎉 Product Card Approved: ${productName}`,
        html: emailBody,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ Error sending product email:', response.status, errorText)
      return false
    }

    const result = await response.json()
    console.log('✅ Product approval email sent successfully:', result.id)
    return true

  } catch (error) {
    console.error('❌ Error in sendProductEmailNotification:', error)
    return false
  }
} 