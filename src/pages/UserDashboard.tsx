import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserDashboardLayout } from '../components/user-dashboard/UserDashboardLayout';
import { DataboxEmbed } from '../components/common/DataboxEmbed';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { PencilIcon, TrashIcon, EyeIcon } from '@heroicons/react/24/outline';
import { format } from 'date-fns';

interface ContentBrief {
  id: string;
  product_name: string;
  status: 'draft' | 'pending' | 'approved';
  created_at: string;
  updated_at: string;
  brief_content?: any;
}

interface DashboardStats {
  totalBriefs: number;
  approved: number;
  pending: number;
  drafts: number;
}

export default function UserDashboard() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [contentBriefs, setContentBriefs] = useState<ContentBrief[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalBriefs: 0,
    approved: 0,
    pending: 0,
    drafts: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && user) {
      fetchDashboardData();
    } else if (!authLoading && !user) {
      // No user and auth loading is complete - redirect to home
      navigate('/', { replace: true });
    }
  }, [user, authLoading, navigate]);

  // Real-time subscription for content_briefs table
  useEffect(() => {
    if (!user?.id) return;

    console.log('🔄 Setting up real-time subscription for user content briefs...');
    
    const subscription = supabase
      .channel(`user_content_briefs_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'content_briefs',
          filter: `user_id=eq.${user.id}` // Only listen to current user's content briefs
        },
        (payload) => {
          console.log('🔄 Real-time content brief change detected for user:', payload);
          // Refresh dashboard data when content briefs change
          fetchDashboardData();
        }
      )
      .subscribe();

    // Cleanup subscription on unmount or user change
    return () => {
      console.log('🔄 Cleaning up real-time subscription for user content briefs');
      subscription.unsubscribe();
    };
  }, [user?.id]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (!user?.id) {
        console.error('No user ID available');
        setError('User not authenticated');
        return;
      }
      
      console.log('[DASHBOARD] Fetching data for user:', user.id);
      
      // Add timeout protection for dashboard queries
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Dashboard query timeout')), 10000);
      });
      
      // Fetch content briefs with timeout protection
      const queryPromise = supabase
        .from('content_briefs')
        .select('*')
        .order('created_at', { ascending: false });

      const { data: briefs, error: briefsError } = await Promise.race([
        queryPromise,
        timeoutPromise
      ]) as any;

      if (briefsError) {
        console.error('[DASHBOARD] Error fetching content briefs:', briefsError);
        throw briefsError;
      }

      console.log('[DASHBOARD] Fetched briefs:', briefs?.length || 0);
      setContentBriefs(briefs || []);

      // Calculate stats
      const totalBriefs = briefs?.length || 0;
      const approved = briefs?.filter((brief: ContentBrief) => brief.status === 'approved').length || 0;
      const pending = briefs?.filter((brief: ContentBrief) => brief.status === 'pending').length || 0;
      const drafts = briefs?.filter((brief: ContentBrief) => brief.status === 'draft').length || 0;

      setStats({ totalBriefs, approved, pending, drafts });
    } catch (error) {
      console.error('[DASHBOARD] Error fetching dashboard data:', error);
      setError(error instanceof Error ? error.message : 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleEditBrief = (briefId: string) => {
    navigate(`/dashboard/content-briefs/edit/${briefId}`);
  };

  const handleDeleteBrief = async (briefId: string) => {
    if (!confirm('Are you sure you want to delete this content brief?')) return;
    
    if (!user?.id) {
      console.error('No user ID available');
      return;
    }

    try {
      const { error } = await supabase
        .from('content_briefs')
        .delete()
        .eq('id', briefId);

      if (error) throw error;

      // Refresh data
      fetchDashboardData();
    } catch (error) {
      console.error('Error deleting content brief:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusStyles = {
      approved: 'bg-green-100 text-green-800 border-green-200',
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      draft: 'bg-gray-100 text-gray-800 border-gray-200'
    };

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full border ${statusStyles[status as keyof typeof statusStyles]}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  if (authLoading) {
    return (
      <UserDashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Checking authentication...</p>
          </div>
        </div>
      </UserDashboardLayout>
    );
  }

  if (loading) {
    return (
      <UserDashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading dashboard...</p>
          </div>
        </div>
      </UserDashboardLayout>
    );
  }

  if (error) {
    return (
      <UserDashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 font-medium">Error loading dashboard</p>
              <p className="text-red-600 text-sm mt-1">{error}</p>
            </div>
            <button
              onClick={fetchDashboardData}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </UserDashboardLayout>
    );
  }

  return (
    <UserDashboardLayout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Manage your content briefs and track progress</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">Total Briefs</p>
                <p className="text-3xl font-bold text-gray-900">{stats.totalBriefs}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">Approved</p>
                <p className="text-3xl font-bold text-green-600">{stats.approved}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="text-3xl font-bold text-yellow-600">{stats.pending}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">Drafts</p>
                <p className="text-3xl font-bold text-gray-600">{stats.drafts}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Analytics Dashboard */}
        <div className="mb-8">
          <DataboxEmbed 
            dashboardName="Analytics Dashboard"
            className="w-full"
            fallbackMessage="Analytics dashboard will be configured by your administrator"
          />
        </div>

        {/* Content Briefs List */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Recent Content Briefs</h2>
          </div>

          {contentBriefs.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-gray-500">No content briefs found. Create your first brief to get started.</p>
              <button
                onClick={() => navigate('/dashboard/content-briefs')}
                className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
              >
                Create Content Brief
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {contentBriefs.map((brief) => (
                <div key={brief.id} className="p-6 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-3">
                        <h3 className="text-lg font-medium text-gray-900 truncate">
                          {brief.product_name}
                        </h3>
                        {getStatusBadge(brief.status)}
                      </div>
                      <div className="mt-2 flex items-center text-sm text-gray-500 space-x-4">
                        <span>Created {format(new Date(brief.created_at), 'MMM d, yyyy')}</span>
                        <span>Updated {format(new Date(brief.updated_at), 'MMM d, yyyy')}</span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 ml-4">
                      <button
                        onClick={() => handleEditBrief(brief.id)}
                        className="inline-flex items-center p-2 border border-gray-300 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-50"
                        title="Edit"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      
                      <button
                        onClick={() => navigate(`/dashboard/content-briefs`)}
                        className="inline-flex items-center p-2 border border-gray-300 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-50"
                        title="View"
                      >
                        <EyeIcon className="h-4 w-4" />
                      </button>

                      <button
                        onClick={() => handleDeleteBrief(brief.id)}
                        className="inline-flex items-center p-2 border border-gray-300 rounded-md text-red-400 hover:text-red-500 hover:bg-red-50"
                        title="Delete"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </UserDashboardLayout>
  );
}
