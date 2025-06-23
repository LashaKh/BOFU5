import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Crown, User, X } from 'lucide-react';
import { MentionableUser, getMentionableUsers } from '../../lib/commentApi';

// Custom scrollbar styles for mention dropdown
const mentionScrollbarStyles = `
  .mention-scroll::-webkit-scrollbar {
    width: 8px;
  }
  .mention-scroll::-webkit-scrollbar-track {
    background: transparent;
    border-radius: 4px;
  }
  .mention-scroll::-webkit-scrollbar-thumb {
    background: #d1d5db;
    border-radius: 4px;
    border: 1px solid transparent;
    background-clip: content-box;
  }
  .mention-scroll::-webkit-scrollbar-thumb:hover {
    background: #9ca3af;
    background-clip: content-box;
  }
  .dark .mention-scroll::-webkit-scrollbar-thumb {
    background: #4b5563;
    background-clip: content-box;
  }
  .dark .mention-scroll::-webkit-scrollbar-thumb:hover {
    background: #6b7280;
    background-clip: content-box;
  }
  
  /* Firefox scrollbar */
  .mention-scroll {
    scrollbar-width: thin;
    scrollbar-color: #d1d5db transparent;
  }
  .dark .mention-scroll {
    scrollbar-color: #4b5563 transparent;
  }
`;

interface MentionAutocompleteProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectMention: (user: MentionableUser) => void;
  searchTerm: string;
  position: { x: number; y: number };
  articleId?: string;
}

