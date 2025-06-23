import React, { useState, useEffect, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase, supabaseAdmin } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { User } from '@supabase/supabase-js';
import { toast } from 'react-hot-toast';
import { Eye, Loader2, RefreshCw, UserCircle, ArrowLeft, Users, FileText, Shield, MessageSquare, BarChart3, TrendingUp, Clock, AlertCircle, Plus, Search, Filter, Calendar, Bell, LogOut, Home, Zap, Activity, BookOpen, UserPlus, Crown, Building2, UserCog, ChevronRight, Badge, ChevronDown, Edit, X } from 'lucide-react';
import { AuditLogViewer } from './AuditLogViewer';
import { EnhancedCommentDashboard } from './EnhancedCommentDashboard';
import { useAdminContext } from '../../contexts/AdminContext';
import { AssignmentNotificationCenter } from './AssignmentNotificationCenter';
import { ContentBriefManagement } from './ContentBriefManagement';
import { AdminAssignmentHub } from './AdminAssignmentHub';

// Dynamically import AdminArticleManagementPage for article editing functionality
const AdminArticleManagementPage = lazy(() => import('../../pages/AdminArticleManagementPage'));

type AdminView = 'dashboard' | 'userManagement' | 'articleManagement' | 'commentManagement' | 'auditLogs' | 'adminAssignmentHub' | 'contentBriefManagement';

interface AdminDashboardProps {
  onLogout: () => void;
  user: User | null;
}

// Interface for user profile with enhanced structure
interface UserProfile {
  id: string;
  email: string;
  company_name: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
  user_type?: 'main' | 'sub';
  profile_role?: 'admin' | 'manager' | 'editor' | 'viewer';
  parent_user_id?: string;
  profile_name?: string;
  articleCount?: number;
}

