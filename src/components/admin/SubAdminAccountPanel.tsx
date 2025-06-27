import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
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
  AlertCircle, 
  CheckCircle, 
  Loader2,
  Crown,
  UserCheck,
  Calendar,
  Lock,
  Unlock
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase, supabaseAdmin } from '../../lib/supabase';

interface SubAdminAccountPanelProps {
  className?: string;
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

export function SubAdminAccountPanel({ className = '' }: SubAdminAccountPanelProps) {
  const { 
    adminRole, 
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
    return (
      <div className={`${className} flex items-center justify-center h-96`}>
        <div className="text-center text-gray-500">
          <Shield className="h-16 w-16 mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-semibold mb-2">Access Denied</h3>
          <p>Only super-admins can access sub-admin account management</p>
        </div>
      </div>
    );
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

      // First, delete all client assignments for this admin
      const { error: assignmentError } = await supabase
        .from('admin_client_assignments')
        .delete()
        .eq('admin_id', adminId);

      if (assignmentError) {
        console.error('Error deleting client assignments:', assignmentError);
        toast.error('Failed to delete client assignments');
        return;
      }

      // Delete the admin profile
      const { error: profileError } = await supabase
        .from('admin_profiles')
        .delete()
        .eq('id', adminId);

      if (profileError) {
        console.error('Error deleting admin profile:', profileError);
        toast.error(`Failed to delete admin profile: ${profileError.message}`);
        return;
      }

      // Delete the user account using Admin API
      if (supabaseAdmin) {
        const { error: userError } = await supabaseAdmin.auth.admin.deleteUser(adminId);
        if (userError) {
          console.error('Error deleting user account:', userError);
          // Don't fail the operation if user deletion fails
        }
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

  // Generate random password
  const generatePassword = () => {
    const length = 12;
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    for (let i = 0, n = charset.length; i < length; ++i) {
      password += charset.charAt(Math.floor(Math.random() * n));
    }
    setCreateForm(prev => ({ ...prev, tempPassword: password, confirmPassword: password }));
  };

  // Load data on mount
  useEffect(() => {
    loadSubAdmins();
  }, []);

  return (
    <div className={`${className} h-full flex flex-col`}>
      {/* Panel Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/20">
              <Shield className="h-6 w-6 text-purple-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Sub-Admin Accounts</h2>
              <p className="text-sm text-gray-400">Create and manage sub-admin editor accounts</p>
            </div>
          </div>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 transition-colors"
          >
            <UserPlus className="h-4 w-4" />
            {showCreateForm ? 'Cancel' : 'Create Account'}
          </button>
        </div>
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto">
        {/* Create Form */}
        {showCreateForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="p-6 rounded-lg bg-gray-800/60 border border-gray-700"
          >
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-purple-400" />
              Create New Sub-Admin Account
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={createForm.email}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
                  placeholder="admin@example.com"
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
                    className="w-full px-3 py-2 pr-10 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
                    placeholder="Enter password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={generatePassword}
                  className="mt-1 text-xs text-purple-400 hover:text-purple-300"
                >
                  Generate random password
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={createForm.confirmPassword}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
                  placeholder="Confirm password"
                />
              </div>

              <div className="flex items-center">
                <button
                  onClick={handleCreateSubAdmin}
                  disabled={isCreating}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-500 text-white hover:bg-purple-600 transition-colors disabled:opacity-50"
                >
                  {isCreating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Create Account
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Sub-Admin List */}
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Users className="h-5 w-5 text-purple-400" />
            Existing Sub-Admin Accounts ({subAdmins.length})
          </h3>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
            </div>
          ) : subAdmins.length > 0 ? (
            <div className="space-y-3">
              {subAdmins.map((admin) => (
                <motion.div
                  key={admin.id}
                  whileHover={{ scale: 1.01 }}
                  className="p-4 rounded-lg bg-gray-800/60 border border-gray-700"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-purple-500/20 rounded-full flex items-center justify-center">
                        <UserCheck className="h-5 w-5 text-purple-400" />
                      </div>
                      <div>
                        <p className="font-medium text-white">{admin.email}</p>
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
                      <span className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-green-500/20 text-green-400">
                        <CheckCircle className="h-3 w-3" />
                        Active
                      </span>
                      <button
                        onClick={() => handleDeleteSubAdmin(admin.id, admin.email)}
                        className="p-2 rounded-lg text-red-400 hover:text-white hover:bg-red-500/20 transition-colors"
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
              <Shield className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-2">No Sub-Admin Accounts</h3>
              <p>Create your first sub-admin account to get started</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 