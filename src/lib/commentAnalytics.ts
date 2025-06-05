import { supabase } from './supabase';
import { ArticleComment } from './commentApi';

export interface CommentAnalytics {
  totalComments: number;
  totalReplies: number;
  activeComments: number;
  resolvedComments: number;
  archivedComments: number;
  uniqueCommenters: number;
  averageResolutionTime: number; // in hours
  commentDensity: number; // comments per 1000 words
  mostActiveCommenter: {
    user_id: string;
    username: string;
    commentCount: number;
  } | null;
  engagementRate: number; // percentage of comments with replies
  topKeywords: Array<{ keyword: string; count: number }>;
  activityTimeline: Array<{
    date: string;
    commentCount: number;
    replyCount: number;
  }>;
}

export interface UserEngagementMetrics {
  user_id: string;
  username: string;
  avatar_url?: string;
  totalComments: number;
  totalReplies: number;
  averageResponseTime: number; // in hours
  mostCommentedArticles: Array<{
    article_id: string;
    article_title: string;
    commentCount: number;
  }>;
  collaborationScore: number; // 0-100 based on engagement
  recentActivity: Array<{
    date: string;
    action: 'comment' | 'reply' | 'resolve';
    article_id: string;
  }>;
}

export interface ArticleCollaborationStats {
  article_id: string;
  article_title?: string;
  totalComments: number;
  totalParticipants: number;
  averageCommentsPerUser: number;
  resolutionRate: number; // percentage of resolved comments
  collaborationIntensity: 'low' | 'medium' | 'high';
  commentDistribution: {
    suggestions: number;
    questions: number;
    feedback: number;
  };
  timeToResolution: {
    average: number;
    median: number;
    fastest: number;
    slowest: number;
  };
}

/**
 * Get comprehensive analytics for comments on a specific article
 */
export async function getArticleCommentAnalytics(articleId: string): Promise<CommentAnalytics> {
  try {
    const { data: comments, error } = await supabase
      .from('article_comments')
      .select(`
        *,
        user:auth.users(id, email, raw_user_meta_data)
      `)
      .eq('article_id', articleId);

    if (error) throw error;

    const analytics = await analyzeComments(comments || []);
    return analytics;
  } catch (error) {
    console.error('Error fetching comment analytics:', error);
    throw error;
  }
}

/**
 * Get user engagement metrics across all articles
 */
