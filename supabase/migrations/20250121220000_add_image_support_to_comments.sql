-- Add image support to article comments
ALTER TABLE article_comments 
ADD COLUMN image_url TEXT;

-- Add comment to explain the column
COMMENT ON COLUMN article_comments.image_url IS 'URL of image stored in comment-images bucket for image-type comments';

-- Update the content_type check constraint to ensure proper usage
ALTER TABLE article_comments 
DROP CONSTRAINT IF EXISTS valid_content_type;

ALTER TABLE article_comments 
ADD CONSTRAINT valid_content_type 
CHECK (content_type IN ('text', 'image', 'suggestion'));

-- Add constraint to ensure image comments have image_url
ALTER TABLE article_comments 
ADD CONSTRAINT image_comment_has_url 
CHECK (
  (content_type = 'image' AND image_url IS NOT NULL) OR
  (content_type != 'image')
);

-- Update RLS policies to handle image URLs (if needed)
-- The existing policies should work as-is since they're based on user_id

-- Create index for faster queries on image comments
CREATE INDEX IF NOT EXISTS idx_article_comments_image_url 
ON article_comments(image_url) 
WHERE image_url IS NOT NULL;

-- Create index for content_type filtering
CREATE INDEX IF NOT EXISTS idx_article_comments_content_type 
ON article_comments(content_type); 