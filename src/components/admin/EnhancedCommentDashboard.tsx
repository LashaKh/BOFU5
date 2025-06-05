import React, { useState, useEffect } from 'react';
import { AdminCommentCard } from './AdminCommentCard';
import { BulkCommentActions } from './BulkCommentActions';
import { AdminCommentAnalytics } from './AdminCommentAnalytics';
import { 
  AdminArticleComment, 
  AdminCommentNotification, 
  AdminCommentDashboardData,
  AdminCommentFilters,
  AdminCommentType,
  CommentPriority 
} from '../../types/adminComment';
import { 
  getAdminCommentDashboardData, 
  getAdminArticleComments,
  searchComments,
  getAdminNotifications,
  markNotificationAsRead,
  createAdminComment
} from '../../lib/adminCommentApi';
import { PRIORITY_LEVELS, ADMIN_COMMENT_TYPES } from '../../types/adminComment';

interface EnhancedCommentDashboardProps {
  articleId?: string;
}

export const EnhancedCommentDashboard: React.FC<EnhancedCommentDashboardProps> = ({
  articleId
}) => {
  // State management
  const [dashboardData, setDashboardData] = useState<AdminCommentDashboardData | null>(null);
  const [comments, setComments] = useState<AdminArticleComment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'comments' | 'analytics' | 'notifications' | 'create'>('overview');
  
  // Filters and search
  const [filters, setFilters] = useState<AdminCommentFilters>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  
  // Bulk operations
  const [selectedCommentIds, setSelectedCommentIds] = useState<string[]>([]);
  
  // Comment creation
  const [isCreatingComment, setIsCreatingComment] = useState(false);
  const [newComment, setNewComment] = useState({
    content: '',
    admin_comment_type: 'admin_note' as AdminCommentType,
    priority: 'normal' as CommentPriority,
    is_admin_only: false,
    admin_notes: ''
  });

  // Data refresh trigger
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const refreshData = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const loadDashboardData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      if (articleId) {
        // Load specific article comments
        const [articleComments, dashboard] = await Promise.all([
          getAdminArticleComments(articleId, filters),
          getAdminCommentDashboardData()
        ]);
        setComments(articleComments);
        setDashboardData(dashboard);
      } else {
        // Load general dashboard data
        const dashboard = await getAdminCommentDashboardData();
        setDashboardData(dashboard);
        setComments(dashboard.recent_comments);
      }
    } catch (err) {
      console.error('Error loading dashboard data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      await loadDashboardData();
      return;
    }

    try {
      const searchResults = await searchComments(searchQuery, filters);
      setComments(searchResults);
    } catch (err) {
      console.error('Error searching comments:', err);
      setError('Failed to search comments');
    }
  };

  const handleFilterChange = (newFilters: Partial<AdminCommentFilters>) => {
    const updatedFilters = { ...filters, ...newFilters };
    setFilters(updatedFilters);
  };

  const handleCommentSelection = (commentId: string, selected: boolean) => {
    setSelectedCommentIds(prev => 
      selected 
        ? [...prev, commentId]
        : prev.filter(id => id !== commentId)
    );
  };

  const selectAllComments = () => {
    setSelectedCommentIds(comments.map(c => c.id));
  };

  const clearSelection = () => {
    setSelectedCommentIds([]);
  };

  const handleNotificationRead = async (notificationId: string) => {
    try {
      await markNotificationAsRead(notificationId);
      refreshData();
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  const handleCreateComment = async () => {
    if (!articleId || !newComment.content.trim()) {
      alert('Please provide article ID and comment content');
      return;
    }

    setIsCreatingComment(true);
    try {
      await createAdminComment({
        article_id: articleId,
        content: newComment.content,
        admin_comment_type: newComment.admin_comment_type,
        priority: newComment.priority,
        is_admin_only: newComment.is_admin_only,
        admin_notes: newComment.admin_notes || undefined
      });

      // Reset form
      setNewComment({
        content: '',
        admin_comment_type: 'admin_note',
        priority: 'normal',
        is_admin_only: false,
        admin_notes: ''
      });

      setActiveTab('comments');
      refreshData();
    } catch (err) {
      console.error('Error creating admin comment:', err);
      alert('Failed to create admin comment');
    } finally {
      setIsCreatingComment(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [articleId, filters, refreshTrigger]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <p className="text-red-600">Error: {error}</p>
        <button
          onClick={loadDashboardData}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {articleId ? 'Article Admin Dashboard' : 'Admin Comment Dashboard'}
            </h1>
            <p className="text-gray-600 mt-1">
              Comprehensive admin tools for comment management and analytics
            </p>
          </div>
          
          {dashboardData && (
            <div className="flex items-center space-x-4">
              <div className="text-center">
                <p className="text-sm text-gray-600">Unread Notifications</p>
                <p className="text-2xl font-bold text-red-600">{dashboardData.unread_notification_count}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600">Pending Approvals</p>
                <p className="text-2xl font-bold text-yellow-600">{dashboardData.pending_approvals.length}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600">High Priority</p>
                <p className="text-2xl font-bold text-orange-600">{dashboardData.high_priority_comments.length}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6">
            {[
              { id: 'overview', label: 'Overview', icon: '📊' },
              { id: 'comments', label: 'Comments', icon: '💬' },
              { id: 'analytics', label: 'Analytics', icon: '📈' },
              { id: 'notifications', label: 'Notifications', icon: '🔔' },
              ...(articleId ? [{ id: 'create', label: 'Create Comment', icon: '✍️' }] : [])
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && dashboardData && (
            <div className="space-y-6">
              {/* Quick Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="flex items-center">
                    <span className="text-2xl mr-3">💬</span>
                    <div>
                      <p className="text-sm font-medium text-blue-600">Total Comments</p>
                      <p className="text-2xl font-bold text-blue-900">{dashboardData.analytics.total_comments}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-purple-50 rounded-lg p-4">
                  <div className="flex items-center">
                    <span className="text-2xl mr-3">🛡️</span>
                    <div>
                      <p className="text-sm font-medium text-purple-600">Admin Comments</p>
                      <p className="text-2xl font-bold text-purple-900">{dashboardData.analytics.admin_comments}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-yellow-50 rounded-lg p-4">
                  <div className="flex items-center">
                    <span className="text-2xl mr-3">⏳</span>
                    <div>
                      <p className="text-sm font-medium text-yellow-600">Pending Approval</p>
                      <p className="text-2xl font-bold text-yellow-900">{dashboardData.pending_approvals.length}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-orange-50 rounded-lg p-4">
                  <div className="flex items-center">
                    <span className="text-2xl mr-3">⚡</span>
                    <div>
                      <p className="text-sm font-medium text-orange-600">High Priority</p>
                      <p className="text-2xl font-bold text-orange-900">{dashboardData.high_priority_comments.length}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Comments</h3>
                  <div className="space-y-3">
                    {dashboardData.recent_comments.slice(0, 5).map((comment) => (
                      <div key={comment.id} className="bg-white rounded p-3 shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-900">
                            {comment.user?.email || 'Unknown User'}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(comment.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 line-clamp-2">{comment.content}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Pending Approvals</h3>
                  <div className="space-y-3">
                    {dashboardData.pending_approvals.slice(0, 5).map((comment) => (
                      <div key={comment.id} className="bg-white rounded p-3 shadow-sm border-l-4 border-yellow-400">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-900">
                            {comment.user?.email || 'Unknown User'}
                          </span>
                          <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full">
                            Pending
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 line-clamp-2">{comment.content}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Comments Tab */}
          {activeTab === 'comments' && (
            <div className="space-y-6">
              {/* Search and Filters */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center space-x-4 mb-4">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search comments..."
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                      onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    />
                  </div>
                  <button
                    onClick={handleSearch}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Search
                  </button>
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                  >
                    🔍 Filters
                  </button>
                </div>

                {showFilters && (
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-white rounded border">
                    <select
                      value={filters.priority || ''}
                      onChange={(e) => handleFilterChange({ priority: e.target.value as CommentPriority || undefined })}
                      className="border border-gray-300 rounded px-3 py-2"
                    >
                      <option value="">All Priorities</option>
                      {Object.entries(PRIORITY_LEVELS).map(([value, config]) => (
                        <option key={value} value={value}>
                          {config.icon} {config.label}
                        </option>
                      ))}
                    </select>

                    <select
                      value={filters.admin_comment_type || ''}
                      onChange={(e) => handleFilterChange({ admin_comment_type: e.target.value as AdminCommentType || undefined })}
                      className="border border-gray-300 rounded px-3 py-2"
                    >
                      <option value="">All Types</option>
                      {Object.entries(ADMIN_COMMENT_TYPES).map(([value, config]) => (
                        <option key={value} value={value}>
                          {config.icon} {config.label}
                        </option>
                      ))}
                    </select>

                    <select
                      value={filters.status || ''}
                      onChange={(e) => handleFilterChange({ status: e.target.value as any || undefined })}
                      className="border border-gray-300 rounded px-3 py-2"
                    >
                      <option value="">All Statuses</option>
                      <option value="active">🟢 Active</option>
                      <option value="resolved">🔵 Resolved</option>
                      <option value="archived">⚫ Archived</option>
                    </select>

                    <div className="flex space-x-2">
                      <button
                        onClick={() => {
                          setFilters({});
                          setSearchQuery('');
                          refreshData();
                        }}
                        className="px-3 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                      >
                        Clear
                      </button>
                      <button
                        onClick={refreshData}
                        className="px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Bulk Actions */}
              <BulkCommentActions
                selectedCommentIds={selectedCommentIds}
                onActionComplete={refreshData}
                onClearSelection={clearSelection}
              />

              {/* Selection Controls */}
              {comments.length > 0 && (
                <div className="flex items-center justify-between bg-gray-50 rounded p-3">
                  <div className="flex items-center space-x-4">
                    <button
                      onClick={selectAllComments}
                      className="text-sm text-blue-600 hover:text-blue-700"
                    >
                      Select All ({comments.length})
                    </button>
                    {selectedCommentIds.length > 0 && (
                      <span className="text-sm text-gray-600">
                        {selectedCommentIds.length} selected
                      </span>
                    )}
                  </div>
                  <button
                    onClick={refreshData}
                    className="text-sm text-gray-600 hover:text-gray-700"
                  >
                    🔄 Refresh
                  </button>
                </div>
              )}

              {/* Comments List */}
              <div className="space-y-4">
                {comments.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <p>No comments found.</p>
                  </div>
                ) : (
                  comments.map((comment) => (
                    <AdminCommentCard
                      key={comment.id}
                      comment={comment}
                      onUpdate={refreshData}
                      showArticleInfo={!articleId}
                      isSelected={selectedCommentIds.includes(comment.id)}
                      onSelect={handleCommentSelection}
                    />
                  ))
                )}
              </div>
            </div>
          )}

          {/* Analytics Tab */}
          {activeTab === 'analytics' && (
            <AdminCommentAnalytics refreshTrigger={refreshTrigger} />
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && dashboardData && (
            <div className="space-y-6">
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Admin Notifications</h3>
                <div className="space-y-3">
                  {dashboardData.notifications.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <p>No notifications available.</p>
                    </div>
                  ) : (
                    dashboardData.notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={`p-4 rounded-lg border ${
                          notification.is_read ? 'bg-white border-gray-200' : 'bg-blue-50 border-blue-200'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              {!notification.is_read && (
                                <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                              )}
                              <span className="font-medium text-gray-900">
                                {notification.notification_type.replace('_', ' ')}
                              </span>
                              <span className="text-sm text-gray-500">
                                {new Date(notification.created_at).toLocaleDateString()}
                              </span>
                            </div>
                            <p className="text-gray-700">{notification.message}</p>
                          </div>
                          {!notification.is_read && (
                            <button
                              onClick={() => handleNotificationRead(notification.id)}
                              className="text-sm text-blue-600 hover:text-blue-700"
                            >
                              Mark as read
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Create Comment Tab */}
          {activeTab === 'create' && articleId && (
            <div className="space-y-6">
              <div className="bg-white border rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Create Admin Comment</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Comment Content
                    </label>
                    <textarea
                      value={newComment.content}
                      onChange={(e) => setNewComment({ ...newComment, content: e.target.value })}
                      placeholder="Enter your admin comment..."
                      rows={4}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Comment Type
                      </label>
                      <select
                        value={newComment.admin_comment_type}
                        onChange={(e) => setNewComment({ ...newComment, admin_comment_type: e.target.value as AdminCommentType })}
                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                      >
                        {Object.entries(ADMIN_COMMENT_TYPES).map(([value, config]) => (
                          <option key={value} value={value}>
                            {config.icon} {config.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Priority
                      </label>
                      <select
                        value={newComment.priority}
                        onChange={(e) => setNewComment({ ...newComment, priority: e.target.value as CommentPriority })}
                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                      >
                        {Object.entries(PRIORITY_LEVELS).map(([value, config]) => (
                          <option key={value} value={value}>
                            {config.icon} {config.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Admin Notes (Optional)
                    </label>
                    <textarea
                      value={newComment.admin_notes}
                      onChange={(e) => setNewComment({ ...newComment, admin_notes: e.target.value })}
                      placeholder="Internal notes for this comment..."
                      rows={2}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={newComment.is_admin_only}
                      onChange={(e) => setNewComment({ ...newComment, is_admin_only: e.target.checked })}
                      className="h-4 w-4 text-blue-600 rounded border-gray-300"
                    />
                    <label className="ml-2 text-sm text-gray-700">
                      Admin Only (visible only to admins)
                    </label>
                  </div>

                  <div className="flex space-x-3">
                    <button
                      onClick={handleCreateComment}
                      disabled={isCreatingComment || !newComment.content.trim()}
                      className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                    >
                      {isCreatingComment ? 'Creating...' : 'Create Comment'}
                    </button>
                    <button
                      onClick={() => setNewComment({
                        content: '',
                        admin_comment_type: 'admin_note',
                        priority: 'normal',
                        is_admin_only: false,
                        admin_notes: ''
                      })}
                      className="px-6 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}; 