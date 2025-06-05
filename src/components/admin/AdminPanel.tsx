import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Shield, 
  X, 
  Save, 
  AlertTriangle, 
  Crown, 
  History, 
  ArrowRightLeft,
  Edit3,
  User,
  Clock,
  Settings
} from 'lucide-react';
import { OwnershipTransferModal } from './OwnershipTransferModal';
import { VersionHistoryModal } from './VersionHistoryModal';
import { MetadataEditorModal } from './MetadataEditorModal';
import type { UserProfile, ArticleListItem } from '../../types/adminApi';
import { toast } from 'react-hot-toast';

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
  adminUser: UserProfile;
  originalAuthor: UserProfile;
  article: ArticleListItem;
  currentStatus: 'draft' | 'editing' | 'review' | 'final' | 'published';
  adminNotes: string;
  onStatusChange: (status: 'draft' | 'editing' | 'review' | 'final' | 'published') => void;
  onOwnershipTransfer: (newOwnerId: string, newOwner: UserProfile) => void;
  onAdminNote: (notes: string) => void;
}

export function AdminPanel({
  isOpen,
  onClose,
  adminUser,
  originalAuthor,
  article,
  currentStatus,
  adminNotes,
  onStatusChange,
  onOwnershipTransfer,
  onAdminNote
}: AdminPanelProps) {
  const [notes, setNotes] = useState(adminNotes);
  const [showOwnershipTransfer, setShowOwnershipTransfer] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [showMetadataEditor, setShowMetadataEditor] = useState(false);
  const [isSavingNotes, setIsSavingNotes] = useState(false);

  const statusOptions = [
    { value: 'draft', label: 'Draft', color: 'bg-gray-500/20 text-gray-400', description: 'Initial draft or work in progress' },
    { value: 'editing', label: 'Editing', color: 'bg-yellow-500/20 text-yellow-400', description: 'Currently being edited or reviewed' },
    { value: 'review', label: 'Review', color: 'bg-blue-500/20 text-blue-400', description: 'Ready for editorial review' },
    { value: 'final', label: 'Final', color: 'bg-green-500/20 text-green-400', description: 'Completed and ready for publication' },
    { value: 'published', label: 'Published', color: 'bg-purple-500/20 text-purple-400', description: 'Article has been published' }
  ];

  const handleSaveNotes = async () => {
    setIsSavingNotes(true);
    try {
      onAdminNote(notes);
      toast.success('Admin notes saved');
    } catch (error) {
      console.error('Error saving notes:', error);
      toast.error('Failed to save notes');
    } finally {
      setIsSavingNotes(false);
    }
  };

  const handleOwnershipTransferComplete = (newOwnerId: string, newOwner: UserProfile) => {
    onOwnershipTransfer(newOwnerId, newOwner);
    setShowOwnershipTransfer(false);
  };

  const handleVersionRestore = async (versionId: string, version: any) => {
    try {
      // This would typically call an API to restore the version
      console.log('Restoring version:', versionId, version);
      toast.success(`Article restored to version ${version.version}`);
      setShowVersionHistory(false);
    } catch (error) {
      console.error('Error restoring version:', error);
      toast.error('Failed to restore version');
    }
  };

  const handleMetadataSave = async (metadata: any) => {
    try {
      // This would typically call an API to save the metadata
      console.log('Saving metadata:', metadata);
      toast.success('Metadata updated successfully');
    } catch (error) {
      console.error('Error saving metadata:', error);
      toast.error('Failed to save metadata');
    }
  };

  if (!isOpen) return null;

  return (
    <>
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
            className="bg-gray-900 rounded-lg border-2 border-yellow-400/30 shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex justify-between items-center p-6 border-b border-secondary-700">
              <div className="flex items-center space-x-2">
                <Shield className="text-red-400" size={20} />
                <h2 className="text-xl font-semibold text-red-400">Admin Control Panel</h2>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-secondary-700 transition-colors"
              >
                <X className="text-gray-400" size={20} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Admin Context */}
              <div className="bg-red-900/20 border border-red-500/20 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-3">
                  <AlertTriangle className="text-red-400" size={16} />
                  <span className="text-red-400 font-medium text-sm">Admin Access Warning</span>
                </div>
                <p className="text-red-300 text-sm mb-3">
                  You are accessing this article with admin privileges. All actions will be logged for audit purposes.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-300">Admin User:</span>
                    <span className="text-white ml-2">{adminUser.email}</span>
                  </div>
                  <div>
                    <span className="text-gray-300">Original Author:</span>
                    <span className="text-white ml-2">{originalAuthor.company_name || originalAuthor.email}</span>
                  </div>
                  <div>
                    <span className="text-gray-300">Access Time:</span>
                    <span className="text-white ml-2">{new Date().toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-gray-300">Article ID:</span>
                    <span className="text-white ml-2">{article.id}</span>
                  </div>
                </div>
              </div>

              {/* Status Management */}
              <div className="bg-secondary-700/50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-primary-400 mb-4">Article Status Management</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {statusOptions.map((status) => (
                    <button
                      key={status.value}
                      onClick={() => onStatusChange(status.value as any)}
                      className={`p-3 rounded-lg border transition-all text-left ${
                        currentStatus === status.value
                          ? 'border-primary-500 bg-primary-500/20'
                          : 'border-secondary-600 hover:border-secondary-500 bg-secondary-700/50'
                      }`}
                    >
                      <div className={`text-sm font-medium mb-1 ${status.color}`}>
                        {status.label}
                      </div>
                      <div className="text-xs text-gray-400">
                        {status.description}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Advanced Actions */}
              <div className="bg-secondary-700/50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-primary-400 mb-4">Advanced Management Actions</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <button
                    onClick={() => setShowVersionHistory(true)}
                    className="flex items-center space-x-3 p-4 bg-secondary-700 rounded-lg hover:bg-secondary-600 transition-colors text-left"
                  >
                    <History className="text-blue-400" size={20} />
                    <div>
                      <div className="text-white font-medium">Version History</div>
                      <div className="text-sm text-gray-400">View and restore previous versions</div>
                    </div>
                  </button>
                  
                  <button
                    onClick={() => setShowOwnershipTransfer(true)}
                    className="flex items-center space-x-3 p-4 bg-secondary-700 rounded-lg hover:bg-secondary-600 transition-colors text-left"
                  >
                    <ArrowRightLeft className="text-purple-400" size={20} />
                    <div>
                      <div className="text-white font-medium">Transfer Ownership</div>
                      <div className="text-sm text-gray-400">Reassign article to another user</div>
                    </div>
                  </button>

                  <button
                    onClick={() => setShowMetadataEditor(true)}
                    className="flex items-center space-x-3 p-4 bg-secondary-700 rounded-lg hover:bg-secondary-600 transition-colors text-left"
                  >
                    <Edit3 className="text-orange-400" size={20} />
                    <div>
                      <div className="text-white font-medium">Edit Metadata</div>
                      <div className="text-sm text-gray-400">Modify article metadata and settings</div>
                    </div>
                  </button>

                  <button
                    className="flex items-center space-x-3 p-4 bg-secondary-700 rounded-lg hover:bg-secondary-600 transition-colors text-left"
                    onClick={() => {
                      // This would open a detailed audit log for this specific article
                      console.log('Opening audit log for article:', article.id);
                      toast.success('Audit log feature would open here');
                    }}
                  >
                    <Settings className="text-cyan-400" size={20} />
                    <div>
                      <div className="text-white font-medium">Audit Log</div>
                      <div className="text-sm text-gray-400">View detailed action history</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Internal Admin Notes */}
              <div className="bg-secondary-700/50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-primary-400 mb-4">Internal Admin Notes</h3>
                <p className="text-xs text-gray-400 mb-3">
                  These notes are only visible to admin users and will be included in the audit trail.
                </p>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add internal notes about this article or admin actions taken..."
                  className="w-full h-24 px-3 py-2 bg-secondary-700 border border-secondary-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-white placeholder-gray-400 resize-none"
                />
                <div className="flex justify-end mt-3">
                  <button
                    onClick={handleSaveNotes}
                    disabled={isSavingNotes || notes === adminNotes}
                    className="flex items-center space-x-2 px-4 py-2 bg-primary-500 text-black rounded-lg hover:bg-primary-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Save size={16} />
                    <span>{isSavingNotes ? 'Saving...' : 'Save Notes'}</span>
                  </button>
                </div>
              </div>

              {/* Security Notice */}
              <div className="bg-blue-900/20 border border-blue-500/20 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <Shield className="text-blue-400" size={16} />
                  <span className="text-blue-400 font-medium text-sm">Security & Audit Trail</span>
                </div>
                <p className="text-blue-300 text-sm">
                  All admin actions on this article are automatically logged with timestamps, user information, and action details. 
                  This ensures complete accountability and traceability for compliance and security purposes.
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>

      {/* Advanced Feature Modals */}
      <OwnershipTransferModal
        isOpen={showOwnershipTransfer}
        onClose={() => setShowOwnershipTransfer(false)}
        article={article}
        currentUser={originalAuthor}
        onTransferComplete={handleOwnershipTransferComplete}
      />

      <VersionHistoryModal
        isOpen={showVersionHistory}
        onClose={() => setShowVersionHistory(false)}
        article={article}
        onRestoreVersion={handleVersionRestore}
      />

      <MetadataEditorModal
        isOpen={showMetadataEditor}
        onClose={() => setShowMetadataEditor(false)}
        article={article}
        onSaveMetadata={handleMetadataSave}
      />
    </>
  );
} 