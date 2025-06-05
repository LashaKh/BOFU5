import React, { useState, useEffect, lazy, Suspense } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { ProductAnalysis } from '../../types/product/types';
import { ResearchResult, getApprovedProducts, updateApprovedProductStatus, getResearchResultById, deleteApprovedProduct } from '../../lib/research';
import { User } from '@supabase/supabase-js';
import { toast } from 'react-hot-toast';
import { Eye, CheckCircle, XCircle, Loader2, RefreshCw, UserCircle, ArrowLeft, Users, FileText, Settings, Shield, MessageSquare, BarChart3, TrendingUp, Clock, Star, AlertCircle, Plus, Search, Filter, Download, Calendar, Bell, LogOut, Home, Zap, Globe, Activity, BookOpen, PieChart, Award, Crown } from 'lucide-react';
import { ProductCard } from '../product/ProductCard';
import { AuditLogViewer } from './AuditLogViewer';
import { EnhancedCommentDashboard } from './EnhancedCommentDashboard';

type AdminView = 'dashboard' | 'productReview' | 'userManagement' | 'articleManagement' | 'commentManagement' | 'auditLogs' | 'settings';

interface AdminDashboardProps {
  onLogout: () => void;
  user: User | null;
}

// Interface for approved products
interface ApprovedProduct {
  id: string;
  research_result_id: string;
  product_index: number;
  product_name: string;
  product_description: string;
  company_name: string;
  approved_by: string;
  approved_at: string;
  reviewed_status: 'pending' | 'reviewed' | 'rejected';
  reviewer_id: string | null;
  reviewer_comments: string | null;
  reviewed_at: string | null;
  product_data: ProductAnalysis;
  created_at: string;
  updated_at: string;
}

