import React from 'react';
import { markdownToHtml } from '../../utils/markdownConverter';

interface MarkdownPreviewProps {
  markdown: string;
  className?: string;
}

export function MarkdownPreview({ markdown, className = '' }: MarkdownPreviewProps) {
  const htmlContent = markdownToHtml(markdown);

  return (
    <div
      className={`prose prose-lg max-w-none p-6 bg-white ${className}`}
      dangerouslySetInnerHTML={{ __html: htmlContent }}
      style={{
        // Custom CSS for markdown rendering
        fontSize: '16px',
        lineHeight: '1.6',
        color: '#374151',
      }}
    />
  );
}

interface MarkdownPreviewModalProps {
  markdown: string;
  isOpen: boolean;
  onClose: () => void;
  title?: string;
}

export function MarkdownPreviewModal({ markdown, isOpen, onClose, title }: MarkdownPreviewModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50" 
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {title || 'Markdown Preview'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Preview Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
          <MarkdownPreview markdown={markdown} />
        </div>
      </div>
    </div>
  );
}

interface SplitViewProps {
  leftContent: React.ReactNode;
  rightContent: React.ReactNode;
  className?: string;
}

export function SplitView({ leftContent, rightContent, className = '' }: SplitViewProps) {
  return (
    <div className={`flex h-full ${className}`}>
      {/* Left Panel - Editor */}
      <div className="flex-1 border-r border-gray-300">
        {leftContent}
      </div>
      
      {/* Right Panel - Preview */}
      <div className="flex-1 bg-gray-50">
        {rightContent}
      </div>
    </div>
  );
} 