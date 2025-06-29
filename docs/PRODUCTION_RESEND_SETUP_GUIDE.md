# 🚀 **Production Resend Email System Setup Guide**

Complete documentation for setting up professional email notifications with your own domain.

---

## 📋 **PREREQUISITES**

- ✅ Domain purchased and owned by you (e.g., `bofu.ai`, `mycompany.com`)
- ✅ DNS management access (usually through your domain registrar)
- ✅ Resend account with API key
- ✅ Current Edge Function working in test mode

---

## 🎯 **STEP 1: DOMAIN STRATEGY**

### **Choose Your Email Subdomain**
Based on [Resend best practices](https://resend.com/docs/knowledge-base/is-it-better-to-send-emails-from-a-subdomain-or-the-root-domain):

**Recommended Options:**
```
notifications.yourdomain.com  ✅ (Professional)
send.yourdomain.com          ✅ (Clean)  
mail.yourdomain.com          ✅ (Traditional)
noreply.yourdomain.com       ✅ (Clear intent)
```

**Example with `bofu.ai`:**
- Email domain: `notifications.bofu.ai`
- From address: `noreply@notifications.bofu.ai`
- Website: Keep at `bofu.netlify.app` or point to `bofu.ai`

---

## 🔧 **STEP 2: RESEND DOMAIN SETUP**

### **2.1 Add Domain to Resend**
1. **Login**: [resend.com/domains](https://resend.com/domains)
2. **Click**: "Add Domain" 
3. **Enter**: `notifications.yourdomain.com`
4. **Region**: Select `us-east-1` (US) or `eu-west-1` (Europe)
5. **Click**: "Add Domain"

### **2.2 Copy DNS Records**
Resend will generate 3 DNS records:

```bash
# Example Records (yours will be different)
MX Record:
  Name: send
  Value: feedback-smtp.us-east-1.amazonses.com
  Priority: 10

TXT SPF Record:  
  Name: send
  Value: "v=spf1 include:amazonses.com ~all"

TXT DKIM Record:
  Name: resend._domainkey
  Value: p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQ... (long string)
```

---

## 🌐 **STEP 3: DNS CONFIGURATION**

### **3.1 Identify Your DNS Provider**
```bash
# Check who manages your domain's DNS
nslookup -type=NS yourdomain.com
```

**Common Providers:**
- **Namecheap**: `registrar-servers.com`
- **Cloudflare**: `cloudflare.com`  
- **GoDaddy**: `domaincontrol.com`
- **Vercel**: `vercel-dns.com`

### **3.2 Provider-Specific Setup**

#### **For Namecheap** ([Full Guide](https://resend.com/docs/knowledge-base/namecheap))
1. **Login** → Domain List → **Manage** → **Advanced DNS**

2. **Add MX Record** (Mail Settings section):
   ```
   Type: MX Record
   Host: send
   Value: [Copy from Resend]
   Priority: 10
   TTL: Automatic
   ```

3. **Add TXT Records** (Host Records section):
   ```
   # SPF Record
   Type: TXT Record  
   Host: send
   Value: [Copy SPF value from Resend]
   
   # DKIM Record  
   Type: TXT Record
   Host: resend._domainkey
   Value: [Copy DKIM value from Resend]
   ```

#### **For Cloudflare** ([Full Guide](https://resend.com/docs/knowledge-base/cloudflare))
1. **Login** → Select Domain → **DNS** → **Records**

2. **Add Records**:
   ```
   # MX Record
   Type: MX
   Name: send  
   Mail Server: [Copy from Resend]
   Priority: 10
   
   # TXT SPF Record
   Type: TXT
   Name: send
   Content: [Copy SPF from Resend]
   
   # TXT DKIM Record  
   Type: TXT
   Name: resend._domainkey
   Content: [Copy DKIM from Resend]
   Proxy Status: DNS Only (important!)
   ```

#### **For Vercel** ([Full Guide](https://resend.com/docs/knowledge-base/vercel))
1. **Vercel Dashboard** → **Domains** → Select your domain

2. **Add Records** (omit domain suffix):
   ```
   # MX Record
   Type: MX
   Name: send
   Value: [Copy from Resend]
   Priority: 10
   
   # TXT Records
   Type: TXT  
   Name: send
   Value: [Copy SPF from Resend]
   
   Type: TXT
   Name: resend._domainkey  
   Value: [Copy DKIM from Resend]
   ```

---

## ✅ **STEP 4: VERIFICATION**

### **4.1 DNS Propagation Check**
```bash
# Check if records are live (replace with your domain)
nslookup -type=MX send.notifications.yourdomain.com
nslookup -type=TXT send.notifications.yourdomain.com  
nslookup -type=TXT resend._domainkey.notifications.yourdomain.com
```

### **4.2 Web-Based Verification**
- **Tool**: [dns.email](https://dns.email)
- **Check**: All 3 record types for your domain
- **Expect**: Values matching exactly what Resend provided

### **4.3 Resend Verification**
1. **Resend Dashboard** → **Domains** → Your domain
2. **Click**: "Verify DNS Records"  
3. **Wait**: 15 minutes to 2 hours for verification
4. **Status**: Should change to "Verified" ✅

### **4.4 Troubleshooting**
If verification fails, check:
- ✅ All 3 records added correctly
- ✅ No extra quotes or spaces in values
- ✅ Records added to correct DNS provider
- ✅ 24+ hours elapsed for propagation

**Common Issues:**
- **Auto-appending domains**: Add trailing period (`.`) to MX values
- **Wrong location**: Ensure records on correct DNS provider
- **Cloudflare**: Set DKIM record to "DNS Only"

---

## 🔄 **STEP 5: PRODUCTION EDGE FUNCTION UPDATE**

### **5.1 Configuration Update**

Update your Edge Function (`supabase/functions/send-brief-approval-notification/index.ts`):

```typescript
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
```

### **5.2 Configuration Checklist**
```diff
// Update these 2 lines in your Edge Function:
- const FROM_EMAIL = "noreply@resend.dev";  
- const RECIPIENT_EMAIL = "lasha.khosht@gmail.com";

+ const FROM_EMAIL = "noreply@notifications.yourdomain.com";  
+ const RECIPIENT_EMAIL = adminEmail; // Send to actual admin
```

---

## 🚀 **STEP 6: DEPLOYMENT**

### **6.1 Deploy Edge Function**

**Option A: Supabase Dashboard**
1. **Login**: [supabase.com](https://supabase.com)
2. **Project** → **Edge Functions** → `send-brief-approval-notification`
3. **Copy updated code** from your local file
4. **Deploy** the function

**Option B: Supabase CLI**
```bash
# Deploy via CLI (if working)
supabase functions deploy send-brief-approval-notification
```

### **6.2 Environment Variables** (Optional Enhancement)
For better security, move API keys to environment variables:

```typescript
// In Edge Function
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') || 'noreply@notifications.yourdomain.com';
```

**Set in Supabase:**
1. **Project Settings** → **Edge Functions** → **Environment Variables**
2. **Add**:
   ```
   RESEND_API_KEY = re_NVLwoaTM_PUxwR9fcMoD3jfdCzERYgQKb
   FROM_EMAIL = noreply@notifications.yourdomain.com
   ```

---

## 🧪 **STEP 7: TESTING & VALIDATION**

### **7.1 Pre-Production Test**
```bash
# Test DNS records are working
dig MX send.notifications.yourdomain.com
dig TXT send.notifications.yourdomain.com
dig TXT resend._domainkey.notifications.yourdomain.com
```

### **7.2 Resend Dashboard Test**
1. **Resend** → **Emails** → **Send Test Email**
2. **From**: `noreply@notifications.yourdomain.com`
3. **To**: Your email address
4. **Verify**: Email delivers successfully

### **7.3 Application Test**
1. **Approve a content brief** in your application
2. **Check Supabase logs**: Edge Function executes successfully
3. **Check admin email**: Notification received
4. **Check Resend logs**: Email shows as "delivered"

### **7.4 Test Checklist**
```
✅ Domain shows "Verified" in Resend
✅ Test email sends from Resend dashboard  
✅ Edge Function deploys without errors
✅ Content brief approval triggers notification
✅ Admin receives email with correct FROM address
✅ Email content displays properly
✅ Multiple admins receive notifications (if applicable)
```

---

## 📊 **STEP 8: MONITORING & MAINTENANCE**

### **8.1 Resend Monitoring**
**Dashboard Metrics:**
- **Emails** → Monitor delivery rates
- **Logs** → Check for bounces/failures
- **Analytics** → Track open rates (if enabled)

### **8.2 Supabase Monitoring**
**Edge Function Logs:**
- **Functions** → `send-brief-approval-notification` → **Logs**
- Monitor for errors and execution times
- Set up alerts for function failures

### **8.3 Performance Optimization**
Based on [Resend best practices](https://resend.com/docs/knowledge-base/how-do-i-maximize-deliverability-for-supabase-auth-emails):

```typescript
// Optional: Disable tracking for better deliverability
// Add to domain settings in Resend dashboard:
// - Open tracking: OFF
// - Click tracking: OFF
```

### **8.4 Ongoing Maintenance**
```
Monthly:
- Check delivery rates in Resend dashboard
- Review bounce logs and suppression lists
- Monitor function performance metrics

Quarterly:
- Review DNS records (ensure still valid)
- Update API keys if needed
- Check for Resend service updates
```

---

## 🔒 **STEP 9: SECURITY & BEST PRACTICES**

### **9.1 API Key Security**
```typescript
// ✅ DO: Store in environment variables
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

// ❌ DON'T: Hardcode in production (current method is temporary)
const RESEND_API_KEY = "re_xyz123...";
```

### **9.2 Rate Limiting**
Monitor [Resend limits](https://resend.com/docs/knowledge-base/resend-sending-limits):
- **Free Plan**: 100 emails/day
- **Pro Plan**: 50,000 emails/month
- **Business Plan**: 100,000+ emails/month

### **9.3 Deliverability Best Practices**
1. **Consistent FROM address**: Always use same domain
2. **Professional content**: Avoid spam trigger words
3. **List hygiene**: Monitor bounces and suppressions
4. **DMARC setup**: Add DMARC record for additional trust

---

## 🚨 **TROUBLESHOOTING GUIDE**

### **Common Issues & Solutions**

| Issue | Cause | Solution |
|-------|-------|----------|
| Domain won't verify | DNS records not propagated | Wait 24-72 hours, check with `nslookup` |
| Emails going to spam | Missing SPF/DKIM | Verify all 3 DNS records added correctly |
| 403 domain error | Domain not verified | Complete Resend verification first |
| Function timeout | Large email payload | Optimize email content size |
| Rate limit hit | Too many emails | Upgrade Resend plan or implement queuing |

### **Debug Commands**
```bash
# Check DNS propagation
nslookup -type=MX send.notifications.yourdomain.com
nslookup -type=TXT send.notifications.yourdomain.com
nslookup -type=TXT resend._domainkey.notifications.yourdomain.com

# Test email delivery
curl -X POST 'https://api.resend.com/emails' \
  -H 'Authorization: Bearer YOUR_API_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"from":"noreply@notifications.yourdomain.com","to":"test@example.com","subject":"Test","html":"Test email"}'
```

---

## 📞 **SUPPORT RESOURCES**

- **Resend Docs**: [resend.com/docs](https://resend.com/docs)
- **DNS Guides**: [resend.com/docs/knowledge-base](https://resend.com/docs/knowledge-base)
- **Supabase Functions**: [supabase.com/docs/guides/functions](https://supabase.com/docs/guides/functions)
- **Domain Verification**: [resend.com/docs/knowledge-base/what-if-my-domain-is-not-verifying](https://resend.com/docs/knowledge-base/what-if-my-domain-is-not-verifying)

---

## ✅ **FINAL PRODUCTION CHECKLIST**

```
🎯 DOMAIN SETUP
□ Domain purchased and owned
□ Subdomain chosen for emails
□ DNS provider identified

🔧 RESEND CONFIGURATION  
□ Domain added to Resend
□ All 3 DNS records copied
□ Region selected (us-east-1/eu-west-1)

🌐 DNS RECORDS
□ MX record added to DNS provider
□ TXT SPF record added
□ TXT DKIM record added  
□ Records propagated (nslookup confirms)

✅ VERIFICATION
□ Resend shows "Verified" status
□ Test email sends from dashboard
□ DNS lookup returns correct values

🚀 DEPLOYMENT
□ Edge Function updated with production config
□ FROM_EMAIL uses verified domain
□ RECIPIENT_EMAIL = adminEmail (not test)
□ Function deployed to Supabase

🧪 TESTING
□ Content brief approval triggers email
□ Admin receives notification
□ Email displays correctly
□ Supabase logs show success

📊 MONITORING
□ Resend dashboard monitored
□ Supabase function logs reviewed
□ Delivery rates acceptable
□ No bounces or errors

🎉 PRODUCTION READY!
```

---

## 📋 **QUICK REFERENCE COMMANDS**

### **DNS Verification**
```bash
# Check all required DNS records
nslookup -type=MX send.notifications.yourdomain.com
nslookup -type=TXT send.notifications.yourdomain.com
nslookup -type=TXT resend._domainkey.notifications.yourdomain.com

# Alternative using dig
dig MX send.notifications.yourdomain.com
dig TXT send.notifications.yourdomain.com
dig TXT resend._domainkey.notifications.yourdomain.com
```

### **Test Email via API**
```bash
curl -X POST 'https://api.resend.com/emails' \
  -H 'Authorization: Bearer re_NVLwoaTM_PUxwR9fcMoD3jfdCzERYgQKb' \
  -H 'Content-Type: application/json' \
  -d '{
    "from": "noreply@notifications.yourdomain.com",
    "to": "test@example.com",
    "subject": "Production Test",
    "html": "<p>Testing production email setup</p>"
  }'
```

### **Supabase Function Deployment**
```bash
# If CLI is working
supabase functions deploy send-brief-approval-notification

# View function logs
supabase functions logs send-brief-approval-notification
```

---

**Save this guide** - you'll reference it when setting up your domain and going to production! Your notification system will be enterprise-ready with professional email delivery. 