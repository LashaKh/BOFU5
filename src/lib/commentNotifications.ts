import { supabase } from './supabase';
import { ArticleComment } from './commentApi';

export interface CommentNotification {
  id: string;
  user_id: string;
  comment_id: string;
  notification_type: 'new_comment' | 'new_reply' | 'mention' | 'status_change' | 'resolution';
  title: string;
  message: string;
  read: boolean;
  created_at: string;
  article_id: string;
  article_title?: string;
  triggered_by_user?: {
    id: string;
    name: string;
    email: string;
    avatar_url?: string;
  };
}

export interface NotificationPreferences {
  user_id: string;
  email_new_comments: boolean;
  email_new_replies: boolean;
  email_mentions: boolean;
  email_status_changes: boolean;
  in_app_new_comments: boolean;
  in_app_new_replies: boolean;
  in_app_mentions: boolean;
  in_app_status_changes: boolean;
  mention_keywords: string[];
  digest_frequency: 'immediate' | 'hourly' | 'daily' | 'weekly' | 'never';
}

export interface EmailTemplate {
  type: 'new_comment' | 'new_reply' | 'mention' | 'status_change' | 'resolution' | 'digest';
  subject: string;
  htmlContent: string;
  textContent: string;
}

/**
 * Create notification when a new comment is added
 */
export async function createCommentNotification(
  comment: ArticleComment,
  notificationType: CommentNotification['notification_type']
): Promise<void> {
  try {
    // Get the current user (who triggered the notification)
    const { data: currentUser } = await supabase.auth.getUser();
    if (!currentUser.user) return;

    // Get article information
    const { data: article } = await supabase
      .from('content_briefs')
      .select('id, product_name, user_id')
      .eq('id', comment.article_id)
      .single();

    if (!article) return;

    // Determine who should receive notifications
    const recipientIds = await getNotificationRecipients(comment, notificationType, article);

    // Create notifications for each recipient
    for (const recipientId of recipientIds) {
      if (recipientId === currentUser.user.id) continue; // Don't notify yourself

      const notification = await createNotificationRecord(
        recipientId,
        comment,
        notificationType,
        article,
        currentUser.user
      );

      // Send email notification if enabled
      await sendEmailNotificationIfEnabled(recipientId, notification);

      // Send in-app notification
      await sendInAppNotification(recipientId, notification);
    }
  } catch (error) {
    console.error('Error creating comment notification:', error);
  }
}

/**
 * Get unread notifications for a user
 */
