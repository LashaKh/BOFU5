import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAdminContext } from '../../contexts/AdminContext';
import { 
  CheckSquare, 
  Square, 
  Users, 
  ArrowRight, 
  X, 
  Loader2, 
  AlertTriangle, 
  CheckCircle, 
  UserX, 
  UserCheck, 
  Shuffle, 
  Download, 
  Upload,
  Filter,
  Search,
  MoreHorizontal
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { adminClientAssignmentApi } from '../../lib/adminApi';

interface BulkAssignmentManagerProps {
  isVisible: boolean;
  onClose: () => void;
}

interface BulkOperation {
  type: 'assign' | 'unassign' | 'transfer';
  fromAdmin?: string;
  toAdmin?: string;
  clientIds: string[];
  description: string;
}

export function BulkAssignmentManager({ isVisible, onClose }: BulkAssignmentManagerProps) {
  const { 
    adminRole, 
    allAdmins, 
    unassignedClients,
    refreshAdminData
  } = useAdminContext();

  const [selectedClients, setSelectedClients] = useState<Set<string>>(new Set());
  const [selectedOperation, setSelectedOperation] = useState<'assign' | 'unassign' | 'transfer'>('assign');
  const [selectedFromAdmin, setSelectedFromAdmin] = useState<string>('');
  const [selectedToAdmin, setSelectedToAdmin] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [currentOperation, setCurrentOperation] = useState<BulkOperation | null>(null);
  const [allAssignments, setAllAssignments] = useState<any[]>([]);
  const [isLoadingAssignments, setIsLoadingAssignments] = useState(false);

  // Only super-admins can access this component
  if (adminRole !== 'super_admin') {
    return null;
  }

  // Load all assignments for bulk operations
  const loadAllAssignments = async () => {
    try {
      setIsLoadingAssignments(true);
      const { data, error } = await adminClientAssignmentApi.getClientAssignments();
      
      if (error) {
        console.error('Error loading assignments:', error);
        toast.error('Failed to load client assignments');
        return;
      }

      setAllAssignments(data || []);
    } catch (error) {
      console.error('Error loading assignments:', error);
      toast.error('Failed to load client assignments');
    } finally {
      setIsLoadingAssignments(false);
    }
  };

  // Get sub-admins for dropdowns
  const subAdmins = allAdmins.filter(admin => admin.admin_role === 'sub_admin');

  // Get clients for the selected operation
  const getAvailableClients = () => {
    switch (selectedOperation) {
      case 'assign':
        return unassignedClients.filter(client =>
          client.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          client.company?.toLowerCase().includes(searchTerm.toLowerCase())
        );
      case 'unassign':
        if (!selectedFromAdmin) return [];
        return allAssignments
          .filter(assignment => assignment.admin_id === selectedFromAdmin)
          .filter(assignment =>
            assignment.client_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            assignment.client_company?.toLowerCase().includes(searchTerm.toLowerCase())
          );
      case 'transfer':
        if (!selectedFromAdmin) return [];
        return allAssignments
          .filter(assignment => assignment.admin_id === selectedFromAdmin)
          .filter(assignment =>
            assignment.client_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            assignment.client_company?.toLowerCase().includes(searchTerm.toLowerCase())
          );
      default:
        return [];
    }
  };

  // Toggle client selection
  const toggleClientSelection = (clientId: string) => {
    const newSelected = new Set(selectedClients);
    if (newSelected.has(clientId)) {
      newSelected.delete(clientId);
    } else {
      newSelected.add(clientId);
    }
    setSelectedClients(newSelected);
  };

  // Select all clients
  const selectAllClients = () => {
    const availableClients = getAvailableClients();
    if (selectedClients.size === availableClients.length) {
      setSelectedClients(new Set());
    } else {
      setSelectedClients(new Set(availableClients.map(client => 
        selectedOperation === 'assign' ? client.id : client.client_user_id
      )));
    }
  };

  // Preview operation
  const previewOperation = () => {
    if (selectedClients.size === 0) {
      toast.error('Please select at least one client');
      return;
    }

    if (selectedOperation === 'assign' && !selectedToAdmin) {
      toast.error('Please select a sub-admin to assign clients to');
      return;
    }

    if ((selectedOperation === 'unassign' || selectedOperation === 'transfer') && !selectedFromAdmin) {
      toast.error('Please select the source sub-admin');
      return;
    }

    if (selectedOperation === 'transfer' && !selectedToAdmin) {
      toast.error('Please select the destination sub-admin');
      return;
    }

    const operation: BulkOperation = {
      type: selectedOperation,
      fromAdmin: selectedFromAdmin || undefined,
      toAdmin: selectedToAdmin || undefined,
      clientIds: Array.from(selectedClients),
      description: generateOperationDescription()
    };

    setCurrentOperation(operation);
    setShowPreview(true);
  };

  // Generate operation description
  const generateOperationDescription = () => {
    const clientCount = selectedClients.size;
    const fromAdminEmail = allAdmins.find(admin => admin.id === selectedFromAdmin)?.email;
    const toAdminEmail = allAdmins.find(admin => admin.id === selectedToAdmin)?.email;

    switch (selectedOperation) {
      case 'assign':
        return `Assign ${clientCount} client${clientCount !== 1 ? 's' : ''} to ${toAdminEmail}`;
      case 'unassign':
        return `Unassign ${clientCount} client${clientCount !== 1 ? 's' : ''} from ${fromAdminEmail}`;
      case 'transfer':
        return `Transfer ${clientCount} client${clientCount !== 1 ? 's' : ''} from ${fromAdminEmail} to ${toAdminEmail}`;
      default:
        return '';
    }
  };

  // Execute bulk operation
  const executeBulkOperation = async () => {
    if (!currentOperation) return;

    try {
      setIsProcessing(true);
      let successCount = 0;
      let errorCount = 0;

      for (const clientId of currentOperation.clientIds) {
        try {
          switch (currentOperation.type) {
            case 'assign':
              if (currentOperation.toAdmin) {
                const { data, error } = await adminClientAssignmentApi.assignClient({
                  adminId: currentOperation.toAdmin,
                  clientUserId: clientId
                });
                if (data?.success) successCount++;
                else errorCount++;
              }
              break;
            case 'unassign':
              // Find the assignment ID for unassignment
              const assignment = allAssignments.find(a => 
                a.admin_id === currentOperation.fromAdmin && a.client_user_id === clientId
              );
              if (assignment) {
                const { data, error } = await adminClientAssignmentApi.unassignClient(assignment.id);
                if (data?.success) successCount++;
                else errorCount++;
              }
              break;
            case 'transfer':
              // Unassign from source and assign to destination
              const sourceAssignment = allAssignments.find(a => 
                a.admin_id === currentOperation.fromAdmin && a.client_user_id === clientId
              );
              if (sourceAssignment && currentOperation.toAdmin) {
                const { data: unassignData } = await adminClientAssignmentApi.unassignClient(sourceAssignment.id);
                if (unassignData?.success) {
                  const { data: assignData } = await adminClientAssignmentApi.assignClient({
                    adminId: currentOperation.toAdmin,
                    clientUserId: clientId
                  });
                  if (assignData?.success) successCount++;
                  else errorCount++;
                } else {
                  errorCount++;
                }
              }
              break;
          }
        } catch (error) {
          console.error(`Error processing client ${clientId}:`, error);
          errorCount++;
        }
      }

      // Show results
      if (successCount > 0) {
        toast.success(`Successfully processed ${successCount} client${successCount !== 1 ? 's' : ''}`);
      }
      if (errorCount > 0) {
        toast.error(`Failed to process ${errorCount} client${errorCount !== 1 ? 's' : ''}`);
      }

      // Refresh data and close
      await refreshAdminData();
      await loadAllAssignments();
      setShowPreview(false);
      setCurrentOperation(null);
      setSelectedClients(new Set());

    } catch (error) {
      console.error('Error executing bulk operation:', error);
      toast.error('Failed to execute bulk operation');
    } finally {
      setIsProcessing(false);
    }
  };

  // Reset operation state
  const resetOperation = () => {
    setSelectedClients(new Set());
    setSelectedFromAdmin('');
    setSelectedToAdmin('');
    setSearchTerm('');
    setShowPreview(false);
    setCurrentOperation(null);
  };

  // Load assignments on component mount
  useEffect(() => {
    if (isVisible) {
      loadAllAssignments();
    }
  }, [isVisible]);

  // Clear selections when operation type changes
  useEffect(() => {
    resetOperation();
  }, [selectedOperation]);

  const availableClients = getAvailableClients();

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-gray-900 rounded-xl shadow-2xl border border-gray-700 max-w-4xl w-full max-h-[90vh] overflow-hidden"
          >
            {/* Header */}
            <div className="p-6 border-b border-gray-700 bg-gray-800/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-500/20">
                    <Shuffle className="h-6 w-6 text-purple-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Bulk Assignment Manager</h2>
                    <p className="text-sm text-gray-400">Perform bulk operations on client assignments</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 max-h-[calc(90vh-140px)] overflow-y-auto">
              {/* Operation Selection */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-white mb-4">Select Operation</h3>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { type: 'assign' as const, label: 'Assign Clients', icon: UserCheck, color: 'green' },
                    { type: 'unassign' as const, label: 'Unassign Clients', icon: UserX, color: 'red' },
                    { type: 'transfer' as const, label: 'Transfer Clients', icon: Shuffle, color: 'blue' }
                  ].map((operation) => (
                    <button
                      key={operation.type}
                      onClick={() => setSelectedOperation(operation.type)}
                      className={`p-4 rounded-lg border transition-all ${
                        selectedOperation === operation.type
                          ? `bg-${operation.color}-500/20 border-${operation.color}-500/50 text-${operation.color}-300`
                          : 'bg-gray-800/60 border-gray-700 text-gray-300 hover:bg-gray-700/60'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <operation.icon className="h-5 w-5" />
                        <span className="font-medium">{operation.label}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Admin Selection */}
              <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                {(selectedOperation === 'unassign' || selectedOperation === 'transfer') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      From Sub-Admin
                    </label>
                    <select
                      value={selectedFromAdmin}
                      onChange={(e) => setSelectedFromAdmin(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="">Select sub-admin...</option>
                      {subAdmins.map((admin) => (
                        <option key={admin.id} value={admin.id}>
                          {admin.email} ({admin.assigned_clients_count || 0} clients)
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {(selectedOperation === 'assign' || selectedOperation === 'transfer') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      {selectedOperation === 'transfer' ? 'To Sub-Admin' : 'Sub-Admin'}
                    </label>
                    <select
                      value={selectedToAdmin}
                      onChange={(e) => setSelectedToAdmin(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="">Select sub-admin...</option>
                      {subAdmins
                        .filter(admin => admin.id !== selectedFromAdmin) // Don't show same admin in transfer
                        .map((admin) => (
                          <option key={admin.id} value={admin.id}>
                            {admin.email} ({admin.assigned_clients_count || 0} clients)
                          </option>
                        ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Search */}
              <div className="mb-6">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search clients..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Client Selection */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">
                    Select Clients ({selectedClients.size} selected)
                  </h3>
                  <button
                    onClick={selectAllClients}
                    className="flex items-center gap-2 px-3 py-1 text-sm text-blue-400 hover:text-blue-300"
                  >
                    {selectedClients.size === availableClients.length ? (
                      <>
                        <Square className="h-4 w-4" />
                        Deselect All
                      </>
                    ) : (
                      <>
                        <CheckSquare className="h-4 w-4" />
                        Select All
                      </>
                    )}
                  </button>
                </div>

                <div className="max-h-80 overflow-y-auto space-y-2">
                  {isLoadingAssignments ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-blue-400" />
                    </div>
                  ) : availableClients.length > 0 ? (
                    availableClients.map((client) => {
                      const clientId = selectedOperation === 'assign' ? client.id : client.client_user_id;
                      const isSelected = selectedClients.has(clientId);
                      
                      return (
                        <div
                          key={clientId}
                          onClick={() => toggleClientSelection(clientId)}
                          className={`p-3 rounded-lg border cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-blue-500/20 border-blue-500/50'
                              : 'bg-gray-800/60 border-gray-700 hover:bg-gray-700/60'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            {isSelected ? (
                              <CheckSquare className="h-5 w-5 text-blue-400" />
                            ) : (
                              <Square className="h-5 w-5 text-gray-400" />
                            )}
                            <div className="flex-1">
                              <p className="font-medium text-white">
                                {selectedOperation === 'assign' ? client.email : client.client_email}
                              </p>
                              <p className="text-sm text-gray-400">
                                {selectedOperation === 'assign' ? client.company : client.client_company}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>No clients available for this operation</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={previewOperation}
                  disabled={selectedClients.size === 0}
                  className="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <CheckCircle className="h-4 w-4" />
                  Preview Operation
                </button>
                <button
                  onClick={resetOperation}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                >
                  Reset
                </button>
              </div>
            </div>
          </motion.div>

          {/* Preview Modal */}
          <AnimatePresence>
            {showPreview && currentOperation && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-10"
              >
                <div className="bg-gray-800 rounded-xl shadow-2xl border border-gray-700 max-w-md w-full p-6 mx-4">
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-yellow-400" />
                    Confirm Bulk Operation
                  </h3>
                  
                  <div className="mb-6">
                    <p className="text-gray-300 mb-4">{currentOperation.description}</p>
                    <div className="p-3 bg-gray-700/50 rounded-lg">
                      <p className="text-sm text-gray-400">
                        This will affect {currentOperation.clientIds.length} client{currentOperation.clientIds.length !== 1 ? 's' : ''}.
                        This action cannot be undone.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={executeBulkOperation}
                      disabled={isProcessing}
                      className="flex-1 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isProcessing ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4" />
                          Execute
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => setShowPreview(false)}
                      disabled={isProcessing}
                      className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
} 