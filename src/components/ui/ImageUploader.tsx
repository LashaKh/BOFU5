import React, { useCallback, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, X, AlertCircle, CheckCircle, Image as ImageIcon } from 'lucide-react';
import { uploadCapabilityImage, UploadResult } from '../../lib/storage';

interface ImageUploaderProps {
  onUpload: (result: UploadResult) => void;
  userId: string;
  capabilityId: string;
  disabled?: boolean;
  maxFiles?: number;
  currentImages?: string[];
  className?: string;
}

interface UploadState {
  isUploading: boolean;
  progress: number;
  error?: string;
  success?: boolean;
}

export function ImageUploader({
  onUpload,
  userId,
  capabilityId,
  disabled = false,
  maxFiles = 5,
  currentImages = [],
  className = ''
}: ImageUploaderProps) {
  const [uploadState, setUploadState] = useState<UploadState>({
    isUploading: false,
    progress: 0
  });
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canUploadMore = currentImages.length < maxFiles;

  const handleFiles = useCallback(async (files: FileList) => {
    if (disabled || !canUploadMore) return;

    const file = files[0]; // Handle one file at a time
    if (!file) return;

    setUploadState({
      isUploading: true,
      progress: 0,
      error: undefined,
      success: false
    });

    try {
      const result = await uploadCapabilityImage(
        file,
        userId,
        capabilityId,
        (progress) => {
          setUploadState(prev => ({
            ...prev,
            progress
          }));
        }
      );

      if (result.error) {
        setUploadState({
          isUploading: false,
          progress: 0,
          error: result.error
        });
      } else {
        setUploadState({
          isUploading: false,
          progress: 100,
          success: true
        });
        onUpload(result);
        
        // Clear success state after a delay
        setTimeout(() => {
          setUploadState({
            isUploading: false,
            progress: 0
          });
        }, 2000);
      }
    } catch (error) {
      setUploadState({
        isUploading: false,
        progress: 0,
        error: 'Upload failed. Please try again.'
      });
    }
  }, [disabled, canUploadMore, userId, capabilityId, onUpload]);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled && canUploadMore) {
      setIsDragOver(true);
    }
  }, [disabled, canUploadMore]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (disabled || !canUploadMore) return;

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFiles(files);
    }
  }, [disabled, canUploadMore, handleFiles]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      handleFiles(files);
    }
    // Reset input value to allow same file selection
    e.target.value = '';
  }, [handleFiles]);

  const openFileDialog = useCallback(() => {
    if (!disabled && canUploadMore && fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, [disabled, canUploadMore]);

  const getUploadAreaContent = () => {
    if (uploadState.isUploading) {
      return (
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <div className="text-center">
            <p className="text-sm font-medium text-gray-700">Uploading...</p>
            <p className="text-xs text-gray-500">{uploadState.progress}% complete</p>
          </div>
          <div className="w-full max-w-xs bg-gray-200 rounded-full h-2">
            <motion.div
              className="bg-blue-500 h-2 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${uploadState.progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>
      );
    }

    if (uploadState.success) {
      return (
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle className="w-6 h-6 text-green-600" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-green-700">Upload successful!</p>
            <p className="text-xs text-green-600">Image added to capability</p>
          </div>
        </div>
      );
    }

    if (uploadState.error) {
      return (
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
            <AlertCircle className="w-6 h-6 text-red-600" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-red-700">Upload failed</p>
            <p className="text-xs text-red-600">{uploadState.error}</p>
          </div>
          <button
            onClick={() => setUploadState({ isUploading: false, progress: 0 })}
            className="text-xs text-blue-600 hover:text-blue-700 font-medium"
          >
            Try again
          </button>
        </div>
      );
    }

    if (!canUploadMore) {
      return (
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
            <ImageIcon className="w-6 h-6 text-gray-400" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-gray-500">Maximum images reached</p>
            <p className="text-xs text-gray-400">Remove an image to upload a new one</p>
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center gap-3">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors duration-200 ${
          isDragOver ? 'bg-blue-100' : 'bg-gray-100'
        }`}>
          <Upload className={`w-6 h-6 transition-colors duration-200 ${
            isDragOver ? 'text-blue-600' : 'text-gray-400'
          }`} />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-gray-700">
            {isDragOver ? 'Drop image here' : 'Upload capability image'}
          </p>
          <p className="text-xs text-gray-500">
            Drag & drop or click to browse
          </p>
          <p className="text-xs text-gray-400 mt-1">
            JPG, PNG, GIF, WebP • Max 5MB • {currentImages.length}/{maxFiles} images
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className={className}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
        onChange={handleFileInputChange}
        className="hidden"
        disabled={disabled || !canUploadMore}
      />
      
      <motion.div
        className={`relative border-2 border-dashed rounded-lg p-6 transition-all duration-200 cursor-pointer ${
          isDragOver
            ? 'border-blue-400 bg-blue-50'
            : uploadState.error
            ? 'border-red-300 bg-red-50'
            : uploadState.success
            ? 'border-green-300 bg-green-50'
            : disabled || !canUploadMore
            ? 'border-gray-200 bg-gray-50 cursor-not-allowed'
            : 'border-gray-300 bg-white hover:border-gray-400 hover:bg-gray-50'
        }`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={openFileDialog}
        whileHover={canUploadMore && !disabled ? { scale: 1.01 } : {}}
        whileTap={canUploadMore && !disabled ? { scale: 0.99 } : {}}
      >
        {getUploadAreaContent()}
      </motion.div>

      <AnimatePresence>
        {uploadState.error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-2"
          >
            <div className="flex items-center gap-2 text-red-600 text-xs">
              <AlertCircle className="w-3 h-3" />
              <span>{uploadState.error}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
} 