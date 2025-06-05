import React, { useState, useEffect, useMemo } from 'react';
import { CheckCircle, MessageCircle, Archive, Filter, MoreHorizontal, AlertCircle, Clock, Users, Target } from 'lucide-react';
import { ArticleComment, bulkUpdateCommentStatus } from '../../lib/commentApi';

interface CommentResolutionPanelProps {
  comments: ArticleComment[];
  onStatusChange: (commentIds: string[], status: 'active' | 'resolved' | 'archived') => void;
  onRefresh: () => void;
  showAnalytics?: boolean;
}

interface ResolutionTemplate {
  id: string;
  name: string;
  reason: string;
  status: 'resolved' | 'archived';
}

const defaultTemplates: ResolutionTemplate[] = [
  { id: '1', name: 'Issue Fixed', reason: 'The reported issue has been addressed and fixed.', status: 'resolved' },
  { id: '2', name: 'Implemented Suggestion', reason: 'The suggested improvement has been implemented.', status: 'resolved' },
  { id: '3', name: 'Not Applicable', reason: 'This comment is no longer applicable to the current version.', status: 'archived' },
  { id: '4', name: 'Duplicate Comment', reason: 'This comment duplicates another discussion thread.', status: 'archived' },
  { id: '5', name: 'Out of Scope', reason: 'This comment is outside the scope of this article.', status: 'archived' }
];

