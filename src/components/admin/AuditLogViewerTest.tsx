import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { AuditLogViewer } from './AuditLogViewer';
import { 
  auditLogger, 
  logArticleView, 
  logStatusChange, 
  logOwnershipTransfer, 
  logBulkOperation,
  logArticleDelete,
  logArticleExport
} from '../../lib/auditLogger';
import { toast } from 'react-hot-toast';
import { 
  Activity, 
  Shield, 
  Eye, 
  Edit, 
  RefreshCw, 
  Users, 
  Trash2, 
  Download,
  FileText,
  Play
} from 'lucide-react';

export function AuditLogViewerTest() {
  const [isLogging, setIsLogging] = useState(false);

  // Mock article IDs for testing
  const testArticleIds = ['article-1', 'article-2', 'article-3'];

  // Test audit logging functions
  const testLogArticleView = async () => {
    setIsLogging(true);
    try {
      await logArticleView('article-test-1', 'Test article view from audit log viewer test');
      toast.success('Article view logged successfully');
    } catch (error) {
      toast.error('Failed to log article view');
    } finally {
      setIsLogging(false);
    }
  };

  const testLogStatusChange = async () => {
    setIsLogging(true);
    try {
      await logStatusChange('article-test-2', 'draft', 'review', 'Test status change from audit log viewer test');
      toast.success('Status change logged successfully');
    } catch (error) {
      toast.error('Failed to log status change');
    } finally {
      setIsLogging(false);
    }
  };

  const testLogOwnershipTransfer = async () => {
    setIsLogging(true);
    try {
      await logOwnershipTransfer('article-test-3', 'user-123', 'user-456', 'Test ownership transfer from audit log viewer test');
      toast.success('Ownership transfer logged successfully');
    } catch (error) {
      toast.error('Failed to log ownership transfer');
    } finally {
      setIsLogging(false);
    }
  };

  const testLogBulkOperation = async () => {
    setIsLogging(true);
    try {
      await logBulkOperation(testArticleIds, 'status_update', { 
        new_status: 'final',
        operation_source: 'audit_log_viewer_test'
      });
      toast.success('Bulk operation logged successfully');
    } catch (error) {
      toast.error('Failed to log bulk operation');
    } finally {
      setIsLogging(false);
    }
  };

  const testLogArticleDelete = async () => {
    setIsLogging(true);
    try {
      await logArticleDelete('article-test-delete', 'Test article deletion from audit log viewer test');
      toast.success('Article deletion logged successfully');
    } catch (error) {
      toast.error('Failed to log article deletion');
    } finally {
      setIsLogging(false);
    }
  };

  const testLogArticleExport = async () => {
    setIsLogging(true);
    try {
      await logArticleExport(['article-export-1', 'article-export-2'], 'json');
      toast.success('Article export logged successfully');
    } catch (error) {
      toast.error('Failed to log article export');
    } finally {
      setIsLogging(false);
    }
  };

  const testMultipleActions = async () => {
    setIsLogging(true);
    try {
      // Simulate a series of admin actions
      await logArticleView('article-multi-1', 'Step 1: Initial article access');
      await new Promise(resolve => setTimeout(resolve, 200));
      
      await auditLogger.logAction('article-multi-1', 'edit', 'Step 2: Article content modified', {
        changes: { title: 'Updated title', content: 'Updated content' }
      });
      await new Promise(resolve => setTimeout(resolve, 200));
      
      await logStatusChange('article-multi-1', 'editing', 'review', 'Step 3: Ready for review');
      await new Promise(resolve => setTimeout(resolve, 200));
      
      await auditLogger.logAction('article-multi-1', 'comment_add', 'Step 4: Added review comment', {
        comment: 'This article looks good, just needs minor formatting adjustments.'
      });
      
      toast.success('Multiple audit actions logged successfully');
    } catch (error) {
      toast.error('Failed to log multiple actions');
    } finally {
      setIsLogging(false);
    }
  };

  const testActions = [
    {
      title: 'Article View',
      description: 'Log an article view action',
      icon: Eye,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
      action: testLogArticleView
    },
    {
      title: 'Status Change',
      description: 'Log an article status change',
      icon: RefreshCw,
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/10',
      action: testLogStatusChange
    },
    {
      title: 'Ownership Transfer',
      description: 'Log an ownership transfer',
      icon: Users,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10',
      action: testLogOwnershipTransfer
    },
    {
      title: 'Bulk Operation',
      description: 'Log a bulk operation on multiple articles',
      icon: Activity,
      color: 'text-orange-400',
      bgColor: 'bg-orange-500/10',
      action: testLogBulkOperation
    },
    {
      title: 'Article Deletion',
      description: 'Log an article deletion',
      icon: Trash2,
      color: 'text-red-400',
      bgColor: 'bg-red-500/10',
      action: testLogArticleDelete
    },
    {
      title: 'Article Export',
      description: 'Log an article export operation',
      icon: Download,
      color: 'text-gray-400',
      bgColor: 'bg-gray-500/10',
      action: testLogArticleExport
    },
    {
      title: 'Multiple Actions',
      description: 'Log a sequence of related actions',
      icon: Play,
      color: 'text-green-400',
      bgColor: 'bg-green-500/10',
      action: testMultipleActions
    }
  ];

  return (
    <div className="min-h-screen bg-secondary-900 text-white p-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center space-x-4 mb-6">
          <div className="p-3 bg-primary-500/10 rounded-xl">
            <Shield className="h-8 w-8 text-primary-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-primary-400">Audit Log Viewer Test</h1>
            <p className="text-gray-400">
              Test and demonstrate the comprehensive audit logging system
            </p>
          </div>
        </div>

        {/* Test Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {testActions.map((testAction, index) => {
            const Icon = testAction.icon;
            return (
              <motion.button
                key={testAction.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                onClick={testAction.action}
                disabled={isLogging}
                className={`p-4 rounded-xl border border-secondary-700 hover:border-secondary-600 transition-all duration-200 ${testAction.bgColor} hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100`}
              >
                <div className="flex items-start space-x-3">
                  <div className={`p-2 rounded-lg bg-secondary-700 ${testAction.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="text-left flex-1">
                    <h3 className={`font-medium ${testAction.color} mb-1`}>
                      {testAction.title}
                    </h3>
                    <p className="text-sm text-gray-400">
                      {testAction.description}
                    </p>
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* Instructions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-secondary-800 rounded-xl p-6 border border-secondary-700 mb-8"
        >
          <div className="flex items-center space-x-3 mb-4">
            <FileText className="h-6 w-6 text-primary-400" />
            <h2 className="text-xl font-semibold text-primary-400">Test Instructions</h2>
          </div>
          <div className="space-y-3 text-gray-300">
            <p>
              <strong>1. Test Audit Actions:</strong> Click any of the action buttons above to log different types of admin actions.
            </p>
            <p>
              <strong>2. View Audit Logs:</strong> The audit log viewer below will display all logged actions with filtering and search capabilities.
            </p>
            <p>
              <strong>3. Test Filtering:</strong> Use the search box, action type filter, admin filter, and date range to test the filtering functionality.
            </p>
            <p>
              <strong>4. Test Export:</strong> Click the "Export" button in the audit log viewer to test the export functionality.
            </p>
            <p>
              <strong>5. Expand Details:</strong> Click on any audit log entry to view detailed information including metadata and IP address.
            </p>
            <p className="text-yellow-400">
              <strong>Note:</strong> This is a demonstration using mock data. In production, all actions would be logged to the database.
            </p>
          </div>
        </motion.div>
      </motion.div>

      {/* Audit Log Viewer */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <AuditLogViewer />
      </motion.div>

      {/* Status Indicator */}
      {isLogging && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="fixed bottom-6 right-6 bg-primary-500 text-black px-4 py-2 rounded-lg font-medium shadow-lg flex items-center space-x-2"
        >
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-black border-t-transparent"></div>
          <span>Logging action...</span>
        </motion.div>
      )}
    </div>
  );
}

export default AuditLogViewerTest; 