// TypeScript interfaces for admin comment features
// Supports the extended comment system with admin capabilities

export type AdminCommentType = 
  | 'admin_note'
  | 'approval_comment' 
  | 'priority_comment'
  | 'review_comment'
  | 'escalation_comment';

export type CommentPriority = 
  | 'low'
  | 'normal'
  | 'high' 
  | 'urgent'
  | 'critical';

export type ApprovalStatus = 
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'requires_changes'
  | 'escalated';

// Extended comment interface with admin features
export interface AdminArticleComment {
  id: string;
  article_id: string;
  user_id: string;
  parent_comment_id?: string;
  content: string;
  content_type: 'text' | 'image' | 'suggestion';
  selection_start?: number;
  selection_end?: number;
  status: 'active' | 'resolved' | 'archived';
  
  // Admin-specific fields
  admin_comment_type?: AdminCommentType;
  priority: CommentPriority;
  approval_status?: ApprovalStatus;
  approved_by?: string;
  approved_at?: string;
  admin_notes?: string;
  is_admin_only: boolean;
  requires_approval: boolean;
  admin_metadata: Record<string, any>;
  
  created_at: string;
  updated_at: string;
  
  // Extended fields for UI
  user?: {
    id: string;
    email: string;
    name?: string;
    avatar_url?: string;
    is_admin?: boolean;
  };
  approver?: {
    id: string;
    email: string;
    name?: string;
  };
  replies?: AdminArticleComment[];
  reply_count?: number;
}

// Admin comment creation data
export interface CreateAdminCommentData {
  article_id: string;
  content: string;
  admin_comment_type: AdminCommentType;
  priority?: CommentPriority;
  is_admin_only?: boolean;
  admin_notes?: string;
  parent_comment_id?: string;
  selection_start?: number;
  selection_end?: number;
}

// Admin comment notification interface
export interface AdminCommentNotification {
  id: string;
  comment_id: string;
  admin_id: string;
  notification_type: string;
  message: string;
  is_read: boolean;
  metadata: Record<string, any>;
  created_at: string;
  read_at?: string;
  
  // Related data
  comment?: AdminArticleComment;
  admin?: {
    id: string;
    email: string;
    name?: string;
  };
}

// Comment approval workflow interface
export interface CommentApprovalWorkflow {
  id: string;
  comment_id: string;
  workflow_step: number;
  approver_id?: string;
  action_taken?: string;
  comments?: string;
  metadata: Record<string, any>;
  created_at: string;
  completed_at?: string;
  
  // Related data
  comment?: AdminArticleComment;
  approver?: {
    id: string;
    email: string;
    name?: string;
  };
}

// Admin comment analytics interface
export interface AdminCommentAnalytics {
  total_comments: number;
  admin_comments: number;
  priority_breakdown: {
    low: number;
    normal: number;
    high: number;
    urgent: number;
    critical: number;
  };
  status_breakdown: {
    active: number;
    resolved: number;
    archived: number;
  };
  approval_breakdown: {
    pending: number;
    approved: number;
    rejected: number;
  };
  admin_comment_types: {
    admin_note: number;
    approval_comment: number;
    priority_comment: number;
    review_comment: number;
    escalation_comment: number;
  };
  date_range: {
    from: string;
    to: string;
  };
}

// Bulk comment operations
export interface BulkCommentOperation {
  comment_ids: string[];
  operation: 'update_priority' | 'update_status' | 'approve' | 'reject' | 'archive';
  data: {
    priority?: CommentPriority;
    status?: 'active' | 'resolved' | 'archived';
    approval_status?: ApprovalStatus;
    admin_notes?: string;
    reason?: string;
  };
}

// Admin comment dashboard data
export interface AdminCommentDashboardData {
  analytics: AdminCommentAnalytics;
  recent_comments: AdminArticleComment[];
  pending_approvals: AdminArticleComment[];
  high_priority_comments: AdminArticleComment[];
  notifications: AdminCommentNotification[];
  unread_notification_count: number;
}

// Admin comment filters
export interface AdminCommentFilters {
  article_id?: string;
  user_id?: string;
  admin_comment_type?: AdminCommentType;
  priority?: CommentPriority;
  status?: 'active' | 'resolved' | 'archived';
  approval_status?: ApprovalStatus;
  is_admin_only?: boolean;
  requires_approval?: boolean;
  date_from?: string;
  date_to?: string;
  search_query?: string;
}

// Priority level configuration
export const PRIORITY_LEVELS: Record<CommentPriority, { 
  label: string; 
  color: string; 
  bgColor: string;
  icon: string;
  order: number;
}> = {
  low: { 
    label: 'Low', 
    color: 'text-gray-600', 
    bgColor: 'bg-gray-100',
    icon: '📝',
    order: 1
  },
  normal: { 
    label: 'Normal', 
    color: 'text-blue-600', 
    bgColor: 'bg-blue-100',
    icon: '💬',
    order: 2
  },
  high: { 
    label: 'High', 
    color: 'text-orange-600', 
    bgColor: 'bg-orange-100',
    icon: '⚠️',
    order: 3
  },
  urgent: { 
    label: 'Urgent', 
    color: 'text-red-600', 
    bgColor: 'bg-red-100',
    icon: '🚨',
    order: 4
  },
  critical: { 
    label: 'Critical', 
    color: 'text-red-800', 
    bgColor: 'bg-red-200',
    icon: '🔥',
    order: 5
  }
};

// Admin comment type configuration
export const ADMIN_COMMENT_TYPES: Record<AdminCommentType, {
  label: string;
  description: string;
  color: string;
  bgColor: string;
  icon: string;
  requiresApproval?: boolean;
}> = {
  admin_note: {
    label: 'Admin Note',
    description: 'Internal admin note for collaboration',
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
    icon: '📋',
    requiresApproval: false
  },
  approval_comment: {
    label: 'Approval Comment',
    description: 'Comment created during approval process',
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    icon: '✅',
    requiresApproval: false
  },
  priority_comment: {
    label: 'Priority Comment',
    description: 'High priority comment requiring attention',
    color: 'text-orange-600',
    bgColor: 'bg-orange-100',
    icon: '⚡',
    requiresApproval: true
  },
  review_comment: {
    label: 'Review Comment',
    description: 'Comment from article review process',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    icon: '🔍',
    requiresApproval: false
  },
  escalation_comment: {
    label: 'Escalation Comment',
    description: 'Escalated comment requiring urgent attention',
    color: 'text-red-600',
    bgColor: 'bg-red-100',
    icon: '🚨',
    requiresApproval: true
  }
}; 