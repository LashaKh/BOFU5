import React, { useState, useEffect } from 'react';
import { AdminCommentAnalytics as AnalyticsData } from '../../types/adminComment';
import { getAdminCommentAnalytics } from '../../lib/adminCommentApi';
import { PRIORITY_LEVELS, ADMIN_COMMENT_TYPES } from '../../types/adminComment';

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
      <div className="bg-white rounded-lg border p-6">
        <div className="flex items-center justify-center h-48">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading analytics...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className="bg-white rounded-lg border p-6">
        <div className="text-center text-red-600">
          <p>Error loading analytics: {error}</p>
          <button
            onClick={fetchAnalytics}
            className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
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

  return (
    <div className="bg-white rounded-lg border p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-gray-900">Comment Analytics</h3>
        <div className="flex items-center space-x-2">
          <label className="text-sm text-gray-600">Time Range:</label>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
            className="border border-gray-300 rounded px-3 py-1 text-sm"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="1y">Last year</option>
          </select>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <span className="text-2xl">💬</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-blue-600">Total Comments</p>
              <p className="text-2xl font-bold text-blue-900">{analytics.total_comments}</p>
            </div>
          </div>
        </div>

        <div className="bg-purple-50 rounded-lg p-4">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <span className="text-2xl">🛡️</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-purple-600">Admin Comments</p>
              <p className="text-2xl font-bold text-purple-900">{analytics.admin_comments}</p>
            </div>
          </div>
        </div>

        <div className="bg-green-50 rounded-lg p-4">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <span className="text-2xl">✅</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-green-600">Approval Rate</p>
              <p className="text-2xl font-bold text-green-900">{approvalRate}%</p>
            </div>
          </div>
        </div>

        <div className="bg-orange-50 rounded-lg p-4">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <span className="text-2xl">⚡</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-orange-600">High Priority</p>
              <p className="text-2xl font-bold text-orange-900">
                {analytics.priority_breakdown.high + analytics.priority_breakdown.urgent + analytics.priority_breakdown.critical}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Priority Breakdown */}
        <div className="border rounded-lg p-4">
          <h4 className="text-lg font-medium text-gray-900 mb-4">Priority Distribution</h4>
          <div className="space-y-3">
            {Object.entries(analytics.priority_breakdown).map(([priority, count]) => {
              const config = PRIORITY_LEVELS[priority as keyof typeof PRIORITY_LEVELS];
              const percentage = calculatePercentage(count, priorityTotal);
              
              return (
                <div key={priority} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span>{config.icon}</span>
                    <span className="text-sm font-medium text-gray-700">{config.label}</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${getProgressBarColor(priority)} transition-all duration-300`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-sm text-gray-600 w-12 text-right">{count}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Status Breakdown */}
        <div className="border rounded-lg p-4">
          <h4 className="text-lg font-medium text-gray-900 mb-4">Status Distribution</h4>
          <div className="space-y-3">
            {Object.entries(analytics.status_breakdown).map(([status, count]) => {
              const percentage = calculatePercentage(count, statusTotal);
              const labels = {
                active: { icon: '🟢', label: 'Active' },
                resolved: { icon: '🔵', label: 'Resolved' },
                archived: { icon: '⚫', label: 'Archived' }
              };
              const config = labels[status as keyof typeof labels];
              
              return (
                <div key={status} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span>{config.icon}</span>
                    <span className="text-sm font-medium text-gray-700">{config.label}</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${getProgressBarColor(status)} transition-all duration-300`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-sm text-gray-600 w-12 text-right">{count}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Admin Comment Types */}
      <div className="border rounded-lg p-4 mb-6">
        <h4 className="text-lg font-medium text-gray-900 mb-4">Admin Comment Types</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(analytics.admin_comment_types).map(([type, count]) => {
            const config = ADMIN_COMMENT_TYPES[type as keyof typeof ADMIN_COMMENT_TYPES];
            
            return (
              <div key={type} className={`p-3 rounded-lg ${config.bgColor}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">{config.icon}</span>
                    <span className={`text-sm font-medium ${config.color}`}>{config.label}</span>
                  </div>
                  <span className={`text-lg font-bold ${config.color}`}>{count}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Approval Workflow */}
      <div className="border rounded-lg p-4">
        <h4 className="text-lg font-medium text-gray-900 mb-4">Approval Workflow</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Object.entries(analytics.approval_breakdown).map(([status, count]) => {
            const percentage = calculatePercentage(count, approvalTotal);
            const configs = {
              pending: { icon: '⏳', label: 'Pending', color: 'text-yellow-700', bg: 'bg-yellow-50' },
              approved: { icon: '✅', label: 'Approved', color: 'text-green-700', bg: 'bg-green-50' },
              rejected: { icon: '❌', label: 'Rejected', color: 'text-red-700', bg: 'bg-red-50' }
            };
            const config = configs[status as keyof typeof configs];
            
            return (
              <div key={status} className={`p-4 rounded-lg ${config.bg}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">{config.icon}</span>
                    <span className={`text-sm font-medium ${config.color}`}>{config.label}</span>
                  </div>
                  <span className={`text-xl font-bold ${config.color}`}>{count}</span>
                </div>
                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${getProgressBarColor(status)} transition-all duration-300`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <p className={`text-xs ${config.color} mt-1`}>{percentage}% of approvals</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}; 