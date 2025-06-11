import { supabase } from './supabase';
import { recordStatusChange, bulkRecordStatusChanges } from './commentStatusHistory';

export interface ArticleComment {
  id: string;
  article_id: string;
  user_id: string;
  parent_comment_id?: string;
  content: string;
  content_type: 'text' | 'image' | 'suggestion';
  selection_start?: number;
  selection_end?: number;
  status: 'active' | 'resolved' | 'archived';
  created_at: string;
  updated_at: string;
  // Admin-specific fields
  admin_comment_type?: 'admin_note' | 'approval_comment' | 'priority_comment' | 'review_comment' | 'system_notification';
  priority?: 'low' | 'normal' | 'high' | 'urgent' | 'critical';
  admin_metadata?: any;
  // Extended fields for UI
  user?: {
    id: string;
    email: string;
    name?: string;
    avatar_url?: string;
    isAdmin?: boolean;
  };
  replies?: ArticleComment[];
  reply_count?: number;
}

export interface CommentSelection {
  start: number;
  end: number;
  text: string;
}

export interface CreateCommentData {
  article_id: string;
  content: string;
  content_type?: 'text' | 'image' | 'suggestion';
  selection_start?: number;
  selection_end?: number;
  parent_comment_id?: string;
  // Admin-specific fields
  admin_comment_type?: 'admin_note' | 'approval_comment' | 'priority_comment' | 'review_comment' | 'system_notification';
  priority?: 'low' | 'normal' | 'high' | 'urgent' | 'critical';
  admin_metadata?: any;
}

export interface UpdateCommentData {
  content?: string;
  status?: 'active' | 'resolved' | 'archived';
}

/**
 * Create a new comment on an article
 */
export async function createComment(data: CreateCommentData): Promise<ArticleComment> {
  try {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) {
      throw new Error('User not authenticated');
    }

    // Check if current user is an admin
    let isCurrentUserAdmin = false;
    try {
      const { data: adminProfile } = await supabase
        .from('admin_profiles')
        .select('id')
        .eq('id', user.user.id)
        .single();
      isCurrentUserAdmin = !!adminProfile;
    } catch (error) {
      // User is not admin
      isCurrentUserAdmin = false;
    }

    const commentData = {
      ...data,
      user_id: user.user.id,
      content_type: data.content_type || 'text',
      status: 'active' as const,
      // Include admin fields if provided
      ...(data.admin_comment_type && { admin_comment_type: data.admin_comment_type }),
      ...(data.priority && { priority: data.priority }),
      ...(data.admin_metadata && { admin_metadata: data.admin_metadata }),
      // Add admin metadata for regular comments made by admins
      ...(isCurrentUserAdmin && !data.admin_comment_type && { admin_metadata: { created_by_admin: true } })
    };

    console.log('📝 Creating comment in API with data:', {
      ...commentData,
      content: commentData.content.substring(0, 50) + '...',
      selection_start: commentData.selection_start,
      selection_end: commentData.selection_end,
      hasSelection: commentData.selection_start !== undefined && commentData.selection_end !== undefined,
      isCurrentUserAdmin,
      hasAdminMetadata: !!commentData.admin_metadata
    });

    const { data: comment, error } = await supabase
      .from('article_comments')
      .insert(commentData)
      .select('*')
      .single();

    if (error) {
      console.error('❌ Database error creating comment:', error);
      throw error;
    }

    console.log('✅ Comment created successfully:', {
      id: comment.id,
      selection_start: comment.selection_start,
      selection_end: comment.selection_end,
      hasSelection: comment.selection_start !== null && comment.selection_end !== null,
      admin_metadata: comment.admin_metadata
    });

    return await transformComment(comment);
  } catch (error) {
    console.error('Error creating comment:', error);
    throw error;
  }
}

/**
 * Get all comments for an article with nested replies
 */
export async function getArticleComments(articleId: string): Promise<ArticleComment[]> {
  try {
    // First get all comments for the article
    const { data: comments, error: commentsError } = await supabase
      .from('article_comments')
      .select('*')
      .eq('article_id', articleId)
      .order('created_at', { ascending: true });

    if (commentsError) {
      console.error('❌ Error fetching comments:', commentsError);
      throw commentsError;
    }

    if (!comments) {
      return [];
    }

    // Transform comments with user information
    const transformedComments = await Promise.all(
      comments.map(async (comment) => await transformComment(comment))
    );

    // Organize into threads
    const threadedComments = organizeCommentThreads(transformedComments);
    return threadedComments;
  } catch (error) {
    console.error('❌ Error in getArticleComments:', error);
    throw error;
  }
}

