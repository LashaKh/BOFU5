import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Filter,
  Search,
  Download,
  Eye,
  User,
  Calendar,
  Activity,
  RefreshCw,
  ChevronDown,
  ExternalLink,
  Shield,
  Clock,
  AlertCircle
} from 'lucide-react';
import type { UserProfile } from '../../types/adminApi';
import { toast } from 'react-hot-toast';

// Audit log entry type
interface AuditLogEntry {
  id: string;
  admin_id: string;
  admin_email: string;
  admin_name: string;
  article_id: string;
  article_title: string;
  user_email: string; // Original article author
  user_company: string;
  access_time: string;
  action_type: 'view' | 'edit' | 'status_change' | 'ownership_transfer' | 'delete' | 'restore' | 'export' | 'comment_add' | 'comment_resolve' | 'bulk_operation';
  notes?: string;
  metadata?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

interface AuditLogViewerProps {
  className?: string;
}

// Mock audit log data for demonstration
const mockAuditLogs: AuditLogEntry[] = Array.from({ length: 50 }, (_, i) => {
  const actionTypes: AuditLogEntry['action_type'][] = ['view', 'edit', 'status_change', 'ownership_transfer', 'delete', 'export', 'bulk_operation'];
  const action = actionTypes[i % actionTypes.length];
  const date = new Date(Date.now() - (i * 2 * 60 * 60 * 1000)); // Every 2 hours back
  
  return {
    id: `audit-${i + 1}`,
    admin_id: `admin-${(i % 3) + 1}`,
    admin_email: `admin${(i % 3) + 1}@bofu.ai`,
    admin_name: `Admin User ${(i % 3) + 1}`,
    article_id: `article-${(i % 10) + 1}`,
    article_title: `Sample Article ${(i % 10) + 1}: Advanced Analysis`,
    user_email: `user${(i % 5) + 1}@example.com`,
    user_company: `Client Company ${(i % 5) + 1}`,
    access_time: date.toISOString(),
    action_type: action,
    notes: action === 'status_change' ? `Changed status from draft to final` : 
           action === 'ownership_transfer' ? `Transferred to user${((i + 1) % 5) + 1}@example.com` :
           action === 'bulk_operation' ? `Applied bulk status change to 5 articles` :
           `Performed ${action} action`,
    metadata: {
      previous_value: action === 'status_change' ? 'draft' : undefined,
      new_value: action === 'status_change' ? 'final' : undefined,
      bulk_count: action === 'bulk_operation' ? Math.floor(Math.random() * 10) + 1 : undefined
    },
    ip_address: `192.168.1.${Math.floor(Math.random() * 255)}`,
    user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    created_at: date.toISOString()
  };
});

export function AuditLogViewer({ className = '' }: AuditLogViewerProps) {
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(mockAuditLogs);
  const [filteredLogs, setFilteredLogs] = useState<AuditLogEntry[]>(mockAuditLogs);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedActionType, setSelectedActionType] = useState<string>('all');
  const [selectedAdmin, setSelectedAdmin] = useState<string>('all');
  const [dateRange, setDateRange] = useState({
    start: '',
    end: ''
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  // Extract unique admins and action types for filters
  const uniqueAdmins = Array.from(new Set(auditLogs.map(log => log.admin_email)));
  const actionTypes = ['view', 'edit', 'status_change', 'ownership_transfer', 'delete', 'restore', 'export', 'comment_add', 'comment_resolve', 'bulk_operation'];

  // Filter logs based on search and filters
  useEffect(() => {
    let filtered = auditLogs;

    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(log =>
        log.article_title.toLowerCase().includes(searchLower) ||
        log.admin_email.toLowerCase().includes(searchLower) ||
        log.user_email.toLowerCase().includes(searchLower) ||
        log.user_company.toLowerCase().includes(searchLower) ||
        log.notes?.toLowerCase().includes(searchLower) ||
        log.action_type.toLowerCase().includes(searchLower)
      );
    }

    // Action type filter
    if (selectedActionType !== 'all') {
      filtered = filtered.filter(log => log.action_type === selectedActionType);
    }

    // Admin filter
    if (selectedAdmin !== 'all') {
      filtered = filtered.filter(log => log.admin_email === selectedAdmin);
    }

    // Date range filter
    if (dateRange.start) {
      filtered = filtered.filter(log => new Date(log.access_time) >= new Date(dateRange.start));
    }
    if (dateRange.end) {
      filtered = filtered.filter(log => new Date(log.access_time) <= new Date(dateRange.end));
    }

    setFilteredLogs(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  }, [searchTerm, selectedActionType, selectedAdmin, dateRange, auditLogs]);

  // Pagination
  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedLogs = filteredLogs.slice(startIndex, startIndex + itemsPerPage);

  // Action type display helpers
  const getActionTypeColor = (actionType: string) => {
    const colors = {
      view: 'text-blue-400',
      edit: 'text-green-400',
      status_change: 'text-yellow-400',
      ownership_transfer: 'text-purple-400',
      delete: 'text-red-400',
      restore: 'text-cyan-400',
      export: 'text-gray-400',
      comment_add: 'text-indigo-400',
      comment_resolve: 'text-pink-400',
      bulk_operation: 'text-orange-400'
    };
    return colors[actionType as keyof typeof colors] || 'text-gray-400';
  };

  const getActionTypeIcon = (actionType: string) => {
    switch (actionType) {
      case 'view': return Eye;
      case 'edit': return Activity;
      case 'status_change': return RefreshCw;
      case 'ownership_transfer': return User;
      case 'delete': return AlertCircle;
      case 'export': return Download;
      default: return Activity;
    }
  };

  // Export functionality
  const handleExportLogs = async () => {
    setIsLoading(true);
    try {
      toast.loading('Generating audit log export...', { id: 'export-audit' });
      
      // Simulate export delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const exportData = {
        export_metadata: {
          generated_at: new Date().toISOString(),
          total_entries: filteredLogs.length,
          filters_applied: {
            search_term: searchTerm || null,
            action_type: selectedActionType !== 'all' ? selectedActionType : null,
            admin_filter: selectedAdmin !== 'all' ? selectedAdmin : null,
            date_range: dateRange.start || dateRange.end ? dateRange : null
          }
        },
        audit_logs: filteredLogs
      };
      
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `audit-logs-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success(`Exported ${filteredLogs.length} audit log entries`, { id: 'export-audit' });
    } catch (error) {
      toast.error('Failed to export audit logs', { id: 'export-audit' });
    } finally {
      setIsLoading(false);
    }
  };

  // Refresh logs
  const handleRefreshLogs = async () => {
    setIsLoading(true);
    try {
      toast.loading('Refreshing audit logs...', { id: 'refresh-audit' });
      
      // Simulate API refresh
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // In real implementation, this would fetch from the API
      // For now, we'll just update the timestamp to show it refreshed
      console.log('Audit logs refreshed');
      
      toast.success('Audit logs refreshed', { id: 'refresh-audit' });
    } catch (error) {
      toast.error('Failed to refresh audit logs', { id: 'refresh-audit' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`bg-secondary-800 rounded-xl shadow-lg border border-secondary-700 ${className}`}>
      {/* Header */}
      <div className="border-b border-secondary-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary-500/10 rounded-lg">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">Audit Trail</h2>
              <p className="text-sm text-gray-300">
                Monitor all admin article access and actions
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={handleRefreshLogs}
              disabled={isLoading}
              className="flex items-center space-x-2 px-3 py-2 bg-secondary-700 hover:bg-secondary-600 rounded-lg transition-colors disabled:opacity-50 text-white"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="text-sm">Refresh</span>
            </button>
            <button
              onClick={handleExportLogs}
              disabled={isLoading}
              className="flex items-center space-x-2 px-3 py-2 bg-primary-500 hover:bg-primary-400 text-white rounded-lg transition-colors disabled:opacity-50 font-medium"
            >
              <Download className="h-4 w-4" />
              <span className="text-sm">Export</span>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search logs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-secondary-700 border border-secondary-600 rounded-lg text-white placeholder-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          {/* Action Type Filter */}
          <div className="relative">
            <select
              value={selectedActionType}
              onChange={(e) => setSelectedActionType(e.target.value)}
              className="w-full px-3 py-2 bg-secondary-700 border border-secondary-600 rounded-lg text-black focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent appearance-none"
            >
              <option value="all">All Actions</option>
              {actionTypes.map(type => (
                <option key={type} value={type}>
                  {type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          </div>

          {/* Admin Filter */}
          <div className="relative">
            <select
              value={selectedAdmin}
              onChange={(e) => setSelectedAdmin(e.target.value)}
              className="w-full px-3 py-2 bg-secondary-700 border border-secondary-600 rounded-lg text-black focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent appearance-none"
            >
              <option value="all">All Admins</option>
              {uniqueAdmins.map(admin => (
                <option key={admin} value={admin}>{admin}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          </div>

          {/* Date Range */}
          <div className="flex space-x-2">
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              className="flex-1 px-3 py-2 bg-secondary-700 border border-secondary-600 rounded-lg text-black focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              className="flex-1 px-3 py-2 bg-secondary-700 border border-secondary-600 rounded-lg text-black focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Results Count */}
        <div className="mt-4 text-sm text-gray-400">
          Showing {paginatedLogs.length} of {filteredLogs.length} audit entries
          {filteredLogs.length !== auditLogs.length && ` (filtered from ${auditLogs.length} total)`}
        </div>
      </div>

      {/* Audit Log List */}
      <div className="divide-y divide-secondary-700">
        {paginatedLogs.length > 0 ? (
          paginatedLogs.map((log) => {
            const ActionIcon = getActionTypeIcon(log.action_type);
            const isExpanded = expandedLog === log.id;
            
            return (
              <motion.div
                key={log.id}
                layout
                className="p-4 hover:bg-secondary-700/50 transition-colors"
              >
                <div
                  className="flex items-start justify-between cursor-pointer"
                  onClick={() => setExpandedLog(isExpanded ? null : log.id)}
                >
                  <div className="flex items-start space-x-4 flex-1">
                    <div className={`p-2 rounded-lg bg-secondary-700 ${getActionTypeColor(log.action_type)}`}>
                      <ActionIcon className="h-4 w-4" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className={`text-sm font-medium ${getActionTypeColor(log.action_type)}`}>
                          {log.action_type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </span>
                        <span className="text-xs text-gray-500">•</span>
                        <span className="text-xs text-gray-400">
                          {new Date(log.access_time).toLocaleString()}
                        </span>
                      </div>
                      
                      <div className="text-white font-medium truncate">
                        {log.article_title}
                      </div>
                      
                      <div className="text-sm text-gray-400 mt-1">
                        <span className="font-medium text-primary-300">{log.admin_email}</span>
                        {' '} performed action on article by{' '}
                        <span className="font-medium text-gray-300">{log.user_company}</span>
                      </div>
                      
                      {log.notes && (
                        <div className="text-sm text-gray-500 mt-1 truncate">
                          {log.notes}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                </div>
                
                {/* Expanded Details */}
                {isExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-4 pt-4 border-t border-secondary-700"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="space-y-2">
                          <div>
                            <span className="text-gray-400">Admin:</span>
                            <span className="ml-2 text-white">{log.admin_name} ({log.admin_email})</span>
                          </div>
                          <div>
                            <span className="text-gray-400">Article:</span>
                            <span className="ml-2 text-white">{log.article_title}</span>
                          </div>
                          <div>
                            <span className="text-gray-400">Author:</span>
                            <span className="ml-2 text-white">{log.user_email} - {log.user_company}</span>
                          </div>
                          <div>
                            <span className="text-gray-400">Action Time:</span>
                            <span className="ml-2 text-white">{new Date(log.access_time).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <div className="space-y-2">
                          {log.ip_address && (
                            <div>
                              <span className="text-gray-400">IP Address:</span>
                              <span className="ml-2 text-white font-mono">{log.ip_address}</span>
                            </div>
                          )}
                          {log.metadata && Object.keys(log.metadata).length > 0 && (
                            <div>
                              <span className="text-gray-400">Metadata:</span>
                              <div className="ml-2 mt-1 p-2 bg-secondary-900 rounded text-xs font-mono">
                                {JSON.stringify(log.metadata, null, 2)}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {log.notes && (
                      <div className="mt-4">
                        <span className="text-gray-400">Notes:</span>
                        <div className="ml-2 mt-1 text-white">{log.notes}</div>
                      </div>
                    )}
                  </motion.div>
                )}
              </motion.div>
            );
          })
        ) : (
          <div className="p-8 text-center">
            <Shield className="h-12 w-12 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-400 mb-2">No Audit Logs Found</h3>
            <p className="text-sm text-gray-500">
              {searchTerm || selectedActionType !== 'all' || selectedAdmin !== 'all' || dateRange.start || dateRange.end
                ? 'Try adjusting your filters to see more results.'
                : 'No admin actions have been logged yet.'}
            </p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="border-t border-secondary-700 p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-400">
              Page {currentPage} of {totalPages}
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 bg-secondary-700 hover:bg-secondary-600 rounded disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const page = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                return (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-3 py-1 rounded ${
                      currentPage === page
                        ? 'bg-primary-500 text-black font-medium'
                        : 'bg-secondary-700 hover:bg-secondary-600'
                    }`}
                  >
                    {page}
                  </button>
                );
              })}
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 bg-secondary-700 hover:bg-secondary-600 rounded disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AuditLogViewer; 