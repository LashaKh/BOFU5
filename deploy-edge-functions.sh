#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Deploying Supabase Edge Functions ===${NC}"

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null
then
    echo -e "${RED}Supabase CLI is not installed. Please install it first:${NC}"
    echo -e "${YELLOW}npm install -g supabase${NC}"
    exit 1
fi

# Check login status
echo -e "${GREEN}Checking Supabase login status...${NC}"
SUPABASE_LOGIN_STATUS=$(supabase login)

if [[ $SUPABASE_LOGIN_STATUS == *"Error"* ]]; then
    echo -e "${RED}You need to login to Supabase first.${NC}"
    echo -e "${YELLOW}Run: supabase login${NC}"
    exit 1
fi

echo "🚀 Setting environment variables for send-brief-approval-notification..."

# Set environment variables for the project
supabase secrets set RESEND_API_KEY=re_NVLwoaTM_PUxwR9fcMoD3jfdCzERYgQKb --project-ref nhxjashreguofalhaofj
supabase secrets set FROM_EMAIL=noreply@resend.dev --project-ref nhxjashreguofalhaofj

echo "✅ Environment variables set!"

echo "🚀 Deploying Edge Function..."

# Deploy the Edge Function
supabase functions deploy send-brief-approval-notification --project-ref nhxjashreguofalhaofj

echo "✅ Edge Function deployed!"
echo "🧪 Test by approving a brief in your app!"

echo -e "${GREEN}Deployment complete!${NC}"
echo -e "${YELLOW}You can test your function using:${NC}"
echo -e "supabase functions serve --no-verify-jwt"

exit 0 