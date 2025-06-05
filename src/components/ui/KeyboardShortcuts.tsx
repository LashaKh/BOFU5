import React, { useState, useEffect } from 'react';
import { X, Keyboard, Command, Search, Hash, Bold, Italic, Underline, Type } from 'lucide-react';

interface KeyboardShortcutsProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ShortcutGroup {
  title: string;
  icon: React.ReactNode;
  shortcuts: Array<{
    key: string;
    description: string;
    category?: string;
  }>;
}

export const KeyboardShortcuts: React.FC<KeyboardShortcutsProps> = ({
  isOpen,
  onClose
}) => {
  const [selectedGroup, setSelectedGroup] = useState('text-formatting');

  // Detect operating system for correct modifier key display
  const isMac = typeof window !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
  const cmdKey = isMac ? '⌘' : 'Ctrl';
  const altKey = isMac ? '⌥' : 'Alt';

  const shortcutGroups: ShortcutGroup[] = [
    {
      title: 'Text Formatting',
      icon: <Bold size={16} />,
      shortcuts: [
        { key: `${cmdKey} + B`, description: 'Bold text' },
        { key: `${cmdKey} + I`, description: 'Italic text' },
        { key: `${cmdKey} + U`, description: 'Underline text' },
        { key: `${cmdKey} + Shift + S`, description: 'Strikethrough text' },
        { key: `${cmdKey} + .`, description: 'Superscript' },
        { key: `${cmdKey} + ,`, description: 'Subscript' },
        { key: `${cmdKey} + E`, description: 'Center align' },
        { key: `${cmdKey} + L`, description: 'Left align' },
        { key: `${cmdKey} + R`, description: 'Right align' },
        { key: `${cmdKey} + J`, description: 'Justify text' }
      ]
    },
    {
      title: 'Headings & Structure',
      icon: <Type size={16} />,
      shortcuts: [
        { key: `${cmdKey} + ${altKey} + 1`, description: 'Heading 1' },
        { key: `${cmdKey} + ${altKey} + 2`, description: 'Heading 2' },
        { key: `${cmdKey} + ${altKey} + 3`, description: 'Heading 3' },
        { key: `${cmdKey} + Shift + 8`, description: 'Bullet list' },
        { key: `${cmdKey} + Shift + 7`, description: 'Numbered list' },
        { key: `${cmdKey} + Shift + 9`, description: 'Task list' },
        { key: `${cmdKey} + Shift + .`, description: 'Blockquote' },
        { key: `${cmdKey} + Enter`, description: 'Hard break' },
        { key: `${cmdKey} + Shift + \\`, description: 'Horizontal rule' }
      ]
    },
    {
      title: 'Lists & Indentation',
      icon: <span className="text-lg">•</span>,
      shortcuts: [
        { key: 'Tab', description: 'Increase list indentation' },
        { key: 'Shift + Tab', description: 'Decrease list indentation' },
        { key: `${cmdKey} + ]`, description: 'Indent text' },
        { key: `${cmdKey} + [`, description: 'Outdent text' },
        { key: 'Enter', description: 'New list item' },
        { key: 'Shift + Enter', description: 'Line break in list' },
        { key: `${cmdKey} + Shift + Enter`, description: 'Exit list' }
      ]
    },
    {
      title: 'Code & Special',
      icon: <span className="font-mono text-sm">{'{}'}</span>,
      shortcuts: [
        { key: `${cmdKey} + \``, description: 'Inline code' },
        { key: `${cmdKey} + ${altKey} + C`, description: 'Code block' },
        { key: `${cmdKey} + K`, description: 'Insert/edit link' },
        { key: `${cmdKey} + Shift + I`, description: 'Insert image' },
        { key: `${cmdKey} + ${altKey} + T`, description: 'Insert table' },
        { key: `${cmdKey} + H`, description: 'Insert special characters' }
      ]
    },
    {
      title: 'Navigation & Search',
      icon: <Search size={16} />,
      shortcuts: [
        { key: `${cmdKey} + F`, description: 'Find and replace' },
        { key: 'F3', description: 'Find next' },
        { key: 'Shift + F3', description: 'Find previous' },
        { key: `${cmdKey} + G`, description: 'Go to line' },
        { key: `${cmdKey} + Home`, description: 'Go to document start' },
        { key: `${cmdKey} + End`, description: 'Go to document end' },
        { key: `${cmdKey} + A`, description: 'Select all' }
      ]
    },
    {
      title: 'Editor Actions',
      icon: <Command size={16} />,
      shortcuts: [
        { key: `${cmdKey} + Z`, description: 'Undo last action', category: 'Single step undo' },
        { key: `${cmdKey} + Y`, description: 'Redo last undone action (Windows)', category: 'Single step redo' },
        { key: `${cmdKey} + Shift + Z`, description: 'Redo last undone action (Mac)', category: 'Single step redo' },
        { key: 'Click History Icon', description: 'Open history navigation panel', category: 'Multi-step undo/redo' },
        { key: `${cmdKey} + S`, description: 'Save document' },
        { key: `${cmdKey} + P`, description: 'Print/Export' },
        { key: `${cmdKey} + /`, description: 'Show keyboard shortcuts' },
        { key: 'Esc', description: 'Close modal/menu' }
      ]
    },
    {
      title: 'Table Operations',
      icon: <span className="text-lg">⊞</span>,
      shortcuts: [
        { key: 'Tab', description: 'Next table cell' },
        { key: 'Shift + Tab', description: 'Previous table cell' },
        { key: `${cmdKey} + ${altKey} + T`, description: 'Insert table' },
        { key: 'Right-click', description: 'Table context menu' },
        { key: `${cmdKey} + Shift + Right`, description: 'Add column right' },
        { key: `${cmdKey} + Shift + Left`, description: 'Add column left' },
        { key: `${cmdKey} + Shift + Down`, description: 'Add row below' },
        { key: `${cmdKey} + Shift + Up`, description: 'Add row above' }
      ]
    },
    {
      title: 'View & Layout',
      icon: <span className="text-lg">⊞</span>,
      shortcuts: [
        { key: `${cmdKey} + 1`, description: 'Editor view' },
        { key: `${cmdKey} + 2`, description: 'Preview view' },
        { key: `${cmdKey} + 3`, description: 'Split view' },
        { key: `${cmdKey} + Shift + P`, description: 'Full preview modal' },
        { key: `${cmdKey} + ${altKey} + M`, description: 'Export markdown' },
        { key: `${cmdKey} + ${altKey} + I`, description: 'Import markdown' }
      ]
    }
  ];

  // Close modal on Escape key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const selectedGroupData = shortcutGroups.find(group => 
    group.title.toLowerCase().replace(/\s+/g, '-') === selectedGroup
  ) || shortcutGroups[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-5/6 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <Keyboard size={20} className="text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">Keyboard Shortcuts</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-gray-100 text-gray-500"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex flex-1 min-h-0">
          {/* Category Sidebar */}
          <div className="w-64 border-r border-gray-200 bg-gray-50">
            <div className="p-2">
              {shortcutGroups.map((group) => {
                const groupId = group.title.toLowerCase().replace(/\s+/g, '-');
                return (
                  <button
                    key={groupId}
                    onClick={() => setSelectedGroup(groupId)}
                    className={`w-full flex items-center space-x-3 px-3 py-2 rounded text-sm ${
                      selectedGroup === groupId
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {group.icon}
                    <span>{group.title}</span>
                    <span className="ml-auto text-xs text-gray-500">
                      {group.shortcuts.length}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Shortcuts List */}
          <div className="flex-1 flex flex-col">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-gray-900 flex items-center space-x-2">
                  {selectedGroupData.icon}
                  <span>{selectedGroupData.title}</span>
                </h3>
                <div className="text-sm text-gray-500">
                  {selectedGroupData.shortcuts.length} shortcuts
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-4">
              <div className="space-y-3">
                {selectedGroupData.shortcuts.map((shortcut, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">
                        {shortcut.description}
                      </div>
                      {shortcut.category && (
                        <div className="text-xs text-gray-500 mt-1">
                          {shortcut.category}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center space-x-1">
                      {shortcut.key.split(' + ').map((key, keyIndex) => (
                        <React.Fragment key={keyIndex}>
                          {keyIndex > 0 && (
                            <span className="text-gray-400 text-sm">+</span>
                          )}
                          <kbd className="px-2 py-1 bg-white border border-gray-300 rounded text-xs font-mono shadow-sm">
                            {key}
                          </kbd>
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div className="flex items-center space-x-4">
              <span>💡 Tip: Press {cmdKey} + / anytime to open this help</span>
            </div>
            <div className="flex items-center space-x-4">
              <span>Total shortcuts: {shortcutGroups.reduce((sum, group) => sum + group.shortcuts.length, 0)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}; 