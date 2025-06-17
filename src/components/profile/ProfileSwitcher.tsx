import React, { useState, useRef, useEffect } from 'react';
import { ChevronDownIcon, UserIcon, PlusIcon } from '@heroicons/react/24/outline';
import { useProfileContext } from '../../contexts/ProfileContext';
import { CompanyProfile } from '../../types';

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
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

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
        <div className="absolute top-full left-0 mt-3 w-80 bg-gray-900 rounded-2xl shadow-2xl border border-gray-700/50 z-50 max-h-96 overflow-hidden">
          {/* Header with Gradient */}
          <div className="px-6 py-4 bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border-b border-gray-700/50">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <span className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></span>
                  Switch Profile
                </h3>
                <p className="text-sm text-gray-400 mt-1">
                  {allProfiles.length} profile{allProfiles.length !== 1 ? 's' : ''} available
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

          {/* Profile List with Enhanced Styling */}
          <div className="py-3 max-h-60 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
            {allProfiles.map((profile, index) => (
              <button
                key={profile.id}
                onClick={() => handleProfileSwitch(profile.id)}
                disabled={isSwitching}
                className={`
                  w-full px-6 py-4 flex items-center space-x-4 transition-all duration-200 text-left group
                  ${profile.id === currentProfile?.id 
                    ? 'bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border-r-4 border-yellow-500 shadow-lg' 
                    : 'hover:bg-gray-800/50 hover:shadow-md'
                  }
                  ${isSwitching ? 'opacity-50 cursor-not-allowed' : 'hover:translate-x-1'}
                `}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="relative">
                  {getProfileDisplay(profile)}
                  {profile.id === currentProfile?.id && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-gray-900 flex items-center justify-center">
                      <div className="w-2 h-2 bg-white rounded-full"></div>
                    </div>
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-3 mb-2">
                    <span className="text-base font-semibold text-white truncate group-hover:text-yellow-300 transition-colors">
                      {profile.profile_name}
                    </span>
                    {profile.is_default && (
                      <div className="flex items-center gap-1 bg-blue-500/20 px-2 py-1 rounded-full border border-blue-500/30">
                        <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                        <span className="text-xs text-blue-300 font-medium">Default</span>
                      </div>
                    )}
                    {profile.id === currentProfile?.id && (
                      <div className="flex items-center gap-1 bg-green-500/20 px-2 py-1 rounded-full border border-green-500/30">
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                        <span className="text-xs text-green-300 font-medium">Active</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <span className={`
                      text-xs px-3 py-1 rounded-full font-semibold border
                      ${profile.profile_role === 'admin' ? 'bg-red-500/20 text-red-300 border-red-500/30' :
                        profile.profile_role === 'manager' ? 'bg-blue-500/20 text-blue-300 border-blue-500/30' :
                        profile.profile_role === 'editor' ? 'bg-green-500/20 text-green-300 border-green-500/30' :
                        'bg-gray-500/20 text-gray-300 border-gray-500/30'
                      }
                    `}>
                      {profile.profile_role.toUpperCase()}
                    </span>
                    
                    <span className="text-xs text-gray-500 font-mono bg-gray-800/50 px-2 py-1 rounded border border-gray-700/50">
                      {profile.company_id?.slice(0, 8)}...
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Create New Profile Button */}
          {showCreateButton && onCreateProfile && (
            <>
              <div className="border-t border-gray-700/50 bg-gradient-to-r from-gray-800 to-gray-700"></div>
              <div className="p-4 bg-gray-800">
                <button
                  onClick={() => {
                    setIsOpen(false);
                    onCreateProfile();
                  }}
                  className="w-full flex items-center justify-center space-x-3 px-4 py-3 bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600 text-white font-bold rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 group"
                >
                  <div className="p-1 bg-white/20 rounded-full group-hover:bg-white/30 transition-colors">
                    <PlusIcon className="w-4 h-4" />
                  </div>
                  <span>Create New Profile</span>
                  <div className="w-2 h-2 bg-white/50 rounded-full group-hover:bg-white/70 transition-colors"></div>
                </button>
              </div>
            </>
          )}
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