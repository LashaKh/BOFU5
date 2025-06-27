import { supabase } from './supabase';
import { Resend } from 'resend';

export interface EmailNotification {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

// Initialize Resend instance
let resend: Resend | null = null;

function getResendInstance(): Resend | null {
  if (!resend) {
    const apiKey = process.env.RESEND_API_KEY || process.env.VITE_RESEND_API_KEY;
    if (apiKey) {
      resend = new Resend(apiKey);
    }
  }
  return resend;
}

/**
 * Send email notification using Resend email service
 */
export async function sendEmail(notification: EmailNotification): Promise<boolean> {
  try {
    const resendInstance = getResendInstance();
    const fromEmail = process.env.FROM_EMAIL || process.env.VITE_FROM_EMAIL || 'BOFU AI <notifications@bofu.ai>';
    
    if (!resendInstance) {
      console.warn('Resend API key not configured. Email sending disabled.');
      return false;
    }

    const result = await resendInstance.emails.send({
      from: notification.from || fromEmail,
      to: notification.to,
      subject: notification.subject,
      html: notification.html,
    });

    if (result.error) {
      console.error('Email sending failed:', result.error);
      return false;
    }

    console.log('Email sent successfully:', result.data?.id);
    return true;
    
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
}

/**
 * Generate professional HTML template for brief approval notifications
 */
export function generateBriefApprovalEmailTemplate({
  adminName,
  userEmail,
  userCompany,
  briefTitle,
  approvedAt,
  platformUrl = 'https://app.bofu.ai'
}: {
  adminName: string;
  userEmail: string;
  userCompany: string;
  briefTitle: string;
  approvedAt: string;
  platformUrl?: string;
}): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Content Brief Approved - BOFU AI</title>
    <style>
        /* Reset styles */
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            color: #374151;
            background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
            margin: 0;
            padding: 20px;
        }
        
        .email-container {
            max-width: 600px;
            margin: 0 auto;
            background: #ffffff;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
        }
        
        /* Header with gradient */
        .header {
            background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 50%, #06b6d4 100%);
            padding: 40px 30px;
            text-align: center;
            position: relative;
        }
        
        .header::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: linear-gradient(135deg, rgba(59, 130, 246, 0.9) 0%, rgba(139, 92, 246, 0.9) 50%, rgba(6, 182, 212, 0.9) 100%);
        }
        
        .header-content {
            position: relative;
            z-index: 1;
        }
        
        .logo {
            width: 60px;
            height: 60px;
            background: rgba(255, 255, 255, 0.2);
            border-radius: 50%;
            margin: 0 auto 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.3);
        }
        
        .logo-text {
            font-size: 24px;
            font-weight: bold;
            color: #ffffff;
            text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
        }
        
        .header h1 {
            color: #ffffff;
            font-size: 28px;
            font-weight: 700;
            margin-bottom: 8px;
            text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
        }
        
        .header p {
            color: rgba(255, 255, 255, 0.9);
            font-size: 16px;
            font-weight: 400;
        }
        
        /* Main content */
        .content {
            padding: 40px 30px;
        }
        
        .greeting {
            font-size: 18px;
            color: #1f2937;
            margin-bottom: 24px;
            font-weight: 600;
        }
        
        .notification-card {
            background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
            border-radius: 12px;
            padding: 24px;
            margin: 24px 0;
            border: 1px solid #e2e8f0;
            position: relative;
            overflow: hidden;
        }
        
        .notification-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 4px;
            height: 100%;
            background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
        }
        
        .notification-icon {
            width: 48px;
            height: 48px;
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 16px;
            box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
        }
        
        .check-icon {
            color: #ffffff;
            font-size: 24px;
            font-weight: bold;
        }
        
        .notification-title {
            font-size: 20px;
            font-weight: 700;
            color: #1f2937;
            margin-bottom: 12px;
        }
        
        .brief-details {
            background: #ffffff;
            border-radius: 8px;
            padding: 20px;
            margin: 16px 0;
            border: 1px solid #e5e7eb;
        }
        
        .detail-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px 0;
            border-bottom: 1px solid #f3f4f6;
        }
        
        .detail-row:last-child {
            border-bottom: none;
        }
        
        .detail-label {
            font-weight: 600;
            color: #6b7280;
            font-size: 14px;
        }
        
        .detail-value {
            font-weight: 500;
            color: #1f2937;
            text-align: right;
            max-width: 60%;
            word-break: break-word;
        }
        
        .company-badge {
            background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
            color: #ffffff;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .time-badge {
            background: #f3f4f6;
            color: #6b7280;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 500;
        }
        
        /* Action button */
        .action-section {
            text-align: center;
            margin: 32px 0;
        }
        
        .cta-button {
            display: inline-block;
            background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
            color: #ffffff;
            text-decoration: none;
            padding: 16px 32px;
            border-radius: 12px;
            font-weight: 600;
            font-size: 16px;
            box-shadow: 0 4px 15px rgba(59, 130, 246, 0.4);
            transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        
        .cta-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(59, 130, 246, 0.5);
        }
        
        /* Footer */
        .footer {
            background: #f8fafc;
            padding: 30px;
            text-align: center;
            border-top: 1px solid #e5e7eb;
        }
        
        .footer p {
            color: #6b7280;
            font-size: 14px;
            margin-bottom: 8px;
        }
        
        .footer-links {
            margin: 16px 0;
        }
        
        .footer-link {
            color: #3b82f6;
            text-decoration: none;
            font-size: 14px;
            margin: 0 15px;
            font-weight: 500;
        }
        
        .footer-link:hover {
            text-decoration: underline;
        }
        
        /* Responsive */
        @media (max-width: 600px) {
            body {
                padding: 10px;
            }
            
            .content {
                padding: 30px 20px;
            }
            
            .header {
                padding: 30px 20px;
            }
            
            .header h1 {
                font-size: 24px;
            }
            
            .detail-row {
                flex-direction: column;
                align-items: flex-start;
            }
            
            .detail-value {
                text-align: left;
                max-width: 100%;
                margin-top: 4px;
            }
        }
    </style>
