import { useState, useEffect } from 'react';
import { checkAdminStatus } from '../lib/auth';

export interface AdminCheckResult {
  isAdmin: boolean;
  loading: boolean;
  error: string | null;
}

/**
 * Custom hook to check if the current user has admin privileges
 * Returns loading state while checking, and the final result
 */
export function useAdminCheck(): AdminCheckResult {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const checkAdmin = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const adminStatus = await checkAdminStatus();
        
        if (isMounted) {
          setIsAdmin(adminStatus);
        }
      } catch (err) {
        if (isMounted) {
          console.error('Error checking admin status:', err);
          setError(err instanceof Error ? err.message : 'Failed to check admin status');
          setIsAdmin(false);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    checkAdmin();

    return () => {
      isMounted = false;
    };
  }, []);

  return { isAdmin, loading, error };
}

/**
 * Helper function to get admin status synchronously if already checked
 * Use this when you need admin status in non-hook contexts
 */
export async function getAdminStatus(): Promise<boolean> {
  try {
    return await checkAdminStatus();
  } catch (error) {
    console.error('Error getting admin status:', error);
    return false;
  }
}