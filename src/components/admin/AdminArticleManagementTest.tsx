import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Settings, 
  ArrowLeft, 
  CheckSquare, 
  User,
  Calendar,
  BookOpen,
  Shield
} from 'lucide-react';
import { AdminArticleList } from './AdminArticleList';
import { BulkOperationsPanel } from './BulkOperationsPanel';
import { OwnershipTransferModal } from './OwnershipTransferModal';
import { VersionHistoryModal } from './VersionHistoryModal';
import { MetadataEditorModal } from './MetadataEditorModal';
import type { ArticleListItem, UserProfile } from '../../types/adminApi';
import { toast } from 'react-hot-toast';

export function AdminArticleManagementTest() {
  const [selectedArticles, setSelectedArticles] = useState<ArticleListItem[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [showOwnershipModal, setShowOwnershipModal] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [showMetadataEditor, setShowMetadataEditor] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<ArticleListItem | null>(null);

  // Mock data
  const mockAdminUser: UserProfile = {
    id: 'admin-123',
    email: 'admin@bofu.ai',
    company_name: 'BOFU Admin',
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
    article_count: 0
  };

  const mockArticles: ArticleListItem[] = [
    {
      id: 'article-1',
      title: 'Advanced AI Marketing Strategies',
      product_name: 'MarketingAI Pro',
      user_id: 'user-1',
      user_email: 'john@company.com',
      user_company: 'Tech Corp',
      editing_status: 'review',
      last_edited_by: 'user-1',
      article_version: 3,
      created_at: '2024-01-15T10:00:00.000Z',
      last_edited_at: '2024-01-20T14:30:00.000Z',
      updated_at: '2024-01-20T14:30:00.000Z'
    },
    {
      id: 'article-2',
      title: 'Complete Guide to Sales Automation',
      product_name: 'SalesForce Pro',
      user_id: 'user-2',
      user_email: 'sarah@business.com',
      user_company: 'Business Solutions Inc',
      editing_status: 'editing',
      last_edited_by: 'user-2',
      article_version: 2,
      created_at: '2024-01-18T09:15:00.000Z',
      last_edited_at: '2024-01-22T11:45:00.000Z',
      updated_at: '2024-01-22T11:45:00.000Z'
    },
    {
      id: 'article-3',
      title: 'Customer Relationship Management Best Practices',
      product_name: 'CRM Master',
      user_id: 'user-1',
      user_email: 'john@company.com',
      user_company: 'Tech Corp',
      editing_status: 'draft',
      last_edited_by: 'user-1',
      article_version: 1,
      created_at: '2024-01-20T16:20:00.000Z',
      last_edited_at: '2024-01-20T16:20:00.000Z',
      updated_at: '2024-01-20T16:20:00.000Z'
    }
  ];

  const handleArticleSelection = (article: ArticleListItem) => {
    const isSelected = selectedArticles.some(a => a.id === article.id);
    if (isSelected) {
      setSelectedArticles(selectedArticles.filter(a => a.id !== article.id));
    } else {
      setSelectedArticles([...selectedArticles, article]);
    }
  };

  const handleClearSelection = () => {
    setSelectedArticles([]);
  };

  const handleBulkStatusUpdate = async (articleIds: string[], status: 'draft' | 'editing' | 'review' | 'final') => {
    // Simulate API call with some failures for testing
    const successful = articleIds.slice(0, Math.floor(articleIds.length * 0.8));
    const failed = articleIds.slice(successful.length).map(id => ({ id, error: 'Permission denied' }));
    
    return new Promise<{ successful: string[]; failed: { id: string; error: string }[] }>((resolve) => {
      setTimeout(() => {
        console.log(`Bulk status update to ${status}:`, { successful, failed });
        resolve({ successful, failed });
      }, 1000);
    });
  };

  const handleBulkDelete = async (articleIds: string[]) => {
    // Simulate API call
    const successful = articleIds;
    const failed: { id: string; error: string }[] = [];
    
    return new Promise<{ successful: string[]; failed: { id: string; error: string }[] }>((resolve) => {
      setTimeout(() => {
        console.log('Bulk delete:', { successful, failed });
        resolve({ successful, failed });
      }, 1000);
    });
  };

  const handleBulkExport = async (articleIds: string[]) => {
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        console.log('Bulk export:', articleIds);
        // Simulate file download
        const blob = new Blob(['Mock exported data'], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `exported-articles-${Date.now()}.txt`;
        link.click();
        URL.revokeObjectURL(url);
        resolve();
      }, 500);
    });
  };

  const handleBulkOwnershipTransfer = async (articleIds: string[], newOwnerId: string) => {
    // Simulate API call
    const successful = articleIds;
    const failed: { id: string; error: string }[] = [];
    
    return new Promise<{ successful: string[]; failed: { id: string; error: string }[] }>((resolve) => {
      setTimeout(() => {
        console.log('Bulk ownership transfer:', { articleIds, newOwnerId, successful, failed });
        resolve({ successful, failed });
      }, 1000);
    });
  };

  const handleOwnershipTransferComplete = (newOwnerId: string, newOwner: UserProfile) => {
    console.log('Ownership transfer completed:', { newOwnerId, newOwner });
    toast.success(`Article ownership transferred to ${newOwner.company_name || newOwner.email}`);
    setShowOwnershipModal(false);
  };

  const handleVersionRestore = (versionId: string, version: any) => {
    console.log('Version restore:', { versionId, version });
    toast.success(`Article restored to version ${version.version}`);
    setShowVersionHistory(false);
  };

  const handleMetadataSave = async (metadata: any) => {
    console.log('Metadata save:', metadata);
    toast.success('Metadata updated successfully');
  };

  const openOwnershipTransfer = (article: ArticleListItem) => {
    setSelectedArticle(article);
    setShowOwnershipModal(true);
  };

  const openVersionHistory = (article: ArticleListItem) => {
    setSelectedArticle(article);
    setShowVersionHistory(true);
  };

  const openMetadataEditor = (article: ArticleListItem) => {
    setSelectedArticle(article);
    setShowMetadataEditor(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-primary-500/20 rounded-lg">
                <Settings className="h-6 w-6 text-primary-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">
                  Admin Article Management Test
                </h1>
                <p className="text-gray-400">
                  Test all advanced admin article management features
                </p>
              </div>
            </div>
            <button
              onClick={() => window.history.back()}
              className="flex items-center space-x-2 px-4 py-2 bg-secondary-700 text-gray-300 rounded-lg hover:bg-secondary-600 transition-colors"
            >
              <ArrowLeft size={16} />
              <span>Back</span>
            </button>
          </div>

          {/* Feature Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-secondary-800/50 rounded-lg p-4 border border-secondary-700">
              <div className="flex items-center space-x-2 mb-2">
                <CheckSquare className="text-blue-400" size={16} />
                <span className="text-blue-400 font-medium text-sm">Bulk Operations</span>
              </div>
              <p className="text-gray-400 text-xs">
                Select multiple articles for batch operations
              </p>
            </div>
            
            <div className="bg-secondary-800/50 rounded-lg p-4 border border-secondary-700">
              <div className="flex items-center space-x-2 mb-2">
                <User className="text-purple-400" size={16} />
                <span className="text-purple-400 font-medium text-sm">Ownership Transfer</span>
              </div>
              <p className="text-gray-400 text-xs">
                Transfer article ownership between users
              </p>
            </div>
            
            <div className="bg-secondary-800/50 rounded-lg p-4 border border-secondary-700">
              <div className="flex items-center space-x-2 mb-2">
                <Calendar className="text-orange-400" size={16} />
                <span className="text-orange-400 font-medium text-sm">Version History</span>
              </div>
              <p className="text-gray-400 text-xs">
                View and restore previous article versions
              </p>
            </div>
            
            <div className="bg-secondary-800/50 rounded-lg p-4 border border-secondary-700">
              <div className="flex items-center space-x-2 mb-2">
                <BookOpen className="text-green-400" size={16} />
                <span className="text-green-400 font-medium text-sm">Metadata Editor</span>
              </div>
              <p className="text-gray-400 text-xs">
                Edit enhanced article metadata and settings
              </p>
            </div>
          </div>
        </motion.div>

        {/* Test Instructions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-secondary-800/50 rounded-lg p-6 mb-6 border border-secondary-700"
        >
          <div className="flex items-center space-x-2 mb-4">
            <Shield className="text-primary-400" size={20} />
            <h2 className="text-lg font-semibold text-primary-400">Testing Instructions</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-white font-medium mb-2">Bulk Operations Testing:</h3>
              <ul className="text-sm text-gray-400 space-y-1">
                <li>• Select multiple articles using checkboxes</li>
                <li>• Test bulk status changes (draft, editing, review, final)</li>
                <li>• Try bulk export functionality</li>
                <li>• Test bulk delete with confirmation</li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-white font-medium mb-2">Individual Features Testing:</h3>
              <ul className="text-sm text-gray-400 space-y-1">
                <li>• Click on article actions to test ownership transfer</li>
                <li>• Test version history viewing and restoration</li>
                <li>• Try enhanced metadata editing</li>
                <li>• All modals include mock data and interactions</li>
              </ul>
            </div>
          </div>
        </motion.div>

        {/* Article Management Interface */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <AdminArticleList
            selectedUser={selectedUser}
            onArticleSelect={handleArticleSelection}
            onOpenOwnershipTransfer={openOwnershipTransfer}
            onOpenVersionHistory={openVersionHistory}
            onOpenMetadataEditor={openMetadataEditor}
          />
        </motion.div>

        {/* Bulk Operations Panel */}
        <BulkOperationsPanel
          selectedArticles={selectedArticles}
          onClearSelection={handleClearSelection}
          onStatusUpdate={handleBulkStatusUpdate}
          onDelete={handleBulkDelete}
          onExport={handleBulkExport}
          onOwnershipTransfer={handleBulkOwnershipTransfer}
        />

        {/* Modals */}
        {selectedArticle && (
          <>
            <OwnershipTransferModal
              isOpen={showOwnershipModal}
              onClose={() => setShowOwnershipModal(false)}
              article={selectedArticle}
              currentUser={mockAdminUser}
              onTransferComplete={handleOwnershipTransferComplete}
            />

            <VersionHistoryModal
              isOpen={showVersionHistory}
              onClose={() => setShowVersionHistory(false)}
              article={selectedArticle}
              onRestoreVersion={handleVersionRestore}
            />

            <MetadataEditorModal
              isOpen={showMetadataEditor}
              onClose={() => setShowMetadataEditor(false)}
              article={selectedArticle}
              onSaveMetadata={handleMetadataSave}
            />
          </>
        )}
      </div>
    </div>
  );
} 