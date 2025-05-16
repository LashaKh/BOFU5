import { ReactNode, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../lib/auth';
import { MainHeader } from '../MainHeader';
import UserDashboardSidebar from './UserDashboardSidebar';
import '../../App.css';

interface UserDashboardLayoutProps {
  children: ReactNode;
}

export function UserDashboardLayout({ children }: UserDashboardLayoutProps) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/', { replace: true });
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-white to-gray-50">
        <div className="text-center fade-in">
          <div className="spinner h-12 w-12 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex h-screen bg-gray-50">
      <UserDashboardSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <MainHeader user={user} />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-6 md:p-8">
          <div className="max-w-7xl mx-auto fade-in">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