/**
 * Update a comment
 */
export async function updateComment(commentId: string, data: UpdateCommentData): Promise<ArticleComment> {
  try {
    const { data: comment, error } = await supabase
      .from('article_comments')
      .update(data)
      .eq('id', commentId)
      .select('*')
      .single();

    if (error) throw error;

    return await transformComment(comment);
  } catch (error) {
    console.error('Error updating comment:', error);
    throw error;
  }
}

/**
 * Delete a comment
 */
export async function deleteComment(commentId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('article_comments')
      .delete()
      .eq('id', commentId);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting comment:', error);
    throw error;
  }
}

/**
 * Get comments for a specific text selection
 */
export async function getCommentsForSelection(
  articleId: string, 
  selectionStart: number, 
  selectionEnd: number
): Promise<ArticleComment[]> {
  try {
    const { data: comments, error } = await supabase
      .from('article_comments')
      .select('*')
      .eq('article_id', articleId)
      .not('selection_start', 'is', null)
      .not('selection_end', 'is', null)
      .gte('selection_end', selectionStart)
      .lte('selection_start', selectionEnd)
      .eq('status', 'active')
      .order('created_at', { ascending: true });

    if (error) throw error;

    return await Promise.all(comments?.map(async comment => await transformComment(comment)) || []);
  } catch (error) {
    console.error('Error fetching comments for selection:', error);
    throw error;
  }
}

/**
 * Update comment status with history tracking
 */
export async function updateCommentStatus(
  commentId: string, 
  newStatus: 'active' | 'resolved' | 'archived',
  reason?: string
): Promise<ArticleComment> {
  try {
    // First, get the current comment to track the old status
    const { data: currentComment, error: fetchError } = await supabase
      .from('article_comments')
      .select('status')
      .eq('id', commentId)
      .single();

    if (fetchError) throw fetchError;

    const oldStatus = currentComment.status;

    // Update the comment status
    const { data: comment, error } = await supabase
      .from('article_comments')
      .update({ status: newStatus })
      .eq('id', commentId)
      .select('*')
      .single();

    if (error) throw error;

    // Record the status change in history (only if status actually changed)
    if (oldStatus !== newStatus) {
      try {
        await recordStatusChange(commentId, oldStatus, newStatus, reason);
      } catch (historyError) {
        console.error('Error recording status change history:', historyError);
        // Don't fail the main operation if history recording fails
      }
    }

    return await transformComment(comment);
  } catch (error) {
    console.error('Error updating comment status:', error);
    throw error;
  }
}

/**
 * Bulk update comment statuses with history tracking
 */
export async function bulkUpdateCommentStatus(
  commentIds: string[], 
  newStatus: 'active' | 'resolved' | 'archived',
  reason?: string
): Promise<void> {
  try {
    // First, get the current comments to track the old statuses
    const { data: currentComments, error: fetchError } = await supabase
      .from('article_comments')
      .select('id, status')
      .in('id', commentIds);

    if (fetchError) throw fetchError;

    // Update all comment statuses
    const { error } = await supabase
      .from('article_comments')
      .update({ status: newStatus })
      .in('id', commentIds);

    if (error) throw error;

    // Record the status changes in history (only for comments where status actually changed)
    const statusChanges = currentComments
      ?.filter(comment => comment.status !== newStatus)
      .map(comment => ({
        commentId: comment.id,
        oldStatus: comment.status,
        newStatus: newStatus,
        reason: reason
      })) || [];

    if (statusChanges.length > 0) {
      try {
        await bulkRecordStatusChanges(statusChanges);
      } catch (historyError) {
        console.error('Error recording bulk status change history:', historyError);
        // Don't fail the main operation if history recording fails
      }
    }
  } catch (error) {
    console.error('Error bulk updating comment status:', error);
    throw error;
  }
}

/**
 * Resolve comment with reason and template tracking
 */
