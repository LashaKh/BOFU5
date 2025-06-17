import { supabase } from '../lib/supabase';

export interface UserType {
  isMainUser: boolean;
  isCreatedUser: boolean;
  canCreateProfiles: boolean;
  userRole: 'main' | 'created' | 'unknown';
}

/**
 * Determines the user type and permissions based on how they were created
 */
export async function getUserType(userId: string): Promise<UserType> {
  try {
    console.log('[getUserType] Checking user type for:', userId);
    
    // Check if user exists in auth.users table and get metadata
    const { data: authUser, error: authError } = await supabase.auth.getUser();
    
    if (authError || !authUser?.user) {
      console.log('[getUserType] Auth error or no user:', authError);
      return {
        isMainUser: false,
        isCreatedUser: false,
        canCreateProfiles: false,
        userRole: 'unknown'
      };
    }

    // Check if user has company_profiles records
    const { data: companyProfiles, error: profileError } = await supabase
      .from('company_profiles')
      .select('*')
      .eq('user_id', userId);

    if (profileError) {
      console.error('[getUserType] Error checking company profiles:', profileError);
      return {
        isMainUser: false,
        isCreatedUser: false,
        canCreateProfiles: false,
        userRole: 'unknown'
      };
    }

    console.log('[getUserType] Company profiles found:', companyProfiles?.length || 0);

    // If user has no company profiles, they're likely a new main user (original company account)
    if (!companyProfiles || companyProfiles.length === 0) {
      console.log('[getUserType] No company profiles - treating as main user (original account)');
      return {
        isMainUser: true,
        isCreatedUser: false,
        canCreateProfiles: true,
        userRole: 'main'
      };
    }

    // If user has company profiles, check if they have admin role or are the company owner
    // Original accounts typically have admin role in their company profile
    const hasAdminProfile = companyProfiles.some(profile => profile.profile_role === 'admin');
    const hasDefaultProfile = companyProfiles.some(profile => profile.is_default === true);
    
    console.log('[getUserType] Profile analysis:', {
      hasAdminProfile,
      hasDefaultProfile,
      profiles: companyProfiles
    });

    // If user has admin role or default profile, they're the original account
    // Otherwise, they're a sub-account created by the original account
    const isOriginalAccount = hasAdminProfile || hasDefaultProfile;
    
    console.log('[getUserType] Final determination:', {
      isOriginalAccount,
      canCreateProfiles: isOriginalAccount,
      reasoning: isOriginalAccount ? 'Has admin role or default profile' : 'Regular sub-account without admin privileges'
    });
    
    return {
      isMainUser: isOriginalAccount,
      isCreatedUser: !isOriginalAccount,
      canCreateProfiles: isOriginalAccount, // Only original account (admin) can create profiles
      userRole: isOriginalAccount ? 'main' : 'created'
    };

  } catch (error) {
    console.error('[getUserType] Error determining user type:', error);
    return {
      isMainUser: false,
      isCreatedUser: false,
      canCreateProfiles: false,
      userRole: 'unknown'
    };
  }
}

/**
 * Checks if current user can create new profiles
 */
export async function canUserCreateProfiles(): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.log('[canUserCreateProfiles] No user found');
      return false;
    }

    console.log('[canUserCreateProfiles] Checking permissions for user:', user.email);
    
    const userType = await getUserType(user.id);
    
    console.log('[canUserCreateProfiles] User type result:', {
      userId: user.id,
      email: user.email,
      userType: userType
    });
    
    return userType.canCreateProfiles;
  } catch (error) {
    console.error('Error checking profile creation permissions:', error);
    return false;
  }
}

/**
 * Enhanced user type detection using multiple criteria
 */
export async function getEnhancedUserType(userId: string): Promise<UserType & { 
  companyId?: string;
  profilesCount: number;
  isCompanyOwner: boolean;
}> {
  try {
    // Get user's profiles
    const { data: profiles, error: profileError } = await supabase
      .from('company_profiles')
      .select('*')
      .eq('user_id', userId);

    if (profileError) {
      console.error('Error fetching user profiles:', profileError);
      return {
        isMainUser: false,
        isCreatedUser: false,
        canCreateProfiles: false,
        userRole: 'unknown',
        profilesCount: 0,
        isCompanyOwner: false
      };
    }

    const profilesCount = profiles?.length || 0;
    
    // If no profiles, likely a new main user
    if (profilesCount === 0) {
      return {
        isMainUser: true,
        isCreatedUser: false,
        canCreateProfiles: true,
        userRole: 'main',
        profilesCount: 0,
        isCompanyOwner: false
      };
    }

    // Check for admin role or default profile (indicates company owner)
    const hasAdminProfile = profiles.some(p => p.profile_role === 'admin');
    const hasDefaultProfile = profiles.some(p => p.is_default === true);
    const companyId = profiles[0]?.company_id;
    
    // Main users typically have admin role or default profile
    const isMainUser = hasAdminProfile || hasDefaultProfile || profilesCount === 1;
    
    return {
      isMainUser,
      isCreatedUser: !isMainUser,
      canCreateProfiles: isMainUser,
      userRole: isMainUser ? 'main' : 'created',
      companyId,
      profilesCount,
      isCompanyOwner: hasAdminProfile && hasDefaultProfile
    };

  } catch (error) {
    console.error('Error getting enhanced user type:', error);
    return {
      isMainUser: false,
      isCreatedUser: false,
      canCreateProfiles: false,
      userRole: 'unknown',
      profilesCount: 0,
      isCompanyOwner: false
    };
  }
} 