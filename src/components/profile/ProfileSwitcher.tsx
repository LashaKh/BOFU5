import React, { useState, useRef, useEffect } from 'react';
import { ChevronDownIcon, UserIcon, PlusIcon } from '@heroicons/react/24/outline';
import { Users, Mail, Calendar, Shield } from 'lucide-react';
import { useProfileContext } from '../../contexts/ProfileContext';
import { CompanyProfile } from '../../types';
import { ProfileApi } from '../../lib/profileApi';
import { canUserCreateProfiles } from '../../utils/userPermissions';

interface ProfileSwitcherProps {
  onCreateProfile?: () => void;
  showCreateButton?: boolean;
  compact?: boolean;
}

export function ProfileSwitcher({ 
  onCreateProfile, 
  showCreateButton = true,
  compact = false 
}: ProfileSwitcherProps) {
  const { 
    currentProfile, 
    allProfiles, 
    switchProfile, 
    isLoading, 
    error 
  } = useProfileContext();
  
  const [isOpen, setIsOpen] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);
  const [companyUsers, setCompanyUsers] = useState<(CompanyProfile & { email?: string })[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [canManageUsers, setCanManageUsers] = useState(false);
  const [permissionsChecked, setPermissionsChecked] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Check user permissions
  useEffect(() => {
    const checkPermissions = async () => {
      try {
        console.log('[ProfileSwitcher] Starting permission check...');
        console.log('[ProfileSwitcher] Current profile:', currentProfile);
        
        // More direct approach: check if user has admin or manager role
        const hasManagementRole = currentProfile?.profile_role === 'admin' || currentProfile?.profile_role === 'manager';
        
        console.log('[ProfileSwitcher] Permission check result:', {
          hasManagementRole,
          currentProfileRole: currentProfile?.profile_role,
          currentProfileIsDefault: currentProfile?.is_default,
          currentProfileId: currentProfile?.id
        });
        
        setCanManageUsers(hasManagementRole);
        setPermissionsChecked(true);
      } catch (error) {
        console.error('[ProfileSwitcher] Error checking permissions:', error);
        setCanManageUsers(false);
        setPermissionsChecked(true);
      }
    };

    if (currentProfile) {
      checkPermissions();
    }
  }, [currentProfile]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      // Auto-load company users when dropdown opens (only for users with permission)
      if (canManageUsers && companyUsers.length === 0 && !isLoadingUsers) {
        loadCompanyUsers();
      }
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, companyUsers.length, isLoadingUsers, canManageUsers]);

  // Handle profile switch
  const handleProfileSwitch = async (profileId: string) => {
    if (profileId === currentProfile?.id || isSwitching) return;
    
    setIsSwitching(true);
    try {
      const result = await switchProfile(profileId);
      if (result.success) {
        setIsOpen(false);
      }
    } catch (err) {
      console.error('Error switching profile:', err);
    } finally {
      setIsSwitching(false);
    }
  };

  // Load company users
  const loadCompanyUsers = async () => {
    if (companyUsers.length > 0) return; // Already loaded
    
    try {
      setIsLoadingUsers(true);
      const result = await ProfileApi.getCompanyUsers();
      
      if (result.success && result.data) {
        setCompanyUsers(result.data);
      }
    } catch (err) {
      console.error('[ProfileSwitcher] Error loading company users:', err);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  // Get role badge color
  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800 border-red-200';
      case 'manager': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'editor': return 'bg-green-100 text-green-800 border-green-200';
      case 'viewer': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Get profile avatar or initials
  const getProfileDisplay = (profile: CompanyProfile) => {
    // Debug logging
    console.log('[ProfileSwitcher] Profile data:', {
      name: profile.profile_name,
      avatar: profile.profile_avatar_url,
      avatarType: typeof profile.profile_avatar_url,
      avatarLength: profile.profile_avatar_url?.length || 0
    });
    
    // Always ensure we have a fallback
    const profileName = profile.profile_name || 'User';
    const initials = profileName
      .split(' ')
      .map(word => word?.charAt(0)?.toUpperCase() || '')
      .join('')
      .slice(0, 2) || 'U';
    
    // Check if we have an avatar
    if (profile.profile_avatar_url && profile.profile_avatar_url.trim()) {
      const avatar = profile.profile_avatar_url.trim();
      
      // Simple check: if it's short and doesn't look like a URL, treat as emoji
      const isEmoji = avatar.length <= 8 && !avatar.includes('http') && !avatar.includes('www') && !avatar.includes('.com');
      
      if (isEmoji) {
        console.log('[ProfileSwitcher] Displaying emoji:', avatar);
        return (
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-xl border-2 border-white shadow-sm">
            <span style={{ fontSize: '18px', lineHeight: '1' }}>{avatar}</span>
          </div>
        );
      } else {
        console.log('[ProfileSwitcher] Displaying image:', avatar);
        return (
          <img
            src={avatar}
            alt={profileName}
            className="w-8 h-8 rounded-full object-cover border-2 border-white shadow-sm"
            onError={(e) => {
              console.log('[ProfileSwitcher] Image error, falling back to initials');
              // Replace with initials on error
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
            }}
          />
        );
      }
    }
    
    // Default to initials
    console.log('[ProfileSwitcher] Using initials:', initials);
    return (
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold border-2 border-white shadow-sm">
        {initials}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center space-x-2 px-3 py-2 bg-gray-100 rounded-lg animate-pulse">
        <div className="w-8 h-8 bg-gray-300 rounded-full"></div>
        {!compact && <div className="w-20 h-4 bg-gray-300 rounded"></div>}
      </div>
    );
  }

  if (error || !currentProfile) {
    return (
      <div className="flex items-center space-x-2 px-3 py-2 bg-red-50 text-red-700 rounded-lg border border-red-200">
        <UserIcon className="w-5 h-5" />
        {!compact && <span className="text-sm">Profile Error</span>}
      </div>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Current Profile Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isSwitching}
        className={`
          flex items-center space-x-2 px-3 py-2 rounded-lg border 
          transition-all duration-200 hover:bg-yellow-600
          ${isSwitching ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-sm'}
          ${isOpen ? 'ring-2 ring-yellow-500 ring-opacity-20' : ''}
          bg-yellow-500 border-yellow-500 text-gray-900
        `}
      >
        {getProfileDisplay(currentProfile)}
        
        {!compact && (
          <div className="flex flex-col items-start min-w-0">
            <span className="text-sm font-medium text-gray-900 truncate max-w-32">
              {currentProfile.profile_name}
            </span>
            <span className={`
              text-xs px-2 py-0.5 rounded-full border font-medium
              ${getRoleBadgeColor(currentProfile.profile_role)}
            `}>
              {currentProfile.profile_role}
            </span>
          </div>
        )}
        
        <ChevronDownIcon 
          className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`} 
        />
        
        {currentProfile.is_default && (
          <div className="w-2 h-2 bg-blue-500 rounded-full" title="Default Profile" />
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full right-0 mt-3 w-96 bg-gray-900 rounded-2xl shadow-2xl border border-gray-700/50 z-50 max-h-[80vh] overflow-hidden">
          {/* Header with Gradient */}
          <div className="px-6 py-4 bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border-b border-gray-700/50">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                  {canManageUsers ? 'Company Users' : 'Current Profile'}
                </h3>
                <p className="text-sm text-gray-400 mt-1">
                  {canManageUsers 
                    ? (companyUsers.length > 0 ? `${companyUsers.length} team member${companyUsers.length !== 1 ? 's' : ''}` : 'Loading team members...')
                    : 'Your account information'
                  }
                </p>
              </div>
              <div 
                className="p-2 bg-yellow-500/20 rounded-lg cursor-pointer hover:bg-yellow-500/30 transition-colors"
                onClick={() => setIsOpen(false)}
              >
                <ChevronDownIcon className="w-5 h-5 text-yellow-400" />
              </div>
            </div>
          </div>

          <div className="overflow-y-auto max-h-[60vh]">
            {canManageUsers ? (
              <>
                {/* Company Users List - Only for main accounts */}
                <div className="px-6 py-4">
                  {isLoadingUsers ? (
                    <div className="flex justify-center items-center py-8">
                      <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                      <span className="ml-3 text-gray-400">Loading users...</span>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {companyUsers.map((user) => (
                        <div
                          key={user.id}
                          className="p-3 bg-gray-800/50 rounded-lg border border-gray-600/30 hover:border-blue-500/30 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                              <span className="text-white text-sm font-bold">
                                {user.profile_name?.charAt(0)?.toUpperCase() || 'U'}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-white text-sm">{user.profile_name}</h4>
                              <div className="flex items-center gap-2 text-xs text-gray-400 mt-1">
                                <Mail className="h-3 w-3" />
                                {user.email || 'Email not available'}
                              </div>
                              <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                                <Calendar className="h-3 w-3" />
                                Joined {new Date(user.created_at).toLocaleDateString()}
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              <span className={`
                                px-2 py-1 text-xs font-medium rounded border
                                ${user.profile_role === 'admin' ? 'bg-red-500/20 text-red-300 border-red-500/30' :
                                  user.profile_role === 'manager' ? 'bg-blue-500/20 text-blue-300 border-blue-500/30' :
                                  user.profile_role === 'editor' ? 'bg-green-500/20 text-green-300 border-green-500/30' :
                                  'bg-gray-500/20 text-gray-300 border-gray-500/30'
                                }
                              `}>
                                {user.profile_role}
                              </span>
                              {user.is_default && (
                                <span className="px-2 py-1 bg-yellow-500/20 text-yellow-300 text-xs font-medium rounded border border-yellow-500/30">
                                  Default
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                      {companyUsers.length === 0 && !isLoadingUsers && (
                        <div className="text-center py-8 text-gray-400">
                          <Users className="h-12 w-12 mx-auto mb-3 text-gray-600" />
                          <p className="text-sm">No company users found</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Add New Profile Button - Only for main accounts */}
                {showCreateButton && onCreateProfile && (
                  <div className="px-6 py-4 border-t border-gray-700/50">
                    <button
                      onClick={() => {
                        onCreateProfile();
                        setIsOpen(false);
                      }}
                      className="w-full flex items-center justify-center gap-3 p-4 bg-gradient-to-r from-yellow-500/20 to-amber-500/20 hover:from-yellow-500/30 hover:to-amber-500/30 border border-yellow-500/30 hover:border-yellow-500/50 rounded-lg transition-all duration-200 group"
                    >
                      <div className="p-2 bg-yellow-500/20 group-hover:bg-yellow-500/30 rounded-lg transition-colors">
                        <PlusIcon className="h-5 w-5 text-yellow-400" />
                      </div>
                      <div className="text-left">
                        <h4 className="font-semibold text-white text-sm">Add New User</h4>
                        <p className="text-xs text-gray-400">Create a new team member</p>
                      </div>
                    </button>
                  </div>
                )}
              </>
            ) : (
              /* Current Profile Info - For regular team members */
              <div className="px-6 py-4">
                <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-600/30">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-lg font-bold">
                        {currentProfile.profile_name?.charAt(0)?.toUpperCase() || 'U'}
                      </span>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-white text-lg">{currentProfile.profile_name}</h4>
                      <div className="flex items-center gap-2 text-sm text-gray-400 mt-1">
                        <Shield className="h-4 w-4" />
                        {currentProfile.profile_role} access
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                        <Calendar className="h-4 w-4" />
                        Member since {new Date(currentProfile.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className={`
                        px-3 py-1 text-sm font-medium rounded border
                        ${currentProfile.profile_role === 'admin' ? 'bg-red-500/20 text-red-300 border-red-500/30' :
                          currentProfile.profile_role === 'manager' ? 'bg-blue-500/20 text-blue-300 border-blue-500/30' :
                          currentProfile.profile_role === 'editor' ? 'bg-green-500/20 text-green-300 border-green-500/30' :
                          'bg-gray-500/20 text-gray-300 border-gray-500/30'
                        }
                      `}>
                        {currentProfile.profile_role}
                      </span>
                      {currentProfile.is_default && (
                        <span className="px-2 py-1 bg-yellow-500/20 text-yellow-300 text-xs font-medium rounded border border-yellow-500/30">
                          Default
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                  <p className="text-blue-300 text-sm text-center">
                    <UserIcon className="h-4 w-4 inline mr-2" />
                    You are logged in as a team member
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Loading Indicator */}
      {isSwitching && (
        <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 rounded-lg">
          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
    </div>
  );
} 