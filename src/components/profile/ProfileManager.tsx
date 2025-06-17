import React, { useState, useEffect } from 'react';
import { ProfileSwitcher } from './ProfileSwitcher';
import { ProfileCreateModal } from './ProfileCreateModal';
import { useProfileContext } from '../../contexts/ProfileContext';
import { CompanyProfile } from '../../types';
import { canUserCreateProfiles } from '../../utils/userPermissions';

interface ProfileManagerProps {
  compact?: boolean;
  showCreateButton?: boolean;
  onProfileCreated?: (profile: CompanyProfile) => void;
  className?: string;
}

export function ProfileManager({
  compact = false,
  showCreateButton = true,
  onProfileCreated,
  className = ''
}: ProfileManagerProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [canCreateProfiles, setCanCreateProfiles] = useState(false);
  const [permissionsLoaded, setPermissionsLoaded] = useState(false);
  const { refreshProfiles } = useProfileContext();

  useEffect(() => {
    // Check if user can create profiles
    const checkPermissions = async () => {
      try {
        console.log('[ProfileManager] Checking permissions...');
        const hasPermission = await canUserCreateProfiles();
        console.log('[ProfileManager] Permission result:', hasPermission);
        setCanCreateProfiles(hasPermission);
        setPermissionsLoaded(true);
      } catch (error) {
        console.error('Error checking profile creation permissions:', error);
        setCanCreateProfiles(false);
        setPermissionsLoaded(true);
      }
    };

    checkPermissions();
  }, []);

  const handleCreateProfile = () => {
    if (!canCreateProfiles) {
      console.log('User does not have permission to create profiles');
      return;
    }
    setShowCreateModal(true);
  };

  const handleProfileSuccess = async (profile: CompanyProfile) => {
    // Refresh profiles to ensure UI is up to date
    await refreshProfiles();
    
    // Call parent callback if provided
    onProfileCreated?.(profile);
    
    console.log('[ProfileManager] New profile created:', profile.profile_name);
  };

  // Only show create button if permissions are loaded and user has permission
  const shouldShowCreateButton = showCreateButton && permissionsLoaded && canCreateProfiles;

  console.log('[ProfileManager] Render state:', {
    showCreateButton,
    permissionsLoaded,
    canCreateProfiles,
    shouldShowCreateButton
  });

  return (
    <div className={className}>
      {/* Profile Switcher */}
      <ProfileSwitcher
        compact={compact}
        showCreateButton={shouldShowCreateButton}
        onCreateProfile={handleCreateProfile}
      />

      {/* Profile Creation Modal */}
      <ProfileCreateModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handleProfileSuccess}
      />
    </div>
  );
}

// Hook for easier profile management
export function useProfileManager() {
  const context = useProfileContext();
  const [isCreating, setIsCreating] = useState(false);
  const [canCreate, setCanCreate] = useState(true);

  useEffect(() => {
    const checkPermissions = async () => {
      try {
        const hasPermission = await canUserCreateProfiles();
        setCanCreate(hasPermission);
      } catch (error) {
        console.error('Error checking profile creation permissions:', error);
        setCanCreate(false);
      }
    };

    checkPermissions();
  }, []);

  const createProfile = async (profileData: Partial<CompanyProfile>) => {
    if (!canCreate) {
      throw new Error('You do not have permission to create profiles');
    }

    setIsCreating(true);
    try {
      const result = await context.createProfile(profileData);
      return result;
    } finally {
      setIsCreating(false);
    }
  };

  return {
    ...context,
    createProfile,
    isCreating,
    canCreateProfiles: canCreate
  };
} 