export async function resolveCommentWithReason(
  commentId: string,
  reason: string,
  templateId?: string
): Promise<ArticleComment> {
  try {
    // Get current comment for history tracking
    const { data: currentComment, error: fetchError } = await supabase
      .from('article_comments')
      .select('status, created_at')
      .eq('id', commentId)
      .single();

    if (fetchError) throw fetchError;

    const oldStatus = currentComment.status;

    // Calculate resolution time
    const createdAt = new Date(currentComment.created_at);
    const resolvedAt = new Date();
    const resolutionTimeDays = (resolvedAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);

    // Update comment status
    const { data: comment, error } = await supabase
      .from('article_comments')
      .update({ status: 'resolved' })
      .eq('id', commentId)
      .select('*')
      .single();

    if (error) throw error;

    // Record status change with metadata
    if (oldStatus !== 'resolved') {
      try {
        await recordStatusChange(commentId, oldStatus, 'resolved', reason, {
          template_used: templateId,
          resolution_time_days: resolutionTimeDays
        });
      } catch (historyError) {
        console.error('Error recording resolution history:', historyError);
      }
    }

    return await transformComment(comment);
  } catch (error) {
    console.error('Error resolving comment with reason:', error);
    throw error;
  }
}

/**
 * Bulk resolve comments with templates
 */
export async function bulkResolveWithTemplate(
  commentIds: string[],
  templateId: string,
  reason: string
): Promise<void> {
  try {
    // Get current comments for history tracking
    const { data: currentComments, error: fetchError } = await supabase
      .from('article_comments')
      .select('id, status, created_at')
      .in('id', commentIds);

    if (fetchError) throw fetchError;

    // Update all comment statuses
    const { error } = await supabase
      .from('article_comments')
      .update({ status: 'resolved' })
      .in('id', commentIds);

    if (error) throw error;

    // Record status changes with metadata
    const resolvedAt = new Date();
    const statusChanges = currentComments
      ?.filter(comment => comment.status !== 'resolved')
      .map(comment => {
        const createdAt = new Date(comment.created_at);
        const resolutionTimeDays = (resolvedAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
        
        return {
          commentId: comment.id,
          oldStatus: comment.status,
          newStatus: 'resolved' as const,
          reason: reason,
          metadata: {
            template_used: templateId,
            resolution_time_days: resolutionTimeDays,
            bulk_operation: true
          }
        };
      }) || [];

    if (statusChanges.length > 0) {
      try {
        await bulkRecordStatusChanges(statusChanges);
      } catch (historyError) {
        console.error('Error recording bulk resolution history:', historyError);
      }
    }
  } catch (error) {
    console.error('Error bulk resolving comments:', error);
    throw error;
  }
}

/**
 * Get comments with enhanced resolution metrics
 */
export async function getCommentsWithMetrics(articleId: string): Promise<ArticleComment[]> {
  try {
    // First get all comments for the article with status history
    const { data: comments, error: commentsError } = await supabase
      .from('article_comments')
      .select(`
        *,
        status_history:comment_status_history(
          id,
          old_status,
          new_status,
          changed_at,
          reason,
          metadata
        )
      `)
      .eq('article_id', articleId)
      .order('created_at', { ascending: true });

    if (commentsError) throw commentsError;

    if (!comments || comments.length === 0) {
      return [];
    }

    // Get unique user IDs from comments
    const userIds = [...new Set(comments.map(c => c.user_id))];

    // Get user profiles and admin profiles separately
    const [userProfilesResult, adminProfilesResult] = await Promise.all([
      supabase
        .from('user_profiles')
        .select('id, email, company_name')
        .in('id', userIds),
      supabase
        .from('admin_profiles')
        .select('id, email, name')
        .in('id', userIds)
    ]);

    const userProfiles = userProfilesResult.data || [];
    const adminProfiles = adminProfilesResult.data || [];

    // Transform and organize comments into threads with metrics
    const transformedComments = await Promise.all(
      comments.map(async comment => {
        // Find profile data for this user
        const userProfile = userProfiles.find(p => p.id === comment.user_id);
        const adminProfile = adminProfiles.find(p => p.id === comment.user_id);

        const transformed = await transformComment({
          ...comment,
          user_profiles: userProfile || null,
          admin_profiles: adminProfile || null
        });
        
        // Add resolution metrics
        if (comment.status_history) {
          const resolutionEvents = comment.status_history.filter((h: any) => h.new_status === 'resolved');
          const reopenEvents = comment.status_history.filter((h: any) => h.new_status === 'active' && h.old_status === 'resolved');
          
          (transformed as any).metrics = {
            resolution_count: resolutionEvents.length,
            reopen_count: reopenEvents.length,
            last_resolved_at: resolutionEvents.length > 0 ? resolutionEvents[0].changed_at : null,
            last_resolution_reason: resolutionEvents.length > 0 ? resolutionEvents[0].reason : null
          };
        }
        
        return transformed;
      })
    );

    return organizeCommentThreads(transformedComments);
  } catch (error) {
    console.error('Error fetching comments with metrics:', error);
    throw error;
  }
}

/**
 * Auto-resolve old comments based on criteria
 */
export async function autoResolveOldComments(
  articleId: string,
  daysThreshold: number = 30,
  reason: string = 'Auto-resolved due to inactivity'
): Promise<number> {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysThreshold);

    // Find old active comments
    const { data: oldComments, error: fetchError } = await supabase
      .from('article_comments')
      .select('id, status, created_at')
      .eq('article_id', articleId)
      .eq('status', 'active')
      .lt('created_at', cutoffDate.toISOString());

    if (fetchError) throw fetchError;

    if (!oldComments || oldComments.length === 0) {
      return 0;
    }

    const commentIds = oldComments.map(c => c.id);

    // Bulk resolve with auto-resolution metadata
    const { error: updateError } = await supabase
      .from('article_comments')
      .update({ status: 'resolved' })
      .in('id', commentIds);

    if (updateError) throw updateError;

    // Record status changes
    const statusChanges = oldComments.map(comment => ({
      commentId: comment.id,
      oldStatus: comment.status,
      newStatus: 'resolved' as const,
      reason: reason,
      metadata: {
        auto_resolved: true,
        resolution_time_days: Math.floor((Date.now() - new Date(comment.created_at).getTime()) / (1000 * 60 * 60 * 24))
      }
    }));

    try {
      await bulkRecordStatusChanges(statusChanges);
    } catch (historyError) {
      console.error('Error recording auto-resolution history:', historyError);
    }

    return oldComments.length;
  } catch (error) {
    console.error('Error auto-resolving old comments:', error);
    throw error;
  }
}

