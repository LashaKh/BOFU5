#!/bin/bash

# Deploy admin article access migration to Supabase
# This script applies the admin article access migration

echo "🚀 Deploying admin article access migration..."

# Check if Supabase CLI is available
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Please install it first:"
    echo "   npm install -g supabase"
    exit 1
fi

# Check if we're in a Supabase project
if [ ! -f "supabase/config.toml" ]; then
    echo "❌ No Supabase project found. Make sure you're in the project root."
    exit 1
fi

# Apply the migration
echo "📁 Applying admin article access migration..."
supabase db push

if [ $? -eq 0 ]; then
    echo "✅ Admin article access migration deployed successfully!"
    echo "📋 Created:"
    echo "   - admin_article_access table"
    echo "   - admin_action_type enum"
    echo "   - RLS policies for admin access"
    echo "   - Audit logging functions"
    echo "   - Enhanced content_briefs policies"
else
    echo "❌ Migration failed. Please check the errors above."
    exit 1
fi

echo "🔧 You can now test the migration by running SQL queries in the Supabase dashboard." 