import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AdminArticleComment, CommentPriority, AdminCommentType, ApprovalStatus } from '../../types/adminComment';
import { PRIORITY_LEVELS, ADMIN_COMMENT_TYPES } from '../../types/adminComment';
import { approveComment, rejectComment, updateCommentsPriority } from '../../lib/adminCommentApi';
import { formatDistanceToNow } from 'date-fns';
import {
  Check,
  X,
  Clock,
  AlertTriangle,
  Shield,
  MessageSquare,
  User,
  Calendar,
  ChevronDown,
  Star,
  Zap,
  Target,
  CheckCircle,
  XCircle,
  Edit3,
  MoreHorizontal,
  Flag,
  Eye,
  ThumbsUp,
  ThumbsDown,
  Send,
  Sparkles,
  Lock,
  Globe,
  Settings,
  ArrowRight,
  Archive
} from 'lucide-react';

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
      active: { 
        label: 'Active', 
        className: 'bg-gradient-to-r from-green-100 to-green-50 text-green-800 border border-green-200',
        icon: CheckCircle
      },
      resolved: { 
        label: 'Resolved', 
        className: 'bg-gradient-to-r from-blue-100 to-blue-50 text-blue-800 border border-blue-200',
        icon: Check
      },
      archived: { 
        label: 'Archived', 
        className: 'bg-gradient-to-r from-gray-100 to-gray-50 text-gray-800 border border-gray-200',
        icon: Archive
      }
    };
    const config = configs[status as keyof typeof configs] || configs.active;
    const IconComponent = config.icon;
    
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full backdrop-blur-sm ${config.className}`}
      >
        <IconComponent className="h-3 w-3" />
        <span>{config.label}</span>
      </motion.div>
    );
  };

  const getApprovalStatusBadge = (status?: ApprovalStatus) => {
    if (!status) return null;

    const configs = {
      pending: { 
        label: 'Pending', 
        className: 'bg-gradient-to-r from-yellow-100 to-amber-50 text-yellow-800 border border-yellow-200',
        icon: Clock
      },
      approved: { 
        label: 'Approved', 
        className: 'bg-gradient-to-r from-green-100 to-emerald-50 text-green-800 border border-green-200',
        icon: CheckCircle
      },
      rejected: { 
        label: 'Rejected', 
        className: 'bg-gradient-to-r from-red-100 to-red-50 text-red-800 border border-red-200',
        icon: XCircle
      },
      requires_changes: { 
        label: 'Needs Changes', 
        className: 'bg-gradient-to-r from-orange-100 to-orange-50 text-orange-800 border border-orange-200',
        icon: AlertTriangle
      },
      escalated: { 
        label: 'Escalated', 
        className: 'bg-gradient-to-r from-purple-100 to-purple-50 text-purple-800 border border-purple-200',
        icon: Flag
      }
    };
    
    const config = configs[status];
    const IconComponent = config.icon;
    
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full backdrop-blur-sm ${config.className}`}
      >
        <IconComponent className="h-3 w-3" />
        <span>{config.label}</span>
      </motion.div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      whileHover={{ y: -2, scale: 1.01 }}
      transition={{ duration: 0.3, type: "spring", stiffness: 200 }}
      className={`group relative bg-gradient-to-br from-white via-gray-50/30 to-white backdrop-blur-xl rounded-2xl border shadow-lg hover:shadow-2xl transition-all duration-500 overflow-hidden ${
        isSelected 
          ? 'ring-2 ring-blue-500/50 border-blue-500/30 shadow-blue-500/25' 
          : 'border-gray-200/50 hover:border-gray-300/60'
      }`}
    >
      {/* Floating Particles Effect */}
      <div className="absolute inset-0 overflow-hidden rounded-2xl">
        <div className="absolute -top-4 -right-4 w-32 h-32 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
        <div className="absolute -bottom-4 -left-4 w-24 h-24 bg-gradient-to-tr from-green-500/10 to-blue-500/10 rounded-full blur-xl opacity-0 group-hover:opacity-70 transition-opacity duration-700"></div>
      </div>

      {/* Admin Only Left Border */}
      {comment.is_admin_only && (
        <div className="absolute left-0 top-0 w-1 h-full bg-gradient-to-b from-purple-500 to-purple-600 rounded-l-2xl"></div>
      )}

      <div className="relative z-10 p-6">
        {/* Header Section */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-start gap-4">
            {/* Selection Checkbox */}
            {onSelect && (
              <motion.div 
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="relative"
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={(e) => onSelect(comment.id, e.target.checked)}
                  className="h-5 w-5 text-blue-600 rounded-lg border-2 border-gray-300 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                />
                {isSelected && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute inset-0 flex items-center justify-center pointer-events-none"
                  >
                    <Check className="h-3 w-3 text-white" />
                  </motion.div>
                )}
              </motion.div>
            )}
            
            {/* User Avatar and Info */}
            <div className="flex items-start gap-4">
              <motion.div 
                whileHover={{ scale: 1.05 }}
                className="relative"
              >
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                  <User className="h-6 w-6 text-white" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
              </motion.div>
              
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-3">
                  <h3 className="font-semibold text-gray-900 text-lg">
                    {comment.user?.email || 'Unknown User'}
                  </h3>
                  
                  {comment.is_admin_only && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-purple-500/20 to-purple-600/20 backdrop-blur-sm border border-purple-500/30 rounded-full"
                    >
                      <Lock className="h-3 w-3 text-purple-600" />
                      <span className="text-xs font-medium text-purple-700">Admin Only</span>
                    </motion.div>
                  )}
                </div>
                
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Calendar className="h-4 w-4" />
                  <span>{formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Status Badges */}
          <div className="flex items-center gap-2">
            {getStatusBadge(comment.status)}
            {getApprovalStatusBadge(comment.approval_status)}
            
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <MoreHorizontal className="h-4 w-4 text-gray-400" />
            </motion.button>
          </div>
        </div>

        {/* Priority and Type Tags */}
        <div className="flex items-center gap-3 mb-6">
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl backdrop-blur-sm border shadow-sm ${priorityConfig.bgColor} ${priorityConfig.color}`}
          >
            <span className="text-sm">{priorityConfig.icon}</span>
            <span className="text-sm font-medium">{priorityConfig.label}</span>
            <div className="text-xs opacity-70">Priority</div>
          </motion.div>
          
          {typeConfig && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl backdrop-blur-sm border shadow-sm ${typeConfig.bgColor} ${typeConfig.color}`}
            >
              <span className="text-sm">{typeConfig.icon}</span>
              <span className="text-sm font-medium">{typeConfig.label}</span>
            </motion.div>
          )}
          
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="flex items-center gap-2 px-3 py-1 bg-gray-100/80 backdrop-blur-sm border border-gray-200 rounded-lg"
          >
            <MessageSquare className="h-4 w-4 text-gray-500" />
            <span className="text-xs text-gray-600 font-medium">ID: {comment.id.slice(-8)}</span>
          </motion.div>
        </div>

        {/* Article Info */}
        {showArticleInfo && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mb-6 p-4 bg-gradient-to-r from-blue-50/80 to-indigo-50/80 backdrop-blur-sm border border-blue-200/50 rounded-xl"
          >
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-blue-600" />
              <span className="text-sm text-blue-700 font-medium">Article Reference</span>
            </div>
            <div className="mt-2 font-mono text-sm text-blue-800 bg-blue-100/50 px-3 py-1 rounded-lg inline-block">
              {comment.article_id}
            </div>
          </motion.div>
        )}

        {/* Comment Content */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mb-6"
        >
          <div className="bg-gray-50/70 backdrop-blur-sm border border-gray-200/50 rounded-xl p-5">
            <div className="flex items-start gap-3 mb-3">
              <div className="p-2 bg-white rounded-lg shadow-sm">
                <MessageSquare className="h-4 w-4 text-gray-600" />
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-1">Comment Content</h4>
                <p className="text-sm text-gray-600">User feedback and message</p>
              </div>
            </div>
            
            <div className="prose prose-sm max-w-none">
              <p className="text-gray-900 leading-relaxed whitespace-pre-wrap font-medium">
                {comment.content}
              </p>
            </div>
          </div>
        </motion.div>
        
        {/* Admin Notes */}
        {comment.admin_notes && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="mb-6 p-4 bg-gradient-to-r from-amber-50/80 to-yellow-50/80 backdrop-blur-sm border-l-4 border-amber-400 rounded-xl"
          >
            <div className="flex items-center gap-2 mb-2">
              <Shield className="h-4 w-4 text-amber-600" />
              <span className="font-medium text-amber-800">Admin Notes</span>
            </div>
            <p className="text-sm text-amber-700 leading-relaxed">
              {comment.admin_notes}
            </p>
          </motion.div>
        )}

        {/* Approval Actions */}
        <AnimatePresence>
          {comment.approval_status === 'pending' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ delay: 0.7 }}
              className="border-t border-gray-200/50 pt-6 space-y-4"
            >
              <div className="flex items-center gap-2 mb-4">
                <Clock className="h-4 w-4 text-orange-500" />
                <span className="font-medium text-gray-900">Pending Approval</span>
                <div className="flex-1 border-t border-gray-200/50"></div>
              </div>

              {!showApprovalForm && !isRejecting ? (
                <div className="flex gap-3">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleApprove}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
                  >
                    <ThumbsUp className="h-4 w-4" />
                    Approve
                  </motion.button>
                  
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setIsRejecting(!isRejecting)}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
                  >
                    <ThumbsDown className="h-4 w-4" />
                    Reject
                  </motion.button>
                </div>
              ) : showApprovalForm ? (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="space-y-4 bg-green-50/50 backdrop-blur-sm border border-green-200/50 rounded-xl p-4"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="font-medium text-green-800">Approval Form</span>
                  </div>
                  
                  <textarea
                    value={approvalComments}
                    onChange={(e) => setApprovalComments(e.target.value)}
                    placeholder="Add optional approval comments..."
                    className="w-full p-4 border border-green-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500/50 transition-all duration-200"
                    rows={3}
                  />
                  
                  <div className="flex gap-3">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleApprove}
                      disabled={isApproving}
                      className="flex items-center gap-2 px-6 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-all duration-200"
                    >
                      {isApproving ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                      {isApproving ? 'Approving...' : 'Confirm Approval'}
                    </motion.button>
                    
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setShowApprovalForm(false)}
                      className="px-6 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-all duration-200"
                    >
                      Cancel
                    </motion.button>
                  </div>
                </motion.div>
              ) : isRejecting ? (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="space-y-4 bg-red-50/50 backdrop-blur-sm border border-red-200/50 rounded-xl p-4"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <XCircle className="h-4 w-4 text-red-600" />
                    <span className="font-medium text-red-800">Rejection Form</span>
                  </div>
                  
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Please provide a detailed reason for rejection..."
                    className="w-full p-4 border border-red-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500/50 transition-all duration-200"
                    rows={3}
                    required
                  />
                  
                  <div className="flex gap-3">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleReject}
                      disabled={isRejecting || !rejectionReason.trim()}
                      className="flex items-center gap-2 px-6 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-all duration-200"
                    >
                      {isRejecting ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                      {isRejecting ? 'Rejecting...' : 'Confirm Rejection'}
                    </motion.button>
                    
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setIsRejecting(false)}
                      className="px-6 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-all duration-200"
                    >
                      Cancel
                    </motion.button>
                  </div>
                </motion.div>
              ) : null}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Priority & Management Tools */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="border-t border-gray-200/50 pt-6 mt-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4 text-gray-500" />
              <span className="font-medium text-gray-700">Management Tools</span>
            </div>
            <div className="flex-1 border-t border-gray-200/50 ml-4"></div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Priority Selector */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-600">Priority Level</label>
              <div className="relative">
                <select
                  value={comment.priority}
                  onChange={(e) => handlePriorityChange(e.target.value as CommentPriority)}
                  disabled={isUpdatingPriority}
                  className="w-full appearance-none bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {Object.entries(PRIORITY_LEVELS).map(([value, config]) => (
                    <option key={value} value={value}>
                      {config.icon} {config.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                {isUpdatingPriority && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm rounded-xl">
                    <div className="w-4 h-4 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Quick Actions */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-600">Quick Actions</label>
              <div className="flex gap-2">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex items-center gap-1 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 text-sm font-medium rounded-lg transition-colors"
                >
                  <Eye className="h-3 w-3" />
                  View
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex items-center gap-1 px-3 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 text-sm font-medium rounded-lg transition-colors"
                >
                  <Edit3 className="h-3 w-3" />
                  Edit
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex items-center gap-1 px-3 py-2 bg-orange-50 hover:bg-orange-100 text-orange-700 text-sm font-medium rounded-lg transition-colors"
                >
                  <Flag className="h-3 w-3" />
                  Flag
                </motion.button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Approval Status Information */}
        {comment.approval_status === 'approved' && comment.approver && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
            className="border-t border-gray-200/50 pt-6 mt-6"
          >
            <div className="flex items-center gap-3 p-4 bg-green-50/50 backdrop-blur-sm border border-green-200/50 rounded-xl">
              <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-green-800">Approved Comment</h4>
                <p className="text-sm text-green-600">
                  Approved by <span className="font-medium">{comment.approver.email}</span>
                  {comment.approved_at && (
                    <span> on {new Date(comment.approved_at).toLocaleDateString()}</span>
                  )}
                </p>
              </div>
              <Star className="h-5 w-5 text-green-500" />
            </div>
          </motion.div>
        )}

        {/* Reply Information */}
        {comment.reply_count !== undefined && comment.reply_count > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.0 }}
            className="border-t border-gray-200/50 pt-6 mt-6"
          >
            <div className="flex items-center justify-between p-4 bg-blue-50/50 backdrop-blur-sm border border-blue-200/50 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                  <MessageSquare className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h4 className="font-medium text-blue-800">
                    {comment.reply_count} {comment.reply_count === 1 ? 'Reply' : 'Replies'}
                  </h4>
                  <p className="text-sm text-blue-600">Active conversation thread</p>
                </div>
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                <span>View Thread</span>
                <ArrowRight className="h-3 w-3" />
              </motion.button>
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}; 