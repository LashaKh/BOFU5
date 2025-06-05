import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, AlignLeft, AlignCenter, AlignRight, AlignJustify } from 'lucide-react';

interface AlignmentDropdownProps {
  currentAlignment?: string;
  onAlignmentSelect: (alignment: string) => void;
  className?: string;
}

const ALIGNMENTS = [
  { name: 'Left', value: 'left', icon: AlignLeft },
  { name: 'Center', value: 'center', icon: AlignCenter },
  { name: 'Right', value: 'right', icon: AlignRight },
  { name: 'Justify', value: 'justify', icon: AlignJustify },
];

export function AlignmentDropdown({ currentAlignment = 'left', onAlignmentSelect, className = '' }: AlignmentDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedAlignment = ALIGNMENTS.find(align => align.value === currentAlignment) || ALIGNMENTS[0];

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

  const handleAlignmentSelect = (alignment: string) => {
    onAlignmentSelect(alignment);
    setIsOpen(false);
  };

  const IconComponent = selectedAlignment.icon;

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`p-2 rounded hover:bg-secondary-700 transition-colors text-gray-400 flex items-center gap-1 ${
          currentAlignment !== 'left' ? 'bg-primary-500/20 text-primary-400' : ''
        }`}
        title={`Align ${selectedAlignment.name}`}
      >
        <IconComponent size={16} />
        <ChevronDown size={12} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-2 min-w-[120px]">
          <div className="text-xs font-medium text-gray-700 mb-2 px-2">
            Text Alignment
          </div>
          {ALIGNMENTS.map((alignment) => {
            const AlignIcon = alignment.icon;
            return (
              <button
                key={alignment.value}
                onClick={() => handleAlignmentSelect(alignment.value)}
                className={`w-full flex items-center gap-2 px-2 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded ${
                  currentAlignment === alignment.value ? 'bg-primary-50 text-primary-700' : ''
                }`}
              >
                <AlignIcon size={16} />
                <span>{alignment.name}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
} 