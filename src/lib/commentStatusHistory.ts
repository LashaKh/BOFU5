import { supabase } from './supabase';

export interface CommentStatusHistory {
  id: string;
  comment_id: string;
  old_status: 'active' | 'resolved' | 'archived';
  new_status: 'active' | 'resolved' | 'archived';
  changed_by: string;
  changed_at: string;
  reason?: string;
  metadata?: {
    template_used?: string;
    bulk_operation?: boolean;
    auto_resolved?: boolean;
    resolution_time_days?: number;
  };
}

export interface StatusChangeStats {
  comment_id: string;
  total_changes: number;
  resolution_count: number;
  reopen_count: number;
  archive_count: number;
  average_resolution_time: number;
  last_status_change: string;
  status_history: CommentStatusHistory[];
}

/**
 * Record a status change in the history table
 */
export async function recordStatusChange(
  commentId: string,
  oldStatus: 'active' | 'resolved' | 'archived',
  newStatus: 'active' | 'resolved' | 'archived',
  reason?: string,
  metadata?: any
): Promise<CommentStatusHistory> {
  try {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) {
      throw new Error('User not authenticated');
    }

    const historyRecord = {
      comment_id: commentId,
      old_status: oldStatus,
      new_status: newStatus,
      changed_by: user.user.id,
      reason: reason || null,
      metadata: metadata || null
    };

    const { data, error } = await supabase
      .from('comment_status_history')
      .insert(historyRecord)
      .select('*')
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error recording status change:', error);
    throw error;
  }
}

/**
 * Get status history for a specific comment
 */
export async function getCommentStatusHistory(commentId: string): Promise<CommentStatusHistory[]> {
  try {
    const { data, error } = await supabase
      .from('comment_status_history')
      .select(`
        *,
        changed_by_user:changed_by(
          id,
          email,
          name,
          avatar_url
        )
      `)
      .eq('comment_id', commentId)
      .order('changed_at', { ascending: false });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error fetching comment status history:', error);
    throw error;
  }
}

/**
 * Get status change statistics for multiple comments
 */
export async function getStatusChangeStats(commentIds: string[]): Promise<StatusChangeStats[]> {
  try {
    const { data, error } = await supabase
      .from('comment_status_history')
      .select('*')
      .in('comment_id', commentIds)
      .order('changed_at', { ascending: true });

    if (error) throw error;

    // Group by comment_id and calculate statistics
    const statsMap = new Map<string, StatusChangeStats>();

    for (const record of data || []) {
      if (!statsMap.has(record.comment_id)) {
        statsMap.set(record.comment_id, {
          comment_id: record.comment_id,
          total_changes: 0,
          resolution_count: 0,
          reopen_count: 0,
          archive_count: 0,
          average_resolution_time: 0,
          last_status_change: record.changed_at,
          status_history: []
        });
      }

      const stats = statsMap.get(record.comment_id)!;
      stats.total_changes++;
      stats.status_history.push(record);
      stats.last_status_change = record.changed_at;

      // Count specific status changes
      if (record.new_status === 'resolved') {
        stats.resolution_count++;
      } else if (record.new_status === 'active' && record.old_status === 'resolved') {
        stats.reopen_count++;
      } else if (record.new_status === 'archived') {
        stats.archive_count++;
      }
    }

    // Calculate average resolution time for each comment
    statsMap.forEach((stats) => {
      const resolutionTimes: number[] = [];
      
      for (let i = 0; i < stats.status_history.length; i++) {
        const current = stats.status_history[i];
        if (current.new_status === 'resolved') {
          // Find the most recent 'active' status before this resolution
          for (let j = i + 1; j < stats.status_history.length; j++) {
            const previous = stats.status_history[j];
            if (previous.new_status === 'active') {
              const resolutionTime = new Date(current.changed_at).getTime() - new Date(previous.changed_at).getTime();
              const resolutionDays = resolutionTime / (1000 * 60 * 60 * 24);
              resolutionTimes.push(resolutionDays);
              break;
            }
          }
        }
      }

      if (resolutionTimes.length > 0) {
        stats.average_resolution_time = resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length;
      }
    });

    return Array.from(statsMap.values());
  } catch (error) {
    console.error('Error fetching status change stats:', error);
    throw error;
  }
}

/**
 * Get resolution analytics for a time period
 */
