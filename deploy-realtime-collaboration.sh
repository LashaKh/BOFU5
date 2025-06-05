#!/bin/bash

# Deploy Real-time Collaboration Migration
# This script deploys the real-time collaboration infrastructure to Supabase

echo "🚀 Deploying Real-time Collaboration Migration..."

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Please install it first:"
    echo "   npm install -g supabase"
    exit 1
fi

# Check if we're in a Supabase project
if [ ! -f "supabase/config.toml" ]; then
    echo "❌ Not in a Supabase project directory"
    exit 1
fi

echo "📋 Running migration: 20250103000000_realtime_collaboration.sql"

# Apply the migration
supabase db reset --local
if [ $? -eq 0 ]; then
    echo "✅ Local database reset successful"
else
    echo "❌ Failed to reset local database"
    exit 1
fi

# Push to remote (if linked)
echo "🔄 Pushing changes to remote database..."
supabase db push
if [ $? -eq 0 ]; then
    echo "✅ Migration deployed successfully to remote database"
else
    echo "⚠️  Failed to push to remote. Please check your connection and try manually:"
    echo "   supabase db push"
fi

echo ""
echo "🎉 Real-time Collaboration Migration Complete!"
echo ""
echo "📝 Next steps:"
echo "   1. Verify the user_presence table exists in your Supabase dashboard"
echo "   2. Check that real-time is enabled for content_briefs and user_presence tables"
echo "   3. Test the presence functions in the SQL editor"
echo ""
echo "🔧 To test the functions manually:"
echo "   SELECT public.update_user_presence('your-article-id', 'editing');"
echo "   SELECT * FROM public.get_active_users('your-article-id');"
echo "" 