-- Migration: Add brief_content_text column to content_briefs table

-- Add a new column to the existing content_briefs table for plain text content
ALTER TABLE content_briefs 
ADD COLUMN IF NOT EXISTS brief_content_text TEXT;

-- Update existing rows to initialize the new column with the current content
UPDATE content_briefs
SET brief_content_text = brief_content
WHERE brief_content_text IS NULL;
