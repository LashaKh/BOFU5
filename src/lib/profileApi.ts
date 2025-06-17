import { supabase } from './supabase';
import { CompanyProfile, UserProfileSession, ProfilePermissions } from '../types';

export interface ProfileApiResponse<T = any> {
  data?: T;
  error?: string;
  success: boolean;
}

export class ProfileApi {
  // Get all profiles for current user
  static async getUserProfiles(): Promise<ProfileApiResponse<CompanyProfile[]>> {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        return { success: false, error: 'User not authenticated' };
      }

      const { data, error } = await supabase
        .from('company_profiles')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: true });

      if (error) {
        console.error('[ProfileApi] Error fetching user profiles:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data: data || [] };
    } catch (err) {
      console.error('[ProfileApi] Exception in getUserProfiles:', err);
      return { success: false, error: 'Failed to fetch profiles' };
    }
  }

  // Get all users in the same company as the current user
  static async getCompanyUsers(): Promise<ProfileApiResponse<(CompanyProfile & { email?: string })[]>> {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        return { success: false, error: 'User not authenticated' };
      }

      // First, get the current user's company_id
      const { data: currentProfile, error: profileError } = await supabase
        .from('company_profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .limit(1)
        .single();

      if (profileError || !currentProfile?.company_id) {
        console.error('[ProfileApi] Error getting current user company:', profileError);
        return { success: false, error: 'Could not determine user company' };
      }

      const company_id = currentProfile.company_id;

      // Get all users in the same company with their emails
      const { data, error } = await supabase.rpc('get_company_users_with_emails', {
        target_company_id: company_id
      });

      if (error) {
        console.error('[ProfileApi] Error fetching company users with emails:', error);
        // Fallback to basic query without emails
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('company_profiles')
          .select('*')
          .eq('company_id', company_id)
          .eq('is_active', true)
          .order('created_at', { ascending: true });

        if (fallbackError) {
          console.error('[ProfileApi] Fallback query also failed:', fallbackError);
          return { success: false, error: fallbackError.message };
        }

        console.log(`[ProfileApi] Fallback: Found ${fallbackData?.length || 0} users in company: ${company_id} (without emails)`);
        return { success: true, data: fallbackData || [] };
      }

      console.log(`[ProfileApi] Found ${data?.length || 0} users in company: ${company_id} (with emails)`);
      return { success: true, data: data || [] };
    } catch (err) {
      console.error('[ProfileApi] Exception in getCompanyUsers:', err);
      return { success: false, error: 'Failed to fetch company users' };
    }
  }

  // Get current active profile for the user
  static async getCurrentProfile(): Promise<ProfileApiResponse<CompanyProfile>> {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        return { success: false, error: 'User not authenticated' };
      }

      console.log('[ProfileApi] Getting current profile for user:', user.id);

      // First try to get profile from active session
      const { data: session } = await supabase
        .from('user_profile_sessions')
        .select(`
          profile_id,
          company_profiles (*)
        `)
        .eq('user_id', user.id)
        .eq('is_active', true)
        .gte('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (session?.profile_id && session.company_profiles) {
        // Handle joined data - company_profiles comes as array from join
        const profileData = Array.isArray(session.company_profiles) 
          ? session.company_profiles[0] 
          : session.company_profiles;
        
        if (profileData) {
          console.log('[ProfileApi] Found profile from session:', profileData);
          return { success: true, data: profileData as CompanyProfile };
        }
      }

      // No active session, try to get default profile first
      const { data: defaultProfile } = await supabase
        .from('company_profiles')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_default', true)
        .eq('is_active', true)
        .single();

      if (defaultProfile) {
        console.log('[ProfileApi] Found default profile:', defaultProfile);
        return { success: true, data: defaultProfile };
      }

      // No default profile (sub-account case), get any active profile
      const { data: activeProfile, error } = await supabase
        .from('company_profiles')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        console.error('[ProfileApi] Error fetching current profile:', error);
        return { success: false, error: error.message };
      }

      if (!activeProfile) {
        console.log('[ProfileApi] No active profile found for user');
        return { success: false, error: 'No active profile found' };
      }

      console.log('[ProfileApi] Found active profile:', activeProfile);
      return { success: true, data: activeProfile };
    } catch (err) {
      console.error('[ProfileApi] Exception in getCurrentProfile:', err);
      return { success: false, error: 'Failed to fetch current profile' };
    }
  }

  // Switch to a different profile
  static async switchProfile(profileId: string): Promise<ProfileApiResponse<CompanyProfile>> {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        return { success: false, error: 'User not authenticated' };
      }

      // Verify the profile belongs to the user
      const { data: profile, error: profileError } = await supabase
        .from('company_profiles')
        .select('*')
        .eq('id', profileId)
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (profileError || !profile) {
        return { success: false, error: 'Profile not found or access denied' };
      }

      // Deactivate current session
      await supabase
        .from('user_profile_sessions')
        .update({ is_active: false })
        .eq('user_id', user.id)
        .eq('is_active', true);

      // Create new session
      const sessionToken = crypto.randomUUID();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

      const { error: sessionError } = await supabase
        .from('user_profile_sessions')
        .insert({
          user_id: user.id,
          profile_id: profileId,
          session_token: sessionToken,
          expires_at: expiresAt.toISOString(),
          is_active: true
        });

      if (sessionError) {
        console.error('[ProfileApi] Error creating profile session:', sessionError);
        return { success: false, error: 'Failed to switch profile' };
      }

      return { success: true, data: profile };
    } catch (err) {
      console.error('[ProfileApi] Exception in switchProfile:', err);
      return { success: false, error: 'Failed to switch profile' };
    }
  }

  // Create new profile
  static async createProfile(profileData: Partial<CompanyProfile>): Promise<ProfileApiResponse<CompanyProfile>> {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        return { success: false, error: 'User not authenticated' };
      }

      // Get user's company from their current profile or user_profiles
      const { data: userProfile } = await supabase
        .from('user_profiles')
        .select('company_name')
        .eq('id', user.id)
        .single();

      if (!userProfile?.company_name) {
        return { success: false, error: 'User company not found' };
      }

      // Default permissions based on role
      const defaultPermissions: Record<string, ProfilePermissions> = {
        admin: {
          canCreateContent: true,
          canEditContent: true,
          canDeleteContent: true,
          canManageUsers: true,
          canViewAnalytics: true,
          canExportData: true
        },
        manager: {
          canCreateContent: true,
          canEditContent: true,
          canDeleteContent: true,
          canManageUsers: true,
          canViewAnalytics: true,
          canExportData: true
        },
        editor: {
          canCreateContent: true,
          canEditContent: true,
          canDeleteContent: true,
          canManageUsers: false,
          canViewAnalytics: true,
          canExportData: true
        },
        viewer: {
          canCreateContent: true,
          canEditContent: true,
          canDeleteContent: true,
          canManageUsers: false,
          canViewAnalytics: true,
          canExportData: true
        }
      };

      const newProfile = {
        company_id: userProfile.company_name,
        user_id: user.id,
        profile_name: profileData.profile_name || 'New Profile',
        profile_role: profileData.profile_role || 'viewer',
        profile_avatar_url: profileData.profile_avatar_url || null,
        profile_permissions: profileData.profile_permissions || defaultPermissions[profileData.profile_role || 'viewer'],
        is_default: false, // Only one default per user
        is_active: true
      };

      const { data, error } = await supabase
        .from('company_profiles')
        .insert(newProfile)
        .select()
        .single();

      if (error) {
        console.error('[ProfileApi] Error creating profile:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (err) {
      console.error('[ProfileApi] Exception in createProfile:', err);
      return { success: false, error: 'Failed to create profile' };
    }
  }

  // Create new company user with login credentials
  static async createCompanyUser(userData: {
    email: string;
    password: string;
    profile_name: string;
    profile_role: 'admin' | 'manager' | 'editor' | 'viewer';
    profile_avatar_url?: string;
  }): Promise<ProfileApiResponse<CompanyProfile>> {
    try {
      const { data: { session }, error: authError } = await supabase.auth.getSession();
      
      if (authError || !session) {
        return { success: false, error: 'User not authenticated' };
      }

      console.log('[ProfileApi] Calling create-company-user function with:', {
        email: userData.email,
        profile_name: userData.profile_name,
        profile_role: userData.profile_role,
        has_password: !!userData.password,
        has_avatar: !!userData.profile_avatar_url
      });
      
      // Debug the session and token
      console.log('[ProfileApi] Session details:', {
        user_id: session.user?.id,
        token_type: typeof session.access_token,
        token_length: session.access_token?.length,
        token_preview: session.access_token?.substring(0, 30) + '...',
        expires_at: session.expires_at,
        token_expires_in: session.expires_in
      });

      // Test the JWT token with a simple test function first
      console.log('[ProfileApi] Testing JWT with test function...');
      try {
        const { data: testData, error: testError } = await supabase.functions.invoke('test-function', {
          body: { test: true },
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          }
        });
        
        console.log('[ProfileApi] Test function response:', { 
          success: !testError, 
          data: testData,
          error: testError 
        });
        
        if (testError) {
          console.log('[ProfileApi] Test function failed, JWT issue confirmed');
          return { 
            success: false, 
            error: `JWT validation failed: ${testError.message}` 
          };
        }
      } catch (testErr) {
        console.log('[ProfileApi] Test function exception:', testErr);
      }

      // Debug the userData before sending
      console.log('[ProfileApi] userData before Edge Function call:', userData);
      console.log('[ProfileApi] userData type:', typeof userData);
      console.log('[ProfileApi] userData keys:', Object.keys(userData));
      console.log('[ProfileApi] userData stringified length:', JSON.stringify(userData).length);

      // Call the Edge Function to create the user
      const { data, error } = await supabase.functions.invoke('create-company-user-v2', {
        body: userData
      });

      console.log('[ProfileApi] Edge Function response:', { 
        success: !error, 
        hasData: !!data,
        errorDetails: error,
        actualData: data
      });

      if (error) {
        console.error('[ProfileApi] Error calling create-company-user function:', error);
        
        // Provide more specific error messaging based on error type
        if (error.message?.includes('400')) {
          return { 
            success: false, 
            error: 'Invalid request data. Please check your inputs and try again.' 
          };
        } else if (error.message?.includes('401')) {
          return { 
            success: false, 
            error: 'Authentication failed. Please refresh the page and try again.' 
          };
        } else if (error.message?.includes('403')) {
          return { 
            success: false, 
            error: 'Insufficient permissions to create users.' 
          };
        } else if (error.message?.includes('409')) {
          return { 
            success: false, 
            error: 'A user with this email already exists.' 
          };
        } else {
          return { 
            success: false, 
            error: `Edge Function error: ${error.message || 'Unknown error'}` 
          };
        }
      }

      if (!data) {
        return { success: false, error: 'No response data from Edge Function' };
      }

      if (!data.success) {
        console.error('[ProfileApi] Edge Function returned error:', data.error);
        return { success: false, error: data.error || 'Failed to create user' };
      }

      console.log('[ProfileApi] Company user created successfully:', data.data?.companyProfile?.id);
      return { 
        success: true, 
        data: data.data.companyProfile
      };
    } catch (err) {
      console.error('[ProfileApi] Exception in createCompanyUser:', err);
      
      // Handle network errors or other exceptions
      if (err instanceof Error) {
        if (err.message.includes('Failed to fetch') || err.message.includes('network')) {
          return { 
            success: false, 
            error: 'Network error. Please check your internet connection and try again.' 
          };
        } else {
          return { 
            success: false, 
            error: `Request failed: ${err.message}` 
          };
        }
      }
      
      return { success: false, error: 'Failed to create company user' };
    }
  }

  // Update profile
  static async updateProfile(profileId: string, updates: Partial<CompanyProfile>): Promise<ProfileApiResponse<CompanyProfile>> {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        return { success: false, error: 'User not authenticated' };
      }

      const { data, error } = await supabase
        .from('company_profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', profileId)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) {
        console.error('[ProfileApi] Error updating profile:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (err) {
      console.error('[ProfileApi] Exception in updateProfile:', err);
      return { success: false, error: 'Failed to update profile' };
    }
  }

  // Delete profile (soft delete by setting is_active to false)
  static async deleteProfile(profileId: string): Promise<ProfileApiResponse<void>> {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        return { success: false, error: 'User not authenticated' };
      }

      // Check if it's the default profile
      const { data: profile } = await supabase
        .from('company_profiles')
        .select('is_default')
        .eq('id', profileId)
        .eq('user_id', user.id)
        .single();

      if (profile?.is_default) {
        return { success: false, error: 'Cannot delete default profile' };
      }

      // Deactivate profile
      const { error } = await supabase
        .from('company_profiles')
        .update({ 
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', profileId)
        .eq('user_id', user.id);

      if (error) {
        console.error('[ProfileApi] Error deleting profile:', error);
        return { success: false, error: error.message };
      }

      // Deactivate any sessions for this profile
      await supabase
        .from('user_profile_sessions')
        .update({ is_active: false })
        .eq('profile_id', profileId);

      return { success: true };
    } catch (err) {
      console.error('[ProfileApi] Exception in deleteProfile:', err);
      return { success: false, error: 'Failed to delete profile' };
    }
  }

  // Check if user has specific permission
  static hasPermission(profile: CompanyProfile | null, permission: keyof ProfilePermissions): boolean {
    if (!profile || !profile.profile_permissions) {
      return false;
    }
    
    return profile.profile_permissions[permission] === true;
  }

  // Get user's company
  static getUserCompany(profile: CompanyProfile | null): string | null {
    return profile?.company_id || null;
  }

  // Clean expired sessions
  static async cleanExpiredSessions(): Promise<void> {
    try {
      await supabase
        .from('user_profile_sessions')
        .update({ is_active: false })
        .lt('expires_at', new Date().toISOString());
    } catch (err) {
      console.error('[ProfileApi] Error cleaning expired sessions:', err);
    }
  }
} 