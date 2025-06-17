-- Migration: Add selected_text field to article_comments table
-- Date: 2025-01-22
-- Purpose: Store the original selected text to provide accurate reference even if document content changes

-- Add selected_text field to store the original text that was selected when the comment was created
ALTER TABLE article_comments 
ADD COLUMN selected_text TEXT;

-- Add index for searching within selected text
CREATE INDEX IF NOT EXISTS idx_article_comments_selected_text ON article_comments USING gin(to_tsvector('english', selected_text));

-- Add comment explaining the purpose of this field
COMMENT ON COLUMN article_comments.selected_text IS 'Stores the original text that was selected when creating the comment, providing accurate reference even if document content changes'; 