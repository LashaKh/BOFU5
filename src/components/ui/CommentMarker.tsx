import React, { useRef } from 'react';
import { MessageCircle, CheckCircle, Archive, Clock, AlertCircle } from 'lucide-react';
import { ArticleComment } from '../../lib/commentApi';

interface CommentMarkerProps {
  comment: ArticleComment;
  position: { top: number; left: number; width: number; height: number };
  onClick: (comment: ArticleComment) => void;
}

// Enhanced global interaction state management
const GLOBAL_INTERACTION_KEY = 'commentSystemInteraction';

const setGlobalInteractionState = (isInteracting: boolean) => {
  try {
    sessionStorage.setItem(GLOBAL_INTERACTION_KEY, String(isInteracting));
  } catch (error) {
    console.warn('Could not save interaction state:', error);
  }
};

export const CommentMarker: React.FC<CommentMarkerProps> = ({ comment, position, onClick }) => {
  const markerRef = useRef<HTMLButtonElement>(null);

  const getStatusInfo = () => {
    switch (comment.status) {
      case 'resolved':
        return {
          icon: CheckCircle,
          className: 'bg-green-500 hover:bg-green-600 border-green-400',
          textColor: 'text-white'
        };
      case 'archived':
        return {
          icon: Archive,
          className: 'bg-gray-500 hover:bg-gray-600 border-gray-400',
          textColor: 'text-white'
        };
      default:
        return {
          icon: MessageCircle,
          className: 'bg-blue-500 hover:bg-blue-600 border-blue-400',
          textColor: 'text-white'
        };
    }
  };

  const getStatusBadge = () => {
    const now = Date.now();
    const createdAt = new Date(comment.created_at).getTime();
    const ageInHours = (now - createdAt) / (1000 * 60 * 60);

    if (comment.status === 'resolved') {
      return <CheckCircle className="w-3 h-3 text-green-400" />;
    }
    
    if (comment.status === 'archived') {
      return <Archive className="w-3 h-3 text-gray-400" />;
    }
    
    if (ageInHours > 24) {
      return <AlertCircle className="w-3 h-3 text-orange-400" />;
    }
    
    if (ageInHours < 1) {
      return <Clock className="w-3 h-3 text-blue-400" />;
    }
    
    return null;
  };

  const handleClick = (event: React.MouseEvent) => {
    console.log('🔘 Comment marker clicked:', comment.id);
    
    // Set global interaction state IMMEDIATELY - before any other processing
    setGlobalInteractionState(true);
    
    // Prevent all event propagation and default behavior
    event.preventDefault();
    event.stopPropagation();
    
    // Additional prevention for potential focus events
    if (markerRef.current) {
      markerRef.current.blur();
    }
    
    // Prevent any selection changes by forcing blur on the document
    if (document.activeElement && 'blur' in document.activeElement) {
      (document.activeElement as HTMLElement).blur();
    }
    
    // Call the click handler
    onClick(comment);
    
    // Auto-clear the global state after a delay
    setTimeout(() => {
      setGlobalInteractionState(false);
    }, 1000);
  };

  // Enhanced event handlers to prevent unwanted interactions
  const handleMouseDown = (event: React.MouseEvent) => {
    console.log('🔘 Comment marker mouse down');
    setGlobalInteractionState(true);
    event.preventDefault();
    event.stopPropagation();
  };

  const handleMouseEnter = () => {
    setGlobalInteractionState(true);
  };

  const handleMouseLeave = () => {
    // Use a short delay to prevent rapid state changes
    setTimeout(() => {
      setGlobalInteractionState(false);
    }, 200);
  };

  const { icon: Icon, className, textColor } = getStatusInfo();
  const statusBadge = getStatusBadge();

  return (
    <button
      ref={markerRef}
      onClick={handleClick}
      onMouseDown={handleMouseDown}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`
        relative group flex items-center justify-center 
        w-8 h-8 rounded-full border-2 shadow-lg transition-all duration-200 
        transform hover:scale-110 focus:scale-110 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2
        ${className}
      `}
      style={{
        // Ensure marker is always clickable and visible
        zIndex: 1000,
        pointerEvents: 'auto',
      }}
      title={`Comment: ${comment.content.substring(0, 50)}${comment.content.length > 50 ? '...' : ''} (${comment.status})`}
      // Prevent focus-related issues
      tabIndex={0}
      onFocus={(e) => e.target.blur()} // Immediately blur to prevent focus issues
    >
      <Icon className={`w-4 h-4 ${textColor}`} />
      
      {/* Status badge */}
      {statusBadge && (
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center border border-gray-200 dark:border-gray-600">
          {statusBadge}
        </div>
      )}
      
      {/* Reply count badge */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center border-2 border-white dark:border-gray-800">
          <span className="text-xs font-bold text-white">{comment.replies.length}</span>
        </div>
      )}
      
      {/* Hover tooltip enhancement */}
      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 dark:bg-gray-700 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50 shadow-xl">
        <div className="font-medium">{comment.user?.name || 'Unknown User'}</div>
        <div className="text-gray-300 text-xs">{comment.status} • {new Date(comment.created_at).toLocaleDateString()}</div>
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900 dark:border-t-gray-700"></div>
      </div>
    </button>
  );
}; 