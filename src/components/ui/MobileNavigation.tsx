import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Menu, X, Home, FileText, Edit3, Settings, User, LogOut, 
  Search, Plus, ChevronRight, ChevronDown, ArrowLeft,
  Grid, List as ListIcon, Filter, SortAsc, MoreVertical,
  Bookmark, Clock, Star, Share2, Download, Upload
} from 'lucide-react';

import { useMobileDetection, isTouchDevice } from '../../hooks/useMobileDetection';
import { supabase } from '../../lib/supabase';

interface MobileNavigationProps {
  className?: string;
  onNavigate?: (path: string) => void;
}

interface NavigationItem {
  id: string;
  label: string;
  path: string;
  icon: React.ReactNode;
  badge?: number;
  children?: NavigationItem[];
}

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  showBackButton?: boolean;
  onBack?: () => void;
}

// Mobile Drawer Component
const MobileDrawer: React.FC<MobileDrawerProps> = ({
  isOpen,
  onClose,
  children,
  title,
  showBackButton = false,
  onBack
}) => {
  const { isMobile } = useMobileDetection();
  const drawerRef = useRef<HTMLDivElement>(null);
  const [startX, setStartX] = useState<number>(0);
  const [currentX, setCurrentX] = useState<number>(0);
  const [isDragging, setIsDragging] = useState(false);
  const [translateX, setTranslateX] = useState<number>(0);

  // Close drawer on escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  // Handle swipe to close
  const handleTouchStart = (event: React.TouchEvent) => {
    if (!isMobile) return;
    
    setStartX(event.touches[0].clientX);
    setCurrentX(event.touches[0].clientX);
    setIsDragging(true);
  };

  const handleTouchMove = (event: React.TouchEvent) => {
    if (!isMobile || !isDragging) return;
    
    const deltaX = event.touches[0].clientX - startX;
    setCurrentX(event.touches[0].clientX);
    
    // Only allow leftward swipe to close
    if (deltaX < 0) {
      setTranslateX(Math.abs(deltaX));
    }
  };

  const handleTouchEnd = () => {
    if (!isMobile || !isDragging) return;
    
    setIsDragging(false);
    
    // Close drawer if swiped left more than 100px
    if (translateX > 100) {
      onClose();
    } else {
      setTranslateX(0);
    }
  };

  // Handle backdrop click
  const handleBackdropClick = (event: React.MouseEvent) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex"
      onClick={handleBackdropClick}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black bg-opacity-50 transition-opacity" />
      
      {/* Drawer */}
      <div
        ref={drawerRef}
        className="relative bg-white w-80 max-w-[85vw] h-full shadow-xl overflow-hidden"
        style={{
          transform: isDragging ? `translateX(-${translateX}px)` : 'translateX(0)',
          transition: isDragging ? 'none' : 'transform 0.3s ease-out'
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center space-x-3">
            {showBackButton && onBack && (
              <button
                onClick={onBack}
                className="p-2 rounded-full hover:bg-gray-200 transition-colors"
                title="Back"
              >
                <ArrowLeft size={20} />
              </button>
            )}
            {title && (
              <h2 className="text-lg font-semibold text-gray-900 truncate">
                {title}
              </h2>
            )}
          </div>
          
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-200 transition-colors"
            title="Close"
          >
            <X size={20} />
          </button>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
};

// Mobile Navigation Item Component
const MobileNavItem: React.FC<{
  item: NavigationItem;
  isActive: boolean;
  onNavigate: (path: string) => void;
  depth?: number;
}> = ({ item, isActive, onNavigate, depth = 0 }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasChildren = item.children && item.children.length > 0;
  const paddingLeft = depth * 16 + 16;

  const handleClick = () => {
    if (hasChildren) {
      setIsExpanded(!isExpanded);
    } else {
      onNavigate(item.path);
    }
  };

  return (
    <div>
      <button
        onClick={handleClick}
        className={`
          w-full flex items-center justify-between p-4 text-left transition-colors
          ${isActive ? 'bg-primary-50 text-primary-600 border-r-2 border-primary-600' : 'text-gray-700 hover:bg-gray-50'}
        `}
        style={{ paddingLeft }}
      >
        <div className="flex items-center space-x-3">
          <div className={`${isActive ? 'text-primary-600' : 'text-gray-500'}`}>
            {item.icon}
          </div>
          <span className="font-medium">{item.label}</span>
          {item.badge && item.badge > 0 && (
            <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
              {item.badge}
            </span>
          )}
        </div>
        
        {hasChildren && (
          <div className={`transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
            <ChevronRight size={16} />
          </div>
        )}
      </button>
      
      {/* Children */}
      {hasChildren && isExpanded && (
        <div className="bg-gray-25">
          {item.children?.map((child) => (
            <MobileNavItem
              key={child.id}
              item={child}
              isActive={isActive}
              onNavigate={onNavigate}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// Main Mobile Navigation Component
export const MobileNavigation: React.FC<MobileNavigationProps> = ({
  className = '',
  onNavigate
}) => {
  const { isMobile } = useMobileDetection();
  const location = useLocation();
  const navigate = useNavigate();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);

  // Navigation items configuration
  const navigationItems: NavigationItem[] = [
    {
      id: 'home',
      label: 'Home',
      path: '/',
      icon: <Home size={20} />
    },
    {
      id: 'articles',
      label: 'Articles',
      path: '/articles',
      icon: <FileText size={20} />,
      children: [
        {
          id: 'my-articles',
          label: 'My Articles',
          path: '/articles/my',
          icon: <Edit3 size={16} />
        },
        {
          id: 'recent',
          label: 'Recent',
          path: '/articles/recent',
          icon: <Clock size={16} />
        },
        {
          id: 'favorites',
          label: 'Favorites',
          path: '/articles/favorites',
          icon: <Star size={16} />
        }
      ]
    },
    {
      id: 'new-article',
      label: 'New Article',
      path: '/articles/new',
      icon: <Plus size={20} />
    },
    {
      id: 'settings',
      label: 'Settings',
      path: '/settings',
      icon: <Settings size={20} />
    }
  ];

  // Load user profile
  useEffect(() => {
    const loadUserProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserProfile(user);
      }
    };
    
    loadUserProfile();
  }, []);

  const handleNavigate = (path: string) => {
    navigate(path);
    setIsDrawerOpen(false);
    onNavigate?.(path);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/login');
    setIsDrawerOpen(false);
  };

  // Don't render on desktop
  if (!isMobile) {
    return null;
  }

  return (
    <>
      {/* Mobile Navigation Bar */}
      <div className={`
        flex items-center justify-between p-4 bg-white border-b border-gray-200
        ${className}
      `}>
        {/* Hamburger Menu Button */}
        <button
          onClick={() => setIsDrawerOpen(true)}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          title="Open Menu"
        >
          <Menu size={24} />
        </button>
        
        {/* Logo/Title */}
        <div className="flex-1 text-center">
          <h1 className="text-lg font-semibold text-gray-900">BOFU.ai</h1>
        </div>
        
        {/* Search/Profile Button */}
        <button
          onClick={() => setIsDrawerOpen(true)}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          title="Search"
        >
          <Search size={24} />
        </button>
      </div>

      {/* Mobile Drawer */}
      <MobileDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title="Navigation"
      >
        <div className="flex flex-col h-full">
          {/* User Profile Section */}
          {userProfile && (
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-primary-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-semibold">
                    {userProfile.email?.[0]?.toUpperCase() || 'U'}
                  </span>
                </div>
                <div className="flex-1">
                  <div className="font-medium text-gray-900 truncate">
                    {userProfile.email}
                  </div>
                  <div className="text-sm text-gray-500">
                    User
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Navigation Items */}
          <div className="flex-1">
            {navigationItems.map((item) => (
              <MobileNavItem
                key={item.id}
                item={item}
                isActive={location.pathname === item.path}
                onNavigate={handleNavigate}
              />
            ))}
          </div>
          
          {/* Footer Actions */}
          <div className="border-t border-gray-200">
            <button
              onClick={handleSignOut}
              className="w-full flex items-center space-x-3 p-4 text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut size={20} />
              <span className="font-medium">Sign Out</span>
            </button>
          </div>
        </div>
      </MobileDrawer>
    </>
  );
};

// Mobile Article List Component
interface MobileArticleListProps {
  articles: any[];
  onArticleSelect: (articleId: string) => void;
  onArticleEdit?: (articleId: string) => void;
  className?: string;
  loading?: boolean;
  viewMode?: 'list' | 'grid';
  sortBy?: 'recent' | 'name' | 'status';
  filterBy?: 'all' | 'draft' | 'published';
}

export const MobileArticleList: React.FC<MobileArticleListProps> = ({
  articles,
  onArticleSelect,
  onArticleEdit,
  className = '',
  loading = false,
  viewMode = 'list',
  sortBy = 'recent',
  filterBy = 'all'
}) => {
  const { isMobile } = useMobileDetection();
  const [showFilters, setShowFilters] = useState(false);
  const [selectedViewMode, setSelectedViewMode] = useState(viewMode);

  if (!isMobile) {
    return null;
  }

  const handleSwipeAction = (articleId: string, action: 'edit' | 'share' | 'delete') => {
    switch (action) {
      case 'edit':
        onArticleEdit?.(articleId);
        break;
      case 'share':
        // Implement share functionality
        break;
      case 'delete':
        // Implement delete functionality
        break;
    }
  };

  const renderArticleItem = (article: any) => (
    <div
      key={article.id}
      className="bg-white border-b border-gray-200 last:border-b-0"
    >
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div 
            className="flex-1 cursor-pointer"
            onClick={() => onArticleSelect(article.id)}
          >
            <h3 className="font-medium text-gray-900 line-clamp-2 mb-1">
              {article.title || article.product_name || 'Untitled Article'}
            </h3>
            <p className="text-sm text-gray-500 line-clamp-2 mb-2">
              {article.description || 'No description available'}
            </p>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">
                {new Date(article.updated_at).toLocaleDateString()}
              </span>
              <span className={`
                text-xs px-2 py-1 rounded-full
                ${article.status === 'published' ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-600'}
              `}>
                {article.status || 'draft'}
              </span>
            </div>
          </div>
          
          {/* Actions Menu */}
          <button className="p-2 rounded-full hover:bg-gray-100 ml-2">
            <MoreVertical size={16} />
          </button>
        </div>
      </div>
    </div>
  );

  const renderGridItem = (article: any) => (
    <div
      key={article.id}
      className="bg-white rounded-lg border border-gray-200 p-4 cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => onArticleSelect(article.id)}
    >
      <h3 className="font-medium text-gray-900 line-clamp-2 mb-2">
        {article.title || article.product_name || 'Untitled Article'}
      </h3>
      <p className="text-sm text-gray-500 line-clamp-3 mb-3">
        {article.description || 'No description available'}
      </p>
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-400">
          {new Date(article.updated_at).toLocaleDateString()}
        </span>
        <span className={`
          text-xs px-2 py-1 rounded-full
          ${article.status === 'published' ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-600'}
        `}>
          {article.status || 'draft'}
        </span>
      </div>
    </div>
  );

  return (
    <div className={`${className}`}>
      {/* Mobile Toolbar */}
      <div className="flex items-center justify-between p-4 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setSelectedViewMode(selectedViewMode === 'list' ? 'grid' : 'list')}
            className="p-2 rounded-lg hover:bg-gray-200 transition-colors"
          >
            {selectedViewMode === 'list' ? <Grid size={20} /> : <ListIcon size={20} />}
          </button>
          
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="p-2 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <Filter size={20} />
          </button>
        </div>
        
        <div className="text-sm text-gray-600">
          {articles.length} articles
        </div>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="p-4 bg-gray-50 border-b border-gray-200">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sort by
              </label>
              <select className="w-full p-2 border border-gray-300 rounded-lg">
                <option value="recent">Recent</option>
                <option value="name">Name</option>
                <option value="status">Status</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filter by
              </label>
              <select className="w-full p-2 border border-gray-300 rounded-lg">
                <option value="all">All</option>
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Article List */}
      <div className={`
        ${selectedViewMode === 'grid' 
          ? 'grid grid-cols-1 sm:grid-cols-2 gap-4 p-4' 
          : 'divide-y divide-gray-200'
        }
      `}>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : articles.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No articles found
          </div>
        ) : (
          articles.map(selectedViewMode === 'grid' ? renderGridItem : renderArticleItem)
        )}
      </div>
    </div>
  );
};

// Export hook for mobile navigation state
export const useMobileNavigation = () => {
  const { isMobile } = useMobileDetection();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  
  const openDrawer = () => setIsDrawerOpen(true);
  const closeDrawer = () => setIsDrawerOpen(false);
  const toggleDrawer = () => setIsDrawerOpen(!isDrawerOpen);
  
  return {
    isMobile,
    isDrawerOpen,
    openDrawer,
    closeDrawer,
    toggleDrawer
  };
}; 