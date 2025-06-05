import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Clock, 
  Activity, 
  Download, 
  RefreshCw, 
  Calendar,
  Target,
  Zap,
  Eye,
  EyeOff,
  Filter,
  PieChart,
  GitBranch
} from 'lucide-react';
import { editAttributionService, CollaborationMetrics } from '../../lib/editAttribution';
import { cn } from '../../lib/utils';

interface CollaborationDashboardProps {
  articleId: string;
  className?: string;
  refreshInterval?: number; // in milliseconds
  showExportOptions?: boolean;
  compact?: boolean;
}

interface TimeRangeOption {
  value: number; // hours
  label: string;
  shortLabel: string;
}

interface MetricCard {
  title: string;
  value: string | number;
  change?: number; // percentage change
  icon: React.ComponentType<any>;
  color: string;
  bgColor: string;
}

export const CollaborationDashboard: React.FC<CollaborationDashboardProps> = ({
  articleId,
  className = '',
  refreshInterval = 30000, // 30 seconds
  showExportOptions = true,
  compact = false,
}) => {
  const [metrics, setMetrics] = useState<CollaborationMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTimeRange, setSelectedTimeRange] = useState<number>(24); // 24 hours
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Time range options
  const timeRangeOptions: TimeRangeOption[] = [
    { value: 1, label: 'Last Hour', shortLabel: '1H' },
    { value: 6, label: 'Last 6 Hours', shortLabel: '6H' },
    { value: 24, label: 'Last 24 Hours', shortLabel: '1D' },
    { value: 168, label: 'Last Week', shortLabel: '1W' },
    { value: 720, label: 'Last Month', shortLabel: '1M' },
  ];

  // Fetch collaboration metrics
  const fetchMetrics = useCallback(async () => {
    try {
      setIsLoading(true);
      const collaborationMetrics = await editAttributionService.getCollaborationMetrics(selectedTimeRange);
      setMetrics(collaborationMetrics);
      setLastRefresh(new Date());
    } catch (error) {
      console.error('Failed to fetch collaboration metrics:', error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedTimeRange]);

  // Initialize metrics and set up auto-refresh
  useEffect(() => {
    const initializeMetrics = async () => {
      await editAttributionService.initialize(articleId);
      await fetchMetrics();
    };

    initializeMetrics();

    // Set up auto-refresh interval
    let intervalId: NodeJS.Timeout | null = null;
    if (autoRefresh && refreshInterval > 0) {
      intervalId = setInterval(fetchMetrics, refreshInterval);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [articleId, fetchMetrics, autoRefresh, refreshInterval]);

  // Re-fetch when time range changes
  useEffect(() => {
    if (metrics) {
      fetchMetrics();
    }
  }, [selectedTimeRange, fetchMetrics]);

  // Generate metric cards
  const metricCards: MetricCard[] = useMemo(() => {
    if (!metrics) return [];

    const totalEditsByUser = Array.from(metrics.editsByUser.values()).reduce((a, b) => a + b, 0);
    const avgEditsPerUser = metrics.activeUsers > 0 ? Math.round(totalEditsByUser / metrics.activeUsers) : 0;
    
    // Calculate collaboration intensity (edits per active hour)
    const activeHours = metrics.editsByTimeRange.filter(range => range.editCount > 0).length;
    const collaborationIntensity = activeHours > 0 ? Math.round(metrics.totalEdits / activeHours) : 0;

    // Calculate conflict rate
    const totalCollaborationPairs = metrics.collaborationPatterns.length;
    const conflictRate = totalCollaborationPairs > 0 
      ? Math.round((metrics.collaborationPatterns.reduce((sum, pattern) => sum + pattern.conflictCount, 0) / totalCollaborationPairs) * 100)
      : 0;

    return [
      {
        title: 'Total Edits',
        value: metrics.totalEdits,
        icon: Activity,
        color: 'text-blue-600',
        bgColor: 'bg-blue-50'
      },
      {
        title: 'Active Users',
        value: metrics.activeUsers,
        icon: Users,
        color: 'text-green-600',
        bgColor: 'bg-green-50'
      },
      {
        title: 'Avg Edits/User',
        value: avgEditsPerUser,
        icon: Target,
        color: 'text-purple-600',
        bgColor: 'bg-purple-50'
      },
      {
        title: 'Collaboration Rate',
        value: `${collaborationIntensity}/hr`,
        icon: Zap,
        color: 'text-orange-600',
        bgColor: 'bg-orange-50'
      },
      {
        title: 'Conflict Rate',
        value: `${conflictRate}%`,
        icon: GitBranch,
        color: conflictRate > 20 ? 'text-red-600' : 'text-yellow-600',
        bgColor: conflictRate > 20 ? 'bg-red-50' : 'bg-yellow-50'
      }
    ];
  }, [metrics]);

  // Generate user contribution chart data
  const userContributionData = useMemo(() => {
    if (!metrics) return [];

    return Array.from(metrics.editsByUser.entries())
      .map(([userId, editCount]) => ({
        userId,
        editCount,
        percentage: Math.round((editCount / metrics.totalEdits) * 100)
      }))
      .sort((a, b) => b.editCount - a.editCount)
      .slice(0, 10); // Top 10 users
  }, [metrics]);

  // Generate activity timeline data
  const activityTimelineData = useMemo(() => {
    if (!metrics) return [];

    return metrics.editsByTimeRange
      .sort((a, b) => new Date(a.timeRange).getTime() - new Date(b.timeRange).getTime())
      .map(range => ({
        time: new Date(range.timeRange).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        edits: range.editCount,
        users: range.userCount
      }));
  }, [metrics]);

  // Export metrics as CSV
  const exportMetrics = useCallback(() => {
    if (!metrics) return;

    const csvData = [
      ['Metric', 'Value'],
      ['Total Edits', metrics.totalEdits],
      ['Active Users', metrics.activeUsers],
      ['Time Range', `${selectedTimeRange} hours`],
      ['Export Date', new Date().toISOString()],
      [''],
      ['User Contributions', ''],
      ['User ID', 'Edit Count', 'Percentage'],
      ...userContributionData.map(user => [user.userId, user.editCount, `${user.percentage}%`]),
      [''],
      ['Activity Timeline', ''],
      ['Time', 'Edits', 'Users'],
      ...activityTimelineData.map(data => [data.time, data.edits, data.users]),
      [''],
      ['Collaboration Patterns', ''],
      ['User Pair', 'Shared Edits', 'Conflicts'],
      ...metrics.collaborationPatterns.map(pattern => [
        `${pattern.userPair[0]} & ${pattern.userPair[1]}`,
        pattern.sharedEdits,
        pattern.conflictCount
      ])
    ];

    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `collaboration-metrics-${articleId}-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }, [metrics, articleId, selectedTimeRange, userContributionData, activityTimelineData]);

  // Format relative time for last refresh
  const formatLastRefresh = useCallback((date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);

    if (diffSeconds < 30) return 'Just updated';
    if (diffMinutes < 1) return `${diffSeconds}s ago`;
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }, []);

  if (isLoading && !metrics) {
    return (
      <div className={cn('animate-pulse bg-white border border-gray-200 rounded-lg p-6', className)}>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="space-y-3">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-8 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
        <div className="h-32 bg-gray-200 rounded"></div>
      </div>
    );
  }

  return (
    <div className={cn('bg-white border border-gray-200 rounded-lg shadow-sm', className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <BarChart3 className="w-5 h-5 text-gray-500" />
          <h3 className="text-lg font-medium text-gray-900">
            {compact ? 'Analytics' : 'Collaboration Analytics'}
          </h3>
          <span className="text-sm text-gray-500">
            ({formatLastRefresh(lastRefresh)})
          </span>
        </div>

        <div className="flex items-center space-x-2">
          {/* Time Range Selector */}
          <select
            value={selectedTimeRange}
            onChange={(e) => setSelectedTimeRange(Number(e.target.value))}
            className="text-sm border border-gray-300 rounded-md px-3 py-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {timeRangeOptions.map(option => (
              <option key={option.value} value={option.value}>
                {compact ? option.shortLabel : option.label}
              </option>
            ))}
          </select>

          {/* Auto-refresh Toggle */}
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={cn(
              'p-2 rounded-md border border-gray-300 hover:bg-gray-50 transition-colors',
              autoRefresh && 'bg-green-50 border-green-300 text-green-700'
            )}
            title={autoRefresh ? 'Disable auto-refresh' : 'Enable auto-refresh'}
          >
            <RefreshCw className={cn('w-4 h-4', autoRefresh && 'animate-spin')} />
          </button>

          {/* Export Button */}
          {showExportOptions && (
            <button
              onClick={exportMetrics}
              className="p-2 rounded-md border border-gray-300 hover:bg-gray-50 transition-colors"
              title="Export metrics as CSV"
              disabled={!metrics}
            >
              <Download className="w-4 h-4" />
            </button>
          )}

          {/* Collapse Toggle */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2 rounded-md border border-gray-300 hover:bg-gray-50 transition-colors"
            title={isCollapsed ? 'Expand' : 'Collapse'}
          >
            {isCollapsed ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Dashboard Content */}
      {!isCollapsed && (
        <div className="p-4 space-y-6">
          {/* Metric Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {metricCards.map((card, index) => (
              <div
                key={index}
                className={cn('p-4 rounded-lg border', card.bgColor, 'border-gray-200')}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{card.title}</p>
                    <p className={cn('text-2xl font-bold', card.color)}>{card.value}</p>
                  </div>
                  <card.icon className={cn('w-8 h-8', card.color)} />
                </div>
              </div>
            ))}
          </div>

          {/* Charts Row */}
          {!compact && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* User Contributions */}
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-4">
                  <PieChart className="w-5 h-5 text-gray-500" />
                  <h4 className="text-lg font-medium text-gray-900">Top Contributors</h4>
                </div>
                
                {userContributionData.length > 0 ? (
                  <div className="space-y-3">
                    {userContributionData.slice(0, 5).map((user, index) => (
                      <div key={user.userId} className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 rounded-full bg-blue-500" />
                          <span className="text-sm font-medium text-gray-900 truncate max-w-32">
                            User {user.userId.slice(0, 8)}...
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="w-20 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-500 h-2 rounded-full"
                              style={{ width: `${user.percentage}%` }}
                            />
                          </div>
                          <span className="text-sm text-gray-600 w-12 text-right">
                            {user.editCount}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-gray-500 py-8">
                    <Users className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    <p>No contribution data available</p>
                  </div>
                )}
              </div>

              {/* Activity Timeline */}
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-4">
                  <TrendingUp className="w-5 h-5 text-gray-500" />
                  <h4 className="text-lg font-medium text-gray-900">Activity Timeline</h4>
                </div>

                {activityTimelineData.length > 0 ? (
                  <div className="space-y-2">
                    {activityTimelineData.slice(-10).map((data, index) => (
                      <div key={index} className="flex items-center justify-between text-sm">
                        <span className="text-gray-600 w-16">{data.time}</span>
                        <div className="flex-1 mx-3">
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-green-500 h-2 rounded-full"
                              style={{ 
                                width: `${Math.min(100, (data.edits / Math.max(...activityTimelineData.map(d => d.edits))) * 100)}%` 
                              }}
                            />
                          </div>
                        </div>
                        <span className="text-gray-900 font-medium w-8 text-right">{data.edits}</span>
                        <span className="text-gray-500 w-8 text-right">({data.users}u)</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-gray-500 py-8">
                    <Clock className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    <p>No activity data available</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Collaboration Patterns */}
          {!compact && metrics && metrics.collaborationPatterns.length > 0 && (
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-4">
                <GitBranch className="w-5 h-5 text-gray-500" />
                <h4 className="text-lg font-medium text-gray-900">Collaboration Patterns</h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {metrics.collaborationPatterns.slice(0, 6).map((pattern, index) => (
                  <div key={index} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-900">
                        User Pair {index + 1}
                      </span>
                      <span className={cn(
                        'text-xs px-2 py-1 rounded-full',
                        pattern.conflictCount > 2 
                          ? 'bg-red-100 text-red-700'
                          : pattern.conflictCount > 0
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-green-100 text-green-700'
                      )}>
                        {pattern.conflictCount} conflicts
                      </span>
                    </div>
                    <div className="text-sm text-gray-600">
                      {pattern.sharedEdits} shared edits
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CollaborationDashboard; 