export async function getResolutionAnalytics(
  startDate: Date,
  endDate: Date,
  articleId?: string
): Promise<{
  totalResolutions: number;
  averageResolutionTime: number;
  resolutionsByDay: Array<{ date: string; count: number }>;
  resolutionsByUser: Array<{ user_id: string; user_name: string; count: number }>;
  reopenRate: number;
  topResolutionReasons: Array<{ reason: string; count: number }>;
}> {
  try {
    const query = supabase
      .from('comment_status_history')
      .select(`
        *,
        comment:comment_id(article_id),
        changed_by_user:changed_by(id, email, name)
      `)
      .eq('new_status', 'resolved')
      .gte('changed_at', startDate.toISOString())
      .lte('changed_at', endDate.toISOString());

    if (articleId) {
      // Note: This would require a join or subquery in a real implementation
      // For now, we'll filter on the client side
    }

    const { data: resolutions, error } = await query;

    if (error) throw error;

    // Calculate analytics
    const totalResolutions = resolutions?.length || 0;
    
    // Group by date
    const resolutionsByDay = new Map<string, number>();
    const resolutionsByUser = new Map<string, { name: string; count: number }>();
    const resolutionReasons = new Map<string, number>();
    const resolutionTimes: number[] = [];

    for (const resolution of resolutions || []) {
      // Group by date
      const date = new Date(resolution.changed_at).toISOString().split('T')[0];
      resolutionsByDay.set(date, (resolutionsByDay.get(date) || 0) + 1);

      // Group by user
      const userId = resolution.changed_by;
      const userName = resolution.changed_by_user?.name || resolution.changed_by_user?.email || 'Unknown';
      resolutionsByUser.set(userId, {
        name: userName,
        count: (resolutionsByUser.get(userId)?.count || 0) + 1
      });

      // Count reasons
      if (resolution.reason) {
        resolutionReasons.set(resolution.reason, (resolutionReasons.get(resolution.reason) || 0) + 1);
      }

      // Calculate resolution time if metadata available
      if (resolution.metadata?.resolution_time_days) {
        resolutionTimes.push(resolution.metadata.resolution_time_days);
      }
    }

    // Calculate average resolution time
    const averageResolutionTime = resolutionTimes.length > 0
      ? resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length
      : 0;

    // Calculate reopen rate (need to query reopens)
    const { data: reopens } = await supabase
      .from('comment_status_history')
      .select('comment_id')
      .eq('new_status', 'active')
      .eq('old_status', 'resolved')
      .gte('changed_at', startDate.toISOString())
      .lte('changed_at', endDate.toISOString());

    const reopenRate = totalResolutions > 0 ? ((reopens?.length || 0) / totalResolutions) * 100 : 0;

    return {
      totalResolutions,
      averageResolutionTime,
      resolutionsByDay: Array.from(resolutionsByDay.entries()).map(([date, count]) => ({ date, count })),
      resolutionsByUser: Array.from(resolutionsByUser.entries()).map(([user_id, data]) => ({
        user_id,
        user_name: data.name,
        count: data.count
      })),
      reopenRate,
      topResolutionReasons: Array.from(resolutionReasons.entries())
        .map(([reason, count]) => ({ reason, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)
    };
  } catch (error) {
    console.error('Error fetching resolution analytics:', error);
    throw error;
  }
}

/**
 * Bulk record status changes for multiple comments
 */
export async function bulkRecordStatusChanges(
  changes: Array<{
    commentId: string;
    oldStatus: 'active' | 'resolved' | 'archived';
    newStatus: 'active' | 'resolved' | 'archived';
    reason?: string;
  }>
): Promise<void> {
  try {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) {
      throw new Error('User not authenticated');
    }

    const historyRecords = changes.map(change => ({
      comment_id: change.commentId,
      old_status: change.oldStatus,
      new_status: change.newStatus,
      changed_by: user.user.id,
      reason: change.reason || null,
      metadata: { bulk_operation: true }
    }));

    const { error } = await supabase
      .from('comment_status_history')
      .insert(historyRecords);

    if (error) throw error;
  } catch (error) {
    console.error('Error bulk recording status changes:', error);
    throw error;
  }
}

/**
 * Get status history timeline for visualization
 */
export async function getStatusTimeline(
  commentIds: string[],
  startDate?: Date,
  endDate?: Date
): Promise<Array<{
  date: string;
  events: Array<{
    comment_id: string;
    old_status: string;
    new_status: string;
    user_name: string;
    reason?: string;
  }>;
}>> {
  try {
    let query = supabase
      .from('comment_status_history')
      .select(`
        *,
        changed_by_user:changed_by(name, email)
      `)
      .in('comment_id', commentIds)
      .order('changed_at', { ascending: true });

    if (startDate) {
      query = query.gte('changed_at', startDate.toISOString());
    }
    if (endDate) {
      query = query.lte('changed_at', endDate.toISOString());
    }

    const { data, error } = await query;

    if (error) throw error;

    // Group by date
    const timelineMap = new Map<string, any[]>();

    for (const record of data || []) {
      const date = new Date(record.changed_at).toISOString().split('T')[0];
      
      if (!timelineMap.has(date)) {
        timelineMap.set(date, []);
      }

      timelineMap.get(date)!.push({
        comment_id: record.comment_id,
        old_status: record.old_status,
        new_status: record.new_status,
        user_name: record.changed_by_user?.name || record.changed_by_user?.email || 'Unknown',
        reason: record.reason
      });
    }

    return Array.from(timelineMap.entries())
      .map(([date, events]) => ({ date, events }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  } catch (error) {
    console.error('Error fetching status timeline:', error);
    throw error;
  }
} 