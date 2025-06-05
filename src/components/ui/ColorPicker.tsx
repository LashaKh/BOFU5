import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Palette } from 'lucide-react';

interface ColorPickerProps {
  currentColor?: string;
  onColorSelect: (color: string) => void;
  type: 'text' | 'highlight';
  className?: string;
}

const TEXT_COLORS = [
  { name: 'Default', value: '' },
  { name: 'Black', value: '#000000' },
  { name: 'Dark Gray', value: '#374151' },
  { name: 'Gray', value: '#6B7280' },
  { name: 'Light Gray', value: '#9CA3AF' },
  { name: 'Red', value: '#DC2626' },
  { name: 'Orange', value: '#EA580C' },
  { name: 'Amber', value: '#D97706' },
  { name: 'Yellow', value: '#CA8A04' },
  { name: 'Green', value: '#16A34A' },
  { name: 'Emerald', value: '#059669' },
  { name: 'Teal', value: '#0D9488' },
  { name: 'Cyan', value: '#0891B2' },
  { name: 'Blue', value: '#2563EB' },
  { name: 'Indigo', value: '#4F46E5' },
  { name: 'Purple', value: '#7C3AED' },
  { name: 'Pink', value: '#DB2777' },
  { name: 'Rose', value: '#E11D48' },
];

const HIGHLIGHT_COLORS = [
  { name: 'None', value: '' },
  { name: 'Yellow', value: '#FEF08A' },
  { name: 'Green', value: '#BBF7D0' },
  { name: 'Blue', value: '#BFDBFE' },
  { name: 'Purple', value: '#DDD6FE' },
  { name: 'Pink', value: '#FBCFE8' },
  { name: 'Orange', value: '#FED7AA' },
  { name: 'Red', value: '#FECACA' },
  { name: 'Gray', value: '#F3F4F6' },
];

export function ColorPicker({ currentColor = '', onColorSelect, type, className = '' }: ColorPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const colors = type === 'text' ? TEXT_COLORS : HIGHLIGHT_COLORS;
  const selectedColor = colors.find(color => color.value === currentColor);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleColorSelect = (color: string) => {
    onColorSelect(color);
    setIsOpen(false);
  };

  const getPreviewStyle = () => {
    if (type === 'text') {
      return {
        color: currentColor || '#374151',
        backgroundColor: 'transparent'
      };
    } else {
      return {
        color: '#374151',
        backgroundColor: currentColor || 'transparent'
      };
    }
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`p-2 rounded hover:bg-secondary-700 transition-colors text-gray-400 flex items-center gap-1 ${
          currentColor ? 'bg-primary-500/20 text-primary-400' : ''
        }`}
        title={type === 'text' ? 'Text Color' : 'Highlight Color'}
      >
        <div className="flex items-center gap-1">
          <Palette size={16} />
          <div
            className="w-3 h-3 rounded border border-gray-500"
            style={getPreviewStyle()}
          />
          <ChevronDown size={12} />
        </div>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-3 min-w-[200px]">
          <div className="text-xs font-medium text-gray-700 mb-2">
            {type === 'text' ? 'Text Color' : 'Highlight Color'}
          </div>
          <div className="grid grid-cols-6 gap-1">
            {colors.map((color) => (
              <button
                key={color.name}
                onClick={() => handleColorSelect(color.value)}
                className={`w-6 h-6 rounded border border-gray-300 hover:scale-110 transition-transform ${
                  currentColor === color.value ? 'ring-2 ring-primary-500 ring-offset-1' : ''
                }`}
                style={{
                  backgroundColor: color.value || (type === 'text' ? '#374151' : 'transparent'),
                  color: type === 'text' ? '#ffffff' : '#374151'
                }}
                title={color.name}
              >
                {!color.value && (
                  <div className="w-full h-full flex items-center justify-center text-xs">
                    {type === 'text' ? 'A' : '×'}
                  </div>
                )}
              </button>
            ))}
          </div>
          <div className="mt-2 pt-2 border-t border-gray-200">
            <div className="text-xs text-gray-500">
              {selectedColor?.name || 'Custom'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 