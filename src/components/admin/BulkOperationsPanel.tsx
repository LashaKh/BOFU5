import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckSquare, 
  X, 
  Trash2, 
  Download, 
  Edit3, 
  Users, 
  AlertTriangle,
  Loader2,
  FileText,
  CheckCircle,
  XCircle
} from 'lucide-react';
import type { ArticleListItem } from '../../types/adminApi';
import { toast } from 'react-hot-toast';

interface BulkOperationsResult {
  successful: string[];
  failed: { id: string; error: string }[];
}

interface BulkOperationsPanelProps {
  selectedArticles: ArticleListItem[];
  onClearSelection: () => void;
  onStatusUpdate: (articleIds: string[], status: 'draft' | 'editing' | 'review' | 'final') => Promise<BulkOperationsResult>;
  onDelete: (articleIds: string[]) => Promise<BulkOperationsResult>;
  onExport: (articleIds: string[]) => Promise<void>;
  onOwnershipTransfer: (articleIds: string[], newOwnerId: string) => Promise<BulkOperationsResult>;
}

export function BulkOperationsPanel({
  selectedArticles,
  onClearSelection,
  onStatusUpdate,
  onDelete,
  onExport,
  onOwnershipTransfer
}: BulkOperationsPanelProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [currentOperation, setCurrentOperation] = useState<string>('');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmationAction, setConfirmationAction] = useState<() => Promise<void>>(() => async () => {});
  const [confirmationMessage, setConfirmationMessage] = useState('');
  const [lastResult, setLastResult] = useState<BulkOperationsResult | null>(null);
  const [showResults, setShowResults] = useState(false);

  const statusOptions = [
    { value: 'draft', label: 'Draft', color: 'bg-gray-500/20 text-gray-400' },
    { value: 'editing', label: 'Editing', color: 'bg-yellow-500/20 text-yellow-400' },
    { value: 'review', label: 'Review', color: 'bg-blue-500/20 text-blue-400' },
    { value: 'final', label: 'Final', color: 'bg-green-500/20 text-green-400' }
  ];

  const handleStatusUpdate = async (status: 'draft' | 'editing' | 'review' | 'final') => {
    const action = async () => {
      setIsLoading(true);
      setCurrentOperation(`Updating ${selectedArticles.length} articles to ${status}`);
      
      try {
        const articleIds = selectedArticles.map(article => article.id);
        const result = await onStatusUpdate(articleIds, status);
        setLastResult(result);
        setShowResults(true);
        
        if (result.successful.length > 0) {
          toast.success(`Updated ${result.successful.length} articles to ${status}`);
        }
        if (result.failed.length > 0) {
          toast.error(`Failed to update ${result.failed.length} articles`);
        }
      } catch (error) {
        console.error('Bulk status update failed:', error);
        toast.error('Bulk status update failed');
      } finally {
        setIsLoading(false);
        setCurrentOperation('');
      }
    };

    setConfirmationMessage(`Change status of ${selectedArticles.length} articles to "${status}"?`);
    setConfirmationAction(() => action);
    setShowConfirmation(true);
  };

  const handleDelete = async () => {
    const action = async () => {
      setIsLoading(true);
      setCurrentOperation(`Deleting ${selectedArticles.length} articles`);
      
      try {
        const articleIds = selectedArticles.map(article => article.id);
        const result = await onDelete(articleIds);
        setLastResult(result);
        setShowResults(true);
        
        if (result.successful.length > 0) {
          toast.success(`Deleted ${result.successful.length} articles`);
          onClearSelection();
        }
        if (result.failed.length > 0) {
          toast.error(`Failed to delete ${result.failed.length} articles`);
        }
      } catch (error) {
        console.error('Bulk delete failed:', error);
        toast.error('Bulk delete failed');
      } finally {
        setIsLoading(false);
        setCurrentOperation('');
      }
    };

    setConfirmationMessage(`Permanently delete ${selectedArticles.length} articles? This action cannot be undone.`);
    setConfirmationAction(() => action);
    setShowConfirmation(true);
  };

  const handleExport = async () => {
    setIsLoading(true);
    setCurrentOperation(`Exporting ${selectedArticles.length} articles`);
    
    try {
      const articleIds = selectedArticles.map(article => article.id);
      await onExport(articleIds);
      toast.success(`Exported ${selectedArticles.length} articles`);
    } catch (error) {
      console.error('Bulk export failed:', error);
      toast.error('Bulk export failed');
    } finally {
      setIsLoading(false);
      setCurrentOperation('');
    }
  };

  const executeConfirmedAction = async () => {
    setShowConfirmation(false);
    await confirmationAction();
  };

  const ArticleCounter = () => (
    <div className="flex items-center space-x-2 text-sm text-primary-400">
      <CheckSquare size={16} />
      <span>{selectedArticles.length} article{selectedArticles.length !== 1 ? 's' : ''} selected</span>
    </div>
  );

  if (selectedArticles.length === 0) return null;

  return (
    <>
      {/* Main Panel - Enhanced Design */}
      <motion.div
        initial={{ opacity: 0, y: 100, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 100, scale: 0.9 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-40"
      >
        {/* Enhanced Panel Container */}
        <div className="bg-gray-800/95 backdrop-blur-xl border border-gray-600/40 rounded-2xl shadow-2xl shadow-black/20 p-6 min-w-[600px]">
          {/* Header Section */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-10 h-10 bg-yellow-500/20 rounded-xl border border-yellow-400/30">
                <CheckSquare className="text-yellow-400" size={20} />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">
                  {selectedArticles.length} Article{selectedArticles.length !== 1 ? 's' : ''} Selected
                </h3>
                <p className="text-sm text-gray-400">Choose an action to apply to selected articles</p>
              </div>
            </div>
            <button
              onClick={onClearSelection}
              className="flex items-center justify-center w-9 h-9 rounded-xl bg-gray-700/50 hover:bg-gray-600/50 text-gray-400 hover:text-white transition-all duration-200 group"
              title="Clear Selection"
            >
              <X size={18} className="group-hover:rotate-90 transition-transform duration-200" />
            </button>
          </div>

          {isLoading ? (
            /* Loading State */
            <div className="flex items-center justify-center py-8">
              <div className="flex items-center space-x-4">
                <div className="flex items-center justify-center w-12 h-12 bg-yellow-500/20 rounded-xl border border-yellow-400/30">
                  <Loader2 className="animate-spin text-yellow-400" size={24} />
                </div>
                <div>
                  <p className="text-white font-medium">{currentOperation}</p>
                  <p className="text-sm text-gray-400">Please wait while we process your request...</p>
                </div>
              </div>
            </div>
          ) : (
            /* Action Controls */
            <div className="space-y-6">
              {/* Status Update Section */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  Update Status
                </label>
                <div className="grid grid-cols-4 gap-3">
                  {statusOptions.map((status) => (
                    <motion.button
                      key={status.value}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleStatusUpdate(status.value as any)}
                      className={`relative p-4 rounded-xl border transition-all duration-200 group ${status.color} hover:border-current/40 hover:shadow-lg hover:shadow-current/20`}
                      title={`Set to ${status.label}`}
                    >
                      <div className="text-center">
                        <div className="text-sm font-semibold mb-1">{status.label}</div>
                        <div className="text-xs opacity-70">Click to apply</div>
                      </div>
                      <div className="absolute inset-0 bg-current/5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Action Buttons Section */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  Bulk Actions
                </label>
                <div className="flex items-center space-x-4">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleExport}
                    className="flex items-center space-x-3 px-6 py-3 bg-blue-600/90 hover:bg-blue-600 text-white rounded-xl border border-blue-500/30 hover:border-blue-400/50 transition-all duration-200 shadow-lg hover:shadow-blue-500/20 group"
                    title="Export Selected Articles"
                  >
                    <Download size={18} className="group-hover:translate-y-0.5 transition-transform duration-200" />
                    <span className="font-medium">Export Articles</span>
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleDelete}
                    className="flex items-center space-x-3 px-6 py-3 bg-red-600/90 hover:bg-red-600 text-white rounded-xl border border-red-500/30 hover:border-red-400/50 transition-all duration-200 shadow-lg hover:shadow-red-500/20 group"
                    title="Delete Selected Articles"
                  >
                    <Trash2 size={18} className="group-hover:rotate-12 transition-transform duration-200" />
                    <span className="font-medium">Delete Articles</span>
                  </motion.button>
                </div>
              </div>
            </div>
          )}

          {/* Visual Enhancement - Bottom Glow */}
          <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-yellow-400/50 to-transparent" />
        </div>
      </motion.div>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {showConfirmation && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4"
            onClick={() => setShowConfirmation(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-gray-900 rounded-lg border-2 border-yellow-400/30 shadow-2xl max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-center space-x-2 mb-4">
                  <AlertTriangle className="text-yellow-400" size={20} />
                  <h3 className="text-lg font-semibold text-yellow-400">Confirm Bulk Operation</h3>
                </div>
                
                <p className="text-white mb-6">{confirmationMessage}</p>

                <div className="flex space-x-3">
                  <button
                    onClick={() => setShowConfirmation(false)}
                    className="flex-1 px-4 py-2 bg-gray-700 text-gray-200 rounded-lg hover:bg-gray-600 transition-colors border border-gray-600"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={executeConfirmedAction}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors border border-red-500"
                  >
                    Confirm
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results Modal */}
      <AnimatePresence>
        {showResults && lastResult && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4"
            onClick={() => setShowResults(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-gray-900 rounded-lg border-2 border-yellow-400/30 shadow-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-yellow-400">Operation Results</h3>
                  <button
                    onClick={() => setShowResults(false)}
                    className="p-1 rounded hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Success Results */}
                  {lastResult.successful.length > 0 && (
                    <div className="bg-green-900/20 border border-green-500/20 rounded-lg p-3">
                      <div className="flex items-center space-x-2 mb-2">
                        <CheckCircle className="text-green-400" size={16} />
                        <span className="text-green-400 font-medium">
                          {lastResult.successful.length} Successful
                        </span>
                      </div>
                      <div className="text-sm text-green-300">
                        Operations completed successfully for {lastResult.successful.length} articles.
                      </div>
                    </div>
                  )}

                  {/* Failed Results */}
                  {lastResult.failed.length > 0 && (
                    <div className="bg-red-900/20 border border-red-500/20 rounded-lg p-3">
                      <div className="flex items-center space-x-2 mb-2">
                        <XCircle className="text-red-400" size={16} />
                        <span className="text-red-400 font-medium">
                          {lastResult.failed.length} Failed
                        </span>
                      </div>
                      <div className="space-y-1 text-sm">
                        {lastResult.failed.map((failure, index) => (
                          <div key={index} className="text-red-300">
                            Article {failure.id}: {failure.error}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-end mt-6">
                  <button
                    onClick={() => setShowResults(false)}
                    className="px-4 py-2 bg-yellow-500 text-black rounded-lg hover:bg-yellow-400 transition-colors border border-yellow-400"
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
} 