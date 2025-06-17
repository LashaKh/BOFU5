import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, Mail, UserCircle, Calendar, Shield, Loader2 } from 'lucide-react';
import { ProfileApi } from '../../lib/profileApi';
import { CompanyProfile } from '../../types';
import { toast } from 'react-hot-toast';

interface CompanyUsersListProps {
  isVisible: boolean;
  onClose?: () => void;
}

export function CompanyUsersList({ isVisible, onClose }: CompanyUsersListProps) {
  const [companyUsers, setCompanyUsers] = useState<(CompanyProfile & { email?: string })[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isVisible) {
      loadCompanyUsers();
    }
  }, [isVisible]);

  const loadCompanyUsers = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const result = await ProfileApi.getCompanyUsers();
      
      if (result.success && result.data) {
        setCompanyUsers(result.data);
        console.log('[CompanyUsersList] Loaded company users:', result.data);
      } else {
        setError(result.error || 'Failed to load company users');
        toast.error(result.error || 'Failed to load company users');
      }
    } catch (err) {
      console.error('[CompanyUsersList] Error loading company users:', err);
      setError('Failed to load company users');
      toast.error('Failed to load company users');
    } finally {
      setIsLoading(false);
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'text-red-400 bg-red-500/20 border-red-500/30';
      case 'manager':
        return 'text-blue-400 bg-blue-500/20 border-blue-500/30';
      case 'editor':
        return 'text-green-400 bg-green-500/20 border-green-500/30';
      case 'viewer':
        return 'text-gray-400 bg-gray-500/20 border-gray-500/30';
      default:
        return 'text-gray-400 bg-gray-500/20 border-gray-500/30';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <Shield className="h-4 w-4" />;
      case 'manager':
        return <Users className="h-4 w-4" />;
      case 'editor':
        return <UserCircle className="h-4 w-4" />;
      case 'viewer':
        return <UserCircle className="h-4 w-4" />;
      default:
        return <UserCircle className="h-4 w-4" />;
    }
  };

  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-gray-800/80 backdrop-blur-xl shadow-2xl rounded-2xl p-6 border border-gray-700/50"
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg">
            <Users className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Company Users</h2>
            <p className="text-sm text-gray-400">All users in your company</p>
          </div>
        </div>
        <span className="px-3 py-1 bg-blue-500/20 text-blue-300 text-sm font-medium rounded-full border border-blue-500/30">
          {companyUsers.length} Users
        </span>
      </div>

      {isLoading && (
        <div className="flex justify-center items-center py-12">
          <div className="text-center">
            <Loader2 className="h-8 w-8 text-blue-400 animate-spin mx-auto mb-4" />
            <p className="text-gray-300">Loading company users...</p>
          </div>
        </div>
      )}

      {error && (
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/30">
            <Users className="h-8 w-8 text-red-400" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">Error Loading Users</h3>
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={loadCompanyUsers}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
          >
            Try Again
          </button>
        </div>
      )}

      {!isLoading && !error && companyUsers.length === 0 && (
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-gray-600/50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">No Users Found</h3>
          <p className="text-gray-400">No users found in your company.</p>
        </div>
      )}

      {!isLoading && !error && companyUsers.length > 0 && (
        <div className="space-y-3">
          {companyUsers.map((user, index) => (
            <motion.div
              key={user.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="p-4 bg-gray-700/50 rounded-xl border border-gray-600/30 hover:border-blue-500/30 transition-all duration-200"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                    <UserCircle className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">{user.profile_name}</h3>
                    <div className="flex items-center gap-2 text-sm text-gray-300">
                      <Mail className="h-3 w-3" />
                      {user.email || 'Email not available'}
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                      <Calendar className="h-3 w-3" />
                      Created {new Date(user.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 text-xs font-medium rounded-full border flex items-center gap-1 ${getRoleColor(user.profile_role)}`}>
                    {getRoleIcon(user.profile_role)}
                    {user.profile_role}
                  </span>
                  {user.is_default && (
                    <span className="px-2 py-1 bg-yellow-500/20 text-yellow-300 text-xs font-medium rounded border border-yellow-500/30">
                      Default
                    </span>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
} 