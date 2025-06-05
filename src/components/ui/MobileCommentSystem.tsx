import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  MessageCircle, Reply, Check, X, MoreVertical, Edit3, Trash2,
  ChevronDown, ChevronRight, User, Clock, AlertCircle, CheckCircle,
  ThumbsUp, Flag, Share2, ArrowUp, ArrowDown, Eye, EyeOff,
  Filter, Search, SortAsc, Grid, List as ListIcon
} from 'lucide-react';

import { useMobileDetection, isTouchDevice } from '../../hooks/useMobileDetection';
import { MobileResponsiveModal } from './MobileResponsiveModal';

interface Comment {
  id: string;
  content: string;
  author: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  createdAt: string;
  updatedAt?: string;
  status: 'active' | 'resolved' | 'archived';
  position?: {
    line: number;
    column: number;
    text?: string;
  };
  replies?: Comment[];
  reactions?: {
    type: 'like' | 'dislike';
    count: number;
    userReacted: boolean;
  }[];
  isResolved?: boolean;
  resolvedBy?: string;
  resolvedAt?: string;
  priority?: 'low' | 'medium' | 'high';
  tags?: string[];
}

interface MobileCommentSystemProps {
  articleId: string;
  comments: Comment[];
  onCommentAdd: (content: string, position?: any) => void;
  onCommentEdit: (commentId: string, content: string) => void;
  onCommentDelete: (commentId: string) => void;
  onCommentResolve: (commentId: string) => void;
  onCommentReply: (parentId: string, content: string) => void;
  onCommentReaction: (commentId: string, type: 'like' | 'dislike') => void;
  currentUserId?: string;
  isAdmin?: boolean;
  className?: string;
}

interface MobileCommentThreadProps {
  comment: Comment;
  onEdit: (commentId: string, content: string) => void;
  onDelete: (commentId: string) => void;
  onResolve: (commentId: string) => void;
  onReply: (parentId: string, content: string) => void;
  onReaction: (commentId: string, type: 'like' | 'dislike') => void;
  currentUserId?: string;
  isAdmin?: boolean;
  depth?: number;
}

