// This file can be used to store shared TypeScript types and interfaces

// Define the Product type based on the Supabase schema
export interface Product {
  id: string; // uuid
  user_id: string; // uuid
  name: string;
  description?: string | null;
  openai_vector_store_id?: string | null;
  created_at: string; // timestamptz
  updated_at: string; // timestamptz
}

// Multi-Profile System Types

export interface ProfilePermissions {
  canCreateContent: boolean;
  canEditContent: boolean;
  canDeleteContent: boolean;
  canManageUsers: boolean;
  canViewAnalytics: boolean;
  canExportData: boolean;
}

export interface CompanyProfile {
  id: string;
  company_id: string;
  user_id: string;
  profile_name: string;
  profile_role: 'admin' | 'manager' | 'editor' | 'viewer';
  profile_avatar_url?: string | null;
  profile_permissions: ProfilePermissions;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserProfileSession {
  id: string;
  user_id: string;
  profile_id: string;
  session_token: string;
  expires_at: string;
  is_active: boolean;
  created_at: string;
}

export interface ProfileContextType {
  // Current profile state
  currentProfile: CompanyProfile | null;
  allProfiles: CompanyProfile[];
  isLoading: boolean;
  error: string | null;

  // Profile management
  switchProfile: (profileId: string) => Promise<{ success: boolean; error?: string }>;
  createProfile: (profileData: Partial<CompanyProfile>) => Promise<{ success: boolean; error?: string; profile?: CompanyProfile }>;
  updateProfile: (profileId: string, updates: Partial<CompanyProfile>) => Promise<{ success: boolean; error?: string }>;
  deleteProfile: (profileId: string) => Promise<{ success: boolean; error?: string }>;
  
  // Utility methods
  refreshProfiles: () => Promise<void>;
  hasPermission: (permission: keyof ProfilePermissions) => boolean;
  canCreateProfiles: () => Promise<boolean>;
  getUserCompany: () => string | null;
}

// You can add other shared types here as your project grows
