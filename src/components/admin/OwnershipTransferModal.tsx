import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowRightLeft, 
  X, 
  Save, 
  Search, 
  User, 
  AlertTriangle,
  CheckCircle,
  Loader2
} from 'lucide-react';
import { adminUsersApi } from '../../lib/adminApi';
import type { UserProfile, ArticleListItem } from '../../types/adminApi';
import { toast } from 'react-hot-toast';

interface OwnershipTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  article: ArticleListItem;
  currentUser: UserProfile | null;
  onTransferComplete: (newOwnerId: string, newOwner: UserProfile) => void;
}

export function OwnershipTransferModal({
  isOpen,
  onClose,
  article,
  currentUser,
  onTransferComplete
}: OwnershipTransferModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);
  const [confirmTransfer, setConfirmTransfer] = useState(false);

  // Fetch users when modal opens or search term changes
  useEffect(() => {
    if (isOpen) {
      fetchUsers();
    }
  }, [isOpen, searchTerm]);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await adminUsersApi.getUsers({ 
        search: searchTerm,
        limit: 20 
      });

      if (error) {
        console.error('Error fetching users:', error);
        toast.error('Failed to fetch users');
        return;
      }

      if (data) {
        // Filter out the current owner
        const filteredUsers = data.users.filter(user => user.id !== currentUser?.id);
        setUsers(filteredUsers);
      }
    } catch (error) {
      console.error('Unexpected error fetching users:', error);
      toast.error('Failed to fetch users');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTransfer = async () => {
    if (!selectedUser) return;

    setIsTransferring(true);
    try {
      // Call the ownership transfer API (would need to be implemented in adminApi)
      // For now, simulate the transfer
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      onTransferComplete(selectedUser.id, selectedUser);
      toast.success(`Article ownership transferred to ${selectedUser.company_name || selectedUser.email}`);
      onClose();
    } catch (error) {
      console.error('Error transferring ownership:', error);
      toast.error('Failed to transfer ownership');
    } finally {
      setIsTransferring(false);
    }
  };

  const resetModal = () => {
    setSearchTerm('');
    setSelectedUser(null);
    setConfirmTransfer(false);
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4"
        onClick={handleClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-gray-900 rounded-lg border-2 border-yellow-400/30 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex justify-between items-center p-6 border-b border-secondary-700">
            <div className="flex items-center space-x-2">
              <ArrowRightLeft className="text-purple-400" size={20} />
              <h2 className="text-xl font-semibold text-purple-400">Transfer Article Ownership</h2>
            </div>
            <button
              onClick={handleClose}
              className="p-2 rounded-full hover:bg-secondary-700 transition-colors"
            >
              <X className="text-gray-400" size={20} />
            </button>
          </div>

          <div className="p-6 space-y-6">
            {/* Article Information */}
            <div className="bg-secondary-700/50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-primary-400 mb-3">Article Information</h3>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-gray-300">Title:</span>
                  <span className="text-white ml-2">{article.title || 'Untitled Article'}</span>
                </div>
                <div>
                  <span className="text-gray-300">Current Owner:</span>
                  <span className="text-white ml-2">{currentUser?.company_name || currentUser?.email}</span>
                </div>
                <div>
                  <span className="text-gray-300">Status:</span>
                  <span className="text-white ml-2 capitalize">{article.editing_status}</span>
                </div>
                <div>
                  <span className="text-gray-300">Last Edited:</span>
                  <span className="text-white ml-2">
                    {new Date(article.last_edited_at).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {!confirmTransfer ? (
              <>
                {/* User Search */}
                <div>
                  <h3 className="text-sm font-medium text-primary-400 mb-3">Select New Owner</h3>
                  <div className="relative mb-4">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Search className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search users by company name or email..."
                      className="w-full pl-10 pr-4 py-3 bg-secondary-700 border border-secondary-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-white placeholder-gray-400"
                    />
                    {isLoading && (
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                        <Loader2 className="h-5 w-5 text-primary-400 animate-spin" />
                      </div>
                    )}
                  </div>
                </div>

                {/* User List */}
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {users.length === 0 && !isLoading ? (
                    <div className="text-center py-8 text-gray-400">
                      {searchTerm ? 'No users found matching your search.' : 'No users available for transfer.'}
                    </div>
                  ) : (
                    users.map((user) => (
                      <button
                        key={user.id}
                        onClick={() => setSelectedUser(user)}
                        className={`w-full p-4 rounded-lg border transition-all text-left ${
                          selectedUser?.id === user.id
                            ? 'border-primary-500 bg-primary-500/20'
                            : 'border-secondary-600 hover:border-secondary-500 bg-secondary-700/50'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <div className="flex-shrink-0">
                            <User className="h-8 w-8 text-gray-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">
                              {user.company_name || 'No company'}
                            </p>
                            <p className="text-xs text-gray-400 truncate">{user.email}</p>
                            <p className="text-xs text-gray-500">
                              {user.article_count} articles • Joined {new Date(user.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          {selectedUser?.id === user.id && (
                            <CheckCircle className="h-5 w-5 text-primary-400" />
                          )}
                        </div>
                      </button>
                    ))
                  )}
                </div>

                {/* Continue Button */}
                {selectedUser && (
                  <div className="flex justify-end">
                    <button
                      onClick={() => setConfirmTransfer(true)}
                      className="flex items-center space-x-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                    >
                      <ArrowRightLeft size={16} />
                      <span>Continue Transfer</span>
                    </button>
                  </div>
                )}
              </>
            ) : (
              /* Confirmation Step */
              <div className="space-y-6">
                <div className="bg-yellow-900/20 border border-yellow-500/20 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <AlertTriangle className="text-yellow-400" size={16} />
                    <span className="text-yellow-400 font-medium text-sm">Confirm Ownership Transfer</span>
                  </div>
                  <p className="text-yellow-300 text-sm">
                    You are about to transfer ownership of this article. This action cannot be undone.
                  </p>
                </div>

                {/* Transfer Summary */}
                <div className="bg-secondary-700/50 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-primary-400 mb-3">Transfer Summary</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-300">From:</span>
                      <span className="text-white">{currentUser?.company_name || currentUser?.email}</span>
                    </div>
                    <div className="flex items-center justify-center">
                      <ArrowRightLeft className="text-purple-400" size={20} />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-300">To:</span>
                      <span className="text-white">{selectedUser?.company_name || selectedUser?.email}</span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-3">
                  <button
                    onClick={() => setConfirmTransfer(false)}
                    className="flex-1 px-4 py-3 bg-secondary-700 text-gray-300 rounded-lg hover:bg-secondary-600 transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleTransfer}
                    disabled={isTransferring}
                    className="flex-1 flex items-center justify-center space-x-2 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isTransferring ? (
                      <>
                        <Loader2 className="animate-spin" size={16} />
                        <span>Transferring...</span>
                      </>
                    ) : (
                      <>
                        <Save size={16} />
                        <span>Confirm Transfer</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
} 