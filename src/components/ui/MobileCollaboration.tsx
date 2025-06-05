import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Users, UserCheck, Eye, Edit3, MessageSquare, Clock, 
  Wifi, WifiOff, Signal, SignalHigh, SignalLow, SignalMedium,
  Circle, ChevronDown, ChevronRight, MoreVertical, Bell,
  Share2, Copy, Link2, Settings, Zap, Activity, AlertTriangle
} from 'lucide-react';

import { useMobileDetection, isTouchDevice } from '../../hooks/useMobileDetection';
import { MobileResponsiveModal } from './MobileResponsiveModal';

interface CollaboratorPresence {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  cursor?: {
    x: number;
    y: number;
    selection?: {
      from: number;
      to: number;
    };
  };
  status: 'active' | 'idle' | 'away' | 'offline';
  lastSeen: string;
  currentSection?: string;
  isTyping?: boolean;
  connectionQuality: 'excellent' | 'good' | 'poor' | 'offline';
}

interface CollaborationActivity {
  id: string;
  type: 'edit' | 'comment' | 'join' | 'leave' | 'save';
  user: {
    id: string;
    name: string;
    avatar?: string;
  };
  timestamp: string;
  description: string;
  section?: string;
  metadata?: any;
}

interface MobileCollaborationProps {
  articleId: string;
  collaborators: CollaboratorPresence[];
  activities: CollaborationActivity[];
  currentUserId?: string;
  isConnected: boolean;
  connectionQuality: 'excellent' | 'good' | 'poor' | 'offline';
  onShareArticle?: () => void;
  onManagePermissions?: () => void;
  onNotificationToggle?: (enabled: boolean) => void;
  className?: string;
}

interface MobilePresenceIndicatorProps {
  collaborators: CollaboratorPresence[];
  maxVisible?: number;
  compact?: boolean;
}

interface MobileActivityFeedProps {
  activities: CollaborationActivity[];
  maxItems?: number;
  showTimestamps?: boolean;
}

interface ConnectionStatusProps {
  isConnected: boolean;
  quality: 'excellent' | 'good' | 'poor' | 'offline';
  compact?: boolean;
}

