import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { checkAdminStatus, AdminRole, ClientAssignment, adminClientAssignmentApi } from '../lib/adminApi';

// Enhanced admin context types
export interface AdminContextType {
  // Authentication state
  isAdmin: boolean;
  adminRole: 'super_admin' | 'sub_admin' | null;
  adminId: string | null;
  adminEmail: string | null;
  isLoading: boolean;
  
  // Assignment data for sub-admins
  assignedClients: ClientAssignment[];
  assignedClientIds: string[];
  
  // Admin management data for super-admins
  allAdmins: AdminRole[];
  unassignedClients: any[];
  
  // Methods
  refreshAdminData: () => Promise<void>;
  assignClient: (adminId: string, clientUserId: string) => Promise<{ success: boolean; error?: string }>;
  unassignClient: (assignmentId: string) => Promise<{ success: boolean; error?: string }>;
  
  // Error state
  error: string | null;
}

// React context debug check
if (typeof React === 'undefined' || typeof React.createContext === 'undefined') {
  console.error('React or React.createContext is undefined in AdminContext. This indicates a bundling issue.');
  throw new Error('React.createContext is not available for AdminContext creation.');
}

// Create the admin context
const AdminContext = React.createContext<AdminContextType | undefined>(undefined);

// AdminContext Provider Props
interface AdminContextProviderProps {
  children: ReactNode;
  user: User | null;
}

