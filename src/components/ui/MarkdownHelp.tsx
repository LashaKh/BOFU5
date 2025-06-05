import React, { useState } from 'react';
import { HelpCircle, X, Keyboard } from 'lucide-react';
import { getMarkdownSyntaxHelp } from '../../utils/markdownShortcuts';

interface MarkdownHelpProps {
  className?: string;
}

export function MarkdownHelp({ className = '' }: MarkdownHelpProps) {
  const [isOpen, setIsOpen] = useState(false);
  const syntaxHelp = getMarkdownSyntaxHelp();

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded hover:bg-gray-200 text-gray-600"
        title="Markdown Help"
      >
        <HelpCircle size={16} />
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-1 z-50 bg-white border border-gray-200 rounded-lg shadow-lg w-96 max-h-96 overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <Keyboard size={16} className="text-gray-600" />
              <span className="font-medium text-gray-900">Markdown Syntax</span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X size={16} />
            </button>
          </div>

          {/* Content */}
          <div className="p-3">
            <div className="space-y-3">
              {syntaxHelp.map((item, index) => (
                <div key={index} className="border-b border-gray-100 last:border-0 pb-2 last:pb-0">
                  <div className="flex items-start justify-between mb-1">
                    <span className="font-mono text-sm text-blue-600 bg-blue-50 px-2 py-1 rounded">
                      {item.syntax}
                    </span>
                    <span className="text-xs text-gray-500">{item.description}</span>
                  </div>
                  <div className="font-mono text-xs text-gray-600 bg-gray-50 p-2 rounded mt-1">
                    {item.example}
                  </div>
                </div>
              ))}
            </div>

            {/* Quick Tips */}
            <div className="mt-4 pt-3 border-t border-gray-200">
              <h4 className="font-medium text-gray-900 mb-2">Quick Tips:</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Type markdown syntax and it will auto-format</li>
                <li>• Use Ctrl+B, Ctrl+I for quick formatting</li>
                <li>• Import/export .md files using toolbar buttons</li>
                <li>• Preview your content with the eye icon</li>
                <li>• Split view shows editor and preview side-by-side</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface MarkdownHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MarkdownHelpModal({ isOpen, onClose }: MarkdownHelpModalProps) {
  const syntaxHelp = getMarkdownSyntaxHelp();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50" 
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Keyboard size={20} className="text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">Markdown Syntax Guide</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        
        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(80vh-80px)] p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {syntaxHelp.map((item, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-sm text-blue-600 bg-blue-50 px-2 py-1 rounded">
                    {item.syntax}
                  </span>
                </div>
                <div className="text-sm text-gray-700 mb-2">{item.description}</div>
                <div className="font-mono text-xs text-gray-600 bg-gray-50 p-2 rounded">
                  {item.example}
                </div>
              </div>
            ))}
          </div>

          {/* Advanced Tips */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-medium text-blue-900 mb-3">Advanced Features:</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-blue-800">
              <div>
                <strong>Keyboard Shortcuts:</strong>
                <ul className="mt-1 space-y-1">
                  <li>• Ctrl+B - Bold</li>
                  <li>• Ctrl+I - Italic</li>
                  <li>• Ctrl+U - Underline</li>
                  <li>• Ctrl+K - Link</li>
                </ul>
              </div>
              <div>
                <strong>Auto-formatting:</strong>
                <ul className="mt-1 space-y-1">
                  <li>• Type # + space for headings</li>
                  <li>• Type - + space for lists</li>
                  <li>• Type {'>'} + space for quotes</li>
                  <li>• Type ``` + space for code</li>
                </ul>
              </div>
              <div>
                <strong>View Modes:</strong>
                <ul className="mt-1 space-y-1">
                  <li>• Editor - Rich text editing</li>
                  <li>• Preview - Markdown rendering</li>
                  <li>• Split - Side-by-side view</li>
                </ul>
              </div>
              <div>
                <strong>File Operations:</strong>
                <ul className="mt-1 space-y-1">
                  <li>• Import .md files</li>
                  <li>• Export as markdown</li>
                  <li>• Drag & drop support</li>
                  <li>• Auto-save functionality</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