// Interface for user profile
interface UserProfile {
  id: string;
  email: string;
  company_name: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

// Dynamically import AdminArticleManagementPage
const AdminArticleManagementPage = lazy(() => import('../../pages/AdminArticleManagementPage'));

// Beautiful Stats Card Component
const StatsCard = ({ title, value, change, icon: Icon, trend, color = "gray" }: {
  title: string;
  value: string | number;
  change?: string;
  icon: any;
  trend?: 'up' | 'down' | 'neutral';
  color?: 'gray' | 'dark' | 'minimal';
}) => {
  const colorClasses = {
    gray: 'from-gray-600 to-gray-700',
    dark: 'from-gray-700 to-gray-800', 
    minimal: 'from-gray-500 to-gray-600'
  };

  const trendColors = {
    up: 'text-green-400',
    down: 'text-red-400',
    neutral: 'text-gray-400'
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      className="relative group"
    >
      <div className="relative bg-gray-800/60 backdrop-blur-sm p-6 rounded-lg shadow-lg border border-gray-700/30 hover:shadow-xl hover:border-gray-600/50 transition-all duration-300">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-400 mb-1">{title}</p>
            <p className="text-2xl font-bold text-white mb-2">{value}</p>
            {change && (
              <div className="flex items-center gap-1">
                {trend === 'up' && <TrendingUp size={14} className={trendColors.up} />}
                {trend === 'down' && <ArrowLeft size={14} className={`${trendColors.down} rotate-45`} />}
                <span className={`text-xs font-medium ${trend ? trendColors[trend] : 'text-gray-400'}`}>
                  {change}
                </span>
              </div>
            )}
          </div>
          <div className={`p-2 rounded-lg bg-gradient-to-r ${colorClasses[color]} shadow-sm border border-gray-600/20`}>
            <Icon className="h-5 w-5 text-gray-300" />
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// Modern Activity Feed Component
const ActivityFeed = ({ activities }: { activities: any[] }) => (
  <motion.div 
    initial={{ opacity: 0, x: 20 }}
    animate={{ opacity: 1, x: 0 }}
    className="bg-gray-800/60 backdrop-blur-sm rounded-lg shadow-lg border border-gray-700/30 p-6"
  >
    <div className="flex items-center justify-between mb-6">
      <h3 className="text-lg font-semibold text-white flex items-center gap-2">
        <Activity className="h-5 w-5 text-gray-400" />
        Recent Activity
      </h3>
      <button className="text-sm text-gray-400 hover:text-gray-300 font-medium transition-colors">
        View All
      </button>
    </div>
    <div className="space-y-3">
      {activities.length > 0 ? activities.slice(0, 5).map((activity, index) => (
        <div key={index} className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-700/40 transition-colors border border-gray-700/20 hover:border-gray-600/30">
          <div className="flex-shrink-0 w-2 h-2 bg-gray-500 rounded-full mt-2" />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-white font-medium">{activity.title}</p>
            <p className="text-xs text-gray-400 mt-1">{activity.time}</p>
          </div>
        </div>
      )) : (
        <div className="text-center py-8">
          <Clock className="h-10 w-10 text-gray-500 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">No recent activity</p>
        </div>
      )}
    </div>
  </motion.div>
);

// Modern Quick Actions Component
const QuickActions = () => (
  <motion.div 
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    className="bg-gray-800/60 backdrop-blur-sm rounded-lg shadow-lg border border-gray-700/30 p-6"
  >
    <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
      <Zap className="h-5 w-5 text-gray-400" />
      Quick Actions
    </h3>
    <div className="grid grid-cols-2 gap-3">
      {[
        { label: 'New Article', icon: Plus },
        { label: 'Review Queue', icon: Eye },
        { label: 'User Reports', icon: BarChart3 },
        { label: 'System Health', icon: Activity }
      ].map((action, index) => (
        <motion.button
          key={action.label}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="relative p-4 rounded-lg bg-gray-700/60 hover:bg-gray-600/60 text-gray-300 hover:text-white shadow-sm hover:shadow-md transition-all duration-200 border border-gray-600/30 hover:border-gray-500/50"
        >
          <div className="flex flex-col items-center gap-2">
            <action.icon className="h-5 w-5" />
            <span className="text-sm font-medium">{action.label}</span>
          </div>
        </motion.button>
      ))}
    </div>
  </motion.div>
);

// Simplified component - no complex grouping by approver
export function AdminDashboard({ onLogout, user }: AdminDashboardProps) {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingApproved, setIsLoadingApproved] = useState(true);
  const [isSetupMode, setIsSetupMode] = useState(false);
  const [setupError, setSetupError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalResearches: 0,
    totalApproved: 0,
    pendingReview: 0,
  });
  const [approvedProducts, setApprovedProducts] = useState<ApprovedProduct[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<ApprovedProduct | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [refreshCounter, setRefreshCounter] = useState(0);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<string | null>(null);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [userProducts, setUserProducts] = useState<ApprovedProduct[]>([]);
  const [isEditMode, setIsEditMode] = useState(false);
  const [actionLoadingIndex, setActionLoadingIndex] = useState<number | null>(null);
  const [currentView, setCurrentView] = useState<AdminView>('dashboard');

  const refreshData = () => {
    console.log('[AdminDashboard] Manually refreshing data...');
    setRefreshCounter(prev => prev + 1);
  };

  const debugDatabase = async () => {
    console.log('[AdminDashboard] Debugging database tables...');
    try {
      // Directly test if we can query the user_profiles table instead of checking pg_tables
      console.log('[AdminDashboard] Testing database connection...');
      
      // Let's directly query the user_profiles table to see if it exists
      const { data: userProfilesData, error: userProfilesError } = await supabase
        .from('user_profiles')
        .select('*')
        .limit(1);
        
      if (userProfilesError) {
        console.error('[AdminDashboard] Error accessing user_profiles table:', userProfilesError);
        toast.error(`Database error: ${userProfilesError.message}`);
        
        // If we get a "relation does not exist" error, suggest running migrations
        if (userProfilesError.code === '42P01') {
          toast.error('The user_profiles table does not exist. Please run the database migrations.');
          console.log('[AdminDashboard] Migration needed. Follow these steps:');
          console.log('1. Go to the Supabase dashboard SQL Editor');
          console.log('2. Run the migration in supabase/migrations/20250615000000_separate_users_admins.sql');
          console.log('3. Run the migration in supabase_schema_update.sql');
        }
        return;
      }
      
      console.log('[AdminDashboard] Successfully accessed user_profiles table:', userProfilesData);
      
      // Check if we can access other required tables
      const tables = ['admin_profiles', 'research_results', 'approved_products'];
      let allTablesExist = true;
      
      for (const table of tables) {
        const { error } = await supabase.from(table).select('*').limit(1);
        if (error) {
          console.error(`[AdminDashboard] Error accessing ${table}:`, error);
          toast.error(`Table ${table} does not exist or is inaccessible`);
          allTablesExist = false;
        } else {
          console.log(`[AdminDashboard] Successfully accessed ${table}`);
        }
      }
      
      if (allTablesExist) {
        toast.success('All required database tables exist and are accessible!');
        // Refresh the data
        refreshData();
      }
    } catch (error) {
      console.error('[AdminDashboard] Debug error:', error);
      toast.error(`Debug error occurred: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const checkRLSPolicies = async () => {
    console.log('[AdminDashboard] Checking RLS policies...');
    try {
      toast.loading('Checking Supabase RLS policies...');
      
      // Test querying user_profiles with some debugging info
      const { data: userData, error: userError } = await supabase
        .from('user_profiles')
        .select('*')
        .limit(10);
        
      if (userError) {
        console.error('[AdminDashboard] Error accessing user_profiles:', userError);
        toast.error(`Policy error: ${userError.message}`);
      } else {
        console.log('[AdminDashboard] User profiles access successful:', userData);
        toast.success(`Successfully accessed user_profiles table. Found ${userData.length} records.`);
      }
      
      // Check if current user is admin
      const { data: { user } } = await supabase.auth.getUser();
      console.log('[AdminDashboard] Current user:', user);
      
      if (user) {
        const { data: adminData, error: adminError } = await supabase
          .from('admin_profiles')
          .select('*')
          .eq('id', user.id)
          .single();
          
        if (adminError && adminError.code !== 'PGRST116') {
          console.error('[AdminDashboard] Error checking admin status:', adminError);
        } else {
          console.log('[AdminDashboard] Admin check:', adminData ? 'User is admin' : 'User is not admin');
        }
      }
    } catch (error) {
      console.error('[AdminDashboard] RLS check error:', error);
      toast.error(`RLS check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  useEffect(() => {
    // Function to check and setup database if needed
    const checkAndSetupDatabase = async () => {
      try {
        setIsLoading(true);
        setSetupError(null);
        
        console.log('[AdminDashboard] Checking database setup...');
        
        // Check if basic tables exist and have data
        const { data: userProfilesData, error: userProfilesError } = await supabase
          .from('user_profiles')
          .select('id')
          .limit(1);
        
        const { data: adminProfilesData, error: adminProfilesError } = await supabase
          .from('admin_profiles')
          .select('id')
          .limit(1);
        
        // If user_profiles is empty, we need to populate it
        if (!userProfilesError && (!userProfilesData || userProfilesData.length === 0)) {
          console.log('[AdminDashboard] user_profiles is empty, attempting auto-population...');
          setIsSetupMode(true);
          
          // Get content_briefs data
          const { data: contentBriefs, error: briefsError } = await supabase
            .from('content_briefs')
            .select('user_id')
            .neq('user_id', null);
          
          if (briefsError) {
            console.error('[AdminDashboard] Error fetching content_briefs:', briefsError);
            setSetupError('Failed to access content_briefs table. Please check database setup.');
            return;
          }
          
          if (contentBriefs && contentBriefs.length > 0) {
            // Populate user_profiles
            const uniqueUserIds = [...new Set(contentBriefs.map(brief => brief.user_id))];
            console.log('[AdminDashboard] Auto-populating user_profiles for:', uniqueUserIds);
            
            const userProfilesToInsert = uniqueUserIds.map(userId => ({
              id: userId,
              email: userId === '7ebfc552-10e1-4f01-9178-86983ae48d43' ? 'devoteai@gmail.com' : `user-${userId.slice(0, 8)}@example.com`,
              company_name: userId === '7ebfc552-10e1-4f01-9178-86983ae48d43' ? 'Devoted AI' : 'Company Name',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }));
            
            const { error: insertError } = await supabase
              .from('user_profiles')
              .insert(userProfilesToInsert);
            
            if (insertError) {
              console.error('[AdminDashboard] Error inserting user profiles:', insertError);
              setSetupError('Failed to create user profiles. Please check permissions.');
              return;
            }
            
            console.log('[AdminDashboard] Successfully populated user_profiles');
          }
        }
        
        // If admin_profiles is empty, create an admin
        if (!adminProfilesError && (!adminProfilesData || adminProfilesData.length === 0)) {
          console.log('[AdminDashboard] admin_profiles is empty, creating admin...');
          
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const { error: adminInsertError } = await supabase
              .from('admin_profiles')
              .insert({
                id: user.id,
                email: user.email || 'admin@example.com',
                name: user.email?.split('@')[0] || 'admin',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              });
            
            if (adminInsertError) {
              console.error('[AdminDashboard] Error creating admin:', adminInsertError);
              setSetupError('Failed to create admin profile. Please check permissions.');
              return;
            }
            
            console.log('[AdminDashboard] Successfully created admin profile');
          }
        }
        
        setIsSetupMode(false);
        
        // Now proceed with normal data fetching
        await Promise.all([fetchStats(), fetchApprovedProducts(), fetchUsers()]);
        
      } catch (error) {
        console.error('[AdminDashboard] Setup error:', error);
        setSetupError(`Database setup failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      } finally {
        setIsLoading(false);
      }
    };

    // Fetch basic stats 
    const fetchStats = async () => {
      try {
        console.log('[AdminDashboard] Starting to fetch stats...');
        
        const { count: userCount } = await supabase
          .from('user_profiles')  // Changed from 'profiles' to 'user_profiles'
          .select('*', { count: 'exact', head: true });

        console.log('[AdminDashboard] User count:', userCount);

        const { count: researchCount } = await supabase
          .from('research_results')
          .select('*', { count: 'exact', head: true });
          
        console.log('[AdminDashboard] Research count:', researchCount);
        
        const { count: approvedCount } = await supabase
          .from('approved_products')
          .select('*', { count: 'exact', head: true });
          
        console.log('[AdminDashboard] Approved count:', approvedCount);
        
        const { count: pendingCount } = await supabase
          .from('approved_products')
          .select('*', { count: 'exact', head: true })
          .eq('reviewed_status', 'pending');

        console.log('[AdminDashboard] Pending count:', pendingCount);

        setStats({
          totalUsers: userCount || 0,
          totalResearches: researchCount || 0,
          totalApproved: approvedCount || 0,
          pendingReview: pendingCount || 0,
        });
        
        console.log('[AdminDashboard] Stats updated successfully');
      } catch (error) {
        console.error('Error fetching admin stats:', error);
        // Show friendly error message instead of crashing
        setStats({
          totalUsers: 0,
          totalResearches: 0,
          totalApproved: 0,
          pendingReview: 0,
        });
      }
    };

    // Fetch approved products from the dedicated table
    const fetchApprovedProducts = async () => {
      try {
        console.log('[AdminDashboard] Fetching approved products...');
        
        // Use the dedicated function to get approved products
        const approvedData = await getApprovedProducts();
        
        console.log(`[AdminDashboard] Fetched ${approvedData.length} approved products`);
        
        if (approvedData.length === 0) {
          console.log('[AdminDashboard] No approved products found');
          setApprovedProducts([]);
          return;
        }
        
        // Set the approved products directly
        setApprovedProducts(approvedData);
        
      } catch (error) {
        console.error('[AdminDashboard] Error fetching approved products:', error);
        console.log('[AdminDashboard] Continuing without approved products data');
      }
    };

    // Fetch all non-admin users
    const fetchUsers = async () => {
      try {
        console.log('[AdminDashboard] Fetching users from user_profiles table...');
        
        // Basic query without count first to check access
        const { data, error } = await supabase
          .from('user_profiles')
          .select('*');

        if (error) {
          console.error('[AdminDashboard] Error accessing user_profiles:', error);
          console.log('[AdminDashboard] Continuing without user data');
          return;
        }
        
        console.log('[AdminDashboard] Successfully fetched user_profiles:', data);
        console.log('[AdminDashboard] Users count:', data?.length || 0);
        
        // Set users only if we got data
        if (data && Array.isArray(data)) {
          setUsers(data);
        } else {
          console.error('[AdminDashboard] Unexpected data format:', data);
          setUsers([]);
        }
      } catch (error) {
        console.error('[AdminDashboard] Error fetching users:', error);
        console.log('[AdminDashboard] Continuing without user data');
      }
    };

    // Start with database setup check
    checkAndSetupDatabase();
    
    // Set up a refresh interval (every 30 seconds)
    const refreshInterval = setInterval(() => {
      console.log('[AdminDashboard] Auto-refreshing data...');
      fetchApprovedProducts();
      fetchUsers();
    }, 30000);
    
    return () => {
      clearInterval(refreshInterval);
    };
  }, [refreshCounter]); // Dependency on refreshCounter to allow manual refresh

  const handleLogout = async () => {
    console.log('[AdminDashboard] handleLogout called, delegating to App.tsx handleSignOut');
    // Just call the onLogout prop which handles everything in App.tsx
    onLogout();
  };

  // Open the product detail modal
  const handleViewDetails = (product: ApprovedProduct) => {
    setSelectedProduct(product);
    setIsDetailModalOpen(true);
  };

  // Close the detail modal
  const closeDetailModal = () => {
    // Refresh the data to ensure we have the latest version
    refreshData();
    setIsDetailModalOpen(false);
    setSelectedProduct(null);
  };
  
  // Handle marking a product as reviewed
  const handleMarkReviewed = async (productId: string) => {
    setIsUpdatingStatus(productId);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not logged in');
      
      await updateApprovedProductStatus(
        productId,
        'reviewed',
        user.id,
        'Approved by admin'
      );
      
      toast.success('Product marked as reviewed');
      
      // Refresh the data
      refreshData();
      
    } catch (error: any) {
      console.error('Error updating status:', error);
      toast.error(`Failed to update status: ${error.message}`);
    } finally {
      setIsUpdatingStatus(null);
    }
  };
  
  // Handle rejecting a product
  const handleRejectProduct = async (productId: string) => {
    setIsUpdatingStatus(productId);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not logged in');
      
      await updateApprovedProductStatus(
        productId,
        'rejected',
        user.id,
        'Rejected by admin'
      );
      
      toast.success('Product rejected');
      
      // Refresh the data
      refreshData();
      
    } catch (error: any) {
      console.error('Error updating status:', error);
      toast.error(`Failed to update status: ${error.message}`);
    } finally {
      setIsUpdatingStatus(null);
    }
  };

  // Handle selecting a user
  const handleSelectUser = async (user: UserProfile) => {
    setSelectedUser(user);
    setIsLoadingApproved(true);
    
    try {
      // Fetch approved products for the selected user
      const { data, error } = await supabase
        .from('approved_products')
        .select('*')
        .eq('approved_by', user.id)
        .order('approved_at', { ascending: false });

      if (error) throw error;
      setUserProducts(data || []);
    } catch (error) {
      console.error('Error fetching user products:', error);
      toast.error('Failed to load user products');
    } finally {
      setIsLoadingApproved(false);
    }
  };

  // Return to user list
  const handleBackToUsers = () => {
    setSelectedUser(null);
    setUserProducts([]);
    setIsEditMode(false);
  };

  // Product card handlers for editing
  const handleSaveProduct = async (product: ProductAnalysis, index: number) => {
    setActionLoadingIndex(index);
    try {
      const currentProduct = userProducts[index];
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not logged in');
      
      // Update the product data in the approved_products table
      const { error } = await supabase
        .from('approved_products')
        .update({
          product_data: product,
          updated_at: new Date().toISOString()
        })
        .eq('id', currentProduct.id);

      if (error) throw error;
      
      // Also update the product in the research_results table
      const researchResult = await getResearchResultById(currentProduct.research_result_id);
      if (researchResult) {
        const updatedData = [...researchResult.data];
        updatedData[currentProduct.product_index] = product;
        
        const { error: updateError } = await supabase
          .from('research_results')
          .update({
            data: updatedData,
            updated_at: new Date().toISOString()
          })
          .eq('id', currentProduct.research_result_id);
          
        if (updateError) throw updateError;
      }
      
      toast.success('Product updated successfully');
      
      // Update the local state
      const updatedProducts = [...userProducts];
      updatedProducts[index] = {
        ...currentProduct,
        product_data: product
      };
      setUserProducts(updatedProducts);
      
    } catch (error: any) {
      console.error('Error updating product:', error);
      toast.error(`Failed to update product: ${error.message}`);
    } finally {
      setActionLoadingIndex(null);
    }
  };

  const handleApproveProduct = async (product: ProductAnalysis, index: number) => {
    // Already approved, just save
    await handleSaveProduct(product, index);
  };

  const updateProductSection = (productIndex: number, section: keyof ProductAnalysis, value: any) => {
    const updatedProducts = [...userProducts];
    const currentProduct = updatedProducts[productIndex];
    
    // Update the section in the product_data
    currentProduct.product_data = {
      ...currentProduct.product_data,
      [section]: value
    };
    
    setUserProducts(updatedProducts);
  };

  const updateProduct = (index: number, updatedProduct: ProductAnalysis) => {
    const updatedProducts = [...userProducts];
    updatedProducts[index] = {
      ...updatedProducts[index],
      product_data: updatedProduct
    };
    setUserProducts(updatedProducts);
  };

  const handleDeleteProduct = async (id: string) => {
    try {
      await deleteApprovedProduct(id);
      
      // Immediately update the UI by filtering out the deleted product
      if (selectedUser) {
        // If we're in user view, update userProducts
        setUserProducts(prevProducts => prevProducts.filter(product => product.id !== id));
      }
      // Update the main products list
      setApprovedProducts(prevProducts => prevProducts.filter(product => product.id !== id));
      
      // Close the modal if it's open
      if (isDetailModalOpen) {
        closeDetailModal();
      }
      
      toast.success('Product deleted successfully');
    } catch (error) {
      console.error('Error deleting product:', error);
      toast.error('Failed to delete product');
    }
  };

  const renderMainContent = () => {
    // Show setup mode or error messages
    if (setupError) {
      return (
        <div className="text-center py-10 bg-card border border-border rounded-lg">
          <XCircle className="mx-auto h-12 w-12 text-red-500" />
          <h3 className="mt-2 text-lg font-medium text-foreground">Database Setup Error</h3>
          <p className="mt-1 text-sm text-muted-foreground">{setupError}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 px-4 py-2 bg-primary hover:bg-primary/80 text-primary-foreground rounded-md text-sm font-medium transition-colors duration-150"
          >
            Retry Setup
          </button>
        </div>
      );
    }
    
    if (isSetupMode) {
      return (
        <div className="text-center py-10 bg-card border border-border rounded-lg">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
          <h3 className="mt-2 text-lg font-medium text-foreground">Setting up database...</h3>
          <p className="mt-1 text-sm text-muted-foreground">Populating user profiles and admin access. This will only happen once.</p>
        </div>
      );
    }
    
    if (isLoading) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            <div className="relative mb-8">
              <div className="w-20 h-20 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-3xl flex items-center justify-center shadow-2xl mx-auto">
                <Crown className="h-10 w-10 text-white" />
              </div>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 w-20 h-20 border-4 border-yellow-400/30 border-t-yellow-500 rounded-3xl mx-auto"
              />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">BOFU Admin</h2>
            <p className="text-gray-300">Loading your dashboard...</p>
          </motion.div>
        </div>
      );
    }

    switch (currentView) {
      case 'userManagement':
        return selectedUser ? (
          <div>
            <motion.button 
              onClick={handleBackToUsers} 
              whileHover={{ x: -4 }}
              className="mb-6 flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft size={20} />
              <span className="font-medium">Back to Users</span>
            </motion.button>
            {isLoadingApproved ? (
              <div className="flex justify-center items-center py-12">
                <div className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-3xl flex items-center justify-center shadow-xl mx-auto mb-4">
                    <Loader2 className="h-8 w-8 text-white animate-spin" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">Loading User Products</h3>
                  <p className="text-gray-300">Please wait...</p>
                </div>
              </div>
            ) : userProducts.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {userProducts.map(product => (
                  <ProductCard key={product.id} product={product.product_data} researchResultId={product.research_result_id} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-24 h-24 bg-gradient-to-br from-gray-600 to-gray-700 rounded-3xl flex items-center justify-center shadow-xl mx-auto mb-6">
                  <Users className="h-12 w-12 text-gray-300" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">No Products Found</h3>
                <p className="text-gray-300">This user hasn't submitted any products yet.</p>
              </div>
            )}
          </div>
        ) : (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">User Management</h2>
              <span className="px-3 py-1 bg-yellow-500/20 text-yellow-300 text-sm font-medium rounded-full border border-yellow-500/30">
                {users.length} Users
              </span>
            </div>
            <div className="bg-gray-800/60 backdrop-blur-xl shadow-2xl rounded-2xl p-6 border border-gray-700/50">
              {users.length > 0 ? (
                <div className="space-y-3">
                  {users.map(user => (
                    <motion.div
                      key={user.id} 
                      onClick={() => handleSelectUser(user)}
                      whileHover={{ scale: 1.02, x: 4 }}
                      className="p-4 bg-gray-700/50 rounded-xl hover:bg-gray-600/50 cursor-pointer transition-all duration-200 flex justify-between items-center border border-gray-600/30 hover:border-yellow-500/30"
                    >
                      <div>
                        <p className="font-medium text-white">{user.company_name || 'N/A'}</p>
                        <p className="text-sm text-gray-300">{user.email}</p>
                      </div>
                      <UserCircle size={24} className="text-gray-400" />
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-300">No users found.</p>
                </div>
              )}
            </div>
          </motion.div>
        );
      case 'articleManagement':
        return (
          <Suspense fallback={
            <div className='flex justify-center items-center h-full'>
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-3xl flex items-center justify-center shadow-xl mx-auto mb-4">
                  <Loader2 className="h-8 w-8 text-white animate-spin" />
                </div>
                <p className="text-gray-300">Loading article management...</p>
              </div>
            </div>
          }>
            <AdminArticleManagementPage user={user} />
          </Suspense>
        );
      case 'commentManagement':
        return <EnhancedCommentDashboard />;
      case 'auditLogs':
        return <AuditLogViewer />;
      case 'settings':
        return (
          <div className="text-center py-12">
            <div className="w-24 h-24 bg-gradient-to-br from-gray-600 to-gray-700 rounded-3xl flex items-center justify-center shadow-xl mx-auto mb-6">
              <Settings className="h-12 w-12 text-gray-300" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Settings</h3>
            <p className="text-gray-300">Admin settings panel coming soon.</p>
          </div>
        );
      case 'productReview':
      default:
        return (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Show pending products for review */}
            <div>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Clock className="h-5 w-5 text-yellow-400" />
                  Pending Reviews ({approvedProducts.filter(p => p.reviewed_status === 'pending').length})
                </h3>
                {approvedProducts.filter(p => p.reviewed_status === 'pending').length > 0 && (
                  <span className="px-3 py-1 bg-yellow-500/20 text-yellow-300 text-sm font-medium rounded-full border border-yellow-500/30">
                    {approvedProducts.filter(p => p.reviewed_status === 'pending').length} items
                  </span>
                )}
              </div>
              {approvedProducts.filter(p => p.reviewed_status === 'pending').length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                  {approvedProducts.filter(p => p.reviewed_status === 'pending').map((product, index) => (
                    <motion.div
                      key={product.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      whileHover={{ y: -4 }}
                      className="group"
                    >
                      <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/20 to-blue-500/20 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-300 opacity-0 group-hover:opacity-100" />
                        <div className="relative bg-gray-800/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-700/50 p-6 hover:shadow-2xl hover:border-yellow-500/30 transition-all duration-300">
                          <div className="flex items-start gap-3 mb-4">
                            <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg">
                              <Eye className="h-4 w-4 text-white" />
                            </div>
                            <div className="flex-1">
                              <h4 className="font-bold text-lg text-white mb-1">{product.product_name}</h4>
                              <p className="text-sm text-gray-300">{product.company_name}</p>
                            </div>
                          </div>
                          <div className="mb-4">
                            <p className="text-sm text-gray-300 line-clamp-3">{product.product_description || 'No description available'}</p>
                            <div className="mt-2 text-xs text-gray-400">
                              <p>Approved by: {product.approved_by}</p>
                              <p>Date: {new Date(product.approved_at).toLocaleDateString()}</p>
                            </div>
                          </div>
                          <div className="flex gap-2 pt-4 border-t border-gray-700">
                            <motion.button 
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => handleMarkReviewed(product.id)}
                              disabled={isUpdatingStatus === product.id}
                              className="flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 disabled:opacity-50 shadow-lg hover:shadow-xl"
                            >
                              {isUpdatingStatus === product.id ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : (
                                <>
                                  <CheckCircle className="h-4 w-4 inline mr-1" />
                                  Approve
                                </>
                              )}
                            </motion.button>
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => handleRejectProduct(product.id)}
                              disabled={isUpdatingStatus === product.id}
                              className="flex-1 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 disabled:opacity-50 shadow-lg hover:shadow-xl"
                            >
                              {isUpdatingStatus === product.id ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : (
                                <>
                                  <XCircle className="h-4 w-4 inline mr-1" />
                                  Reject
                                </>
                              )}
                            </motion.button>
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => handleViewDetails(product)}
                              className="px-4 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl text-sm font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
                            >
                              <Eye className="h-4 w-4" />
                            </motion.button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-12"
                >
                  <div className="w-24 h-24 bg-gradient-to-br from-green-400 to-green-500 rounded-3xl flex items-center justify-center shadow-xl mx-auto mb-6">
                    <CheckCircle className="h-12 w-12 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">All Caught Up!</h3>
                  <p className="text-gray-300">No products pending review at the moment.</p>
                </motion.div>
              )}
            </div>
            
            {/* Approved products section */}
            <div>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-400" />
                  Recently Approved ({approvedProducts.length})
                </h3>
              </div>
              {approvedProducts.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                  {approvedProducts.slice(0, 6).map((product, index) => (
                    <motion.div
                      key={product.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      whileHover={{ y: -2 }}
                      className="group"
                    >
                      <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-green-500/20 to-blue-500/20 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-300 opacity-0 group-hover:opacity-100" />
                        <div className="relative bg-gray-800/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-700/50 p-6 hover:shadow-2xl hover:border-green-500/30 transition-all duration-300">
                          <div className="flex items-start gap-3 mb-4">
                            <div className="p-2 bg-gradient-to-br from-green-500 to-blue-500 rounded-lg">
                              <CheckCircle className="h-4 w-4 text-white" />
                            </div>
                            <div className="flex-1">
                              <h4 className="font-bold text-lg text-white mb-1">{product.product_name}</h4>
                              <p className="text-sm text-gray-300">{product.company_name}</p>
                            </div>
                            <span className="px-2 py-1 bg-green-500/20 text-green-300 text-xs font-medium rounded-full border border-green-500/30">
                              Approved
                            </span>
                          </div>
                          <p className="text-sm text-gray-300 line-clamp-3 mb-4">{product.product_description}</p>
                          <div className="flex gap-2 pt-4 border-t border-gray-700">
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => handleViewDetails(product)}
                              className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl text-sm font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
                            >
                              <Eye className="h-4 w-4 inline mr-1" />
                              View Details
                            </motion.button>
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => handleRejectProduct(product.id)}
                              className="px-4 py-2.5 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-xl text-sm font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
                            >
                              Revert
                            </motion.button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-gray-700/50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="h-8 w-8 text-gray-400" />
                  </div>
                  <p className="text-gray-300">No approved products yet.</p>
                </div>
              )}
            </div>
          </motion.div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Glassmorphism Sidebar */}
      <motion.aside 
        initial={{ x: -100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className="fixed left-0 top-0 h-full w-80 bg-gray-900/95 backdrop-blur-sm border-r border-gray-700/50 shadow-lg z-40"
      >
        <div className="flex flex-col h-full p-6">
          {/* Brand Header */}
          <motion.div 
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="mb-8"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-gray-700 rounded-lg flex items-center justify-center">
                <Crown className="h-5 w-5 text-gray-300" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-white">
                  Control Center
                </h1>
                <p className="text-sm text-gray-400">Admin Dashboard</p>
              </div>
            </div>
            <div className="h-px bg-gray-700" />
          </motion.div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1">
            {[
              { view: 'dashboard', label: 'Dashboard', icon: Home },
              { view: 'productReview', label: 'Product Review', icon: Eye },
              { view: 'userManagement', label: 'User Management', icon: Users },
              { view: 'articleManagement', label: 'Content Hub', icon: BookOpen },
              { view: 'commentManagement', label: 'Engagement', icon: MessageSquare },
              { view: 'auditLogs', label: 'Security Logs', icon: Shield },
              { view: 'settings', label: 'Settings', icon: Settings },
            ].map((item, index) => (
              <motion.button
                key={item.view}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => { setCurrentView(item.view as any); setSelectedUser(null); }}
                className={`group w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                  currentView === item.view
                    ? 'bg-gray-700/80 text-white border border-gray-600/50'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800/60'
                }`}
              >
                <item.icon size={18} />
                <span className="font-medium">{item.label}</span>
                {currentView === item.view && (
                  <div className="ml-auto w-1.5 h-1.5 bg-gray-400 rounded-full" />
                )}
              </motion.button>
            ))}
          </nav>

          {/* User Profile & Logout */}
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="mt-6 pt-6 border-t border-gray-700/50"
          >
            <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-800/60 mb-4 border border-gray-700/30">
              <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center">
                <UserCircle className="h-4 w-4 text-gray-300" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">Admin User</p>
                <p className="text-xs text-gray-400">lashay@bofu.ai</p>
              </div>
            </div>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-400 hover:text-white hover:bg-red-500/20 transition-all duration-200 border border-red-500/30 hover:border-red-500/50"
            >
              <LogOut size={16} />
              <span className="font-medium">Sign Out</span>
            </motion.button>
          </motion.div>
        </div>
      </motion.aside>

      {/* Main Content */}
      <div className="ml-80">
        {/* Top Header */}
        <motion.header 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="sticky top-0 z-30 bg-gray-800/90 backdrop-blur-xl border-b border-gray-700/50 p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">
                {currentView === 'dashboard' ? 'Dashboard Overview' :
                 currentView === 'productReview' ? 'Product Review Center' :
                 currentView === 'userManagement' ? (selectedUser ? `${selectedUser.company_name || selectedUser.email}'s Profile` : 'User Management') :
                 currentView === 'articleManagement' ? 'Content Management Hub' :
                 currentView === 'commentManagement' ? 'Engagement Center' :
                 currentView === 'auditLogs' ? 'Security & Audit Logs' :
                 currentView === 'settings' ? 'System Settings' :
                 'Admin Dashboard'}
              </h1>
              <p className="text-gray-400 mt-1">
                {currentView === 'dashboard' ? 'Welcome back! Here\'s what\'s happening today.' :
                 currentView === 'productReview' ? 'Review and manage submitted products' :
                 currentView === 'userManagement' ? 'Manage users and their permissions' :
                 'Manage your BOFU AI platform'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={refreshData}
                className="p-3 rounded-xl bg-gray-700/60 hover:bg-gray-600/60 shadow-lg hover:shadow-xl transition-all duration-200 border border-gray-600/30 hover:border-yellow-500/30"
                title="Refresh Data"
              >
                <RefreshCw size={18} className="text-gray-300 hover:text-white transition-colors" />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="p-3 rounded-xl bg-gradient-to-r from-yellow-400 to-yellow-500 text-white shadow-lg hover:shadow-xl transition-all duration-200"
              >
                <Bell size={18} />
              </motion.button>
            </div>
          </div>
        </motion.header>

        {/* Main Content Area */}
        <main className="p-6 bg-gray-800/90 min-h-screen">
          {currentView === 'dashboard' ? (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatsCard
                  title="Total Users"
                  value={stats.totalUsers}
                  change="+12% vs last month"
                  trend="up"
                  icon={Users}
                  color="gray"
                />
                <StatsCard
                  title="Research Projects"
                  value={stats.totalResearches}
                  change="+8% vs last month"
                  trend="up"
                  icon={BarChart3}
                  color="gray"
                />
                <StatsCard
                  title="Approved Products"
                  value={stats.totalApproved}
                  change="+15% vs last month"
                  trend="up"
                  icon={CheckCircle}
                  color="gray"
                />
                <StatsCard
                  title="Pending Reviews"
                  value={stats.pendingReview}
                  change={stats.pendingReview > 0 ? "Needs attention" : "All caught up!"}
                  trend={stats.pendingReview > 0 ? "neutral" : "up"}
                  icon={Clock}
                  color="gray"
                />
              </div>

              {/* Dashboard Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <ActivityFeed activities={[
                    { title: "New product review submitted", time: "2 minutes ago" },
                    { title: "User profile updated", time: "15 minutes ago" },
                    { title: "Article published", time: "1 hour ago" },
                    { title: "System backup completed", time: "2 hours ago" }
                  ]} />
                </div>
                <QuickActions />
              </div>
            </motion.div>
          ) : (
            renderMainContent()
          )}
        </main>
      </div>

      {/* Modern Product Detail Modal */}
      {selectedProduct && isDetailModalOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onClick={closeDetailModal}
        >
          <motion.div 
            initial={{ scale: 0.95, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, y: 20, opacity: 0 }}
            onClick={(e) => e.stopPropagation()} 
            className="bg-gray-800/95 backdrop-blur-xl p-8 rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-gray-700/50 relative"
          >
            <button 
              onClick={closeDetailModal} 
              className="absolute top-6 right-6 p-2 rounded-full bg-gray-700/60 hover:bg-gray-600/60 transition-colors"
            >
              <XCircle size={20} className="text-gray-300 hover:text-white transition-colors" />
            </button>
            <div className="flex items-start gap-4 mb-6">
              <div className="p-3 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-2xl">
                <Star className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">{selectedProduct.product_name}</h2>
                <p className="text-gray-300">{selectedProduct.company_name}</p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="p-4 bg-gray-700/50 rounded-xl border border-gray-600/30">
                <h3 className="text-lg font-semibold text-white mb-2">Product Description</h3>
                <p className="text-gray-300">{selectedProduct.product_description || 'No description available'}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gray-700/50 rounded-xl border border-gray-600/30">
                  <h4 className="text-sm font-medium text-gray-400 mb-1">Approved By</h4>
                  <p className="text-white">{selectedProduct.approved_by}</p>
                </div>
                <div className="p-4 bg-gray-700/50 rounded-xl border border-gray-600/30">
                  <h4 className="text-sm font-medium text-gray-400 mb-1">Approval Date</h4>
                  <p className="text-white">{new Date(selectedProduct.approved_at).toLocaleDateString()}</p>
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleMarkReviewed(selectedProduct.id)}
                  className="flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-6 py-3 rounded-xl font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  <CheckCircle className="h-4 w-4 inline mr-2" />
                  Approve
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleRejectProduct(selectedProduct.id)}
                  className="flex-1 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-6 py-3 rounded-xl font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  <XCircle className="h-4 w-4 inline mr-2" />
                  Reject
                </motion.button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}

export default AdminDashboard;