export async function getUserNotifications(
  userId: string,
  limit: number = 50,
  onlyUnread: boolean = false
): Promise<CommentNotification[]> {
  try {
    let query = supabase
      .from('comment_notifications')
      .select(`
        *,
        article_comments!inner(id, content, article_id),
        content_briefs!inner(product_name),
        triggered_by:auth.users!triggered_by_user_id(id, email, raw_user_meta_data)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (onlyUnread) {
      query = query.eq('read', false);
    }

    const { data: notifications, error } = await query;
    if (error) throw error;

    return (notifications || []).map(transformNotification);
  } catch (error) {
    console.error('Error fetching user notifications:', error);
    return [];
  }
}

/**
 * Mark notifications as read
 */
export async function markNotificationsAsRead(notificationIds: string[]): Promise<void> {
  try {
    const { error } = await supabase
      .from('comment_notifications')
      .update({ read: true, read_at: new Date().toISOString() })
      .in('id', notificationIds);

    if (error) throw error;
  } catch (error) {
    console.error('Error marking notifications as read:', error);
    throw error;
  }
}

/**
 * Get notification preferences for a user
 */
export async function getNotificationPreferences(userId: string): Promise<NotificationPreferences> {
  try {
    const { data: preferences, error } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    // Return default preferences if none exist
    return preferences || getDefaultNotificationPreferences(userId);
  } catch (error) {
    console.error('Error fetching notification preferences:', error);
    return getDefaultNotificationPreferences(userId);
  }
}

/**
 * Update notification preferences
 */
export async function updateNotificationPreferences(
  userId: string,
  preferences: Partial<NotificationPreferences>
): Promise<void> {
  try {
    const { error } = await supabase
      .from('notification_preferences')
      .upsert({
        user_id: userId,
        ...preferences,
        updated_at: new Date().toISOString()
      });

    if (error) throw error;
  } catch (error) {
    console.error('Error updating notification preferences:', error);
    throw error;
  }
}

/**
 * Process mentions in comment content
 */
export async function processMentions(comment: ArticleComment): Promise<void> {
  try {
    const mentions = extractMentions(comment.content);
    if (mentions.length === 0) return;

    // Get user IDs for mentioned usernames/emails
    const { data: users } = await supabase.auth.admin.listUsers();
    const mentionedUsers = users.users.filter(user => {
      const name = user.user_metadata?.name?.toLowerCase();
      const email = user.email?.toLowerCase();
      return email && mentions.some(mention => 
        mention.toLowerCase() === name || mention.toLowerCase() === email
      );
    });

    // Create mention notifications
    for (const user of mentionedUsers) {
      await createCommentNotification(comment, 'mention');
    }
  } catch (error) {
    console.error('Error processing mentions:', error);
  }
}

/**
 * Send digest emails based on user preferences
 */
export async function sendDigestEmails(): Promise<void> {
  try {
    const { data: users } = await supabase
      .from('notification_preferences')
      .select('user_id, digest_frequency')
      .neq('digest_frequency', 'never');

    if (!users) return;

    const now = new Date();
    const currentHour = now.getHours();
    const currentDay = now.getDay();

    for (const user of users) {
      let shouldSendDigest = false;

      switch (user.digest_frequency) {
        case 'hourly':
          shouldSendDigest = true;
          break;
        case 'daily':
          shouldSendDigest = currentHour === 9; // 9 AM
          break;
        case 'weekly':
          shouldSendDigest = currentDay === 1 && currentHour === 9; // Monday 9 AM
          break;
      }

      if (shouldSendDigest) {
        await sendUserDigest(user.user_id, user.digest_frequency);
      }
    }
  } catch (error) {
    console.error('Error sending digest emails:', error);
  }
}

/**
 * Get notification statistics for analytics
 */
export async function getNotificationStats(dateRange?: { start: Date; end: Date }) {
  try {
    let query = supabase
      .from('comment_notifications')
      .select('notification_type, read, created_at');

    if (dateRange) {
      query = query
        .gte('created_at', dateRange.start.toISOString())
        .lte('created_at', dateRange.end.toISOString());
    }

    const { data: notifications, error } = await query;
    if (error) throw error;

    const stats = {
      total: notifications?.length || 0,
      byType: {} as Record<string, number>,
      readRate: 0,
      avgResponseTime: 0
    };

    if (notifications) {
      // Count by type
      notifications.forEach(notif => {
        stats.byType[notif.notification_type] = (stats.byType[notif.notification_type] || 0) + 1;
      });

      // Calculate read rate
      const readCount = notifications.filter(n => n.read).length;
      stats.readRate = notifications.length > 0 ? (readCount / notifications.length) * 100 : 0;
    }

    return stats;
  } catch (error) {
    console.error('Error fetching notification stats:', error);
    return { total: 0, byType: {}, readRate: 0, avgResponseTime: 0 };
  }
}

// Helper functions

async function getNotificationRecipients(
  comment: ArticleComment,
  notificationType: CommentNotification['notification_type'],
  article: any
): Promise<string[]> {
  const recipients = new Set<string>();

  switch (notificationType) {
    case 'new_comment':
      // Notify article owner and subscribers
      recipients.add(article.user_id);
      break;

    case 'new_reply':
      // Notify parent comment author and thread participants
      if (comment.parent_comment_id) {
        const { data: parentComment } = await supabase
          .from('article_comments')
          .select('user_id')
          .eq('id', comment.parent_comment_id)
          .single();

        if (parentComment) {
          recipients.add(parentComment.user_id);
        }

        // Add other participants in the thread
        const { data: threadComments } = await supabase
          .from('article_comments')
          .select('user_id')
          .eq('parent_comment_id', comment.parent_comment_id);

        threadComments?.forEach(tc => recipients.add(tc.user_id));
      }
      break;

    case 'mention':
      // Extract mentioned users from comment content
      const mentions = extractMentions(comment.content);
      const { data: users } = await supabase.auth.admin.listUsers();
      
      users.users.forEach(user => {
        const name = user.user_metadata?.name?.toLowerCase();
        const email = user.email?.toLowerCase();
        if (email && mentions.some(mention => 
          mention.toLowerCase() === name || mention.toLowerCase() === email
        )) {
          recipients.add(user.id);
        }
      });
      break;

    case 'status_change':
    case 'resolution':
      // Notify comment author and thread participants
      recipients.add(comment.user_id);
      break;
  }

  return Array.from(recipients);
}

async function createNotificationRecord(
  recipientId: string,
  comment: ArticleComment,
  notificationType: CommentNotification['notification_type'],
  article: any,
  triggeredBy: any
): Promise<CommentNotification> {
  const { title, message } = generateNotificationContent(
    comment,
    notificationType,
    article,
    triggeredBy
  );

  const { data: notification, error } = await supabase
    .from('comment_notifications')
    .insert({
      user_id: recipientId,
      comment_id: comment.id,
      notification_type: notificationType,
      title,
      message,
      article_id: comment.article_id,
      triggered_by_user_id: triggeredBy.id,
      read: false
    })
    .select('*')
    .single();

  if (error) throw error;

  return transformNotification({
    ...notification,
    content_briefs: { product_name: article.product_name },
    triggered_by: triggeredBy
  });
}

function generateNotificationContent(
  comment: ArticleComment,
  notificationType: CommentNotification['notification_type'],
  article: any,
  triggeredBy: any
): { title: string; message: string } {
  const userName = triggeredBy.user_metadata?.name || triggeredBy.email;
  const articleTitle = article.product_name;

  switch (notificationType) {
    case 'new_comment':
      return {
        title: 'New Comment',
        message: `${userName} commented on "${articleTitle}"`
      };

    case 'new_reply':
      return {
        title: 'New Reply',
        message: `${userName} replied to your comment on "${articleTitle}"`
      };

    case 'mention':
      return {
        title: 'You were mentioned',
        message: `${userName} mentioned you in a comment on "${articleTitle}"`
      };

    case 'status_change':
      return {
        title: 'Comment Status Changed',
        message: `Your comment on "${articleTitle}" was ${comment.status}`
      };

    default:
      return {
        title: 'Comment Activity',
        message: `Activity on "${articleTitle}"`
      };
  }
}

async function sendEmailNotificationIfEnabled(
  recipientId: string,
  notification: CommentNotification
): Promise<void> {
  try {
    const preferences = await getNotificationPreferences(recipientId);
    
    let shouldSendEmail = false;
    switch (notification.notification_type) {
      case 'new_comment':
        shouldSendEmail = preferences.email_new_comments;
        break;
      case 'new_reply':
        shouldSendEmail = preferences.email_new_replies;
        break;
      case 'mention':
        shouldSendEmail = preferences.email_mentions;
        break;
      case 'status_change':
        shouldSendEmail = preferences.email_status_changes;
        break;
    }

    if (shouldSendEmail && preferences.digest_frequency === 'immediate') {
      await sendEmailNotification(recipientId, notification);
    }
  } catch (error) {
    console.error('Error checking email preferences:', error);
  }
}

async function sendEmailNotification(
  recipientId: string,
  notification: CommentNotification
): Promise<void> {
  try {
    // Get recipient email
    const { data: user } = await supabase.auth.admin.getUserById(recipientId);
    if (!user.user?.email) return;

    // This would integrate with your email service (SendGrid, Mailgun, etc.)
    const emailTemplate = generateEmailTemplate(notification);
    
    // Call email service API here
    console.log(`Would send email to ${user.user.email}:`, emailTemplate);
  } catch (error) {
    console.error('Error sending email notification:', error);
  }
}

async function sendInAppNotification(
  recipientId: string,
  notification: CommentNotification
): Promise<void> {
  try {
    // Use Supabase real-time to send in-app notification
    const channel = supabase.channel(`notifications:${recipientId}`);
    channel.send({
      type: 'broadcast',
      event: 'new_notification',
      payload: notification
    });
  } catch (error) {
    console.error('Error sending in-app notification:', error);
  }
}

function extractMentions(content: string): string[] {
  const mentionRegex = /@(\w+(?:\.\w+)*@\w+(?:\.\w+)*|\w+)/g;
  const mentions: string[] = [];
  let match;

  while ((match = mentionRegex.exec(content)) !== null) {
    mentions.push(match[1]);
  }

  return mentions;
}

function transformNotification(notif: any): CommentNotification {
  return {
    id: notif.id,
    user_id: notif.user_id,
    comment_id: notif.comment_id,
    notification_type: notif.notification_type,
    title: notif.title,
    message: notif.message,
    read: notif.read,
    created_at: notif.created_at,
    article_id: notif.article_id,
    article_title: notif.content_briefs?.product_name,
    triggered_by_user: notif.triggered_by ? {
      id: notif.triggered_by.id,
      name: notif.triggered_by.raw_user_meta_data?.name || notif.triggered_by.email,
      email: notif.triggered_by.email,
      avatar_url: notif.triggered_by.raw_user_meta_data?.avatar_url
    } : undefined
  };
}

function getDefaultNotificationPreferences(userId: string): NotificationPreferences {
  return {
    user_id: userId,
    email_new_comments: true,
    email_new_replies: true,
    email_mentions: true,
    email_status_changes: false,
    in_app_new_comments: true,
    in_app_new_replies: true,
    in_app_mentions: true,
    in_app_status_changes: true,
    mention_keywords: [],
    digest_frequency: 'daily'
  };
}

function generateEmailTemplate(notification: CommentNotification): EmailTemplate {
  const baseUrl = window.location.origin;
  const commentUrl = `${baseUrl}/article/${notification.article_id}#comment-${notification.comment_id}`;

  return {
    type: notification.notification_type,
    subject: notification.title,
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>${notification.title}</h2>
        <p>${notification.message}</p>
        <p><a href="${commentUrl}" style="background: #0066cc; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">View Comment</a></p>
        <hr>
        <p style="color: #666; font-size: 12px;">
          You're receiving this because you have notifications enabled for comment activity.
          <a href="${baseUrl}/notifications/preferences">Manage your notification preferences</a>
        </p>
      </div>
    `,
    textContent: `
      ${notification.title}
      
      ${notification.message}
      
      View comment: ${commentUrl}
      
      ---
      You're receiving this because you have notifications enabled for comment activity.
      Manage your preferences: ${baseUrl}/notifications/preferences
    `
  };
}

async function sendUserDigest(userId: string, frequency: string): Promise<void> {
  try {
    // Get unread notifications for user
    const notifications = await getUserNotifications(userId, 50, true);
    if (notifications.length === 0) return;

    // Group by article
    const digestData = notifications.reduce((acc, notif) => {
      if (!acc[notif.article_id]) {
        acc[notif.article_id] = {
          article_title: notif.article_title || 'Unknown Article',
          notifications: []
        };
      }
      acc[notif.article_id].notifications.push(notif);
      return acc;
    }, {} as Record<string, any>);

    // Send digest email
    const { data: user } = await supabase.auth.admin.getUserById(userId);
    if (!user.user?.email) return;

    console.log(`Would send ${frequency} digest to ${user.user.email}:`, digestData);
  } catch (error) {
    console.error('Error sending user digest:', error);
  }
} 