// Mobile Presence Indicator Component
const MobilePresenceIndicator: React.FC<MobilePresenceIndicatorProps> = ({
  collaborators,
  maxVisible = 3,
  compact = false
}) => {
  const activeCollaborators = collaborators.filter(c => c.status !== 'offline');
  const visibleCollaborators = activeCollaborators.slice(0, maxVisible);
  const hiddenCount = Math.max(0, activeCollaborators.length - maxVisible);

  const getStatusColor = (status: CollaboratorPresence['status']) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'idle': return 'bg-yellow-500';
      case 'away': return 'bg-gray-500';
      case 'offline': return 'bg-gray-300';
      default: return 'bg-gray-300';
    }
  };

  const getConnectionIcon = (quality: CollaboratorPresence['connectionQuality']) => {
    switch (quality) {
      case 'excellent': return <SignalHigh size={10} className="text-green-500" />;
      case 'good': return <SignalMedium size={10} className="text-yellow-500" />;
      case 'poor': return <SignalLow size={10} className="text-red-500" />;
      case 'offline': return <WifiOff size={10} className="text-gray-400" />;
      default: return <Signal size={10} className="text-gray-400" />;
    }
  };

  if (compact) {
    return (
      <div className="flex items-center space-x-1">
        <Users size={14} className="text-gray-600" />
        <span className="text-xs text-gray-600">
          {activeCollaborators.length}
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-2">
      <div className="flex -space-x-2">
        {visibleCollaborators.map(collaborator => (
          <div
            key={collaborator.id}
            className="relative group"
            title={`${collaborator.name} (${collaborator.status})`}
          >
            <div className="w-8 h-8 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center overflow-hidden">
              {collaborator.avatar ? (
                <img
                  src={collaborator.avatar}
                  alt={collaborator.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-xs font-medium text-gray-600">
                  {collaborator.name?.[0]?.toUpperCase() || 'U'}
                </span>
              )}
            </div>
            
            {/* Status indicator */}
            <div className={`
              absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border border-white
              ${getStatusColor(collaborator.status)}
            `} />
            
            {/* Connection quality indicator */}
            <div className="absolute top-0 right-0 bg-white rounded-full p-0.5">
              {getConnectionIcon(collaborator.connectionQuality)}
            </div>
            
            {/* Typing indicator */}
            {collaborator.isTyping && (
              <div className="absolute -top-1 -left-1">
                <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse" />
              </div>
            )}
          </div>
        ))}
        
        {hiddenCount > 0 && (
          <div className="w-8 h-8 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center">
            <span className="text-xs font-medium text-gray-600">
              +{hiddenCount}
            </span>
          </div>
        )}
      </div>
      
      <div className="text-xs text-gray-600">
        {activeCollaborators.length === 1 ? '1 person' : `${activeCollaborators.length} people`}
      </div>
    </div>
  );
};

// Connection Status Component
const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  isConnected,
  quality,
  compact = false
}) => {
  const getStatusColor = () => {
    if (!isConnected) return 'text-red-500';
    switch (quality) {
      case 'excellent': return 'text-green-500';
      case 'good': return 'text-yellow-500';
      case 'poor': return 'text-red-500';
      case 'offline': return 'text-gray-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusIcon = () => {
    if (!isConnected) return <WifiOff size={14} />;
    switch (quality) {
      case 'excellent': return <SignalHigh size={14} />;
      case 'good': return <SignalMedium size={14} />;
      case 'poor': return <SignalLow size={14} />;
      case 'offline': return <WifiOff size={14} />;
      default: return <Wifi size={14} />;
    }
  };

  const getStatusText = () => {
    if (!isConnected) return 'Disconnected';
    switch (quality) {
      case 'excellent': return 'Excellent';
      case 'good': return 'Good';
      case 'poor': return 'Poor';
      case 'offline': return 'Offline';
      default: return 'Unknown';
    }
  };

  if (compact) {
    return (
      <div className={`flex items-center space-x-1 ${getStatusColor()}`}>
        {getStatusIcon()}
      </div>
    );
  }

  return (
    <div className={`flex items-center space-x-2 ${getStatusColor()}`}>
      {getStatusIcon()}
      <span className="text-xs font-medium">
        {getStatusText()}
      </span>
    </div>
  );
};

// Mobile Activity Feed Component
const MobileActivityFeed: React.FC<MobileActivityFeedProps> = ({
  activities,
  maxItems = 10,
  showTimestamps = true
}) => {
  const recentActivities = activities.slice(0, maxItems);

  const getActivityIcon = (type: CollaborationActivity['type']) => {
    switch (type) {
      case 'edit': return <Edit3 size={12} className="text-blue-500" />;
      case 'comment': return <MessageSquare size={12} className="text-green-500" />;
      case 'join': return <UserCheck size={12} className="text-green-500" />;
      case 'leave': return <Circle size={12} className="text-gray-500" />;
      case 'save': return <Zap size={12} className="text-purple-500" />;
      default: return <Activity size={12} className="text-gray-500" />;
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="space-y-2">
      {recentActivities.map(activity => (
        <div key={activity.id} className="flex items-start space-x-3 p-2 rounded-lg hover:bg-gray-50">
          <div className="flex-shrink-0 mt-1">
            {getActivityIcon(activity.type)}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-900 truncate">
                {activity.user.name}
              </span>
              {showTimestamps && (
                <span className="text-xs text-gray-500 flex-shrink-0">
                  {formatTime(activity.timestamp)}
                </span>
              )}
            </div>
            
            <p className="text-xs text-gray-600 mt-1">
              {activity.description}
            </p>
            
            {activity.section && (
              <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full mt-1 inline-block">
                {activity.section}
              </span>
            )}
          </div>
        </div>
      ))}
      
      {activities.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <Activity size={32} className="mx-auto mb-2 text-gray-300" />
          <p className="text-sm">No recent activity</p>
        </div>
      )}
    </div>
  );
};

// Main Mobile Collaboration Component
export const MobileCollaboration: React.FC<MobileCollaborationProps> = ({
  articleId,
  collaborators,
  activities,
  currentUserId,
  isConnected,
  connectionQuality,
  onShareArticle,
  onManagePermissions,
  onNotificationToggle,
  className = ''
}) => {
  const { isMobile } = useMobileDetection();
  const [isExpanded, setIsExpanded] = useState(false);
  const [showActivityFeed, setShowActivityFeed] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const activeCollaborators = collaborators.filter(c => c.status !== 'offline');
  const recentActivity = activities.slice(0, 5);

  const handleNotificationToggle = (enabled: boolean) => {
    setNotificationsEnabled(enabled);
    onNotificationToggle?.(enabled);
  };

  const handleShareArticle = () => {
    onShareArticle?.();
  };

  const handleManagePermissions = () => {
    onManagePermissions?.();
  };

  if (!isMobile) {
    return null; // Use desktop collaboration features
  }

  return (
    <div className={`bg-white ${className}`}>
      {/* Compact Collaboration Bar */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <MobilePresenceIndicator 
            collaborators={collaborators} 
            maxVisible={3}
            compact={false}
          />
          
          <ConnectionStatus 
            isConnected={isConnected}
            quality={connectionQuality}
            compact={true}
          />
        </div>
        
        <div className="flex items-center space-x-2">
          {recentActivity.length > 0 && (
            <button
              onClick={() => setShowActivityFeed(true)}
              className="p-2 rounded-lg hover:bg-gray-100 relative"
            >
              <Activity size={16} className="text-gray-600" />
              {recentActivity.length > 0 && (
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {Math.min(recentActivity.length, 9)}
                </div>
              )}
            </button>
          )}
          
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 rounded-lg hover:bg-gray-100"
          >
            {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>
        </div>
      </div>
      
      {/* Expanded Collaboration Panel */}
      {isExpanded && (
        <div className="border-b border-gray-200">
          {/* Collaborators Section */}
          <div className="p-4 border-b border-gray-100">
            <h3 className="text-sm font-medium text-gray-900 mb-3">
              Active Collaborators ({activeCollaborators.length})
            </h3>
            
            <div className="space-y-3">
              {activeCollaborators.map(collaborator => (
                <div key={collaborator.id} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                        {collaborator.avatar ? (
                          <img
                            src={collaborator.avatar}
                            alt={collaborator.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-sm font-medium text-gray-600">
                            {collaborator.name?.[0]?.toUpperCase() || 'U'}
                          </span>
                        )}
                      </div>
                      
                      <div className={`
                        absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border border-white
                        ${collaborator.status === 'active' ? 'bg-green-500' : 
                          collaborator.status === 'idle' ? 'bg-yellow-500' : 'bg-gray-500'}
                      `} />
                    </div>
                    
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {collaborator.name}
                        {collaborator.id === currentUserId && (
                          <span className="text-xs text-gray-500 ml-1">(You)</span>
                        )}
                      </p>
                      <div className="flex items-center space-x-2">
                        <p className="text-xs text-gray-500">
                          {collaborator.currentSection || 'Viewing document'}
                        </p>
                        {collaborator.isTyping && (
                          <span className="text-xs text-blue-600 flex items-center space-x-1">
                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                            <span>typing...</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-1">
                    <ConnectionStatus 
                      isConnected={collaborator.connectionQuality !== 'offline'}
                      quality={collaborator.connectionQuality}
                      compact={true}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Quick Actions */}
          <div className="p-4 border-b border-gray-100">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Quick Actions</h3>
            
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleShareArticle}
                className="flex items-center justify-center space-x-2 p-3 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <Share2 size={16} className="text-gray-600" />
                <span className="text-sm font-medium text-gray-700">Share</span>
              </button>
              
              <button
                onClick={handleManagePermissions}
                className="flex items-center justify-center space-x-2 p-3 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <Settings size={16} className="text-gray-600" />
                <span className="text-sm font-medium text-gray-700">Permissions</span>
              </button>
              
              <button
                onClick={() => setShowActivityFeed(true)}
                className="flex items-center justify-center space-x-2 p-3 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <Activity size={16} className="text-gray-600" />
                <span className="text-sm font-medium text-gray-700">Activity</span>
              </button>
              
              <button
                onClick={() => setShowSettings(true)}
                className="flex items-center justify-center space-x-2 p-3 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <Bell size={16} className="text-gray-600" />
                <span className="text-sm font-medium text-gray-700">Notifications</span>
              </button>
            </div>
          </div>
          
          {/* Connection Status */}
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <ConnectionStatus 
                  isConnected={isConnected}
                  quality={connectionQuality}
                  compact={false}
                />
              </div>
              
              {!isConnected && (
                <button
                  onClick={() => window.location.reload()}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                >
                  Reconnect
                </button>
              )}
            </div>
            
            {connectionQuality === 'poor' && (
              <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start space-x-2">
                <AlertTriangle size={14} className="text-yellow-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-yellow-800 font-medium">Poor Connection</p>
                  <p className="text-xs text-yellow-700">
                    Some features may be limited. Changes will sync when connection improves.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Activity Feed Modal */}
      <MobileResponsiveModal
        isOpen={showActivityFeed}
        onClose={() => setShowActivityFeed(false)}
        title="Recent Activity"
        fullHeight={false}
      >
        <div className="p-4">
          <MobileActivityFeed 
            activities={activities} 
            maxItems={20}
            showTimestamps={true}
          />
        </div>
      </MobileResponsiveModal>
      
      {/* Settings Modal */}
      <MobileResponsiveModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        title="Collaboration Settings"
        fullHeight={false}
      >
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-gray-900">Real-time Notifications</h4>
              <p className="text-xs text-gray-500">Get notified of collaborator actions</p>
            </div>
            <button
              onClick={() => handleNotificationToggle(!notificationsEnabled)}
              className={`
                relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent 
                transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
                ${notificationsEnabled ? 'bg-primary-600' : 'bg-gray-200'}
              `}
            >
              <span
                className={`
                  pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 
                  transition duration-200 ease-in-out
                  ${notificationsEnabled ? 'translate-x-5' : 'translate-x-0'}
                `}
              />
            </button>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-gray-900">Auto-refresh Activity</h4>
              <p className="text-xs text-gray-500">Automatically update activity feed</p>
            </div>
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`
                relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent 
                transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
                ${autoRefresh ? 'bg-primary-600' : 'bg-gray-200'}
              `}
            >
              <span
                className={`
                  pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 
                  transition duration-200 ease-in-out
                  ${autoRefresh ? 'translate-x-5' : 'translate-x-0'}
                `}
              />
            </button>
          </div>
        </div>
      </MobileResponsiveModal>
    </div>
  );
};

// Export hook for mobile collaboration
export const useMobileCollaboration = (articleId: string) => {
  const { isMobile } = useMobileDetection();
  const [collaborators, setCollaborators] = useState<CollaboratorPresence[]>([]);
  const [activities, setActivities] = useState<CollaborationActivity[]>([]);
  const [isConnected, setIsConnected] = useState(true);
  const [connectionQuality, setConnectionQuality] = useState<'excellent' | 'good' | 'poor' | 'offline'>('excellent');

  const addActivity = useCallback((activity: Omit<CollaborationActivity, 'id' | 'timestamp'>) => {
    const newActivity: CollaborationActivity = {
      ...activity,
      id: Date.now().toString(),
      timestamp: new Date().toISOString()
    };
    setActivities(prev => [newActivity, ...prev].slice(0, 100)); // Keep last 100 activities
  }, []);

  const updateCollaboratorPresence = useCallback((collaboratorId: string, updates: Partial<CollaboratorPresence>) => {
    setCollaborators(prev => prev.map(c => 
      c.id === collaboratorId ? { ...c, ...updates } : c
    ));
  }, []);

  return {
    isMobile,
    collaborators,
    activities,
    isConnected,
    connectionQuality,
    addActivity,
    updateCollaboratorPresence,
    setIsConnected,
    setConnectionQuality
  };
}; 