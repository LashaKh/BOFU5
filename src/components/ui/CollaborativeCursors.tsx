import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Bell, Edit3, AlertCircle, Clock, User, X, Eye, UserCheck, Navigation, Pause, Play } from 'lucide-react';
import { realtimeCollaboration } from '../../lib/realtimeCollaboration';
import type { UserPresence, PresenceUser } from '../../lib/realtimeCollaboration';
import { cn } from '../../lib/utils';

interface CollaborativeCursorsProps {
  articleId: string;
  editorRef: React.RefObject<HTMLDivElement>;
  className?: string;
  showNotifications?: boolean;
  onCursorActivity?: (userId: string, activity: CursorActivity) => void;
  enableFollowMode?: boolean;
  enableSmoothCursors?: boolean;
}

export interface CursorPosition {
  x: number;
  y: number;
  selection?: {
    anchor: number;
    head: number;
  };
  element?: string; // Element identifier for precise positioning
  viewport?: {
    scrollTop: number;
    scrollLeft: number;
    zoom?: number;
  };
}

// Enhanced cursor state for smooth interpolation
interface SmoothCursor extends CursorPosition {
  user: PresenceUser;
  targetPosition: { x: number; y: number };
  displayPosition: { x: number; y: number };
  isMoving: boolean;
  lastUpdate: number;
  velocity: { x: number; y: number };
  trail: Array<{ x: number; y: number; timestamp: number }>;
}

export interface CursorActivity {
  type: 'cursor_move' | 'selection_change' | 'typing' | 'idle' | 'follow_started' | 'follow_stopped';
  timestamp: string;
  position?: CursorPosition;
  content?: string; // For typing activity
  followedUserId?: string; // For follow mode activities
}

export interface EditNotification {
  id: string;
  userId: string;
  userName: string;
  userColor: string;
  type: 'insert' | 'delete' | 'format' | 'major_change';
  message: string;
  timestamp: string;
  position?: CursorPosition;
}

// Follow mode state
interface FollowModeState {
  isFollowing: boolean;
  followedUserId: string | null;
  followedUserName: string | null;
  isAutoScrolling: boolean;
  lastFollowSync: number;
}

const CURSOR_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57',
  '#FF9FF3', '#54A0FF', '#5F27CD', '#00D2D3', '#FF9F43'
];

// Animation and performance constants
const CURSOR_SMOOTHING_FACTOR = 0.15;
const CURSOR_UPDATE_THROTTLE = 100; // ms
const FOLLOW_MODE_DEBOUNCE = 500; // ms
const CURSOR_TRAIL_LENGTH = 8;
const CURSOR_TRAIL_FADE_TIME = 1000; // ms

