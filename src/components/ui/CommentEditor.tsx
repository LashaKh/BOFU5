import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Upload, X, Image as ImageIcon, FileText, AtSign } from 'lucide-react';
import { MentionAutocomplete } from './MentionAutocomplete';
import { MentionableUser } from '../../lib/commentApi';

interface CommentEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  onImageSelect?: (file: File) => void;
  selectedImage?: File;
  onImageRemove?: () => void;
  showImageUpload?: boolean;
  articleId?: string;
}

export const CommentEditor: React.FC<CommentEditorProps> = ({
  value,
  onChange,
  placeholder = "Add a comment...",
  disabled = false,
  onImageSelect,
  selectedImage,
  onImageRemove,
  showImageUpload = true,
  articleId
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Mention autocomplete state
  const [mentionState, setMentionState] = useState({
    isOpen: false,
    searchTerm: '',
    cursorPosition: 0,
    mentionStart: 0,
    position: { x: 0, y: 0 }
  });

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  }, [value]);

  // Generate preview URL for selected image
  useEffect(() => {
    if (selectedImage) {
      const url = URL.createObjectURL(selectedImage);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setPreviewUrl(null);
    }
  }, [selectedImage]);

  // Calculate cursor position for autocomplete positioning
  const calculateAutocompletePosition = useCallback((cursorPos: number) => {
    const textarea = textareaRef.current;
    if (!textarea) return { x: 0, y: 0 };

    // Get textarea bounds
    const rect = textarea.getBoundingClientRect();
    
    // Calculate line and character position
    const textBeforeCursor = value.substring(0, cursorPos);
    const lines = textBeforeCursor.split('\n');
    const currentLine = lines.length - 1;
    const currentColumn = lines[lines.length - 1].length;
    
    // Estimate character width and line height
    const lineHeight = 24; // Match textarea line height
    const charWidth = 8; // Approximate character width
    
    // Calculate position
    const x = rect.left + (currentColumn * charWidth) + 10; // Small offset
    const y = rect.top + (currentLine * lineHeight) + lineHeight + 5; // Below current line
    
    return { x, y };
  }, [value]);

  // Enhanced @ detection for mentions
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const cursorPos = e.target.selectionStart || 0;
    
    onChange(newValue);

    // Debug logging
    console.log('🔍 CommentEditor input change:', {
      newValue,
      cursorPos,
      lastChar: newValue[cursorPos - 1],
      articleId
    });

    // Check for @ mention trigger
    const textBeforeCursor = newValue.substring(0, cursorPos);
    
    // Find the last @ symbol before cursor
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    
    console.log('🔍 Mention detection:', {
      textBeforeCursor,
      lastAtIndex,
      hasAt: lastAtIndex !== -1
    });
    
    if (lastAtIndex !== -1) {
      // Get text after the @ symbol
      const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);
      
      // Check if it's a valid mention context (no spaces, reasonable length)
      const isValidMention = /^[a-zA-Z0-9]*$/.test(textAfterAt) && textAfterAt.length <= 20;
      
      console.log('🔍 Mention validation:', {
        textAfterAt,
        isValidMention,
        regex: /^[a-zA-Z0-9]*$/.test(textAfterAt),
        length: textAfterAt.length
      });
      
      if (isValidMention) {
        // Calculate autocomplete position
        const position = calculateAutocompletePosition(cursorPos);
        
        console.log('✅ Opening mention autocomplete:', {
          searchTerm: textAfterAt,
          position,
          mentionStart: lastAtIndex
        });
        
        setMentionState({
          isOpen: true,
          searchTerm: textAfterAt,
          cursorPosition: cursorPos,
          mentionStart: lastAtIndex,
          position
        });
        return;
      }
    }
    
    // Close autocomplete if not in mention context
    console.log('❌ Closing mention autocomplete');
    setMentionState(prev => ({ ...prev, isOpen: false }));
  }, [onChange, calculateAutocompletePosition, articleId]);

  // Handle mention selection
  const handleMentionSelect = useCallback((user: MentionableUser) => {
    const beforeMention = value.substring(0, mentionState.mentionStart);
    const afterCursor = value.substring(mentionState.cursorPosition);
    const newValue = beforeMention + user.mention_text + ' ' + afterCursor;
    
    onChange(newValue);
    setMentionState(prev => ({ ...prev, isOpen: false }));

    // Focus back to textarea and position cursor
    setTimeout(() => {
      if (textareaRef.current) {
        const newCursorPos = beforeMention.length + user.mention_text.length + 1;
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  }, [value, mentionState, onChange]);

  // Handle file selection
  const handleFileSelect = useCallback((file: File) => {
    if (onImageSelect) {
      onImageSelect(file);
    }
  }, [onImageSelect]);

  // Handle drag and drop
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    const imageFile = files.find(file => file.type.startsWith('image/'));
    
    if (imageFile) {
      handleFileSelect(imageFile);
    }
  }, [handleFileSelect]);

  // Handle file input change
  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
    // Clear the input value
    e.target.value = '';
  }, [handleFileSelect]);

  // Handle click on file input
  const handleImageUploadClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // Handle special keys
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (mentionState.isOpen) {
      // Let MentionAutocomplete handle arrow keys and enter when open
      if (['ArrowUp', 'ArrowDown', 'Enter', 'Escape'].includes(e.key)) {
        e.preventDefault();
        return;
      }
    }
  }, [mentionState.isOpen]);

  // Close mention autocomplete when clicking outside or pressing Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mentionState.isOpen) {
        setMentionState(prev => ({ ...prev, isOpen: false }));
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [mentionState.isOpen]);

  return (
    <div className="relative">
      {/* Main Editor Container */}
      <div 
        className={`
          relative bg-white dark:bg-gray-800 border rounded-lg transition-all duration-200
          ${isDragOver 
            ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20' 
            : 'border-gray-300 dark:border-gray-600 focus-within:border-blue-400 focus-within:ring-1 focus-within:ring-blue-400'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Image Preview */}
        {selectedImage && previewUrl && (
          <div className="p-3 border-b border-gray-200 dark:border-gray-600">
            <div className="relative inline-block">
              <img
                src={previewUrl}
                alt="Preview"
                className="max-w-full max-h-32 rounded-lg object-cover"
              />
              <button
                onClick={onImageRemove}
                className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition-colors"
                disabled={disabled}
              >
                <X size={14} />
              </button>
            </div>
            <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              📸 {selectedImage.name} ({(selectedImage.size / 1024).toFixed(1)} KB)
            </div>
          </div>
        )}

        {/* Textarea */}
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            className="w-full p-3 bg-transparent border-0 focus:outline-none focus:ring-0 resize-none text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
            style={{ minHeight: '80px', maxHeight: '200px' }}
          />

          {/* Drag Overlay */}
          {isDragOver && (
            <div className="absolute inset-0 bg-blue-100 dark:bg-blue-900/30 border-2 border-dashed border-blue-400 rounded flex items-center justify-center">
              <div className="text-center">
                <Upload className="mx-auto mb-2 text-blue-500" size={32} />
                <p className="text-blue-700 dark:text-blue-300 font-medium">Drop your image here</p>
              </div>
            </div>
          )}
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between p-3 border-t border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50">
          <div className="flex items-center space-x-2">
            {/* Image Upload Button */}
            {showImageUpload && (
              <button
                onClick={handleImageUploadClick}
                disabled={disabled}
                className="flex items-center space-x-1 px-3 py-1.5 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Upload image"
              >
                <ImageIcon size={16} />
                <span className="text-sm">Image</span>
              </button>
            )}

            {/* Mention Hint */}
            <div className="flex items-center space-x-1 text-gray-500 dark:text-gray-400 text-sm">
              <AtSign size={14} />
              <span>Type @ to mention</span>
            </div>
          </div>

          {/* Character Count or other indicators */}
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {value.length > 0 && `${value.length} characters`}
          </div>
        </div>
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileInputChange}
        className="hidden"
        disabled={disabled}
      />

      {/* Mention Autocomplete */}
      <MentionAutocomplete
        isOpen={mentionState.isOpen}
        onClose={() => setMentionState(prev => ({ ...prev, isOpen: false }))}
        onSelectMention={handleMentionSelect}
        searchTerm={mentionState.searchTerm}
        position={mentionState.position}
        articleId={articleId}
      />
    </div>
  );
}; 