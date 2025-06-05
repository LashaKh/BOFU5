import React, { useEffect, useRef } from 'react';

interface CommentEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export const CommentEditor: React.FC<CommentEditorProps> = ({
  value,
  onChange,
  placeholder = "Add a comment...",
  disabled = false
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Allow Shift+Enter for new lines, but prevent other combinations
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      // Could trigger submit here if needed
    }
  };

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className={`w-full p-2 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm placeholder-gray-400 min-h-[80px] max-h-[200px] ${
          disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'
        }`}
        maxLength={1000}
      />
      <div className="absolute bottom-2 right-2 text-xs text-gray-400 pointer-events-none">
        {value.length}/1000
      </div>
    </div>
  );
}; 