export const CommentResolutionPanel: React.FC<CommentResolutionPanelProps> = ({
  comments,
  onStatusChange,
  onRefresh,
  showAnalytics = true
}) => {
  const [selectedComments, setSelectedComments] = useState<string[]>([]);
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'resolved' | 'archived'>('all');
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [customReason, setCustomReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Filter comments based on status
  const filteredComments = useMemo(() => {
    if (filterStatus === 'all') return comments;
    return comments.filter(comment => comment.status === filterStatus);
  }, [comments, filterStatus]);

  // Calculate resolution analytics
  const analytics = useMemo(() => {
    const total = comments.length;
    const resolved = comments.filter(c => c.status === 'resolved').length;
    const active = comments.filter(c => c.status === 'active').length;
    const archived = comments.filter(c => c.status === 'archived').length;
    const resolutionRate = total > 0 ? (resolved / total) * 100 : 0;

    // Calculate average resolution time (simplified - would need status history for accuracy)
    const resolvedComments = comments.filter(c => c.status === 'resolved');
    const avgResolutionDays = resolvedComments.length > 0 
      ? resolvedComments.reduce((acc, comment) => {
          const created = new Date(comment.created_at);
          const updated = new Date(comment.updated_at);
          const diffDays = (updated.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
          return acc + diffDays;
        }, 0) / resolvedComments.length
      : 0;

    return {
      total,
      resolved,
      active,
      archived,
      resolutionRate,
      avgResolutionDays
    };
  }, [comments]);

  // Handle comment selection
  const handleCommentSelection = (commentId: string, selected: boolean) => {
    if (selected) {
      setSelectedComments(prev => [...prev, commentId]);
    } else {
      setSelectedComments(prev => prev.filter(id => id !== commentId));
    }
  };

  // Handle select all
  const handleSelectAll = () => {
    const visibleCommentIds = filteredComments.map(c => c.id);
    if (selectedComments.length === visibleCommentIds.length) {
      setSelectedComments([]);
    } else {
      setSelectedComments(visibleCommentIds);
    }
  };

  // Handle bulk resolution
  const handleBulkResolution = async (status: 'resolved' | 'archived') => {
    if (selectedComments.length === 0) return;

    setIsProcessing(true);
    try {
      await bulkUpdateCommentStatus(selectedComments, status);
      onStatusChange(selectedComments, status);
      setSelectedComments([]);
      setShowBulkActions(false);
      onRefresh();
    } catch (error) {
      console.error('Error bulk updating comments:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle template application
  const handleApplyTemplate = async () => {
    const template = defaultTemplates.find(t => t.id === selectedTemplate);
    if (!template || selectedComments.length === 0) return;

    await handleBulkResolution(template.status);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'resolved':
        return <CheckCircle size={16} className="text-green-600" />;
      case 'archived':
        return <Archive size={16} className="text-gray-600" />;
      default:
        return <MessageCircle size={16} className="text-blue-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'resolved':
        return 'text-green-600 bg-green-50';
      case 'archived':
        return 'text-gray-600 bg-gray-50';
      default:
        return 'text-blue-600 bg-blue-50';
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">Comment Resolution</h3>
          <button
            onClick={onRefresh}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Analytics Dashboard */}
      {showAnalytics && (
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{analytics.total}</div>
              <div className="text-sm text-gray-500">Total Comments</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{analytics.resolutionRate.toFixed(1)}%</div>
              <div className="text-sm text-gray-500">Resolution Rate</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{analytics.active}</div>
              <div className="text-sm text-gray-500">Active</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-600">{analytics.avgResolutionDays.toFixed(1)}</div>
              <div className="text-sm text-gray-500">Avg Days to Resolve</div>
            </div>
          </div>
        </div>
      )}

      {/* Filters and Actions */}
      <div className="px-4 py-3 border-b border-gray-200">
        <div className="flex items-center justify-between">
          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-gray-400" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="text-sm border border-gray-300 rounded px-2 py-1"
            >
              <option value="all">All Comments</option>
              <option value="active">Active</option>
              <option value="resolved">Resolved</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          {/* Bulk Actions */}
          <div className="flex items-center gap-2">
            {selectedComments.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">
                  {selectedComments.length} selected
                </span>
                <button
                  onClick={() => setShowBulkActions(!showBulkActions)}
                  className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                >
                  Bulk Actions
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Bulk Actions Panel */}
        {showBulkActions && selectedComments.length > 0 && (
          <div className="mt-3 p-3 bg-gray-50 rounded border">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Quick Actions */}
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">Quick Actions</h4>
                <div className="space-y-2">
                  <button
                    onClick={() => handleBulkResolution('resolved')}
                    disabled={isProcessing}
                    className="w-full text-left px-3 py-2 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200 disabled:opacity-50"
                  >
                    <CheckCircle size={14} className="inline mr-2" />
                    Mark as Resolved
                  </button>
                  <button
                    onClick={() => handleBulkResolution('archived')}
                    disabled={isProcessing}
                    className="w-full text-left px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50"
                  >
                    <Archive size={14} className="inline mr-2" />
                    Archive
                  </button>
                </div>
              </div>

              {/* Templates */}
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">Resolution Templates</h4>
                <select
                  value={selectedTemplate}
                  onChange={(e) => setSelectedTemplate(e.target.value)}
                  className="w-full text-sm border border-gray-300 rounded px-2 py-1 mb-2"
                >
                  <option value="">Select a template...</option>
                  {defaultTemplates.map(template => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))}
                </select>
                {selectedTemplate && (
                  <div className="mb-2">
                    <p className="text-xs text-gray-600">
                      {defaultTemplates.find(t => t.id === selectedTemplate)?.reason}
                    </p>
                  </div>
                )}
                <button
                  onClick={handleApplyTemplate}
                  disabled={!selectedTemplate || isProcessing}
                  className="w-full px-3 py-2 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 disabled:opacity-50"
                >
                  Apply Template
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Comments List */}
      <div className="px-4 py-3">
        {/* Select All */}
        <div className="flex items-center gap-3 mb-3">
          <input
            type="checkbox"
            checked={selectedComments.length === filteredComments.length && filteredComments.length > 0}
            onChange={handleSelectAll}
            className="rounded"
          />
          <span className="text-sm text-gray-600">
            Select all ({filteredComments.length} comments)
          </span>
        </div>

        {/* Comments */}
        <div className="space-y-2">
          {filteredComments.map(comment => (
            <div
              key={comment.id}
              className={`flex items-start gap-3 p-3 border rounded-lg ${getStatusColor(comment.status)}`}
            >
              <input
                type="checkbox"
                checked={selectedComments.includes(comment.id)}
                onChange={(e) => handleCommentSelection(comment.id, e.target.checked)}
                className="mt-1 rounded"
              />
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  {getStatusIcon(comment.status)}
                  <span className="text-sm font-medium text-gray-900">
                    {comment.user?.name || 'Unknown User'}
                  </span>
                  <span className="text-xs text-gray-500">
                    {new Date(comment.created_at).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-sm text-gray-700 line-clamp-2">
                  {comment.content}
                </p>
                {comment.selection_start !== undefined && (
                  <div className="text-xs text-gray-500 mt-1">
                    Inline comment (characters {comment.selection_start}-{comment.selection_end})
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {filteredComments.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <MessageCircle size={48} className="mx-auto mb-2 text-gray-300" />
            <p>No comments found for the selected filter.</p>
          </div>
        )}
      </div>
    </div>
  );
}; 