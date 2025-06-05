import React, { useState } from 'react';
import { AdminArticleComment, CommentPriority, AdminCommentType, ApprovalStatus } from '../../types/adminComment';
import { PRIORITY_LEVELS, ADMIN_COMMENT_TYPES } from '../../types/adminComment';
import { approveComment, rejectComment, updateCommentsPriority } from '../../lib/adminCommentApi';
import { formatDistanceToNow } from 'date-fns';

interface AdminCommentCardProps {
  comment: AdminArticleComment;
  onUpdate?: () => void;
  showArticleInfo?: boolean;
  isSelected?: boolean;
  onSelect?: (commentId: string, selected: boolean) => void;
}

export const AdminCommentCard: React.FC<AdminCommentCardProps> = ({
  comment,
  onUpdate,
  showArticleInfo = false,
  isSelected = false,
  onSelect
}) => {
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [showApprovalForm, setShowApprovalForm] = useState(false);
  const [approvalComments, setApprovalComments] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [isUpdatingPriority, setIsUpdatingPriority] = useState(false);

  const priorityConfig = PRIORITY_LEVELS[comment.priority];
  const typeConfig = comment.admin_comment_type ? ADMIN_COMMENT_TYPES[comment.admin_comment_type] : null;

  const handleApprove = async () => {
    if (!showApprovalForm) {
      setShowApprovalForm(true);
      return;
    }

    setIsApproving(true);
    try {
      await approveComment(comment.id, approvalComments);
      setShowApprovalForm(false);
      setApprovalComments('');
      onUpdate?.();
    } catch (error) {
      console.error('Error approving comment:', error);
      alert('Failed to approve comment');
    } finally {
      setIsApproving(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }

    setIsRejecting(true);
    try {
      await rejectComment(comment.id, rejectionReason);
      setRejectionReason('');
      onUpdate?.();
    } catch (error) {
      console.error('Error rejecting comment:', error);
      alert('Failed to reject comment');
    } finally {
      setIsRejecting(false);
    }
  };

  const handlePriorityChange = async (newPriority: CommentPriority) => {
    setIsUpdatingPriority(true);
    try {
      await updateCommentsPriority([comment.id], newPriority);
      onUpdate?.();
    } catch (error) {
      console.error('Error updating priority:', error);
      alert('Failed to update priority');
    } finally {
      setIsUpdatingPriority(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const configs = {
      active: { label: 'Active', className: 'bg-green-100 text-green-800' },
      resolved: { label: 'Resolved', className: 'bg-blue-100 text-blue-800' },
      archived: { label: 'Archived', className: 'bg-gray-100 text-gray-800' }
    };
    const config = configs[status as keyof typeof configs] || configs.active;
    
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${config.className}`}>
        {config.label}
      </span>
    );
  };

  const getApprovalStatusBadge = (status?: ApprovalStatus) => {
    if (!status) return null;

    const configs = {
      pending: { label: 'Pending', className: 'bg-yellow-100 text-yellow-800' },
      approved: { label: 'Approved', className: 'bg-green-100 text-green-800' },
      rejected: { label: 'Rejected', className: 'bg-red-100 text-red-800' },
      requires_changes: { label: 'Needs Changes', className: 'bg-orange-100 text-orange-800' },
      escalated: { label: 'Escalated', className: 'bg-purple-100 text-purple-800' }
    };
    
    const config = configs[status];
    
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${config.className}`}>
        {config.label}
      </span>
    );
  };

  return (
    <div className={`border rounded-lg p-4 bg-white shadow-sm hover:shadow-md transition-shadow ${
      isSelected ? 'ring-2 ring-blue-500 border-blue-500' : ''
    } ${comment.is_admin_only ? 'border-l-4 border-l-purple-500' : ''}`}>
      {/* Header with selection checkbox and metadata */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-3">
          {onSelect && (
            <input
              type="checkbox"
              checked={isSelected}
              onChange={(e) => onSelect(comment.id, e.target.checked)}
              className="h-4 w-4 text-blue-600 rounded border-gray-300"
            />
          )}
          
          <div className="flex flex-col">
            <div className="flex items-center space-x-2">
              <span className="font-medium text-gray-900">
                {comment.user?.email || 'Unknown User'}
              </span>
              {comment.is_admin_only && (
                <span className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded-full">
                  🔒 Admin Only
                </span>
              )}
            </div>
            <span className="text-sm text-gray-500">
              {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {getStatusBadge(comment.status)}
          {getApprovalStatusBadge(comment.approval_status)}
        </div>
      </div>

      {/* Priority and Type badges */}
      <div className="flex items-center space-x-2 mb-3">
        <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${priorityConfig.bgColor} ${priorityConfig.color}`}>
          <span>{priorityConfig.icon}</span>
          <span>{priorityConfig.label} Priority</span>
        </div>
        
        {typeConfig && (
          <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${typeConfig.bgColor} ${typeConfig.color}`}>
            <span>{typeConfig.icon}</span>
            <span>{typeConfig.label}</span>
          </div>
        )}
      </div>

      {/* Article info if requested */}
      {showArticleInfo && (
        <div className="mb-3 p-2 bg-gray-50 rounded">
          <span className="text-sm text-gray-600">
            Article: <span className="font-medium">{comment.article_id}</span>
          </span>
        </div>
      )}

      {/* Comment content */}
      <div className="mb-4">
        <p className="text-gray-900 whitespace-pre-wrap">{comment.content}</p>
        
        {comment.admin_notes && (
          <div className="mt-2 p-2 bg-yellow-50 border-l-4 border-yellow-400">
            <p className="text-sm text-gray-700">
              <span className="font-medium">Admin Notes:</span> {comment.admin_notes}
            </p>
          </div>
        )}
      </div>

      {/* Approval section for pending comments */}
      {comment.approval_status === 'pending' && (
        <div className="border-t pt-3 space-y-3">
          {!showApprovalForm ? (
            <div className="flex space-x-2">
              <button
                onClick={handleApprove}
                className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
              >
                ✅ Approve
              </button>
              <button
                onClick={() => setIsRejecting(!isRejecting)}
                className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
              >
                ❌ Reject
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <textarea
                value={approvalComments}
                onChange={(e) => setApprovalComments(e.target.value)}
                placeholder="Optional approval comments..."
                className="w-full p-2 border border-gray-300 rounded-md text-sm"
                rows={2}
              />
              <div className="flex space-x-2">
                <button
                  onClick={handleApprove}
                  disabled={isApproving}
                  className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-50"
                >
                  {isApproving ? 'Approving...' : 'Confirm Approval'}
                </button>
                <button
                  onClick={() => setShowApprovalForm(false)}
                  className="px-3 py-1 bg-gray-300 text-gray-700 text-sm rounded hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {isRejecting && (
            <div className="space-y-2">
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Reason for rejection (required)..."
                className="w-full p-2 border border-gray-300 rounded-md text-sm"
                rows={2}
                required
              />
              <div className="flex space-x-2">
                <button
                  onClick={handleReject}
                  disabled={isRejecting || !rejectionReason.trim()}
                  className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:opacity-50"
                >
                  {isRejecting ? 'Rejecting...' : 'Confirm Rejection'}
                </button>
                <button
                  onClick={() => setIsRejecting(false)}
                  className="px-3 py-1 bg-gray-300 text-gray-700 text-sm rounded hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Priority adjustment */}
      <div className="border-t pt-3 mt-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">Priority:</span>
          <select
            value={comment.priority}
            onChange={(e) => handlePriorityChange(e.target.value as CommentPriority)}
            disabled={isUpdatingPriority}
            className="text-sm border border-gray-300 rounded px-2 py-1"
          >
            {Object.entries(PRIORITY_LEVELS).map(([value, config]) => (
              <option key={value} value={value}>
                {config.icon} {config.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Approval info if approved */}
      {comment.approval_status === 'approved' && comment.approver && (
        <div className="border-t pt-3 mt-3">
          <p className="text-sm text-gray-600">
            Approved by <span className="font-medium">{comment.approver.email}</span>
            {comment.approved_at && (
              <span> on {new Date(comment.approved_at).toLocaleDateString()}</span>
            )}
          </p>
        </div>
      )}

      {/* Reply count if has replies */}
      {comment.reply_count !== undefined && comment.reply_count > 0 && (
        <div className="border-t pt-3 mt-3">
          <p className="text-sm text-gray-600">
            {comment.reply_count} {comment.reply_count === 1 ? 'reply' : 'replies'}
          </p>
        </div>
      )}
    </div>
  );
}; 