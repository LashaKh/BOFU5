import React, { useState, useRef, useCallback, useEffect } from 'react';
import { 
  RotateCw, RotateCcw, Crop, Maximize2, Download, Check, X, 
  Sliders, Sun, Contrast, Palette, Scissors, Move, AlignLeft, 
  AlignCenter, AlignRight, Maximize 
} from 'lucide-react';

interface ImageEditorProps {
  imageUrl: string;
  onSave: (editedImageBlob: Blob, metadata: EditedImageMetadata) => void;
  onCancel: () => void;
  initialMetadata?: ImageMetadata;
}

interface ImageMetadata {
  width: number;
  height: number;
  altText: string;
  caption: string;
  alignment?: 'left' | 'center' | 'right' | 'full';
}

interface EditedImageMetadata extends ImageMetadata {
  originalWidth: number;
  originalHeight: number;
  editedWidth: number;
  editedHeight: number;
  cropped: boolean;
  rotated: number;
  filters: FilterSettings;
}

interface FilterSettings {
  brightness: number;
  contrast: number;
  saturation: number;
}

interface CropSettings {
  x: number;
  y: number;
  width: number;
  height: number;
}

const DEFAULT_FILTERS: FilterSettings = {
  brightness: 100,
  contrast: 100,
  saturation: 100
};

