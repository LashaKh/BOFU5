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
  // Extended fields for UI
  user?: {
    id: string;
    email: string;
    name?: string;
    avatar_url?: string;
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

    const commentData = {
      ...data,
      user_id: user.user.id,
      content_type: data.content_type || 'text',
      status: 'active' as const
    };

    const { data: comment, error } = await supabase
      .from('article_comments')
      .insert(commentData)
      .select('*')
      .single();

    if (error) throw error;

    return transformComment(comment);
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
    const { data: comments, error } = await supabase
      .from('article_comments')
      .select('*')
      .eq('article_id', articleId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    // Transform and organize comments into threads
    const transformedComments = comments?.map(transformComment) || [];
    return organizeCommentThreads(transformedComments);
  } catch (error) {
    console.error('Error fetching article comments:', error);
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

    return transformComment(comment);
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

    return comments?.map(transformComment) || [];
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

    return transformComment(comment);
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

    return transformComment(comment);
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
    const { data: comments, error } = await supabase
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

    if (error) throw error;

    // Transform and organize comments into threads with metrics
    const transformedComments = comments?.map(comment => {
      const transformed = transformComment(comment);
      
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
    }) || [];

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
 * Transform comment data from database format to UI format
 */
function transformComment(comment: any): ArticleComment {
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
    created_at: comment.created_at,
    updated_at: comment.updated_at,
    user: comment.user ? {
      id: comment.user.id,
      email: comment.user.email,
      name: comment.user.raw_user_meta_data?.name || comment.user.email,
      avatar_url: comment.user.raw_user_meta_data?.avatar_url
    } : {
      id: comment.user_id,
      email: 'user@example.com',
      name: 'Anonymous User',
      avatar_url: undefined
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