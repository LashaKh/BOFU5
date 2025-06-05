import { supabase } from './supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

// Types for real-time collaboration
export interface UserPresence {
  id: string;
  user_id: string;
  article_id: string;
  status: 'viewing' | 'editing' | 'idle';
  cursor_position?: {
    from: number;
    to: number;
    selection?: {
      anchor: number;
      head: number;
    };
  } | null;
  user_metadata: {
    email?: string;
    name?: string;
    avatar_url?: string;
    color?: string; // Assigned color for this user in this session
  };
  last_heartbeat: string;
  joined_at: string;
}

export interface PresenceUser {
  user_id: string;
  status: 'viewing' | 'editing' | 'idle';
  cursor_position?: UserPresence['cursor_position'];
  user_metadata: UserPresence['user_metadata'];
  last_heartbeat: string;
  joined_at: string;
}

export interface RealtimeEdit {
  id: string;
  article_id: string;
  user_id: string;
  operation_type: 'insert' | 'delete' | 'replace' | 'format';
  position: number;
  content?: string;
  length?: number;
  metadata?: any;
  timestamp: string;
}

export class RealtimeCollaborationService {
  private channels: Map<string, RealtimeChannel> = new Map();
  private presenceUpdateInterval: NodeJS.Timeout | null = null;
  private currentArticleId: string | null = null;
  private currentUserId: string | null = null;
  private userColors: Map<string, string> = new Map();
  private onPresenceChangeCallbacks: Array<(presence: PresenceUser[]) => void> = [];
  private onCursorChangeCallbacks: Array<(cursors: Array<{ userId: string; position: any; metadata: any }>) => void> = [];

  // Predefined colors for users
  private readonly USER_COLORS = [
    '#3B82F6', // Blue
    '#EF4444', // Red
    '#10B981', // Green
    '#F59E0B', // Yellow
    '#8B5CF6', // Purple
    '#06B6D4', // Cyan
    '#EC4899', // Pink
    '#84CC16', // Lime
    '#F97316', // Orange
    '#6366F1', // Indigo
  ];

  /**
   * Join an article for real-time collaboration
   */
  async joinArticle(articleId: string, userMetadata?: Partial<UserPresence['user_metadata']>): Promise<void> {
    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('User not authenticated');
      }

      this.currentArticleId = articleId;
      this.currentUserId = user.id;

      // Assign a color to this user
      if (!this.userColors.has(user.id)) {
        const colorIndex = this.userColors.size % this.USER_COLORS.length;
        this.userColors.set(user.id, this.USER_COLORS[colorIndex]);
      }

      // Prepare user metadata
      const fullUserMetadata = {
        email: user.email,
        name: userMetadata?.name || user.user_metadata?.full_name || user.email?.split('@')[0],
        avatar_url: userMetadata?.avatar_url || user.user_metadata?.avatar_url,
        color: this.userColors.get(user.id),
        ...userMetadata,
      };

      // Update presence in database
      await this.updatePresence(articleId, 'viewing', undefined, fullUserMetadata);

      // Subscribe to real-time channel
      await this.subscribeToChannel(articleId);

      // Start heartbeat to maintain presence
      this.startHeartbeat(articleId, fullUserMetadata);

