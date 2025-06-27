# Email Notification Setup Guide

This guide explains how to set up professional HTML email notifications for brief approvals using Resend.

## Overview

When a user approves a content brief, the system now sends:
1. **In-app notifications** to the admin dashboard 
2. **Professional HTML email notifications** to:
   - The main admin (lashay@bofu.ai)
   - Sub-admins assigned to that specific user's company

## Setup Instructions

### 1. Get Resend API Key

1. Go to [Resend](https://resend.com) and create an account
2. Navigate to [API Keys](https://resend.com/api-keys)
3. Create a new API key for your domain
4. Copy the API key (starts with `re_`)

### 2. Configure Environment Variables

Add these variables to your `.env` file:

```bash
# Email Service Configuration (Resend)
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Email Configuration
FROM_EMAIL=BOFU AI <notifications@bofu.ai>

# Alternative for client-side usage (not recommended for production)
VITE_RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
VITE_FROM_EMAIL=BOFU AI <notifications@bofu.ai>
```

### 3. Domain Verification (Production)

For production use, you'll need to:

1. **Verify your sending domain** in Resend:
   - Go to [Domains](https://resend.com/domains) in Resend dashboard
   - Add your domain (e.g., `bofu.ai`)
   - Follow DNS setup instructions

2. **Update FROM_EMAIL** to use your verified domain:
   ```bash
   FROM_EMAIL=BOFU AI <notifications@bofu.ai>
   ```

## Email Template Features

### Professional Design
- **Modern HTML/CSS** with responsive design
- **Platform branding** using BOFU AI colors and gradients
- **Professional typography** with clean, readable fonts
- **Mobile-responsive** layout that works on all devices

### Visual Elements
- **Gradient header** with platform colors (#3b82f6, #8b5cf6, #06b6d4)
- **Logo circle** with "B" branding
- **Notification cards** with status icons and detailed information
- **Call-to-action button** linking to admin dashboard
- **Professional footer** with platform information

### Content Structure
- **Personalized greeting** using admin name
- **Detailed brief information**:
  - Client email
  - Company name (with branded badge)
  - Brief title
  - Approval timestamp
- **Action button** to view in admin dashboard
- **Professional footer** with platform links

## Notification Logic

### Recipients
1. **Main Admin**: Always receives notifications (lashay@bofu.ai)
2. **Assigned Sub-Admins**: Only sub-admins assigned to the specific user's company

### Timing
- **Immediate**: Emails are sent immediately when a brief is approved
- **Parallel Processing**: In-app and email notifications are sent simultaneously
- **Non-blocking**: Email failures don't prevent brief approval success

### Error Handling
- **Graceful degradation**: If email service is unavailable, approval still succeeds
- **Detailed logging**: Email success/failure is logged for monitoring
- **User feedback**: Users see confirmation that admins were notified

## Email Service Architecture

### Files Modified
- `src/lib/emailService.ts` - Core email service with Resend integration
- `src/lib/briefApprovalNotifications.ts` - Updated notification logic
- `src/components/content/ApproveContentBrief.tsx` - UI integration
- `package.json` - Added Resend dependency

### Key Functions
- `sendEmail()` - Core email sending function using Resend
- `generateBriefApprovalEmailTemplate()` - HTML template generator
- `sendBriefApprovalEmailNotification()` - Brief-specific email function
- `createBriefApprovalNotification()` - Orchestrates both in-app and email notifications

## Development vs Production

### Development
- Emails can be sent to test addresses
- Use test API keys from Resend
- FROM_EMAIL can be any address during testing

### Production
- **Verify sending domain** in Resend (required)
- Use production API keys
- FROM_EMAIL must be from verified domain
- Consider email rate limits and monitoring

## Testing

To test email functionality:

1. **Set up environment variables** as described above
2. **Approve a content brief** as a regular user
3. **Check admin email inbox** for the notification
4. **Verify in-app notifications** appear in admin dashboard

## Troubleshooting

### Email Not Sending
1. Check `RESEND_API_KEY` is set correctly
2. Verify API key has send permissions
3. Check browser console for error messages
4. Ensure `FROM_EMAIL` format is correct

### Domain Issues
1. Verify domain in Resend dashboard
2. Check DNS records are configured
3. Wait for DNS propagation (up to 24 hours)

### Template Issues
1. Test HTML template in email clients
2. Check for CSS compatibility
3. Verify all template variables are provided

## Security Considerations

- **API Keys**: Never expose API keys in client-side code
- **Domain Verification**: Required for production to prevent spoofing
- **Rate Limiting**: Monitor email volume to avoid service limits
- **Error Handling**: Don't expose sensitive error details to users

## Future Enhancements

Potential improvements for the email system:
- **Email preferences** for admins (frequency, types)
- **Digest emails** for multiple notifications
- **Email templates** for other notification types
- **Delivery tracking** and read receipts
- **A/B testing** for email content optimization 