export const ImageEditor: React.FC<ImageEditorProps> = ({
  imageUrl,
  onSave,
  onCancel,
  initialMetadata
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(null);
  const [currentTool, setCurrentTool] = useState<'none' | 'crop' | 'filters'>('none');
  
  // Image transformations
  const [rotation, setRotation] = useState(0);
  const [filters, setFilters] = useState<FilterSettings>(DEFAULT_FILTERS);
  const [cropSettings, setCropSettings] = useState<CropSettings | null>(null);
  const [isCropping, setIsCropping] = useState(false);
  
  // Metadata
  const [metadata, setMetadata] = useState<ImageMetadata>({
    width: 0,
    height: 0,
    altText: initialMetadata?.altText || '',
    caption: initialMetadata?.caption || '',
    alignment: initialMetadata?.alignment || 'center'
  });
  
  // UI state
  const [isProcessing, setIsProcessing] = useState(false);

  // Load and setup the original image
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setOriginalImage(img);
      setMetadata(prev => ({
        ...prev,
        width: img.naturalWidth,
        height: img.naturalHeight
      }));
      drawImageToCanvas(img);
    };
    img.src = imageUrl;
  }, [imageUrl]);

  const drawImageToCanvas = useCallback((
    img: HTMLImageElement,
    crop?: CropSettings,
    rotate: number = rotation,
    filterSettings: FilterSettings = filters
  ) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas dimensions
    const displayWidth = Math.min(600, img.naturalWidth);
    const displayHeight = (img.naturalHeight * displayWidth) / img.naturalWidth;
    
    canvas.width = displayWidth;
    canvas.height = displayHeight;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Save context for transformations
    ctx.save();

    // Apply rotation
    if (rotate !== 0) {
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((rotate * Math.PI) / 180);
      ctx.translate(-canvas.width / 2, -canvas.height / 2);
    }

    // Apply filters
    const filterString = `brightness(${filterSettings.brightness}%) contrast(${filterSettings.contrast}%) saturate(${filterSettings.saturation}%)`;
    ctx.filter = filterString;

    // Draw image (with crop if specified)
    if (crop) {
      const scaleX = displayWidth / img.naturalWidth;
      const scaleY = displayHeight / img.naturalHeight;
      
      ctx.drawImage(
        img,
        crop.x, crop.y, crop.width, crop.height,
        crop.x * scaleX, crop.y * scaleY, crop.width * scaleX, crop.height * scaleY
      );
    } else {
      ctx.drawImage(img, 0, 0, displayWidth, displayHeight);
    }

    // Restore context
    ctx.restore();
  }, [rotation, filters]);

  const handleRotate = useCallback((direction: 'left' | 'right') => {
    const newRotation = direction === 'left' 
      ? rotation - 90 
      : rotation + 90;
    setRotation(newRotation % 360);
    
    if (originalImage) {
      drawImageToCanvas(originalImage, cropSettings || undefined, newRotation);
    }
  }, [rotation, originalImage, cropSettings, drawImageToCanvas]);

  const handleFilterChange = useCallback((filterType: keyof FilterSettings, value: number) => {
    const newFilters = { ...filters, [filterType]: value };
    setFilters(newFilters);
    
    if (originalImage) {
      drawImageToCanvas(originalImage, cropSettings || undefined, rotation, newFilters);
    }
  }, [filters, originalImage, cropSettings, rotation, drawImageToCanvas]);

  const handleCropStart = useCallback(() => {
    setCurrentTool('crop');
    setIsCropping(true);
    // Initialize crop to center 50% of image
    if (originalImage) {
      const centerCrop = {
        x: originalImage.naturalWidth * 0.25,
        y: originalImage.naturalHeight * 0.25,
        width: originalImage.naturalWidth * 0.5,
        height: originalImage.naturalHeight * 0.5
      };
      setCropSettings(centerCrop);
      drawImageToCanvas(originalImage, centerCrop);
    }
  }, [originalImage, drawImageToCanvas]);

  const handleCropConfirm = useCallback(() => {
    setIsCropping(false);
    setCurrentTool('none');
  }, []);

  const handleCropCancel = useCallback(() => {
    setCropSettings(null);
    setIsCropping(false);
    setCurrentTool('none');
    if (originalImage) {
      drawImageToCanvas(originalImage);
    }
  }, [originalImage, drawImageToCanvas]);

  const optimizeImage = useCallback(async (canvas: HTMLCanvasElement): Promise<Blob> => {
    return new Promise((resolve) => {
      // Convert to WebP with 85% quality for optimization
      canvas.toBlob((blob) => {
        resolve(blob!);
      }, 'image/webp', 0.85);
    });
  }, []);

  const handleSave = useCallback(async () => {
    if (!originalImage || !canvasRef.current) return;

    setIsProcessing(true);
    
    try {
      // Create a new canvas for the final export
      const exportCanvas = document.createElement('canvas');
      const exportCtx = exportCanvas.getContext('2d');
      if (!exportCtx) return;

      // Determine final dimensions
      let finalWidth = originalImage.naturalWidth;
      let finalHeight = originalImage.naturalHeight;
      
      if (cropSettings) {
        finalWidth = cropSettings.width;
        finalHeight = cropSettings.height;
      }

      exportCanvas.width = finalWidth;
      exportCanvas.height = finalHeight;

      // Apply all transformations to export canvas
      exportCtx.save();

      // Apply rotation to export canvas
      if (rotation !== 0) {
        exportCtx.translate(finalWidth / 2, finalHeight / 2);
        exportCtx.rotate((rotation * Math.PI) / 180);
        exportCtx.translate(-finalWidth / 2, -finalHeight / 2);
      }

      // Apply filters
      const filterString = `brightness(${filters.brightness}%) contrast(${filters.contrast}%) saturate(${filters.saturation}%)`;
      exportCtx.filter = filterString;

      // Draw the final image
      if (cropSettings) {
        exportCtx.drawImage(
          originalImage,
          cropSettings.x, cropSettings.y, cropSettings.width, cropSettings.height,
          0, 0, finalWidth, finalHeight
        );
      } else {
        exportCtx.drawImage(originalImage, 0, 0, finalWidth, finalHeight);
      }

      exportCtx.restore();

      // Optimize the image
      const optimizedBlob = await optimizeImage(exportCanvas);

      // Create edited metadata
      const editedMetadata: EditedImageMetadata = {
        ...metadata,
        originalWidth: originalImage.naturalWidth,
        originalHeight: originalImage.naturalHeight,
        editedWidth: finalWidth,
        editedHeight: finalHeight,
        cropped: !!cropSettings,
        rotated: rotation,
        filters: filters
      };

      onSave(optimizedBlob, editedMetadata);
    } catch (error) {
      console.error('Failed to save edited image:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [originalImage, metadata, cropSettings, rotation, filters, optimizeImage, onSave]);

  const resetAll = useCallback(() => {
    setRotation(0);
    setFilters(DEFAULT_FILTERS);
    setCropSettings(null);
    setIsCropping(false);
    setCurrentTool('none');
    
    if (originalImage) {
      drawImageToCanvas(originalImage);
    }
  }, [originalImage, drawImageToCanvas]);

  if (!originalImage) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading image editor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Image Editor</h3>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={24} />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Toolbar */}
          <div className="w-64 bg-gray-50 p-4 border-r border-gray-200 overflow-y-auto">
            <div className="space-y-6">
              {/* Basic Tools */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Basic Tools</h4>
                <div className="space-y-2">
                  <button
                    onClick={() => handleRotate('left')}
                    className="w-full flex items-center space-x-2 px-3 py-2 text-sm bg-white border border-gray-200 rounded hover:bg-gray-50"
                  >
                    <RotateCcw size={16} />
                    <span>Rotate Left</span>
                  </button>
                  <button
                    onClick={() => handleRotate('right')}
                    className="w-full flex items-center space-x-2 px-3 py-2 text-sm bg-white border border-gray-200 rounded hover:bg-gray-50"
                  >
                    <RotateCw size={16} />
                    <span>Rotate Right</span>
                  </button>
                  <button
                    onClick={isCropping ? handleCropCancel : handleCropStart}
                    className={`w-full flex items-center space-x-2 px-3 py-2 text-sm border rounded ${
                      isCropping 
                        ? 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100' 
                        : 'bg-white border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <Crop size={16} />
                    <span>{isCropping ? 'Cancel Crop' : 'Crop Image'}</span>
                  </button>
                  {isCropping && (
                    <button
                      onClick={handleCropConfirm}
                      className="w-full flex items-center space-x-2 px-3 py-2 text-sm bg-green-50 border border-green-200 text-green-700 rounded hover:bg-green-100"
                    >
                      <Check size={16} />
                      <span>Apply Crop</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Filters */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Filters</h4>
                <div className="space-y-4">
                  <div>
                    <label className="flex items-center space-x-2 text-sm text-gray-600 mb-1">
                      <Sun size={14} />
                      <span>Brightness: {filters.brightness}%</span>
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="200"
                      value={filters.brightness}
                      onChange={(e) => handleFilterChange('brightness', parseInt(e.target.value))}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="flex items-center space-x-2 text-sm text-gray-600 mb-1">
                      <Contrast size={14} />
                      <span>Contrast: {filters.contrast}%</span>
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="200"
                      value={filters.contrast}
                      onChange={(e) => handleFilterChange('contrast', parseInt(e.target.value))}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="flex items-center space-x-2 text-sm text-gray-600 mb-1">
                      <Palette size={14} />
                      <span>Saturation: {filters.saturation}%</span>
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="200"
                      value={filters.saturation}
                      onChange={(e) => handleFilterChange('saturation', parseInt(e.target.value))}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>

              {/* Image Alignment */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Alignment</h4>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setMetadata(prev => ({ ...prev, alignment: 'left' }))}
                    className={`flex items-center justify-center p-2 border rounded ${
                      metadata.alignment === 'left' 
                        ? 'bg-blue-50 border-blue-200 text-blue-700' 
                        : 'bg-white border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <AlignLeft size={16} />
                  </button>
                  <button
                    onClick={() => setMetadata(prev => ({ ...prev, alignment: 'center' }))}
                    className={`flex items-center justify-center p-2 border rounded ${
                      metadata.alignment === 'center' 
                        ? 'bg-blue-50 border-blue-200 text-blue-700' 
                        : 'bg-white border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <AlignCenter size={16} />
                  </button>
                  <button
                    onClick={() => setMetadata(prev => ({ ...prev, alignment: 'right' }))}
                    className={`flex items-center justify-center p-2 border rounded ${
                      metadata.alignment === 'right' 
                        ? 'bg-blue-50 border-blue-200 text-blue-700' 
                        : 'bg-white border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <AlignRight size={16} />
                  </button>
                  <button
                    onClick={() => setMetadata(prev => ({ ...prev, alignment: 'full' }))}
                    className={`flex items-center justify-center p-2 border rounded ${
                      metadata.alignment === 'full' 
                        ? 'bg-blue-50 border-blue-200 text-blue-700' 
                        : 'bg-white border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <Maximize size={16} />
                  </button>
                </div>
              </div>

              {/* Metadata */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Metadata</h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Alt Text</label>
                    <textarea
                      value={metadata.altText}
                      onChange={(e) => setMetadata(prev => ({ ...prev, altText: e.target.value }))}
                      placeholder="Describe the image..."
                      className="w-full px-2 py-1 text-sm border border-gray-200 rounded resize-none"
                      rows={2}
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Caption</label>
                    <textarea
                      value={metadata.caption}
                      onChange={(e) => setMetadata(prev => ({ ...prev, caption: e.target.value }))}
                      placeholder="Add a caption..."
                      className="w-full px-2 py-1 text-sm border border-gray-200 rounded resize-none"
                      rows={2}
                    />
                  </div>
                </div>
              </div>

              {/* Reset */}
              <button
                onClick={resetAll}
                className="w-full px-3 py-2 text-sm bg-gray-100 border border-gray-200 rounded hover:bg-gray-200"
              >
                Reset All Changes
              </button>
            </div>
          </div>

          {/* Canvas Area */}
          <div className="flex-1 flex items-center justify-center p-8 bg-gray-100">
            <div className="relative">
              <canvas
                ref={canvasRef}
                className="max-w-full max-h-full border border-gray-300 rounded-lg shadow-lg bg-white"
                style={{ maxHeight: 'calc(90vh - 200px)' }}
              />
              {isCropping && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-white bg-black bg-opacity-50 px-3 py-1 rounded text-sm">
                    Crop preview - adjust in controls panel
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-600">
            {originalImage && (
              <>
                Original: {originalImage.naturalWidth} × {originalImage.naturalHeight}px
                {cropSettings && (
                  <span className="ml-4">
                    Cropped: {cropSettings.width} × {cropSettings.height}px
                  </span>
                )}
              </>
            )}
          </div>
          <div className="flex space-x-3">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isProcessing || !metadata.altText}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {isProcessing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <Check size={16} />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}; 