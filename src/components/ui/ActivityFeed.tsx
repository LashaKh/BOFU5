import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Clock, User, Edit3, Trash2, Type, Palette, Filter, Calendar, Search, MoreVertical, Eye, EyeOff } from 'lucide-react';
import { editAttributionService, EditAttribution } from '../../lib/editAttribution';
import { cn } from '../../lib/utils';

interface ActivityFeedProps {
  articleId: string;
  className?: string;
  maxItems?: number;
  showUserFilter?: boolean;
  showTimeFilter?: boolean;
  showOperationFilter?: boolean;
  realTimeUpdates?: boolean;
  compact?: boolean;
}

interface FilterState {
  users: Set<string>;
  operations: Set<EditAttribution['operation']>;
  timeRange: 'hour' | 'day' | 'week' | 'month' | 'all';
  searchQuery: string;
}

interface GroupedEdit {
  batchId: string;
  userId: string;
  userName: string;
  userColor: string;
  userAvatar?: string;
  edits: EditAttribution[];
  startTime: string;
  endTime: string;
  totalChanges: number;
  summary: string;
}

export const ActivityFeed: React.FC<ActivityFeedProps> = ({
  articleId,
  className = '',
  maxItems = 50,
  showUserFilter = true,
  showTimeFilter = true,
  showOperationFilter = true,
  realTimeUpdates = true,
  compact = false,
}) => {
  const [edits, setEdits] = useState<EditAttribution[]>([]);
  const [groupedEdits, setGroupedEdits] = useState<GroupedEdit[]>([]);
  const [filters, setFilters] = useState<FilterState>({
    users: new Set(),
    operations: new Set(),
    timeRange: 'day',
    searchQuery: '',
  });
  const [availableUsers, setAvailableUsers] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedEditId, setSelectedEditId] = useState<string | null>(null);

  const feedRef = useRef<HTMLDivElement>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // Operation icons and colors
  const getOperationConfig = (operation: EditAttribution['operation']) => {
    switch (operation) {
      case 'insert':
        return { icon: Edit3, color: 'text-green-600', bgColor: 'bg-green-50', label: 'Added' };
      case 'delete':
        return { icon: Trash2, color: 'text-red-600', bgColor: 'bg-red-50', label: 'Removed' };
      case 'replace':
        return { icon: Type, color: 'text-blue-600', bgColor: 'bg-blue-50', label: 'Modified' };
      case 'format':
        return { icon: Palette, color: 'text-purple-600', bgColor: 'bg-purple-50', label: 'Formatted' };
      default:
        return { icon: Edit3, color: 'text-gray-600', bgColor: 'bg-gray-50', label: 'Changed' };
    }
  };

  // Time range options
  const timeRangeOptions = [
    { value: 'hour' as const, label: 'Last Hour', hours: 1 },
    { value: 'day' as const, label: 'Last Day', hours: 24 },
    { value: 'week' as const, label: 'Last Week', hours: 168 },
    { value: 'month' as const, label: 'Last Month', hours: 720 },
    { value: 'all' as const, label: 'All Time', hours: 8760 },
  ];

  // Initialize and subscribe to attribution changes
  useEffect(() => {
    const initializeService = async () => {
      try {
        setIsLoading(true);
        await editAttributionService.initialize(articleId);
        
        if (realTimeUpdates) {
          unsubscribeRef.current = editAttributionService.onAttributionChange((attributions) => {
            setEdits(attributions);
            updateAvailableUsers(attributions);
          });
        }

        // Load initial data
        const highlights = editAttributionService.getEditHighlights(
          timeRangeOptions.find(opt => opt.value === filters.timeRange)?.hours || 24
        );
        
        const attributions = highlights.map(h => ({
          id: `${h.userId}-${h.from}-${h.to}-${h.timestamp}`,
          articleId,
          userId: h.userId,
          userMetadata: {
            name: h.userName.split(' - ')[0],
            color: h.userColor,
          },
          operation: h.operation,
          position: { from: h.from, to: h.to },
          timestamp: h.timestamp,
        } as EditAttribution));

        setEdits(attributions);
        updateAvailableUsers(attributions);
      } catch (error) {
        console.error('Failed to initialize activity feed:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeService();

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [articleId, realTimeUpdates, filters.timeRange]);

  // Update available users for filtering
  const updateAvailableUsers = useCallback((attributions: EditAttribution[]) => {
    const users = new Set<string>();
    attributions.forEach(edit => {
      users.add(edit.userId);
    });
    setAvailableUsers(users);
  }, []);

  // Group edits by user and time proximity
  const groupEdits = useCallback((attributions: EditAttribution[]): GroupedEdit[] => {
    const groups: Map<string, GroupedEdit> = new Map();
    const BATCH_TIME_WINDOW = 5 * 60 * 1000; // 5 minutes

    attributions
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .forEach(edit => {
        let foundGroup = false;

        // Try to find an existing group for this user within the time window
        for (const [, group] of groups) {
          if (group.userId === edit.userId) {
            const timeDiff = Math.abs(
              new Date(edit.timestamp).getTime() - new Date(group.endTime).getTime()
            );

            if (timeDiff <= BATCH_TIME_WINDOW) {
              group.edits.push(edit);
              group.endTime = edit.timestamp;
              group.totalChanges += edit.length || 0;
              foundGroup = true;
              break;
            }
          }
        }

        if (!foundGroup) {
          // Create new group
          const groupId = `${edit.userId}-${edit.timestamp}`;
          groups.set(groupId, {
            batchId: groupId,
            userId: edit.userId,
            userName: edit.userMetadata.name || edit.userMetadata.email || 'Unknown User',
            userColor: edit.userMetadata.color || '#3B82F6',
            userAvatar: edit.userMetadata.avatar_url,
            edits: [edit],
            startTime: edit.timestamp,
            endTime: edit.timestamp,
            totalChanges: edit.length || 0,
            summary: generateEditSummary([edit]),
          });
        }
      });

    // Update summaries for groups with multiple edits
    groups.forEach(group => {
      if (group.edits.length > 1) {
        group.summary = generateEditSummary(group.edits);
      }
    });

    return Array.from(groups.values());
  }, []);

  // Generate a summary for a group of edits
  const generateEditSummary = useCallback((edits: EditAttribution[]): string => {
    if (edits.length === 1) {
      const edit = edits[0];
      const config = getOperationConfig(edit.operation);
      return `${config.label} ${edit.length || 0} character${(edit.length || 0) !== 1 ? 's' : ''}`;
    }

    const operations = new Map<EditAttribution['operation'], number>();
    let totalChanges = 0;

    edits.forEach(edit => {
      operations.set(edit.operation, (operations.get(edit.operation) || 0) + 1);
      totalChanges += edit.length || 0;
    });

    const operationSummaries = Array.from(operations.entries())
      .map(([op, count]) => `${count} ${getOperationConfig(op).label.toLowerCase()}`)
      .join(', ');

    return `${edits.length} edits: ${operationSummaries} (${totalChanges} characters)`;
  }, []);

  // Filter edits based on current filter state
  const getFilteredEdits = useCallback(() => {
    let filtered = [...edits];

    // Time range filter
    if (filters.timeRange !== 'all') {
      const timeRange = timeRangeOptions.find(opt => opt.value === filters.timeRange);
      if (timeRange) {
        const cutoff = new Date(Date.now() - (timeRange.hours * 60 * 60 * 1000));
        filtered = filtered.filter(edit => new Date(edit.timestamp) >= cutoff);
      }
    }

    // User filter
    if (filters.users.size > 0) {
      filtered = filtered.filter(edit => filters.users.has(edit.userId));
    }

    // Operation filter
    if (filters.operations.size > 0) {
      filtered = filtered.filter(edit => filters.operations.has(edit.operation));
    }

    // Search filter
    if (filters.searchQuery.trim()) {
      const query = filters.searchQuery.toLowerCase();
      filtered = filtered.filter(edit => 
        edit.userMetadata.name?.toLowerCase().includes(query) ||
        edit.userMetadata.email?.toLowerCase().includes(query) ||
        edit.content?.toLowerCase().includes(query)
      );
    }

    return filtered.slice(0, maxItems);
  }, [edits, filters, maxItems]);

  // Update grouped edits when filters change
  useEffect(() => {
    const filteredEdits = getFilteredEdits();
    const grouped = groupEdits(filteredEdits);
    setGroupedEdits(grouped);
  }, [edits, filters, getFilteredEdits, groupEdits]);

  // Toggle filter option
  const toggleFilter = useCallback((type: 'users' | 'operations', value: string) => {
    setFilters(prev => {
      const newFilters = { ...prev };
      const filterSet = new Set(prev[type]);
      
      if (filterSet.has(value)) {
        filterSet.delete(value);
      } else {
        filterSet.add(value);
      }
      
      newFilters[type] = filterSet as any;
      return newFilters;
    });
  }, []);

  // Format relative time
  const formatRelativeTime = useCallback((timestamp: string): string => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now.getTime() - time.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSeconds < 60) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return time.toLocaleDateString();
  }, []);

  if (isLoading) {
    return (
      <div className={cn('animate-pulse space-y-4', className)}>
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex space-x-3">
            <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={cn('bg-white border border-gray-200 rounded-lg shadow-sm', className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <Clock className="w-5 h-5 text-gray-500" />
          <h3 className="text-lg font-medium text-gray-900">
            {compact ? 'Activity' : 'Recent Activity'}
          </h3>
          <span className="text-sm text-gray-500">
            ({groupedEdits.length} {groupedEdits.length === 1 ? 'entry' : 'entries'})
          </span>
        </div>
        
        <div className="flex items-center space-x-2">
          {/* Filters Toggle */}
          {(showUserFilter || showTimeFilter || showOperationFilter) && (
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                'p-2 rounded-md border border-gray-300 hover:bg-gray-50 transition-colors',
                showFilters && 'bg-blue-50 border-blue-300 text-blue-700'
              )}
              title="Toggle filters"
            >
              <Filter className="w-4 h-4" />
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

      {/* Filters Panel */}
      {showFilters && !isCollapsed && (
        <div className="p-4 bg-gray-50 border-b border-gray-200 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search users or content..."
              value={filters.searchQuery}
              onChange={(e) => setFilters(prev => ({ ...prev, searchQuery: e.target.value }))}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Time Range Filter */}
            {showTimeFilter && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Time Range</label>
                <select
                  value={filters.timeRange}
                  onChange={(e) => setFilters(prev => ({ ...prev, timeRange: e.target.value as FilterState['timeRange'] }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {timeRangeOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* User Filter */}
            {showUserFilter && availableUsers.size > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Users</label>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {Array.from(availableUsers).map(userId => {
                    const userEdit = edits.find(e => e.userId === userId);
                    const userName = userEdit?.userMetadata.name || userEdit?.userMetadata.email || 'Unknown User';
                    const userColor = userEdit?.userMetadata.color || '#3B82F6';
                    
                    return (
                      <label key={userId} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={filters.users.has(userId)}
                          onChange={() => toggleFilter('users', userId)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: userColor }}
                        />
                        <span className="text-sm text-gray-700 truncate">{userName}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Operation Filter */}
            {showOperationFilter && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Operations</label>
                <div className="space-y-1">
                  {(['insert', 'delete', 'replace', 'format'] as const).map(operation => {
                    const config = getOperationConfig(operation);
                    return (
                      <label key={operation} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={filters.operations.has(operation)}
                          onChange={() => toggleFilter('operations', operation)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <config.icon className={cn('w-3 h-3', config.color)} />
                        <span className="text-sm text-gray-700">{config.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Activity Feed */}
      {!isCollapsed && (
        <div ref={feedRef} className="max-h-96 overflow-y-auto">
          {groupedEdits.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Clock className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No recent activity found</p>
              {Object.values(filters).some(f => f.size > 0 || f.length > 0) && (
                <button
                  onClick={() => setFilters({
                    users: new Set(),
                    operations: new Set(),
                    timeRange: 'day',
                    searchQuery: '',
                  })}
                  className="mt-2 text-blue-600 hover:text-blue-800 text-sm"
                >
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {groupedEdits.map((group) => (
                <div
                  key={group.batchId}
                  className={cn(
                    'p-4 hover:bg-gray-50 transition-colors cursor-pointer',
                    selectedEditId === group.batchId && 'bg-blue-50'
                  )}
                  onClick={() => setSelectedEditId(selectedEditId === group.batchId ? null : group.batchId)}
                >
                  <div className="flex space-x-3">
                    {/* User Avatar */}
                    <div className="flex-shrink-0">
                      {group.userAvatar ? (
                        <img
                          src={group.userAvatar}
                          alt={group.userName}
                          className="w-8 h-8 rounded-full"
                        />
                      ) : (
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium"
                          style={{ backgroundColor: group.userColor }}
                        >
                          {group.userName[0]?.toUpperCase() || 'U'}
                        </div>
                      )}
                    </div>

                    {/* Edit Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-gray-900 truncate">
                          {group.userName}
                        </span>
                        <span className="text-gray-500">•</span>
                        <span className="text-sm text-gray-500">
                          {formatRelativeTime(group.endTime)}
                        </span>
                        {group.edits.length > 1 && (
                          <>
                            <span className="text-gray-500">•</span>
                            <span className="text-xs text-gray-500">
                              {group.edits.length} edits
                            </span>
                          </>
                        )}
                      </div>
                      
                      <p className="text-sm text-gray-600 mt-1">
                        {group.summary}
                      </p>

                      {/* Expanded Details */}
                      {selectedEditId === group.batchId && group.edits.length > 1 && (
                        <div className="mt-3 space-y-2">
                          {group.edits.map((edit, index) => {
                            const config = getOperationConfig(edit.operation);
                            return (
                              <div
                                key={edit.id}
                                className={cn(
                                  'flex items-center space-x-2 p-2 rounded text-xs',
                                  config.bgColor
                                )}
                              >
                                <config.icon className={cn('w-3 h-3', config.color)} />
                                <span className={config.color}>
                                  {config.label} {edit.length || 0} characters
                                </span>
                                <span className="text-gray-500">
                                  at position {edit.position.from}
                                </span>
                                {edit.content && (
                                  <span className="text-gray-600 truncate max-w-32">
                                    "{edit.content}"
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Operation Indicator */}
                    <div className="flex-shrink-0">
                      {group.edits.length === 1 ? (
                        (() => {
                          const config = getOperationConfig(group.edits[0].operation);
                          return (
                            <div className={cn('p-1 rounded', config.bgColor)}>
                              <config.icon className={cn('w-4 h-4', config.color)} />
                            </div>
                          );
                        })()
                      ) : (
                        <div className="p-1 rounded bg-gray-100">
                          <MoreVertical className="w-4 h-4 text-gray-600" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ActivityFeed; 