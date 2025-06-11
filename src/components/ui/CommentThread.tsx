import React, { useState } from 'react';
import { MessageCircle, CheckCircle, Archive, MoreHorizontal, Edit2, Trash2, Reply, Clock, AlertTriangle, Calendar, User, Edit3 } from 'lucide-react';
import { ArticleComment } from '../../lib/commentApi';

// Custom scrollbar styles for dropdown menu
const scrollbarStyles = `
  .comment-menu-scroll::-webkit-scrollbar {
    width: 6px;
  }
  .comment-menu-scroll::-webkit-scrollbar-track {
    background: transparent;
  }
  .comment-menu-scroll::-webkit-scrollbar-thumb {
    background: #d1d5db;
    border-radius: 3px;
  }
  .comment-menu-scroll::-webkit-scrollbar-thumb:hover {
    background: #9ca3af;
  }
  .dark .comment-menu-scroll::-webkit-scrollbar-thumb {
    background: #4b5563;
  }
  .dark .comment-menu-scroll::-webkit-scrollbar-thumb:hover {
    background: #6b7280;
  }
`;

interface CommentThreadProps {
  comment: ArticleComment;
  onReply: (comment: ArticleComment) => void;
  onEdit: (comment: ArticleComment) => void;
  onDelete: (commentId: string) => void;
  onStatusChange: (commentId: string, status: 'active' | 'resolved' | 'archived') => void;
  onResolveWithReason?: (commentId: string, reason: string) => void;
  showActions?: boolean;
  depth?: number;
  showResolutionDetails?: boolean;
  loadingAction?: string | null;
  highlightedCommentId?: string | null;
}

// Resolution templates for quick actions
const resolutionTemplates = [
  { id: 'fixed', label: 'Issue Fixed', reason: 'The reported issue has been addressed and fixed.' },
  { id: 'implemented', label: 'Implemented', reason: 'The suggested improvement has been implemented.' },
  { id: 'duplicate', label: 'Duplicate', reason: 'This comment duplicates another discussion.' },
  { id: 'outdated', label: 'Outdated', reason: 'This comment is no longer relevant.' },
  { id: 'wontfix', label: "Won't Fix", reason: 'This issue will not be addressed in the current scope.' }
];

