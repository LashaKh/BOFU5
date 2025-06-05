#!/bin/bash

# Deploy Admin Comment Features Migration
# This script deploys the admin comment features to extend the existing comment system

echo "🚀 Deploying Admin Comment Features Migration..."

# Check if Supabase CLI is available
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Please install it first."
    echo "📖 Visit: https://supabase.com/docs/guides/cli"
    exit 1
fi

# Check if we're in a Supabase project
if [ ! -f "supabase/config.toml" ]; then
    echo "❌ Not in a Supabase project directory"
    echo "Please run this script from your project root"
    exit 1
fi

# Deploy the migration
echo "📦 Applying admin comment features migration..."
supabase db push

if [ $? -eq 0 ]; then
    echo "✅ Admin comment features migration deployed successfully!"
    echo ""
    echo "🎯 New Features Added:"
    echo "  • Admin comment types (admin_note, approval_comment, priority_comment, etc.)"
    echo "  • Comment priority levels (low, normal, high, urgent, critical)"
    echo "  • Approval workflow system with status tracking"
    echo "  • Admin-only comments with enhanced permissions"
    echo "  • Admin notification system for comment events"
    echo "  • Bulk operations for comment management"
    echo "  • Analytics functions for admin reporting"
    echo ""
    echo "🔧 Database Functions Added:"
    echo "  • create_admin_comment() - Create admin comments with notifications"
    echo "  • approve_comment() - Approve comments with workflow tracking"
    echo "  • bulk_update_comment_priority() - Bulk priority updates"
    echo "  • get_admin_comment_analytics() - Admin analytics data"
    echo ""
    echo "📋 New Tables Created:"
    echo "  • admin_comment_notifications - Admin notification system"
    echo "  • comment_approval_workflow - Approval workflow tracking"
    echo ""
    echo "⚡ Next Steps:"
    echo "  1. Test admin comment creation in Supabase dashboard"
    echo "  2. Verify RLS policies allow admin access"
    echo "  3. Test the new database functions"
    echo "  4. Update frontend to use new admin comment features"
else
    echo "❌ Migration failed. Please check the error messages above."
    exit 1
fi 