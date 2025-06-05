import React, { useState, useRef, useCallback } from 'react';
import { Upload, Image as ImageIcon, X, Loader2, Check, AlertCircle, Trash2 } from 'lucide-react';
import { uploadArticleImage, saveArticleImageMetadata } from '../../lib/storage';
import { supabase } from '../../lib/supabase';

interface ImageUploadProps {
  onImageInsert: (url: string, metadata?: ImageMetadata) => void;
  articleId?: string;
  className?: string;
}

interface ImageMetadata {
  id?: string;
  filename: string;
  altText: string;
  caption: string;
  width: number;
  height: number;
  fileSize: number;
  mimeType: string;
  storagePath: string;
}

interface UploadProgress {
  progress: number;
  isUploading: boolean;
  error?: string;
  success?: boolean;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({
  onImageInsert,
  articleId,
  className = ''
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({
    progress: 0,
    isUploading: false
  });
  const [preview, setPreview] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<Partial<ImageMetadata>>({
    altText: '',
    caption: ''
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetUpload = useCallback(() => {
    setUploadProgress({ progress: 0, isUploading: false });
    setPreview(null);
    setMetadata({ altText: '', caption: '' });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const getImageDimensions = (file: File): Promise<{ width: number; height: number }> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        resolve({ width: img.naturalWidth, height: img.naturalHeight });
      };
      img.src = URL.createObjectURL(file);
    });
  };

  const processImageUpload = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setUploadProgress({
        progress: 0,
        isUploading: false,
        error: 'Please select a valid image file'
      });
      return;
    }

    try {
      setUploadProgress({ progress: 0, isUploading: true });
      
      // Create preview
      const previewUrl = URL.createObjectURL(file);
      setPreview(previewUrl);

      // Get image dimensions
      const dimensions = await getImageDimensions(file);

      // Update metadata with file info
      setMetadata(prev => ({
        ...prev,
        filename: file.name,
        fileSize: file.size,
        mimeType: file.type,
        width: dimensions.width,
        height: dimensions.height
      }));

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Upload to storage with progress callback
      const uploadResult = await uploadArticleImage(
        file,
        user.id,
        articleId || 'temp',
        (progress) => {
          setUploadProgress(prev => ({ ...prev, progress }));
        }
      );

      if (uploadResult.error) {
        throw new Error(uploadResult.error);
      }

      setUploadProgress({
        progress: 100,
        isUploading: false,
        success: true
      });

      // Update metadata with storage path
      setMetadata(prev => ({
        ...prev,
        storagePath: uploadResult.path
      }));

    } catch (error) {
      console.error('Upload failed:', error);
      setUploadProgress({
        progress: 0,
        isUploading: false,
        error: error instanceof Error ? error.message : 'Upload failed'
      });
    }
  }, [articleId]);

  const handleFileSelect = useCallback((files: FileList | null) => {
    if (files && files.length > 0) {
      processImageUpload(files[0]);
    }
  }, [processImageUpload]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragIn = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setDragActive(true);
    }
  }, []);

  const handleDragOut = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processImageUpload(e.dataTransfer.files[0]);
    }
  }, [processImageUpload]);

  const handleInsertImage = useCallback(async () => {
    if (!metadata.storagePath) return;

    try {
      // Save metadata to database if articleId exists
      if (articleId && metadata.storagePath) {
        const saveResult = await saveArticleImageMetadata(
          articleId,
          metadata.storagePath,
          metadata.filename || '',
          metadata.altText,
          metadata.caption,
          metadata.fileSize,
          metadata.mimeType,
          metadata.width,
          metadata.height
        );

        if (saveResult.success && saveResult.data) {
          // Get the public URL for the image
          const { data: urlData } = supabase.storage
            .from('article-images')
            .getPublicUrl(metadata.storagePath);

          onImageInsert(urlData.publicUrl, {
            ...metadata as ImageMetadata,
            id: saveResult.data.id
          });
        }
      } else {
        // For temp uploads or when no articleId
        const { data: urlData } = supabase.storage
          .from('article-images')
          .getPublicUrl(metadata.storagePath);
        
        onImageInsert(urlData.publicUrl, metadata as ImageMetadata);
      }

      resetUpload();
    } catch (error) {
      console.error('Failed to insert image:', error);
      setUploadProgress(prev => ({
        ...prev,
        error: 'Failed to insert image'
      }));
    }
  }, [metadata, articleId, onImageInsert, resetUpload]);

  const renderUploadArea = () => (
    <div
      className={`
        relative border-2 border-dashed rounded-lg p-8 text-center transition-colors
        ${dragActive ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
        ${uploadProgress.isUploading ? 'pointer-events-none' : 'cursor-pointer'}
      `}
      onDragEnter={handleDragIn}
      onDragLeave={handleDragOut}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={(e) => handleFileSelect(e.target.files)}
        className="hidden"
      />
      
      {uploadProgress.isUploading ? (
        <div className="space-y-4">
          <Loader2 className="mx-auto animate-spin text-blue-500" size={48} />
          <div className="space-y-2">
            <p className="text-sm text-gray-600">Uploading image...</p>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress.progress}%` }}
              />
            </div>
            <p className="text-xs text-gray-500">{uploadProgress.progress}%</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <Upload className="mx-auto text-gray-400" size={48} />
          <div>
            <p className="text-lg font-medium text-gray-700">
              Drop image here or click to browse
            </p>
            <p className="text-sm text-gray-500">
              Supports JPG, PNG, GIF, WebP (max 10MB)
            </p>
          </div>
        </div>
      )}
    </div>
  );

  const renderPreview = () => (
    <div className="space-y-4">
      <div className="relative">
        <img
          src={preview!}
          alt="Upload preview"
          className="w-full max-h-64 object-contain rounded-lg border"
        />
        <button
          onClick={resetUpload}
          className="absolute top-2 right-2 p-1 bg-white rounded-full shadow-md hover:bg-gray-50"
          title="Remove image"
        >
          <X size={16} />
        </button>
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Alt Text (for accessibility)
          </label>
          <input
            type="text"
            value={metadata.altText || ''}
            onChange={(e) => setMetadata(prev => ({ ...prev, altText: e.target.value }))}
            placeholder="Describe the image..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Caption (optional)
          </label>
          <input
            type="text"
            value={metadata.caption || ''}
            onChange={(e) => setMetadata(prev => ({ ...prev, caption: e.target.value }))}
            placeholder="Add a caption..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {metadata.width && metadata.height && (
          <div className="text-xs text-gray-500">
            Dimensions: {metadata.width} × {metadata.height}px | Size: {(metadata.fileSize! / 1024 / 1024).toFixed(2)}MB
          </div>
        )}
      </div>

      <div className="flex justify-end space-x-2">
        <button
          onClick={resetUpload}
          className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          onClick={handleInsertImage}
          disabled={!metadata.altText}
          className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
        >
          <ImageIcon size={16} />
          <span>Insert Image</span>
        </button>
      </div>
    </div>
  );

  const renderError = () => (
    <div className="text-center space-y-4">
      <AlertCircle className="mx-auto text-red-500" size={48} />
      <div>
        <p className="text-lg font-medium text-red-700">Upload Failed</p>
        <p className="text-sm text-red-600">{uploadProgress.error}</p>
      </div>
      <button
        onClick={resetUpload}
        className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
      >
        Try Again
      </button>
    </div>
  );

  const renderSuccess = () => (
    <div className="text-center space-y-4">
      <Check className="mx-auto text-green-500" size={48} />
      <div>
        <p className="text-lg font-medium text-green-700">Upload Complete</p>
        <p className="text-sm text-green-600">Image ready to insert</p>
      </div>
    </div>
  );

  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-4 ${className}`}>
      {uploadProgress.error ? renderError() : 
       uploadProgress.success && preview ? renderPreview() :
       preview ? renderPreview() :
       renderUploadArea()}
    </div>
  );
}; 