export async function getUserEngagementMetrics(userId: string): Promise<UserEngagementMetrics> {
  try {
    // Get user's comments
    const { data: userComments, error: commentsError } = await supabase
      .from('article_comments')
      .select(`
        *,
        content_briefs!inner(id, product_name)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (commentsError) throw commentsError;

    // Get user info
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId);
    if (userError) throw userError;

    const metrics = await calculateUserMetrics(userComments || [], userData.user);
    return metrics;
  } catch (error) {
    console.error('Error fetching user engagement metrics:', error);
    throw error;
  }
}

/**
 * Get collaboration statistics for all articles
 */
export async function getArticleCollaborationStats(): Promise<ArticleCollaborationStats[]> {
  try {
    const { data: articlesWithComments, error } = await supabase
      .from('content_briefs')
      .select(`
        id,
        product_name,
        article_comments(*)
      `);

    if (error) throw error;

    const stats = await Promise.all(
      (articlesWithComments || []).map(async (article) => 
        calculateCollaborationStats(article.id, article.product_name, article.article_comments)
      )
    );

    return stats.filter(stat => stat.totalComments > 0);
  } catch (error) {
    console.error('Error fetching collaboration stats:', error);
    throw error;
  }
}

/**
 * Get real-time comment activity for dashboard
 */
export async function getRealtimeCommentActivity() {
  try {
    const { data: recentComments, error } = await supabase
      .from('article_comments')
      .select(`
        *,
        user:auth.users(id, email, raw_user_meta_data),
        content_briefs(id, product_name)
      `)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;

    const activity = {
      recentComments: recentComments || [],
      totalToday: await getCommentCountSince(new Date(Date.now() - 24 * 60 * 60 * 1000)),
      totalThisWeek: await getCommentCountSince(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)),
      activeUsers: await getActiveUserCount(24), // last 24 hours
      pendingResolutions: await getPendingResolutionCount()
    };

    return activity;
  } catch (error) {
    console.error('Error fetching realtime activity:', error);
    throw error;
  }
}

/**
 * Export comment data for analytics or backup
 */
export async function exportCommentData(
  articleId: string, 
  format: 'json' | 'csv' = 'json',
  filters?: {
    status?: string[];
    dateRange?: { start: Date; end: Date };
    users?: string[];
  }
): Promise<string> {
  try {
    let query = supabase
      .from('article_comments')
      .select(`
        *,
        user:auth.users(id, email, raw_user_meta_data)
      `)
      .eq('article_id', articleId);

    // Apply filters
    if (filters?.status) {
      query = query.in('status', filters.status);
    }
    if (filters?.dateRange) {
      query = query
        .gte('created_at', filters.dateRange.start.toISOString())
        .lte('created_at', filters.dateRange.end.toISOString());
    }
    if (filters?.users) {
      query = query.in('user_id', filters.users);
    }

    const { data: comments, error } = await query.order('created_at', { ascending: true });
    if (error) throw error;

    if (format === 'csv') {
      return convertToCSV(comments || []);
    } else {
      return JSON.stringify(comments, null, 2);
    }
  } catch (error) {
    console.error('Error exporting comment data:', error);
    throw error;
  }
}

// Helper functions

async function analyzeComments(comments: any[]): Promise<CommentAnalytics> {
  const totalComments = comments.length;
  const replies = comments.filter(c => c.parent_comment_id);
  const rootComments = comments.filter(c => !c.parent_comment_id);
  
  const statusCounts = {
    active: comments.filter(c => c.status === 'active').length,
    resolved: comments.filter(c => c.status === 'resolved').length,
    archived: comments.filter(c => c.status === 'archived').length
  };

  const uniqueCommenters = new Set(comments.map(c => c.user_id)).size;
  
  // Calculate engagement rate
  const commentsWithReplies = rootComments.filter(c => 
    comments.some(reply => reply.parent_comment_id === c.id)
  );
  const engagementRate = rootComments.length > 0 
    ? (commentsWithReplies.length / rootComments.length) * 100 
    : 0;

  // Find most active commenter
  const userCommentCounts = comments.reduce((acc, comment) => {
    acc[comment.user_id] = (acc[comment.user_id] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const mostActiveUserId = Object.keys(userCommentCounts)
    .reduce((a, b) => userCommentCounts[a] > userCommentCounts[b] ? a : b, '');
  
  const mostActiveCommenter = mostActiveUserId ? {
    user_id: mostActiveUserId,
    username: comments.find(c => c.user_id === mostActiveUserId)?.user?.name || 'Unknown',
    commentCount: userCommentCounts[mostActiveUserId]
  } : null;

  // Extract keywords from comments
  const topKeywords = extractTopKeywords(comments.map(c => c.content));

  // Generate activity timeline
  const activityTimeline = generateActivityTimeline(comments);

  // Calculate average resolution time
  const resolvedComments = comments.filter(c => c.status === 'resolved');
  const resolutionTimes = resolvedComments.map(c => {
    const created = new Date(c.created_at);
    const updated = new Date(c.updated_at);
    return (updated.getTime() - created.getTime()) / (1000 * 60 * 60); // hours
  });
  const averageResolutionTime = resolutionTimes.length > 0 
    ? resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length 
    : 0;

  return {
    totalComments,
    totalReplies: replies.length,
    activeComments: statusCounts.active,
    resolvedComments: statusCounts.resolved,
    archivedComments: statusCounts.archived,
    uniqueCommenters,
    averageResolutionTime,
    commentDensity: 0, // Would need article word count
    mostActiveCommenter,
    engagementRate,
    topKeywords,
    activityTimeline
  };
}

async function calculateUserMetrics(userComments: any[], user: any): Promise<UserEngagementMetrics> {
  const totalComments = userComments.length;
  const totalReplies = userComments.filter(c => c.parent_comment_id).length;
  
  // Calculate average response time
  const responseTimesInHours = userComments
    .filter(c => c.parent_comment_id)
    .map(reply => {
      const parentComment = userComments.find(c => c.id === reply.parent_comment_id);
      if (!parentComment) return 0;
      
      const parentTime = new Date(parentComment.created_at);
      const replyTime = new Date(reply.created_at);
      return (replyTime.getTime() - parentTime.getTime()) / (1000 * 60 * 60);
    });

  const averageResponseTime = responseTimesInHours.length > 0
    ? responseTimesInHours.reduce((a, b) => a + b, 0) / responseTimesInHours.length
    : 0;

  // Group by articles
  const articleGroups = userComments.reduce((acc, comment) => {
    const articleId = comment.content_briefs?.id;
    if (!articleId) return acc;
    
    if (!acc[articleId]) {
      acc[articleId] = {
        article_id: articleId,
        article_title: comment.content_briefs.product_name,
        commentCount: 0
      };
    }
    acc[articleId].commentCount++;
    return acc;
  }, {} as Record<string, { article_id: string; article_title: string; commentCount: number }>);

  const mostCommentedArticles = (Object.values(articleGroups) as Array<{ article_id: string; article_title: string; commentCount: number }>)
    .sort((a, b) => b.commentCount - a.commentCount)
    .slice(0, 5);

  // Calculate collaboration score (0-100)
  const collaborationScore = Math.min(100, 
    (totalComments * 2) + 
    (totalReplies * 3) + 
    (Math.max(0, 48 - averageResponseTime) * 1) // bonus for fast responses
  );

  // Recent activity
  const recentActivity = userComments
    .slice(0, 10)
    .map(comment => ({
      date: comment.created_at,
      action: (comment.parent_comment_id ? 'reply' : 'comment') as 'comment' | 'reply' | 'resolve',
      article_id: comment.content_briefs?.id || ''
    }));

  return {
    user_id: user.id,
    username: user.raw_user_meta_data?.name || user.email,
    avatar_url: user.raw_user_meta_data?.avatar_url,
    totalComments,
    totalReplies,
    averageResponseTime,
    mostCommentedArticles,
    collaborationScore,
    recentActivity
  };
}

async function calculateCollaborationStats(
  articleId: string, 
  articleTitle: string, 
  comments: any[]
): Promise<ArticleCollaborationStats> {
  const totalComments = comments.length;
  const uniqueParticipants = new Set(comments.map(c => c.user_id)).size;
  const averageCommentsPerUser = uniqueParticipants > 0 ? totalComments / uniqueParticipants : 0;
  
  const resolvedCount = comments.filter(c => c.status === 'resolved').length;
  const resolutionRate = totalComments > 0 ? (resolvedCount / totalComments) * 100 : 0;

  // Determine collaboration intensity
  let collaborationIntensity: 'low' | 'medium' | 'high' = 'low';
  if (averageCommentsPerUser > 5 && uniqueParticipants > 3) {
    collaborationIntensity = 'high';
  } else if (averageCommentsPerUser > 2 || uniqueParticipants > 2) {
    collaborationIntensity = 'medium';
  }

  // Comment distribution by type
  const commentDistribution = {
    suggestions: comments.filter(c => c.content_type === 'suggestion').length,
    questions: comments.filter(c => c.content.includes('?')).length,
    feedback: comments.filter(c => 
      c.content_type === 'text' && 
      !c.content.includes('?') && 
      c.content_type !== 'suggestion'
    ).length
  };

  // Time to resolution metrics
  const resolvedComments = comments.filter(c => c.status === 'resolved');
  const resolutionTimes = resolvedComments.map(c => {
    const created = new Date(c.created_at);
    const updated = new Date(c.updated_at);
    return (updated.getTime() - created.getTime()) / (1000 * 60 * 60); // hours
  });

  const timeToResolution = {
    average: resolutionTimes.length > 0 ? resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length : 0,
    median: resolutionTimes.length > 0 ? resolutionTimes.sort()[Math.floor(resolutionTimes.length / 2)] : 0,
    fastest: resolutionTimes.length > 0 ? Math.min(...resolutionTimes) : 0,
    slowest: resolutionTimes.length > 0 ? Math.max(...resolutionTimes) : 0
  };

  return {
    article_id: articleId,
    article_title: articleTitle,
    totalComments,
    totalParticipants: uniqueParticipants,
    averageCommentsPerUser,
    resolutionRate,
    collaborationIntensity,
    commentDistribution,
    timeToResolution
  };
}

function extractTopKeywords(contents: string[]): Array<{ keyword: string; count: number }> {
  const allText = contents.join(' ').toLowerCase();
  const words = allText.match(/\b\w+\b/g) || [];
  
  // Filter out common words
  const stopWords = new Set(['the', 'is', 'at', 'which', 'on', 'and', 'a', 'to', 'as', 'are', 'was', 'will', 'be']);
  const filteredWords = words.filter(word => word.length > 3 && !stopWords.has(word));
  
  const wordCounts = filteredWords.reduce((acc, word) => {
    acc[word] = (acc[word] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return Object.entries(wordCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10)
    .map(([keyword, count]) => ({ keyword, count }));
}

function generateActivityTimeline(comments: any[]): Array<{ date: string; commentCount: number; replyCount: number }> {
  const last30Days = Array.from({ length: 30 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - i);
    return date.toISOString().split('T')[0];
  }).reverse();

  return last30Days.map(date => {
    const dayComments = comments.filter(c => c.created_at.startsWith(date));
    const commentCount = dayComments.filter(c => !c.parent_comment_id).length;
    const replyCount = dayComments.filter(c => c.parent_comment_id).length;
    
    return { date, commentCount, replyCount };
  });
}

async function getCommentCountSince(date: Date): Promise<number> {
  const { count, error } = await supabase
    .from('article_comments')
    .select('*', { count: 'exact' })
    .gte('created_at', date.toISOString());

  if (error) throw error;
  return count || 0;
}

async function getActiveUserCount(hours: number): Promise<number> {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);
  
  const { data, error } = await supabase
    .from('article_comments')
    .select('user_id')
    .gte('created_at', since.toISOString());

  if (error) throw error;
  return new Set(data?.map(c => c.user_id)).size;
}

async function getPendingResolutionCount(): Promise<number> {
  const { count, error } = await supabase
    .from('article_comments')
    .select('*', { count: 'exact' })
    .eq('status', 'active')
    .is('parent_comment_id', null); // Only root comments

  if (error) throw error;
  return count || 0;
}

function convertToCSV(comments: any[]): string {
  const headers = [
    'ID', 'Article ID', 'User ID', 'Username', 'Content', 'Type', 
    'Status', 'Created At', 'Updated At', 'Parent Comment ID'
  ];

  const rows = comments.map(comment => [
    comment.id,
    comment.article_id,
    comment.user_id,
    comment.user?.name || comment.user?.email || 'Unknown',
    `"${comment.content.replace(/"/g, '""')}"`, // Escape quotes
    comment.content_type,
    comment.status,
    comment.created_at,
    comment.updated_at,
    comment.parent_comment_id || ''
  ]);

  return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
} 