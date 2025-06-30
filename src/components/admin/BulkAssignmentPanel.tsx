import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAdminContext } from '../../contexts/AdminContext';
import { 
  CheckSquare, 
  Square, 
  Users, 
  ArrowRight, 
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
  MoreHorizontal,
  Shield
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { adminClientAssignmentApi } from '../../lib/adminApi';

interface BulkAssignmentPanelProps {
  className?: string;
}

interface BulkOperation {
  type: 'assign' | 'unassign' | 'transfer';
  fromAdmin?: string;
  toAdmin?: string;
  clientIds: string[];
  description: string;
}

export function BulkAssignmentPanel({ className = '' }: BulkAssignmentPanelProps) {
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
    return (
      <div className={`${className} flex items-center justify-center h-96`}>
        <div className="text-center text-gray-500">
          <Shield className="h-16 w-16 mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-semibold mb-2">Access Denied</h3>
          <p>Only super-admins can access bulk assignment management</p>
        </div>
      </div>
    );
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
          if (currentOperation.type === 'assign' && currentOperation.toAdmin) {
            const { data, error } = await adminClientAssignmentApi.assignClient({
              adminId: currentOperation.toAdmin,
              clientUserId: clientId
            });
            if (error) throw new Error(error.error);
            successCount++;
          } else if (currentOperation.type === 'unassign') {
            // Find the assignment ID for this client
            const assignment = allAssignments.find(a => a.client_user_id === clientId);
            if (assignment) {
              const { data, error } = await adminClientAssignmentApi.unassignClient(assignment.id);
              if (error) throw new Error(error.error);
              successCount++;
            }
          } else if (currentOperation.type === 'transfer' && currentOperation.toAdmin) {
            // First unassign, then assign
            const assignment = allAssignments.find(a => a.client_user_id === clientId);
            if (assignment) {
              const { error: unassignError } = await adminClientAssignmentApi.unassignClient(assignment.id);
              if (unassignError) throw new Error(unassignError.error);
              
              const { error: assignError } = await adminClientAssignmentApi.assignClient({
                adminId: currentOperation.toAdmin,
                clientUserId: clientId
              });
              if (assignError) throw new Error(assignError.error);
              successCount++;
            }
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

      // Refresh data and reset
      await loadAllAssignments();
      await refreshAdminData();
      resetOperation();

    } catch (error) {
      console.error('Error executing bulk operation:', error);
      toast.error('Failed to execute bulk operation');
    } finally {
      setIsProcessing(false);
    }
  };

  // Reset operation
  const resetOperation = () => {
    setSelectedClients(new Set());
    setCurrentOperation(null);
    setShowPreview(false);
    setSelectedFromAdmin('');
    setSelectedToAdmin('');
    setSearchTerm('');
  };

  // Load data on mount
  useEffect(() => {
    loadAllAssignments();
  }, []);

  const availableClients = getAvailableClients();

  return (
    <div className={`${className} h-full overflow-y-auto custom-scrollbar pr-2`}>
      {/* Panel Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-orange-500/20">
            <Shuffle className="h-6 w-6 text-orange-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Bulk Assignment</h2>
            <p className="text-sm text-gray-400">Perform bulk operations on client assignments</p>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* Operation Controls */}
        <div className="p-4 rounded-lg bg-gray-800/60 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">Operation Configuration</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {/* Operation Type */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Operation Type</label>
              <select
                value={selectedOperation}
                onChange={(e) => {
                  setSelectedOperation(e.target.value as 'assign' | 'unassign' | 'transfer');
                  resetOperation();
                }}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-orange-500"
              >
                <option value="assign">Assign to Admin</option>
                <option value="unassign">Unassign from Admin</option>
                <option value="transfer">Transfer Between Admins</option>
              </select>
            </div>

            {/* From Admin (for unassign/transfer) */}
            {(selectedOperation === 'unassign' || selectedOperation === 'transfer') && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">From Admin</label>
                <select
                  value={selectedFromAdmin}
                  onChange={(e) => {
                    setSelectedFromAdmin(e.target.value);
                    setSelectedClients(new Set());
                  }}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-orange-500"
                >
                  <option value="">Select admin...</option>
                  {subAdmins.map(admin => (
                    <option key={admin.id} value={admin.id}>{admin.email}</option>
                  ))}
                </select>
              </div>
            )}

            {/* To Admin (for assign/transfer) */}
            {(selectedOperation === 'assign' || selectedOperation === 'transfer') && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">To Admin</label>
                <select
                  value={selectedToAdmin}
                  onChange={(e) => setSelectedToAdmin(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-orange-500"
                >
                  <option value="">Select admin...</option>
                  {subAdmins.filter(admin => admin.id !== selectedFromAdmin).map(admin => (
                    <option key={admin.id} value={admin.id}>{admin.email}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search clients..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-orange-500"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={selectAllClients}
                className="flex items-center gap-2 px-3 py-1 rounded text-sm bg-gray-700 text-gray-300 hover:bg-gray-600"
              >
                {selectedClients.size === availableClients.length && availableClients.length > 0 ? (
                  <CheckSquare className="h-4 w-4" />
                ) : (
                  <Square className="h-4 w-4" />
                )}
                {selectedClients.size === availableClients.length && availableClients.length > 0 ? 'Deselect All' : 'Select All'}
              </button>
              <span className="text-sm text-gray-400">
                {selectedClients.size} of {availableClients.length} selected
              </span>
            </div>
            <button
              onClick={previewOperation}
              disabled={selectedClients.size === 0}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-500 text-white hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ArrowRight className="h-4 w-4" />
              Preview Operation
            </button>
          </div>
        </div>

        {/* Client List */}
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Users className="h-5 w-5 text-orange-400" />
            Available Clients ({availableClients.length})
          </h3>

          {isLoadingAssignments ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-orange-400" />
            </div>
          ) : availableClients.length > 0 ? (
            <div className="space-y-2 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
              {availableClients.map((client) => {
                const clientId = selectedOperation === 'assign' ? client.id : client.client_user_id;
                const isSelected = selectedClients.has(clientId);
                
                return (
                  <motion.div
                    key={clientId}
                    whileHover={{ scale: 1.01 }}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      isSelected 
                        ? 'bg-orange-500/20 border-orange-500/50' 
                        : 'bg-gray-800/60 border-gray-700 hover:bg-gray-700/60'
                    }`}
                    onClick={() => toggleClientSelection(clientId)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {isSelected ? (
                          <CheckSquare className="h-5 w-5 text-orange-400" />
                        ) : (
                          <Square className="h-5 w-5 text-gray-400" />
                        )}
                        <div>
                          <p className="font-medium text-white">
                            {selectedOperation === 'assign' ? client.email : client.client_email}
                          </p>
                          <p className="text-sm text-gray-400">
                            {selectedOperation === 'assign' ? client.company : client.client_company}
                          </p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <UserX className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-2">No Clients Available</h3>
              <p>
                {selectedOperation === 'assign' 
                  ? 'No unassigned clients found' 
                  : selectedFromAdmin 
                    ? 'No clients assigned to selected admin'
                    : 'Please select an admin first'
                }
              </p>
            </div>
          )}
        </div>

        {/* Preview Modal */}
        {showPreview && currentOperation && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          >
            <div className="bg-gray-900 rounded-xl border border-gray-700 max-w-md w-full p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-400" />
                Confirm Bulk Operation
              </h3>
              
              <div className="mb-6">
                <p className="text-gray-300 mb-2">{currentOperation.description}</p>
                <div className="text-sm text-gray-400">
                  <p>Clients affected: {currentOperation.clientIds.length}</p>
                  <p className="text-orange-400 mt-2">This action cannot be undone.</p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowPreview(false)}
                  className="flex-1 px-4 py-2 rounded-lg bg-gray-700 text-gray-300 hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={executeBulkOperation}
                  disabled={isProcessing}
                  className="flex-1 px-4 py-2 rounded-lg bg-orange-500 text-white hover:bg-orange-600 transition-colors disabled:opacity-50"
                >
                  {isProcessing ? (
                    <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                  ) : (
                    'Execute'
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
} 