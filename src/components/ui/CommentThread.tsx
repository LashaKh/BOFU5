import React, { useState } from 'react';
import { MessageCircle, CheckCircle, Archive, MoreHorizontal, Edit2, Trash2, Reply, Clock, AlertTriangle, Calendar, User } from 'lucide-react';
import { ArticleComment } from '../../lib/commentApi';

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
  showResolutionDetails = true
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
    <div className={`border-l-2 ${depth > 0 ? 'ml-4 pl-3 border-gray-200' : 'border-transparent'}`}>
      {/* Main Comment */}
      <div className={`p-3 border rounded-lg ${getStatusColor(comment.status)} ${depth === 0 ? 'mb-2' : 'mb-1'} transition-all duration-200`}>
        {/* Header */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2 flex-1">
            {/* User Avatar */}
            <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-medium">
              {comment.user?.name?.charAt(0) || comment.user?.email?.charAt(0) || '?'}
            </div>
            
            {/* User Info */}
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-900">
                  {comment.user?.name || comment.user?.email || 'Unknown User'}
                </span>
                <span className={`px-2 py-0.5 text-xs rounded-full ${typeInfo.color}`}>
                  {typeInfo.label}
                </span>
              </div>
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <Clock size={10} />
                <span>{formatDate(comment.created_at)}</span>
                {comment.updated_at !== comment.created_at && (
                  <span className="text-gray-400">• edited</span>
                )}
              </div>
            </div>
          </div>

          {/* Status Badge and Actions */}
          <div className="flex items-center gap-2">
            {showResolutionDetails && getStatusBadge(comment.status)}
            
            {showActions && (
              <div className="relative">
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="p-1 hover:bg-gray-100 rounded transition-colors"
                >
                  <MoreHorizontal size={14} className="text-gray-500" />
                </button>

                {showMenu && (
                  <div className="absolute right-0 mt-1 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                    <div className="py-1">
                      <button
                        onClick={() => {
                          onReply(comment);
                          setShowMenu(false);
                        }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
                      >
                        <Reply size={12} />
                        Reply
                      </button>
                      
                      <button
                        onClick={() => {
                          onEdit(comment);
                          setShowMenu(false);
                        }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
                      >
                        <Edit2 size={12} />
                        Edit
                      </button>
                      
                      <div className="border-t border-gray-100 my-1" />
                      
                      {comment.status !== 'resolved' && (
                        <>
                          <button
                            onClick={() => {
                              setShowResolutionDialog(true);
                              setShowMenu(false);
                            }}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2 text-green-600"
                          >
                            <CheckCircle size={12} />
                            Resolve with Reason
                          </button>
                          <button
                            onClick={() => {
                              onStatusChange(comment.id, 'resolved');
                              setShowMenu(false);
                            }}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2 text-green-600"
                          >
                            <CheckCircle size={12} />
                            Quick Resolve
                          </button>
                        </>
                      )}
                      
                      {comment.status === 'resolved' && (
                        <button
                          onClick={() => {
                            onStatusChange(comment.id, 'active');
                            setShowMenu(false);
                          }}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2 text-blue-600"
                        >
                          <MessageCircle size={12} />
                          Reopen
                        </button>
                      )}
                      
                      <button
                        onClick={() => {
                          onStatusChange(comment.id, 'archived');
                          setShowMenu(false);
                        }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2 text-gray-600"
                      >
                        <Archive size={12} />
                        Archive
                      </button>
                      
                      <div className="border-t border-gray-100 my-1" />
                      
                      <button
                        onClick={() => {
                          onDelete(comment.id);
                          setShowMenu(false);
                        }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2 text-red-600"
                      >
                        <Trash2 size={12} />
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Comment Content */}
        <div className="text-sm text-gray-700 whitespace-pre-wrap">
          {comment.content}
        </div>

        {/* Text Selection Info */}
        {comment.selection_start !== undefined && comment.selection_end !== undefined && (
          <div className="mt-2 text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded">
            📍 Inline comment (characters {comment.selection_start}-{comment.selection_end})
          </div>
        )}

        {/* Actions Bar */}
        {showActions && depth === 0 && (
          <div className="flex items-center gap-4 mt-3 pt-2 border-t border-gray-100">
            <button
              onClick={() => onReply(comment)}
              className="text-xs text-gray-500 hover:text-blue-600 flex items-center gap-1 transition-colors"
            >
              <Reply size={12} />
              Reply
            </button>
            
            {comment.replies && comment.replies.length > 0 && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-xs text-gray-500 hover:text-blue-600 flex items-center gap-1 transition-colors"
              >
                {isExpanded ? '▼' : '▶'} {comment.replies.length} {comment.replies.length === 1 ? 'reply' : 'replies'}
              </button>
            )}

            {/* Quick resolution for urgent comments */}
            {comment.status === 'active' && getCommentAge() > 7 && (
              <button
                onClick={() => setShowResolutionDialog(true)}
                className="text-xs text-orange-600 hover:text-orange-700 flex items-center gap-1 transition-colors"
              >
                <AlertTriangle size={12} />
                Resolve
              </button>
            )}
          </div>
        )}
      </div>

      {/* Resolution Dialog */}
      {showResolutionDialog && (
        <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="mb-3">
            <h4 className="text-sm font-medium text-green-800 mb-2">Resolve Comment</h4>
            <p className="text-xs text-green-700">Choose a resolution template or provide a custom reason:</p>
          </div>

          {/* Resolution Templates */}
          <div className="mb-3">
            <label className="block text-xs font-medium text-gray-700 mb-1">Quick Templates:</label>
            <select
              value={selectedTemplate}
              onChange={(e) => setSelectedTemplate(e.target.value)}
              className="w-full text-xs border border-gray-300 rounded px-2 py-1"
            >
              <option value="">Select a template...</option>
              {resolutionTemplates.map(template => (
                <option key={template.id} value={template.id}>
                  {template.label}
                </option>
              ))}
            </select>
            {selectedTemplate && (
              <p className="text-xs text-gray-600 mt-1">
                {resolutionTemplates.find(t => t.id === selectedTemplate)?.reason}
              </p>
            )}
          </div>

          {/* Custom Reason */}
          <div className="mb-3">
            <label className="block text-xs font-medium text-gray-700 mb-1">Custom Reason:</label>
            <textarea
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              placeholder="Provide a custom resolution reason..."
              className="w-full text-xs border border-gray-300 rounded px-2 py-1 h-16 resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleResolveWithTemplate}
              disabled={!selectedTemplate && !customReason.trim()}
              className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Resolve
            </button>
            <button
              onClick={() => {
                setShowResolutionDialog(false);
                setSelectedTemplate('');
                setCustomReason('');
              }}
              className="px-3 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Replies */}
      {comment.replies && comment.replies.length > 0 && isExpanded && (
        <div className="space-y-2">
          {comment.replies.map((reply) => (
            <CommentThread
              key={reply.id}
              comment={reply}
              onReply={onReply}
              onEdit={onEdit}
              onDelete={onDelete}
              onStatusChange={onStatusChange}
              onResolveWithReason={onResolveWithReason}
              showActions={showActions}
              depth={depth + 1}
              showResolutionDetails={showResolutionDetails}
            />
          ))}
        </div>
      )}

      {/* Click outside handler */}
      {showMenu && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setShowMenu(false)}
        />
      )}
    </div>
  );
}; 