export const CommentThread: React.FC<CommentThreadProps> = ({
  comment,
  onReply,
  onEdit,
  onDelete,
  onStatusChange,
  onResolveWithReason,
  showActions = true,
  depth = 0,
  showResolutionDetails = true,
  loadingAction,
  highlightedCommentId
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [showResolutionDialog, setShowResolutionDialog] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [customReason, setCustomReason] = useState('');

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffHours < 1) {
      return 'Just now';
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays}d ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const getCommentAge = () => {
    const created = new Date(comment.created_at);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getResolutionTime = () => {
    if (comment.status !== 'resolved') return null;
    const created = new Date(comment.created_at);
    const updated = new Date(comment.updated_at);
    const diffDays = Math.floor((updated.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'resolved':
        return <CheckCircle size={12} className="text-green-600" />;
      case 'archived':
        return <Archive size={12} className="text-gray-600" />;
      default:
        return <MessageCircle size={12} className="text-blue-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'resolved':
        return 'bg-green-50 border-green-200';
      case 'archived':
        return 'bg-gray-50 border-gray-200';
      default:
        return 'bg-white border-gray-200';
    }
  };

  const getStatusBadge = (status: string) => {
    const age = getCommentAge();
    const isOld = age > 7; // Comments older than 7 days
    
    switch (status) {
      case 'resolved':
        const resolutionTime = getResolutionTime();
        return (
          <div className="flex items-center gap-1">
            <span className="px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-700 font-medium">
              ✓ Resolved
            </span>
            {resolutionTime !== null && (
              <span className="text-xs text-gray-500">
                in {resolutionTime === 0 ? 'same day' : `${resolutionTime}d`}
              </span>
            )}
          </div>
        );
      case 'archived':
        return (
          <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-700 font-medium">
            📁 Archived
          </span>
        );
      default:
        return (
          <div className="flex items-center gap-1">
            <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${
              isOld ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'
            }`}>
              {isOld ? '⚠ Pending' : '💬 Active'}
            </span>
            {isOld && (
              <span className="text-xs text-orange-600">
                {age}d old
              </span>
            )}
          </div>
        );
    }
  };

  const getTypeLabel = (contentType: string) => {
    switch (contentType) {
      case 'suggestion':
        return { label: '💡 Suggestion', color: 'bg-green-100 text-green-700' };
      case 'image':
        return { label: '🖼 Image', color: 'bg-purple-100 text-purple-700' };
      default:
        return { label: '💬 Comment', color: 'bg-blue-100 text-blue-700' };
    }
  };

  const handleResolveWithTemplate = async () => {
    if (!selectedTemplate && !customReason.trim()) return;
    
    const template = resolutionTemplates.find(t => t.id === selectedTemplate);
    const reason = customReason.trim() || template?.reason || 'Resolved without specific reason';
    
    if (onResolveWithReason) {
      await onResolveWithReason(comment.id, reason);
    } else {
      onStatusChange(comment.id, 'resolved');
    }
    
    setShowResolutionDialog(false);
    setSelectedTemplate('');
    setCustomReason('');
    setShowMenu(false);
  };

  const typeInfo = getTypeLabel(comment.content_type);

  return (
    <div className="w-full">
      {/* Inject custom scrollbar styles */}
      <style dangerouslySetInnerHTML={{ __html: scrollbarStyles }} />
      
      {/* Main Comment Card - only for top-level comments */}
      {depth === 0 ? (
        <div className={`
          relative bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm transition-all duration-300
          ${highlightedCommentId === comment.id 
            ? 'ring-2 ring-blue-200 dark:ring-blue-700 border-blue-200 dark:border-blue-700' 
            : 'hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600'
          }
        `}>
          {/* Main Comment Content */}
          <div className="p-6">
            {/* Comment Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-4 flex-1">
                {/* User Avatar */}
                <div className={`
                  relative w-10 h-10 rounded-xl flex items-center justify-center text-white font-semibold shadow-lg
                  ${comment.user?.isAdmin 
                    ? 'bg-gradient-to-br from-purple-500 to-purple-700' 
                    : 'bg-gradient-to-br from-blue-500 to-blue-700'
                  }
                `}>
                  {comment.user?.name?.charAt(0)?.toUpperCase() || comment.user?.email?.charAt(0)?.toUpperCase() || '?'}
                  {comment.user?.isAdmin && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full flex items-center justify-center">
                      <span className="text-xs">👑</span>
                    </div>
                  )}
                </div>
                
                {/* User Information */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-3 mb-1">
                    <h4 className="text-base font-semibold text-gray-900 dark:text-white truncate">
                      {comment.user?.name || comment.user?.email || 'Anonymous User'}
                    </h4>
                    
                    {/* Badges */}
                    <div className="flex items-center space-x-2">
                      {comment.user?.isAdmin && (
                        <span className="px-2.5 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-lg text-xs font-medium">
                          Admin
                        </span>
                      )}
                      
                      <span className={`
                        px-2.5 py-1 rounded-lg text-xs font-medium
                        ${typeInfo.color}
                      `}>
                        {typeInfo.label}
                      </span>
                    </div>
                  </div>
                  
                  {/* Timestamp */}
                  <div className="flex items-center space-x-3 text-xs text-gray-500 dark:text-gray-400">
                    <div className="flex items-center space-x-1">
                      <Clock className="w-3 h-3" />
                      <span>{formatDate(comment.created_at)}</span>
                    </div>
                    
                    {comment.updated_at !== comment.created_at && (
                      <span className="flex items-center space-x-1">
                        <Edit2 className="w-3 h-3" />
                        <span>edited</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions Menu */}
              {showActions && (
                <div className="relative">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowMenu(!showMenu);
                    }}
                    className={`
                      p-2 rounded-lg transition-all duration-200 
                      ${showMenu 
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' 
                        : 'text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }
                    `}
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </button>

                  {/* Dropdown Menu */}
                  {showMenu && (
                    <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50 overflow-hidden max-h-60">
                      <div 
                        className="py-2 max-h-48 overflow-y-auto comment-menu-scroll"
                        style={{
                          scrollbarWidth: 'thin',
                          scrollbarColor: '#d1d5db transparent'
                        }}
                      >
                        <button
                          onClick={() => {
                            onReply(comment);
                            setShowMenu(false);
                          }}
                          className="w-full px-4 py-2.5 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center space-x-3 transition-colors"
                        >
                          <Reply className="w-4 h-4 text-blue-500" />
                          <div>
                            <div className="font-medium">Reply</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">Respond to this comment</div>
                          </div>
                        </button>
                        
                        <button
                          onClick={() => {
                            onEdit(comment);
                            setShowMenu(false);
                          }}
                          className="w-full px-4 py-2.5 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center space-x-3 transition-colors"
                        >
                          <Edit2 className="w-4 h-4 text-gray-500" />
                          <div>
                            <div className="font-medium">Edit</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">Modify this comment</div>
                          </div>
                        </button>
                        
                        <button
                          onClick={() => {
                            onDelete(comment.id);
                            setShowMenu(false);
                          }}
                          className="w-full px-4 py-2.5 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center space-x-3 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                          <div>
                            <div className="font-medium">Delete</div>
                            <div className="text-xs text-red-500 dark:text-red-400">Remove permanently</div>
                          </div>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Main Comment Content */}
            <div className="mb-4">
              <div className="prose prose-sm max-w-none">
                <p className="text-gray-900 dark:text-gray-100 leading-relaxed whitespace-pre-wrap m-0">
                  {comment.content}
                </p>
              </div>

              {/* Selection Context */}
              {comment.selection_start !== undefined && comment.selection_end !== undefined && (
                <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border-l-4 border-blue-500">
                  <div className="flex items-center space-x-2 text-sm text-blue-700 dark:text-blue-300">
                    <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                    <span className="font-medium">Inline comment</span>
                    <span>•</span>
                    <span>Characters {comment.selection_start}-{comment.selection_end}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Replies Section - render inside the same card */}
            {comment.replies && comment.replies.length > 0 && (
              <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
                <div className="flex items-center space-x-2 mb-4">
                  <MessageCircle className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {comment.replies.length} {comment.replies.length === 1 ? 'Reply' : 'Replies'}
                  </span>
                </div>
                
                <div className="space-y-4">
                  {comment.replies.map((reply) => (
                    <div key={reply.id} className="pl-4 border-l-2 border-gray-200 dark:border-gray-700">
                      {/* Reply Content */}
                      <div className="flex items-start space-x-3">
                        {/* Reply Avatar */}
                        <div className={`
                          relative w-8 h-8 rounded-lg flex items-center justify-center text-white font-semibold shadow-sm flex-shrink-0
                          ${reply.user?.isAdmin 
                            ? 'bg-gradient-to-br from-purple-500 to-purple-600' 
                            : 'bg-gradient-to-br from-green-500 to-green-600'
                          }
                        `}>
                          {reply.user?.name?.charAt(0)?.toUpperCase() || reply.user?.email?.charAt(0)?.toUpperCase() || '?'}
                          {reply.user?.isAdmin && (
                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full flex items-center justify-center">
                              <span className="text-xs">👑</span>
                            </div>
                          )}
                        </div>
                        
                        {/* Reply Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="text-sm font-semibold text-gray-900 dark:text-white">
                              {reply.user?.name || reply.user?.email || 'Anonymous User'}
                            </span>
                            <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded text-xs font-medium">
                              Reply
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {formatDate(reply.created_at)}
                            </span>
                          </div>
                          
                          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                            {reply.content}
                          </p>
                          
                          {/* Reply Actions */}
                          {showActions && (
                            <div className="flex items-center space-x-3 mt-2">
                              <button
                                onClick={() => onReply(reply)}
                                className="text-xs text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors"
                              >
                                Reply
                              </button>
                              <button
                                onClick={() => onEdit(reply)}
                                className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => onDelete(reply.id)}
                                className="text-xs text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                              >
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Footer Actions */}
            {showActions && (
              <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-700 mt-4">
                <button
                  onClick={() => onReply(comment)}
                  className="flex items-center space-x-2 px-3 py-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                >
                  <Reply className="w-4 h-4" />
                  <span className="text-sm font-medium">Reply</span>
                </button>
                
                <div className="text-xs text-gray-400 dark:text-gray-500">
                  ID: {comment.id.slice(-8)}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        // This is a nested reply (shouldn't happen with new structure, but keeping for safety)
        <div className="pl-4 border-l-2 border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Nested reply: {comment.content}
          </div>
        </div>
      )}
    </div>
  );
}; 