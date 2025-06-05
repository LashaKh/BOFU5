import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, ArrowLeftRight, Eye, EyeOff, Download, 
  FileText, Clock, User, AlertCircle, Loader2, CheckCircle 
} from 'lucide-react';
import { compareVersionsAdvanced, getVersion } from '../../lib/versionHistoryApi';
import { VersionHistory, VersionComparisonViewProps } from '../../types/versionHistory';

interface ComparisonState {
  version1: VersionHistory | null;
  version2: VersionHistory | null;
  diffHtml: string;
  patchData: string;
  loading: boolean;
  error: string | null;
  viewMode: 'side-by-side' | 'unified';
  diffType: 'lines' | 'words' | 'characters';
}

export const VersionComparisonView: React.FC<VersionComparisonViewProps> = ({
  articleId,
  version1Number,
  version2Number,
  onClose,
  onRestore
}) => {
  const [state, setState] = useState<ComparisonState>({
    version1: null,
    version2: null,
    diffHtml: '',
    patchData: '',
    loading: true,
    error: null,
    viewMode: 'side-by-side',
    diffType: 'lines'
  });

  useEffect(() => {
    loadVersionComparison();
  }, [articleId, version1Number, version2Number, state.diffType]);

  const loadVersionComparison = async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      // Load comparison data
      const result = await compareVersionsAdvanced(
        articleId, 
        version1Number, 
        version2Number, 
        state.diffType
      );

      if (result.success && result.data) {
        setState(prev => ({
          ...prev,
          version1: result.data!.version1,
          version2: result.data!.version2,
          diffHtml: result.data!.diff,
          patchData: result.data!.patchData || '',
          loading: false
        }));
      } else {
        setState(prev => ({
          ...prev,
          error: result.error || 'Failed to load version comparison',
          loading: false
        }));
      }
    } catch (error) {
      console.error('Error loading version comparison:', error);
      setState(prev => ({
        ...prev,
        error: 'Unexpected error loading version comparison',
        loading: false
      }));
    }
  };

  const handleRestore = (versionNumber: number) => {
    if (window.confirm(`Are you sure you want to restore version ${versionNumber}?`)) {
      onRestore?.(versionNumber);
    }
  };

  const downloadPatch = () => {
    if (state.patchData) {
      const blob = new Blob([state.patchData], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `version-${version1Number}-to-${version2Number}.patch`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  if (state.loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
            <span className="ml-2 text-gray-600">Loading comparison...</span>
          </div>
        </div>
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
          <div className="text-center">
            <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
            <p className="text-red-600 mb-4">{state.error}</p>
            <div className="flex justify-center space-x-3">
              <button
                onClick={loadVersionComparison}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Try Again
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-7xl w-full h-5/6 mx-4 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={onClose}
              className="flex items-center text-gray-600 hover:text-gray-800"
            >
              <ArrowLeft className="h-5 w-5 mr-1" />
              Back
            </button>
            <h2 className="text-xl font-semibold">
              Compare Versions {version1Number} ↔ {version2Number}
            </h2>
          </div>

          <div className="flex items-center space-x-3">
            {/* Diff Type Selector */}
            <select
              value={state.diffType}
              onChange={(e) => setState(prev => ({ 
                ...prev, 
                diffType: e.target.value as 'lines' | 'words' | 'characters' 
              }))}
              className="px-3 py-1 border border-gray-300 rounded text-sm"
            >
              <option value="lines">Line Diff</option>
              <option value="words">Word Diff</option>
              <option value="characters">Character Diff</option>
            </select>

            {/* View Mode Toggle */}
            <button
              onClick={() => setState(prev => ({
                ...prev,
                viewMode: prev.viewMode === 'side-by-side' ? 'unified' : 'side-by-side'
              }))}
              className="flex items-center px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
            >
              {state.viewMode === 'side-by-side' ? (
                <>
                  <Eye className="h-4 w-4 mr-1" />
                  Unified View
                </>
              ) : (
                <>
                  <ArrowLeftRight className="h-4 w-4 mr-1" />
                  Side by Side
                </>
              )}
            </button>

            {/* Download Patch */}
            {state.patchData && (
              <button
                onClick={downloadPatch}
                className="flex items-center px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
              >
                <Download className="h-4 w-4 mr-1" />
                Download Patch
              </button>
            )}
          </div>
        </div>

        {/* Version Info */}
        <div className="p-4 bg-gray-50 border-b border-gray-200">
          <div className="grid grid-cols-2 gap-6">
            {/* Version 1 Info */}
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <div>
                <div className="font-medium">Version {version1Number}</div>
                {state.version1 && (
                  <div className="text-sm text-gray-600 flex items-center space-x-4">
                    <span className="flex items-center">
                      <Clock className="h-3 w-3 mr-1" />
                      {new Date(state.version1.created_at).toLocaleDateString()}
                    </span>
                    <span className="flex items-center">
                      <User className="h-3 w-3 mr-1" />
                      {state.version1.user_email}
                    </span>
                  </div>
                )}
              </div>
              <button
                onClick={() => handleRestore(version1Number)}
                className="ml-auto px-3 py-1 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200"
              >
                Restore This Version
              </button>
            </div>

            {/* Version 2 Info */}
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <div>
                <div className="font-medium">Version {version2Number}</div>
                {state.version2 && (
                  <div className="text-sm text-gray-600 flex items-center space-x-4">
                    <span className="flex items-center">
                      <Clock className="h-3 w-3 mr-1" />
                      {new Date(state.version2.created_at).toLocaleDateString()}
                    </span>
                    <span className="flex items-center">
                      <User className="h-3 w-3 mr-1" />
                      {state.version2.user_email}
                    </span>
                  </div>
                )}
              </div>
              <button
                onClick={() => handleRestore(version2Number)}
                className="ml-auto px-3 py-1 bg-green-100 text-green-700 rounded text-sm hover:bg-green-200"
              >
                Restore This Version
              </button>
            </div>
          </div>
        </div>

        {/* Diff Content */}
        <div className="flex-1 overflow-hidden">
          {state.viewMode === 'side-by-side' ? (
            <div className="h-full grid grid-cols-2 gap-1">
              {/* Version 1 Content */}
              <div className="bg-red-50 border-r border-gray-200 overflow-y-auto">
                <div className="p-4">
                  <h3 className="font-medium text-red-800 mb-3">Version {version1Number}</h3>
                  <div className="prose max-w-none text-sm">
                    <pre className="whitespace-pre-wrap font-mono text-xs">
                      {state.version1?.content}
                    </pre>
                  </div>
                </div>
              </div>

              {/* Version 2 Content */}
              <div className="bg-green-50 overflow-y-auto">
                <div className="p-4">
                  <h3 className="font-medium text-green-800 mb-3">Version {version2Number}</h3>
                  <div className="prose max-w-none text-sm">
                    <pre className="whitespace-pre-wrap font-mono text-xs">
                      {state.version2?.content}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full overflow-y-auto">
              <div className="p-4">
                <h3 className="font-medium text-gray-800 mb-3">Unified Diff View</h3>
                <div 
                  className="prose max-w-none text-sm font-mono diff-content"
                  dangerouslySetInnerHTML={{ __html: state.diffHtml }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50 border-t border-gray-200">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div className="flex items-center space-x-4">
              <span className="flex items-center">
                <div className="w-3 h-3 bg-red-200 rounded mr-2"></div>
                Deletions
              </span>
              <span className="flex items-center">
                <div className="w-3 h-3 bg-green-200 rounded mr-2"></div>
                Additions
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <span>Diff Type: {state.diffType}</span>
              <span>•</span>
              <span>View: {state.viewMode}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Custom CSS for diff styling */}
      <style>{`
        .diff-content .diff-added {
          background-color: #d4edda;
          color: #155724;
          padding: 2px 4px;
          margin: 1px;
          border-radius: 3px;
        }
        .diff-content .diff-removed {
          background-color: #f8d7da;
          color: #721c24;
          padding: 2px 4px;
          margin: 1px;
          border-radius: 3px;
          text-decoration: line-through;
        }
        .diff-content .diff-unchanged {
          color: #6c757d;
        }
      `}</style>
    </div>
  );
}; 