export const MentionAutocomplete: React.FC<MentionAutocompleteProps> = ({
  isOpen,
  onClose,
  onSelectMention,
  searchTerm,
  position,
  articleId
}) => {
  const [users, setUsers] = useState<MentionableUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [calculatedPosition, setCalculatedPosition] = useState({ x: 0, y: 0, transform: 'translateY(4px)' });
  const listRef = useRef<HTMLDivElement>(null);

  // Debug logging
  console.log('🔍 MentionAutocomplete render:', {
    isOpen,
    searchTerm,
    position,
    articleId,
    usersCount: users.length
  });

  // Calculate optimal position to prevent cutoff
  useEffect(() => {
    if (!isOpen) return;

    const calculatePosition = () => {
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;
      
      // Estimated dropdown height (header + footer + content)
      const dropdownHeight = 320; // max-h-80 (320px) + header + footer
      const dropdownWidth = 256; // min-w-64 (256px)
      
      let x = position.x;
      let y = position.y;
      let transform = 'translateY(4px)';

      // Check if dropdown would extend beyond bottom of viewport
      if (y + dropdownHeight + 20 > viewportHeight) {
        // Position above the cursor instead
        y = position.y - dropdownHeight - 8;
        transform = 'translateY(-4px)';
      }

      // Check if dropdown would extend beyond right edge of viewport
      if (x + dropdownWidth + 20 > viewportWidth) {
        x = viewportWidth - dropdownWidth - 20;
      }

      // Ensure dropdown doesn't go off the left edge
      if (x < 20) {
        x = 20;
      }

      // Ensure dropdown doesn't go off the top
      if (y < 20) {
        y = 20;
        transform = 'translateY(4px)';
      }

      setCalculatedPosition({ x, y, transform });
    };

    calculatePosition();

    // Recalculate on window resize
    window.addEventListener('resize', calculatePosition);
    return () => window.removeEventListener('resize', calculatePosition);
  }, [isOpen, position]);

  // Fetch mentionable users based on search term
  const fetchUsers = useCallback(async (term: string) => {
    console.log('🔍 MentionAutocomplete fetchUsers called:', { term, articleId });
    setLoading(true);
    try {
      const mentionableUsers = await getMentionableUsers(articleId, term);
      console.log('✅ MentionAutocomplete received users:', {
        count: mentionableUsers.length,
        users: mentionableUsers.map(u => ({ email: u.email, mention: u.mention_text }))
      });
      setUsers(mentionableUsers);
      setSelectedIndex(0);
    } catch (error) {
      console.error('❌ MentionAutocomplete error fetching users:', error);
      // Show user-friendly error in the dropdown instead of empty state
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [articleId]);

  // Fetch users when search term changes
  useEffect(() => {
    console.log('🔍 MentionAutocomplete useEffect triggered:', {
      isOpen,
      searchTerm,
      searchTermLength: searchTerm.length,
      shouldFetch: isOpen && searchTerm.length >= 0
    });
    
    if (isOpen && searchTerm.length >= 0) {
      fetchUsers(searchTerm);
    } else {
      console.log('🔍 Clearing users - not fetching');
      setUsers([]);
    }
  }, [isOpen, searchTerm, fetchUsers]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen || users.length === 0) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => (prev + 1) % users.length);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => (prev - 1 + users.length) % users.length);
          break;
        case 'Enter':
          e.preventDefault();
          if (users[selectedIndex]) {
            onSelectMention(users[selectedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, users, selectedIndex, onSelectMention, onClose]);

  // Scroll selected item into view with better behavior
  useEffect(() => {
    if (listRef.current && users.length > 0) {
      const listContainer = listRef.current.querySelector('.mention-scroll') as HTMLElement;
      if (listContainer) {
        const selectedElement = listContainer.children[selectedIndex + 1] as HTMLElement; // +1 to account for header
        if (selectedElement) {
          selectedElement.scrollIntoView({
            block: 'nearest',
            behavior: 'smooth'
          });
        }
      }
    }
  }, [selectedIndex]);

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (listRef.current && !listRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const getDisplayName = (user: MentionableUser) => {
    return user.full_name || user.email.split('@')[0];
  };

  return (
    <>
      {/* Inject custom scrollbar styles */}
      <style dangerouslySetInnerHTML={{ __html: mentionScrollbarStyles }} />
      
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" onClick={onClose} />
      
      {/* Autocomplete Menu */}
      <div
        ref={listRef}
        className="fixed z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-xl max-h-80 min-w-64 overflow-hidden"
        style={{
          left: calculatedPosition.x,
          top: calculatedPosition.y,
          transform: calculatedPosition.transform
        }}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-600 px-3 py-2 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <Search size={14} />
              <span>Mention someone</span>
            </div>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Scrollable Content Area */}
        <div className="mention-scroll overflow-y-auto max-h-64">
          {/* Loading State */}
          {loading && (
            <div className="px-3 py-4 text-center">
              <div className="inline-block w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
              <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">Searching...</div>
            </div>
          )}

          {/* No Results */}
          {!loading && users.length === 0 && searchTerm.length > 0 && (
            <div className="px-3 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
              No users found for "{searchTerm}"
            </div>
          )}

          {/* User List */}
          {!loading && users.length > 0 && (
            <div className="py-1">
              {users.map((user, index) => (
                <button
                  key={user.user_id}
                  onClick={() => onSelectMention(user)}
                  className={`w-full px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3 transition-all duration-150 ${
                    index === selectedIndex 
                      ? 'bg-blue-50 dark:bg-blue-900/30 border-r-2 border-blue-500' 
                      : ''
                  }`}
                >
                  {/* Avatar */}
                  <div className={`
                    relative w-8 h-8 rounded-lg flex items-center justify-center text-white font-semibold text-sm flex-shrink-0
                    ${user.is_admin 
                      ? 'bg-gradient-to-br from-purple-500 to-purple-600' 
                      : 'bg-gradient-to-br from-blue-500 to-blue-600'
                    }
                  `}>
                    {getDisplayName(user).charAt(0).toUpperCase()}
                    {user.is_admin && (
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full flex items-center justify-center">
                        <Crown size={8} className="text-yellow-800" />
                      </div>
                    )}
                  </div>

                  {/* User Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-medium text-gray-900 dark:text-white truncate">
                        {getDisplayName(user)}
                      </span>
                      {user.is_admin && (
                        <span className="px-1.5 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded text-xs font-medium">
                          Admin
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                      <span className="truncate">{user.email}</span>
                      <span>•</span>
                      <span className="font-mono bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded">
                        {user.mention_text}
                      </span>
                    </div>
                  </div>

                  {/* Selection Indicator */}
                  {index === selectedIndex && (
                    <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 animate-pulse"></div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600 px-3 py-2 z-10">
          <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center justify-between">
            <div className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-600 border border-gray-200 dark:border-gray-500 rounded text-xs">↑↓</kbd>
              <span>navigate</span>
            </div>
            <div className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-600 border border-gray-200 dark:border-gray-500 rounded text-xs">↵</kbd>
              <span>select</span>
            </div>
            <div className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-600 border border-gray-200 dark:border-gray-500 rounded text-xs">Esc</kbd>
              <span>close</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}; 