-- Add google_doc_url column to content_briefs table
-- This column will store the URL of the associated Google Document

ALTER TABLE content_briefs 
ADD COLUMN google_doc_url TEXT;

-- Add comment to document the column purpose
COMMENT ON COLUMN content_briefs.google_doc_url IS 'URL of the associated Google Document for this content brief';