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
        brief_id: null, // Set to null for product approvals since it references content_briefs table
        brief_title: productName, // Store product name in brief_title field
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
    
    // 🔧 HARDCODED CONFIGURATION - TEMPORARY SOLUTION
    const RESEND_API_KEY = "re_NVLwoaTM_PUxwR9fcMoD3jfdCzERYgQKb";
    
    // 📧 TESTING MODE: Using verified email as recipient
    // For production, verify domain at resend.com/domains and use proper FROM email
    const FROM_EMAIL = "noreply@resend.dev";  
    const TEST_MODE_RECIPIENT = "lasha.khosht@gmail.com"; // Your verified email
    
    console.log("🔑 Using hardcoded variables:");
    console.log(`📧 FROM_EMAIL value: ${FROM_EMAIL}`);
    console.log(`🔑 RESEND_API_KEY exists: ${!!RESEND_API_KEY}`);
    console.log(`📧 Sending email via Resend: { to: "${TEST_MODE_RECIPIENT}", from: "${FROM_EMAIL}" }`);
    
    if (!RESEND_API_KEY) {
      console.error('❌ RESEND_API_KEY not configured')
      return false
    }

    const emailBody = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Content Brief Approved - BOFU AI</title>
          <!--[if mso]>
          <noscript>
            <xml>
              <o:OfficeDocumentSettings>
                <o:PixelsPerInch>96</o:PixelsPerInch>
              </o:OfficeDocumentSettings>
            </xml>
          </noscript>
          <![endif]-->
        </head>
        <body style="margin: 0; padding: 0; background-color: #0f0f23; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
          <!-- Email Container -->
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #0f0f23;">
            <tr>
              <td style="padding: 40px 20px;">
                <!-- Main Content Card -->
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f0f23 100%); border-radius: 16px; overflow: hidden; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);">
                  
                  <!-- Header Section -->
                  <tr>
                    <td style="padding: 0; position: relative;">
                      <!-- Yellow Accent Bar -->
                      <div style="height: 6px; background: linear-gradient(90deg, #fbbf24 0%, #f59e0b 50%, #d97706 100%);"></div>
                      
                      <!-- Header Content -->
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                        <tr>
                          <td style="padding: 32px 40px 24px; text-align: center; position: relative;">
                            <!-- Logo/Brand -->
                            <div style="margin-bottom: 24px;">
                              <div style="display: inline-block; padding: 12px 24px; background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%); border-radius: 8px; box-shadow: 0 4px 12px rgba(251, 191, 36, 0.3);">
                                <span style="color: #1a1a2e; font-weight: 700; font-size: 20px; letter-spacing: -0.5px;">BOFU</span>
                                <span style="color: #1a1a2e; font-weight: 400; font-size: 16px; margin-left: 4px;">AI</span>
                              </div>
                            </div>
                            
                            <!-- Success Icon -->
                            <div style="margin-bottom: 20px;">
                              <div style="display: inline-block; width: 64px; height: 64px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 50%; position: relative; box-shadow: 0 8px 20px rgba(16, 185, 129, 0.3);">
                                <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: white; font-size: 28px;">✓</div>
                              </div>
                            </div>
                            
                            <!-- Main Heading -->
                            <h1 style="margin: 0 0 8px; color: #ffffff; font-size: 32px; font-weight: 700; line-height: 1.2; letter-spacing: -0.5px;">Content Brief Approved!</h1>
                            <p style="margin: 0; color: #94a3b8; font-size: 16px; line-height: 1.5;">Great news! A content brief has been successfully approved and is ready for your review.</p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  
                  <!-- Content Section -->
                  <tr>
                    <td style="padding: 0 40px 32px;">
                      <!-- Greeting -->
                      <div style="margin-bottom: 32px;">
                        <p style="margin: 0 0 8px; color: #e2e8f0; font-size: 18px; font-weight: 600;">Hello ${adminName},</p>
                        <p style="margin: 0; color: #94a3b8; font-size: 16px; line-height: 1.6;">We have exciting news to share with you!</p>
                      </div>
                      
                      <!-- Approval Details Card -->
                      <div style="background: linear-gradient(135deg, #1e293b 0%, #334155 100%); border-radius: 12px; padding: 24px; margin-bottom: 32px; border: 1px solid rgba(251, 191, 36, 0.2); position: relative; overflow: hidden;">
                        <!-- Yellow Accent -->
                        <div style="position: absolute; top: 0; left: 0; width: 4px; height: 100%; background: linear-gradient(180deg, #fbbf24 0%, #f59e0b 100%);"></div>
                        
                        <div style="margin-bottom: 16px;">
                          <p style="margin: 0 0 4px; color: #fbbf24; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Approved By</p>
                          <p style="margin: 0; color: #ffffff; font-size: 18px; font-weight: 600;">${userEmail}</p>
                          <p style="margin: 4px 0 0; color: #94a3b8; font-size: 14px;">from <strong style="color: #e2e8f0;">${userCompany}</strong></p>
                        </div>
                        
                        <div style="margin-bottom: 20px;">
                          <p style="margin: 0 0 8px; color: #fbbf24; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Content Brief Title</p>
                          <div style="background: rgba(251, 191, 36, 0.1); border: 1px solid rgba(251, 191, 36, 0.3); border-radius: 8px; padding: 16px;">
                            <p style="margin: 0; color: #ffffff; font-size: 18px; font-weight: 600; line-height: 1.4;">"${productName}"</p>
                          </div>
                        </div>
                        
                        <!-- Timestamp -->
                        <div style="border-top: 1px solid rgba(148, 163, 184, 0.2); padding-top: 16px;">
                          <p style="margin: 0; color: #64748b; font-size: 14px;">
                            <span style="color: #fbbf24;">●</span> Approved on ${new Date().toLocaleDateString('en-US', { 
                              weekday: 'long', 
                              year: 'numeric', 
                              month: 'long', 
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                              timeZoneName: 'short'
                            })}
                          </p>
                        </div>
                      </div>
                      
                      <!-- Call to Action -->
                      <div style="text-align: center; margin-bottom: 32px;">
                        <a href="#" style="display: inline-block; background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%); color: #1a1a2e; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: 600; font-size: 16px; letter-spacing: -0.3px; box-shadow: 0 4px 12px rgba(251, 191, 36, 0.3); transition: all 0.2s ease;">
                          🚀 Review in Admin Dashboard
                        </a>
                        <p style="margin: 12px 0 0; color: #64748b; font-size: 14px;">Click above to view the full content brief and manage approvals</p>
                      </div>
                      
                      <!-- Features Highlight -->
                      <div style="background: linear-gradient(135deg, rgba(251, 191, 36, 0.1) 0%, rgba(245, 158, 11, 0.05) 100%); border-radius: 12px; padding: 24px; margin-bottom: 32px; border: 1px solid rgba(251, 191, 36, 0.2);">
                        <p style="margin: 0 0 16px; color: #fbbf24; font-size: 16px; font-weight: 600;">What's Next?</p>
                        <ul style="margin: 0; padding: 0; list-style: none;">
                          <li style="margin: 0 0 12px; color: #e2e8f0; font-size: 14px; display: flex; align-items: center;">
                            <span style="color: #10b981; margin-right: 8px; font-weight: bold;">✓</span>
                            Review the approved content brief in your dashboard
                          </li>
                          <li style="margin: 0 0 12px; color: #e2e8f0; font-size: 14px; display: flex; align-items: center;">
                            <span style="color: #10b981; margin-right: 8px; font-weight: bold;">✓</span>
                            Assign content creation tasks to your team
                          </li>
                          <li style="margin: 0; color: #e2e8f0; font-size: 14px; display: flex; align-items: center;">
                            <span style="color: #10b981; margin-right: 8px; font-weight: bold;">✓</span>
                            Track progress and monitor performance metrics
                          </li>
                        </ul>
                      </div>
                    </td>
                  </tr>
                  
                  <!-- Footer Section -->
                  <tr>
                    <td style="padding: 0;">
                      <!-- Separator -->
                      <div style="height: 1px; background: linear-gradient(90deg, transparent 0%, rgba(251, 191, 36, 0.3) 50%, transparent 100%); margin: 0 40px 24px;"></div>
                      
                      <div style="padding: 0 40px 40px; text-align: center;">
                        <!-- Social Links -->
                        <div style="margin-bottom: 24px;">
                          <p style="margin: 0 0 12px; color: #64748b; font-size: 14px;">Stay connected with BOFU AI</p>
                          <div style="display: inline-block;">
                            <a href="#" style="display: inline-block; margin: 0 8px; padding: 8px; background: rgba(251, 191, 36, 0.1); border-radius: 6px; text-decoration: none;">
                              <span style="color: #fbbf24; font-size: 16px;">🌐</span>
                            </a>
                            <a href="#" style="display: inline-block; margin: 0 8px; padding: 8px; background: rgba(251, 191, 36, 0.1); border-radius: 6px; text-decoration: none;">
                              <span style="color: #fbbf24; font-size: 16px;">📧</span>
                            </a>
                            <a href="#" style="display: inline-block; margin: 0 8px; padding: 8px; background: rgba(251, 191, 36, 0.1); border-radius: 6px; text-decoration: none;">
                              <span style="color: #fbbf24; font-size: 16px;">📱</span>
                            </a>
                          </div>
                        </div>
                        
                        <!-- Footer Text -->
                        <p style="margin: 0 0 8px; color: #64748b; font-size: 13px; line-height: 1.5;">
                          This is an automated notification from <strong style="color: #fbbf24;">BOFU AI</strong><br>
                          Revolutionizing bottom-of-funnel content creation with artificial intelligence
                        </p>
                        <p style="margin: 0; color: #475569; font-size: 12px;">
                          © 2025 BOFU AI. All rights reserved. | 
                          <a href="#" style="color: #fbbf24; text-decoration: none;">Unsubscribe</a> | 
                          <a href="#" style="color: #fbbf24; text-decoration: none;">Privacy Policy</a>
                        </p>
                      </div>
                    </td>
                  </tr>
                </table>
                
                <!-- Fallback for clients that don't support gradients -->
                <!--[if mso]>
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #1a1a2e; border-radius: 16px;">
                  <tr><td style="padding: 40px; color: #ffffff; font-family: Arial, sans-serif;">
                    <h1 style="color: #fbbf24;">Content Brief Approved!</h1>
                    <p>Hello ${adminName},</p>
                    <p><strong>${userEmail}</strong> from <strong>${userCompany}</strong> has approved:</p>
                    <div style="background-color: #334155; padding: 20px; margin: 20px 0; border-left: 4px solid #fbbf24;">
                      <h3 style="margin: 0; color: #ffffff;">"${productName}"</h3>
                    </div>
                    <p><a href="#" style="background-color: #fbbf24; color: #1a1a2e; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Review in Dashboard</a></p>
                    <p style="color: #94a3b8; font-size: 14px;">© 2025 BOFU AI. All rights reserved.</p>
                  </td></tr>
                </table>
                <![endif]-->
              </td>
            </tr>
          </table>
        </body>
        </html>
    `

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [TEST_MODE_RECIPIENT],
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