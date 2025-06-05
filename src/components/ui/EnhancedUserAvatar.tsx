import React, { useState } from 'react';
import { PresenceUser } from '../../lib/realtimeCollaboration';
import { cn } from '../../lib/utils';
import { Eye, Edit, Clock, Wifi, WifiOff } from 'lucide-react';

interface EnhancedUserAvatarProps {
  user: PresenceUser;
  size: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showStatus?: boolean;
  showTooltip?: boolean;
  onClick?: (user: PresenceUser) => void;
  className?: string;
  isJoining?: boolean;
  isLeaving?: boolean;
  showConnectionStatus?: boolean;
}

export const EnhancedUserAvatar: React.FC<EnhancedUserAvatarProps> = ({
  user,
  size = 'sm',
  showStatus = true,
  showTooltip = true,
  onClick,
  className = '',
  isJoining = false,
  isLeaving = false,
  showConnectionStatus = false,
}) => {
  const [imageError, setImageError] = useState(false);

  // Size configurations
  const sizeConfig = {
    xs: {
      avatar: 'w-4 h-4 text-xs',
      status: 'w-2 h-2 -bottom-0 -right-0',
      tooltip: 'text-xs px-2 py-1',
    },
    sm: {
      avatar: 'w-6 h-6 text-xs',
      status: 'w-3 h-3 -bottom-0.5 -right-0.5',
      tooltip: 'text-xs px-3 py-2',
    },
    md: {
      avatar: 'w-8 h-8 text-sm',
      status: 'w-3 h-3 -bottom-0.5 -right-0.5',
      tooltip: 'text-sm px-3 py-2',
    },
    lg: {
      avatar: 'w-10 h-10 text-base',
      status: 'w-4 h-4 -bottom-1 -right-1',
      tooltip: 'text-sm px-4 py-3',
    },
    xl: {
      avatar: 'w-12 h-12 text-lg',
      status: 'w-4 h-4 -bottom-1 -right-1',
      tooltip: 'text-base px-4 py-3',
    },
  };

  const config = sizeConfig[size];

  // Status configurations
  const getStatusConfig = (status: PresenceUser['status']) => {
    switch (status) {
      case 'editing':
        return {
          color: 'bg-green-500',
          icon: Edit,
          text: 'Editing',
          pulse: true,
        };
      case 'viewing':
        return {
          color: 'bg-blue-500',
          icon: Eye,
          text: 'Viewing',
          pulse: false,
        };
      case 'idle':
        return {
          color: 'bg-amber-500',
          icon: Clock,
          text: 'Away',
          pulse: false,
        };
      default:
        return {
          color: 'bg-gray-400',
          icon: Eye,
          text: 'Unknown',
          pulse: false,
        };
    }
  };

  const statusConfig = getStatusConfig(user.status);

  // Animation classes
  const animationClasses = cn(
    'transition-all duration-300 ease-in-out',
    isJoining && 'animate-bounce',
    isLeaving && 'animate-pulse opacity-50 scale-75',
    onClick && 'cursor-pointer hover:scale-110 hover:shadow-lg'
  );

  // Generate initials from name or email
  const getInitials = () => {
    const name = user.user_metadata.name || user.user_metadata.email || 'U';
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Generate gradient background for consistent colors
  const getAvatarStyle = () => ({
    backgroundColor: user.user_metadata.color || '#3B82F6',
    borderColor: user.user_metadata.color || '#3B82F6',
  });

  // Format time for tooltip
  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInSeconds = Math.floor((now.getTime() - time.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    return `${Math.floor(diffInSeconds / 3600)}h ago`;
  };

  // Render avatar image or initials
  const renderAvatarContent = () => {
    if (user.user_metadata.avatar_url && !imageError) {
      return (
        <img
          src={user.user_metadata.avatar_url}
          alt={user.user_metadata.name || user.user_metadata.email}
          className={cn(
            'rounded-full border-2 object-cover',
            config.avatar
          )}
          style={{ borderColor: user.user_metadata.color }}
          onError={() => setImageError(true)}
          loading="lazy"
        />
      );
    }

    return (
      <div
        className={cn(
          'rounded-full border-2 flex items-center justify-center text-white font-medium',
          config.avatar
        )}
        style={getAvatarStyle()}
      >
        {getInitials()}
      </div>
    );
  };

  // Render status indicator
  const renderStatusIndicator = () => {
    if (!showStatus) return null;

    const StatusIcon = statusConfig.icon;

    return (
      <div
        className={cn(
          'absolute rounded-full border-2 border-white flex items-center justify-center',
          config.status,
          statusConfig.color,
          statusConfig.pulse && 'animate-pulse'
        )}
        title={statusConfig.text}
      >
        {size === 'lg' || size === 'xl' ? (
          <StatusIcon className="w-2 h-2 text-white" />
        ) : null}
      </div>
    );
  };

  // Render connection status indicator
  const renderConnectionStatus = () => {
    if (!showConnectionStatus) return null;

    const isRecentlyActive = new Date().getTime() - new Date(user.last_heartbeat).getTime() < 30000;
    const ConnectionIcon = isRecentlyActive ? Wifi : WifiOff;

    return (
      <div
        className={cn(
          'absolute -top-1 -left-1 rounded-full bg-white shadow-sm border p-0.5',
          isRecentlyActive ? 'text-green-500' : 'text-red-500'
        )}
        title={isRecentlyActive ? 'Connected' : 'Disconnected'}
      >
        <ConnectionIcon className="w-2 h-2" />
      </div>
    );
  };

  // Render tooltip
  const renderTooltip = () => {
    if (!showTooltip) return null;

    return (
      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
        <div className={cn(
          'bg-gray-900 text-white rounded-lg shadow-lg whitespace-nowrap',
          config.tooltip
        )}>
          {/* User name and email */}
          <div className="font-medium">
            {user.user_metadata.name || user.user_metadata.email}
          </div>
          
          {/* Status and activity */}
          <div className="text-gray-300 flex items-center gap-1 mt-1">
            <statusConfig.icon className="w-3 h-3" />
            <span>{statusConfig.text}</span>
          </div>
          
          {/* Last active time */}
          <div className="text-gray-400 text-xs mt-1">
            Active {formatTimeAgo(user.last_heartbeat)}
          </div>

          {/* Tooltip arrow */}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
        </div>
      </div>
    );
  };

  return (
    <div
      className={cn(
        'relative group',
        animationClasses,
        className
      )}
      onClick={() => onClick?.(user)}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick(user);
        }
      }}
      aria-label={`${user.user_metadata.name || user.user_metadata.email} - ${statusConfig.text}`}
    >
      {/* Main avatar */}
      <div className="relative">
        {renderAvatarContent()}
        {renderStatusIndicator()}
        {renderConnectionStatus()}
      </div>

      {/* Tooltip */}
      {renderTooltip()}
    </div>
  );
};

export default EnhancedUserAvatar; 