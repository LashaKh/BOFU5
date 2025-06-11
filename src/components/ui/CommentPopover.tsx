import React, { useState, useRef, useEffect } from 'react';
import { X, Send, MessageCircle, CheckCircle, Archive, MoreHorizontal, Edit2, Trash2, Reply, User, Clock, ArrowLeft } from 'lucide-react';
import { ArticleComment, createComment, updateCommentStatus, deleteComment, updateComment } from '../../lib/commentApi';
import { CommentEditor } from './CommentEditor';
import { CommentThread } from './CommentThread';
import { motion, AnimatePresence } from 'framer-motion';

interface TextSelection {
  start: number;
  end: number;
  text: string;
  range?: Range;
}

interface CommentPopoverProps {
  position: { x: number; y: number };
  articleId: string;
  selectedText?: TextSelection | null;
  selectedComment?: ArticleComment | null;
  onClose: () => void;
  onSubmit: (content: string) => void;
}

export const CommentPopover: React.FC<CommentPopoverProps> = ({
  position,
  articleId,
  selectedText,
  selectedComment,
  onClose,
  onSubmit
}) => {
  const [isCreating, setIsCreating] = useState(!selectedComment);
  const [commentContent, setCommentContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [commentType, setCommentType] = useState<'text' | 'suggestion'>('text');
  const [viewMode, setViewMode] = useState<'view' | 'reply' | 'edit'>(!selectedComment ? 'reply' : 'view');
  const popoverRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-focus textarea when creating/replying
  useEffect(() => {
    if ((isCreating || viewMode === 'reply') && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isCreating, viewMode]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (viewMode === 'reply' || viewMode === 'edit') {
          setViewMode('view');
          setCommentContent('');
        } else {
          onClose();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose, viewMode]);

  const handleSubmit = async () => {
    if (!commentContent.trim()) return;
    setIsSubmitting(true);
    
    try {
      if (viewMode === 'reply' && selectedComment) {
        // We're replying to an existing comment - pass the content to the parent
        // The parent will handle creating the reply with the correct parent_comment_id
        await onSubmit(commentContent.trim());
      } else if (viewMode === 'edit' && selectedComment) {
        // Handle editing existing comment
        await updateComment(selectedComment.id, { content: commentContent.trim() });
        // Refresh by closing and letting parent handle refresh
        onClose();
      } else {
        // Creating a new comment
        await onSubmit(commentContent.trim());
      }
      
      setCommentContent('');
      setViewMode(selectedComment ? 'view' : 'reply');
      setIsCreating(false);
    } catch (error) {
      console.error('Error submitting comment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusChange = async (commentId: string, status: 'active' | 'resolved' | 'archived') => {
    try {
      await updateCommentStatus(commentId, status);
      // Let parent handle refresh
    } catch (error) {
      console.error('Error updating comment status:', error);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Are you sure you want to delete this comment?')) return;

    try {
      await deleteComment(commentId);
      onClose(); // Close popover after deletion
    } catch (error) {
      console.error('Error deleting comment:', error);
    }
  };

  const handleReply = () => {
    setViewMode('reply');
    setCommentContent('');
    setIsCreating(true);
  };

  const handleEdit = (comment: ArticleComment) => {
    setCommentContent(comment.content);
    setViewMode('edit');
    setIsCreating(true);
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffHours < 1) {
      return 'Just now';
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else {
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays}d ago`;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'resolved':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
            <CheckCircle className="w-3 h-3 mr-1" />
            Resolved
          </span>
        );
      case 'archived':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300">
            <Archive className="w-3 h-3 mr-1" />
            Archived
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
            <MessageCircle className="w-3 h-3 mr-1" />
            Active
          </span>
        );
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
      onClick={handleBackdropClick}
    >
      <motion.div
        ref={popoverRef}
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden border border-gray-200 dark:border-gray-700"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Enhanced Header */}
        <div className="bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-900 border-b border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {/* Back button for reply/edit mode */}
              {selectedComment && (viewMode === 'reply' || viewMode === 'edit') && (
                <button
                  onClick={() => {
                    setViewMode('view');
                    setCommentContent('');
                    setIsCreating(false);
                  }}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                </button>
              )}
              
              <div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {!selectedComment ? 'New Comment' : 
                   viewMode === 'reply' ? 'Reply to Comment' :
                   viewMode === 'edit' ? 'Edit Comment' : 'Comment Details'}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {!selectedComment ? 'Add your thoughts to the selected text' :
                   viewMode === 'reply' ? 'Respond to this comment' :
                   viewMode === 'edit' ? 'Make changes to your comment' : 
                   'View and interact with this comment'}
                </p>
              </div>
            </div>
            
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Container */}
        <div className="flex-1 overflow-hidden">
          {/* Selected text display */}
          {selectedText && (
            <div className="p-6 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800">
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-blue-600 dark:text-blue-400 text-sm font-medium">📄</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">Selected Text</p>
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-blue-200 dark:border-blue-700">
                    <p className="text-sm text-gray-900 dark:text-gray-100 italic leading-relaxed">
                      "{selectedText.text.length > 200 ? selectedText.text.slice(0, 200) + '...' : selectedText.text}"
                    </p>
                  </div>
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                    Characters {selectedText.start}-{selectedText.end}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Comment Thread View */}
          {selectedComment && viewMode === 'view' && (
            <div className="p-6 space-y-6">
              {/* Original Comment Display */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
                {/* User Info */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className={`
                      w-10 h-10 rounded-xl flex items-center justify-center text-white font-semibold
                      ${selectedComment.user?.isAdmin 
                        ? 'bg-gradient-to-br from-purple-500 to-purple-700' 
                        : 'bg-gradient-to-br from-blue-500 to-blue-700'
                      }
                    `}>
                      {selectedComment.user?.name?.charAt(0)?.toUpperCase() || 
                       selectedComment.user?.email?.charAt(0)?.toUpperCase() || '?'}
                      {selectedComment.user?.isAdmin && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full flex items-center justify-center">
                          <span className="text-xs">👑</span>
                        </div>
                      )}
                    </div>
                    
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-white">
                        {selectedComment.user?.name || selectedComment.user?.email || 'Anonymous User'}
                      </h4>
                      <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
                        <Clock className="w-3 h-3" />
                        <span>{formatDate(selectedComment.created_at)}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {selectedComment.user?.isAdmin && (
                      <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-lg text-xs font-medium">
                        Admin
                      </span>
                    )}
                    {getStatusBadge(selectedComment.status)}
                  </div>
                </div>

                {/* Comment Content */}
                <div className="prose prose-sm max-w-none">
                  <p className="text-gray-900 dark:text-gray-100 leading-relaxed whitespace-pre-wrap m-0">
                    {selectedComment.content}
                  </p>
                </div>

                {/* Selection Context */}
                {selectedComment.selection_start !== undefined && selectedComment.selection_end !== undefined && (
                  <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border-l-4 border-blue-500">
                    <div className="flex items-center space-x-2 text-sm text-blue-700 dark:text-blue-300">
                      <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                      <span className="font-medium">Inline comment</span>
                      <span>•</span>
                      <span>Characters {selectedComment.selection_start}-{selectedComment.selection_end}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center space-x-3">
                  <button
                    onClick={handleReply}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Reply className="w-4 h-4" />
                    <span>Reply</span>
                  </button>
                  
                  <button
                    onClick={() => handleEdit(selectedComment)}
                    className="flex items-center space-x-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                    <span>Edit</span>
                  </button>
                </div>

                <div className="flex items-center space-x-2">
                  {selectedComment.status === 'active' && (
                    <button
                      onClick={() => handleStatusChange(selectedComment.id, 'resolved')}
                      className="flex items-center space-x-2 px-3 py-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>Resolve</span>
                    </button>
                  )}
                  
                  <button
                    onClick={() => handleDeleteComment(selectedComment.id)}
                    className="flex items-center space-x-2 px-3 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Comment Creation/Reply Form */}
          {(isCreating || viewMode === 'reply' || viewMode === 'edit') && (
            <div className="p-6">
              {/* Comment Type Selector */}
              {!selectedComment && viewMode !== 'edit' && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    Comment Type
                  </label>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setCommentType('text')}
                      className={`flex items-center space-x-2 px-4 py-3 rounded-xl border-2 transition-all ${
                        commentType === 'text'
                          ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-600 text-blue-700 dark:text-blue-300'
                          : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span className="font-medium">General Comment</span>
                    </button>
                    <button
                      onClick={() => setCommentType('suggestion')}
                      className={`flex items-center space-x-2 px-4 py-3 rounded-xl border-2 transition-all ${
                        commentType === 'suggestion'
                          ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-600 text-green-700 dark:text-green-300'
                          : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                    >
                      <Edit2 className="w-4 h-4" />
                      <span className="font-medium">Suggestion</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Enhanced Comment Editor */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  {viewMode === 'edit' ? 'Edit your comment' : 
                   viewMode === 'reply' ? 'Your reply' : 'Your comment'}
                </label>
                <div className="relative">
                  <textarea
                    ref={textareaRef}
                    value={commentContent}
                    onChange={(e) => setCommentContent(e.target.value)}
                    placeholder={
                      viewMode === 'edit' ? "Update your comment..." :
                      viewMode === 'reply' ? "Write your reply..." : 
                      "Share your thoughts..."
                    }
                    className="w-full h-32 p-4 border border-gray-300 dark:border-gray-600 rounded-xl 
                             bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                             placeholder-gray-500 dark:placeholder-gray-400
                             focus:ring-2 focus:ring-blue-500 focus:border-transparent
                             resize-none transition-all"
                    maxLength={1000}
                    disabled={isSubmitting}
                  />
                  <div className="absolute bottom-3 right-3 text-xs text-gray-400 dark:text-gray-500">
                    {commentContent.length}/1000
                  </div>
                </div>
              </div>

              {/* Enhanced Action Buttons */}
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Press <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs">Esc</kbd> to cancel
                </div>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => {
                      if (selectedComment && viewMode !== 'edit') {
                        setViewMode('view');
                      } else {
                        onClose();
                      }
                      setCommentContent('');
                      setIsCreating(false);
                    }}
                    className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmit}
                    className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
                    disabled={isSubmitting || !commentContent.trim()}
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Submitting...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>{viewMode === 'edit' ? 'Update' : 'Submit'}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}; 