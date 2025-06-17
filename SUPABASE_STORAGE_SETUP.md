# Supabase Storage Setup for Document Upload

## Required Storage Bucket

To enable the new document upload and download functionality, you need to create a Supabase Storage bucket.

### 1. Create the Storage Bucket

**Option A: Using Supabase Dashboard**
1. Go to your Supabase project dashboard
2. Navigate to **Storage** → **Buckets**
3. Click **"New Bucket"**
4. Set bucket name: `product_documents`
5. Make bucket **Public** (for direct downloads)
6. Click **"Create Bucket"**

**Option B: Using SQL**
```sql
-- Create the storage bucket for product documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product_documents',
  'product_documents', 
  true,
  52428800, -- 50MB limit
  ARRAY[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-powerpoint',
    'text/plain',
    'text/html',
    'application/rtf'
  ]
);
```

### 2. Set Up Storage Policies

Apply these RLS policies for proper access control:

```sql
-- Policy: Allow authenticated users to upload files to their own folders
CREATE POLICY "Users can upload to own folder" ON storage.objects
  FOR INSERT 
  WITH CHECK (
    auth.role() = 'authenticated' 
    AND bucket_id = 'product_documents' 
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Policy: Allow authenticated users to read files from their own folders  
CREATE POLICY "Users can read own files" ON storage.objects
  FOR SELECT 
  USING (
    auth.role() = 'authenticated' 
    AND bucket_id = 'product_documents' 
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Policy: Allow public read access for file downloads (optional)
CREATE POLICY "Public read access" ON storage.objects
  FOR SELECT 
  USING (bucket_id = 'product_documents');

-- Policy: Allow users to delete their own files
CREATE POLICY "Users can delete own files" ON storage.objects
  FOR DELETE 
  USING (
    auth.role() = 'authenticated' 
    AND bucket_id = 'product_documents' 
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
```

### 3. Update Database Schema (if needed)

Ensure your `product_documents` table has the required fields:

```sql
-- Check if columns exist, add them if missing
ALTER TABLE product_documents 
ADD COLUMN IF NOT EXISTS storage_path TEXT,
ADD COLUMN IF NOT EXISTS file_url TEXT;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_product_documents_storage_path 
ON product_documents(storage_path) WHERE storage_path IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_product_documents_file_url 
ON product_documents(file_url) WHERE file_url IS NOT NULL;
```

## File Structure in Storage

Files will be organized as:
```
product_documents/
├── {user_id}/
│   ├── {product_id}/
│   │   ├── 2024-01-15T10-30-45-123Z-document1.pdf
│   │   ├── 2024-01-15T10-32-12-456Z-presentation.pptx
│   │   └── 2024-01-15T10-35-01-789Z-report.docx
│   └── {another_product_id}/
│       └── files...
└── {another_user_id}/
    └── products...
```

## Testing the Setup

After creating the bucket, you can test with this SQL query:

```sql
-- Test if bucket exists
SELECT * FROM storage.buckets WHERE id = 'product_documents';

-- Test policies (run as authenticated user)
SELECT * FROM storage.objects WHERE bucket_id = 'product_documents' LIMIT 5;
```

## Environment Variables

Make sure your `.env` file has the correct Supabase configuration:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

## Troubleshooting

### Common Issues:

1. **"Bucket does not exist" Error**
   - Create the `product_documents` bucket as described above

2. **"Access denied" Error**  
   - Check the RLS policies are correctly applied
   - Ensure user is authenticated

3. **"File too large" Error**
   - Increase the `file_size_limit` in the bucket settings
   - Current limit is set to 50MB

4. **"MIME type not allowed" Error**
   - Add the required MIME type to the `allowed_mime_types` array

### Debug Storage Issues

Add this to your browser console to debug storage issues:

```javascript
// Test bucket access
const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
console.log('Available buckets:', buckets, bucketError);

// Test file upload
const testFile = new File(['test content'], 'test.txt', { type: 'text/plain' });
const { data: uploadData, error: uploadError } = await supabase.storage
  .from('product_documents')
  .upload('test/test.txt', testFile);
console.log('Upload test:', uploadData, uploadError);
```

---

Once you've completed this setup, the document upload functionality will work properly with:
- ✅ Files stored in Supabase Storage
- ✅ `storage_path` and `file_url` fields populated
- ✅ Download functionality working in the preview modal
- ✅ Proper file organization and access control 