// Mobile Comment Thread Component
const MobileCommentThread: React.FC<MobileCommentThreadProps> = ({
  comment,
  onEdit,
  onDelete,
  onResolve,
  onReply,
  onReaction,
  currentUserId,
  isAdmin,
  depth = 0
}) => {
  const { isMobile } = useMobileDetection();
  const [isExpanded, setIsExpanded] = useState(true);
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [replyContent, setReplyContent] = useState('');
  
  const canEdit = currentUserId === comment.author.id || isAdmin;
  const canResolve = isAdmin || currentUserId === comment.author.id;
  const maxDepth = isMobile ? 3 : 5;
  const indentationLevel = Math.min(depth, maxDepth);
  const marginLeft = indentationLevel * (isMobile ? 16 : 24);

  const handleEdit = () => {
    onEdit(comment.id, editContent);
    setIsEditing(false);
  };

  const handleReply = () => {
    onReply(comment.id, replyContent);
    setReplyContent('');
    setShowReplyForm(false);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div 
      className={`
        ${comment.status === 'resolved' ? 'opacity-70' : ''}
        ${depth > 0 ? 'border-l-2 border-gray-200' : ''}
      `}
      style={{ marginLeft: `${marginLeft}px` }}
    >
      {/* Comment Header */}
      <div className="p-4 bg-white border-b border-gray-100">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3 flex-1">
            {/* Avatar */}
            <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center flex-shrink-0">
              {comment.author.avatar ? (
                <img 
                  src={comment.author.avatar} 
                  alt={comment.author.name}
                  className="w-8 h-8 rounded-full"
                />
              ) : (
                <span className="text-sm font-medium text-gray-600">
                  {comment.author.name?.[0]?.toUpperCase() || 'U'}
                </span>
              )}
            </div>
            
            {/* Comment Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-1">
                <span className="font-medium text-gray-900 text-sm truncate">
                  {comment.author.name}
                </span>
                <span className="text-xs text-gray-500 flex-shrink-0">
                  {formatDate(comment.createdAt)}
                </span>
                {comment.status === 'resolved' && (
                  <CheckCircle className="text-green-500 flex-shrink-0" size={14} />
                )}
              </div>
              
              {/* Priority and Tags */}
              {(comment.priority || comment.tags?.length) && (
                <div className="flex items-center space-x-2 mb-2">
                  {comment.priority && (
                    <span className={`
                      text-xs px-2 py-1 rounded-full
                      ${comment.priority === 'high' ? 'bg-red-100 text-red-600' : ''}
                      ${comment.priority === 'medium' ? 'bg-yellow-100 text-yellow-600' : ''}
                      ${comment.priority === 'low' ? 'bg-green-100 text-green-600' : ''}
                    `}>
                      {comment.priority}
                    </span>
                  )}
                  {comment.tags?.map(tag => (
                    <span key={tag} className="text-xs px-2 py-1 bg-blue-100 text-blue-600 rounded-full">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          {/* Actions Menu */}
          <button
            onClick={() => setShowActions(!showActions)}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors flex-shrink-0"
          >
            <MoreVertical size={16} />
          </button>
        </div>
        
        {/* Actions Dropdown */}
        {showActions && (
          <div className="absolute right-4 top-12 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-[160px]">
            <div className="py-1">
              <button
                onClick={() => setShowReplyForm(!showReplyForm)}
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center space-x-2"
              >
                <Reply size={14} />
                <span>Reply</span>
              </button>
              
              {canEdit && (
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center space-x-2"
                >
                  <Edit3 size={14} />
                  <span>Edit</span>
                </button>
              )}
              
              {canResolve && !comment.isResolved && (
                <button
                  onClick={() => onResolve(comment.id)}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center space-x-2 text-green-600"
                >
                  <Check size={14} />
                  <span>Resolve</span>
                </button>
              )}
              
              {canEdit && (
                <button
                  onClick={() => onDelete(comment.id)}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center space-x-2 text-red-600"
                >
                  <Trash2 size={14} />
                  <span>Delete</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
      
      {/* Comment Content */}
      <div className="px-4 py-3">
        {isEditing ? (
          <div className="space-y-3">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary-500"
              rows={3}
              placeholder="Edit your comment..."
            />
            <div className="flex items-center space-x-2">
              <button
                onClick={handleEdit}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700"
              >
                Save
              </button>
              <button
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="text-gray-900 text-sm leading-relaxed whitespace-pre-wrap">
            {comment.content}
          </div>
        )}
        
        {/* Position Info */}
        {comment.position && (
          <div className="mt-2 text-xs text-gray-500 bg-gray-50 rounded p-2">
            Line {comment.position.line}, Column {comment.position.column}
            {comment.position.text && (
              <div className="mt-1 font-mono text-gray-600">
                "{comment.position.text}"
              </div>
            )}
          </div>
        )}
        
        {/* Reactions */}
        {comment.reactions && comment.reactions.length > 0 && (
          <div className="flex items-center space-x-3 mt-3">
            {comment.reactions.map(reaction => (
              <button
                key={reaction.type}
                onClick={() => onReaction(comment.id, reaction.type)}
                className={`
                  flex items-center space-x-1 px-2 py-1 rounded-full text-xs transition-colors
                  ${reaction.userReacted ? 'bg-primary-100 text-primary-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}
                `}
              >
                {reaction.type === 'like' ? <ThumbsUp size={12} /> : <ArrowDown size={12} />}
                <span>{reaction.count}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      
      {/* Reply Form */}
      {showReplyForm && (
        <div className="px-4 pb-4">
          <div className="bg-gray-50 rounded-lg p-3">
            <textarea
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary-500"
              rows={2}
              placeholder="Write a reply..."
            />
            <div className="flex items-center justify-between mt-3">
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleReply}
                  disabled={!replyContent.trim()}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Reply
                </button>
                <button
                  onClick={() => setShowReplyForm(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="border-t border-gray-100">
          {isExpanded ? (
            <div>
              {comment.replies.map(reply => (
                <MobileCommentThread
                  key={reply.id}
                  comment={reply}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onResolve={onResolve}
                  onReply={onReply}
                  onReaction={onReaction}
                  currentUserId={currentUserId}
                  isAdmin={isAdmin}
                  depth={depth + 1}
                />
              ))}
            </div>
          ) : (
            <button
              onClick={() => setIsExpanded(true)}
              className="w-full p-3 text-left text-sm text-gray-600 hover:bg-gray-50 flex items-center space-x-2"
            >
              <ChevronRight size={16} />
              <span>Show {comment.replies.length} replies</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};

// Main Mobile Comment System Component
export const MobileCommentSystem: React.FC<MobileCommentSystemProps> = ({
  articleId,
  comments,
  onCommentAdd,
  onCommentEdit,
  onCommentDelete,
  onCommentResolve,
  onCommentReply,
  onCommentReaction,
  currentUserId,
  isAdmin,
  className = ''
}) => {
  const { isMobile } = useMobileDetection();
  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);
  const [newCommentContent, setNewCommentContent] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'resolved'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'priority'>('newest');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'compact'>('list');
  
  // Filter and sort comments
  const filteredComments = comments
    .filter(comment => {
      if (filterStatus !== 'all' && comment.status !== filterStatus) return false;
      if (searchQuery && !comment.content.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'priority':
          const priorityOrder = { high: 3, medium: 2, low: 1 };
          return (priorityOrder[b.priority || 'low'] || 1) - (priorityOrder[a.priority || 'low'] || 1);
        default:
          return 0;
      }
    });

  const handleAddComment = () => {
    if (newCommentContent.trim()) {
      onCommentAdd(newCommentContent);
      setNewCommentContent('');
      setIsCommentModalOpen(false);
    }
  };

  const unresolvedCount = comments.filter(c => c.status === 'active').length;
  const resolvedCount = comments.filter(c => c.status === 'resolved').length;

  if (!isMobile) {
    return null; // Use desktop comment system
  }

  return (
    <div className={`bg-white ${className}`}>
      {/* Mobile Comment Header */}
      <div className="sticky top-0 z-30 bg-white border-b border-gray-200">
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <MessageCircle size={20} className="text-gray-600" />
              <span className="font-medium text-gray-900">
                Comments ({comments.length})
              </span>
            </div>
            
            <button
              onClick={() => setIsCommentModalOpen(true)}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700"
            >
              Add Comment
            </button>
          </div>
          
          {/* Comment Stats */}
          <div className="flex items-center space-x-4 mb-4">
            <div className="flex items-center space-x-1 text-sm text-gray-600">
              <AlertCircle size={14} />
              <span>{unresolvedCount} unresolved</span>
            </div>
            <div className="flex items-center space-x-1 text-sm text-gray-600">
              <CheckCircle size={14} />
              <span>{resolvedCount} resolved</span>
            </div>
          </div>
          
          {/* Search Bar */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search comments..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          
          {/* Filters and Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="text-sm border border-gray-300 rounded px-2 py-1"
              >
                <option value="all">All</option>
                <option value="active">Active</option>
                <option value="resolved">Resolved</option>
              </select>
              
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="text-sm border border-gray-300 rounded px-2 py-1"
              >
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
                <option value="priority">Priority</option>
              </select>
            </div>
            
            <button
              onClick={() => setViewMode(viewMode === 'list' ? 'compact' : 'list')}
              className="p-2 rounded-lg hover:bg-gray-100"
            >
              {viewMode === 'list' ? <Grid size={16} /> : <ListIcon size={16} />}
            </button>
          </div>
        </div>
      </div>
      
      {/* Comments List */}
      <div className="divide-y divide-gray-200">
        {filteredComments.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <MessageCircle size={48} className="mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium mb-2">No comments found</p>
            <p className="text-sm">
              {searchQuery ? 'Try adjusting your search' : 'Be the first to add a comment'}
            </p>
          </div>
        ) : (
          filteredComments.map(comment => (
            <MobileCommentThread
              key={comment.id}
              comment={comment}
              onEdit={onCommentEdit}
              onDelete={onCommentDelete}
              onResolve={onCommentResolve}
              onReply={onCommentReply}
              onReaction={onCommentReaction}
              currentUserId={currentUserId}
              isAdmin={isAdmin}
            />
          ))
        )}
      </div>
      
      {/* Add Comment Modal */}
      <MobileResponsiveModal
        isOpen={isCommentModalOpen}
        onClose={() => setIsCommentModalOpen(false)}
        title="Add Comment"
        fullHeight={false}
      >
        <div className="p-4">
          <textarea
            value={newCommentContent}
            onChange={(e) => setNewCommentContent(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary-500"
            rows={4}
            placeholder="Write your comment..."
          />
          
          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center space-x-2">
              <button
                onClick={handleAddComment}
                disabled={!newCommentContent.trim()}
                className="px-6 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Post Comment
              </button>
              <button
                onClick={() => setIsCommentModalOpen(false)}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </MobileResponsiveModal>
    </div>
  );
};

// Export hook for mobile comment management
export const useMobileComments = (articleId: string) => {
  const { isMobile } = useMobileDetection();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  
  const addComment = useCallback((content: string, position?: any) => {
    // Implementation for adding comment
    console.log('Adding comment:', content, position);
  }, []);
  
  const editComment = useCallback((commentId: string, content: string) => {
    // Implementation for editing comment
    console.log('Editing comment:', commentId, content);
  }, []);
  
  const deleteComment = useCallback((commentId: string) => {
    // Implementation for deleting comment
    console.log('Deleting comment:', commentId);
  }, []);
  
  const resolveComment = useCallback((commentId: string) => {
    // Implementation for resolving comment
    console.log('Resolving comment:', commentId);
  }, []);
  
  const replyToComment = useCallback((parentId: string, content: string) => {
    // Implementation for replying to comment
    console.log('Replying to comment:', parentId, content);
  }, []);
  
  const reactToComment = useCallback((commentId: string, type: 'like' | 'dislike') => {
    // Implementation for reacting to comment
    console.log('Reacting to comment:', commentId, type);
  }, []);
  
  return {
    isMobile,
    comments,
    loading,
    addComment,
    editComment,
    deleteComment,
    resolveComment,
    replyToComment,
    reactToComment
  };
}; 