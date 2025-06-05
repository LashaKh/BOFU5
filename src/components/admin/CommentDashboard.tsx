import React, { useState, useEffect } from 'react';
import { 
  getArticleCommentAnalytics, 
  getUserEngagementMetrics, 
  getArticleCollaborationStats,
  getRealtimeCommentActivity,
  CommentAnalytics,
  UserEngagementMetrics,
  ArticleCollaborationStats
} from '../../lib/commentAnalytics';
import { 
  getUserNotifications,
  getNotificationStats,
  CommentNotification 
} from '../../lib/commentNotifications';
import { supabase } from '../../lib/supabase';

interface DashboardProps {
  articleId?: string;
}

interface DashboardStats {
  analytics?: CommentAnalytics;
  userMetrics: UserEngagementMetrics[];
  collaborationStats: ArticleCollaborationStats[];
  realtimeActivity: any;
  notifications: CommentNotification[];
  notificationStats: any;
}

const CommentDashboard: React.FC<DashboardProps> = ({ articleId }) => {
  const [stats, setStats] = useState<DashboardStats>({
    userMetrics: [],
    collaborationStats: [],
    realtimeActivity: null,
    notifications: [],
    notificationStats: null
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'analytics' | 'notifications'>('overview');
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    loadDashboardData();
    getCurrentUser();
  }, [articleId]);

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUser(user);
  };

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [
        realtimeActivity,
        collaborationStats,
        notificationStats
      ] = await Promise.all([
        getRealtimeCommentActivity(),
        getArticleCollaborationStats(),
        getNotificationStats()
      ]);

      let analytics = undefined;
      if (articleId) {
        analytics = await getArticleCommentAnalytics(articleId);
      }

      // Get user notifications if logged in
      let notifications: CommentNotification[] = [];
      if (currentUser) {
        notifications = await getUserNotifications(currentUser.id, 20);
      }

      // Get top user metrics
      const userMetrics: UserEngagementMetrics[] = [];
      // This would be populated with actual user metrics

      setStats({
        analytics,
        userMetrics,
        collaborationStats,
        realtimeActivity,
        notifications,
        notificationStats
      });
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          {articleId ? 'Article Comment Analytics' : 'Comment System Dashboard'}
        </h1>
        <p className="text-gray-600">
          Comprehensive analytics and management for the comment system
        </p>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6">
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'analytics', label: 'Analytics' },
              { id: 'notifications', label: 'Notifications' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Real-time Activity Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-sm font-bold">24h</span>
                      </div>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-blue-600">Today</p>
                      <p className="text-2xl font-bold text-blue-900">
                        {stats.realtimeActivity?.totalToday || 0}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-green-50 rounded-lg p-4">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-sm font-bold">7d</span>
                      </div>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-green-600">This Week</p>
                      <p className="text-2xl font-bold text-green-900">
                        {stats.realtimeActivity?.totalThisWeek || 0}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-yellow-50 rounded-lg p-4">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-sm font-bold">👥</span>
                      </div>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-yellow-600">Active Users</p>
                      <p className="text-2xl font-bold text-yellow-900">
                        {stats.realtimeActivity?.activeUsers || 0}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-red-50 rounded-lg p-4">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-sm font-bold">⏱️</span>
                      </div>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-red-600">Pending</p>
                      <p className="text-2xl font-bold text-red-900">
                        {stats.realtimeActivity?.pendingResolutions || 0}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Collaboration Stats */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Article Collaboration</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {stats.collaborationStats.slice(0, 6).map((article, index) => (
                    <div key={article.article_id} className="bg-white rounded-lg p-4 shadow">
                      <h4 className="font-medium text-gray-900 truncate">{article.article_title}</h4>
                      <div className="mt-2 space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Comments:</span>
                          <span className="font-medium">{article.totalComments}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Participants:</span>
                          <span className="font-medium">{article.totalParticipants}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Resolution Rate:</span>
                          <span className="font-medium">{article.resolutionRate.toFixed(1)}%</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Intensity:</span>
                          <span className={`font-medium ${
                            article.collaborationIntensity === 'high' ? 'text-red-600' :
                            article.collaborationIntensity === 'medium' ? 'text-yellow-600' : 'text-green-600'
                          }`}>
                            {article.collaborationIntensity}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'analytics' && stats.analytics && (
            <div className="space-y-6">
              {/* Analytics Overview */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white border rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Comment Status</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Active</span>
                      <span className="font-bold text-blue-600">{stats.analytics.activeComments}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Resolved</span>
                      <span className="font-bold text-green-600">{stats.analytics.resolvedComments}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Archived</span>
                      <span className="font-bold text-gray-600">{stats.analytics.archivedComments}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white border rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Engagement Metrics</h3>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Engagement Rate</span>
                        <span className="font-medium">{stats.analytics.engagementRate.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ width: `${Math.min(stats.analytics.engagementRate, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Unique Commenters</span>
                        <span className="font-medium">{stats.analytics.uniqueCommenters}</span>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Avg Resolution Time</span>
                        <span className="font-medium">{stats.analytics.averageResolutionTime.toFixed(1)}h</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white border rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Keywords</h3>
                  <div className="space-y-2">
                    {stats.analytics.topKeywords.slice(0, 5).map((keyword, index) => (
                      <div key={keyword.keyword} className="flex justify-between items-center">
                        <span className="text-sm text-gray-700 truncate">{keyword.keyword}</span>
                        <span className="text-sm font-medium text-gray-900">{keyword.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Activity Timeline */}
              <div className="bg-white border rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity (Last 7 Days)</h3>
                <div className="space-y-2">
                  {stats.analytics.activityTimeline.slice(-7).map((day, index) => (
                    <div key={day.date} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span className="text-sm text-gray-600">{new Date(day.date).toLocaleDateString()}</span>
                      <div className="flex space-x-4">
                        <span className="text-sm">Comments: <span className="font-medium text-blue-600">{day.commentCount}</span></span>
                        <span className="text-sm">Replies: <span className="font-medium text-green-600">{day.replyCount}</span></span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="space-y-6">
              {/* Notification Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white border rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Notification Statistics</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Sent</span>
                      <span className="font-medium">{stats.notificationStats?.total || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Read Rate</span>
                      <span className="font-medium">{stats.notificationStats?.readRate?.toFixed(1) || 0}%</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white border rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">By Type</h3>
                  <div className="space-y-2">
                    {Object.entries(stats.notificationStats?.byType || {}).map(([type, count]) => (
                      <div key={type} className="flex justify-between">
                        <span className="text-gray-600">{type.replace('_', ' ')}</span>
                        <span className="font-medium">{count as number}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Recent Notifications */}
              <div className="bg-white border rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Notifications</h3>
                <div className="space-y-3">
                  {stats.notifications.slice(0, 10).map((notification) => (
                    <div key={notification.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                      <div className={`w-2 h-2 rounded-full mt-2 ${
                        notification.read ? 'bg-gray-400' : 'bg-blue-500'
                      }`}></div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <h4 className="font-medium text-gray-900">{notification.title}</h4>
                          <span className="text-sm text-gray-500">
                            {new Date(notification.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-gray-600 text-sm mt-1">{notification.message}</p>
                        {notification.article_title && (
                          <p className="text-gray-500 text-xs mt-1">
                            Article: {notification.article_title}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CommentDashboard; 