/**
 * Get comment resolution suggestions based on patterns
 */
export async function getResolutionSuggestions(commentIds: string[]): Promise<Array<{
  comment_id: string;
  suggested_action: 'resolve' | 'archive' | 'escalate';
  reason: string;
  confidence: number;
}>> {
  try {
    const { data: comments, error } = await supabase
      .from('article_comments')
      .select(`
        id,
        content,
        content_type,
        status,
        created_at,
        updated_at,
        article_id,
        replies:article_comments!parent_comment_id(id, status),
        status_history:comment_status_history(new_status, changed_at)
      `)
      .in('id', commentIds);

    if (error) throw error;

    return comments?.map(comment => {
      const daysSinceCreated = Math.floor((Date.now() - new Date(comment.created_at).getTime()) / (1000 * 60 * 60 * 24));
      const daysSinceUpdated = Math.floor((Date.now() - new Date(comment.updated_at).getTime()) / (1000 * 60 * 60 * 24));
      const hasReplies = comment.replies && comment.replies.length > 0;
      const hasBeenResolved = comment.status_history?.some((h: any) => h.new_status === 'resolved');

      let suggestion: 'resolve' | 'archive' | 'escalate' = 'resolve';
      let reason = '';
      let confidence = 0;

      // Suggestion logic
      if (daysSinceCreated > 30 && !hasReplies) {
        suggestion = 'archive';
        reason = 'Old comment with no engagement';
        confidence = 0.8;
      } else if (comment.content_type === 'suggestion' && daysSinceUpdated > 14) {
        suggestion = 'resolve';
        reason = 'Suggestion comment with no recent activity';
        confidence = 0.7;
      } else if (hasBeenResolved && daysSinceUpdated > 7) {
        suggestion = 'archive';
        reason = 'Previously resolved comment with no recent activity';
        confidence = 0.9;
      } else if (daysSinceCreated > 14 && comment.status === 'active') {
        suggestion = 'escalate';
        reason = 'Long-standing active comment needs attention';
        confidence = 0.6;
      } else {
        suggestion = 'resolve';
        reason = 'General resolution candidate';
        confidence = 0.5;
      }

      return {
        comment_id: comment.id,
        suggested_action: suggestion,
        reason,
        confidence
      };
    }) || [];
  } catch (error) {
    console.error('Error getting resolution suggestions:', error);
    throw error;
  }
}

/**
 * Transform raw comment data into ArticleComment object with user information
 */
