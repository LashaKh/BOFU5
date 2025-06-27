import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAdminContext } from '../../contexts/AdminContext';
import { 
  Bell, 
  X, 
  Check, 
  AlertCircle, 
  Users, 
  UserPlus, 
  UserMinus, 
  Shuffle, 
  Clock, 
  CheckCircle,
  XCircle,
  Eye,
  Trash2,
  Filter,
  MoreVertical,
  AtSign,
  MessageSquare
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { 
  getMentionNotifications, 
  markMentionNotificationsAsSent,
  MentionNotification 
} from '../../lib/commentApi';
import {
  getBriefApprovalNotifications,
  markBriefApprovalNotificationsAsRead,
  BriefApprovalNotification
} from '../../lib/briefApprovalNotifications';

interface AssignmentNotificationCenterProps {
  isVisible: boolean;
  onClose: () => void;
}

interface NotificationItem {
  id: string;
  type: 'assignment' | 'unassignment' | 'transfer' | 'account_created' | 'account_deleted' | 'bulk_operation' | 'mention' | 'comment' | 'brief_approved';
  message: string;
  details?: string;
  timestamp: string;
  isRead: boolean;
  priority: 'low' | 'medium' | 'high';
  adminId?: string;
  clientId?: string;
  metadata?: any;
}

interface AssignmentActivity {
  id: string;
  admin_id: string;
  client_user_id: string;
  admin_email: string;
  client_email: string;
  client_company: string;
  assigned_at: string;
  assigned_by: string;
}

export function AssignmentNotificationCenter({ isVisible, onClose }: AssignmentNotificationCenterProps) {
  const { 
    adminRole, 
    allAdmins, 
    assignedClients,
    refreshAdminData
  } = useAdminContext();

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [recentActivities, setRecentActivities] = useState<AssignmentActivity[]>([]);
  const [mentionNotifications, setMentionNotifications] = useState<MentionNotification[]>([]);
  const [briefApprovalNotifications, setBriefApprovalNotifications] = useState<BriefApprovalNotification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread' | 'assignments' | 'accounts' | 'mentions' | 'briefs'>('all');
  const [selectedNotifications, setSelectedNotifications] = useState<Set<string>>(new Set());

  // Only super-admins can access this component
  if (adminRole !== 'super_admin') {
    return null;
  }

  // Load recent assignment activities and mention notifications
  const loadRecentActivities = async () => {
    try {
      setIsLoading(true);
      
      // Load assignment activities
      const { data, error } = await supabase
        .from('admin_client_assignments')
        .select(`
          id,
          admin_id,
          client_user_id,
          assigned_at,
          assigned_by,
          admin_profiles!admin_id(email),
          user_profiles!client_user_id(email, company_name)
        `)
        .order('assigned_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error loading recent activities:', error);
        return;
      }

      const activities: AssignmentActivity[] = data.map(item => ({
        id: item.id,
        admin_id: item.admin_id,
        client_user_id: item.client_user_id,
        admin_email: (item.admin_profiles as any)?.email || 'Unknown Admin',
        client_email: (item.user_profiles as any)?.email || 'Unknown Client',
        client_company: (item.user_profiles as any)?.company_name || 'Unknown Company',
        assigned_at: item.assigned_at,
        assigned_by: item.assigned_by
      }));

      setRecentActivities(activities);
      
      // Load mention notifications for admin
      let mentions: MentionNotification[] = [];
      try {
        mentions = await getMentionNotifications();
        setMentionNotifications(mentions);
        console.log('📥 Loaded mention notifications for admin:', mentions.length);
      } catch (mentionError) {
        console.error('Error loading mention notifications:', mentionError);
      }
      
      // Load brief approval notifications for admin
      let briefApprovals: BriefApprovalNotification[] = [];
      try {
        // Get current admin ID from authentication
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.id) {
          briefApprovals = await getBriefApprovalNotifications(user.id);
          setBriefApprovalNotifications(briefApprovals);
          console.log('📄 Loaded brief approval notifications for admin:', briefApprovals.length);
        }
      } catch (briefError) {
        console.error('Error loading brief approval notifications:', briefError);
      }
      
      // Generate notifications based on recent activities, mentions, and brief approvals
      generateNotificationsFromActivities(activities, mentions, briefApprovals);

    } catch (error) {
      console.error('Error loading recent activities:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Generate notifications from activities, mentions, and brief approvals
  const generateNotificationsFromActivities = (activities: AssignmentActivity[], mentions: MentionNotification[] = [], briefApprovals: BriefApprovalNotification[] = []) => {
    const generatedNotifications: NotificationItem[] = activities.map((activity, index) => ({
      id: `activity-${activity.id}`,
      type: 'assignment' as const,
      message: `Client assigned to sub-admin`,
      details: `${activity.client_email} (${activity.client_company}) assigned to ${activity.admin_email}`,
      timestamp: activity.assigned_at,
      isRead: index > 10, // Mark older items as read
      priority: 'medium' as const,
      adminId: activity.admin_id,
      clientId: activity.client_user_id,
      metadata: {
        adminEmail: activity.admin_email,
        clientEmail: activity.client_email,
        clientCompany: activity.client_company
      }
    }));

    // Convert mention notifications to notification items
    const mentionNotificationItems: NotificationItem[] = mentions.map((mention) => ({
      id: `mention-${mention.id}`,
      type: 'mention' as const,
      message: 'You were mentioned in a comment',
      details: `${mention.comment?.user?.email || 'Someone'} mentioned you: "${mention.comment?.content?.substring(0, 100)}..."`,
      timestamp: mention.created_at,
      isRead: mention.notification_sent,
      priority: 'high' as const,
      metadata: {
        commentId: mention.comment_id,
        mentionText: mention.mention_text,
        commentContent: mention.comment?.content
      }
    }));

    // Convert brief approval notifications to notification items
    const briefApprovalNotificationItems: NotificationItem[] = briefApprovals.map((brief) => ({
      id: `brief-${brief.id}`,
      type: 'brief_approved' as const,
      message: 'Content Brief Approved',
      details: `${brief.user_email} from ${brief.user_company} approved: "${brief.brief_title}"`,
      timestamp: brief.created_at,
      isRead: brief.read,
      priority: 'medium' as const,
      metadata: {
        briefId: brief.brief_id,
        userEmail: brief.user_email,
        userCompany: brief.user_company,
        briefTitle: brief.brief_title
      }
    }));

    // Add some system notifications
    const systemNotifications: NotificationItem[] = [
      {
        id: 'system-1',
        type: 'account_created',
        message: 'New sub-admin account created',
        details: 'A new sub-admin editor account was created and is ready for client assignments',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        isRead: false,
        priority: 'high',
        metadata: { systemGenerated: true }
      },
      {
        id: 'system-2',
        type: 'bulk_operation',
        message: 'Bulk assignment operation completed',
        details: 'Successfully assigned 5 clients to 2 sub-admin editors',
        timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
        isRead: true,
        priority: 'medium',
        metadata: { operationType: 'bulk_assign', count: 5 }
      }
    ];

    // Combine all notifications and sort by timestamp
    const allNotifications = [...systemNotifications, ...mentionNotificationItems, ...briefApprovalNotificationItems, ...generatedNotifications.slice(0, 20)]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    setNotifications(allNotifications);
  };

  // Filter notifications
  const filteredNotifications = notifications.filter(notification => {
    switch (filter) {
      case 'unread':
        return !notification.isRead;
      case 'assignments':
        return ['assignment', 'unassignment', 'transfer', 'bulk_operation'].includes(notification.type);
      case 'accounts':
        return ['account_created', 'account_deleted'].includes(notification.type);
      case 'mentions':
        return ['mention', 'comment'].includes(notification.type);
      case 'briefs':
        return notification.type === 'brief_approved';
      default:
        return true;
    }
  });

  // Mark notification as read
  const markAsRead = async (notificationId: string) => {
    // Handle mention notifications separately
    if (notificationId.startsWith('mention-')) {
      const mentionId = notificationId.replace('mention-', '');
      try {
        await markMentionNotificationsAsSent([mentionId]);
      } catch (error) {
        console.error('Error marking mention as read:', error);
      }
    }
    
    // Handle brief approval notifications separately
    if (notificationId.startsWith('brief-')) {
      const briefNotificationId = notificationId.replace('brief-', '');
      try {
        // Get current admin ID from authentication
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.id) {
          await markBriefApprovalNotificationsAsRead(user.id, [briefNotificationId]);
        }
      } catch (error) {
        console.error('Error marking brief notification as read:', error);
      }
    }
    
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === notificationId 
          ? { ...notification, isRead: true }
          : notification
      )
    );
  };

  // Mark all as read
  const markAllAsRead = async () => {
    // Mark mention notifications as read
    const mentionIds = notifications
      .filter(n => n.id.startsWith('mention-') && !n.isRead)
      .map(n => n.id.replace('mention-', ''));
    
    if (mentionIds.length > 0) {
      try {
        await markMentionNotificationsAsSent(mentionIds);
      } catch (error) {
        console.error('Error marking mentions as read:', error);
      }
    }
    
    // Mark brief approval notifications as read
    const briefIds = notifications
      .filter(n => n.id.startsWith('brief-') && !n.isRead)
      .map(n => n.id.replace('brief-', ''));
    
    if (briefIds.length > 0) {
      try {
        // Get current admin ID from authentication
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.id) {
          await markBriefApprovalNotificationsAsRead(user.id, briefIds);
        }
      } catch (error) {
        console.error('Error marking brief notifications as read:', error);
      }
    }
    
    setNotifications(prev => 
      prev.map(notification => ({ ...notification, isRead: true }))
    );
  };

  // Toggle notification selection
  const toggleNotificationSelection = (notificationId: string) => {
    const newSelected = new Set(selectedNotifications);
    if (newSelected.has(notificationId)) {
      newSelected.delete(notificationId);
    } else {
      newSelected.add(notificationId);
    }
    setSelectedNotifications(newSelected);
  };

  // Delete selected notifications
  const deleteSelectedNotifications = () => {
    setNotifications(prev => 
      prev.filter(notification => !selectedNotifications.has(notification.id))
    );
    setSelectedNotifications(new Set());
    toast.success(`Deleted ${selectedNotifications.size} notifications`);
  };

  // Get notification icon
  const getNotificationIcon = (type: NotificationItem['type']) => {
    switch (type) {
      case 'assignment':
        return UserPlus;
      case 'unassignment':
        return UserMinus;
      case 'transfer':
        return Shuffle;
      case 'account_created':
        return UserPlus;
      case 'account_deleted':
        return Trash2;
      case 'bulk_operation':
        return Users;
      case 'mention':
        return AtSign;
      case 'comment':
        return MessageSquare;
      case 'brief_approved':
        return CheckCircle;
      default:
        return Bell;
    }
  };

  // Get notification color
  const getNotificationColor = (priority: NotificationItem['priority'], isRead: boolean) => {
    if (isRead) return 'text-gray-400';
    
    switch (priority) {
      case 'high':
        return 'text-red-400';
      case 'medium':
        return 'text-yellow-400';
      case 'low':
        return 'text-blue-400';
      default:
        return 'text-gray-400';
    }
  };

  // Load data on component mount
  useEffect(() => {
    if (isVisible) {
      loadRecentActivities();
    }
  }, [isVisible]);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-gray-900 rounded-xl shadow-2xl border border-gray-700 max-w-4xl w-full max-h-[90vh] overflow-hidden"
          >
            {/* Header */}
            <div className="p-6 border-b border-gray-700 bg-gray-800/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/20 relative">
                    <Bell className="h-6 w-6 text-blue-400" />
                    {unreadCount > 0 && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-xs text-white font-bold">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </div>
                    )}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Assignment Notifications</h2>
                    <p className="text-sm text-gray-400">
                      {unreadCount} unread • {notifications.length} total
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {selectedNotifications.size > 0 && (
                    <button
                      onClick={deleteSelectedNotifications}
                      className="flex items-center gap-2 px-3 py-1 bg-red-500/20 text-red-400 rounded-lg text-sm hover:bg-red-500/30"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete ({selectedNotifications.size})
                    </button>
                  )}
                  <button
                    onClick={markAllAsRead}
                    className="flex items-center gap-2 px-3 py-1 bg-blue-500/20 text-blue-400 rounded-lg text-sm hover:bg-blue-500/30"
                  >
                    <CheckCircle className="h-4 w-4" />
                    Mark All Read
                  </button>
                  <button
                    onClick={onClose}
                    className="p-2 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center gap-2 mt-4">
                {[
                  { key: 'all', label: 'All', count: notifications.length },
                  { key: 'unread', label: 'Unread', count: unreadCount },
                  { key: 'assignments', label: 'Assignments', count: notifications.filter(n => ['assignment', 'unassignment', 'transfer', 'bulk_operation'].includes(n.type)).length },
                  { key: 'accounts', label: 'Accounts', count: notifications.filter(n => ['account_created', 'account_deleted'].includes(n.type)).length },
                  { key: 'mentions', label: 'Mentions', count: notifications.filter(n => ['mention', 'comment'].includes(n.type)).length },
                  { key: 'briefs', label: 'Brief Approvals', count: notifications.filter(n => n.type === 'brief_approved').length }
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setFilter(tab.key as any)}
                    className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                      filter === tab.key
                        ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                        : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                    }`}
                  >
                    {tab.label} ({tab.count})
                  </button>
                ))}
              </div>
            </div>

            {/* Content */}
            <div className="p-6 max-h-[calc(90vh-200px)] overflow-y-auto">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Bell className="h-8 w-8 animate-pulse text-blue-400" />
                </div>
              ) : filteredNotifications.length > 0 ? (
                <div className="space-y-3">
                  {filteredNotifications.map((notification) => {
                    const Icon = getNotificationIcon(notification.type);
                    const isSelected = selectedNotifications.has(notification.id);
                    
                    return (
                      <motion.div
                        key={notification.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`p-4 rounded-lg border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-blue-500/20 border-blue-500/50'
                            : notification.isRead
                            ? 'bg-gray-800/40 border-gray-700/50'
                            : 'bg-gray-800/80 border-gray-600/50 hover:bg-gray-700/60'
                        }`}
                        onClick={() => {
                          toggleNotificationSelection(notification.id);
                          if (!notification.isRead) markAsRead(notification.id);
                        }}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-lg ${
                            notification.priority === 'high' ? 'bg-red-500/20' :
                            notification.priority === 'medium' ? 'bg-yellow-500/20' :
                            'bg-blue-500/20'
                          }`}>
                            <Icon className={`h-4 w-4 ${getNotificationColor(notification.priority, notification.isRead)}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className={`font-medium ${notification.isRead ? 'text-gray-300' : 'text-white'}`}>
                                {notification.message}
                              </h4>
                              {!notification.isRead && (
                                <div className="w-2 h-2 bg-blue-400 rounded-full" />
                              )}
                            </div>
                            {notification.details && (
                              <p className={`text-sm ${notification.isRead ? 'text-gray-500' : 'text-gray-400'} mb-2`}>
                                {notification.details}
                              </p>
                            )}
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              <Clock className="h-3 w-3" />
                              {new Date(notification.timestamp).toLocaleString()}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {isSelected && (
                              <CheckCircle className="h-4 w-4 text-blue-400" />
                            )}
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                              notification.priority === 'high' ? 'bg-red-500/20 text-red-300' :
                              notification.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-300' :
                              'bg-blue-500/20 text-blue-300'
                            }`}>
                              {notification.priority}
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <Bell className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-semibold mb-2">No Notifications</h3>
                  <p>
                    {filter === 'all' ? 'No notifications found' :
                     filter === 'unread' ? 'All notifications have been read' :
                     `No ${filter} notifications found`}
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
} 