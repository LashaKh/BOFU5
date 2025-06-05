import React, { useState } from 'react';
import { Editor } from '@tiptap/react';
import { 
  Plus, Minus, Merge, Split, Palette, MoreHorizontal,
  ArrowUp, ArrowDown, ArrowLeft, ArrowRight,
  Trash2, Copy, Settings
} from 'lucide-react';

interface TableContextMenuProps {
  editor: Editor;
  isOpen: boolean;
  onClose: () => void;
  position: { x: number; y: number };
}

export const TableContextMenu: React.FC<TableContextMenuProps> = ({
  editor,
  isOpen,
  onClose,
  position
}) => {
  const [showColorPicker, setShowColorPicker] = useState(false);

  if (!isOpen) return null;

  const handleAction = (action: () => void) => {
    action();
    onClose();
  };

  const cellColors = [
    { name: 'Default', color: 'transparent' },
    { name: 'Light Gray', color: '#f3f4f6' },
    { name: 'Light Blue', color: '#dbeafe' },
    { name: 'Light Green', color: '#dcfce7' },
    { name: 'Light Yellow', color: '#fef3c7' },
    { name: 'Light Red', color: '#fee2e2' },
    { name: 'Light Purple', color: '#e9d5ff' },
    { name: 'Light Pink', color: '#fce7f3' },
  ];

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-40" 
        onClick={onClose}
      />
      
      {/* Context Menu */}
      <div 
        className="fixed bg-white border border-gray-300 rounded-lg shadow-lg py-2 z-50 min-w-48"
        style={{
          left: position.x,
          top: position.y,
        }}
      >
        {/* Row Operations */}
        <div className="px-2 py-1">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
            Row Operations
          </div>
          <button
            onClick={() => handleAction(() => editor.chain().focus().addRowBefore().run())}
            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded flex items-center"
          >
            <ArrowUp size={14} className="mr-2" />
            Insert Row Above
          </button>
          <button
            onClick={() => handleAction(() => editor.chain().focus().addRowAfter().run())}
            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded flex items-center"
          >
            <ArrowDown size={14} className="mr-2" />
            Insert Row Below
          </button>
          <button
            onClick={() => handleAction(() => editor.chain().focus().deleteRow().run())}
            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded flex items-center text-red-600"
          >
            <Trash2 size={14} className="mr-2" />
            Delete Row
          </button>
        </div>

        <div className="border-t border-gray-200 my-1" />

        {/* Column Operations */}
        <div className="px-2 py-1">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
            Column Operations
          </div>
          <button
            onClick={() => handleAction(() => editor.chain().focus().addColumnBefore().run())}
            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded flex items-center"
          >
            <ArrowLeft size={14} className="mr-2" />
            Insert Column Left
          </button>
          <button
            onClick={() => handleAction(() => editor.chain().focus().addColumnAfter().run())}
            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded flex items-center"
          >
            <ArrowRight size={14} className="mr-2" />
            Insert Column Right
          </button>
          <button
            onClick={() => handleAction(() => editor.chain().focus().deleteColumn().run())}
            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded flex items-center text-red-600"
          >
            <Trash2 size={14} className="mr-2" />
            Delete Column
          </button>
        </div>

        <div className="border-t border-gray-200 my-1" />

        {/* Cell Operations */}
        <div className="px-2 py-1">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
            Cell Operations
          </div>
          <button
            onClick={() => handleAction(() => editor.chain().focus().mergeCells().run())}
            disabled={!editor.can().mergeCells()}
            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Merge size={14} className="mr-2" />
            Merge Cells
          </button>
          <button
            onClick={() => handleAction(() => editor.chain().focus().splitCell().run())}
            disabled={!editor.can().splitCell()}
            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Split size={14} className="mr-2" />
            Split Cell
          </button>
          <button
            onClick={() => handleAction(() => editor.chain().focus().toggleHeaderRow().run())}
            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded flex items-center"
          >
            <Settings size={14} className="mr-2" />
            Toggle Header Row
          </button>
          <button
            onClick={() => handleAction(() => editor.chain().focus().toggleHeaderColumn().run())}
            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded flex items-center"
          >
            <Settings size={14} className="mr-2" />
            Toggle Header Column
          </button>
        </div>

        <div className="border-t border-gray-200 my-1" />

        {/* Cell Styling */}
        <div className="px-2 py-1">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
            Cell Styling
          </div>
          <div className="relative">
            <button
              onClick={() => setShowColorPicker(!showColorPicker)}
              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded flex items-center"
            >
              <Palette size={14} className="mr-2" />
              Cell Background
            </button>
            
            {showColorPicker && (
              <div className="absolute left-full top-0 ml-2 bg-white border border-gray-300 rounded-lg shadow-lg p-3 z-10">
                <div className="text-xs font-semibold text-gray-500 mb-2">Background Colors</div>
                <div className="grid grid-cols-2 gap-2">
                  {cellColors.map((colorOption) => (
                    <button
                      key={colorOption.name}
                      onClick={() => {
                        editor.chain().focus().setCellAttribute('style', 
                          colorOption.color === 'transparent' 
                            ? '' 
                            : `background-color: ${colorOption.color}`
                        ).run();
                        setShowColorPicker(false);
                        onClose();
                      }}
                      className="flex items-center p-2 hover:bg-gray-100 rounded text-xs"
                    >
                      <div 
                        className="w-4 h-4 border border-gray-300 rounded mr-2"
                        style={{ backgroundColor: colorOption.color }}
                      />
                      {colorOption.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-gray-200 my-1" />

        {/* Table Operations */}
        <div className="px-2 py-1">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
            Table Operations
          </div>
          <button
            onClick={() => handleAction(() => editor.chain().focus().deleteTable().run())}
            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded flex items-center text-red-600"
          >
            <Trash2 size={14} className="mr-2" />
            Delete Table
          </button>
        </div>
      </div>
    </>
  );
}; 