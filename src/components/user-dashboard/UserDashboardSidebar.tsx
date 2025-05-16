import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';

interface NavItem {
  name: string;
  href: string;
  icon: JSX.Element;
  count?: number;
  section?: string;
}

const UserDashboardSidebar = () => {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const { user } = useAuth();
  const [briefsCount, setBriefsCount] = useState(0);
  const [approvedCount, setApprovedCount] = useState(0);

  useEffect(() => {
    const fetchCounts = async () => {
      if (!user) return;

      // Get total briefs count
      const { count: totalBriefs } = await supabase
        .from('content_briefs')
        .select('*', { count: 'exact' })
        .eq('user_id', user.id);

      // Get approved content count
      const { count: approvedBriefs } = await supabase
        .from('content_briefs')
        .select('*', { count: 'exact' })
        .eq('user_id', user.id)
        .eq('status', 'approved');

      setBriefsCount(totalBriefs || 0);
      setApprovedCount(approvedBriefs || 0);
    };

    fetchCounts();
  }, [user]);

  const navigation: NavItem[] = [
    {
      section: 'Main',
      name: 'Dashboard',
      href: '/dashboard',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      section: 'Content',
      name: 'Content Briefs',
      href: '/dashboard/content-briefs',
      count: briefsCount,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
    {
      section: 'Content',
      name: 'Approved Content',
      href: '/dashboard/approved-content',
      count: approvedCount,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  ];

  // Group navigation items by section
  const groupedNavigation: Record<string, NavItem[]> = {};
  navigation.forEach(item => {
    const section = item.section || 'Other';
    if (!groupedNavigation[section]) {
      groupedNavigation[section] = [];
    }
    groupedNavigation[section].push(item);
  });

  return (
    <div className={`hidden md:flex md:flex-shrink-0 transition-all duration-300 ${collapsed ? 'md:w-16' : 'md:w-64'}`}>
      <div className="flex flex-col w-full">
        <div className="flex flex-col h-full border-r border-gray-200 bg-white shadow-sm">
          {/* Sidebar header with logo and collapse button */}
          <div className="flex items-center justify-between flex-shrink-0 h-16 px-4 border-b border-gray-200">
            {!collapsed && (
              <div className="flex items-center">
                <img
                  className="h-8 w-auto"
                  src="/your-logo.svg"
                  alt="Your Company"
                />

              </div>
            )}
            {collapsed && (
              <div className="mx-auto">
                <img
                  className="h-8 w-auto"
                  src="/logo-icon.svg"
                  alt="Your Logo"
                />
              </div>
            )}
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="text-gray-500 hover:text-gray-600 focus:outline-none"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {collapsed ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                )}
              </svg>
            </button>
          </div>

          {/* User profile summary */}
          {!collapsed && (
            <div className="flex items-center px-4 py-3 border-b border-gray-200">
              <div className="flex-shrink-0">
                <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-medium text-sm">
                  {user?.email?.charAt(0).toUpperCase() || 'U'}
                </div>
              </div>
              <div className="ml-3 min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user?.email || 'User'}
                </p>
                <p className="text-xs text-gray-500 truncate">PRO Plan</p>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex-1 flex flex-col overflow-y-auto pt-2 pb-4">
            <nav className="flex-1 px-2 space-y-6">
              {Object.entries(groupedNavigation).map(([section, items]) => (
                <div key={section} className="space-y-1">
                  {!collapsed && (
                    <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      {section}
                    </h3>
                  )}

                  {items.map((item) => {
                    const isActive = location.pathname === item.href ||
                      (location.pathname.startsWith(item.href) && item.href !== '/dashboard');
                    
                    return (
                      <Link
                        key={item.name}
                        to={item.href}
                        className={`nav-item ${
                          isActive ? 'active' : ''
                        } ${collapsed ? 'justify-center px-2' : ''}`}
                        title={collapsed ? item.name : undefined}
                      >
                        <div className={isActive ? 'text-primary-600' : ''}>
                          {item.icon}
                        </div>
                        {!collapsed && (
                          <div className="flex flex-1 items-center justify-between">
                            <span>{item.name}</span>
                            {item.count && (
                              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                {item.count}
                              </span>
                            )}
                          </div>
                        )}
                        {collapsed && item.count && (
                          <span className="absolute top-0 right-0 -mr-1 -mt-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary-500 text-xs font-medium text-white">
                            {item.count}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              ))}
            </nav>

            {/* Usage stats */}
            {!collapsed && (
              <div className="px-3 mt-6">
                <div className="rounded-lg bg-gray-50 p-3">
                  <h3 className="text-xs font-medium text-gray-700">Your usage</h3>
                  <div className="mt-2">
                    <div className="flex justify-between text-xs text-gray-600 mb-1">
                      <span>4/10 briefs used</span>
                      <span>40%</span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-bar-value" style={{ width: '40%' }}></div>
                    </div>
                  </div>
                  <div className="mt-3">
                    <button className="primary-button w-full py-1 flex items-center justify-center text-xs">
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      New Content Brief
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Collapsed new brief button */}
            {collapsed && (
              <div className="px-2 mt-6">
                <button 
                  className="w-full flex items-center justify-center h-10 rounded-lg bg-primary-500 hover:bg-primary-600 text-white transition-colors"
                  title="New Brief"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserDashboardSidebar;
