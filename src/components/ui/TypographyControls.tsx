import React, { useState, useRef, useEffect } from 'react';
import { Editor } from '@tiptap/react';
import { 
  Type, ChevronDown, Indent, Outdent, 
  MoreHorizontal, Columns, AlignLeft 
} from 'lucide-react';

interface TypographyControlsProps {
  editor: Editor;
  className?: string;
}

export const TypographyControls: React.FC<TypographyControlsProps> = ({
  editor,
  className = ''
}) => {
  const [isSpacingOpen, setIsSpacingOpen] = useState(false);
  const [isIndentOpen, setIsIndentOpen] = useState(false);
  const [isLayoutOpen, setIsLayoutOpen] = useState(false);
  
  const spacingRef = useRef<HTMLDivElement>(null);
  const indentRef = useRef<HTMLDivElement>(null);
  const layoutRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (spacingRef.current && !spacingRef.current.contains(event.target as Node)) {
        setIsSpacingOpen(false);
      }
      if (indentRef.current && !indentRef.current.contains(event.target as Node)) {
        setIsIndentOpen(false);
      }
      if (layoutRef.current && !layoutRef.current.contains(event.target as Node)) {
        setIsLayoutOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLineHeight = (value: string) => {
    editor.chain().focus().setLineHeight(value).run();
    setIsSpacingOpen(false);
  };

  const handleLetterSpacing = (value: string) => {
    editor.chain().focus().setLetterSpacing(value).run();
    setIsSpacingOpen(false);
  };

  const handleParagraphSpacing = (property: 'marginTop' | 'marginBottom', value: string) => {
    const command = property === 'marginTop' ? 'setMarginTop' : 'setMarginBottom';
    editor.chain().focus()[command](value).run();
    setIsSpacingOpen(false);
  };

  const handleIndentation = (value: string) => {
    editor.chain().focus().setTextIndent(value).run();
    setIsIndentOpen(false);
  };

  const handleColumnLayout = (columns: number) => {
    const columnValue = columns === 1 ? 'none' : `${columns}`;
    editor.chain().focus().setColumns(columnValue).run();
    setIsLayoutOpen(false);
  };

  const getCurrentLineHeight = () => {
    const attrs = editor.getAttributes('paragraph');
    return attrs.lineHeight || '1.5';
  };

  const getCurrentLetterSpacing = () => {
    const attrs = editor.getAttributes('textStyle');
    return attrs.letterSpacing || 'normal';
  };

  const getCurrentIndent = () => {
    const attrs = editor.getAttributes('paragraph');
    return attrs.textIndent || '0';
  };

  const spacingPresets = [
    { label: 'Compact', lineHeight: '1.2', letterSpacing: 'normal' },
    { label: 'Normal', lineHeight: '1.5', letterSpacing: 'normal' },
    { label: 'Relaxed', lineHeight: '1.8', letterSpacing: '0.025em' },
    { label: 'Loose', lineHeight: '2.0', letterSpacing: '0.05em' },
  ];

  const lineHeightOptions = [
    { label: 'Tight', value: '1.2' },
    { label: 'Snug', value: '1.375' },
    { label: 'Normal', value: '1.5' },
    { label: 'Relaxed', value: '1.625' },
    { label: 'Loose', value: '2' },
    { label: 'Custom', value: 'custom' },
  ];

  const letterSpacingOptions = [
    { label: 'Tighter', value: '-0.05em' },
    { label: 'Tight', value: '-0.025em' },
    { label: 'Normal', value: 'normal' },
    { label: 'Wide', value: '0.025em' },
    { label: 'Wider', value: '0.05em' },
    { label: 'Widest', value: '0.1em' },
  ];

  const indentOptions = [
    { label: 'None', value: '0' },
    { label: 'Small', value: '1rem' },
    { label: 'Medium', value: '2rem' },
    { label: 'Large', value: '3rem' },
    { label: 'Custom', value: 'custom' },
  ];

  const marginOptions = [
    { label: 'None', value: '0' },
    { label: 'Small', value: '0.5rem' },
    { label: 'Medium', value: '1rem' },
    { label: 'Large', value: '1.5rem' },
    { label: 'Extra Large', value: '2rem' },
  ];

  return (
    <div className={`flex items-center space-x-1 ${className}`}>
      {/* Text Spacing Dropdown */}
      <div ref={spacingRef} className="relative">
        <button
          onClick={() => setIsSpacingOpen(!isSpacingOpen)}
          className="p-2 rounded hover:bg-gray-200 text-gray-600"
          title="Text Spacing"
        >
          <Type size={16} />
          <ChevronDown size={12} className="ml-1" />
        </button>
        
        {isSpacingOpen && (
          <div className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50 min-w-64">
            <div className="p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Text Spacing</h3>
              
              {/* Spacing Presets */}
              <div className="mb-4">
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  Presets
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {spacingPresets.map((preset) => (
                    <button
                      key={preset.label}
                      onClick={() => {
                        handleLineHeight(preset.lineHeight);
                        handleLetterSpacing(preset.letterSpacing);
                      }}
                      className="p-2 text-xs border border-gray-200 rounded hover:bg-gray-50"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Line Height */}
              <div className="mb-4">
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  Line Height: {getCurrentLineHeight()}
                </label>
                <div className="space-y-1">
                  {lineHeightOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => handleLineHeight(option.value)}
                      className={`w-full text-left px-2 py-1 text-xs rounded hover:bg-gray-100 ${
                        getCurrentLineHeight() === option.value ? 'bg-blue-100 text-blue-700' : ''
                      }`}
                    >
                      {option.label} ({option.value})
                    </button>
                  ))}
                </div>
              </div>

              {/* Letter Spacing */}
              <div className="mb-4">
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  Letter Spacing: {getCurrentLetterSpacing()}
                </label>
                <div className="space-y-1">
                  {letterSpacingOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => handleLetterSpacing(option.value)}
                      className={`w-full text-left px-2 py-1 text-xs rounded hover:bg-gray-100 ${
                        getCurrentLetterSpacing() === option.value ? 'bg-blue-100 text-blue-700' : ''
                      }`}
                    >
                      {option.label} ({option.value})
                    </button>
                  ))}
                </div>
              </div>

              {/* Paragraph Spacing */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  Paragraph Spacing
                </label>
                <div className="space-y-2">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Top Margin</label>
                    <div className="flex space-x-1">
                      {marginOptions.map((option) => (
                        <button
                          key={`top-${option.value}`}
                          onClick={() => handleParagraphSpacing('marginTop', option.value)}
                          className="px-2 py-1 text-xs border border-gray-200 rounded hover:bg-gray-50"
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Bottom Margin</label>
                    <div className="flex space-x-1">
                      {marginOptions.map((option) => (
                        <button
                          key={`bottom-${option.value}`}
                          onClick={() => handleParagraphSpacing('marginBottom', option.value)}
                          className="px-2 py-1 text-xs border border-gray-200 rounded hover:bg-gray-50"
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Indentation Controls */}
      <div ref={indentRef} className="relative">
        <button
          onClick={() => setIsIndentOpen(!isIndentOpen)}
          className="p-2 rounded hover:bg-gray-200 text-gray-600"
          title="Text Indentation"
        >
          <Indent size={16} />
          <ChevronDown size={12} className="ml-1" />
        </button>
        
        {isIndentOpen && (
          <div className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50 min-w-48">
            <div className="p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Text Indentation</h3>
              
              {/* First Line Indent */}
              <div className="mb-4">
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  First Line Indent: {getCurrentIndent()}
                </label>
                <div className="space-y-1">
                  {indentOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => handleIndentation(option.value)}
                      className={`w-full text-left px-2 py-1 text-xs rounded hover:bg-gray-100 ${
                        getCurrentIndent() === option.value ? 'bg-blue-100 text-blue-700' : ''
                      }`}
                    >
                      {option.label} ({option.value})
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="border-t border-gray-200 pt-3">
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  Quick Actions
                </label>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleIndentation('0')}
                    className="flex items-center px-2 py-1 text-xs border border-gray-200 rounded hover:bg-gray-50"
                  >
                    <Outdent size={12} className="mr-1" />
                    Remove
                  </button>
                  <button
                    onClick={() => handleIndentation('2rem')}
                    className="flex items-center px-2 py-1 text-xs border border-gray-200 rounded hover:bg-gray-50"
                  >
                    <Indent size={12} className="mr-1" />
                    Standard
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Layout Controls */}
      <div ref={layoutRef} className="relative">
        <button
          onClick={() => setIsLayoutOpen(!isLayoutOpen)}
          className="p-2 rounded hover:bg-gray-200 text-gray-600"
          title="Layout Options"
        >
          <Columns size={16} />
          <ChevronDown size={12} className="ml-1" />
        </button>
        
        {isLayoutOpen && (
          <div className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50 min-w-48">
            <div className="p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Layout Options</h3>
              
              {/* Column Layout */}
              <div className="mb-4">
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  Column Layout
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[1, 2, 3].map((columns) => (
                    <button
                      key={columns}
                      onClick={() => handleColumnLayout(columns)}
                      className="p-2 text-xs border border-gray-200 rounded hover:bg-gray-50 flex flex-col items-center"
                    >
                      <div className="flex space-x-1 mb-1">
                        {Array.from({ length: columns }).map((_, i) => (
                          <div key={i} className="w-2 h-4 bg-gray-300 rounded-sm" />
                        ))}
                      </div>
                      {columns === 1 ? 'Single' : `${columns} Col`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Text Direction */}
              <div className="border-t border-gray-200 pt-3">
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  Text Direction
                </label>
                <div className="flex space-x-2">
                  <button
                    onClick={() => editor.chain().focus().setTextDirection('ltr').run()}
                    className="flex items-center px-2 py-1 text-xs border border-gray-200 rounded hover:bg-gray-50"
                  >
                    <AlignLeft size={12} className="mr-1" />
                    LTR
                  </button>
                  <button
                    onClick={() => editor.chain().focus().setTextDirection('rtl').run()}
                    className="flex items-center px-2 py-1 text-xs border border-gray-200 rounded hover:bg-gray-50"
                  >
                    <AlignLeft size={12} className="mr-1 transform scale-x-[-1]" />
                    RTL
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}; 