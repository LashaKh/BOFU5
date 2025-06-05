import React, { useState, useEffect, useRef } from 'react';
import { Editor } from '@tiptap/react';
import { ExternalLink, Edit, Trash2, Copy, Check } from 'lucide-react';

interface LinkTooltipProps {
  editor: Editor;
  isVisible: boolean;
  linkData?: {
    href: string;
    text: string;
    target?: string;
    title?: string;
  };
  position: { x: number; y: number };
  onEdit: () => void;
  onClose: () => void;
}

export const LinkTooltip: React.FC<LinkTooltipProps> = ({
  editor,
  isVisible,
  linkData,
  position,
  onEdit,
  onClose
}) => {
  const [copied, setCopied] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (copied) {
      const timer = setTimeout(() => setCopied(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [copied]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (tooltipRef.current && !tooltipRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isVisible) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isVisible, onClose]);

  const handleCopy = async () => {
    if (linkData?.href) {
      try {
        await navigator.clipboard.writeText(linkData.href);
        setCopied(true);
      } catch (error) {
        console.error('Failed to copy link:', error);
      }
    }
  };

  const handleRemove = () => {
    editor.chain().focus().extendMarkRange('link').unsetLink().run();
    onClose();
  };

  const handleOpen = () => {
    if (linkData?.href) {
      const target = linkData.target || '_self';
      if (target === '_blank') {
        window.open(linkData.href, '_blank', 'noopener,noreferrer');
      } else {
        window.location.href = linkData.href;
      }
    }
  };

  const formatUrl = (url: string): string => {
    if (!url) return '';
    
    // Remove protocol for display
    return url.replace(/^https?:\/\//, '').replace(/^mailto:/, '').replace(/^tel:/, '');
  };

  const getUrlType = (url: string): 'web' | 'email' | 'phone' | 'other' => {
    if (!url) return 'other';
    
    if (url.startsWith('mailto:')) return 'email';
    if (url.startsWith('tel:')) return 'phone';
    if (url.startsWith('http')) return 'web';
    
    return 'other';
  };

  if (!isVisible || !linkData) return null;

  const urlType = getUrlType(linkData.href);
  const displayUrl = formatUrl(linkData.href);

  return (
    <div
      ref={tooltipRef}
      className="fixed bg-white border border-gray-300 rounded-lg shadow-lg z-50 overflow-hidden"
      style={{
        left: Math.min(position.x, window.innerWidth - 300), // Prevent overflow
        top: position.y - 10,
        maxWidth: '300px',
      }}
    >
      {/* Link Info */}
      <div className="p-3 border-b border-gray-200">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-gray-900 truncate">
              {linkData.text}
            </div>
            <div className="text-xs text-gray-500 truncate mt-1" title={linkData.href}>
              {displayUrl}
            </div>
            {linkData.title && (
              <div className="text-xs text-gray-400 mt-1 italic">
                "{linkData.title}"
              </div>
            )}
          </div>
          {linkData.target === '_blank' && (
            <ExternalLink size={12} className="text-gray-400 ml-2 flex-shrink-0" />
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="p-2">
        <div className="flex items-center justify-between">
          <div className="flex space-x-1">
            {/* Open Link */}
            <button
              onClick={handleOpen}
              className="flex items-center px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded"
              title="Open link"
            >
              <ExternalLink size={12} className="mr-1" />
              Open
            </button>

            {/* Copy Link */}
            <button
              onClick={handleCopy}
              className="flex items-center px-2 py-1 text-xs text-gray-600 hover:bg-gray-50 rounded"
              title="Copy link"
            >
              {copied ? (
                <>
                  <Check size={12} className="mr-1 text-green-600" />
                  <span className="text-green-600">Copied</span>
                </>
              ) : (
                <>
                  <Copy size={12} className="mr-1" />
                  Copy
                </>
              )}
            </button>
          </div>

          <div className="flex space-x-1">
            {/* Edit Link */}
            <button
              onClick={onEdit}
              className="flex items-center px-2 py-1 text-xs text-gray-600 hover:bg-gray-50 rounded"
              title="Edit link"
            >
              <Edit size={12} className="mr-1" />
              Edit
            </button>

            {/* Remove Link */}
            <button
              onClick={handleRemove}
              className="flex items-center px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded"
              title="Remove link"
            >
              <Trash2 size={12} className="mr-1" />
              Remove
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}; 