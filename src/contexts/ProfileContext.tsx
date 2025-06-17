import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { ProfileApi, ProfileApiResponse } from '../lib/profileApi';
import { CompanyProfile, ProfileContextType, ProfilePermissions } from '../types';
import { getUserType } from '../utils/userPermissions';

// Create the profile context
const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

interface ProfileContextProviderProps {
  children: ReactNode;
  user: User | null;
}

export function ProfileContextProvider({ children, user }: ProfileContextProviderProps) {
  // Core profile state
  const [currentProfile, setCurrentProfile] = useState<CompanyProfile | null>(null);
  const [allProfiles, setAllProfiles] = useState<CompanyProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize profile data when user changes
  useEffect(() => {
    const initializeProfiles = async () => {
      setIsLoading(true);
      setError(null);
      
      if (!user) {
        // User signed out - reset profile state
        setCurrentProfile(null);
        setAllProfiles([]);
        setIsLoading(false);
        return;
      }

      try {
        console.log('[ProfileContext] Initializing profiles for user:', user.email);
        
        // Clean expired sessions first
        await ProfileApi.cleanExpiredSessions();
        
        // Load current profile and all profiles
        const [currentResult, allResult] = await Promise.allSettled([
          ProfileApi.getCurrentProfile(),
          ProfileApi.getUserProfiles()
        ]);
        
        // Handle current profile result
        if (currentResult.status === 'fulfilled' && currentResult.value.success) {
          setCurrentProfile(currentResult.value.data || null);
          console.log('[ProfileContext] Current profile loaded:', currentResult.value.data?.profile_name);
        } else {
          console.error('[ProfileContext] Error loading current profile:', 
            currentResult.status === 'rejected' ? currentResult.reason : currentResult.value.error);
          setError('Failed to load current profile');
        }
        
        // Handle all profiles result
        if (allResult.status === 'fulfilled' && allResult.value.success) {
          setAllProfiles(allResult.value.data || []);
          console.log('[ProfileContext] Loaded', allResult.value.data?.length || 0, 'profiles');
        } else {
          console.error('[ProfileContext] Error loading all profiles:', 
            allResult.status === 'rejected' ? allResult.reason : allResult.value.error);
          setError('Failed to load profiles');
        }
        
      } catch (err) {
        console.error('[ProfileContext] Exception initializing profiles:', err);
        setError('Failed to initialize profiles');
      } finally {
        setIsLoading(false);
      }
    };

    initializeProfiles();
  }, [user]);

  // Switch to a different profile
  const switchProfile = async (profileId: string): Promise<{ success: boolean; error?: string }> => {
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    try {
      console.log('[ProfileContext] Switching to profile:', profileId);
      setError(null);
      
      const result = await ProfileApi.switchProfile(profileId);
      
      if (result.success && result.data) {
        setCurrentProfile(result.data);
        console.log('[ProfileContext] Profile switched successfully to:', result.data.profile_name);
        
        // Trigger a custom event that other components can listen to
        window.dispatchEvent(new CustomEvent('profileSwitched', { 
          detail: { profile: result.data } 
        }));
        
        return { success: true };
      } else {
        setError(result.error || 'Failed to switch profile');
        return { success: false, error: result.error };
      }
    } catch (err) {
      console.error('[ProfileContext] Exception switching profile:', err);
      const errorMsg = 'Failed to switch profile';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  // Create new profile
  const createProfile = async (profileData: Partial<CompanyProfile> & { email?: string; password?: string }) => {
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    try {
      setIsLoading(true);
      setError(null);
      
      let result: ProfileApiResponse<CompanyProfile>;
      
      // Check if this is a company user creation (has email and password)
      if (profileData.email && profileData.password) {
        console.log('[ProfileContext] Attempting to create company user with credentials');
        console.log('[ProfileContext] Request data:', {
          email: profileData.email,
          profile_name: profileData.profile_name,
          profile_role: profileData.profile_role,
          has_password: !!profileData.password,
          has_avatar: !!profileData.profile_avatar_url
        });
        
        // Call the Edge Function to create a company user with login credentials
        result = await ProfileApi.createCompanyUser({
          email: profileData.email,
          password: profileData.password,
          profile_name: profileData.profile_name || 'New User',
          profile_role: profileData.profile_role || 'viewer',
          profile_avatar_url: profileData.profile_avatar_url || undefined
        });
        
        if (result.success && result.data) {
          console.log('[ProfileContext] Company user created successfully');
          await refreshProfiles();
          return { success: true, profile: result.data };
        } else {
          console.log('[ProfileContext] Company user creation failed:', result.error);
          return { success: false, error: result.error || 'Failed to create company user' };
        }
      } else {
        // Otherwise, create a regular profile (existing functionality)
        console.log('[ProfileContext] Creating regular profile');
        result = await ProfileApi.createProfile(profileData);
      }

      if (result.success && result.data) {
        // Refresh profiles list
        await refreshProfiles();
        return { success: true, profile: result.data };
      } else {
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error('[ProfileContext] Error creating profile:', error);
      return { success: false, error: 'Failed to create profile' };
    } finally {
      setIsLoading(false);
    }
  };

  // Update profile
  const updateProfile = async (profileId: string, updates: Partial<CompanyProfile>): Promise<{ success: boolean; error?: string }> => {
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    try {
      console.log('[ProfileContext] Updating profile:', profileId);
      setError(null);
      
      const result = await ProfileApi.updateProfile(profileId, updates);
      
      if (result.success && result.data) {
        // Update local state
        if (currentProfile?.id === profileId) {
          setCurrentProfile(result.data);
        }
        
        setAllProfiles(prev => 
          prev.map(profile => 
            profile.id === profileId ? result.data! : profile
          )
        );
        
        console.log('[ProfileContext] Profile updated successfully');
        return { success: true };
      } else {
        setError(result.error || 'Failed to update profile');
        return { success: false, error: result.error };
      }
    } catch (err) {
      console.error('[ProfileContext] Exception updating profile:', err);
      const errorMsg = 'Failed to update profile';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  // Delete profile
  const deleteProfile = async (profileId: string): Promise<{ success: boolean; error?: string }> => {
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    try {
      console.log('[ProfileContext] Deleting profile:', profileId);
      setError(null);
      
      const result = await ProfileApi.deleteProfile(profileId);
      
      if (result.success) {
        // Remove from local state
        setAllProfiles(prev => prev.filter(profile => profile.id !== profileId));
        
        // If this was the current profile, switch to default
        if (currentProfile?.id === profileId) {
          const defaultProfile = allProfiles.find(p => p.is_default && p.id !== profileId);
          if (defaultProfile) {
            await switchProfile(defaultProfile.id);
          } else {
            setCurrentProfile(null);
          }
        }
        
        console.log('[ProfileContext] Profile deleted successfully');
        return { success: true };
      } else {
        setError(result.error || 'Failed to delete profile');
        return { success: false, error: result.error };
      }
    } catch (err) {
      console.error('[ProfileContext] Exception deleting profile:', err);
      const errorMsg = 'Failed to delete profile';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  // Refresh all profile data
  const refreshProfiles = async (): Promise<void> => {
    if (!user) return;
    
    try {
      console.log('[ProfileContext] Refreshing profile data...');
      setError(null);
      
      const [currentResult, allResult] = await Promise.allSettled([
        ProfileApi.getCurrentProfile(),
        ProfileApi.getUserProfiles()
      ]);
      
      if (currentResult.status === 'fulfilled' && currentResult.value.success) {
        setCurrentProfile(currentResult.value.data || null);
      }
      
      if (allResult.status === 'fulfilled' && allResult.value.success) {
        setAllProfiles(allResult.value.data || []);
      }
      
    } catch (err) {
      console.error('[ProfileContext] Error refreshing profiles:', err);
      setError('Failed to refresh profile data');
    }
  };

  // Check if current profile has specific permission
  const hasPermission = (permission: keyof ProfilePermissions): boolean => {
    return ProfileApi.hasPermission(currentProfile, permission);
  };

  // Check if current user can create profiles (only original accounts)
  const canCreateProfiles = async (): Promise<boolean> => {
    if (!user) return false;
    
    try {
      const userType = await getUserType(user.id);
      return userType.canCreateProfiles;
    } catch (error) {
      console.error('[ProfileContext] Error checking profile creation permissions:', error);
      return false;
    }
  };

  // Get user's company
  const getUserCompany = (): string | null => {
    return ProfileApi.getUserCompany(currentProfile);
  };

  // Context value
  const contextValue: ProfileContextType = {
    currentProfile,
    allProfiles,
    isLoading,
    error,
    switchProfile,
    createProfile,
    updateProfile,
    deleteProfile,
    refreshProfiles,
    hasPermission,
    canCreateProfiles,
    getUserCompany
  };

  return (
    <ProfileContext.Provider value={contextValue}>
      {children}
    </ProfileContext.Provider>
  );
}

// Hook to use the profile context
export function useProfileContext(): ProfileContextType {
  const context = useContext(ProfileContext);
  if (context === undefined) {
    throw new Error('useProfileContext must be used within a ProfileContextProvider');
  }
  return context;
}

// Hook to check if a specific permission is available
export function useProfilePermission(permission: keyof ProfilePermissions): boolean {
  const { hasPermission } = useProfileContext();
  return hasPermission(permission);
}

// Hook to check if user can create profiles (only original accounts)
export function useCanCreateProfiles(): () => Promise<boolean> {
  const { canCreateProfiles } = useProfileContext();
  return canCreateProfiles;
}

// Hook to get current profile company
export function useUserCompany(): string | null {
  const { getUserCompany } = useProfileContext();
  return getUserCompany();
} 