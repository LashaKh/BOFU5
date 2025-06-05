import React, { useState, useRef, useEffect } from 'react';
import { X, Send, MessageCircle, CheckCircle, Archive, MoreHorizontal, Edit2, Trash2 } from 'lucide-react';
import { ArticleComment, createComment, updateCommentStatus, deleteComment } from '../../lib/commentApi';
import { CommentEditor } from './CommentEditor';
import { CommentThread } from './CommentThread';

interface TextSelection {
  start: number;
  end: number;
  text: string;
  range: Range;
}

interface CommentPopoverProps {
  position: { x: number; y: number };
  articleId: string;
  selectedText?: TextSelection | null;
  selectedComment?: ArticleComment | null;
  onClose: () => void;
  onCommentCreated: () => void;
}

export const CommentPopover: React.FC<CommentPopoverProps> = ({
  position,
  articleId,
  selectedText,
  selectedComment,
  onClose,
  onCommentCreated
}) => {
  const [isCreating, setIsCreating] = useState(!selectedComment);
  const [commentContent, setCommentContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [commentType, setCommentType] = useState<'text' | 'suggestion'>('text');
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  // Adjust position to stay within viewport
  useEffect(() => {
    if (!popoverRef.current) return;

    const rect = popoverRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let adjustedX = position.x;
    let adjustedY = position.y;

    // Adjust horizontal position
    if (position.x + rect.width > viewportWidth) {
      adjustedX = viewportWidth - rect.width - 20;
    }

    // Adjust vertical position
    if (position.y + rect.height > viewportHeight) {
      adjustedY = viewportHeight - rect.height - 20;
    }

    if (adjustedX !== position.x || adjustedY !== position.y) {
      popoverRef.current.style.left = `${adjustedX}px`;
      popoverRef.current.style.top = `${adjustedY}px`;
    }
  }, [position]);

  const handleSubmitComment = async () => {
    if (!commentContent.trim()) return;

    setIsSubmitting(true);
    try {
      await createComment({
        article_id: articleId,
        content: commentContent.trim(),
        content_type: commentType,
        selection_start: selectedText?.start,
        selection_end: selectedText?.end,
        parent_comment_id: selectedComment?.id
      });

      setCommentContent('');
      onCommentCreated();
    } catch (error) {
      console.error('Error creating comment:', error);
      // TODO: Show error toast
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusChange = async (commentId: string, status: 'active' | 'resolved' | 'archived') => {
    try {
      await updateCommentStatus(commentId, status);
      onCommentCreated(); // Refresh comments
    } catch (error) {
      console.error('Error updating comment status:', error);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Are you sure you want to delete this comment?')) return;

    try {
      await deleteComment(commentId);
      onCommentCreated(); // Refresh comments
    } catch (error) {
      console.error('Error deleting comment:', error);
    }
  };

  const handleReply = () => {
    setIsCreating(true);
  };

  const handleEdit = (comment: ArticleComment) => {
    setCommentContent(comment.content);
    setIsCreating(true);
  };

  return (
    <div
      ref={popoverRef}
      className="fixed bg-white border border-gray-200 rounded-lg shadow-xl max-w-md w-80 z-50"
      style={{
        left: position.x,
        top: position.y
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <MessageCircle size={16} className="text-blue-600" />
          <span className="font-medium text-sm">
            {selectedComment ? 'Comment Thread' : 'New Comment'}
          </span>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      {/* Selected text preview */}
      {selectedText && (
        <div className="p-3 bg-gray-50 border-b border-gray-200">
          <div className="text-xs text-gray-500 mb-1">Selected text:</div>
          <div className="text-sm text-gray-700 italic">
            "{selectedText.text.length > 100 ? selectedText.text.slice(0, 100) + '...' : selectedText.text}"
          </div>
        </div>
      )}

      {/* Comment Thread */}
      {selectedComment && !isCreating && (
        <div className="max-h-96 overflow-y-auto">
          <CommentThread
            comment={selectedComment}
            onReply={handleReply}
            onEdit={handleEdit}
            onDelete={handleDeleteComment}
            onStatusChange={handleStatusChange}
            showActions={true}
          />
        </div>
      )}

      {/* Comment Creation Form */}
      {isCreating && (
        <div className="p-3">
          {/* Comment Type Selector */}
          {!selectedComment && (
            <div className="flex gap-2 mb-3">
              <button
                onClick={() => setCommentType('text')}
                className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                  commentType === 'text'
                    ? 'bg-blue-100 border-blue-300 text-blue-700'
                    : 'bg-gray-100 border-gray-300 text-gray-600'
                }`}
              >
                Comment
              </button>
              <button
                onClick={() => setCommentType('suggestion')}
                className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                  commentType === 'suggestion'
                    ? 'bg-green-100 border-green-300 text-green-700'
                    : 'bg-gray-100 border-gray-300 text-gray-600'
                }`}
              >
                Suggestion
              </button>
            </div>
          )}

          {/* Comment Editor */}
          <CommentEditor
            value={commentContent}
            onChange={setCommentContent}
            placeholder={selectedComment ? "Reply to this comment..." : "Add a comment..."}
          />

          {/* Action Buttons */}
          <div className="flex items-center justify-between mt-3">
            <div className="text-xs text-gray-500">
              {commentContent.length}/1000 characters
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setIsCreating(false);
                  setCommentContent('');
                }}
                className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 transition-colors"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitComment}
                disabled={!commentContent.trim() || isSubmitting || commentContent.length > 1000}
                className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                    Posting...
                  </>
                ) : (
                  <>
                    <Send size={12} />
                    {selectedComment ? 'Reply' : 'Comment'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Empty state for existing comment without replies */}
      {selectedComment && !isCreating && (!selectedComment.replies || selectedComment.replies.length === 0) && (
        <div className="p-3 text-center text-gray-500">
          <MessageCircle size={24} className="mx-auto mb-2 opacity-50" />
          <p className="text-sm">No replies yet</p>
          <button
            onClick={handleReply}
            className="mt-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            Be the first to reply
          </button>
        </div>
      )}
    </div>
  );
}; 