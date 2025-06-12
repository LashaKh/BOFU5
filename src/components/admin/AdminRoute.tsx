import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAdminContext } from '../../contexts/AdminContext';
import { AdminDashboard } from './AdminDashboard';

interface AdminRouteProps {
  user: any;
  onLogout: () => void;
}

export function AdminRoute({ user, onLogout }: AdminRouteProps) {
  const { isAdmin, adminRole, isLoading, error } = useAdminContext();

  // Show loading state while checking admin status
  if (isLoading) {
    return (
      <div className="min-h-screen bg-secondary-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-white">Checking admin authentication...</p>
        </div>
      </div>
    );
  }

  // Show error state if admin check failed
  if (error) {
    return (
      <div className="min-h-screen bg-secondary-900 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6 max-w-md">
            <h2 className="text-red-400 text-lg font-semibold mb-2">Admin Access Error</h2>
            <p className="text-red-300 mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Redirect if not admin
  if (!isAdmin || !adminRole) {
    console.log('[AdminRoute] User is not admin, redirecting to home');
    return <Navigate to="/" replace />;
  }

  console.log('[AdminRoute] Admin authenticated with role:', adminRole);

  // Render admin dashboard with enhanced context
  return (
    <AdminDashboard 
      user={user} 
      onLogout={onLogout}
    />
  );
}

export default AdminRoute; 