      console.log(`Joined article ${articleId} for real-time collaboration`);
    } catch (error) {
      console.error('Failed to join article:', error);
      throw error;
    }
  }

  /**
   * Leave the current article
   */
  async leaveArticle(): Promise<void> {
    try {
      if (this.currentArticleId) {
        // Remove presence from database
        await this.removePresence(this.currentArticleId);
        
        // Unsubscribe from channel
        this.unsubscribeFromChannel(this.currentArticleId);
        
        // Stop heartbeat
        this.stopHeartbeat();
        
        console.log(`Left article ${this.currentArticleId}`);
        this.currentArticleId = null;
        this.currentUserId = null;
      }
    } catch (error) {
      console.error('Failed to leave article:', error);
    }
  }

  /**
   * Update user presence status
   */
  async updatePresence(
    articleId: string, 
    status: UserPresence['status'], 
    cursorPosition?: UserPresence['cursor_position'],
    userMetadata?: UserPresence['user_metadata']
  ): Promise<void> {
    try {
      const { error } = await supabase.rpc('update_user_presence', {
        p_article_id: articleId,
        p_status: status,
        p_cursor_position: cursorPosition || null,
        p_user_metadata: userMetadata || {},
      });

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Failed to update presence:', error);
      throw error;
    }
  }

  /**
   * Remove user presence
   */
  async removePresence(articleId: string): Promise<void> {
    try {
      const { error } = await supabase.rpc('leave_article', {
        p_article_id: articleId,
      });

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Failed to remove presence:', error);
      throw error;
    }
  }

  /**
   * Get active users for an article
   */
  async getActiveUsers(articleId: string): Promise<PresenceUser[]> {
    try {
      const { data, error } = await supabase.rpc('get_active_users', {
        p_article_id: articleId,
        p_timeout_minutes: 5,
      });

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Failed to get active users:', error);
      return [];
    }
  }

  /**
   * Subscribe to real-time channel for an article
   */
  private async subscribeToChannel(articleId: string): Promise<void> {
    const channelName = `article:${articleId}`;
    
    // Unsubscribe from existing channel if any
    const existingChannel = this.channels.get(channelName);
    if (existingChannel) {
      await supabase.removeChannel(existingChannel);
      this.channels.delete(channelName);
    }

    // Create new channel
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'user_presence',
        filter: `article_id=eq.${articleId}`,
      }, (payload) => {
        this.handlePresenceChange(payload);
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'content_briefs',
        filter: `id=eq.${articleId}`,
      }, (payload) => {
        this.handleContentChange(payload);
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`Subscribed to real-time channel: ${channelName}`);
        } else if (status === 'CHANNEL_ERROR') {
          console.error(`Channel error: ${channelName}`);
        }
      });

    this.channels.set(channelName, channel);
  }

  /**
   * Unsubscribe from real-time channel
   */
  private unsubscribeFromChannel(articleId: string): void {
    const channelName = `article:${articleId}`;
    const channel = this.channels.get(channelName);
    
    if (channel) {
      supabase.removeChannel(channel);
      this.channels.delete(channelName);
      console.log(`Unsubscribed from real-time channel: ${channelName}`);
    }
  }

  /**
   * Handle presence changes from real-time updates
   */
  private async handlePresenceChange(payload: any): Promise<void> {
    try {
      if (this.currentArticleId) {
        const activeUsers = await this.getActiveUsers(this.currentArticleId);
        
        // Notify callbacks about presence changes
        this.onPresenceChangeCallbacks.forEach(callback => {
          callback(activeUsers);
        });

        // Extract cursor positions for cursor change callbacks
        const cursors = activeUsers
          .filter(user => user.cursor_position && user.user_id !== this.currentUserId)
          .map(user => ({
            userId: user.user_id,
            position: user.cursor_position,
            metadata: user.user_metadata,
          }));

        this.onCursorChangeCallbacks.forEach(callback => {
          callback(cursors);
        });
      }
    } catch (error) {
      console.error('Failed to handle presence change:', error);
    }
  }

  /**
   * Handle content changes from real-time updates
   */
  private handleContentChange(payload: any): void {
    // This will be extended in future subtasks for operational transformation
    console.log('Content change detected:', payload);
  }

  /**
   * Start heartbeat to maintain presence
   */
  private startHeartbeat(articleId: string, userMetadata: UserPresence['user_metadata']): void {
    this.stopHeartbeat(); // Clear any existing heartbeat
    
    this.presenceUpdateInterval = setInterval(async () => {
      try {
        if (this.currentArticleId === articleId) {
          await this.updatePresence(articleId, 'viewing', undefined, userMetadata);
        }
      } catch (error) {
        console.error('Heartbeat failed:', error);
      }
    }, 30000); // Update every 30 seconds
  }

  /**
   * Stop heartbeat
   */
  private stopHeartbeat(): void {
    if (this.presenceUpdateInterval) {
      clearInterval(this.presenceUpdateInterval);
      this.presenceUpdateInterval = null;
    }
  }

  /**
   * Update cursor position
   */
  async updateCursorPosition(cursorPosition: UserPresence['cursor_position']): Promise<void> {
    if (this.currentArticleId && this.currentUserId) {
      try {
        const userMetadata = this.getUserMetadata();
        await this.updatePresence(this.currentArticleId, 'editing', cursorPosition, userMetadata);
      } catch (error) {
        console.error('Failed to update cursor position:', error);
      }
    }
  }

  /**
   * Get current user metadata
   */
  private getUserMetadata(): UserPresence['user_metadata'] {
    return {
      color: this.userColors.get(this.currentUserId || '') || this.USER_COLORS[0],
    };
  }

  /**
   * Subscribe to presence changes
   */
  onPresenceChange(callback: (presence: PresenceUser[]) => void): () => void {
    this.onPresenceChangeCallbacks.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.onPresenceChangeCallbacks.indexOf(callback);
      if (index > -1) {
        this.onPresenceChangeCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Subscribe to cursor changes
   */
  onCursorChange(callback: (cursors: Array<{ userId: string; position: any; metadata: any }>) => void): () => void {
    this.onCursorChangeCallbacks.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.onCursorChangeCallbacks.indexOf(callback);
      if (index > -1) {
        this.onCursorChangeCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Get current article ID
   */
  getCurrentArticleId(): string | null {
    return this.currentArticleId;
  }

  /**
   * Get current user ID
   */
  getCurrentUserId(): string | null {
    return this.currentUserId;
  }

  /**
   * Cleanup all subscriptions and intervals
   */
  cleanup(): void {
    this.leaveArticle();
    this.onPresenceChangeCallbacks = [];
    this.onCursorChangeCallbacks = [];
  }
}

// Export a singleton instance
export const realtimeCollaboration = new RealtimeCollaborationService(); 