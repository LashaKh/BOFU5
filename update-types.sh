#!/bin/bash

# Update Supabase TypeScript types after database migrations
echo "Updating Supabase TypeScript types..."

# Generate types from the updated database schema
supabase gen types typescript --local > src/types/supabase.ts

echo "✅ Types updated successfully!"
echo "📍 Updated file: src/types/supabase.ts"
echo ""
echo "Next steps:"
echo "1. Check the updated types in src/types/supabase.ts"
echo "2. Verify the new fields are present:"
echo "   - content_briefs.article_content"
echo "   - content_briefs.article_version"
echo "   - content_briefs.last_edited_at"
echo "   - content_briefs.last_edited_by"
echo "   - content_briefs.editing_status"
echo "   - article_comments table"
echo "3. Start implementing the TipTap editor component!" 