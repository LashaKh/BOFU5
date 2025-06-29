// ============================================================================
// PRODUCTION EMAIL CONFIGURATION EXAMPLE
// File: supabase/functions/send-brief-approval-notification/index.ts
// ============================================================================

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
    
    // 🚀 PRODUCTION SETTINGS (ACTIVE - domain verified)
    const FROM_EMAIL = "noreply@notifications.yourdomain.com";  // ← Update this
    const RECIPIENT_EMAIL = adminEmail; // Send to actual admin
    
    // 🧪 TESTING MODE (DISABLED for production)
    // const FROM_EMAIL = "noreply@resend.dev";  
    // const RECIPIENT_EMAIL = "your-test@gmail.com";
    
    console.log("🚀 PRODUCTION MODE - Email Configuration:");
    console.log(`📧 FROM_EMAIL: ${FROM_EMAIL}`);
    console.log(`📧 TO_EMAIL: ${RECIPIENT_EMAIL}`);
    console.log(`🔑 RESEND_API_KEY: ${!!RESEND_API_KEY ? 'Configured' : 'Missing'}`);

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
          <p style="color: #6b7280; font-size: 14px;">
            This is an automated notification from Your Company Name.
          </p>
        </div>
      `
    }

    console.log('📧 Sending production email via Resend...')

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

    console.log('✅ Production email sent successfully:', result.id)
    return true
  } catch (error) {
    console.error('❌ Error sending production email:', error)
    return false
  }
}

// ============================================================================
// DEPLOYMENT CHECKLIST
// ============================================================================

/*
✅ BEFORE DEPLOYING TO PRODUCTION:

1. Domain Verification:
   - Resend dashboard shows "Verified" status
   - All DNS records propagated (check with nslookup)
   - Test email can be sent from Resend dashboard

2. Configuration Update:
   - Update FROM_EMAIL to your verified domain
   - Ensure RECIPIENT_EMAIL = adminEmail (not test email)
   - Test configuration in development first

3. Deployment:
   - Deploy Edge Function to Supabase
   - Test with actual content brief approval
   - Monitor Supabase function logs
   - Verify email delivery to admin inboxes

4. Monitoring:
   - Check Resend dashboard for email logs
   - Monitor delivery rates and bounces
   - Set up alerts for failed deliveries
*/ 