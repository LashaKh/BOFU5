import { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { User } from '@supabase/supabase-js';
import { toast } from 'react-hot-toast';

// User registration
export async function registerUser(email: string, password: string, companyName: string) {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          company_name: companyName,
          is_admin: false, // Explicitly set as not an admin
        }
      }
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error registering user:', error);
    throw error;
  }
}

// Admin registration - only use this for creating admin accounts
export async function registerAdmin(email: string, password: string, name: string) {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: name,
          is_admin: true, // Mark as admin
          role: 'admin'
        }
      }
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error registering admin:', error);
    throw error;
  }
}

// Check if user is an admin
export const checkAdminStatus = async (userId?: string): Promise<boolean> => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      console.log('User not authenticated, not admin');
      return false;
    }

    const targetUserId = userId || user.id;
    
    // First try to check admin_profiles table
    try {
      const { data: adminData, error: adminError } = await supabase
        .from('admin_profiles')
        .select('id')
        .eq('id', targetUserId)
        .single();

      if (adminData && !adminError) {
        console.log('User found in admin_profiles table, is admin');
        return true;
      }
    } catch (adminProfileError) {
      console.log('admin_profiles table check failed, trying metadata fallback:', adminProfileError);
    }

    // Fallback to metadata check if admin_profiles doesn't work
    try {
      const metaData = user.user_metadata || {};
      const isAdminFromMeta = metaData.is_admin === true || metaData.role === 'admin';
      
      if (isAdminFromMeta) {
        console.log('User is admin based on metadata');
        return true;
      }
    } catch (metaError) {
      console.log('Metadata check failed:', metaError);
    }

    console.log('User is not an admin');
    return false;
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
};

// Get current user
export async function getCurrentUser() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

// Sign in
export async function signIn(email: string, password: string) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error signing in:', error);
    throw error;
  }
}

// Sign out
export async function signOut() {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  } catch (error) {
    console.error('Error signing out:', error);
    throw error;
  }
}

// Get all regular users
export async function getAllUsers() {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching users:', error);
    throw error;
  }
}

// Get all admins
export async function getAllAdmins() {
  try {
    const { data, error } = await supabase
      .from('admin_profiles')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching admins:', error);
    throw error;
  }
}

// Send password reset email
export async function sendPasswordResetEmail(email: string) {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    
    if (error) throw error;
    return { success: true, message: 'Password reset instructions sent to your email' };
  } catch (error) {
    console.error('Error sending password reset email:', error);
    throw error;
  }
}

// Verify password reset token
export async function verifyPasswordResetToken() {
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) throw error;
    return { valid: !!data.user, user: data.user };
  } catch (error) {
    console.error('Error verifying reset token:', error);
    return { valid: false, user: null };
  }
}

// Update password with reset token
export async function updatePassword(password: string) {
  try {
    const { error } = await supabase.auth.updateUser({
      password: password,
    });

    if (error) throw error;
    return { success: true, message: 'Password updated successfully' };
  } catch (error) {
    console.error('Error updating password:', error);
    throw error;
  }
}

// Auth hook for managing authentication state
export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  return {
    user,
    loading,
    signIn,
    signOut,
    getCurrentUser,
    sendPasswordResetEmail,
    updatePassword,
    verifyPasswordResetToken,
  };
}

// Legacy function alias for backward compatibility
export const isUserAdmin = checkAdminStatus;