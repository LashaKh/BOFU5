import { supabase } from './supabase';

export interface UploadResult {
  url: string;
  path: string;
  error?: string;
}

export interface UploadProgress {
  progress: number;
  isUploading: boolean;
  error?: string;
}

// Storage bucket names
export const CAPABILITY_IMAGES_BUCKET = 'capability-images';
export const ARTICLE_IMAGES_BUCKET = 'article-images';

/**
 * Upload an image file to Supabase storage
 */
export async function uploadCapabilityImage(
  file: File,
  userId: string,
  capabilityId: string,
  onProgress?: (progress: number) => void
): Promise<UploadResult> {
  try {
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return {
        url: '',
        path: '',
        error: 'Invalid file type. Please upload JPG, PNG, GIF, or WebP images.'
      };
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024; // 5MB in bytes
    if (file.size > maxSize) {
      return {
        url: '',
        path: '',
        error: 'File size too large. Please upload images smaller than 5MB.'
      };
    }

    // Generate unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `${userId}/${capabilityId}/${fileName}`;

    // Simulate progress for user feedback
    onProgress?.(10);

    // Upload file to Supabase storage
    const { data, error } = await supabase.storage
      .from(CAPABILITY_IMAGES_BUCKET)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    onProgress?.(90);

    if (error) {
      console.error('Upload error:', error);
      return {
        url: '',
        path: '',
        error: `Upload failed: ${error.message}`
      };
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(CAPABILITY_IMAGES_BUCKET)
      .getPublicUrl(filePath);

    onProgress?.(100);

    return {
      url: urlData.publicUrl,
      path: filePath
    };

  } catch (error) {
    console.error('Unexpected upload error:', error);
    return {
      url: '',
      path: '',
      error: 'Unexpected error occurred during upload'
    };
  }
}

/**
 * Delete an image from Supabase storage
 */
export async function deleteCapabilityImage(filePath: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.storage
      .from(CAPABILITY_IMAGES_BUCKET)
      .remove([filePath]);

    if (error) {
      console.error('Delete error:', error);
      return {
        success: false,
        error: `Delete failed: ${error.message}`
      };
    }

    return { success: true };

  } catch (error) {
    console.error('Unexpected delete error:', error);
    return {
      success: false,
      error: 'Unexpected error occurred during deletion'
    };
  }
}

/**
 * Upload an image file for articles to Supabase storage
 */
export async function uploadArticleImage(
  file: File,
  userId: string,
  articleId: string,
  onProgress?: (progress: number) => void
): Promise<UploadResult> {
  try {
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return {
        url: '',
        path: '',
        error: 'Invalid file type. Please upload JPG, PNG, GIF, or WebP images.'
      };
    }

    // Validate file size (10MB max for articles)
    const maxSize = 10 * 1024 * 1024; // 10MB in bytes
    if (file.size > maxSize) {
      return {
        url: '',
        path: '',
        error: 'File size too large. Please upload images smaller than 10MB.'
      };
    }

    // Generate unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `${userId}/${articleId}/${fileName}`;

    // Simulate progress for user feedback
    onProgress?.(10);

    // Upload file to Supabase storage
    const { data, error } = await supabase.storage
      .from(ARTICLE_IMAGES_BUCKET)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    onProgress?.(90);

    if (error) {
      console.error('Article image upload error:', error);
      return {
        url: '',
        path: '',
        error: `Upload failed: ${error.message}`
      };
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(ARTICLE_IMAGES_BUCKET)
      .getPublicUrl(filePath);

    onProgress?.(100);

    return {
      url: urlData.publicUrl,
      path: filePath
    };

  } catch (error) {
    console.error('Unexpected article image upload error:', error);
    return {
      url: '',
      path: '',
      error: 'Unexpected error occurred during upload'
    };
  }
}

/**
 * Delete an article image from Supabase storage
 */
export async function deleteArticleImage(filePath: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.storage
      .from(ARTICLE_IMAGES_BUCKET)
      .remove([filePath]);

    if (error) {
      console.error('Article image delete error:', error);
      return {
        success: false,
        error: `Delete failed: ${error.message}`
      };
    }

    return { success: true };

  } catch (error) {
    console.error('Unexpected article image delete error:', error);
    return {
      success: false,
      error: 'Unexpected error occurred during deletion'
    };
  }
}

/**
 * Save article image metadata to database
 */
export async function saveArticleImageMetadata(
  articleId: string,
  storagePath: string,
  filename: string,
  altText?: string,
  caption?: string,
  fileSize?: number,
  mimeType?: string,
  width?: number,
  height?: number
) {
  try {
    const { data, error } = await supabase
      .from('article_images')
      .insert({
        article_id: articleId,
        storage_path: storagePath,
        filename,
        alt_text: altText,
        caption,
        file_size: fileSize,
        mime_type: mimeType,
        width,
        height,
        created_by: (await supabase.auth.getUser()).data.user?.id
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving article image metadata:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Unexpected error saving article image metadata:', error);
    return { success: false, error: 'Failed to save image metadata' };
  }
}

/**
 * Get all images for an article
 */
export async function getArticleImages(articleId: string) {
  try {
    const { data, error } = await supabase
      .from('article_images')
      .select('*')
      .eq('article_id', articleId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching article images:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Unexpected error fetching article images:', error);
    return { success: false, error: 'Failed to fetch article images' };
  }
}

/**
 * Delete article image and its metadata
 */
export async function deleteArticleImageComplete(imageId: string, storagePath: string) {
  try {
    // Delete from storage
    const storageResult = await deleteArticleImage(storagePath);
    if (!storageResult.success) {
      return storageResult;
    }

    // Delete metadata from database
    const { error } = await supabase
      .from('article_images')
      .delete()
      .eq('id', imageId);

    if (error) {
      console.error('Error deleting article image metadata:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Unexpected error deleting article image:', error);
    return { success: false, error: 'Failed to delete image completely' };
  }
} 