export const CollaborativeCursors: React.FC<CollaborativeCursorsProps> = ({
  articleId,
  editorRef,
  className = '',
  showNotifications = true,
  onCursorActivity,
  enableFollowMode = true,
  enableSmoothCursors = true,
}) => {
  const [cursors, setCursors] = useState<Map<string, SmoothCursor>>(new Map());
  const [notifications, setNotifications] = useState<EditNotification[]>([]);
  const [isThrottling, setIsThrottling] = useState(false);
  const [followMode, setFollowMode] = useState<FollowModeState>({
    isFollowing: false,
    followedUserId: null,
    followedUserName: null,
    isAutoScrolling: false,
    lastFollowSync: 0,
  });
  const [showFollowUI, setShowFollowUI] = useState(false);

  const throttleRef = useRef<NodeJS.Timeout>();
  const animationFrameRef = useRef<number>();
  const followDebounceRef = useRef<NodeJS.Timeout>();
  const notificationTimeoutRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const lastCursorUpdate = useRef<Map<string, number>>(new Map());

  // Linear interpolation function for smooth cursor movement
  const lerpPosition = useCallback((current: { x: number; y: number }, target: { x: number; y: number }, factor: number) => {
    return {
      x: current.x + (target.x - current.x) * factor,
      y: current.y + (target.y - current.y) * factor,
    };
  }, []);

  // Calculate cursor velocity for trail effects
  const calculateVelocity = useCallback((prev: { x: number; y: number }, current: { x: number; y: number }, deltaTime: number) => {
    if (deltaTime === 0) return { x: 0, y: 0 };
    return {
      x: (current.x - prev.x) / deltaTime,
      y: (current.y - prev.y) / deltaTime,
    };
  }, []);

  // Animation loop for smooth cursor movement
  const animateCursors = useCallback(() => {
    if (!enableSmoothCursors) return;

    setCursors(prev => {
      const newCursors = new Map(prev);
      let hasMovingCursors = false;

      newCursors.forEach((cursor, userId) => {
        if (cursor.isMoving) {
          const newDisplayPosition = lerpPosition(
            cursor.displayPosition,
            cursor.targetPosition,
            CURSOR_SMOOTHING_FACTOR
          );

          // Check if cursor has reached target (within 1px)
          const distance = Math.sqrt(
            Math.pow(newDisplayPosition.x - cursor.targetPosition.x, 2) +
            Math.pow(newDisplayPosition.y - cursor.targetPosition.y, 2)
          );

          if (distance < 1) {
            cursor.isMoving = false;
            cursor.displayPosition = cursor.targetPosition;
          } else {
            cursor.displayPosition = newDisplayPosition;
            hasMovingCursors = true;
          }

          // Update cursor trail
          const now = Date.now();
          cursor.trail = cursor.trail
            .filter(point => now - point.timestamp < CURSOR_TRAIL_FADE_TIME)
            .slice(-CURSOR_TRAIL_LENGTH);

          if (cursor.isMoving) {
            cursor.trail.push({
              x: cursor.displayPosition.x,
              y: cursor.displayPosition.y,
              timestamp: now,
            });
          }
        }
      });

      return newCursors;
    });

    // Continue animation if there are moving cursors
    animationFrameRef.current = requestAnimationFrame(animateCursors);
  }, [enableSmoothCursors, lerpPosition]);

  // Start animation loop
  useEffect(() => {
    if (enableSmoothCursors) {
      animationFrameRef.current = requestAnimationFrame(animateCursors);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [animateCursors, enableSmoothCursors]);

  // Enhanced cursor tracking and throttling
  const updateCursorPosition = useCallback((userId: string, position: CursorPosition, user: PresenceUser) => {
    const now = Date.now();
    const lastUpdate = lastCursorUpdate.current.get(userId) || 0;

    setCursors(prev => {
      const newCursors = new Map(prev);
      const existingCursor = newCursors.get(userId);

      if (existingCursor) {
        // Calculate velocity for trail effects
        const deltaTime = now - existingCursor.lastUpdate;
        const velocity = calculateVelocity(
          existingCursor.displayPosition,
          { x: position.x, y: position.y },
          deltaTime
        );

        // Update cursor with smooth interpolation target
        const updatedCursor: SmoothCursor = {
          ...existingCursor,
          ...position,
          targetPosition: { x: position.x, y: position.y },
          isMoving: enableSmoothCursors && (
            Math.abs(position.x - existingCursor.displayPosition.x) > 1 ||
            Math.abs(position.y - existingCursor.displayPosition.y) > 1
          ),
          lastUpdate: now,
          velocity,
          user,
        };

        newCursors.set(userId, updatedCursor);
      } else {
        // New cursor
        const newCursor: SmoothCursor = {
          ...position,
          user,
          targetPosition: { x: position.x, y: position.y },
          displayPosition: { x: position.x, y: position.y },
          isMoving: false,
          lastUpdate: now,
          velocity: { x: 0, y: 0 },
          trail: [],
        };

        newCursors.set(userId, newCursor);
      }

      return newCursors;
    });

    lastCursorUpdate.current.set(userId, now);

    // Trigger cursor activity callback
    onCursorActivity?.(userId, {
      type: 'cursor_move',
      timestamp: new Date().toISOString(),
      position
    });

    // Handle follow mode viewport sync
    if (followMode.isFollowing && followMode.followedUserId === userId && position.viewport) {
      handleFollowModeSync(position.viewport);
    }
  }, [onCursorActivity, followMode, enableSmoothCursors, calculateVelocity]);

  // Follow mode viewport synchronization
  const handleFollowModeSync = useCallback((viewport: CursorPosition['viewport']) => {
    if (!viewport || !editorRef.current || followMode.isAutoScrolling) return;

    const now = Date.now();
    if (now - followMode.lastFollowSync < FOLLOW_MODE_DEBOUNCE) return;

    setFollowMode(prev => ({ ...prev, isAutoScrolling: true, lastFollowSync: now }));

    // Clear existing debounce
    if (followDebounceRef.current) {
      clearTimeout(followDebounceRef.current);
    }

    // Debounced smooth scroll to followed user's viewport
    followDebounceRef.current = setTimeout(() => {
      if (editorRef.current && followMode.isFollowing) {
        editorRef.current.scrollTo({
          top: viewport.scrollTop,
          left: viewport.scrollLeft,
          behavior: 'smooth'
        });

        // Reset auto-scrolling flag after scroll completes
        setTimeout(() => {
          setFollowMode(prev => ({ ...prev, isAutoScrolling: false }));
        }, 500);
      }
    }, FOLLOW_MODE_DEBOUNCE);
  }, [followMode, editorRef]);

  // Toggle follow mode for a specific user
  const toggleFollowMode = useCallback((user: PresenceUser) => {
    const isCurrentlyFollowing = followMode.followedUserId === user.user_id;

    if (isCurrentlyFollowing) {
      // Stop following
      setFollowMode({
        isFollowing: false,
        followedUserId: null,
        followedUserName: null,
        isAutoScrolling: false,
        lastFollowSync: 0,
      });

      onCursorActivity?.('self', {
        type: 'follow_stopped',
        timestamp: new Date().toISOString(),
        followedUserId: user.user_id,
      });
    } else {
      // Start following
      setFollowMode({
        isFollowing: true,
        followedUserId: user.user_id,
        followedUserName: user.user_metadata.name || user.user_metadata.email || 'Unknown User',
        isAutoScrolling: false,
        lastFollowSync: 0,
      });

      onCursorActivity?.('self', {
        type: 'follow_started',
        timestamp: new Date().toISOString(),
        followedUserId: user.user_id,
      });

      // Immediately sync to followed user's viewport if available
      const followedCursor = cursors.get(user.user_id);
      if (followedCursor?.viewport) {
        handleFollowModeSync(followedCursor.viewport);
      }
    }
  }, [followMode, onCursorActivity, cursors, handleFollowModeSync]);

  // Disable follow mode on local user interaction
  useEffect(() => {
    const handleUserInteraction = () => {
      if (followMode.isFollowing && !followMode.isAutoScrolling) {
        setFollowMode(prev => ({
          ...prev,
          isFollowing: false,
          followedUserId: null,
          followedUserName: null,
        }));

        onCursorActivity?.('self', {
          type: 'follow_stopped',
          timestamp: new Date().toISOString(),
          followedUserId: followMode.followedUserId || '',
        });
      }
    };

    // Add interaction listeners
    const events = ['mousedown', 'keydown', 'wheel', 'touchstart'];
    events.forEach(event => {
      document.addEventListener(event, handleUserInteraction, { passive: true });
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleUserInteraction);
      });
    };
  }, [followMode, onCursorActivity]);

  // Convert DOM position to cursor position
  const getDOMCursorPosition = useCallback((): CursorPosition | null => {
    if (!editorRef.current) return null;

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return null;

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    const editorRect = editorRef.current.getBoundingClientRect();

    return {
      x: rect.left - editorRect.left,
      y: rect.top - editorRect.top,
      selection: {
        anchor: selection.anchorOffset,
        head: selection.focusOffset
      },
      element: range.startContainer.parentElement?.tagName || 'p'
    };
  }, [editorRef]);

  // Track selection changes
  useEffect(() => {
    const handleSelectionChange = () => {
      const position = getDOMCursorPosition();
      if (position) {
        const currentUserId = realtimeCollaboration.getCurrentUserId();
        if (currentUserId) {
          // Create a minimal user object for the current user
          const currentUser: PresenceUser = {
            user_id: currentUserId,
            status: 'editing',
            cursor_position: null,
            user_metadata: {
              email: '',
              name: 'Current User',
              color: '#3B82F6'
            },
            last_heartbeat: new Date().toISOString(),
            joined_at: new Date().toISOString()
          };
          updateCursorPosition(currentUserId, position, currentUser);
        }
      }
    };

    const handleMouseUp = () => {
      const position = getDOMCursorPosition();
      if (position) {
        const currentUserId = realtimeCollaboration.getCurrentUserId();
        if (currentUserId) {
          const currentUser: PresenceUser = {
            user_id: currentUserId,
            status: 'editing',
            cursor_position: null,
            user_metadata: {
              email: '',
              name: 'Current User',
              color: '#3B82F6'
            },
            last_heartbeat: new Date().toISOString(),
            joined_at: new Date().toISOString()
          };
          updateCursorPosition(currentUserId, position, currentUser);
          onCursorActivity?.(currentUserId, {
            type: 'selection_change',
            timestamp: new Date().toISOString(),
            position
          });
        }
      }
    };

    const handleKeyUp = () => {
      const position = getDOMCursorPosition();
      if (position) {
        const currentUserId = realtimeCollaboration.getCurrentUserId();
        if (currentUserId) {
          const currentUser: PresenceUser = {
            user_id: currentUserId,
            status: 'editing',
            cursor_position: null,
            user_metadata: {
              email: '',
              name: 'Current User',
              color: '#3B82F6'
            },
            last_heartbeat: new Date().toISOString(),
            joined_at: new Date().toISOString()
          };
          updateCursorPosition(currentUserId, position, currentUser);
          onCursorActivity?.(currentUserId, {
            type: 'typing',
            timestamp: new Date().toISOString(),
            position
          });
        }
      }
    };

    // Add event listeners
    document.addEventListener('selectionchange', handleSelectionChange);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('keyup', handleKeyUp);

    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('keyup', handleKeyUp);
      
      // Clear throttle timeout
      if (throttleRef.current) {
        clearTimeout(throttleRef.current);
      }
    };
  }, [updateCursorPosition, getDOMCursorPosition, onCursorActivity]);

  // Listen for presence changes
  useEffect(() => {
    const handlePresenceChange = (users: PresenceUser[]) => {
      setCursors(prev => {
        const newCursors = new Map();
        
        users.forEach(user => {
          if (user.cursor_position && user.user_id !== realtimeCollaboration.getCurrentUserId()) {
            newCursors.set(user.user_id, {
              ...user.cursor_position,
              user
            });
          }
        });

        return newCursors;
      });
    };

    // Subscribe to presence changes
    realtimeCollaboration.onPresenceChange(handlePresenceChange);

    return () => {
      // Cleanup would depend on the realtimeCollaboration implementation
    };
  }, []);

  // Generate edit notifications
  const generateEditNotification = useCallback((userId: string, user: PresenceUser, type: EditNotification['type'], details?: string) => {
    const notification: EditNotification = {
      id: `${userId}-${Date.now()}`,
      userId,
      userName: user.user_metadata?.name || user.user_metadata?.email || 'Anonymous',
      userColor: CURSOR_COLORS[parseInt(userId.slice(-1), 16) % CURSOR_COLORS.length],
      type,
      message: details || getDefaultMessage(type, user.user_metadata?.name || 'Someone'),
      timestamp: new Date().toISOString()
    };

    setNotifications(prev => [notification, ...prev.slice(0, 4)]); // Keep only 5 most recent

    // Auto-remove notification after 5 seconds
    const timeoutId = setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== notification.id));
    }, 5000);

    notificationTimeoutRef.current.set(notification.id, timeoutId);
  }, []);

  // Default notification messages
  const getDefaultMessage = (type: EditNotification['type'], userName: string): string => {
    switch (type) {
      case 'insert':
        return `${userName} added content`;
      case 'delete':
        return `${userName} removed content`;
      case 'format':
        return `${userName} applied formatting`;
      case 'major_change':
        return `${userName} made significant changes`;
      default:
        return `${userName} is editing`;
    }
  };

  // Remove notification
  const removeNotification = useCallback((notificationId: string) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
    
    const timeoutId = notificationTimeoutRef.current.get(notificationId);
    if (timeoutId) {
      clearTimeout(timeoutId);
      notificationTimeoutRef.current.delete(notificationId);
    }
  }, []);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      notificationTimeoutRef.current.forEach(timeout => clearTimeout(timeout));
      notificationTimeoutRef.current.clear();
    };
  }, []);

  // Time formatting helper
  const formatTime = (timestamp: string): string => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now.getTime() - time.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    
    if (diffSeconds < 60) return `${diffSeconds}s ago`;
    if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
    return time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={`relative ${className}`}>
      {/* Follow Mode Banner */}
      {followMode.isFollowing && (
        <div className="fixed top-16 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 flex items-center space-x-2">
          <Navigation className="w-4 h-4" />
          <span className="text-sm font-medium">
            Following {followMode.followedUserName}
          </span>
          <button
            onClick={() => toggleFollowMode({ 
              user_id: followMode.followedUserId!, 
              user_metadata: { name: followMode.followedUserName! } 
            } as PresenceUser)}
            className="text-white hover:text-gray-200 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Enhanced Collaborative Cursors with Smooth Animation */}
      {Array.from(cursors.entries()).map(([userId, cursor]) => (
        <div key={userId}>
          {/* Cursor Trail */}
          {enableSmoothCursors && cursor.trail.length > 0 && cursor.trail.map((point, index) => {
            const age = Date.now() - point.timestamp;
            const opacity = Math.max(0, 1 - (age / CURSOR_TRAIL_FADE_TIME));
            const scale = 0.5 + (0.5 * opacity);
            
            return (
              <div
                key={`trail-${index}`}
                className="absolute pointer-events-none z-40"
                style={{
                  left: point.x,
                  top: point.y,
                  transform: `translate(-1px, -1px) scale(${scale})`,
                  opacity: opacity * 0.3,
                }}
              >
                <div
                  className="w-1 h-3 rounded-full"
                  style={{ 
                    backgroundColor: CURSOR_COLORS[parseInt(userId.slice(-1), 16) % CURSOR_COLORS.length]
                  }}
                />
              </div>
            );
          })}

          {/* Main Cursor */}
          <div
            className="absolute pointer-events-none z-50 transition-all duration-100"
            style={{
              left: enableSmoothCursors ? cursor.displayPosition.x : cursor.x,
              top: enableSmoothCursors ? cursor.displayPosition.y : cursor.y,
              transform: 'translate(-1px, -1px)'
            }}
          >
            {/* Cursor Line with Enhanced Animation */}
            <div
              className={cn(
                "w-0.5 h-5 relative",
                cursor.isMoving && enableSmoothCursors ? "animate-pulse" : "",
                cursor.user.status === 'editing' ? "animate-pulse" : ""
              )}
              style={{ 
                backgroundColor: CURSOR_COLORS[parseInt(userId.slice(-1), 16) % CURSOR_COLORS.length],
                boxShadow: cursor.user.status === 'editing' ? `0 0 8px ${CURSOR_COLORS[parseInt(userId.slice(-1), 16) % CURSOR_COLORS.length]}` : 'none'
              }}
            >
              {/* Focus Ring for Active Editing */}
              {cursor.user.status === 'editing' && (
                <div
                  className="absolute -inset-1 rounded-full animate-ping"
                  style={{ 
                    backgroundColor: CURSOR_COLORS[parseInt(userId.slice(-1), 16) % CURSOR_COLORS.length],
                    opacity: 0.3
                  }}
                />
              )}
            </div>
            
            {/* Enhanced User Badge with Avatar */}
            <div
              className="absolute -top-8 left-0 flex items-center space-x-1 px-2 py-1 rounded-md text-xs text-white font-medium whitespace-nowrap shadow-lg"
              style={{ 
                backgroundColor: CURSOR_COLORS[parseInt(userId.slice(-1), 16) % CURSOR_COLORS.length]
              }}
            >
              {/* Mini Avatar */}
              <div className="w-4 h-4 rounded-full bg-white bg-opacity-20 flex items-center justify-center text-xs">
                {cursor.user.user_metadata?.name?.[0] || cursor.user.user_metadata?.email?.[0] || 'A'}
              </div>
              
              {/* User Name and Status */}
              <span className="max-w-24 truncate">
                {cursor.user.user_metadata?.name || cursor.user.user_metadata?.email || 'Anonymous'}
              </span>
              
              {/* Status Icon */}
              {cursor.user.status === 'editing' && <Edit3 className="w-3 h-3" />}
              {cursor.user.status === 'viewing' && <Eye className="w-3 h-3" />}
              
              {/* Follow Button */}
              {enableFollowMode && (
                <button
                  onClick={() => toggleFollowMode(cursor.user)}
                  className={cn(
                    "p-0.5 rounded text-white hover:bg-white hover:bg-opacity-20 transition-colors",
                    followMode.followedUserId === userId && "bg-white bg-opacity-30"
                  )}
                  title={followMode.followedUserId === userId ? "Stop following" : "Follow this user"}
                  style={{ pointerEvents: 'auto' }}
                >
                  <UserCheck className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Enhanced Selection Highlight */}
            {cursor.selection && cursor.selection.anchor !== cursor.selection.head && (
              <div
                className="absolute opacity-20 pointer-events-none rounded"
                style={{
                  backgroundColor: CURSOR_COLORS[parseInt(userId.slice(-1), 16) % CURSOR_COLORS.length],
                  left: Math.min(cursor.selection.anchor, cursor.selection.head) * 8,
                  width: Math.abs(cursor.selection.head - cursor.selection.anchor) * 8,
                  height: '1.5rem',
                  top: 0,
                  border: `1px solid ${CURSOR_COLORS[parseInt(userId.slice(-1), 16) % CURSOR_COLORS.length]}`,
                }}
              />
            )}

            {/* Velocity Indicator for Fast Movement */}
            {enableSmoothCursors && cursor.velocity && (Math.abs(cursor.velocity.x) > 100 || Math.abs(cursor.velocity.y) > 100) && (
              <div
                className="absolute -right-2 -top-2 w-2 h-2 rounded-full animate-ping"
                style={{ 
                  backgroundColor: CURSOR_COLORS[parseInt(userId.slice(-1), 16) % CURSOR_COLORS.length]
                }}
              />
            )}
          </div>
        </div>
      ))}

      {/* Edit Notifications */}
      {showNotifications && notifications.length > 0 && (
        <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 animate-slide-in-right"
              style={{ borderLeftColor: notification.userColor, borderLeftWidth: '4px' }}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-2 flex-1">
                  <div
                    className="w-2 h-2 rounded-full mt-2"
                    style={{ backgroundColor: notification.userColor }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-1">
                      {notification.type === 'insert' && <Edit3 className="w-3 h-3 text-green-500" />}
                      {notification.type === 'delete' && <X className="w-3 h-3 text-red-500" />}
                      {notification.type === 'format' && <Bell className="w-3 h-3 text-blue-500" />}
                      {notification.type === 'major_change' && <AlertCircle className="w-3 h-3 text-orange-500" />}
                      <span className="text-sm font-medium text-gray-900 truncate">
                        {notification.message}
                      </span>
                    </div>
                    <div className="flex items-center space-x-1 mt-1">
                      <Clock className="w-3 h-3 text-gray-400" />
                      <span className="text-xs text-gray-500">
                        {formatTime(notification.timestamp)}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => removeNotification(notification.id)}
                  className="text-gray-400 hover:text-gray-600 p-1"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Enhanced Cursor Activity Indicator */}
      {cursors.size > 0 && (
        <div className="fixed bottom-4 left-4 bg-white border border-gray-200 rounded-lg shadow-lg p-3 z-50">
          <div className="flex items-center space-x-3">
            {/* Avatar Stack */}
            <div className="flex -space-x-1">
              {Array.from(cursors.values()).slice(0, 3).map((cursor, index) => (
                <div
                  key={index}
                  className={cn(
                    "w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-xs font-medium text-white relative",
                    cursor.user.status === 'editing' && "ring-2 ring-green-400 ring-offset-1"
                  )}
                  style={{ 
                    backgroundColor: CURSOR_COLORS[parseInt(cursor.user.user_id.slice(-1), 16) % CURSOR_COLORS.length]
                  }}
                  title={`${cursor.user.user_metadata?.name || 'Anonymous'} - ${cursor.user.status}`}
                >
                  {cursor.user.user_metadata?.name?.[0] || cursor.user.user_metadata?.email?.[0] || 'A'}
                  {cursor.user.status === 'editing' && (
                    <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-green-500 rounded-full border border-white" />
                  )}
                </div>
              ))}
              {cursors.size > 3 && (
                <div className="w-6 h-6 rounded-full border-2 border-white bg-gray-400 flex items-center justify-center text-xs font-medium text-white">
                  +{cursors.size - 3}
                </div>
              )}
            </div>
            
            {/* Activity Summary */}
            <div className="text-xs text-gray-600">
              <div className="font-medium">
                {cursors.size} collaborator{cursors.size !== 1 ? 's' : ''}
              </div>
              <div className="text-gray-500">
                {Array.from(cursors.values()).filter(c => c.user.status === 'editing').length} editing
              </div>
            </div>

            {/* Follow Mode Toggle */}
            {enableFollowMode && cursors.size > 0 && (
              <div className="border-l border-gray-200 pl-3">
                <button
                  onClick={() => setShowFollowUI(!showFollowUI)}
                  className={cn(
                    "p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors",
                    showFollowUI && "text-blue-600 bg-blue-50"
                  )}
                  title="Follow mode options"
                >
                  <Navigation className="w-4 h-4" />
                </button>
                
                {showFollowUI && (
                  <div className="absolute bottom-full left-0 mb-2 bg-white border border-gray-200 rounded-lg shadow-lg p-2 min-w-40">
                    <div className="text-xs font-medium text-gray-700 mb-2">Follow a user:</div>
                    {Array.from(cursors.values()).map((cursor) => (
                      <button
                        key={cursor.user.user_id}
                        onClick={() => {
                          toggleFollowMode(cursor.user);
                          setShowFollowUI(false);
                        }}
                        className={cn(
                          "flex items-center space-x-2 w-full p-2 text-xs rounded hover:bg-gray-50 transition-colors",
                          followMode.followedUserId === cursor.user.user_id && "bg-blue-50 text-blue-700"
                        )}
                      >
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: CURSOR_COLORS[parseInt(cursor.user.user_id.slice(-1), 16) % CURSOR_COLORS.length] }}
                        />
                        <span className="truncate flex-1">
                          {cursor.user.user_metadata?.name || cursor.user.user_metadata?.email || 'Anonymous'}
                        </span>
                        {followMode.followedUserId === cursor.user.user_id && (
                          <UserCheck className="w-3 h-3" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Enhanced CSS Animation Styles */}
      <style>{`
        @keyframes slide-in-right {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        
        .animate-slide-in-right {
          animation: slide-in-right 0.3s ease-out;
        }

        @keyframes cursor-pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.7;
          }
        }

        .cursor-pulse {
          animation: cursor-pulse 1s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default CollaborativeCursors; 