// Interface for grouped user data
interface CompanyGroup {
  company_name: string;
  main_account: UserProfile;
  sub_accounts: UserProfile[];
  total_users: number;
  created_at: string;
}


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
  const { 
    adminRole, 
    adminEmail, 
    assignedClients, 
    assignedClientIds, 
    allAdmins, 
    unassignedClients,
    refreshAdminData,
    error: adminError 
  } = useAdminContext();
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSetupMode, setIsSetupMode] = useState(false);
  const [setupError, setSetupError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalResearches: 0,
    totalApproved: 0,
    pendingReview: 0,
    monthlyGrowth: 0
  });
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [currentView, setCurrentView] = useState<AdminView>('dashboard');
  const [expandedCompanies, setExpandedCompanies] = useState<Set<string>>(new Set());
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [userSortBy, setUserSortBy] = useState<'company' | 'email' | 'date'>('company');
  const [selectedArticle, setSelectedArticle] = useState<any>(null);
  const [showNotificationCenter, setShowNotificationCenter] = useState(false);
  const [refreshCounter, setRefreshCounter] = useState(0);

  // Article Management state
  const [selectedUserForArticles, setSelectedUserForArticles] = useState<{ user: UserProfile | null; companyGroup?: CompanyGroup | null }>({ user: null, companyGroup: null });

  const refreshData = () => {
    console.log('[AdminDashboard] Manually refreshing data at:', new Date().toISOString());
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
    const checkAndSetupDatabase = async () => {
      try {
        setIsLoading(true);
        setSetupError(null);
        
        console.log('[AdminDashboard] Starting database and admin checks...');
        
        // Check tables exist
        const tables = ['admin_profiles', 'research_results'];
        
        for (const table of tables) {
          const { error } = await supabase.from(table).select('id').limit(1);
          if (error) {
            console.error(`[AdminDashboard] Table ${table} check failed:`, error);
            throw new Error(`Database table '${table}' is not accessible. Please check your Supabase setup.`);
          }
        }
        
        // ... existing admin setup code ...
        
        setIsSetupMode(false);
        
        // Now proceed with normal data fetching
        await Promise.all([fetchStats(), fetchUsers()]);
        
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
        // User count
        const { count: userCount } = await supabase
          .from('user_profiles')
          .select('*', { count: 'exact', head: true });

        // Research results count  
        const { count: researchCount } = await supabase
          .from('research_results')
          .select('*', { count: 'exact', head: true });

        setStats({
          totalUsers: userCount || 0,
          totalResearches: researchCount || 0,
          totalApproved: 0,
          pendingReview: 0,
          monthlyGrowth: 12
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      }
    };

    // Fetch all non-admin users (updated to use role-based API)
    const fetchUsers = async () => {
      try {
        console.log(`[AdminDashboard] Fetching users with admin permissions...`);
        
        if (!supabaseAdmin) {
          console.error('Admin client not available');
          return;
        }
        
        // Fetch main accounts from user_profiles using admin client
        const { data: mainUsers, error: mainError } = await supabaseAdmin
          .from('user_profiles')
          .select('*')
          .order('company_name', { ascending: true });

        if (mainError) {
          console.error('[AdminDashboard] Error fetching main users:', mainError);
          setSetupError('Failed to load main users');
          return;
        }

        // Fetch sub accounts from company_profiles using admin client
        const { data: subProfiles, error: subError } = await supabaseAdmin
          .from('company_profiles')
          .select('*')
          .order('company_id', { ascending: true });

        if (subError) {
          console.error('[AdminDashboard] Error fetching sub profiles:', subError);
        }

        console.log('[AdminDashboard] Main users fetched:', mainUsers?.length || 0);
        console.log('[AdminDashboard] Sub profiles fetched:', subProfiles?.length || 0);

        // Transform and combine the data (using ContentBriefManagement logic)
        const transformedUsers: UserProfile[] = [];
        
        // Add main users
        (mainUsers || []).forEach(user => {
          transformedUsers.push({
            ...user,
            user_type: 'main',
            profile_role: 'admin' // Main users are typically admins of their company
          });
        });

        // Create email lookup from main users
        const emailLookup: { [key: string]: string } = {};
        (mainUsers || []).forEach(user => {
          emailLookup[user.id] = user.email;
        });

        // Add sub users (company profiles)
        (subProfiles || []).forEach(profile => {
          // Try to get email from main user lookup, fallback to profile display
          let displayEmail = emailLookup[profile.user_id];
          if (!displayEmail) {
            displayEmail = profile.profile_name 
              ? `${profile.profile_name}@${profile.company_id || 'company'}`
              : `user-${profile.user_id.substring(0, 8)}@${profile.company_id || 'company'}`;
          }
          
          // Normalize company_id to handle empty strings
          const normalizedCompanyId = profile.company_id && profile.company_id.trim() !== '' 
            ? profile.company_id 
            : 'Unknown Company';
          
          transformedUsers.push({
            id: profile.user_id,
            email: displayEmail,
            company_name: normalizedCompanyId,
            created_at: profile.created_at,
            updated_at: profile.updated_at,
            user_type: 'sub',
            profile_role: profile.profile_role,
            profile_name: profile.profile_name
          });
        });
        
        console.log('[AdminDashboard] Total transformed users:', transformedUsers.length);
        console.log('[AdminDashboard] Main users:', transformedUsers.filter(u => u.user_type === 'main').length);
        console.log('[AdminDashboard] Sub users:', transformedUsers.filter(u => u.user_type === 'sub').length);
        
        // Fetch article counts for all users
        const userIds = transformedUsers.map(user => user.id);
        
        // Deduplicate user IDs to avoid counting the same articles multiple times
        const uniqueUserIds = [...new Set(userIds)];
        
        const { data: articleCounts, error: articleError } = await supabaseAdmin
          .from('content_briefs')
          .select('user_id, product_name, id')
          .in('user_id', uniqueUserIds)
          .not('article_content', 'is', null);

        if (articleError) {
          console.error('[AdminDashboard] Error fetching article counts:', articleError);
        } else {
          // Count unique articles per user (by normalized product_name to avoid counting multiple versions)
          const articleCountMap: { [key: string]: number } = {};
          const uniqueArticles = new Set();
          
          (articleCounts || []).forEach(article => {
            // Normalize product name to handle variations
            const normalizedProductName = (article.product_name || 'untitled')
              .toLowerCase()
              .trim()
              .replace(/\s+/g, ' '); // Replace multiple spaces with single space
            
            const uniqueKey = `${article.user_id}-${normalizedProductName}`;
            if (!uniqueArticles.has(uniqueKey)) {
              uniqueArticles.add(uniqueKey);
              articleCountMap[article.user_id] = (articleCountMap[article.user_id] || 0) + 1;
            }
          });

          console.log('[AdminDashboard] Article count processing:', {
            totalRecords: articleCounts?.length || 0,
            uniqueArticles: uniqueArticles.size,
            userCounts: articleCountMap
          });

          // Add article counts to users
          transformedUsers.forEach(user => {
            user.articleCount = articleCountMap[user.id] || 0;
          });

          // For main accounts, aggregate all company articles (main + sub accounts)
          transformedUsers.forEach(user => {
            if (user.user_type === 'main') {
              const companyUsers = transformedUsers.filter(u => 
                u.company_name === user.company_name
              );
              
              // Deduplicate user IDs to avoid counting the same articles multiple times
              const uniqueUserIds = [...new Set(companyUsers.map(u => u.id))];
              const totalCompanyArticles = uniqueUserIds.reduce((sum, userId) => 
                sum + (articleCountMap[userId] || 0), 0
              );
              
              user.articleCount = totalCompanyArticles;
              
              // Reset sub-account counts to 0 since we're aggregating under main account
              companyUsers.forEach(subUser => {
                if (subUser.user_type === 'sub') {
                  subUser.articleCount = 0;
                }
              });
            }
          });
        }

        setUsers(transformedUsers);
      } catch (error) {
        console.error('[AdminDashboard] Exception fetching users:', error);
        setSetupError(`Failed to fetch users: ${(error as any)?.message || String(error)}`);
      }
    };

    // Start with database setup check
    checkAndSetupDatabase();
    
    // Set up a refresh interval (every 30 seconds)
    const refreshInterval = setInterval(() => {
      console.log('[AdminDashboard] Auto-refreshing data...');
      fetchUsers();
    }, 30000);
    
    return () => {
      clearInterval(refreshInterval);
    };
  }, [refreshCounter]);

  const handleLogout = async () => {
    console.log('[AdminDashboard] handleLogout called, delegating to App.tsx handleSignOut');
    onLogout();
  };

  // Handle navigation
  const handleNavigation = (view: AdminView) => {
    setCurrentView(view);
  };

  const renderMainContent = () => {
    switch (currentView) {
      case 'userManagement':
        return (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">User Management</h2>
              <span className="px-3 py-1 bg-yellow-500/20 text-yellow-300 text-sm font-medium rounded-full border border-yellow-500/30">
                {users.length} Users ({sortedCompanyGroups.length} Companies)
              </span>
            </div>

            {/* Search and Filter Controls */}
            <div className="bg-gray-800/60 backdrop-blur-sm rounded-lg shadow-lg border border-gray-700/30 p-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by company name, email, or profile name..."
                    value={userSearchTerm}
                    onChange={(e) => setUserSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-gray-700/50 border border-gray-600/50 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Filter className="h-5 w-5 text-gray-400" />
                  <select
                    value={userSortBy}
                    onChange={(e) => setUserSortBy(e.target.value as 'company' | 'email' | 'date')}
                    className="px-4 py-3 bg-gray-700/50 border border-gray-600/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                  >
                    <option value="company">Sort by Company</option>
                    <option value="email">Sort by Email</option>
                    <option value="date">Sort by Join Date</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Company Groups Display */}
            <div className="space-y-6">
              {sortedCompanyGroups.map((companyGroup, groupIndex) => {
                const isExpanded = expandedCompanies.has(companyGroup.company_name);
                
                return (
                  <motion.div
                    key={companyGroup.company_name}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: groupIndex * 0.1 }}
                    className="bg-gray-800/60 backdrop-blur-sm rounded-xl shadow-lg border border-gray-700/30 overflow-hidden"
                  >
                    {/* Company Header */}
                    <div 
                      className="p-6 cursor-pointer hover:bg-gray-700/30 transition-all duration-200"
                      onClick={() => {
                        const newExpanded = new Set(expandedCompanies);
                        if (isExpanded) {
                          newExpanded.delete(companyGroup.company_name);
                        } else {
                          newExpanded.add(companyGroup.company_name);
                        }
                        setExpandedCompanies(newExpanded);
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center flex-shrink-0">
                            <Building2 className="h-6 w-6 text-white" />
                          </div>
                          <div>
                            <div className="flex items-center gap-3">
                              <h3 className="text-xl font-bold text-white">
                                {companyGroup.company_name}
                              </h3>
                              <div className="flex items-center gap-2">
                                <Badge className="w-4 h-4 text-blue-400" />
                                <span className="text-sm font-medium text-blue-400">
                                  {companyGroup.total_users} {companyGroup.total_users === 1 ? 'user' : 'users'}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-4 mt-2">
                              <p className="text-gray-400 text-sm">
                                Main: {companyGroup.main_account.email}
                              </p>
                              <div className="flex items-center gap-1 text-xs text-gray-500">
                                <Calendar className="w-3 h-3" />
                                <span>Created {new Date(companyGroup.created_at).toLocaleDateString()}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <div className="text-sm text-gray-400">
                              {companyGroup.sub_accounts.length} sub-account{companyGroup.sub_accounts.length !== 1 ? 's' : ''}
                            </div>
                          </div>
                          <motion.div
                            animate={{ rotate: isExpanded ? 90 : 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            <ChevronRight className="w-5 h-5 text-gray-400" />
                          </motion.div>
                        </div>
                      </div>
                    </div>

                    {/* Expanded Content - Main and Sub Accounts */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3, ease: 'easeInOut' }}
                          className="border-t border-gray-700/30"
                        >
                          <div className="p-6 bg-gray-700/20">
                            {/* Main Account */}
                            <div className="mb-6">
                              <div className="flex items-center gap-2 mb-3">
                                <Crown className="w-4 h-4 text-yellow-400" />
                                <h4 className="text-sm font-semibold text-yellow-400 uppercase tracking-wider">
                                  Main Account
                                </h4>
                              </div>
                              <motion.div
                                whileHover={{ scale: 1.02 }}
                                className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 rounded-lg p-4 cursor-pointer hover:border-yellow-500/40 transition-all duration-200"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-lg flex items-center justify-center">
                                    <Crown className="w-5 h-5 text-white" />
                                  </div>
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                      <span className="text-white font-medium">
                                        {companyGroup.main_account.email}
                                      </span>
                                      <span className="px-2 py-1 bg-yellow-500/20 text-yellow-300 text-xs rounded-full border border-yellow-500/30">
                                        Owner
                                      </span>
                                    </div>
                                    <p className="text-gray-400 text-xs mt-1">
                                      Joined: {new Date(companyGroup.main_account.created_at).toLocaleDateString()}
                                    </p>
                                  </div>
                                  <UserCircle className="w-4 h-4 text-gray-400" />
                                </div>
                              </motion.div>
                            </div>

                            {/* Sub Accounts */}
                            {companyGroup.sub_accounts.length > 0 && (
                              <div>
                                <div className="flex items-center gap-2 mb-3">
                                  <Users className="w-4 h-4 text-blue-400" />
                                  <h4 className="text-sm font-semibold text-blue-400 uppercase tracking-wider">
                                    Sub Accounts ({companyGroup.sub_accounts.length})
                                  </h4>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  {companyGroup.sub_accounts.map((subUser, subIndex) => {
                                    const getRoleIcon = (role?: string) => {
                                      switch (role) {
                                        case 'admin': return <UserCog className="w-4 h-4 text-red-400" />;
                                        case 'manager': return <Users className="w-4 h-4 text-blue-400" />;
                                        case 'editor': return <Edit className="w-4 h-4 text-green-400" />;
                                        case 'viewer': return <Eye className="w-4 h-4 text-gray-400" />;
                                        default: return <UserCircle className="w-4 h-4 text-gray-400" />;
                                      }
                                    };
                                    
                                    const getRoleColor = (role?: string) => {
                                      switch (role) {
                                        case 'admin': return 'from-red-500/10 to-pink-500/10 border-red-500/20 hover:border-red-500/40';
                                        case 'manager': return 'from-blue-500/10 to-cyan-500/10 border-blue-500/20 hover:border-blue-500/40';
                                        case 'editor': return 'from-green-500/10 to-emerald-500/10 border-green-500/20 hover:border-green-500/40';
                                        case 'viewer': return 'from-gray-500/10 to-slate-500/10 border-gray-500/20 hover:border-gray-500/40';
                                        default: return 'from-gray-500/10 to-slate-500/10 border-gray-500/20 hover:border-gray-500/40';
                                      }
                                    };
                                    
                                    return (
                                      <motion.div
                                        key={subUser.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: subIndex * 0.1 }}
                                        whileHover={{ scale: 1.02 }}
                                        className={`bg-gradient-to-r ${getRoleColor(subUser.profile_role)} rounded-lg p-3 cursor-pointer transition-all duration-200`}
                                      >
                                        <div className="flex items-center gap-3">
                                          <div className="w-8 h-8 bg-gray-600 rounded-lg flex items-center justify-center">
                                            {getRoleIcon(subUser.profile_role)}
                                          </div>
                                          <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                              <span className="text-white text-sm font-medium truncate">
                                                {subUser.profile_name || subUser.email}
                                              </span>
                                              <span className={`px-2 py-1 text-xs rounded-full capitalize ${
                                                subUser.profile_role === 'admin' ? 'bg-red-500/20 text-red-300 border border-red-500/30' :
                                                subUser.profile_role === 'manager' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' :
                                                subUser.profile_role === 'editor' ? 'bg-green-500/20 text-green-300 border border-green-500/30' :
                                                'bg-gray-500/20 text-gray-300 border border-gray-500/30'
                                              }`}>
                                                {subUser.profile_role || 'user'}
                                              </span>
                                            </div>
                                            <p className="text-gray-400 text-xs truncate">
                                              {subUser.email}
                                            </p>
                                          </div>
                                          <UserCircle className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                        </div>
                                      </motion.div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>

            {sortedCompanyGroups.length === 0 && (
              <div className="text-center py-12">
                <Building2 className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                <p className="text-gray-400">
                  {userSearchTerm ? 'No companies found matching your search' : 'No companies found'}
                </p>
              </div>
            )}

            {/* Info card about Content Brief Management */}
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-6">
              <div className="flex items-start gap-4">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <BookOpen className="h-6 w-6 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-white font-semibold mb-2">Looking for user content?</h3>
                  <p className="text-gray-300 text-sm mb-3">
                    To view user's research results, product cards, and generated content briefs, 
                    visit the <span className="text-blue-400 font-medium">Content Brief Management</span> section.
                  </p>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleNavigation('contentBriefManagement')}
                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors duration-200"
                  >
                    Go to Content Brief Management
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.div>
        );
      case 'articleManagement':
        return (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">Article Management</h2>
                <p className="text-gray-400">Manage generated articles across all company accounts</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-sm text-gray-400">
                  Total: {users.length} users, {users.reduce((acc, user) => acc + (user.articleCount || 0), 0)} articles
                </div>
              </div>
            </div>

            {/* Search and Filter Bar */}
            <div className="flex items-center gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search by company name, email, or user..."
                  value={userSearchTerm}
                  onChange={(e) => setUserSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
                />
              </div>
              <select
                value={userSortBy}
                onChange={(e) => setUserSortBy(e.target.value as 'company' | 'email' | 'date')}
                className="px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-purple-500"
              >
                <option value="company">Sort by Company</option>
                <option value="email">Sort by Email</option>
                <option value="date">Sort by Join Date</option>
              </select>
            </div>

            {/* Company Groups - Simplified View */}
            <div className="space-y-4">
              {sortedCompanyGroups.map((company) => {
                // Only show the main account's article count (which now includes all company articles)
                const totalCompanyArticles = company.main_account.articleCount || 0;

                // Debug logging for the specific company
                console.log(`[ArticleManagement] Company: ${company.company_name}`, {
                  mainAccountArticles: company.main_account.articleCount || 0,
                  displayTotal: totalCompanyArticles
                });

                return (
                  <motion.div
                    key={company.company_name}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-gray-900/40 backdrop-blur-sm border border-gray-700/50 rounded-2xl overflow-hidden cursor-pointer hover:bg-gray-800/50 transition-colors duration-200"
                    onClick={() => handleUserArticleSelection(company.main_account)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {/* Company Header - No Expansion */}
                    <div className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl">
                            <Building2 className="h-6 w-6 text-white" />
                          </div>
                          <div>
                            <h3 className="text-xl font-semibold text-white mb-1">
                              {company.company_name}
                            </h3>
                            <div className="flex items-center gap-4 text-sm text-gray-400">
                              <span>{totalCompanyArticles} articles</span>
                              <span>•</span>
                              <span>Owner: {company.main_account.email}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-sm text-gray-400">
                            Created: {new Date(company.created_at).toLocaleDateString()}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-400">Click to view articles</span>
                            <ChevronRight className="w-4 h-4 text-gray-400" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {sortedCompanyGroups.length === 0 && (
              <div className="text-center py-12">
                <Building2 className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                <p className="text-gray-400">
                  {userSearchTerm ? 'No companies found matching your search' : 'No companies found'}
                </p>
              </div>
            )}

            {/* User Articles Modal */}
            {selectedUserForArticles.user && (
              <UserArticlesModal
                user={selectedUserForArticles.user}
                companyGroup={selectedUserForArticles.companyGroup}
                isOpen={!!selectedUserForArticles.user}
                onClose={() => setSelectedUserForArticles({ user: null, companyGroup: null })}
                onEditArticle={handleEditArticleFromList}
              />
            )}
          </motion.div>
        );
      case 'commentManagement':
        return <EnhancedCommentDashboard />;
      case 'auditLogs':
        return <AuditLogViewer />;
      case 'contentBriefManagement':
        return <ContentBriefManagement />;
      case 'adminAssignmentHub':
        return <AdminAssignmentHub />;
      default:
        return (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="text-center py-12">
              <div className="w-24 h-24 bg-gradient-to-br from-blue-400 to-blue-500 rounded-3xl flex items-center justify-center shadow-xl mx-auto mb-6">
                <Home className="h-12 w-12 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Dashboard</h3>
              <p className="text-gray-300">Select a section from the sidebar to get started.</p>
            </div>
          </motion.div>
        );
    }
  };

  // Group users by company with proper hierarchy (for User Management)
  const groupUsersByCompany = (users: UserProfile[]): CompanyGroup[] => {
    console.log('🔍 Grouping users by company. Total users:', users.length);
    console.log('🔍 User types:', users.map(u => ({ email: u.email, type: u.user_type, company: u.company_name })));
    
    const companies = new Map<string, CompanyGroup>();
    
    users.forEach(user => {
      // Normalize company name - treat empty strings and null as "Unknown Company"
      const rawCompanyName = user.company_name;
      const companyName = rawCompanyName && rawCompanyName.trim() !== '' 
        ? rawCompanyName 
        : 'Unknown Company';
      
      if (!companies.has(companyName)) {
        // Find the main account for this company
        const mainAccount = users.find(
          u => {
            const uCompanyName = u.company_name && u.company_name.trim() !== '' 
              ? u.company_name 
              : 'Unknown Company';
            return uCompanyName === companyName && u.user_type === 'main';
          }
        );
        
        if (mainAccount) {
          companies.set(companyName, {
            company_name: companyName,
            main_account: mainAccount,
            sub_accounts: [],
            total_users: 0,
            created_at: mainAccount.created_at
          });
        }
      }
      
      const company = companies.get(companyName);
      if (company) {
        if (user.user_type === 'sub') {
          console.log('➕ Adding sub-account to', companyName, ':', user.email);
          company.sub_accounts.push(user);
        }
        company.total_users = 1 + company.sub_accounts.length;
      }
    });
    
    // Now calculate the correct total_users for each company
    companies.forEach(company => {
      company.total_users = 1 + company.sub_accounts.length;
    });
    
    const result = Array.from(companies.values());
    console.log('🏢 Final company groups:', result.map(c => ({ 
      company: c.company_name, 
      total: c.total_users, 
      subAccounts: c.sub_accounts.length,
      subAccountEmails: c.sub_accounts.map(s => s.email)
    })));
    
    return result;
  };

  // Filter and group users for User Management
  const filteredUsers = users.filter(user => 
    user.company_name?.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
    user.profile_name?.toLowerCase().includes(userSearchTerm.toLowerCase())
  );

  const groupedUsers = groupUsersByCompany(filteredUsers);
  
  // Sort company groups
  const sortedCompanyGroups = [...groupedUsers].sort((a, b) => {
    switch (userSortBy) {
      case 'company':
        return a.company_name.localeCompare(b.company_name);
      case 'email':
        return a.main_account.email.localeCompare(b.main_account.email);
      case 'date':
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      default:
        return 0;
    }
  });

  // Article Management handlers
  const handleUserArticleSelection = (user: UserProfile) => {
    // Find the company group for this user to get all company users
    const companyGroup = sortedCompanyGroups.find(group => 
      group.main_account.id === user.id || 
      group.sub_accounts.some(subUser => subUser.id === user.id)
    );
    
    if (companyGroup) {
      setSelectedUserForArticles({ user, companyGroup });
    } else {
      setSelectedUserForArticles({ user, companyGroup: null });
    }
  };

  const handleEditArticleFromList = (article: any) => {
    // Navigate to the dedicated admin article editor page instead of opening modal
    navigate(`/admin/articles/${article.id}`);
  };

  // Enhanced article editing handlers for ArticleEditor integration
  const handleOpenArticleEditor = async (article: any) => {
    console.log('🔥 Navigating to ArticleEditor for article:', article);
    navigate(`/admin/articles/${article.id}`);
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
            {/* Navigation Menu */}
            <div className="space-y-2">
              {[
                { view: 'dashboard', label: 'Dashboard', icon: Home },
                { view: 'userManagement', label: 'User Management', icon: Users },
                { view: 'contentBriefManagement', label: 'Content Brief Management', icon: BookOpen },
                { view: 'articleManagement', label: 'Article Management', icon: FileText },
                { view: 'commentManagement', label: 'Comment Management', icon: MessageSquare },
                { view: 'auditLogs', label: 'Security Logs', icon: Shield },
                ...(adminRole === 'super_admin' ? [
                  { view: 'adminAssignmentHub' as AdminView, label: 'Admin Assignment Hub', icon: Users },
                ] : []),
              ].map((item, index) => (
                <motion.button
                  key={item.view}
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: index * 0.1 }}
                  onClick={() => handleNavigation(item.view as AdminView)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                    currentView === item.view
                      ? 'bg-primary-500/20 text-yellow-300 border border-primary-500/30'
                      : 'text-gray-300 hover:text-white hover:bg-gray-700/50'
                  }`}
                >
                  <item.icon size={18} />
                  <span className="font-medium">{item.label}</span>
                  {currentView === item.view && (
                    <div className="ml-auto w-1.5 h-1.5 bg-gray-400 rounded-full" />
                  )}
                </motion.button>
              ))}
            </div>
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
                <p className="text-sm font-medium text-white truncate">
                  {adminEmail || 'Admin User'}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                    adminRole === 'super_admin' 
                      ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30' 
                      : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                  }`}>
                    {adminRole === 'super_admin' ? 'Super Admin' : 'Sub Admin'}
                  </span>
                  {adminRole === 'sub_admin' && (
                    <span className="text-xs text-gray-400">
                      {assignedClients.length} clients
                    </span>
                  )}
                </div>
              </div>
            </div>
            
            {/* Assignment Summary for Sub-Admins */}
            {adminRole === 'sub_admin' && assignedClients.length > 0 && (
              <div className="mb-4 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <h4 className="text-sm font-medium text-blue-300 mb-2">Your Assigned Clients</h4>
                <div className="space-y-1">
                  {assignedClients.slice(0, 3).map(client => (
                    <div key={client.id} className="text-xs text-gray-300 truncate">
                      {client.client_email}
                    </div>
                  ))}
                  {assignedClients.length > 3 && (
                    <div className="text-xs text-blue-400">
                      +{assignedClients.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Admin Error Display */}
            {adminError && (
              <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-400" />
                  <span className="text-sm text-red-300">Admin Error</span>
                </div>
                <p className="text-xs text-red-400 mt-1">{adminError}</p>
                <button
                  onClick={refreshAdminData}
                  className="mt-2 text-xs text-red-300 hover:text-red-200 underline"
                >
                  Retry
                </button>
              </div>
            )}
            
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
                 currentView === 'userManagement' ? 'User Management' :
                 currentView === 'contentBriefManagement' ? 'Content Brief Management' :
                 currentView === 'articleManagement' ? 'Content Management Hub' :
                 currentView === 'commentManagement' ? 'Engagement Center' :
                 currentView === 'auditLogs' ? 'Security & Audit Logs' :
                 currentView === 'adminAssignmentHub' ? 'Admin Assignment Hub' :
                 'Admin Dashboard'}
              </h1>
              <p className="text-gray-400 mt-1">
                {currentView === 'dashboard' ? 'Welcome back! Here\'s what\'s happening today.' :
                 currentView === 'userManagement' ? 'Manage users and their permissions' :
                 currentView === 'contentBriefManagement' ? 'Manage user content briefs and product cards' :
                 currentView === 'adminAssignmentHub' ? 'Manage admin accounts, client assignments, and operations' :
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
              
              {/* Notification Bell - Super Admin Only */}
              {adminRole === 'super_admin' && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowNotificationCenter(true)}
                  className="relative p-3 rounded-xl bg-gray-700/60 hover:bg-gray-600/60 shadow-lg hover:shadow-xl transition-all duration-200 border border-gray-600/30 hover:border-blue-500/30"
                  title="Assignment Notifications"
                >
                  <Bell size={18} className="text-gray-300 hover:text-white transition-colors" />
                  {/* Dynamic notification badge */}
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-xs text-white font-bold">
                    {/* This will be updated to show actual count from AssignmentNotificationCenter */}
                    {assignedClients.length > 0 ? assignedClients.length : ''}
                  </div>
                </motion.button>
              )}
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
                  title="Content Briefs"
                  value={stats.totalApproved}
                  change="+15% vs last month"
                  trend="up"
                  icon={BookOpen}
                  color="gray"
                />
                <StatsCard
                  title="Active Sessions"
                  value={stats.pendingReview}
                  change={stats.pendingReview > 0 ? "Currently active" : "No active sessions"}
                  trend="neutral"
                  icon={Clock}
                  color="gray"
                />
              </div>

              {/* Dashboard Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <ActivityFeed activities={[
                    { title: "User profile updated", time: "15 minutes ago" },
                    { title: "Article published", time: "1 hour ago" },
                    { title: "System backup completed", time: "2 hours ago" },
                    { title: "New user registered", time: "3 hours ago" }
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

      {/* Assignment Notification Center */}
      <AssignmentNotificationCenter
        isVisible={showNotificationCenter}
        onClose={() => setShowNotificationCenter(false)}
      />
    </div>
  );
}

// User Articles Modal Component
const UserArticlesModal = ({ user, companyGroup, isOpen, onClose, onEditArticle }: {
  user: UserProfile;
  companyGroup?: CompanyGroup | null;
  isOpen: boolean;
  onClose: () => void;
  onEditArticle: (article: any) => void;
}) => {
  const [articles, setArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch articles for all users in the company
  useEffect(() => {
    if (isOpen && user) {
      fetchCompanyArticles();
    }
  }, [isOpen, user, companyGroup]);

  const fetchCompanyArticles = async () => {
    setLoading(true);
    try {
      if (!supabaseAdmin) {
        console.error('Admin client not available');
        return;
      }

      let userIds: string[] = [];
      
      if (companyGroup) {
        // Get all user IDs from the company (main account + sub accounts)
        userIds = [
          companyGroup.main_account.id,
          ...companyGroup.sub_accounts.map(subUser => subUser.id)
        ];
      } else {
        // Fallback to just the selected user
        userIds = [user.id];
      }

      // First, fetch articles without the join
      const { data: articlesData, error } = await supabaseAdmin
        .from('content_briefs')
        .select('*')
        .in('user_id', userIds)
        .not('article_content', 'is', null)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching articles:', error);
        toast.error('Failed to fetch articles');
        return;
      }

      // If we have articles, fetch user information for those users
      let enrichedArticles = articlesData || [];
      
      if (articlesData && articlesData.length > 0) {
        const articleUserIds = [...new Set(articlesData.map(article => article.user_id))];
        
        // Fetch user profiles for the article authors
        const { data: usersData, error: usersError } = await supabaseAdmin
          .from('user_profiles')
          .select('id, email, company_name')
          .in('id', articleUserIds);

        if (usersError) {
          console.error('Error fetching user profiles:', usersError);
          // Continue without user data - we'll show the article anyway
        } else {
          // Create a map for quick lookup
          const userMap = new Map(usersData.map(u => [u.id, u]));
          
          // Enrich articles with user data
          enrichedArticles = articlesData.map(article => ({
            ...article,
            user_profiles: userMap.get(article.user_id) || null
          }));
        }
      }

      setArticles(enrichedArticles);
    } catch (error) {
      console.error('Exception fetching articles:', error);
      toast.error('Failed to fetch articles');
    } finally {
      setLoading(false);
    }
  };

  const filteredArticles = articles.filter(article =>
    article.product_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    article.article_content?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    article.user_profiles?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    article.user_profiles?.profile_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isOpen) return null;

  const companyName = companyGroup?.company_name || user.company_name || 'Unknown Company';
  const totalArticles = articles.length;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-gray-900 rounded-2xl shadow-xl border border-gray-700 w-full max-w-4xl max-h-[80vh] overflow-hidden"
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <Building2 className="h-6 w-6 text-purple-400" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">
                  {companyName} - All Articles
                </h2>
                <p className="text-gray-400 text-sm">
                  {companyGroup ? `${companyGroup.total_users} users` : '1 user'} • {totalArticles} articles
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="p-6 border-b border-gray-700">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search articles, authors, or content..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
            />
          </div>
        </div>

        {/* Article List */}
        <div className="p-6 overflow-y-auto max-h-96">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 text-purple-400 animate-spin" />
              <span className="ml-2 text-gray-400">Loading articles...</span>
            </div>
          ) : filteredArticles.length > 0 ? (
            <div className="space-y-4">
              {filteredArticles.map((article) => (
                <motion.div
                  key={article.id}
                  className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 hover:bg-gray-700/50 transition-colors"
                  whileHover={{ scale: 1.01 }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-white font-medium">
                          {article.product_name || 'Untitled Article'}
                        </h3>
                        <span className="px-2 py-1 text-xs bg-gray-700 text-gray-300 rounded-full">
                          by {article.user_profiles?.profile_name || article.user_profiles?.email || 'Unknown'}
                        </span>
                      </div>
                      <p className="text-gray-400 text-sm mb-3 line-clamp-2">
                        {article.article_content?.substring(0, 150)}...
                      </p>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>Created: {new Date(article.created_at).toLocaleDateString()}</span>
                        <span>•</span>
                        <span>Version: {article.article_version || 1}</span>
                        <span>•</span>
                        <span className={`px-2 py-1 rounded-full ${
                          article.editing_status === 'final' ? 'bg-green-500/20 text-green-300' :
                          article.editing_status === 'review' ? 'bg-yellow-500/20 text-yellow-300' :
                          article.editing_status === 'editing' ? 'bg-blue-500/20 text-blue-300' :
                          'bg-gray-500/20 text-gray-300'
                        }`}>
                          {article.editing_status || 'draft'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={() => onEditArticle(article)}
                        className="px-3 py-2 bg-purple-500/20 hover:bg-purple-500/30 rounded-lg transition-colors text-purple-400 hover:text-purple-300 text-sm font-medium"
                      >
                        Edit Article
                      </button>
                      {article.link && (
                        <a
                          href={article.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                        >
                          <Eye className="h-4 w-4 text-gray-400" />
                        </a>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-gray-500 mx-auto mb-4" />
              <p className="text-gray-400">
                {searchTerm ? 'No articles found matching your search' : `No articles found for ${companyName}`}
              </p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default AdminDashboard;