</head>
<body>
    <div class="email-container">
        <!-- Header -->
        <div class="header">
            <div class="header-content">
                <div class="logo">
                    <div class="logo-text">B</div>
                </div>
                <h1>Content Brief Approved</h1>
                <p>Your BOFU AI platform notification</p>
            </div>
        </div>
        
        <!-- Main Content -->
        <div class="content">
            <div class="greeting">
                Hello ${adminName},
            </div>
            
            <p style="color: #4b5563; font-size: 16px; margin-bottom: 24px;">
                A new content brief has been approved and is ready for processing. Here are the details:
            </p>
            
            <!-- Notification Card -->
            <div class="notification-card">
                <div class="notification-icon">
                    <div class="check-icon">✓</div>
                </div>
                <div class="notification-title">Brief Successfully Approved</div>
                
                <div class="brief-details">
                    <div class="detail-row">
                        <span class="detail-label">Client Email</span>
                        <span class="detail-value">${userEmail}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Company</span>
                        <span class="detail-value">
                            <span class="company-badge">${userCompany}</span>
                        </span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Brief Title</span>
                        <span class="detail-value" style="font-weight: 600;">${briefTitle}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Approved At</span>
                        <span class="detail-value">
                            <span class="time-badge">${new Date(approvedAt).toLocaleString()}</span>
                        </span>
                    </div>
                </div>
                
                <p style="color: #6b7280; font-size: 14px; margin-top: 16px; line-height: 1.5;">
                    The content brief has been processed and sent to our content generation system. You can view the full details and track progress in your admin dashboard.
                </p>
            </div>
            
            <!-- Call to Action -->
            <div class="action-section">
                <a href="${platformUrl}/admin" class="cta-button">
                    View in Admin Dashboard →
                </a>
            </div>
            
            <p style="color: #6b7280; font-size: 14px; text-align: center; margin-top: 24px;">
                Need help? Contact our support team or check the documentation for more information.
            </p>
        </div>
        
        <!-- Footer -->
        <div class="footer">
            <p><strong>BOFU AI</strong> - Bottom of Funnel Content Intelligence</p>
            <p>Transforming how businesses create and optimize their content strategy</p>
            
            <div class="footer-links">
                <a href="${platformUrl}" class="footer-link">Dashboard</a>
                <a href="${platformUrl}/support" class="footer-link">Support</a>
                <a href="${platformUrl}/docs" class="footer-link">Documentation</a>
            </div>
            
            <p style="font-size: 12px; color: #9ca3af; margin-top: 16px;">
                This is an automated notification from BOFU AI. Please do not reply to this email.
            </p>
        </div>
    </div>
</body>
</html>
  `.trim();
}

/**
 * Send brief approval email notification to admin
 */
export async function sendBriefApprovalEmailNotification({
  adminEmail,
  adminName,
  userEmail,
  userCompany,
  briefTitle
}: {
  adminEmail: string;
  adminName: string;
  userEmail: string;
  userCompany: string;
  briefTitle: string;
}): Promise<boolean> {
  try {
    const htmlContent = generateBriefApprovalEmailTemplate({
      adminName,
      userEmail,
      userCompany,
      briefTitle,
      approvedAt: new Date().toISOString()
    });

    const emailNotification: EmailNotification = {
      to: adminEmail,
      subject: `📋 Content Brief Approved - ${userCompany}`,
      html: htmlContent
    };

    return await sendEmail(emailNotification);
  } catch (error) {
    console.error('Error sending brief approval email:', error);
    return false;
  }
} 