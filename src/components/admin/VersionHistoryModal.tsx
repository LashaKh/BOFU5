import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  History, 
  X, 
  RotateCcw, 
  Eye, 
  Clock, 
  User,
  FileText,
  AlertTriangle,
  CheckCircle,
  Loader2,
  GitCompare
} from 'lucide-react';
import type { ArticleListItem } from '../../types/adminApi';
import { toast } from 'react-hot-toast';

interface ArticleVersion {
  id: string;
  version: number;
  content: string;
  created_at: string;
  created_by: string;
  created_by_email: string;
  status: 'draft' | 'editing' | 'review' | 'final';
  change_summary?: string;
  content_length: number;
}

interface VersionHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  article: ArticleListItem;
  onRestoreVersion: (versionId: string, version: ArticleVersion) => void;
}

export function VersionHistoryModal({
  isOpen,
  onClose,
  article,
  onRestoreVersion
}: VersionHistoryModalProps) {
  const [versions, setVersions] = useState<ArticleVersion[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<ArticleVersion | null>(null);
  const [previewContent, setPreviewContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [compareMode, setCompareMode] = useState(false);
  const [compareVersion, setCompareVersion] = useState<ArticleVersion | null>(null);

  // Mock version data - in real app, this would fetch from API
  const mockVersions: ArticleVersion[] = [
    {
      id: 'v5',
      version: 5,
      content: '<h1>Latest Version</h1><p>This is the current version of the article with all recent changes.</p>',
      created_at: new Date().toISOString(),
      created_by: article.user_id,
      created_by_email: article.user_email,
      status: article.editing_status as any,
      change_summary: 'Current version',
      content_length: 1250
    },
    {
      id: 'v4',
      version: 4,
      content: '<h1>Version 4</h1><p>Previous version with admin corrections and improvements.</p>',
      created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      created_by: 'admin-123',
      created_by_email: 'admin@example.com',
      status: 'review',
      change_summary: 'Admin corrections and style improvements',
      content_length: 1180
    },
    {
      id: 'v3',
      version: 3,
      content: '<h1>Version 3</h1><p>Updated content with new information and references.</p>',
      created_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
      created_by: article.user_id,
      created_by_email: article.user_email,
      status: 'editing',
      change_summary: 'Added new sections and references',
      content_length: 1050
    },
    {
      id: 'v2',
      version: 2,
      content: '<h1>Version 2</h1><p>Second iteration with basic structure and content.</p>',
      created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      created_by: article.user_id,
      created_by_email: article.user_email,
      status: 'draft',
      change_summary: 'Extended content and improved structure',
      content_length: 890
    },
    {
      id: 'v1',
      version: 1,
      content: '<h1>Initial Version</h1><p>This is the initial draft of the article.</p>',
      created_at: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
      created_by: article.user_id,
      created_by_email: article.user_email,
      status: 'draft',
      change_summary: 'Initial creation',
      content_length: 320
    }
  ];

  useEffect(() => {
    if (isOpen) {
      fetchVersions();
    }
  }, [isOpen]);

  const fetchVersions = async () => {
    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      setVersions(mockVersions);
    } catch (error) {
      console.error('Error fetching versions:', error);
      toast.error('Failed to fetch version history');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePreview = (version: ArticleVersion) => {
    setSelectedVersion(version);
    setPreviewContent(version.content);
    setShowPreview(true);
  };

  const handleRestore = async (version: ArticleVersion) => {
    setIsRestoring(true);
    try {
      // Simulate restore operation
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      onRestoreVersion(version.id, version);
      toast.success(`Article restored to version ${version.version}`);
      onClose();
    } catch (error) {
      console.error('Error restoring version:', error);
      toast.error('Failed to restore version');
    } finally {
      setIsRestoring(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-500/20 text-gray-400';
      case 'editing': return 'bg-yellow-500/20 text-yellow-400';
      case 'review': return 'bg-blue-500/20 text-blue-400';
      case 'final': return 'bg-green-500/20 text-green-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-gray-900 rounded-lg border-2 border-yellow-400/30 shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex justify-between items-center p-6 border-b border-secondary-700">
            <div className="flex items-center space-x-2">
              <History className="text-blue-400" size={20} />
              <h2 className="text-xl font-semibold text-blue-400">Version History</h2>
              <span className="text-sm text-gray-400">
                - {article.title || 'Untitled Article'}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCompareMode(!compareMode)}
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
                  compareMode 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-secondary-700 text-gray-300 hover:bg-secondary-600'
                }`}
              >
                <GitCompare size={16} />
                <span className="text-sm">Compare</span>
              </button>
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-secondary-700 transition-colors"
              >
                <X className="text-gray-400" size={20} />
              </button>
            </div>
          </div>

          <div className="flex h-[70vh]">
            {/* Version List */}
            <div className="w-1/2 border-r border-secondary-700 overflow-y-auto">
              <div className="p-4">
                <h3 className="text-sm font-medium text-primary-400 mb-4">
                  Article Versions ({versions.length})
                </h3>
                
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="animate-spin h-6 w-6 text-primary-400" />
                  </div>
                ) : (
                  <div className="space-y-3">
                    {versions.map((version, index) => (
                      <div
                        key={version.id}
                        className={`p-4 rounded-lg border transition-all ${
                          selectedVersion?.id === version.id
                            ? 'border-primary-500 bg-primary-500/20'
                            : 'border-secondary-600 hover:border-secondary-500 bg-secondary-700/50'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <span className="text-white font-medium">v{version.version}</span>
                            {index === 0 && (
                              <span className="px-2 py-1 bg-green-600 text-white text-xs rounded-full">
                                Current
                              </span>
                            )}
                            <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(version.status)}`}>
                              {version.status}
                            </span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <button
                              onClick={() => handlePreview(version)}
                              className="p-1 rounded hover:bg-secondary-600 text-gray-400 hover:text-white transition-colors"
                              title="Preview"
                            >
                              <Eye size={14} />
                            </button>
                            {index > 0 && (
                              <button
                                onClick={() => handleRestore(version)}
                                disabled={isRestoring}
                                className="p-1 rounded hover:bg-secondary-600 text-gray-400 hover:text-white transition-colors disabled:opacity-50"
                                title="Restore"
                              >
                                <RotateCcw size={14} />
                              </button>
                            )}
                          </div>
                        </div>
                        
                        <div className="space-y-1 text-sm">
                          <div className="flex items-center space-x-2 text-gray-400">
                            <User size={12} />
                            <span>{version.created_by_email}</span>
                          </div>
                          <div className="flex items-center space-x-2 text-gray-400">
                            <Clock size={12} />
                            <span>{formatRelativeTime(version.created_at)}</span>
                          </div>
                          <div className="flex items-center space-x-2 text-gray-400">
                            <FileText size={12} />
                            <span>{version.content_length} characters</span>
                          </div>
                        </div>
                        
                        {version.change_summary && (
                          <div className="mt-2 text-xs text-gray-300 italic">
                            {version.change_summary}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Preview Panel */}
            <div className="w-1/2 flex flex-col">
              <div className="p-4 border-b border-secondary-700">
                <h3 className="text-sm font-medium text-primary-400">
                  {selectedVersion ? `Preview - Version ${selectedVersion.version}` : 'Select a version to preview'}
                </h3>
              </div>
              
              <div className="flex-1 p-4 overflow-y-auto">
                {selectedVersion ? (
                  <div className="space-y-4">
                    {/* Version Details */}
                    <div className="bg-secondary-700/50 rounded-lg p-3">
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-gray-400">Created:</span>
                          <span className="text-white ml-2">
                            {new Date(selectedVersion.created_at).toLocaleString()}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400">Author:</span>
                          <span className="text-white ml-2">{selectedVersion.created_by_email}</span>
                        </div>
                        <div>
                          <span className="text-gray-400">Status:</span>
                          <span className="text-white ml-2 capitalize">{selectedVersion.status}</span>
                        </div>
                        <div>
                          <span className="text-gray-400">Size:</span>
                          <span className="text-white ml-2">{selectedVersion.content_length} chars</span>
                        </div>
                      </div>
                    </div>

                    {/* Content Preview */}
                    <div className="bg-white rounded-lg p-4">
                      <div 
                        className="prose prose-sm max-w-none"
                        dangerouslySetInnerHTML={{ __html: selectedVersion.content }}
                      />
                    </div>

                    {/* Action Buttons */}
                    {versions.findIndex(v => v.id === selectedVersion.id) > 0 && (
                      <div className="flex space-x-3">
                        <button
                          onClick={() => handleRestore(selectedVersion)}
                          disabled={isRestoring}
                          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {isRestoring ? (
                            <>
                              <Loader2 className="animate-spin" size={16} />
                              <span>Restoring...</span>
                            </>
                          ) : (
                            <>
                              <RotateCcw size={16} />
                              <span>Restore This Version</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}

                    {/* Restore Warning */}
                    {versions.findIndex(v => v.id === selectedVersion.id) > 0 && (
                      <div className="bg-yellow-900/20 border border-yellow-500/20 rounded-lg p-3">
                        <div className="flex items-center space-x-2 mb-1">
                          <AlertTriangle className="text-yellow-400" size={14} />
                          <span className="text-yellow-400 font-medium text-xs">Restore Warning</span>
                        </div>
                        <p className="text-yellow-300 text-xs">
                          Restoring this version will create a new version with this content. 
                          The current version will be preserved in history.
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-400">
                    <div className="text-center">
                      <History className="mx-auto h-12 w-12 mb-4 opacity-50" />
                      <p>Select a version from the list to preview its content</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
} 