async function transformComment(comment: any): Promise<ArticleComment> {
  // Extract user data from manually joined profiles
  let isAdmin = false;
  let userName = 'Anonymous User';
  let userEmail = 'user@example.com';
  
  // If profile data is already attached (from bulk queries)
  if (comment.user_profiles || comment.admin_profiles) {
    isAdmin = !!comment.admin_profiles;
    
    if (isAdmin && comment.admin_profiles) {
      userName = comment.admin_profiles.name || 'Admin User';
      userEmail = comment.admin_profiles.email || 'admin@example.com';
    } else if (comment.user_profiles) {
      userName = comment.user_profiles.company_name || 'User';
      userEmail = comment.user_profiles.email || 'user@example.com';
    }
  } else {
    // Check for admin indicators in the comment
    const hasAdminCommentType = !!comment.admin_comment_type;
    const hasAdminMetadata = !!comment.admin_metadata;
    const createdByAdmin = comment.admin_metadata?.created_by_admin === true;
    
    if (hasAdminCommentType || createdByAdmin) {
      // This is an admin comment
      isAdmin = true;
      userName = 'Admin User';
      userEmail = 'admin@example.com';
      
      // Try to get admin profile if possible
      try {
        const { data: adminProfile } = await supabase
          .from('admin_profiles')
          .select('name, email')
          .eq('id', comment.user_id)
          .single();
        
        if (adminProfile) {
          userName = adminProfile.name || 'Admin User';
          userEmail = adminProfile.email || 'admin@example.com';
        }
      } catch (error) {
        // Can't access admin profile (due to RLS), use defaults
        console.log('Could not access admin profile for comment:', comment.id);
      }
    } else {
      // This is a regular user comment
      isAdmin = false;
      userName = 'User';
      userEmail = 'user@example.com';
      
      // Try to get user profile
      try {
        const { data: userProfile } = await supabase
          .from('user_profiles')
          .select('company_name, email')
          .eq('id', comment.user_id)
          .single();
        
        if (userProfile) {
          userName = userProfile.company_name || 'User';
          userEmail = userProfile.email || 'user@example.com';
        }
      } catch (error) {
        // Can't access user profile, use defaults
        console.log('Could not access user profile for comment:', comment.id);
      }
    }
  }

  // Debug log to see what data we have
  console.log('Transform comment data:', {
    user_id: comment.user_id,
    hasUserProfile: !!comment.user_profiles,
    hasAdminProfile: !!comment.admin_profiles,
    isAdmin,
    userName,
    hasAdminCommentType: !!comment.admin_comment_type,
    hasAdminMetadata: !!comment.admin_metadata,
    createdByAdmin: comment.admin_metadata?.created_by_admin,
    priority: comment.priority
  });

  return {
    id: comment.id,
    content: comment.content,
    created_at: comment.created_at,
    updated_at: comment.updated_at,
    article_id: comment.article_id,
    user_id: comment.user_id,
    parent_comment_id: comment.parent_comment_id,
    selection_start: comment.selection_start,
    selection_end: comment.selection_end,
    content_type: comment.content_type || 'text',
    status: comment.status || 'active',
    // Include admin fields
    admin_comment_type: comment.admin_comment_type,
    priority: comment.priority,
    admin_metadata: comment.admin_metadata,
    user: {
      id: comment.user_id,
      email: userEmail,
      name: userName,
      avatar_url: undefined,
      isAdmin
    }
  };
}

/**
 * Organize flat comment array into threaded structure
 */
function organizeCommentThreads(comments: ArticleComment[]): ArticleComment[] {
  const commentMap = new Map<string, ArticleComment>();
  const rootComments: ArticleComment[] = [];

  // First pass: create map and initialize replies arrays
  comments.forEach(comment => {
    comment.replies = [];
    commentMap.set(comment.id, comment);
  });

  // Second pass: organize into threads
  comments.forEach(comment => {
    if (comment.parent_comment_id) {
      const parent = commentMap.get(comment.parent_comment_id);
      if (parent) {
        parent.replies!.push(comment);
      }
    } else {
      rootComments.push(comment);
    }
  });

  // Add reply counts
  rootComments.forEach(addReplyCount);

  return rootComments;
}

/**
 * Recursively add reply counts to comment threads
 */
function addReplyCount(comment: ArticleComment): void {
  let count = 0;
  if (comment.replies) {
    count = comment.replies.length;
    comment.replies.forEach(reply => {
      addReplyCount(reply);
      count += reply.reply_count || 0;
    });
  }
  comment.reply_count = count;
}

/**
 * Get current user information
 */
