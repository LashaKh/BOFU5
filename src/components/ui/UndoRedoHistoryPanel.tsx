import React, { useState, useEffect } from 'react';
import { Editor } from '@tiptap/react';
import { Undo, Redo, History, ChevronDown } from 'lucide-react';

interface UndoRedoHistoryPanelProps {
  editor: Editor | null;
}

interface HistoryState {
  canUndo: boolean;
  canRedo: boolean;
  undoDepth: number;
  redoDepth: number;
}

export const UndoRedoHistoryPanel: React.FC<UndoRedoHistoryPanelProps> = ({ editor }) => {
  const [historyState, setHistoryState] = useState<HistoryState>({
    canUndo: false,
    canRedo: false,
    undoDepth: 0,
    redoDepth: 0
  });
  
  const [showHistoryDropdown, setShowHistoryDropdown] = useState(false);

  // Update history state when editor changes
  useEffect(() => {
    if (!editor) return;

    const updateHistoryState = () => {
      const canUndo = editor.can().undo();
      const canRedo = editor.can().redo();
      
      // Get history state from the editor
      const { state } = editor;
      const historyPlugin = state.plugins.find(plugin => {
        // Check if this is the history plugin by looking for the history key
        const key = plugin.spec?.key;
        return key && (key.toString() === 'history' || typeof key === 'object' && key.constructor.name === 'PluginKey');
      });
      
      let undoDepth = 0;
      let redoDepth = 0;
      
      if (historyPlugin) {
        const historyState = historyPlugin.getState(state);
        if (historyState && typeof historyState === 'object') {
          undoDepth = (historyState as any).done?.eventCount || 0;
          redoDepth = (historyState as any).undone?.eventCount || 0;
        }
      }

      setHistoryState({
        canUndo,
        canRedo,
        undoDepth,
        redoDepth
      });
    };

    // Update immediately
    updateHistoryState();

    // Listen for editor updates
    const handleUpdate = () => {
      updateHistoryState();
    };

    editor.on('update', handleUpdate);
    editor.on('transaction', handleUpdate);

    return () => {
      editor.off('update', handleUpdate);
      editor.off('transaction', handleUpdate);
    };
  }, [editor]);

  const handleUndo = () => {
    if (editor?.can().undo()) {
      editor.chain().focus().undo().run();
    }
  };

  const handleRedo = () => {
    if (editor?.can().redo()) {
      editor.chain().focus().redo().run();
    }
  };

  const handleMultipleUndo = (steps: number) => {
    if (!editor) return;
    
    // Perform multiple undo operations
    for (let i = 0; i < steps && editor.can().undo(); i++) {
      editor.chain().undo().run();
    }
    editor.commands.focus();
    setShowHistoryDropdown(false);
  };

  const handleMultipleRedo = (steps: number) => {
    if (!editor) return;
    
    // Perform multiple redo operations
    for (let i = 0; i < steps && editor.can().redo(); i++) {
      editor.chain().redo().run();
    }
    editor.commands.focus();
    setShowHistoryDropdown(false);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.history-dropdown-container')) {
        setShowHistoryDropdown(false);
      }
    };

    if (showHistoryDropdown) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showHistoryDropdown]);

  if (!editor) return null;

  return (
    <div className="flex items-center relative">
      {/* Undo Button */}
      <button
        onClick={handleUndo}
        disabled={!historyState.canUndo}
        className={`p-2 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 ${
          historyState.canUndo ? 'text-gray-700 hover:text-gray-900' : 'text-gray-400'
        }`}
        title={`Undo (Ctrl+Z)${historyState.undoDepth > 0 ? ` - ${historyState.undoDepth} actions available` : ''}`}
      >
        <Undo size={16} />
      </button>

      {/* Redo Button */}
      <button
        onClick={handleRedo}
        disabled={!historyState.canRedo}
        className={`p-2 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 ${
          historyState.canRedo ? 'text-gray-700 hover:text-gray-900' : 'text-gray-400'
        }`}
        title={`Redo (Ctrl+Y)${historyState.redoDepth > 0 ? ` - ${historyState.redoDepth} actions available` : ''}`}
      >
        <Redo size={16} />
      </button>

      {/* History Navigation Dropdown */}
      {(historyState.canUndo || historyState.canRedo) && (
        <div className="history-dropdown-container relative">
          <button
            onClick={() => setShowHistoryDropdown(!showHistoryDropdown)}
            className="p-2 rounded hover:bg-gray-200 text-gray-600 hover:text-gray-800 transition-all duration-200"
            title="History Navigation - Jump to specific points"
          >
            <div className="flex items-center">
              <History size={14} />
              <ChevronDown size={12} className="ml-1" />
            </div>
          </button>

          {showHistoryDropdown && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50 min-w-[200px]">
              <div className="p-2">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  History Navigation
                </div>
                
                {/* Undo Section */}
                {historyState.canUndo && historyState.undoDepth > 0 && (
                  <div className="mb-3">
                    <div className="text-xs text-gray-600 mb-1">Undo ({historyState.undoDepth} available)</div>
                    <div className="space-y-1">
                      {[1, 5, 10, Math.min(historyState.undoDepth, 20)].filter(step => step <= historyState.undoDepth).map(steps => (
                        <button
                          key={`undo-${steps}`}
                          onClick={() => handleMultipleUndo(steps)}
                          className="w-full text-left px-2 py-1 text-xs hover:bg-gray-100 rounded text-gray-700"
                        >
                          Undo {steps} step{steps > 1 ? 's' : ''}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Redo Section */}
                {historyState.canRedo && historyState.redoDepth > 0 && (
                  <div>
                    <div className="text-xs text-gray-600 mb-1">Redo ({historyState.redoDepth} available)</div>
                    <div className="space-y-1">
                      {[1, 5, 10, Math.min(historyState.redoDepth, 20)].filter(step => step <= historyState.redoDepth).map(steps => (
                        <button
                          key={`redo-${steps}`}
                          onClick={() => handleMultipleRedo(steps)}
                          className="w-full text-left px-2 py-1 text-xs hover:bg-gray-100 rounded text-gray-700"
                        >
                          Redo {steps} step{steps > 1 ? 's' : ''}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* History Info */}
                <div className="mt-3 pt-2 border-t border-gray-200">
                  <div className="text-xs text-gray-500">
                    History Depth: {historyState.undoDepth + historyState.redoDepth} / 100
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}; 