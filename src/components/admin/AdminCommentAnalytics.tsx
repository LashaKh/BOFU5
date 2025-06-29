import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AdminCommentAnalytics as AnalyticsData } from '../../types/adminComment';
import { getAdminCommentAnalytics } from '../../lib/adminCommentApi';
import { PRIORITY_LEVELS, ADMIN_COMMENT_TYPES } from '../../types/adminComment';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown,
  Calendar,
  Users,
  MessageSquare,
  Shield,
  CheckCircle,
  AlertTriangle,
  Clock,
  Target,
  Zap,
  Activity,
  Eye,
  Filter,
  Download,
  RefreshCw,
  Sparkles,
  Award,
  Flame,
  Globe,
  Heart,
  Star,
  ArrowUp,
  ArrowDown,
  Minus,
  PieChart,
  LineChart,
  BarChart,
  Layers,
  Archive,
  X
} from 'lucide-react';

interface AdminCommentAnalyticsProps {
  refreshTrigger?: number;
}

export const AdminCommentAnalytics: React.FC<AdminCommentAnalyticsProps> = ({
  refreshTrigger = 0
}) => {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');

  const getDateRange = (range: string) => {
    const now = new Date();
    const from = new Date(now);
    
    switch (range) {
      case '7d':
        from.setDate(now.getDate() - 7);
        break;
      case '30d':
        from.setDate(now.getDate() - 30);
        break;
      case '90d':
        from.setDate(now.getDate() - 90);
        break;
      case '1y':
        from.setFullYear(now.getFullYear() - 1);
        break;
    }
    
    return {
      from: from.toISOString(),
      to: now.toISOString()
    };
  };

  const fetchAnalytics = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const dateRange = getDateRange(timeRange);
      const data = await getAdminCommentAnalytics(dateRange.from, dateRange.to);
      setAnalytics(data);
    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange, refreshTrigger]);

  const calculatePercentage = (value: number, total: number) => {
    return total > 0 ? Math.round((value / total) * 100) : 0;
  };

  const getProgressBarColor = (type: string) => {
    const colors = {
      low: 'bg-gray-400',
      normal: 'bg-blue-500',
      high: 'bg-orange-500',
      urgent: 'bg-red-500',
      critical: 'bg-red-700',
      active: 'bg-green-500',
      resolved: 'bg-blue-500',
      archived: 'bg-gray-500',
      pending: 'bg-yellow-500',
      approved: 'bg-green-500',
      rejected: 'bg-red-500'
    };
    return colors[type as keyof typeof colors] || 'bg-gray-400';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl"></div>
        </div>
        <div className="relative z-10 flex items-center justify-center min-h-screen">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="w-20 h-20 border-4 border-blue-500/30 border-t-blue-500 rounded-full mx-auto mb-6"
            />
            <motion.h3
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-2xl font-semibold text-white mb-2"
            >
              Loading Analytics Dashboard
            </motion.h3>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-gray-400"
            >
              Preparing stunning insights and visualizations...
            </motion.p>
          </motion.div>
        </div>
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-red-500/10 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl"></div>
        </div>
        <div className="relative z-10 flex items-center justify-center min-h-screen p-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-500/10 backdrop-blur-xl border border-red-500/20 rounded-3xl p-12 text-center max-w-md"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6"
            >
              <AlertTriangle className="h-8 w-8 text-red-400" />
            </motion.div>
            <h3 className="text-2xl font-semibold text-white mb-4">Analytics Error</h3>
            <p className="text-red-400 mb-8">{error}</p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={fetchAnalytics}
              className="px-8 py-4 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-colors flex items-center gap-2 mx-auto"
            >
              <RefreshCw className="h-4 w-4" />
              Try Again
            </motion.button>
          </motion.div>
        </div>
      </div>
    );
  }

  const approvalRate = analytics.approval_breakdown.approved + analytics.approval_breakdown.rejected > 0
    ? Math.round((analytics.approval_breakdown.approved / 
        (analytics.approval_breakdown.approved + analytics.approval_breakdown.rejected)) * 100)
    : 0;

  const priorityTotal = Object.values(analytics.priority_breakdown).reduce((sum, val) => sum + val, 0);
  const statusTotal = Object.values(analytics.status_breakdown).reduce((sum, val) => sum + val, 0);
  const approvalTotal = Object.values(analytics.approval_breakdown).reduce((sum, val) => sum + val, 0);

  const timeRangeLabels = {
    '7d': 'Last 7 days',
    '30d': 'Last 30 days', 
    '90d': 'Last 90 days',
    '1y': 'Last year'
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 p-6 space-y-8">
        {/* Stunning Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6"
        >
          <div>
            <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-2xl backdrop-blur-sm border border-blue-500/30">
                <BarChart3 className="h-8 w-8 text-blue-400" />
              </div>
              Analytics Dashboard
            </h1>
            <p className="text-gray-400 text-lg">
              Deep insights into comment patterns, user engagement, and moderation metrics
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Time Range Selector */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="flex items-center gap-3 bg-gray-800/60 backdrop-blur-xl rounded-2xl p-4 border border-gray-700/50"
            >
              <Calendar className="h-5 w-5 text-blue-400" />
              <div className="flex items-center gap-2">
                <span className="text-gray-300 text-sm font-medium">Period:</span>
                <select
                  value={timeRange}
                  onChange={(e) => setTimeRange(e.target.value as any)}
                  className="bg-gray-700/50 border border-gray-600/50 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                >
                  {Object.entries(timeRangeLabels).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
            </motion.div>

            {/* Action Buttons */}
            <motion.button
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={fetchAnalytics}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 rounded-xl font-medium transition-all duration-200 backdrop-blur-sm border border-blue-500/30"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </motion.button>
            
            <motion.button
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-2 px-6 py-3 bg-green-600/20 hover:bg-green-600/30 text-green-400 rounded-xl font-medium transition-all duration-200 backdrop-blur-sm border border-green-500/30"
            >
              <Download className="h-4 w-4" />
              Export
            </motion.button>
          </div>
        </motion.div>

        {/* Stunning Metrics Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {/* Total Comments Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            whileHover={{ y: -4, scale: 1.02 }}
            className="group relative"
          >
            <div className="relative bg-gradient-to-br from-blue-500/20 to-blue-600/20 backdrop-blur-xl border border-blue-500/30 rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300">
              <div className="absolute inset-0 overflow-hidden rounded-2xl">
                <div className="absolute -top-4 -right-4 w-24 h-24 bg-white/5 rounded-full blur-2xl opacity-50 group-hover:opacity-70 transition-opacity"></div>
              </div>
              <div className="relative z-10">
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm border border-white/10 rounded-xl">
                    <MessageSquare className="h-6 w-6 text-blue-400" />
                  </div>
                  <div className="flex items-center gap-1 px-2 py-1 bg-blue-500/20 rounded-lg">
                    <TrendingUp className="h-3 w-3 text-blue-400" />
                    <span className="text-xs text-blue-400 font-medium">+12%</span>
                  </div>
                </div>
                <h3 className="text-sm font-medium text-gray-300 mb-2">Total Comments</h3>
                <p className="text-3xl font-bold text-white mb-1">{analytics.total_comments}</p>
                <p className="text-xs text-gray-500">All time activity</p>
              </div>
            </div>
          </motion.div>

          {/* Admin Comments Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            whileHover={{ y: -4, scale: 1.02 }}
            className="group relative"
          >
            <div className="relative bg-gradient-to-br from-purple-500/20 to-purple-600/20 backdrop-blur-xl border border-purple-500/30 rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300">
              <div className="absolute inset-0 overflow-hidden rounded-2xl">
                <div className="absolute -top-4 -right-4 w-24 h-24 bg-white/5 rounded-full blur-2xl opacity-50 group-hover:opacity-70 transition-opacity"></div>
              </div>
              <div className="relative z-10">
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm border border-white/10 rounded-xl">
                    <Shield className="h-6 w-6 text-purple-400" />
                  </div>
                  <div className="flex items-center gap-1 px-2 py-1 bg-purple-500/20 rounded-lg">
                    <TrendingUp className="h-3 w-3 text-purple-400" />
                    <span className="text-xs text-purple-400 font-medium">+8%</span>
                  </div>
                </div>
                <h3 className="text-sm font-medium text-gray-300 mb-2">Admin Responses</h3>
                <p className="text-3xl font-bold text-white mb-1">{analytics.admin_comments}</p>
                <p className="text-xs text-gray-500">Staff engagement</p>
              </div>
            </div>
          </motion.div>

          {/* Approval Rate Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            whileHover={{ y: -4, scale: 1.02 }}
            className="group relative"
          >
            <div className="relative bg-gradient-to-br from-green-500/20 to-green-600/20 backdrop-blur-xl border border-green-500/30 rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300">
              <div className="absolute inset-0 overflow-hidden rounded-2xl">
                <div className="absolute -top-4 -right-4 w-24 h-24 bg-white/5 rounded-full blur-2xl opacity-50 group-hover:opacity-70 transition-opacity"></div>
              </div>
              <div className="relative z-10">
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm border border-white/10 rounded-xl">
                    <CheckCircle className="h-6 w-6 text-green-400" />
                  </div>
                  <div className="flex items-center gap-1 px-2 py-1 bg-green-500/20 rounded-lg">
                    <TrendingDown className="h-3 w-3 text-green-400" />
                    <span className="text-xs text-green-400 font-medium">-2%</span>
                  </div>
                </div>
                <h3 className="text-sm font-medium text-gray-300 mb-2">Approval Rate</h3>
                <p className="text-3xl font-bold text-white mb-1">{approvalRate}%</p>
                <p className="text-xs text-gray-500">Moderation success</p>
              </div>
            </div>
          </motion.div>

          {/* High Priority Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
            whileHover={{ y: -4, scale: 1.02 }}
            className="group relative"
          >
            <div className="relative bg-gradient-to-br from-orange-500/20 to-red-500/20 backdrop-blur-xl border border-orange-500/30 rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300">
              <div className="absolute inset-0 overflow-hidden rounded-2xl">
                <div className="absolute -top-4 -right-4 w-24 h-24 bg-white/5 rounded-full blur-2xl opacity-50 group-hover:opacity-70 transition-opacity"></div>
              </div>
              <div className="relative z-10">
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm border border-white/10 rounded-xl">
                    <AlertTriangle className="h-6 w-6 text-orange-400" />
                  </div>
                  <div className="flex items-center gap-1 px-2 py-1 bg-orange-500/20 rounded-lg">
                    <TrendingUp className="h-3 w-3 text-orange-400" />
                    <span className="text-xs text-orange-400 font-medium">+15%</span>
                  </div>
                </div>
                <h3 className="text-sm font-medium text-gray-300 mb-2">High Priority</h3>
                <p className="text-3xl font-bold text-white mb-1">
                  {analytics.priority_breakdown.high + analytics.priority_breakdown.urgent + analytics.priority_breakdown.critical}
                </p>
                <p className="text-xs text-gray-500">Needs attention</p>
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* Stunning Charts Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.0 }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-8"
        >
          {/* Priority Distribution Chart */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="group relative bg-gradient-to-br from-gray-800/90 via-gray-800/70 to-gray-800/90 backdrop-blur-xl rounded-3xl p-8 border border-gray-700/50 shadow-2xl hover:shadow-3xl transition-all duration-500"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-blue-500/10 rounded-3xl blur opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-xl">
                    <BarChart className="h-6 w-6 text-blue-400" />
                  </div>
                  <div>
                    <h4 className="text-xl font-semibold text-white">Priority Distribution</h4>
                    <p className="text-sm text-gray-400">Comment priority analysis</p>
                  </div>
                </div>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  className="p-2 bg-gray-700/50 hover:bg-gray-600/50 rounded-lg transition-colors"
                >
                  <PieChart className="h-4 w-4 text-gray-400" />
                </motion.button>
              </div>
              
              <div className="space-y-6">
                {Object.entries(analytics.priority_breakdown).map(([priority, count], index) => {
                  const config = PRIORITY_LEVELS[priority as keyof typeof PRIORITY_LEVELS];
                  const percentage = calculatePercentage(count, priorityTotal);
                  
                  return (
                    <motion.div
                      key={priority}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 1.2 + index * 0.1 }}
                      className="group/item relative"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-700/50 rounded-lg">
                            <span className="text-lg">{config.icon}</span>
                            <span className="text-sm font-medium text-gray-300">{config.label}</span>
                          </div>
                          <span className="text-sm text-gray-500">{percentage}%</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-bold text-white">{count}</span>
                          <div className="flex items-center gap-1 text-gray-400">
                            {percentage > 15 ? <ArrowUp className="h-3 w-3 text-green-400" /> : 
                             percentage < 5 ? <ArrowDown className="h-3 w-3 text-red-400" /> : 
                             <Minus className="h-3 w-3" />}
                          </div>
                        </div>
                      </div>
                      
                      <div className="relative h-3 bg-gray-700/50 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${percentage}%` }}
                          transition={{ delay: 1.4 + index * 0.1, duration: 0.8, ease: "easeOut" }}
                          className={`h-full bg-gradient-to-r ${
                            priority === 'critical' ? 'from-red-500 to-red-600' :
                            priority === 'urgent' ? 'from-orange-500 to-red-500' :
                            priority === 'high' ? 'from-yellow-500 to-orange-500' :
                            priority === 'normal' ? 'from-blue-500 to-blue-600' :
                            'from-gray-500 to-gray-600'
                          } rounded-full relative`}
                        >
                          <div className="absolute inset-0 bg-white/20 rounded-full animate-pulse"></div>
                        </motion.div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </motion.div>

          {/* Status Distribution Chart */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="group relative bg-gradient-to-br from-gray-800/90 via-gray-800/70 to-gray-800/90 backdrop-blur-xl rounded-3xl p-8 border border-gray-700/50 shadow-2xl hover:shadow-3xl transition-all duration-500"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-green-500/10 via-blue-500/10 to-green-500/10 rounded-3xl blur opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-green-500/20 to-blue-500/20 rounded-xl">
                    <Activity className="h-6 w-6 text-green-400" />
                  </div>
                  <div>
                    <h4 className="text-xl font-semibold text-white">Status Distribution</h4>
                    <p className="text-sm text-gray-400">Comment lifecycle stages</p>
                  </div>
                </div>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  className="p-2 bg-gray-700/50 hover:bg-gray-600/50 rounded-lg transition-colors"
                >
                  <LineChart className="h-4 w-4 text-gray-400" />
                </motion.button>
              </div>
              
              <div className="space-y-6">
                {Object.entries(analytics.status_breakdown).map(([status, count], index) => {
                  const percentage = calculatePercentage(count, statusTotal);
                  const statusConfigs = {
                    active: { icon: Activity, label: 'Active', colors: 'from-green-500 to-green-600', bg: 'bg-green-500/20' },
                    resolved: { icon: CheckCircle, label: 'Resolved', colors: 'from-blue-500 to-blue-600', bg: 'bg-blue-500/20' },
                    archived: { icon: Archive, label: 'Archived', colors: 'from-gray-500 to-gray-600', bg: 'bg-gray-500/20' }
                  };
                  const config = statusConfigs[status as keyof typeof statusConfigs];
                  
                  return (
                    <motion.div
                      key={status}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 1.2 + index * 0.1 }}
                      className="group/item relative"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className={`flex items-center gap-2 px-3 py-1.5 ${config.bg} rounded-lg border border-gray-600/30`}>
                            <config.icon className="h-4 w-4 text-gray-300" />
                            <span className="text-sm font-medium text-gray-300">{config.label}</span>
                          </div>
                          <span className="text-sm text-gray-500">{percentage}%</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-bold text-white">{count}</span>
                          <div className="flex items-center gap-1 text-gray-400">
                            {percentage > 50 ? <TrendingUp className="h-3 w-3 text-green-400" /> : 
                             percentage < 20 ? <TrendingDown className="h-3 w-3 text-red-400" /> : 
                             <Minus className="h-3 w-3" />}
                          </div>
                        </div>
                      </div>
                      
                      <div className="relative h-3 bg-gray-700/50 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${percentage}%` }}
                          transition={{ delay: 1.4 + index * 0.1, duration: 0.8, ease: "easeOut" }}
                          className={`h-full bg-gradient-to-r ${config.colors} rounded-full relative`}
                        >
                          <div className="absolute inset-0 bg-white/20 rounded-full animate-pulse"></div>
                        </motion.div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* Admin Comment Types Grid */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2 }}
          className="bg-gradient-to-br from-gray-800/90 via-gray-800/70 to-gray-800/90 backdrop-blur-xl rounded-3xl p-8 border border-gray-700/50 shadow-2xl"
        >
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl">
                <Users className="h-6 w-6 text-purple-400" />
              </div>
              <div>
                <h4 className="text-xl font-semibold text-white">Admin Comment Types</h4>
                <p className="text-sm text-gray-400">Staff interaction categories</p>
              </div>
            </div>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="p-2 bg-gray-700/50 hover:bg-gray-600/50 rounded-lg transition-colors"
            >
              <Layers className="h-4 w-4 text-gray-400" />
            </motion.button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Object.entries(analytics.admin_comment_types).map(([type, count], index) => {
              const config = ADMIN_COMMENT_TYPES[type as keyof typeof ADMIN_COMMENT_TYPES];
              
              return (
                <motion.div
                  key={type}
                  initial={{ opacity: 0, y: 20, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ delay: 1.4 + index * 0.1, type: "spring", stiffness: 100 }}
                  whileHover={{ y: -4, scale: 1.05 }}
                  className={`group relative p-6 rounded-2xl backdrop-blur-sm border transition-all duration-300 ${config.bgColor} hover:shadow-xl`}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-white/0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/10 backdrop-blur-sm rounded-lg">
                          <span className="text-xl">{config.icon}</span>
                        </div>
                        <div>
                          <span className={`text-sm font-medium ${config.color}`}>{config.label}</span>
                          <p className="text-xs text-gray-500 mt-0.5">Comments</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-end justify-between">
                      <span className={`text-3xl font-bold ${config.color}`}>{count}</span>
                      <div className="flex items-center gap-1">
                        <TrendingUp className={`h-4 w-4 ${config.color} opacity-70`} />
                        <span className={`text-sm ${config.color} opacity-70`}>Active</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Approval Workflow Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.4 }}
          className="bg-gradient-to-br from-gray-800/90 via-gray-800/70 to-gray-800/90 backdrop-blur-xl rounded-3xl p-8 border border-gray-700/50 shadow-2xl"
        >
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-xl">
                <Target className="h-6 w-6 text-green-400" />
              </div>
              <div>
                <h4 className="text-xl font-semibold text-white">Approval Workflow</h4>
                <p className="text-sm text-gray-400">Moderation pipeline metrics</p>
              </div>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-green-500/20 rounded-xl border border-green-500/30">
              <Award className="h-4 w-4 text-green-400" />
              <span className="text-green-400 font-medium">{approvalRate}% Success</span>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {Object.entries(analytics.approval_breakdown).map(([status, count], index) => {
              const percentage = calculatePercentage(count, approvalTotal);
              const configs = {
                pending: { 
                  icon: Clock, 
                  label: 'Pending Review', 
                  color: 'text-yellow-400', 
                  bg: 'bg-yellow-500/20',
                  gradient: 'from-yellow-500 to-orange-500',
                  border: 'border-yellow-500/30'
                },
                approved: { 
                  icon: CheckCircle, 
                  label: 'Approved', 
                  color: 'text-green-400', 
                  bg: 'bg-green-500/20',
                  gradient: 'from-green-500 to-emerald-500',
                  border: 'border-green-500/30'
                },
                rejected: { 
                  icon: X, 
                  label: 'Rejected', 
                  color: 'text-red-400', 
                  bg: 'bg-red-500/20',
                  gradient: 'from-red-500 to-pink-500',
                  border: 'border-red-500/30'
                }
              };
              const config = configs[status as keyof typeof configs];
              
              return (
                <motion.div
                  key={status}
                  initial={{ opacity: 0, y: 20, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ delay: 1.6 + index * 0.1, type: "spring", stiffness: 100 }}
                  whileHover={{ y: -4, scale: 1.05 }}
                  className={`group relative p-6 rounded-2xl backdrop-blur-sm border ${config.bg} ${config.border} hover:shadow-2xl transition-all duration-300`}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-white/0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/10 backdrop-blur-sm rounded-lg">
                          <config.icon className={`h-5 w-5 ${config.color}`} />
                        </div>
                        <div>
                          <span className={`text-sm font-medium ${config.color}`}>{config.label}</span>
                          <p className="text-xs text-gray-500 mt-0.5">{percentage}% of total</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mb-4">
                      <span className={`text-4xl font-bold ${config.color}`}>{count}</span>
                      <p className="text-xs text-gray-500 mt-1">Comments processed</p>
                    </div>
                    
                    <div className="relative h-2 bg-gray-700/50 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        transition={{ delay: 1.8 + index * 0.1, duration: 1, ease: "easeOut" }}
                        className={`h-full bg-gradient-to-r ${config.gradient} rounded-full relative`}
                      >
                        <div className="absolute inset-0 bg-white/30 rounded-full animate-pulse"></div>
                      </motion.div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </div>
  );
}; 