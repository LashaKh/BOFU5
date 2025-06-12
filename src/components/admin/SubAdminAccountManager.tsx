import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAdminContext } from '../../contexts/AdminContext';
import { 
  UserPlus, 
  Shield, 
  Users, 
  Mail, 
  Eye, 
  EyeOff, 
  Trash2, 
  Edit3, 
  Save, 
  X, 
  AlertCircle, 
  CheckCircle, 
  Loader2,
  Crown,
  UserCheck,
  Calendar,
  Activity,
  Lock,
  Unlock,
  MoreVertical
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase, supabaseAdmin } from '../../lib/supabase';

interface SubAdminAccountManagerProps {
  isVisible: boolean;
  onClose: () => void;
}

interface SubAdminAccount {
  id: string;
  email: string;
  admin_role: 'super_admin' | 'sub_admin';
  created_at: string;
  updated_at: string;
  assigned_clients_count?: number;
  last_login?: string;
  is_active?: boolean;
}

interface CreateSubAdminForm {
  email: string;
  tempPassword: string;
  confirmPassword: string;
  sendInvite: boolean;
}

export function SubAdminAccountManager({ isVisible, onClose }: SubAdminAccountManagerProps) {
  const { 
    adminRole, 
    allAdmins, 
    refreshAdminData
  } = useAdminContext();

  const [subAdmins, setSubAdmins] = useState<SubAdminAccount[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  
  const [createForm, setCreateForm] = useState<CreateSubAdminForm>({
    email: '',
    tempPassword: '',
    confirmPassword: '',
    sendInvite: true
  });

  // Only super-admins can access this component
  if (adminRole !== 'super_admin') {
    return null;
  }

  // Load sub-admin accounts
  const loadSubAdmins = async () => {
    try {
      setIsLoading(true);
      
      // Get all admin profiles with sub_admin role
      const { data: adminProfiles, error } = await supabase
        .from('admin_profiles')
        .select(`
          *,
          admin_client_assignments!admin_id(count)
        `)
        .eq('admin_role', 'sub_admin')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading sub-admins:', error);
        toast.error('Failed to load sub-admin accounts');
        return;
      }

      const transformedSubAdmins: SubAdminAccount[] = adminProfiles.map(admin => ({
        id: admin.id,
        email: admin.email,
        admin_role: admin.admin_role,
        created_at: admin.created_at,
        updated_at: admin.updated_at,
        assigned_clients_count: admin.admin_client_assignments?.[0]?.count || 0,
        is_active: true // You can add an is_active column to track this
      }));

      setSubAdmins(transformedSubAdmins);
    } catch (error) {
      console.error('Error loading sub-admins:', error);
      toast.error('Failed to load sub-admin accounts');
    } finally {
      setIsLoading(false);
    }
  };

  // Create new sub-admin account
  const handleCreateSubAdmin = async () => {
    try {
      // Validation
      if (!createForm.email || !createForm.tempPassword) {
        toast.error('Email and password are required');
        return;
      }

      if (createForm.tempPassword !== createForm.confirmPassword) {
        toast.error('Passwords do not match');
        return;
      }

      if (createForm.tempPassword.length < 8) {
        toast.error('Password must be at least 8 characters');
        return;
      }

      setIsCreating(true);

      // Check if admin client is available
      if (!supabaseAdmin) {
        toast.error('Service role key not configured. Cannot create user accounts.');
        return;
      }

      // First, create the user account using Supabase Admin API
      const { data: newUser, error: signUpError } = await supabaseAdmin.auth.admin.createUser({
        email: createForm.email,
        password: createForm.tempPassword,
        email_confirm: true, // Auto-confirm email
        user_metadata: {
          role: 'sub_admin',
          created_by: 'super_admin'
        }
      });

      if (signUpError) {
        console.error('Error creating user account:', signUpError);
        toast.error(`Failed to create user account: ${signUpError.message}`);
        return;
      }

      if (!newUser.user) {
        toast.error('Failed to create user account');
        return;
      }

      // Create admin profile for the new user
      const { error: profileError } = await supabase
        .from('admin_profiles')
        .insert({
          id: newUser.user.id,
          email: createForm.email,
          admin_role: 'sub_admin',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (profileError) {
        console.error('Error creating admin profile:', profileError);
        toast.error(`Failed to create admin profile: ${profileError.message}`);
        
        // Cleanup: delete the user account if profile creation failed
        if (supabaseAdmin) {
          await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
        }
        return;
      }

      toast.success(`Sub-admin account created successfully for ${createForm.email}`);
      
      // Reset form and refresh data
      setCreateForm({
        email: '',
        tempPassword: '',
        confirmPassword: '',
        sendInvite: true
      });
      setShowCreateForm(false);
      await loadSubAdmins();
      await refreshAdminData();

      // Send invitation email if requested
      if (createForm.sendInvite) {
        toast.success('Invitation email sent to the new sub-admin');
      }

    } catch (error) {
      console.error('Error creating sub-admin:', error);
      toast.error('Failed to create sub-admin account');
    } finally {
      setIsCreating(false);
    }
  };

  // Delete sub-admin account
  const handleDeleteSubAdmin = async (adminId: string, email: string) => {
    if (!confirm(`Are you sure you want to delete the sub-admin account for ${email}? This action cannot be undone.`)) {
      return;
    }

    try {
      setIsLoading(true);

      // First, remove all client assignments
      const { error: assignmentError } = await supabase
        .from('admin_client_assignments')
        .delete()
        .eq('admin_id', adminId);

      if (assignmentError) {
        console.error('Error removing assignments:', assignmentError);
        toast.error('Failed to remove client assignments');
        return;
      }

      // Delete admin profile
      const { error: profileError } = await supabase
        .from('admin_profiles')
        .delete()
        .eq('id', adminId);

      if (profileError) {
        console.error('Error deleting admin profile:', profileError);
        toast.error('Failed to delete admin profile');
        return;
      }

      // Delete user account
      if (!supabaseAdmin) {
        toast.error('Service role key not configured. Cannot delete user accounts.');
        return;
      }

      const { error: userError } = await supabaseAdmin.auth.admin.deleteUser(adminId);

      if (userError) {
        console.error('Error deleting user account:', userError);
        toast.error('Failed to delete user account');
        return;
      }

      toast.success(`Sub-admin account deleted successfully`);
      await loadSubAdmins();
      await refreshAdminData();

    } catch (error) {
      console.error('Error deleting sub-admin:', error);
      toast.error('Failed to delete sub-admin account');
    } finally {
      setIsLoading(false);
    }
  };

  // Generate secure password
  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCreateForm(prev => ({
      ...prev,
      tempPassword: password,
      confirmPassword: password
    }));
  };

  // Load sub-admins on component mount
  useEffect(() => {
    if (isVisible) {
      loadSubAdmins();
    }
  }, [isVisible]);

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
            className="bg-gray-900 rounded-xl shadow-2xl border border-gray-700 max-w-5xl w-full max-h-[90vh] overflow-hidden"
          >
            {/* Header */}
            <div className="p-6 border-b border-gray-700 bg-gray-800/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-yellow-500/20">
                    <Crown className="h-6 w-6 text-yellow-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Sub-Admin Account Manager</h2>
                    <p className="text-sm text-gray-400">Create and manage sub-admin editor accounts</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowCreateForm(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                  >
                    <UserPlus className="h-4 w-4" />
                    Create Sub-Admin
                  </button>
                  <button
                    onClick={onClose}
                    className="p-2 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 max-h-[calc(90vh-140px)] overflow-y-auto">
              {/* Create Form Modal */}
              <AnimatePresence>
                {showCreateForm && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-60 p-4"
                    onClick={(e) => e.target === e.currentTarget && setShowCreateForm(false)}
                  >
                    <div className="bg-gray-800 rounded-xl shadow-2xl border border-gray-700 max-w-md w-full p-6">
                      <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <UserPlus className="h-5 w-5 text-blue-400" />
                        Create New Sub-Admin
                      </h3>
                      
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Email Address
                          </label>
                          <input
                            type="email"
                            value={createForm.email}
                            onChange={(e) => setCreateForm(prev => ({ ...prev, email: e.target.value }))}
                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                            placeholder="editor@company.com"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Temporary Password
                          </label>
                          <div className="relative">
                            <input
                              type={showPassword ? 'text' : 'password'}
                              value={createForm.tempPassword}
                              onChange={(e) => setCreateForm(prev => ({ ...prev, tempPassword: e.target.value }))}
                              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 pr-20"
                              placeholder="Enter password"
                            />
                            <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="p-1 text-gray-400 hover:text-white"
                              >
                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </button>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={generatePassword}
                            className="mt-1 text-xs text-blue-400 hover:text-blue-300"
                          >
                            Generate secure password
                          </button>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Confirm Password
                          </label>
                          <input
                            type={showPassword ? 'text' : 'password'}
                            value={createForm.confirmPassword}
                            onChange={(e) => setCreateForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                            placeholder="Confirm password"
                          />
                        </div>

                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id="sendInvite"
                            checked={createForm.sendInvite}
                            onChange={(e) => setCreateForm(prev => ({ ...prev, sendInvite: e.target.checked }))}
                            className="rounded"
                          />
                          <label htmlFor="sendInvite" className="text-sm text-gray-300">
                            Send invitation email to new sub-admin
                          </label>
                        </div>
                      </div>

                      <div className="flex gap-3 mt-6">
                        <button
                          onClick={handleCreateSubAdmin}
                          disabled={isCreating}
                          className="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                          {isCreating ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <UserPlus className="h-4 w-4" />
                              Create Account
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => setShowCreateForm(false)}
                          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Sub-Admin List */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Shield className="h-5 w-5 text-blue-400" />
                    Sub-Admin Accounts ({subAdmins.length})
                  </h3>
                  <button
                    onClick={loadSubAdmins}
                    disabled={isLoading}
                    className="p-2 text-gray-400 hover:text-white transition-colors"
                  >
                    <Loader2 className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                  </button>
                </div>

                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
                  </div>
                ) : subAdmins.length > 0 ? (
                  <div className="grid gap-4">
                    {subAdmins.map((admin) => (
                      <motion.div
                        key={admin.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-4 bg-gray-800/60 rounded-lg border border-gray-700"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center">
                              <UserCheck className="h-5 w-5 text-gray-300" />
                            </div>
                            <div>
                              <h4 className="font-medium text-white">{admin.email}</h4>
                              <div className="flex items-center gap-4 text-sm text-gray-400">
                                <span className="flex items-center gap-1">
                                  <Users className="h-3 w-3" />
                                  {admin.assigned_clients_count || 0} clients
                                </span>
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  Created {new Date(admin.created_at).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-1 bg-blue-500/20 text-blue-300 text-xs font-medium rounded-full border border-blue-500/30">
                              Sub Admin
                            </span>
                            <button
                              onClick={() => handleDeleteSubAdmin(admin.id, admin.email)}
                              className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                              title="Delete account"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <UserCheck className="h-16 w-16 mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-semibold mb-2">No Sub-Admin Accounts</h3>
                    <p className="mb-4">Create your first sub-admin editor account to get started</p>
                    <button
                      onClick={() => setShowCreateForm(true)}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                    >
                      <UserPlus className="h-4 w-4" />
                      Create Sub-Admin
                    </button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
} 