// AdminContext Provider Component
export function AdminContextProvider({ children, user }: AdminContextProviderProps) {
  // Core admin state
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminRole, setAdminRole] = useState<'super_admin' | 'sub_admin' | null>(null);
  const [adminId, setAdminId] = useState<string | null>(null);
  const [adminEmail, setAdminEmail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Assignment data
  const [assignedClients, setAssignedClients] = useState<ClientAssignment[]>([]);
  const [assignedClientIds, setAssignedClientIds] = useState<string[]>([]);
  
  // Admin management data
  const [allAdmins, setAllAdmins] = useState<AdminRole[]>([]);
  const [unassignedClients, setUnassignedClients] = useState<any[]>([]);
  
  // Error state
  const [error, setError] = useState<string | null>(null);

  // Track if admin status has been initialized for this user
  const [initializedForUserId, setInitializedForUserId] = useState<string | null>(null);

  // Initialize admin status when user changes
  useEffect(() => {
    const initializeAdminStatus = async () => {
      // Only initialize if user has changed or hasn't been initialized
      if (!user) {
        // User signed out - reset all admin state
        console.log('[AdminContext] User signed out, resetting admin state');
        setIsAdmin(false);
        setAdminRole(null);
        setAdminId(null);
        setAdminEmail(null);
        setAssignedClients([]);
        setAssignedClientIds([]);
        setAllAdmins([]);
        setUnassignedClients([]);
        setIsLoading(false);
        setError(null);
        setInitializedForUserId(null);
        return;
      }

      // Skip initialization if already done for this user
      if (initializedForUserId === user.id) {
        console.log('[AdminContext] Admin status already initialized for user:', user.email);
        return;
      }

      console.log('[AdminContext] Initializing admin status for user:', user.email);
      setIsLoading(true);
      setError(null);

      try {
        console.log('[AdminContext] Checking admin status for user:', user.email);
        
        // Check admin status using Phase 2 API
        const { isAdmin: userIsAdmin, role } = await checkAdminStatus();
        
        if (userIsAdmin && role) {
          console.log('[AdminContext] User is admin with role:', role);
          setIsAdmin(true);
          setAdminRole(role);
          setAdminId(user.id);
          setAdminEmail(user.email || null);
          
          // Load role-specific data
          await loadAdminData(role);
        } else {
          console.log('[AdminContext] User is not an admin');
          setIsAdmin(false);
          setAdminRole(null);
          setAdminId(null);
          setAdminEmail(null);
        }
        
        // Mark as initialized for this user
        setInitializedForUserId(user.id);
      } catch (err) {
        console.error('[AdminContext] Error checking admin status:', err);
        setError('Failed to verify admin status');
        setIsAdmin(false);
        setAdminRole(null);
        setAdminId(null);
        setAdminEmail(null);
        
        // Still mark as initialized to prevent retries
        setInitializedForUserId(user.id);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAdminStatus();
  }, [user, initializedForUserId]); // Removed isAdmin from dependencies to prevent infinite loop

  // Load admin-specific data based on role
  const loadAdminData = async (role: 'super_admin' | 'sub_admin') => {
    try {
      console.log('[AdminContext] Loading admin data for role:', role);
      
      if (role === 'sub_admin') {
        // Load assigned clients for sub-admin
        const { data: assignments, error: assignmentError } = await adminClientAssignmentApi.getClientAssignments();
        if (assignmentError) {
          console.error('[AdminContext] Error loading client assignments:', assignmentError);
          setError('Failed to load client assignments');
        } else if (assignments) {
          setAssignedClients(assignments);
          setAssignedClientIds(assignments.map(a => a.client_user_id));
          console.log('[AdminContext] Loaded', assignments.length, 'client assignments');
        }
      } else if (role === 'super_admin') {
        // Load all admins and unassigned clients for super-admin
        const [adminsResult, unassignedResult] = await Promise.allSettled([
          adminClientAssignmentApi.getAdmins(),
          adminClientAssignmentApi.getUnassignedClients()
        ]);
        
        if (adminsResult.status === 'fulfilled' && adminsResult.value.data) {
          setAllAdmins(adminsResult.value.data);
          console.log('[AdminContext] Loaded', adminsResult.value.data.length, 'admins');
        } else {
          console.error('[AdminContext] Error loading admins:', adminsResult.status === 'rejected' ? adminsResult.reason : adminsResult.value.error);
        }
        
        if (unassignedResult.status === 'fulfilled' && unassignedResult.value.data) {
          setUnassignedClients(unassignedResult.value.data);
          console.log('[AdminContext] Loaded', unassignedResult.value.data.length, 'unassigned clients');
        } else {
          console.error('[AdminContext] Error loading unassigned clients:', unassignedResult.status === 'rejected' ? unassignedResult.reason : unassignedResult.value.error);
        }
      }
    } catch (err) {
      console.error('[AdminContext] Error loading admin data:', err);
      setError('Failed to load admin data');
    }
  };

  // Refresh all admin data
  const refreshAdminData = async () => {
    if (!isAdmin || !adminRole) return;
    
    console.log('[AdminContext] Refreshing admin data...');
    setError(null);
    
    try {
      await loadAdminData(adminRole);
    } catch (err) {
      console.error('[AdminContext] Error refreshing admin data:', err);
      setError('Failed to refresh admin data');
    }
  };

  // Assign client to sub-admin (super-admin only)
  const assignClient = async (adminId: string, clientUserId: string): Promise<{ success: boolean; error?: string }> => {
    if (adminRole !== 'super_admin') {
      return { success: false, error: 'Unauthorized - Super admin access required' };
    }
    
    try {
      console.log('[AdminContext] Assigning client', clientUserId, 'to admin', adminId);
      
      const { data, error } = await adminClientAssignmentApi.assignClient({ adminId, clientUserId });
      
      if (error) {
        console.error('[AdminContext] Assignment error:', error);
        return { success: false, error: error.error };
      }
      
      if (data?.success) {
        console.log('[AdminContext] Client assignment successful');
        // Refresh data to show updated assignments
        await refreshAdminData();
        return { success: true };
      }
      
      return { success: false, error: 'Assignment failed' };
    } catch (err) {
      console.error('[AdminContext] Exception during client assignment:', err);
      return { success: false, error: 'Assignment failed' };
    }
  };

  // Unassign client from sub-admin (super-admin only)
  const unassignClient = async (assignmentId: string): Promise<{ success: boolean; error?: string }> => {
    if (adminRole !== 'super_admin') {
      return { success: false, error: 'Unauthorized - Super admin access required' };
    }
    
    try {
      console.log('[AdminContext] Unassigning client with assignment ID', assignmentId);
      
      const { data, error } = await adminClientAssignmentApi.unassignClient(assignmentId);
      
      if (error) {
        console.error('[AdminContext] Unassignment error:', error);
        return { success: false, error: error.error };
      }
      
      if (data?.success) {
        console.log('[AdminContext] Client unassignment successful');
        // Refresh data to show updated assignments
        await refreshAdminData();
        return { success: true };
      }
      
      return { success: false, error: 'Unassignment failed' };
    } catch (err) {
      console.error('[AdminContext] Exception during client unassignment:', err);
      return { success: false, error: 'Unassignment failed' };
    }
  };

  // Context value
  const contextValue: AdminContextType = {
    // Authentication state
    isAdmin,
    adminRole,
    adminId,
    adminEmail,
    isLoading,
    
    // Assignment data
    assignedClients,
    assignedClientIds,
    
    // Admin management data
    allAdmins,
    unassignedClients,
    
    // Methods
    refreshAdminData,
    assignClient,
    unassignClient,
    
    // Error state
    error
  };

  return (
    <AdminContext.Provider value={contextValue}>
      {children}
    </AdminContext.Provider>
  );
}

// Custom hook to use AdminContext
export function useAdminContext(): AdminContextType {
  const context = useContext(AdminContext);
  
  if (context === undefined) {
    throw new Error('useAdminContext must be used within an AdminContextProvider');
  }
  
  return context;
}

// Export context for advanced usage
export { AdminContext }; 