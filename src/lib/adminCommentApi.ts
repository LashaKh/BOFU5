import { supabase } from './supabase';
import {
  AdminArticleComment,
  CreateAdminCommentData,
  AdminCommentNotification,
  CommentApprovalWorkflow,
  AdminCommentAnalytics,
  BulkCommentOperation,
  AdminCommentDashboardData,
  AdminCommentFilters,
  CommentPriority,
  AdminCommentType,
  ApprovalStatus
} from '../types/adminComment';

/**
 * Create an admin comment using the database function
 */
export async function createAdminComment(data: CreateAdminCommentData): Promise<AdminArticleComment> {
  try {
    const { data: result, error } = await supabase.rpc('create_admin_comment', {
      p_article_id: data.article_id,
      p_content: data.content,
      p_admin_comment_type: data.admin_comment_type,
      p_priority: data.priority || 'normal',
      p_is_admin_only: data.is_admin_only || false,
      p_admin_notes: data.admin_notes || null,
      p_parent_comment_id: data.parent_comment_id || null
    });

    if (error) throw error;

    // Fetch the created comment with full details
    const { data: comment, error: fetchError } = await supabase
      .from('article_comments')
      .select(`
        *,
        user_profiles!inner(id, email, company_name),
        content_briefs!inner(id, product_name)
      `)
      .eq('id', result)
      .single();

    if (fetchError) throw fetchError;

    return transformAdminComment(comment);
  } catch (error) {
    console.error('Error creating admin comment:', error);
    throw error;
  }
}

/**
 * Get all comments for an article with admin features
 */
export async function getAdminArticleComments(
  articleId: string,
  filters?: AdminCommentFilters
): Promise<AdminArticleComment[]> {
  try {
    // For now, return mock data since the database relationships aren't properly set up
    console.log('[AdminCommentApi] Returning mock comment data due to missing database relationships');
    
    const mockComments: AdminArticleComment[] = [
      {
        id: 'comment-1',
        article_id: articleId,
        user_id: 'user-1',
        parent_comment_id: undefined,
        content: 'This is a sample admin comment for testing purposes.',
        content_type: 'text',
        selection_start: undefined,
        selection_end: undefined,
        status: 'active',
        admin_comment_type: 'review_comment',
        priority: 'normal',
        approval_status: 'approved',
        approved_by: undefined,
        approved_at: undefined,
        admin_notes: undefined,
        is_admin_only: false,
        requires_approval: false,
        admin_metadata: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        user: {
          id: 'user-1',
          email: 'user@example.com',
          name: 'Sample User',
          avatar_url: undefined,
          is_admin: false
        },
        approver: undefined,
        replies: [],
        reply_count: 0
      }
    ];

    return mockComments;
  } catch (error) {
    console.error('Error fetching admin article comments:', error);
    return []; // Return empty array instead of throwing
  }
}

/**
 * Update comment priority with bulk support
 */
export async function updateCommentsPriority(
  commentIds: string[],
  priority: CommentPriority,
  adminNotes?: string
): Promise<number> {
  try {
    const { data: updatedCount, error } = await supabase.rpc('bulk_update_comment_priority', {
      p_comment_ids: commentIds,
      p_priority: priority,
      p_admin_notes: adminNotes || null
    });

    if (error) throw error;

    return updatedCount;
  } catch (error) {
    console.error('Error updating comments priority:', error);
    throw error;
  }
}

/**
 * Approve a comment using the database function
 */
export async function approveComment(
  commentId: string,
  approvalComments?: string
): Promise<boolean> {
  try {
    const { data: result, error } = await supabase.rpc('approve_comment', {
      p_comment_id: commentId,
      p_approval_comments: approvalComments || null
    });

    if (error) throw error;

    return result;
  } catch (error) {
    console.error('Error approving comment:', error);
    throw error;
  }
}

/**
 * Reject a comment
 */
