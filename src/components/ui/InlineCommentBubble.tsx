import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, CheckCircle, Archive, MoreHorizontal, Reply, Trash2, Clock } from 'lucide-react';
import { ArticleComment } from '../../lib/commentApi';

interface InlineCommentBubbleProps {
  comment: ArticleComment;
  position: { top: number; left: number; width: number; height: number };
  editorRef: React.RefObject<HTMLElement>;
  onClick: (comment: ArticleComment) => void;
  onStatusChange?: (commentId: string, status: string) => void;
  compact?: boolean;
}

export const InlineCommentBubble: React.FC<InlineCommentBubbleProps> = ({
  comment,
  position,
  editorRef,
  onClick,
  onStatusChange,
  compact = false
}) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const bubbleRef = useRef<HTMLDivElement>(null);

  const getStatusColor = () => {
    switch (comment.status) {
      case 'resolved': return 'bg-green-500 border-green-400';
      case 'archived': return 'bg-gray-500 border-gray-400';
      default: return 'bg-blue-500 border-blue-400';
    }
  };

  const getStatusIcon = () => {
    switch (comment.status) {
      case 'resolved': return CheckCircle;
      case 'archived': return Archive;
      default: return MessageCircle;
    }
  };

  const handleClick = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    onClick(comment);
  };

  const handleStatusChange = (newStatus: string) => {
    if (onStatusChange) {
      onStatusChange(comment.id, newStatus);
    }
    setShowActions(false);
  };

  const StatusIcon = getStatusIcon();
  const replyCount = comment.replies?.length || 0;
  const isRecent = Date.now() - new Date(comment.created_at).getTime() < 60000; // 1 minute

  if (!editorRef.current) return null;

  const bubbleElement = (
    <motion.div
      ref={bubbleRef}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ duration: 0.15 }}
      className="absolute group"
      style={{
        left: position.left + position.width + 8,
        top: position.top,
        zIndex: 1000
      }}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => {
        setShowTooltip(false);
        setShowActions(false);
      }}
    >
      {/* Main comment bubble */}
      <div
        onClick={handleClick}
        className={`
          relative cursor-pointer transition-all duration-200
          ${compact ? 'w-6 h-6' : 'w-8 h-8'}
          ${getStatusColor()}
          rounded-full border-2 shadow-lg hover:shadow-xl
          flex items-center justify-center
          transform hover:scale-110 group-hover:scale-110
        `}
      >
        <StatusIcon className={`${compact ? 'w-3 h-3' : 'w-4 h-4'} text-white`} />
        
        {/* Reply count badge */}
        {replyCount > 0 && (
          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-orange-500 rounded-full flex items-center justify-center border-2 border-white dark:border-gray-800">
            <span className="text-xs font-bold text-white">{replyCount}</span>
          </div>
        )}

        {/* Recent comment indicator */}
        {isRecent && (
          <div className="absolute -top-1 -left-1 w-3 h-3 bg-yellow-400 rounded-full border border-white animate-pulse" />
        )}
      </div>

      {/* Hover tooltip */}
      <AnimatePresence>
        {showTooltip && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 pointer-events-none z-50"
          >
            <div className="bg-gray-900 dark:bg-gray-700 text-white text-sm rounded-lg px-3 py-2 shadow-xl max-w-xs">
              <div className="font-medium truncate">{comment.user?.name || 'Unknown User'}</div>
              <div className="text-gray-300 text-xs mb-1">
                {comment.status} • {new Date(comment.created_at).toLocaleDateString()}
              </div>
              <div className="text-gray-200 line-clamp-2">
                {comment.content.length > 60 ? comment.content.substring(0, 60) + '...' : comment.content}
              </div>
              {replyCount > 0 && (
                <div className="text-orange-300 text-xs mt-1">
                  {replyCount} {replyCount === 1 ? 'reply' : 'replies'}
                </div>
              )}
              
              {/* Tooltip arrow */}
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900 dark:border-t-gray-700" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick actions menu */}
      <AnimatePresence>
        {showActions && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl p-1 z-50"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => handleClick({ preventDefault: () => {}, stopPropagation: () => {} } as any)}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
            >
              <Reply className="w-4 h-4" />
              Reply
            </button>
            
            {comment.status === 'pending' && (
              <button
                onClick={() => handleStatusChange('resolved')}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-green-700 dark:text-green-300 hover:bg-green-50 dark:hover:bg-green-900/20 rounded"
              >
                <CheckCircle className="w-4 h-4" />
                Resolve
              </button>
            )}
            
            {comment.status !== 'archived' && (
              <button
                onClick={() => handleStatusChange('archived')}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              >
                <Archive className="w-4 h-4" />
                Archive
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Right-click context menu trigger */}
      <div
        className="absolute top-0 right-0 w-4 h-4 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={(e) => {
          e.stopPropagation();
          setShowActions(!showActions);
        }}
      >
        <MoreHorizontal className="w-3 h-3 text-white" />
      </div>
    </motion.div>
  );

  return ReactDOM.createPortal(bubbleElement, editorRef.current);
};