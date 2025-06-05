import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Editor } from '@tiptap/react';
import { 
  Search, Replace, X, ChevronUp, ChevronDown, 
  ToggleLeft, ToggleRight, Settings, History 
} from 'lucide-react';

interface FindReplaceProps {
  editor: Editor;
  isOpen: boolean;
  onClose: () => void;
}

interface SearchOptions {
  caseSensitive: boolean;
  wholeWord: boolean;
  useRegex: boolean;
}

interface SearchResult {
  from: number;
  to: number;
  text: string;
}

export const FindReplace: React.FC<FindReplaceProps> = ({
  editor,
  isOpen,
  onClose
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [replaceTerm, setReplaceTerm] = useState('');
  const [showReplace, setShowReplace] = useState(false);
  const [currentMatch, setCurrentMatch] = useState(0);
  const [totalMatches, setTotalMatches] = useState(0);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [searchOptions, setSearchOptions] = useState<SearchOptions>({
    caseSensitive: false,
    wholeWord: false,
    useRegex: false
  });

  const searchInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [matches, setMatches] = useState<SearchResult[]>([]);

  // Focus search input when component opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
      searchInputRef.current.select();
    }
  }, [isOpen]);

  // Search function
  const performSearch = useCallback(() => {
    if (!searchTerm || !editor) {
      setMatches([]);
      setTotalMatches(0);
      setCurrentMatch(0);
      clearHighlights();
      return;
    }

    try {
      const content = editor.getText();
      let regex: RegExp;

      if (searchOptions.useRegex) {
        const flags = searchOptions.caseSensitive ? 'g' : 'gi';
        regex = new RegExp(searchTerm, flags);
      } else {
        let escapedTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        
        if (searchOptions.wholeWord) {
          escapedTerm = `\\b${escapedTerm}\\b`;
        }
        
        const flags = searchOptions.caseSensitive ? 'g' : 'gi';
        regex = new RegExp(escapedTerm, flags);
      }

      const newMatches: SearchResult[] = [];
      let match;
      
      while ((match = regex.exec(content)) !== null) {
        newMatches.push({
          from: match.index,
          to: match.index + match[0].length,
          text: match[0]
        });
        
        // Prevent infinite loop with zero-length matches
        if (match[0].length === 0) {
          regex.lastIndex++;
        }
      }

      setMatches(newMatches);
      setTotalMatches(newMatches.length);
      
      if (newMatches.length > 0) {
        setCurrentMatch(1);
        highlightMatches(newMatches);
        scrollToMatch(newMatches[0]);
      } else {
        setCurrentMatch(0);
        clearHighlights();
      }
    } catch (error) {
      console.warn('Search error:', error);
      setMatches([]);
      setTotalMatches(0);
      setCurrentMatch(0);
      clearHighlights();
    }
  }, [searchTerm, searchOptions, editor]);

  // Highlight matches in the editor
  const highlightMatches = (searchMatches: SearchResult[]) => {
    if (!editor) return;

    // Clear existing highlights
    clearHighlights();

    // Add highlights for all matches
    searchMatches.forEach((match, index) => {
      const color = index === currentMatch - 1 ? '#3b82f6' : '#fbbf24';
      
      // Create a decoration to highlight the match
      editor.commands.setTextSelection({ from: match.from, to: match.to });
      editor.commands.setMark('highlight', { color });
    });

    // Clear selection
    editor.commands.setTextSelection(editor.state.selection.from);
  };

  // Clear all highlights
  const clearHighlights = () => {
    if (!editor) return;
    
    // Remove all highlight marks with search classes
    const { state } = editor;
    const { doc } = state;
    
    let tr = state.tr;
    let hasChanges = false;
    
    doc.descendants((node, pos) => {
      if (node.marks) {
        node.marks.forEach(mark => {
          if (mark.type.name === 'highlight' && 
              (mark.attrs.color === '#3b82f6' || mark.attrs.color === '#fbbf24')) {
            tr = tr.removeMark(pos, pos + node.nodeSize, mark.type);
            hasChanges = true;
          }
        });
      }
    });
    
    if (hasChanges) {
      editor.view.dispatch(tr);
    }
  };

  // Scroll to specific match
  const scrollToMatch = (match: SearchResult) => {
    if (!editor) return;
    
    editor.commands.setTextSelection({ from: match.from, to: match.to });
    
    // Scroll the match into view
    const { view } = editor;
    const coords = view.coordsAtPos(match.from);
    
    if (coords) {
      const editorElement = view.dom.closest('.ProseMirror') || view.dom;
      const rect = editorElement.getBoundingClientRect();
      
      if (coords.top < rect.top || coords.top > rect.bottom) {
        editorElement.scrollTop += coords.top - rect.top - rect.height / 2;
      }
    }
  };

  // Navigate to next match
  const nextMatch = () => {
    if (matches.length === 0) return;
    
    const newCurrent = currentMatch >= totalMatches ? 1 : currentMatch + 1;
    setCurrentMatch(newCurrent);
    
    highlightMatches(matches);
    scrollToMatch(matches[newCurrent - 1]);
  };

  // Navigate to previous match
  const previousMatch = () => {
    if (matches.length === 0) return;
    
    const newCurrent = currentMatch <= 1 ? totalMatches : currentMatch - 1;
    setCurrentMatch(newCurrent);
    
    highlightMatches(matches);
    scrollToMatch(matches[newCurrent - 1]);
  };

  // Replace current match
  const replaceCurrent = () => {
    if (matches.length === 0 || currentMatch === 0) return;
    
    const match = matches[currentMatch - 1];
    editor.commands.setTextSelection({ from: match.from, to: match.to });
    editor.commands.insertContent(replaceTerm);
    
    // Re-search to update matches
    setTimeout(performSearch, 100);
  };

  // Replace all matches
  const replaceAll = () => {
    if (matches.length === 0) return;
    
    // Replace from end to beginning to maintain positions
    const sortedMatches = [...matches].sort((a, b) => b.from - a.from);
    
    let tr = editor.state.tr;
    
    sortedMatches.forEach(match => {
      tr = tr.replaceWith(match.from, match.to, editor.schema.text(replaceTerm));
    });
    
    editor.view.dispatch(tr);
    
    // Clear search after replace all
    setTimeout(() => {
      setSearchTerm('');
      clearHighlights();
      setMatches([]);
      setTotalMatches(0);
      setCurrentMatch(0);
    }, 100);
  };

  // Handle search input change
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    
    if (value.trim()) {
      // Add to search history
      if (!searchHistory.includes(value) && value.length > 2) {
        setSearchHistory(prev => [value, ...prev.slice(0, 9)]);
      }
    }
  };

  // Perform search when search term or options change
  useEffect(() => {
    const timeoutId = setTimeout(performSearch, 300);
    return () => clearTimeout(timeoutId);
  }, [performSearch]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) return;
      
      if (event.key === 'Escape') {
        onClose();
      } else if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        nextMatch();
      } else if (event.key === 'Enter' && event.shiftKey) {
        event.preventDefault();
        previousMatch();
      } else if (event.key === 'F3') {
        event.preventDefault();
        if (event.shiftKey) {
          previousMatch();
        } else {
          nextMatch();
        }
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, nextMatch, previousMatch]);

  // Clean up highlights on close
  useEffect(() => {
    if (!isOpen) {
      clearHighlights();
    }
    return () => clearHighlights();
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div 
      ref={containerRef}
      className="absolute top-16 right-4 z-50 bg-white border border-gray-300 rounded-lg shadow-lg min-w-80 max-w-md"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <Search size={16} className="text-gray-600" />
          <span className="text-sm font-medium text-gray-900">Find & Replace</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-gray-100 text-gray-500"
        >
          <X size={16} />
        </button>
      </div>

      {/* Search Input */}
      <div className="p-3">
        <div className="relative">
          <input
            ref={searchInputRef}
            type="text"
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search..."
            className="w-full px-3 py-2 pr-20 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          
          {/* Match counter */}
          {totalMatches > 0 && (
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs text-gray-500">
              {currentMatch} of {totalMatches}
            </div>
          )}
        </div>

        {/* Navigation Controls */}
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center space-x-1">
            <button
              onClick={previousMatch}
              disabled={totalMatches === 0}
              className="p-1 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Previous match (Shift+F3)"
            >
              <ChevronUp size={16} />
            </button>
            <button
              onClick={nextMatch}
              disabled={totalMatches === 0}
              className="p-1 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Next match (F3)"
            >
              <ChevronDown size={16} />
            </button>
          </div>

          <div className="flex items-center space-x-1">
            {/* Replace toggle */}
            <button
              onClick={() => setShowReplace(!showReplace)}
              className={`p-1 rounded hover:bg-gray-100 ${showReplace ? 'bg-blue-100 text-blue-600' : 'text-gray-600'}`}
              title="Toggle replace"
            >
              <Replace size={16} />
            </button>

            {/* Search history */}
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="p-1 rounded hover:bg-gray-100 text-gray-600"
              title="Search history"
            >
              <History size={16} />
            </button>

            {/* Options */}
            <button
              onClick={() => setSearchOptions(prev => ({ ...prev }))}
              className="p-1 rounded hover:bg-gray-100 text-gray-600"
              title="Search options"
            >
              <Settings size={16} />
            </button>
          </div>
        </div>

        {/* Search Options */}
        <div className="flex items-center space-x-4 mt-3 text-xs">
          <label className="flex items-center space-x-1 cursor-pointer">
            <button
              onClick={() => setSearchOptions(prev => ({ ...prev, caseSensitive: !prev.caseSensitive }))}
              className="flex items-center"
            >
              {searchOptions.caseSensitive ? (
                <ToggleRight size={14} className="text-blue-600" />
              ) : (
                <ToggleLeft size={14} className="text-gray-400" />
              )}
              <span className={searchOptions.caseSensitive ? 'text-blue-600' : 'text-gray-600'}>
                Case sensitive
              </span>
            </button>
          </label>

          <label className="flex items-center space-x-1 cursor-pointer">
            <button
              onClick={() => setSearchOptions(prev => ({ ...prev, wholeWord: !prev.wholeWord }))}
              className="flex items-center"
            >
              {searchOptions.wholeWord ? (
                <ToggleRight size={14} className="text-blue-600" />
              ) : (
                <ToggleLeft size={14} className="text-gray-400" />
              )}
              <span className={searchOptions.wholeWord ? 'text-blue-600' : 'text-gray-600'}>
                Whole word
              </span>
            </button>
          </label>

          <label className="flex items-center space-x-1 cursor-pointer">
            <button
              onClick={() => setSearchOptions(prev => ({ ...prev, useRegex: !prev.useRegex }))}
              className="flex items-center"
            >
              {searchOptions.useRegex ? (
                <ToggleRight size={14} className="text-blue-600" />
              ) : (
                <ToggleLeft size={14} className="text-gray-400" />
              )}
              <span className={searchOptions.useRegex ? 'text-blue-600' : 'text-gray-600'}>
                Regex
              </span>
            </button>
          </label>
        </div>

        {/* Search History */}
        {showHistory && searchHistory.length > 0 && (
          <div className="mt-3 border-t border-gray-200 pt-2">
            <div className="text-xs text-gray-500 mb-1">Recent searches:</div>
            <div className="space-y-1">
              {searchHistory.slice(0, 5).map((term, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setSearchTerm(term);
                    setShowHistory(false);
                  }}
                  className="block w-full text-left px-2 py-1 text-xs rounded hover:bg-gray-100 text-gray-700"
                >
                  {term}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Replace Section */}
        {showReplace && (
          <div className="mt-3 border-t border-gray-200 pt-3">
            <input
              ref={replaceInputRef}
              type="text"
              value={replaceTerm}
              onChange={(e) => setReplaceTerm(e.target.value)}
              placeholder="Replace with..."
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            
            <div className="flex items-center space-x-2 mt-2">
              <button
                onClick={replaceCurrent}
                disabled={totalMatches === 0 || currentMatch === 0}
                className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Replace
              </button>
              <button
                onClick={replaceAll}
                disabled={totalMatches === 0}
                className="px-3 py-1 text-xs bg-orange-600 text-white rounded hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Replace All ({totalMatches})
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}; 