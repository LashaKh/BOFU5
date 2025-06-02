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

// Storage bucket name for capability images
export const CAPABILITY_IMAGES_BUCKET = 'capability-images';

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