export async function rejectComment(
  commentId: string,
  reason: string
): Promise<AdminArticleComment> {
  try {
    const { data: comment, error } = await supabase
      .from('article_comments')
      .update({
        approval_status: 'rejected',
        admin_notes: reason
      })
      .eq('id', commentId)
      .select(`
        *,
        user_profiles!inner(id, email, company_name),
        content_briefs!inner(id, product_name)
      `)
      .single();

    if (error) throw error;

    // Add to approval workflow
    const { error: workflowError } = await supabase
      .from('comment_approval_workflow')
      .insert({
        comment_id: commentId,
        action_taken: 'rejected',
        comments: reason,
        completed_at: new Date().toISOString()
      });

    if (workflowError) {
      console.error('Error adding to approval workflow:', workflowError);
    }

    return transformAdminComment(comment);
  } catch (error) {
    console.error('Error rejecting comment:', error);
    throw error;
  }
}

/**
 * Perform bulk operations on comments
 */
export async function performBulkCommentOperation(
  operation: BulkCommentOperation
): Promise<{ success: number; failed: number; errors: string[] }> {
  try {
    const results = { success: 0, failed: 0, errors: [] as string[] };

    for (const commentId of operation.comment_ids) {
      try {
        switch (operation.operation) {
          case 'update_priority':
            if (operation.data.priority) {
              await updateCommentsPriority([commentId], operation.data.priority, operation.data.admin_notes);
            }
            break;
          case 'update_status':
            if (operation.data.status) {
              await supabase
                .from('article_comments')
                .update({ status: operation.data.status })
                .eq('id', commentId);
            }
            break;
          case 'approve':
            await approveComment(commentId, operation.data.reason);
            break;
          case 'reject':
            await rejectComment(commentId, operation.data.reason || 'Rejected');
            break;
          case 'archive':
            await supabase
              .from('article_comments')
              .update({ status: 'archived' })
              .eq('id', commentId);
            break;
        }
        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push(`Comment ${commentId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return results;
  } catch (error) {
    console.error('Error performing bulk comment operation:', error);
    throw error;
  }
}

/**
 * Get admin notifications
 */
export async function getAdminNotifications(
  adminId?: string,
  unreadOnly: boolean = false
): Promise<AdminCommentNotification[]> {
  try {
    // Return mock notifications since the database relationships aren't properly set up
    console.log('[AdminCommentApi] Returning mock notification data due to missing database relationships');
    
    const mockNotifications: AdminCommentNotification[] = [
      {
        id: 'notification-1',
        comment_id: 'comment-1',
        admin_id: adminId || 'admin-1',
        notification_type: 'new_comment',
        message: 'New comment requires review',
        is_read: false,
        metadata: {},
        created_at: new Date().toISOString(),
        read_at: undefined,
        comment: undefined,
        admin: undefined
      }
    ];

    return unreadOnly ? mockNotifications.filter(n => !n.is_read) : mockNotifications;
  } catch (error) {
    console.error('Error fetching admin notifications:', error);
    return []; // Return empty array instead of throwing
  }
}

/**
 * Mark notification as read
 */
export async function markNotificationAsRead(notificationId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('admin_comment_notifications')
      .update({
        is_read: true,
        read_at: new Date().toISOString()
      })
      .eq('id', notificationId);

    if (error) throw error;
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw error;
  }
}

/**
 * Get admin comment analytics
 */
export async function getAdminCommentAnalytics(
  dateFrom?: string,
  dateTo?: string
): Promise<AdminCommentAnalytics> {
  try {
    console.log('[AdminCommentApi] Fetching real analytics data from Supabase');
    
    // Build date filter
    const dateFilter = dateFrom && dateTo 
      ? `created_at.gte.${dateFrom},created_at.lte.${dateTo}`
      : '';

    // Get all comments with date filtering if provided
    let query = supabase
      .from('article_comments')
      .select('*');
      
    if (dateFrom) {
      query = query.gte('created_at', dateFrom);
    }
    if (dateTo) {
      query = query.lte('created_at', dateTo);
    }

    const { data: comments, error } = await query;

    if (error) throw error;

    // Calculate analytics from real data
    const total_comments = comments?.length || 0;
    const admin_comments = comments?.filter(c => c.admin_comment_type || c.admin_metadata?.created_by_admin)?.length || 0;

    // Priority breakdown
    const priority_breakdown = {
      low: comments?.filter(c => c.priority === 'low')?.length || 0,
      normal: comments?.filter(c => c.priority === 'normal' || !c.priority)?.length || 0,
      high: comments?.filter(c => c.priority === 'high')?.length || 0,
      urgent: comments?.filter(c => c.priority === 'urgent')?.length || 0,
      critical: comments?.filter(c => c.priority === 'critical')?.length || 0
    };

    // Status breakdown
    const status_breakdown = {
      active: comments?.filter(c => c.status === 'active')?.length || 0,
      resolved: comments?.filter(c => c.status === 'resolved')?.length || 0,
      archived: comments?.filter(c => c.status === 'archived')?.length || 0
    };

    // Approval breakdown
    const approval_breakdown = {
      pending: comments?.filter(c => c.approval_status === 'pending')?.length || 0,
      approved: comments?.filter(c => c.approval_status === 'approved')?.length || 0,
      rejected: comments?.filter(c => c.approval_status === 'rejected')?.length || 0
    };

    // Admin comment types breakdown
    const admin_comment_types = {
      admin_note: comments?.filter(c => c.admin_comment_type === 'admin_note')?.length || 0,
      approval_comment: comments?.filter(c => c.admin_comment_type === 'approval_comment')?.length || 0,
      priority_comment: comments?.filter(c => c.admin_comment_type === 'priority_comment')?.length || 0,
      review_comment: comments?.filter(c => c.admin_comment_type === 'review_comment')?.length || 0,
      escalation_comment: comments?.filter(c => c.admin_comment_type === 'escalation_comment')?.length || 0
    };

    return {
      total_comments,
      admin_comments,
      priority_breakdown,
      status_breakdown,
      approval_breakdown,
      admin_comment_types,
      date_range: {
        from: dateFrom || '1970-01-01',
        to: dateTo || new Date().toISOString()
      }
    };
  } catch (error) {
    console.error('Error fetching admin comment analytics:', error);
    // Return basic fallback analytics
    return {
      total_comments: 0,
      admin_comments: 0,
      priority_breakdown: { low: 0, normal: 0, high: 0, urgent: 0, critical: 0 },
      status_breakdown: { active: 0, resolved: 0, archived: 0 },
      approval_breakdown: { pending: 0, approved: 0, rejected: 0 },
      admin_comment_types: { admin_note: 0, approval_comment: 0, priority_comment: 0, review_comment: 0, escalation_comment: 0 },
      date_range: { from: dateFrom || '1970-01-01', to: dateTo || new Date().toISOString() }
    };
  }
}

/**
 * Get approval workflow for a comment
 */
export async function getCommentApprovalWorkflow(
  commentId: string
): Promise<CommentApprovalWorkflow[]> {
  try {
    const { data: workflow, error } = await supabase
      .from('comment_approval_workflow')
      .select(`
        *,
        comment:article_comments(*),
        approver:auth.users(id, email)
      `)
      .eq('comment_id', commentId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    return workflow?.map(transformWorkflow) || [];
  } catch (error) {
    console.error('Error fetching comment approval workflow:', error);
    throw error;
  }
}

/**
 * Get admin comment dashboard data
 */
export async function getAdminCommentDashboardData(): Promise<AdminCommentDashboardData> {
  try {
    const [analytics, recentComments, pendingApprovals, highPriorityComments, notifications] = await Promise.all([
      getAdminCommentAnalytics(),
      getRecentComments(),
      getPendingApprovals(),
      getHighPriorityComments(),
      getAdminNotifications()
    ]);

    const unreadNotificationCount = notifications.filter(n => !n.is_read).length;

    return {
      analytics,
      recent_comments: recentComments,
      pending_approvals: pendingApprovals,
      high_priority_comments: highPriorityComments,
      notifications,
      unread_notification_count: unreadNotificationCount
    };
  } catch (error) {
    console.error('Error fetching admin comment dashboard data:', error);
    throw error;
  }
}

/**
 * Get recent comments across all articles
 */
export async function getRecentComments(limit: number = 10): Promise<AdminArticleComment[]> {
  try {
    console.log('[AdminCommentApi] Fetching real recent comments from Supabase');
    
    const { data: comments, error } = await supabase
      .from('article_comments')
      .select(`
        *,
        content_briefs!inner(id, product_name)
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    if (!comments || comments.length === 0) {
      return [];
    }

    // Get user information for each comment
    const userIds = [...new Set(comments.map(c => c.user_id))];
    
    const [userProfiles, adminProfiles] = await Promise.all([
      supabase
        .from('user_profiles')
        .select('id, email, company_name')
        .in('id', userIds),
      supabase
        .from('admin_profiles')
        .select('id, email, name')
        .in('id', userIds)
    ]);

    const users = userProfiles.data || [];
    const admins = adminProfiles.data || [];

    // Transform comments with user data
    const transformedComments: AdminArticleComment[] = comments.map(comment => {
      const userProfile = users.find(u => u.id === comment.user_id);
      const adminProfile = admins.find(a => a.id === comment.user_id);
      
      const isAdmin = !!adminProfile || !!comment.admin_comment_type || !!comment.admin_metadata?.created_by_admin;
      
      return {
        id: comment.id,
        article_id: comment.article_id,
        user_id: comment.user_id,
        parent_comment_id: comment.parent_comment_id,
        content: comment.content,
        content_type: comment.content_type || 'text',
        selection_start: comment.selection_start,
        selection_end: comment.selection_end,
        status: comment.status || 'active',
        admin_comment_type: comment.admin_comment_type,
        priority: comment.priority || 'normal',
        approval_status: comment.approval_status || 'pending',
        approved_by: comment.approved_by,
        approved_at: comment.approval_date,
        admin_notes: comment.admin_notes,
        is_admin_only: comment.is_admin_only || false,
        requires_approval: comment.approval_status === 'pending',
        admin_metadata: comment.admin_metadata || {},
        created_at: comment.created_at,
        updated_at: comment.updated_at,
        user: {
          id: comment.user_id,
          email: adminProfile?.email || userProfile?.email || 'unknown@example.com',
          name: adminProfile?.name || userProfile?.company_name || 'Unknown User',
          avatar_url: undefined,
          is_admin: isAdmin
        },
        approver: undefined,
        replies: [],
        reply_count: 0,
        article: {
          id: comment.content_briefs?.id,
          title: comment.content_briefs?.product_name || 'Untitled Article'
        }
      };
    });

    return transformedComments;
  } catch (error) {
    console.error('Error fetching recent comments:', error);
    return [];
  }
}

/**
 * Get comments pending approval
 */
export async function getPendingApprovals(): Promise<AdminArticleComment[]> {
  try {
    console.log('[AdminCommentApi] Fetching real pending approvals from Supabase');
    
    const { data: comments, error } = await supabase
      .from('article_comments')
      .select(`
        *,
        content_briefs!inner(id, product_name)
      `)
      .eq('approval_status', 'pending')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw error;

    if (!comments || comments.length === 0) {
      return [];
    }

    // Get user information for each comment
    const userIds = [...new Set(comments.map(c => c.user_id))];
    
    const [userProfiles, adminProfiles] = await Promise.all([
      supabase
        .from('user_profiles')
        .select('id, email, company_name')
        .in('id', userIds),
      supabase
        .from('admin_profiles')
        .select('id, email, name')
        .in('id', userIds)
    ]);

    const users = userProfiles.data || [];
    const admins = adminProfiles.data || [];

    // Transform comments with user data
    const transformedComments: AdminArticleComment[] = comments.map(comment => {
      const userProfile = users.find(u => u.id === comment.user_id);
      const adminProfile = admins.find(a => a.id === comment.user_id);
      
      const isAdmin = !!adminProfile || !!comment.admin_comment_type || !!comment.admin_metadata?.created_by_admin;
      
      return {
        id: comment.id,
        article_id: comment.article_id,
        user_id: comment.user_id,
        parent_comment_id: comment.parent_comment_id,
        content: comment.content,
        content_type: comment.content_type || 'text',
        selection_start: comment.selection_start,
        selection_end: comment.selection_end,
        status: comment.status || 'active',
        admin_comment_type: comment.admin_comment_type,
        priority: comment.priority || 'normal',
        approval_status: comment.approval_status || 'pending',
        approved_by: comment.approved_by,
        approved_at: comment.approval_date,
        admin_notes: comment.admin_notes,
        is_admin_only: comment.is_admin_only || false,
        requires_approval: true,
        admin_metadata: comment.admin_metadata || {},
        created_at: comment.created_at,
        updated_at: comment.updated_at,
        user: {
          id: comment.user_id,
          email: adminProfile?.email || userProfile?.email || 'unknown@example.com',
          name: adminProfile?.name || userProfile?.company_name || 'Unknown User',
          avatar_url: undefined,
          is_admin: isAdmin
        },
        approver: undefined,
        replies: [],
        reply_count: 0,
        article: {
          id: comment.content_briefs?.id,
          title: comment.content_briefs?.product_name || 'Untitled Article'
        }
      };
    });

    return transformedComments;
  } catch (error) {
    console.error('Error fetching pending approvals:', error);
    return [];
  }
}

/**
 * Get high priority comments
 */
export async function getHighPriorityComments(): Promise<AdminArticleComment[]> {
  try {
    console.log('[AdminCommentApi] Fetching real high priority comments from Supabase');
    
    const { data: comments, error } = await supabase
      .from('article_comments')
      .select(`
        *,
        content_briefs!inner(id, product_name)
      `)
      .in('priority', ['high', 'urgent', 'critical'])
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw error;

    if (!comments || comments.length === 0) {
      return [];
    }

    // Get user information for each comment
    const userIds = [...new Set(comments.map(c => c.user_id))];
    
    const [userProfiles, adminProfiles] = await Promise.all([
      supabase
        .from('user_profiles')
        .select('id, email, company_name')
        .in('id', userIds),
      supabase
        .from('admin_profiles')
        .select('id, email, name')
        .in('id', userIds)
    ]);

    const users = userProfiles.data || [];
    const admins = adminProfiles.data || [];

    // Transform comments with user data
    const transformedComments: AdminArticleComment[] = comments.map(comment => {
      const userProfile = users.find(u => u.id === comment.user_id);
      const adminProfile = admins.find(a => a.id === comment.user_id);
      
      const isAdmin = !!adminProfile || !!comment.admin_comment_type || !!comment.admin_metadata?.created_by_admin;
      
      return {
        id: comment.id,
        article_id: comment.article_id,
        user_id: comment.user_id,
        parent_comment_id: comment.parent_comment_id,
        content: comment.content,
        content_type: comment.content_type || 'text',
        selection_start: comment.selection_start,
        selection_end: comment.selection_end,
        status: comment.status || 'active',
        admin_comment_type: comment.admin_comment_type,
        priority: comment.priority || 'normal',
        approval_status: comment.approval_status || 'pending',
        approved_by: comment.approved_by,
        approved_at: comment.approval_date,
        admin_notes: comment.admin_notes,
        is_admin_only: comment.is_admin_only || false,
        requires_approval: comment.approval_status === 'pending',
        admin_metadata: comment.admin_metadata || {},
        created_at: comment.created_at,
        updated_at: comment.updated_at,
        user: {
          id: comment.user_id,
          email: adminProfile?.email || userProfile?.email || 'unknown@example.com',
          name: adminProfile?.name || userProfile?.company_name || 'Unknown User',
          avatar_url: undefined,
          is_admin: isAdmin
        },
        approver: undefined,
        replies: [],
        reply_count: 0,
        article: {
          id: comment.content_briefs?.id,
          title: comment.content_briefs?.product_name || 'Untitled Article'
        }
      };
    });

    return transformedComments;
  } catch (error) {
    console.error('Error fetching high priority comments:', error);
    return [];
  }
}

/**
 * Search comments with advanced filters
 */
export async function searchComments(
  query: string,
  filters?: AdminCommentFilters
): Promise<AdminArticleComment[]> {
  try {
    let dbQuery = supabase
      .from('article_comments')
      .select(`
        *,
        user_profiles!inner(id, email, company_name),
        content_briefs!inner(id, product_name)
      `)
      .textSearch('content', query, { type: 'websearch' })
      .order('created_at', { ascending: false });

    // Apply additional filters
    if (filters) {
      if (filters.article_id) {
        dbQuery = dbQuery.eq('article_id', filters.article_id);
      }
      if (filters.user_id) {
        dbQuery = dbQuery.eq('user_id', filters.user_id);
      }
      if (filters.admin_comment_type) {
        dbQuery = dbQuery.eq('admin_comment_type', filters.admin_comment_type);
      }
      if (filters.priority) {
        dbQuery = dbQuery.eq('priority', filters.priority);
      }
      if (filters.status) {
        dbQuery = dbQuery.eq('status', filters.status);
      }
    }

    const { data: comments, error } = await dbQuery;

    if (error) throw error;

    return comments?.map(transformAdminComment) || [];
  } catch (error) {
    console.error('Error searching comments:', error);
    throw error;
  }
}

// Helper functions

function transformAdminComment(comment: any): AdminArticleComment {
  return {
    id: comment.id,
    article_id: comment.article_id,
    user_id: comment.user_id,
    parent_comment_id: comment.parent_comment_id,
    content: comment.content,
    content_type: comment.content_type,
    selection_start: comment.selection_start,
    selection_end: comment.selection_end,
    status: comment.status,
    admin_comment_type: comment.admin_comment_type,
    priority: comment.priority || 'normal',
    approval_status: comment.approval_status,
    approved_by: comment.approved_by,
    approved_at: comment.approved_at,
    admin_notes: comment.admin_notes,
    is_admin_only: comment.is_admin_only || false,
    requires_approval: comment.requires_approval || false,
    admin_metadata: comment.admin_metadata || {},
    created_at: comment.created_at,
    updated_at: comment.updated_at,
    user: comment.user_profiles ? {
      id: comment.user_profiles.id,
      email: comment.user_profiles.email,
      name: comment.user_profiles.company_name || comment.user_profiles.email,
      avatar_url: undefined,
      is_admin: false
    } : undefined,
    approver: comment.approved_by ? {
      id: comment.approved_by,
      email: 'admin@example.com',
      name: 'Admin User'
    } : undefined,
    replies: [],
    reply_count: 0
  };
}

function transformNotification(notification: any): AdminCommentNotification {
  return {
    id: notification.id,
    comment_id: notification.comment_id,
    admin_id: notification.admin_id,
    notification_type: notification.notification_type,
    message: notification.message,
    is_read: notification.is_read,
    metadata: notification.metadata || {},
    created_at: notification.created_at,
    read_at: notification.read_at,
    comment: notification.comment ? transformAdminComment(notification.comment) : undefined,
    admin: notification.admin ? {
      id: notification.admin.id,
      email: notification.admin.email,
      name: notification.admin.name
    } : undefined
  };
}

function transformWorkflow(workflow: any): CommentApprovalWorkflow {
  return {
    id: workflow.id,
    comment_id: workflow.comment_id,
    workflow_step: workflow.workflow_step,
    approver_id: workflow.approver_id,
    action_taken: workflow.action_taken,
    comments: workflow.comments,
    metadata: workflow.metadata || {},
    created_at: workflow.created_at,
    completed_at: workflow.completed_at,
    comment: workflow.comment ? transformAdminComment(workflow.comment) : undefined,
    approver: workflow.approver ? {
      id: workflow.approver.id,
      email: workflow.approver.email,
      name: workflow.approver.name
    } : undefined
  };
}

function organizeCommentThreads(comments: AdminArticleComment[]): AdminArticleComment[] {
  const commentMap = new Map<string, AdminArticleComment>();
  const rootComments: AdminArticleComment[] = [];

  // First pass: create a map of all comments
  comments.forEach(comment => {
    comment.replies = [];
    comment.reply_count = 0;
    commentMap.set(comment.id, comment);
  });

  // Second pass: organize into threads
  comments.forEach(comment => {
    if (comment.parent_comment_id) {
      const parentComment = commentMap.get(comment.parent_comment_id);
      if (parentComment) {
        parentComment.replies!.push(comment);
        addReplyCount(parentComment);
      }
    } else {
      rootComments.push(comment);
    }
  });

  return rootComments;
}

function addReplyCount(comment: AdminArticleComment): void {
  comment.reply_count = (comment.replies?.length || 0);
  comment.replies?.forEach(reply => {
    comment.reply_count! += (reply.reply_count || 0);
  });
}