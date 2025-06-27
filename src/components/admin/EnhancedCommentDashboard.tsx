import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
import { 
  MessageSquare, 
  TrendingUp, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  Filter, 
  Search, 
  Plus, 
  Users, 
  BarChart3,
  Bell,
  Star,
  Activity,
  Zap,
  Shield,
  Eye,
  Calendar,
  RefreshCw,
  Settings,
  Download,
  Upload,
  Archive,
  Target,
  Sparkles,
  Layers,
  Command,
  ChevronDown,
  X,
  ArrowRight,
  Hash,
  Globe,
  Lock,
  Flame,
  Award,
  Lightbulb,
  Heart,
  ThumbsUp,
  MessageCircle,
  Flag,
  Send
} from 'lucide-react';

interface EnhancedCommentDashboardProps {
  articleId?: string;
}

// Modern Stats Card Component with glassmorphism
const ModernStatsCard = ({ 
  title, 
  value, 
  change, 
  changeType, 
  icon: Icon, 
  color = "blue",
  trend = "neutral",
  subtitle
}: {
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'increase' | 'decrease' | 'neutral';
  icon: any;
  color?: 'blue' | 'purple' | 'green' | 'orange' | 'red' | 'indigo' | 'pink';
  trend?: 'up' | 'down' | 'neutral';
  subtitle?: string;
}) => {
  const colorClasses = {
    blue: 'from-blue-500/20 to-blue-600/20 border-blue-500/30',
    purple: 'from-purple-500/20 to-purple-600/20 border-purple-500/30',
    green: 'from-green-500/20 to-green-600/20 border-green-500/30',
    orange: 'from-orange-500/20 to-orange-600/20 border-orange-500/30',
    red: 'from-red-500/20 to-red-600/20 border-red-500/30',
    indigo: 'from-indigo-500/20 to-indigo-600/20 border-indigo-500/30',
    pink: 'from-pink-500/20 to-pink-600/20 border-pink-500/30'
  };

  const iconColors = {
    blue: 'text-blue-400',
    purple: 'text-purple-400',
    green: 'text-green-400',
    orange: 'text-orange-400',
    red: 'text-red-400',
    indigo: 'text-indigo-400',
    pink: 'text-pink-400'
  };

  const changeColors = {
    increase: 'text-green-400',
    decrease: 'text-red-400',
    neutral: 'text-gray-400'
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4, scale: 1.02 }}
      transition={{ duration: 0.3 }}
      className="group relative"
    >
      <div className={`relative bg-gradient-to-br ${colorClasses[color]} backdrop-blur-xl border rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300`}>
        {/* Floating particles effect */}
        <div className="absolute inset-0 overflow-hidden rounded-2xl">
          <div className="absolute -top-4 -right-4 w-24 h-24 bg-white/5 rounded-full blur-2xl opacity-50 group-hover:opacity-70 transition-opacity"></div>
          <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-white/3 rounded-full blur-3xl opacity-30 group-hover:opacity-50 transition-opacity"></div>
        </div>
        
        <div className="relative z-10">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <div className={`p-2.5 rounded-xl bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm border border-white/10`}>
                  <Icon className={`h-5 w-5 ${iconColors[color]}`} />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-300 mb-1">{title}</h3>
                  {subtitle && (
                    <p className="text-xs text-gray-500">{subtitle}</p>
                  )}
                </div>
              </div>
              
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-white">{value}</span>
                {change && (
                  <div className="flex items-center gap-1">
                    {trend === 'up' && <TrendingUp size={14} className="text-green-400" />}
                    {trend === 'down' && <TrendingUp size={14} className="text-red-400 rotate-180" />}
                    <span className={`text-sm font-medium ${changeType ? changeColors[changeType] : 'text-gray-400'}`}>
                      {change}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// Advanced Filter Panel
const AdvancedFilterPanel = ({ 
  filters, 
  onFilterChange, 
  onClose 
}: { 
  filters: AdminCommentFilters;
  onFilterChange: (filters: Partial<AdminCommentFilters>) => void;
  onClose: () => void;
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: 300 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 300 }}
      className="fixed right-0 top-0 h-full w-96 bg-gray-900/95 backdrop-blur-xl border-l border-gray-700/50 shadow-2xl z-50"
    >
      <div className="p-6 h-full overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Filter className="h-5 w-5 text-blue-400" />
            Advanced Filters
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        <div className="space-y-6">
          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">Status</label>
            <div className="grid grid-cols-1 gap-2">
              {['active', 'resolved', 'archived'].map((status) => (
                <label key={status} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800/50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.status === status}
                    onChange={(e) => onFilterChange({ status: e.target.checked ? status as 'active' | 'resolved' | 'archived' : undefined })}
                    className="w-4 h-4 text-blue-600 rounded border-gray-500 bg-gray-700"
                  />
                  <span className="text-sm text-gray-300 capitalize">{status}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Priority Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">Priority</label>
            <div className="grid grid-cols-1 gap-2">
              {Object.entries(PRIORITY_LEVELS).map(([key, config]) => (
                <label key={key} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800/50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.priority === key}
                    onChange={(e) => onFilterChange({ priority: e.target.checked ? key as CommentPriority : undefined })}
                    className="w-4 h-4 text-blue-600 rounded border-gray-500 bg-gray-700"
                  />
                  <span className="text-sm text-gray-300">{config.icon} {config.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Date Range Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">Date Range</label>
            <div className="grid grid-cols-1 gap-2">
              {[
                { label: 'Today', value: 'today' },
                { label: 'This Week', value: 'week' },
                { label: 'This Month', value: 'month' },
                { label: 'This Quarter', value: 'quarter' }
              ].map((range) => (
                <label key={range.value} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800/50 cursor-pointer">
                  <input
                    type="radio"
                    name="dateRange"
                    value={range.value}
                    checked={filters.date_from === range.value}
                    onChange={(e) => onFilterChange({ date_from: e.target.value })}
                    className="w-4 h-4 text-blue-600 border-gray-500 bg-gray-700"
                  />
                  <span className="text-sm text-gray-300">{range.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-700">
          <button
            onClick={() => onFilterChange({})}
            className="w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
          >
            Clear All Filters
          </button>
        </div>
      </div>
    </motion.div>
  );
};

// Quick Action Button Component
const QuickActionButton = ({ 
  icon: Icon, 
  label, 
  onClick, 
  color = "gray",
  disabled = false,
  badge
}: {
  icon: any;
  label: string;
  onClick: () => void;
  color?: 'gray' | 'blue' | 'green' | 'red' | 'purple';
  disabled?: boolean;
  badge?: string;
}) => {
  const colorClasses = {
    gray: 'bg-gray-700/50 hover:bg-gray-600/50 text-gray-300',
    blue: 'bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border-blue-500/30',
    green: 'bg-green-600/20 hover:bg-green-600/30 text-green-400 border-green-500/30',  
    red: 'bg-red-600/20 hover:bg-red-600/30 text-red-400 border-red-500/30',
    purple: 'bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 border-purple-500/30'
  };

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      disabled={disabled}
      className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl border backdrop-blur-sm transition-all duration-200 ${
        disabled ? 'opacity-50 cursor-not-allowed' : colorClasses[color]
      }`}
    >
      <Icon className="h-4 w-4" />
      <span className="text-sm font-medium">{label}</span>
      {badge && (
        <span className="absolute -top-2 -right-2 px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
          {badge}
        </span>
      )}
    </motion.button>
  );
};

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
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-96">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="w-16 h-16 border-4 border-blue-500/30 border-t-blue-500 rounded-full mx-auto mb-4"
              />
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-gray-300 text-lg font-medium"
              >
                Loading admin dashboard...
              </motion.p>
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-gray-500 text-sm mt-2"
              >
                Preparing your analytics and insights
              </motion.p>
            </motion.div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-500/10 backdrop-blur-xl border border-red-500/20 rounded-2xl p-8 text-center"
          >
            <AlertTriangle className="h-16 w-16 text-red-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Something went wrong</h3>
            <p className="text-red-400 mb-6">{error}</p>
            <button
              onClick={loadDashboardData}
              className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-colors"
            >
              Try Again
            </button>
          </motion.div>
        </div>
      </div>
    );
  }

  const tabItems = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'comments', label: 'Comments', icon: MessageSquare, badge: comments.length },
    { id: 'analytics', label: 'Analytics', icon: TrendingUp },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'create', label: 'Create', icon: Plus }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto p-6 space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6"
        >
          <div>
            <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-2xl backdrop-blur-sm border border-blue-500/30">
                <MessageSquare className="h-8 w-8 text-blue-400" />
              </div>
              Admin Comment Dashboard
            </h1>
            <p className="text-gray-400 text-lg">
              Manage and monitor all comment activity across your platform
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            <QuickActionButton
              icon={RefreshCw}
              label="Refresh"
              onClick={refreshData}
              color="blue"
            />
            <QuickActionButton
              icon={Filter}
              label="Filters"
              onClick={() => setShowFilters(true)}
              color="purple"
              badge={Object.keys(filters).length > 0 ? Object.keys(filters).length.toString() : undefined}
            />
            <QuickActionButton
              icon={Download}
              label="Export"
              onClick={() => {}}
              color="green"
            />
          </div>
        </motion.div>

        {/* Tab Navigation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gray-800/60 backdrop-blur-xl rounded-2xl p-2 border border-gray-700/50"
        >
          <div className="flex items-center gap-2 overflow-x-auto">
            {tabItems.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`relative flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all duration-200 whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className="px-2 py-0.5 bg-blue-500 text-white text-xs rounded-full">
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Content Area */}
        <AnimatePresence mode="wait">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-8"
            >
              {/* Stats Grid */}
              {dashboardData && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <ModernStatsCard
                    title="Total Comments"
                    value={dashboardData.analytics.total_comments}
                    change="+12.5%"
                    changeType="increase"
                    icon={MessageSquare}
                    color="blue"
                    trend="up"
                    subtitle="All time"
                  />
                  <ModernStatsCard
                    title="Admin Comments"
                    value={dashboardData.analytics.admin_comments}
                    change="+8.3%"
                    changeType="increase"
                    icon={Shield}
                    color="purple"
                    trend="up"
                    subtitle="Staff responses"
                  />
                  <ModernStatsCard
                    title="Pending Review"
                    value={dashboardData.pending_approvals.length}
                    change="-5.2%"
                    changeType="decrease"
                    icon={Clock}
                    color="orange"
                    trend="down"
                    subtitle="Awaiting action"
                  />
                  <ModernStatsCard
                    title="High Priority"
                    value={dashboardData.high_priority_comments.length}
                    change="+15.7%"
                    changeType="increase"
                    icon={CheckCircle}
                    color="green"
                    trend="up"
                    subtitle="Needs attention"
                  />
                </div>
              )}

              {/* Recent Activity */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Recent Comments */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                  className="bg-gray-800/60 backdrop-blur-xl rounded-2xl p-6 border border-gray-700/50"
                >
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-semibold text-white flex items-center gap-2">
                      <Activity className="h-5 w-5 text-blue-400" />
                      Recent Activity
                    </h3>
                    <button className="text-sm text-blue-400 hover:text-blue-300 font-medium">
                      View All
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                    {dashboardData?.recent_comments?.slice(0, 5).map((comment, index) => (
                      <motion.div
                        key={comment.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 + index * 0.1 }}
                        className="flex items-start gap-3 p-4 rounded-xl bg-gray-700/30 hover:bg-gray-700/50 transition-colors"
                      >
                        <div className="flex-shrink-0 w-2 h-2 bg-blue-400 rounded-full mt-2"></div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white font-medium mb-1">
                            {comment.user?.email || 'Unknown User'}
                          </p>
                          <p className="text-xs text-gray-400 line-clamp-2">
                            {comment.content}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(comment.created_at).toLocaleString()}
                          </p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>

                {/* Quick Actions */}
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                  className="bg-gray-800/60 backdrop-blur-xl rounded-2xl p-6 border border-gray-700/50"
                >
                  <h3 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
                    <Zap className="h-5 w-5 text-purple-400" />
                    Quick Actions
                  </h3>
                  
                  <div className="grid grid-cols-1 gap-4">
                    {[
                      { icon: Plus, label: 'Create Comment', color: 'blue' as const },
                      { icon: Eye, label: 'Review Queue', color: 'purple' as const },
                      { icon: BarChart3, label: 'Generate Report', color: 'green' as const },
                      { icon: Archive, label: 'Archive Old', color: 'gray' as const },
                      { icon: Bell, label: 'Notification Settings', color: 'red' as const },
                      { icon: Settings, label: 'Dashboard Settings', color: 'gray' as const }
                    ].map((action, index) => (
                      <motion.button
                        key={action.label}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 + index * 0.1 }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="flex items-center gap-3 p-4 rounded-xl bg-gray-700/30 hover:bg-gray-700/50 text-gray-300 hover:text-white transition-all duration-200"
                      >
                        <action.icon className="h-5 w-5" />
                        <span className="font-medium">{action.label}</span>
                        <ArrowRight className="h-4 w-4 ml-auto opacity-50" />
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              </div>
            </motion.div>
          )}

          {/* Comments Tab */}
          {activeTab === 'comments' && (
            <motion.div
              key="comments"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              {/* Search and Filters */}
              <div className="bg-gray-800/60 backdrop-blur-xl rounded-2xl p-6 border border-gray-700/50">
                <div className="flex flex-col lg:flex-row gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search comments..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                      className="w-full pl-10 pr-4 py-3 bg-gray-700/50 border border-gray-600/50 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                    />
                  </div>
                  <button
                    onClick={handleSearch}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors flex items-center gap-2"
                  >
                    <Search className="h-4 w-4" />
                    Search
                  </button>
                </div>
              </div>

              {/* Bulk Actions */}
              {selectedCommentIds.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-blue-600/20 backdrop-blur-xl border border-blue-500/30 rounded-2xl p-4"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-white font-medium">
                      {selectedCommentIds.length} comments selected
                    </span>
                    <div className="flex items-center gap-2">
                      <BulkCommentActions
                        selectedCommentIds={selectedCommentIds}
                        onActionComplete={() => {
                          clearSelection();
                          refreshData();
                        }}
                        onClearSelection={clearSelection}
                      />
                      <button
                        onClick={clearSelection}
                        className="px-4 py-2 text-gray-300 hover:text-white rounded-lg transition-colors"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Comments List */}
              <div className="space-y-4">
                {comments.map((comment, index) => (
                  <motion.div
                    key={comment.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <AdminCommentCard
                      comment={comment}
                      onUpdate={refreshData}
                      showArticleInfo={!articleId}
                      isSelected={selectedCommentIds.includes(comment.id)}
                      onSelect={handleCommentSelection}
                    />
                  </motion.div>
                ))}
              </div>

              {comments.length === 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-16"
                >
                  <MessageCircle className="h-16 w-16 text-gray-500 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-400 mb-2">No comments found</h3>
                  <p className="text-gray-500">Try adjusting your search or filters</p>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* Analytics Tab */}
          {activeTab === 'analytics' && (
            <motion.div
              key="analytics"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <AdminCommentAnalytics refreshTrigger={refreshTrigger} />
            </motion.div>
          )}

          {/* Create Comment Tab */}
          {activeTab === 'create' && (
            <motion.div
              key="create"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="max-w-2xl mx-auto"
            >
              <div className="bg-gray-800/60 backdrop-blur-xl rounded-2xl p-8 border border-gray-700/50">
                <h3 className="text-2xl font-semibold text-white mb-6 flex items-center gap-2">
                  <Plus className="h-6 w-6 text-blue-400" />
                  Create Admin Comment
                </h3>

                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Comment Content
                    </label>
                    <textarea
                      value={newComment.content}
                      onChange={(e) => setNewComment({ ...newComment, content: e.target.value })}
                      rows={4}
                      className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600/50 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                      placeholder="Enter your comment..."
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Comment Type
                      </label>
                      <select
                        value={newComment.admin_comment_type}
                        onChange={(e) => setNewComment({ ...newComment, admin_comment_type: e.target.value as AdminCommentType })}
                        className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                      >
                        {Object.entries(ADMIN_COMMENT_TYPES).map(([key, config]) => (
                          <option key={key} value={key}>
                            {config.icon} {config.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Priority
                      </label>
                      <select
                        value={newComment.priority}
                        onChange={(e) => setNewComment({ ...newComment, priority: e.target.value as CommentPriority })}
                        className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                      >
                        {Object.entries(PRIORITY_LEVELS).map(([key, config]) => (
                          <option key={key} value={key}>
                            {config.icon} {config.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={newComment.is_admin_only}
                        onChange={(e) => setNewComment({ ...newComment, is_admin_only: e.target.checked })}
                        className="w-4 h-4 text-blue-600 rounded border-gray-500 bg-gray-700"
                      />
                      <span className="text-sm text-gray-300">Admin Only Comment</span>
                    </label>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Admin Notes (Optional)
                    </label>
                    <textarea
                      value={newComment.admin_notes}
                      onChange={(e) => setNewComment({ ...newComment, admin_notes: e.target.value })}
                      rows={2}
                      className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600/50 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                      placeholder="Internal notes..."
                    />
                  </div>

                  <div className="flex items-center gap-4 pt-4">
                    <button
                      onClick={handleCreateComment}
                      disabled={isCreatingComment || !newComment.content.trim()}
                      className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-colors"
                    >
                      {isCreatingComment ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
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
                      className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-medium transition-colors"
                    >
                      Reset
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Advanced Filter Panel */}
      <AnimatePresence>
        {showFilters && (
          <AdvancedFilterPanel
            filters={filters}
            onFilterChange={handleFilterChange}
            onClose={() => setShowFilters(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}; 