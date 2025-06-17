import React from 'react';
import { useProfileContext } from '../../contexts/ProfileContext';
import { ProfileManager } from './ProfileManager';

export function ProfileTest() {
  const {
    currentProfile,
    allProfiles,
    isLoading,
    error,
    hasPermission,
    getUserCompany
  } = useProfileContext();

  const userCompany = getUserCompany();

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto p-6 bg-secondary-900 rounded-lg">
        <div className="animate-pulse text-center">
          <div className="text-white">Loading profiles...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-6 bg-red-900/20 border border-red-500/30 rounded-lg">
        <div className="text-red-400">
          <h3 className="font-semibold mb-2">Profile Error</h3>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="bg-secondary-900 rounded-lg p-6">
        <h2 className="text-2xl font-bold text-white mb-6">Profile Management Test</h2>
        
        {/* Profile Manager */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-primary-400 mb-4">Profile Switcher</h3>
          <ProfileManager 
            compact={false}
            showCreateButton={true}
            onProfileCreated={(profile) => {
              console.log('Test: New profile created:', profile);
            }}
          />
        </div>

        {/* Current Profile Info */}
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-secondary-800 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-primary-400 mb-3">Current Profile</h3>
            {currentProfile ? (
              <div className="space-y-2 text-sm">
                <div><span className="text-gray-400">Name:</span> <span className="text-white">{currentProfile.profile_name}</span></div>
                <div><span className="text-gray-400">Role:</span> <span className="text-white capitalize">{currentProfile.profile_role}</span></div>
                <div><span className="text-gray-400">Company:</span> <span className="text-white">{currentProfile.company_id}</span></div>
                <div><span className="text-gray-400">Default:</span> <span className="text-white">{currentProfile.is_default ? 'Yes' : 'No'}</span></div>
                <div><span className="text-gray-400">Created:</span> <span className="text-white">{new Date(currentProfile.created_at).toLocaleDateString()}</span></div>
              </div>
            ) : (
              <div className="text-gray-400">No profile selected</div>
            )}
          </div>

          <div className="bg-secondary-800 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-primary-400 mb-3">Permissions</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Create Content:</span>
                <span className={hasPermission('canCreateContent') ? 'text-green-400' : 'text-red-400'}>
                  {hasPermission('canCreateContent') ? 'Yes' : 'No'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Edit Content:</span>
                <span className={hasPermission('canEditContent') ? 'text-green-400' : 'text-red-400'}>
                  {hasPermission('canEditContent') ? 'Yes' : 'No'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Manage Users:</span>
                <span className={hasPermission('canManageUsers') ? 'text-green-400' : 'text-red-400'}>
                  {hasPermission('canManageUsers') ? 'Yes' : 'No'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">View Analytics:</span>
                <span className={hasPermission('canViewAnalytics') ? 'text-green-400' : 'text-red-400'}>
                  {hasPermission('canViewAnalytics') ? 'Yes' : 'No'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* All Profiles */}
        <div className="mt-6">
          <h3 className="text-lg font-semibold text-primary-400 mb-3">All Available Profiles ({allProfiles.length})</h3>
          <div className="grid gap-3">
            {allProfiles.map((profile) => (
              <div 
                key={profile.id} 
                className={`p-3 rounded border transition-all ${
                  currentProfile?.id === profile.id 
                    ? 'bg-primary-500/20 border-primary-500/50' 
                    : 'bg-secondary-800/50 border-secondary-700'
                }`}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-medium text-white">{profile.profile_name}</div>
                    <div className="text-sm text-gray-400 capitalize">{profile.profile_role} {profile.is_default && '(Default)'}</div>
                  </div>
                  <div className="text-sm text-gray-500">
                    {new Date(profile.created_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Company Info */}
        <div className="mt-6 bg-secondary-800 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-primary-400 mb-3">Company Information</h3>
          <div className="text-sm">
            <div><span className="text-gray-400">Company:</span> <span className="text-white">{userCompany || 'Unknown'}</span></div>
          </div>
        </div>
      </div>
    </div>
  );
} 