import React, { useState } from 'react';
import { History, ChevronDown } from 'lucide-react';
import { VersionHistoryPanel } from './VersionHistoryPanel';
import { VersionComparisonView } from './VersionComparisonView';
import { VersionHistory } from '../../types/versionHistory';
import { restoreVersion } from '../../lib/versionHistoryApi';

interface VersionHistoryButtonProps {
  articleId?: string;
  currentVersion?: number;
  onVersionRestore?: (versionNumber: number) => void;
  className?: string;
}

export const VersionHistoryButton: React.FC<VersionHistoryButtonProps> = ({
  articleId,
  currentVersion,
  onVersionRestore,
  className = ''
}) => {
  const [showPanel, setShowPanel] = useState(false);
  const [showComparison, setShowComparison] = useState<{
    version1: number;
    version2: number;
  } | null>(null);

  if (!articleId) {
    return (
      <button
        disabled
        className={`flex items-center px-3 py-1.5 text-gray-400 cursor-not-allowed ${className}`}
        title="Save article to enable version history"
      >
        <History className="h-4 w-4 mr-1" />
        <span className="text-sm">Version History</span>
      </button>
    );
  }

  const handleVersionSelect = (version: VersionHistory) => {
    // Version selected logic can be implemented here if needed
    console.log('Version selected:', version);
  };

  const handleVersionCompare = (version1: number, version2: number) => {
    setShowComparison({ version1, version2 });
  };

  const handleVersionRestore = async (versionNumber: number) => {
    try {
      const result = await restoreVersion(articleId, versionNumber);
      
      if (result.success) {
        onVersionRestore?.(versionNumber);
        setShowPanel(false);
        // Show success notification
        console.log(`Successfully restored version ${versionNumber}`);
      } else {
        console.error('Failed to restore version:', result.error);
        // Show error notification
      }
    } catch (error) {
      console.error('Error restoring version:', error);
      // Show error notification
    }
  };

  const handleCloseComparison = () => {
    setShowComparison(null);
  };

  const handleRestoreFromComparison = (versionNumber: number) => {
    handleVersionRestore(versionNumber);
    setShowComparison(null);
  };

  return (
    <>
      {/* Version History Button */}
      <div className="relative">
        <button
          onClick={() => setShowPanel(!showPanel)}
          className={`flex items-center px-3 py-1.5 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors ${className}`}
          title="View version history"
        >
          <History className="h-4 w-4 mr-1" />
          <span className="text-sm">Version History</span>
          <ChevronDown className={`h-3 w-3 ml-1 transition-transform ${showPanel ? 'rotate-180' : ''}`} />
        </button>

        {/* Version History Panel */}
        {showPanel && (
          <>
            {/* Overlay */}
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setShowPanel(false)}
            />
            
            {/* Panel */}
            <div className="absolute right-0 top-full mt-2 w-96 h-96 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
              <VersionHistoryPanel
                articleId={articleId}
                currentVersion={currentVersion}
                onVersionSelect={handleVersionSelect}
                onVersionCompare={handleVersionCompare}
                onVersionRestore={handleVersionRestore}
              />
            </div>
          </>
        )}
      </div>

      {/* Version Comparison Modal */}
      {showComparison && (
        <VersionComparisonView
          articleId={articleId}
          version1Number={showComparison.version1}
          version2Number={showComparison.version2}
          onClose={handleCloseComparison}
          onRestore={handleRestoreFromComparison}
        />
      )}
    </>
  );
}; 