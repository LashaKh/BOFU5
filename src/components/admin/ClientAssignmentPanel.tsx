import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAdminContext } from '../../contexts/AdminContext';
import { 
  Users, 
  Plus, 
  Trash2, 
  Search, 
  UserCheck, 
  UserX, 
  CheckCircle,
  Loader2,
  Shield
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { adminClientAssignmentApi, AdminRole } from '../../lib/adminApi';

interface ClientAssignmentPanelProps {
  className?: string;
}

export function ClientAssignmentPanel({ className = '' }: ClientAssignmentPanelProps) {
  const { 
    adminRole, 
    allAdmins, 
    unassignedClients, 
    refreshAdminData,
    assignClient,
    unassignClient
  } = useAdminContext();

  const [selectedAdmin, setSelectedAdmin] = useState<AdminRole | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [isLoadingAssignments, setIsLoadingAssignments] = useState(false);

  // Only super-admins can access this component
  if (adminRole !== 'super_admin') {
    return (
      <div className={`${className} flex items-center justify-center h-96`}>
        <div className="text-center text-gray-500">
          <Shield className="h-16 w-16 mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-semibold mb-2">Access Denied</h3>
          <p>Only super-admins can access client assignment management</p>
        </div>
      </div>
    );
  }

  // Load assignments for selected admin
  const loadAdminAssignments = async (adminId: string) => {
    try {
      setIsLoadingAssignments(true);
      const { data, error } = await adminClientAssignmentApi.getClientAssignments(adminId);
      
      if (error) {
        toast.error(`Failed to load assignments: ${error.error}`);
        return;
      }

      setAssignments(data || []);
    } catch (error) {
      console.error('Error loading admin assignments:', error);
      toast.error('Failed to load assignments');
    } finally {
      setIsLoadingAssignments(false);
    }
  };

  // Handle admin selection
  const handleAdminSelect = async (admin: AdminRole) => {
    setSelectedAdmin(admin);
    if (admin.id) {
      await loadAdminAssignments(admin.id);
    }
  };

  // Handle client assignment
  const handleAssignClient = async (clientId: string) => {
    if (!selectedAdmin?.id) return;

    try {
      setIsAssigning(true);
      const success = await assignClient(selectedAdmin.id, clientId);
      
      if (success) {
        toast.success('Client assigned successfully');
        await loadAdminAssignments(selectedAdmin.id);
        await refreshAdminData();
      } else {
        toast.error('Failed to assign client');
      }
    } catch (error) {
      console.error('Error assigning client:', error);
      toast.error('Failed to assign client');
    } finally {
      setIsAssigning(false);
    }
  };

  // Handle client unassignment
  const handleUnassignClient = async (assignmentId: string) => {
    if (!selectedAdmin?.id) return;

    try {
      setIsAssigning(true);
      const success = await unassignClient(assignmentId);
      
      if (success) {
        toast.success('Client unassigned successfully');
        await loadAdminAssignments(selectedAdmin.id);
        await refreshAdminData();
      } else {
        toast.error('Failed to unassign client');
      }
    } catch (error) {
      console.error('Error unassigning client:', error);
      toast.error('Failed to unassign client');
    } finally {
      setIsAssigning(false);
    }
  };

  // Filter unassigned clients based on search
  const filteredUnassignedClients = unassignedClients.filter(client =>
    client.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.company?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Filter sub-admins only
  const subAdmins = allAdmins.filter(admin => admin.admin_role === 'sub_admin');

  return (
    <div className={`${className} h-full flex flex-col`}>
      {/* Panel Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-blue-500/20">
            <Users className="h-6 w-6 text-blue-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Client Assignment</h2>
            <p className="text-sm text-gray-400">Manage client assignments for sub-admin editors</p>
          </div>
        </div>
      </div>

      <div className="flex-1 flex gap-6">
        {/* Left Panel - Admin List */}
        <div className="w-1/3">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-400" />
            Sub-Admin Editors
          </h3>
          
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {subAdmins.map((admin) => (
              <motion.button
                key={admin.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleAdminSelect(admin)}
                className={`w-full p-4 rounded-lg border text-left transition-all ${
                  selectedAdmin?.id === admin.id
                    ? 'bg-blue-500/20 border-blue-500/50 text-blue-300'
                    : 'bg-gray-800/60 border-gray-700 text-gray-300 hover:bg-gray-700/60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center">
                    <UserCheck className="h-4 w-4 text-gray-300" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{admin.email}</p>
                    <p className="text-xs text-gray-500">
                      {admin.assigned_clients_count || 0} clients assigned
                    </p>
                  </div>
                </div>
              </motion.button>
            ))}
            
            {subAdmins.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <UserX className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No sub-admin editors found</p>
                <p className="text-sm">Create sub-admin accounts first</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Assignment Management */}
        <div className="flex-1">
          {selectedAdmin ? (
            <div className="h-full flex flex-col">
              {/* Selected Admin Header */}
              <div className="mb-6 p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <h3 className="text-lg font-semibold text-blue-300 mb-2">
                  Managing: {selectedAdmin.email}
                </h3>
                <p className="text-sm text-gray-400">
                  Current assignments: {assignments.length} clients
                </p>
              </div>

              <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 overflow-hidden">
                {/* Current Assignments */}
                <div className="flex flex-col overflow-hidden">
                  <h4 className="text-md font-semibold text-white mb-4 flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-400" />
                    Assigned Clients ({assignments.length})
                  </h4>
                  
                  <div className="space-y-2 overflow-y-auto flex-1">
                    {isLoadingAssignments ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-blue-400" />
                      </div>
                    ) : assignments.length > 0 ? (
                      assignments.map((assignment) => (
                        <div
                          key={assignment.id}
                          className="p-3 rounded-lg bg-gray-800/60 border border-gray-700"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-white truncate">
                                {assignment.client_email}
                              </p>
                              <p className="text-sm text-gray-400 truncate">
                                {assignment.client_company}
                              </p>
                              <p className="text-xs text-gray-500">
                                Assigned {new Date(assignment.assigned_at).toLocaleDateString()}
                              </p>
                            </div>
                            <button
                              onClick={() => handleUnassignClient(assignment.id)}
                              disabled={isAssigning}
                              className="ml-2 p-2 rounded-lg text-red-400 hover:text-white hover:bg-red-500/20 transition-colors disabled:opacity-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <UserX className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>No clients assigned</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Available Clients */}
                <div className="flex flex-col overflow-hidden">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-md font-semibold text-white flex items-center gap-2">
                      <Plus className="h-5 w-5 text-green-400" />
                      Available Clients ({filteredUnassignedClients.length})
                    </h4>
                  </div>

                  {/* Search */}
                  <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search clients..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  
                  <div className="space-y-2 overflow-y-auto flex-1">
                    {filteredUnassignedClients.length > 0 ? (
                      filteredUnassignedClients.map((client) => (
                        <div
                          key={client.id}
                          className="p-3 rounded-lg bg-gray-800/60 border border-gray-700"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-white truncate">
                                {client.email}
                              </p>
                              <p className="text-sm text-gray-400 truncate">
                                {client.company || 'No company'}
                              </p>
                            </div>
                            <button
                              onClick={() => handleAssignClient(client.id)}
                              disabled={isAssigning}
                              className="ml-2 p-2 rounded-lg text-green-400 hover:text-white hover:bg-green-500/20 transition-colors disabled:opacity-50"
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))
                    ) : searchTerm ? (
                      <div className="text-center py-8 text-gray-500">
                        <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>No clients found matching "{searchTerm}"</p>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <UserCheck className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>All clients are assigned</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-center">
              <div className="text-gray-500">
                <Users className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-semibold mb-2">Select a Sub-Admin</h3>
                <p>Choose a sub-admin editor from the left to manage their client assignments</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 