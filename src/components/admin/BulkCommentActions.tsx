import React, { useState } from 'react';
import { CommentPriority, AdminCommentType, BulkCommentOperation } from '../../types/adminComment';
import { PRIORITY_LEVELS } from '../../types/adminComment';
import { performBulkCommentOperation } from '../../lib/adminCommentApi';

interface BulkCommentActionsProps {
  selectedCommentIds: string[];
  onActionComplete: () => void;
  onClearSelection: () => void;
}

export const BulkCommentActions: React.FC<BulkCommentActionsProps> = ({
  selectedCommentIds,
  onActionComplete,
  onClearSelection
}) => {
  const [activeOperation, setActiveOperation] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [operationResult, setOperationResult] = useState<{
    success: number;
    failed: number;
    errors: string[];
  } | null>(null);

  // Form states for different operations
  const [prioritySelection, setPrioritySelection] = useState<CommentPriority>('normal');
  const [statusSelection, setStatusSelection] = useState<'active' | 'resolved' | 'archived'>('active');
  const [reason, setReason] = useState('');
  const [adminNotes, setAdminNotes] = useState('');

  const resetForms = () => {
    setPrioritySelection('normal');
    setStatusSelection('active');
    setReason('');
    setAdminNotes('');
    setActiveOperation(null);
    setOperationResult(null);
  };

  const performOperation = async (operation: BulkCommentOperation) => {
    setIsProcessing(true);
    setOperationResult(null);

    try {
      const result = await performBulkCommentOperation(operation);
      setOperationResult(result);
      
      if (result.success > 0) {
        onActionComplete();
        if (result.failed === 0) {
          // If all succeeded, clear selection and reset forms
          setTimeout(() => {
            onClearSelection();
            resetForms();
          }, 2000);
        }
      }
    } catch (error) {
      console.error('Error performing bulk operation:', error);
      setOperationResult({
        success: 0,
        failed: selectedCommentIds.length,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpdatePriority = async () => {
    await performOperation({
      comment_ids: selectedCommentIds,
      operation: 'update_priority',
      data: {
        priority: prioritySelection,
        admin_notes: adminNotes || undefined
      }
    });
  };

  const handleUpdateStatus = async () => {
    await performOperation({
      comment_ids: selectedCommentIds,
      operation: 'update_status',
      data: {
        status: statusSelection
      }
    });
  };

  const handleBulkApprove = async () => {
    await performOperation({
      comment_ids: selectedCommentIds,
      operation: 'approve',
      data: {
        reason: reason || 'Bulk approved'
      }
    });
  };

  const handleBulkReject = async () => {
    if (!reason.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }

    await performOperation({
      comment_ids: selectedCommentIds,
      operation: 'reject',
      data: {
        reason: reason
      }
    });
  };

  const handleArchive = async () => {
    await performOperation({
      comment_ids: selectedCommentIds,
      operation: 'archive',
      data: {}
    });
  };

  if (selectedCommentIds.length === 0) {
    return null;
  }

  return (
    <div className="bg-white border rounded-lg p-4 shadow-sm mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">
          Bulk Actions ({selectedCommentIds.length} selected)
        </h3>
        <button
          onClick={onClearSelection}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          Clear Selection
        </button>
      </div>

      {/* Operation Result Display */}
      {operationResult && (
        <div className={`mb-4 p-3 rounded-md ${
          operationResult.failed === 0 ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'
        }`}>
          <div className="flex items-center">
            <span className={operationResult.failed === 0 ? 'text-green-800' : 'text-yellow-800'}>
              ✅ {operationResult.success} succeeded
              {operationResult.failed > 0 && `, ❌ ${operationResult.failed} failed`}
            </span>
          </div>
          {operationResult.errors.length > 0 && (
            <div className="mt-2">
              <details className="text-sm">
                <summary className="cursor-pointer text-red-600">View Errors</summary>
                <ul className="mt-1 list-disc list-inside text-red-700">
                  {operationResult.errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </details>
            </div>
          )}
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <button
          onClick={() => setActiveOperation('priority')}
          className="px-3 py-2 bg-orange-100 text-orange-800 rounded hover:bg-orange-200 text-sm font-medium"
        >
          📊 Update Priority
        </button>
        <button
          onClick={() => setActiveOperation('status')}
          className="px-3 py-2 bg-blue-100 text-blue-800 rounded hover:bg-blue-200 text-sm font-medium"
        >
          📝 Update Status
        </button>
        <button
          onClick={() => setActiveOperation('approve')}
          className="px-3 py-2 bg-green-100 text-green-800 rounded hover:bg-green-200 text-sm font-medium"
        >
          ✅ Bulk Approve
        </button>
        <button
          onClick={() => setActiveOperation('reject')}
          className="px-3 py-2 bg-red-100 text-red-800 rounded hover:bg-red-200 text-sm font-medium"
        >
          ❌ Bulk Reject
        </button>
      </div>

      {/* Operation Forms */}
      {activeOperation === 'priority' && (
        <div className="border-t pt-4 space-y-3">
          <h4 className="font-medium text-gray-900">Update Priority</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                New Priority
              </label>
              <select
                value={prioritySelection}
                onChange={(e) => setPrioritySelection(e.target.value as CommentPriority)}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              >
                {Object.entries(PRIORITY_LEVELS).map(([value, config]) => (
                  <option key={value} value={value}>
                    {config.icon} {config.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Admin Notes (Optional)
              </label>
              <input
                type="text"
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Reason for priority change..."
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </div>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={handleUpdatePriority}
              disabled={isProcessing}
              className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 disabled:opacity-50"
            >
              {isProcessing ? 'Updating...' : 'Update Priority'}
            </button>
            <button
              onClick={resetForms}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {activeOperation === 'status' && (
        <div className="border-t pt-4 space-y-3">
          <h4 className="font-medium text-gray-900">Update Status</h4>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              New Status
            </label>
            <select
              value={statusSelection}
              onChange={(e) => setStatusSelection(e.target.value as 'active' | 'resolved' | 'archived')}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="active">🟢 Active</option>
              <option value="resolved">🔵 Resolved</option>
              <option value="archived">⚫ Archived</option>
            </select>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={handleUpdateStatus}
              disabled={isProcessing}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {isProcessing ? 'Updating...' : 'Update Status'}
            </button>
            <button
              onClick={resetForms}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {activeOperation === 'approve' && (
        <div className="border-t pt-4 space-y-3">
          <h4 className="font-medium text-gray-900">Bulk Approve Comments</h4>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Approval Reason (Optional)
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Reason for approval..."
              rows={3}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </div>
          <div className="flex space-x-2">
            <button
              onClick={handleBulkApprove}
              disabled={isProcessing}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
            >
              {isProcessing ? 'Approving...' : `Approve ${selectedCommentIds.length} Comments`}
            </button>
            <button
              onClick={resetForms}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {activeOperation === 'reject' && (
        <div className="border-t pt-4 space-y-3">
          <h4 className="font-medium text-gray-900">Bulk Reject Comments</h4>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Rejection Reason (Required)
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Reason for rejection..."
              rows={3}
              required
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </div>
          <div className="flex space-x-2">
            <button
              onClick={handleBulkReject}
              disabled={isProcessing || !reason.trim()}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
            >
              {isProcessing ? 'Rejecting...' : `Reject ${selectedCommentIds.length} Comments`}
            </button>
            <button
              onClick={resetForms}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Additional Quick Actions */}
      <div className="border-t pt-4">
        <h4 className="font-medium text-gray-900 mb-2">Additional Actions</h4>
        <div className="flex space-x-2">
          <button
            onClick={handleArchive}
            disabled={isProcessing}
            className="px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700 disabled:opacity-50"
          >
            📦 Archive All
          </button>
        </div>
      </div>
    </div>
  );
}; 