export async function getCurrentUser() {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return user;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

/**
 * Subscribe to real-time comment changes for an article
 */
export function subscribeToComments(
  articleId: string, 
  callback: (comments: ArticleComment[]) => void
) {
  const subscription = supabase
    .channel(`article_comments:${articleId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'article_comments',
        filter: `article_id=eq.${articleId}`,
      },
      async () => {
        // Refetch all comments when changes occur
        const comments = await getArticleComments(articleId);
        callback(comments);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(subscription);
  };
}

/**
 * Delete all comments for an article (used during article deletion)
 * This function bypasses normal user permissions for administrative deletion
 */
export async function deleteAllCommentsForArticle(articleId: string): Promise<{
  success: boolean;
  deletedCount: number;
  error?: string;
}> {
  try {
    console.log('🗑️ Starting deleteAllCommentsForArticle for article:', articleId);
    
    // Get the current user to verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('❌ User not authenticated for comment deletion');
      return {
        success: false,
        deletedCount: 0,
        error: 'User not authenticated'
      };
    }

    console.log('✅ User authenticated:', user.id);

    // First, get all comment IDs for this article for cleanup
    const { data: comments, error: fetchError } = await supabase
      .from('article_comments')
      .select('id, user_id, admin_comment_type')
      .eq('article_id', articleId);

    if (fetchError) {
      console.error('❌ Error fetching comments for deletion:', fetchError);
      return {
        success: false,
        deletedCount: 0,
        error: `Failed to fetch comments: ${fetchError.message}`
      };
    }

    if (!comments || comments.length === 0) {
      console.log('ℹ️ No comments found for article:', articleId);
      return {
        success: true,
        deletedCount: 0
      };
    }

    const commentIds = comments.map(c => c.id);
    console.log(`🔍 Found ${comments.length} comments to delete:`, {
      commentIds,
      userComments: comments.filter(c => c.user_id === user.id).length,
      adminComments: comments.filter(c => c.admin_comment_type).length
    });

    // Delete admin-related data first
    if (commentIds.length > 0) {
      // Delete admin comment notifications
      const { error: notificationsError } = await supabase
        .from('admin_comment_notifications')
        .delete()
        .in('comment_id', commentIds);

      if (notificationsError) {
        console.warn('⚠️ Could not delete admin notifications:', notificationsError);
      }

      // Delete comment approval workflow records
      const { error: workflowError } = await supabase
        .from('comment_approval_workflow')
        .delete()
        .in('comment_id', commentIds);

      if (workflowError) {
        console.warn('⚠️ Could not delete workflow records:', workflowError);
      }

      // Delete comment status history
      const { error: historyError } = await supabase
        .from('comment_status_history')
        .delete()
        .in('comment_id', commentIds);

      if (historyError) {
        console.warn('⚠️ Could not delete status history:', historyError);
      }
    }

    // Now delete the comments themselves
    // For article deletion, we need to delete ALL comments regardless of who created them
    console.log('🔄 Attempting to delete comments...');
    
    const { error: deleteError, count } = await supabase
      .from('article_comments')
      .delete({ count: 'exact' })
      .eq('article_id', articleId);

    if (deleteError) {
      console.error('❌ Error deleting comments:', deleteError);
      
      // If the main deletion fails, try deleting only user's own comments first
      console.log('🔄 Attempting to delete only user comments...');
      const { error: userDeleteError, count: userCount } = await supabase
        .from('article_comments')
        .delete({ count: 'exact' })
        .eq('article_id', articleId)
        .eq('user_id', user.id);

      if (userDeleteError) {
        console.error('❌ Even user comment deletion failed:', userDeleteError);
        return {
          success: false,
          deletedCount: 0,
          error: `Failed to delete comments: ${deleteError.message}`
        };
      } else {
        console.log(`⚠️ Deleted only user comments: ${userCount}/${comments.length}`);
        return {
          success: true,
          deletedCount: userCount || 0,
          error: `Could not delete all comments due to permissions. Deleted ${userCount} user comments out of ${comments.length} total.`
        };
      }
    }

    const deletedCount = count || 0;
    console.log(`✅ Successfully deleted ${deletedCount} comments for article ${articleId}`);

    return {
      success: true,
      deletedCount
    };

  } catch (error) {
    console.error('❌ Unexpected error deleting comments:', error);
    return {
      success: false,
      deletedCount: 0,
      error: `Unexpected error: ${error}`
    };
  }
} 