import React, { useState, useEffect } from 'react';
import { 
  History, Clock, User, GitBranch, RotateCcw, Eye, ArrowLeftRight, 
  MessageSquare, Star, AlertCircle, CheckCircle, Loader2,
  Search, Filter, FileText
} from 'lucide-react';
import { getVersionHistory, addVersionAnnotation } from '../../lib/versionHistoryApi';
import { VersionHistory, VersionHistoryPanelProps } from '../../types/versionHistory';

interface VersionHistoryPanelState {
  versions: VersionHistory[];
  loading: boolean;
  error: string | null;
  selectedVersion: number | null;
  searchTerm: string;
  filterTag: string;
}

export const VersionHistoryPanel: React.FC<VersionHistoryPanelProps> = ({
  articleId,
  currentVersion,
  onVersionSelect,
  onVersionCompare,
  onVersionRestore
}) => {
  const [state, setState] = useState<VersionHistoryPanelState>({
    versions: [],
    loading: true,
    error: null,
    selectedVersion: null,
    searchTerm: '',
    filterTag: ''
  });

  // Load version history
  useEffect(() => {
    loadVersionHistory();
  }, [articleId]);

  const loadVersionHistory = async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const result = await getVersionHistory(articleId);
      
      if (result.success && result.data) {
        setState(prev => ({
          ...prev,
          versions: result.data || [],
          loading: false
        }));
      } else {
        setState(prev => ({
          ...prev,
          error: result.error || 'Failed to load version history',
          loading: false
        }));
      }
    } catch (error) {
      console.error('Error loading version history:', error);
      setState(prev => ({
        ...prev,
        error: 'Unexpected error loading version history',
        loading: false
      }));
    }
  };

  // Filter versions based on search and filter criteria
  const filteredVersions = state.versions.filter(version => {
    const matchesSearch = !state.searchTerm || 
      version.change_summary?.toLowerCase().includes(state.searchTerm.toLowerCase()) ||
      version.user_email?.toLowerCase().includes(state.searchTerm.toLowerCase());
    
    const matchesFilter = !state.filterTag || version.version_tag === state.filterTag;
    
    return matchesSearch && matchesFilter;
  });

  // Handle version selection
  const handleVersionSelect = (version: VersionHistory) => {
    setState(prev => ({ ...prev, selectedVersion: version.version_number }));
    onVersionSelect?.(version);
  };

  // Handle version restore
  const handleVersionRestore = (version: VersionHistory) => {
    if (window.confirm(`Are you sure you want to restore version ${version.version_number}?`)) {
      onVersionRestore?.(version.version_number);
    }
  };

  // Get version tag styling
  const getVersionTagStyle = (tag: string) => {
    const baseClasses = "px-2 py-1 rounded-full text-xs font-medium";
    
    switch (tag) {
      case 'published':
        return `${baseClasses} bg-green-100 text-green-800`;
      case 'review':
        return `${baseClasses} bg-yellow-100 text-yellow-800`;
      case 'milestone':
        return `${baseClasses} bg-purple-100 text-purple-800`;
      case 'restored':
        return `${baseClasses} bg-blue-100 text-blue-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-700`;
    }
  };

  if (state.loading) {
    return (
      <div className="flex items-center justify-center p-6">
        <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
        <span className="ml-2 text-gray-600">Loading version history...</span>
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="p-6 text-center">
        <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
        <p className="text-red-600 mb-4">{state.error}</p>
        <button
          onClick={loadVersionHistory}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white border-l border-gray-200">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center">
            <History className="h-5 w-5 mr-2 text-gray-500" />
            Version History
          </h3>
          <span className="text-sm text-gray-500">
            {filteredVersions.length} version{filteredVersions.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Search and Filter */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search versions..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={state.searchTerm}
              onChange={(e) => setState(prev => ({ ...prev, searchTerm: e.target.value }))}
            />
          </div>

          <select
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={state.filterTag}
            onChange={(e) => setState(prev => ({ ...prev, filterTag: e.target.value }))}
          >
            <option value="">All versions</option>
            <option value="milestone">Milestones</option>
            <option value="published">Published</option>
            <option value="review">Review</option>
            <option value="restored">Restored</option>
          </select>
        </div>
      </div>

      {/* Version List */}
      <div className="flex-1 overflow-y-auto">
        {filteredVersions.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            <FileText className="h-8 w-8 mx-auto mb-2 text-gray-300" />
            <p>No versions found</p>
          </div>
        ) : (
          <div className="space-y-1 p-2">
            {filteredVersions.map((version) => (
              <div
                key={version.id}
                className={`p-3 rounded-lg border cursor-pointer transition-all ${
                  state.selectedVersion === version.version_number
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                } ${currentVersion === version.version_number ? 'ring-2 ring-green-200' : ''}`}
                onClick={() => handleVersionSelect(version)}
              >
                {/* Version Header */}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <FileText className="h-4 w-4 text-gray-500" />
                    <span className="font-medium text-gray-900">
                      Version {version.version_number}
                    </span>
                    {currentVersion === version.version_number && (
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full font-medium">
                        Current
                      </span>
                    )}
                  </div>
                  <span className={getVersionTagStyle(version.version_tag)}>
                    {version.version_tag.replace('_', ' ')}
                  </span>
                </div>

                {/* Metadata */}
                <div className="space-y-1 text-sm text-gray-600">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center">
                      <Clock className="h-3 w-3 mr-1" />
                      {new Date(version.created_at).toLocaleDateString()}
                    </div>
                    <div className="flex items-center">
                      <User className="h-3 w-3 mr-1" />
                      {version.user_email || 'Unknown'}
                    </div>
                  </div>
                </div>

                {/* Change Summary */}
                {version.change_summary && (
                  <div className="mt-2 p-2 bg-gray-50 rounded text-sm text-gray-700">
                    {version.change_summary}
                  </div>
                )}

                {/* Action Buttons */}
                {state.selectedVersion === version.version_number && (
                  <div className="mt-3 flex items-center space-x-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onVersionCompare?.(currentVersion || 1, version.version_number);
                      }}
                      className="flex items-center px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded hover:bg-purple-200"
                    >
                      <ArrowLeftRight className="h-3 w-3 mr-1" />
                      Compare
                    </button>
                    
                    {currentVersion !== version.version_number && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleVersionRestore(version);
                        }}
                        className="flex items-center px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
                      >
                        <RotateCcw className="h-3 w-3 mr-1" />
                        Restore
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}; 