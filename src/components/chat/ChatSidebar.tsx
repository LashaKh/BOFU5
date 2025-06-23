import React, { useState, useEffect, useRef } from 'react';
import { Search, Plus, History, Star, Archive, MoreVertical, Calendar, MessageSquare, Trash2, Edit3, Pin } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChatSession, SearchFilter } from '../../types/chat';

interface ChatSidebarProps {
  sessions: ChatSession[];
  currentSessionId?: string;
  onSessionSelect: (sessionId: string) => void;
  onNewSession: () => void;
  onDeleteSession: (sessionId: string) => void;
  onRenameSession: (sessionId: string, newTitle: string) => void;
  onToggleFavorite: (sessionId: string) => void;
  onArchiveSession: (sessionId: string) => void;
  onSearchSessions: (query: string) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  loading?: boolean;
}

const ChatSidebar: React.FC<ChatSidebarProps> = ({
  sessions,
  currentSessionId,
  onSessionSelect,
  onNewSession,
  onDeleteSession,
  onRenameSession,
  onToggleFavorite,
  onArchiveSession,
  onSearchSessions,
  isCollapsed = false,
  onToggleCollapse,
  loading = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'favorites' | 'archived'>('all');
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [showDropdown, setShowDropdown] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Handle search
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      onSearchSessions(searchQuery);
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [searchQuery, onSearchSessions]);

  // Filter sessions
  const filteredSessions = sessions.filter(session => {
    if (filter === 'favorites' && !session.isFavorite) return false;
    if (filter === 'archived' && !session.isArchived) return false;
    if (filter === 'all' && session.isArchived) return false;
    return true;
  });

  // Group sessions by date
  const groupedSessions = React.useMemo(() => {
    const groups: { [key: string]: ChatSession[] } = {};
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    filteredSessions.forEach(session => {
      const sessionDate = new Date(session.updatedAt);
      let groupKey = '';

      if (sessionDate.toDateString() === today.toDateString()) {
        groupKey = 'Today';
      } else if (sessionDate.toDateString() === yesterday.toDateString()) {
        groupKey = 'Yesterday';
      } else if (sessionDate > weekAgo) {
        groupKey = 'This Week';
      } else {
        groupKey = sessionDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      }

      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(session);
    });

    // Sort groups by date
    Object.keys(groups).forEach(key => {
      groups[key].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    });

    return groups;
  }, [filteredSessions]);

  const handleEditStart = (session: ChatSession) => {
    setEditingSessionId(session.id);
    setEditingTitle(session.title);
    setShowDropdown(null);
  };

  const handleEditSave = () => {
    if (editingSessionId && editingTitle.trim()) {
      onRenameSession(editingSessionId, editingTitle.trim());
    }
    setEditingSessionId(null);
    setEditingTitle('');
  };

  const handleEditCancel = () => {
    setEditingSessionId(null);
    setEditingTitle('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleEditSave();
    } else if (e.key === 'Escape') {
      handleEditCancel();
    }
  };

  const formatLastMessage = (message: string) => {
    if (message.length > 50) {
      return message.substring(0, 50) + '...';
    }
    return message;
  };

  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    
    return date.toLocaleDateString();
  };

  if (isCollapsed) {
    return (
      <motion.div
        initial={{ width: 280 }}
        animate={{ width: 60 }}
        transition={{ duration: 0.3 }}
        className="h-full bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex flex-col"
      >
        <div className="p-3 border-b border-gray-200 dark:border-gray-700">
          <motion.button
            onClick={onNewSession}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="w-full p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
            title="New Chat"
          >
            <Plus className="w-5 h-5 mx-auto" />
          </motion.button>
        </div>
        
        <div className="flex-1 p-2 space-y-2 overflow-y-auto">
          {sessions.slice(0, 5).map((session) => (
            <motion.button
              key={session.id}
              onClick={() => onSessionSelect(session.id)}
              whileHover={{ scale: 1.05 }}
              className={`
                w-full p-2 rounded-lg transition-colors relative group
                ${currentSessionId === session.id
                  ? 'bg-blue-100 dark:bg-blue-900/50 border border-blue-200 dark:border-blue-700'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                }
              `}
              title={session.title}
            >
              <MessageSquare className="w-4 h-4 mx-auto text-gray-600 dark:text-gray-400" />
              {session.isFavorite && (
                <Star className="absolute top-1 right-1 w-2 h-2 text-yellow-500 fill-current" />
              )}
            </motion.button>
          ))}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ width: 60 }}
      animate={{ width: 280 }}
      transition={{ duration: 0.3 }}
      className="h-full bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex flex-col"
    >
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Chat History
          </h2>
          <motion.button
            onClick={onNewSession}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
            title="New Chat"
          >
            <Plus className="w-4 h-4" />
          </motion.button>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
          {(['all', 'favorites', 'archived'] as const).map((filterType) => (
            <button
              key={filterType}
              onClick={() => setFilter(filterType)}
              className={`
                flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors
                ${filter === filterType
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                }
              `}
            >
              {filterType === 'all' && 'All'}
              {filterType === 'favorites' && 'Starred'}
              {filterType === 'archived' && 'Archived'}
            </button>
          ))}
        </div>
      </div>

      {/* Sessions List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 text-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto"
            />
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Loading conversations...</p>
          </div>
        ) : Object.keys(groupedSessions).length === 0 ? (
          <div className="p-4 text-center">
            <MessageSquare className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {searchQuery ? 'No conversations found' : 'No conversations yet'}
            </p>
          </div>
        ) : (
          <div className="p-2">
            {Object.entries(groupedSessions).map(([groupKey, groupSessions]) => (
              <div key={groupKey} className="mb-4">
                <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 px-2">
                  {groupKey}
                </h3>
                <div className="space-y-1">
                  {groupSessions.map((session) => (
                    <motion.div
                      key={session.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="relative group"
                    >
                      <div
                        className={`
                          flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors
                          ${currentSessionId === session.id
                            ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700'
                            : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                          }
                        `}
                        onClick={() => onSessionSelect(session.id)}
                      >
                        <div className="flex-1 min-w-0">
                          {editingSessionId === session.id ? (
                            <input
                              type="text"
                              value={editingTitle}
                              onChange={(e) => setEditingTitle(e.target.value)}
                              onKeyDown={handleKeyDown}
                              onBlur={handleEditSave}
                              className="w-full px-2 py-1 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                              autoFocus
                            />
                          ) : (
                            <>
                              <div className="flex items-center space-x-2">
                                <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                                  {session.title}
                                </h4>
                                {session.isFavorite && (
                                  <Star className="w-3 h-3 text-yellow-500 fill-current flex-shrink-0" />
                                )}
                              </div>
                              <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-1">
                                {session.lastMessage ? formatLastMessage(session.lastMessage) : 'No messages'}
                              </p>
                              <div className="flex items-center justify-between mt-2">
                                <span className="text-xs text-gray-400 dark:text-gray-500">
                                  {formatTimestamp(new Date(session.updatedAt))}
                                </span>
                                <span className="text-xs text-gray-400 dark:text-gray-500">
                                  {session.messageCount} messages
                                </span>
                              </div>
                            </>
                          )}
                        </div>

                        {/* Action Menu */}
                        <div className="relative">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowDropdown(showDropdown === session.id ? null : session.id);
                            }}
                            className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
                          >
                            <MoreVertical className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                          </button>

                          <AnimatePresence>
                            {showDropdown === session.id && (
                              <motion.div
                                ref={dropdownRef}
                                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                transition={{ duration: 0.1 }}
                                className="absolute right-0 top-8 w-40 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10"
                              >
                                <div className="py-1">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleEditStart(session);
                                    }}
                                    className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2"
                                  >
                                    <Edit3 className="w-4 h-4" />
                                    <span>Rename</span>
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onToggleFavorite(session.id);
                                      setShowDropdown(null);
                                    }}
                                    className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2"
                                  >
                                    <Star className={`w-4 h-4 ${session.isFavorite ? 'text-yellow-500 fill-current' : ''}`} />
                                    <span>{session.isFavorite ? 'Unstar' : 'Star'}</span>
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onArchiveSession(session.id);
                                      setShowDropdown(null);
                                    }}
                                    className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2"
                                  >
                                    <Archive className="w-4 h-4" />
                                    <span>Archive</span>
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onDeleteSession(session.id);
                                      setShowDropdown(null);
                                    }}
                                    className="w-full px-3 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center space-x-2"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                    <span>Delete</span>
                                  </button>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default ChatSidebar; 