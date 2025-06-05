import React, { useState, useRef, useCallback } from 'react';
import { Edit, Trash2, RotateCw, Move, Settings } from 'lucide-react';
import { ImageEditor } from './ImageEditor';

interface EditableImageProps {
  src: string;
  alt: string;
  caption?: string;
  alignment?: 'left' | 'center' | 'right' | 'full';
  width?: number;
  height?: number;
  onUpdate?: (updates: ImageUpdates) => void;
  onDelete?: () => void;
  onEdit?: () => void;
  className?: string;
}

interface ImageUpdates {
  src?: string;
  alt?: string;
  caption?: string;
  alignment?: 'left' | 'center' | 'right' | 'full';
  width?: number;
  height?: number;
}

export const EditableImage: React.FC<EditableImageProps> = ({
  src,
  alt,
  caption,
  alignment = 'center',
  width,
  height,
  onUpdate,
  onDelete,
  onEdit,
  className = ''
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [isEditingCaption, setIsEditingCaption] = useState(false);
  const [tempCaption, setTempCaption] = useState(caption || '');
  const [currentDimensions, setCurrentDimensions] = useState({
    width: width || 0,
    height: height || 0
  });
  
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const resizeRef = useRef<{
    isResizing: boolean;
    startX: number;
    startY: number;
    startWidth: number;
    startHeight: number;
    aspectRatio: number;
  }>({
    isResizing: false,
    startX: 0,
    startY: 0,
    startWidth: 0,
    startHeight: 0,
    aspectRatio: 1
  });

  const handleImageLoad = useCallback(() => {
    if (imageRef.current && (!width || !height)) {
      const naturalWidth = imageRef.current.naturalWidth;
      const naturalHeight = imageRef.current.naturalHeight;
      setCurrentDimensions({
        width: Math.min(naturalWidth, 600), // Max display width
        height: (naturalHeight * Math.min(naturalWidth, 600)) / naturalWidth
      });
    }
  }, [width, height]);

  const getAlignmentClass = () => {
    switch (alignment) {
      case 'left':
        return 'ml-0 mr-auto';
      case 'right':
        return 'ml-auto mr-0';
      case 'full':
        return 'w-full';
      default:
        return 'mx-auto';
    }
  };

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!imageRef.current) return;
    
    setIsResizing(true);
    const rect = imageRef.current.getBoundingClientRect();
    
    resizeRef.current = {
      isResizing: true,
      startX: e.clientX,
      startY: e.clientY,
      startWidth: rect.width,
      startHeight: rect.height,
      aspectRatio: rect.width / rect.height
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!resizeRef.current.isResizing) return;
      
      const deltaX = e.clientX - resizeRef.current.startX;
      const newWidth = Math.max(100, resizeRef.current.startWidth + deltaX);
      const newHeight = newWidth / resizeRef.current.aspectRatio;
      
      setCurrentDimensions({
        width: newWidth,
        height: newHeight
      });
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      resizeRef.current.isResizing = false;
      
      if (onUpdate) {
        onUpdate({
          width: currentDimensions.width,
          height: currentDimensions.height
        });
      }
      
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [currentDimensions, onUpdate]);

  const handleCaptionEdit = useCallback(() => {
    setIsEditingCaption(true);
    setTempCaption(caption || '');
  }, [caption]);

  const handleCaptionSave = useCallback(() => {
    setIsEditingCaption(false);
    if (onUpdate) {
      onUpdate({ caption: tempCaption });
    }
  }, [tempCaption, onUpdate]);

  const handleCaptionCancel = useCallback(() => {
    setIsEditingCaption(false);
    setTempCaption(caption || '');
  }, [caption]);

  const handleAlignmentChange = useCallback((newAlignment: 'left' | 'center' | 'right' | 'full') => {
    if (onUpdate) {
      onUpdate({ alignment: newAlignment });
    }
  }, [onUpdate]);

  const handleEditInEditor = useCallback(() => {
    setShowEditor(true);
  }, []);

  const handleEditorSave = useCallback((editedBlob: Blob, metadata: any) => {
    // Convert blob to URL for immediate display
    const newUrl = URL.createObjectURL(editedBlob);
    
    if (onUpdate) {
      onUpdate({
        src: newUrl,
        alt: metadata.altText,
        caption: metadata.caption,
        alignment: metadata.alignment,
        width: metadata.editedWidth,
        height: metadata.editedHeight
      });
    }
    
    setShowEditor(false);
  }, [onUpdate]);

  const handleEditorCancel = useCallback(() => {
    setShowEditor(false);
  }, []);

  return (
    <>
      <div
        ref={containerRef}
        className={`relative group inline-block ${getAlignmentClass()} ${className}`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{ maxWidth: alignment === 'full' ? '100%' : 'fit-content' }}
      >
        {/* Main Image */}
        <img
          ref={imageRef}
          src={src}
          alt={alt}
          onLoad={handleImageLoad}
          className={`
            block border border-gray-200 rounded-lg shadow-sm transition-all duration-200
            ${isResizing ? 'ring-2 ring-blue-500' : ''}
            ${isHovered ? 'shadow-lg' : ''}
          `}
          style={{
            width: currentDimensions.width || 'auto',
            height: currentDimensions.height || 'auto',
            maxWidth: alignment === 'full' ? '100%' : '100%'
          }}
          draggable={false}
        />

        {/* Resize Handle */}
        {(isHovered || isResizing) && (
          <div
            className="absolute bottom-0 right-0 w-4 h-4 bg-blue-500 border-2 border-white rounded-tl-lg cursor-se-resize shadow-lg transform translate-x-1 translate-y-1"
            onMouseDown={handleResizeStart}
            title="Drag to resize"
          />
        )}

        {/* Toolbar */}
        {isHovered && !isResizing && (
          <div className="absolute top-2 right-2 flex space-x-1 bg-white bg-opacity-90 backdrop-blur-sm rounded-lg shadow-lg p-1">
            {/* Edit Button */}
            <button
              onClick={handleEditInEditor}
              className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
              title="Edit image"
            >
              <Edit size={16} />
            </button>
            
            {/* Settings Button */}
            <div className="relative group/settings">
              <button
                className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                title="Image settings"
              >
                <Settings size={16} />
              </button>
              
              {/* Settings Dropdown */}
              <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-2 min-w-48 opacity-0 group-hover/settings:opacity-100 transition-opacity z-10">
                <div className="px-3 py-1 text-xs font-semibold text-gray-500 uppercase">Alignment</div>
                <button
                  onClick={() => handleAlignmentChange('left')}
                  className={`w-full text-left px-3 py-2 hover:bg-gray-50 text-sm ${
                    alignment === 'left' ? 'text-blue-600 bg-blue-50' : 'text-gray-700'
                  }`}
                >
                  Align Left
                </button>
                <button
                  onClick={() => handleAlignmentChange('center')}
                  className={`w-full text-left px-3 py-2 hover:bg-gray-50 text-sm ${
                    alignment === 'center' ? 'text-blue-600 bg-blue-50' : 'text-gray-700'
                  }`}
                >
                  Center
                </button>
                <button
                  onClick={() => handleAlignmentChange('right')}
                  className={`w-full text-left px-3 py-2 hover:bg-gray-50 text-sm ${
                    alignment === 'right' ? 'text-blue-600 bg-blue-50' : 'text-gray-700'
                  }`}
                >
                  Align Right
                </button>
                <button
                  onClick={() => handleAlignmentChange('full')}
                  className={`w-full text-left px-3 py-2 hover:bg-gray-50 text-sm ${
                    alignment === 'full' ? 'text-blue-600 bg-blue-50' : 'text-gray-700'
                  }`}
                >
                  Full Width
                </button>
              </div>
            </div>
            
            {/* Delete Button */}
            {onDelete && (
              <button
                onClick={onDelete}
                className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                title="Delete image"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        )}

        {/* Alignment indicator */}
        {isHovered && (
          <div className="absolute top-2 left-2 bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded">
            {alignment === 'full' ? 'Full Width' : 
             alignment === 'left' ? 'Left' :
             alignment === 'right' ? 'Right' : 'Center'}
          </div>
        )}
      </div>

      {/* Caption */}
      {(caption || isEditingCaption) && (
        <div className={`mt-2 ${getAlignmentClass()}`} style={{ maxWidth: currentDimensions.width }}>
          {isEditingCaption ? (
            <div className="space-y-2">
              <textarea
                value={tempCaption}
                onChange={(e) => setTempCaption(e.target.value)}
                placeholder="Add a caption..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm resize-none"
                rows={2}
                autoFocus
              />
              <div className="flex space-x-2">
                <button
                  onClick={handleCaptionSave}
                  className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Save
                </button>
                <button
                  onClick={handleCaptionCancel}
                  className="px-3 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div
              onClick={handleCaptionEdit}
              className="text-sm text-gray-600 italic cursor-pointer hover:text-gray-800 hover:bg-gray-50 p-2 rounded transition-colors"
              title="Click to edit caption"
            >
              {caption}
            </div>
          )}
        </div>
      )}

      {/* Image Editor Modal */}
      {showEditor && (
        <ImageEditor
          imageUrl={src}
          onSave={handleEditorSave}
          onCancel={handleEditorCancel}
          initialMetadata={{
            width: currentDimensions.width,
            height: currentDimensions.height,
            altText: alt,
            caption: caption || '',
            alignment
          }}
        />
      )}
    </>
  );
}; 