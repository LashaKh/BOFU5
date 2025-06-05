import { supabase } from './supabase';

export interface CollaborativePermissions {
  canEdit: boolean;
  canComment: boolean;
  canViewPresence: boolean;
  canManageCollaboration: boolean;
  isOwner: boolean;
  isAdmin: boolean;
}

export interface ArticlePermissionContext {
  articleId: string;
  userId: string;
  userRole?: 'admin' | 'owner' | 'collaborator' | 'viewer';
}

/**
 * Service for managing collaborative editing permissions
 */
export class CollaborativePermissionService {
  /**
   * Check permissions for a user on a specific article
   */
  static async checkPermissions(context: ArticlePermissionContext): Promise<CollaborativePermissions> {
    try {
      // Get current user info
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return this.getDefaultPermissions(false);
      }

      // Get article information
      const { data: article, error: articleError } = await supabase
        .from('content_briefs')
        .select('user_id, editing_status')
        .eq('id', context.articleId)
        .single();

      if (articleError || !article) {
        console.error('Failed to fetch article:', articleError);
        return this.getDefaultPermissions(false);
      }

      // Check if user is admin
      const isAdmin = await this.isUserAdmin(user.id);
      
      // Check if user is owner
      const isOwner = article.user_id === user.id;

      // Determine permissions based on role and article status
      const permissions: CollaborativePermissions = {
        canEdit: isAdmin || isOwner || this.canUserEdit(article.editing_status, context.userRole),
        canComment: true, // Most users can comment
        canViewPresence: true, // Most users can see who's online
        canManageCollaboration: isAdmin || isOwner,
        isOwner,
        isAdmin
      };

      return permissions;
    } catch (error) {
      console.error('Error checking permissions:', error);
      return this.getDefaultPermissions(false);
    }
  }

  /**
   * Check if user can perform a specific collaborative action
   */
  static async canPerformAction(
    context: ArticlePermissionContext,
    action: 'edit' | 'comment' | 'view_presence' | 'manage_collaboration' | 'cursor_share'
  ): Promise<boolean> {
    const permissions = await this.checkPermissions(context);
    
    switch (action) {
      case 'edit':
        return permissions.canEdit;
      case 'comment':
        return permissions.canComment;
      case 'view_presence':
        return permissions.canViewPresence;
      case 'manage_collaboration':
        return permissions.canManageCollaboration;
      case 'cursor_share':
        return permissions.canEdit; // Only editors can share cursors
      default:
        return false;
    }
  }

  /**
   * Check if user has admin privileges
   */
  private static async isUserAdmin(userId: string): Promise<boolean> {
    try {
      // Check if the user has admin role in user metadata or a separate admin table
      const { data, error } = await supabase
        .from('admin_users')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
        console.error('Error checking admin status:', error);
        return false;
      }

      return !!data;
    } catch (error) {
      console.error('Error checking admin status:', error);
      return false;
    }
  }

  /**
   * Check if user can edit based on article status and role
   */
  private static canUserEdit(
    editingStatus: string,
    userRole?: string
  ): boolean {
    // Define edit permissions based on status
    switch (editingStatus) {
      case 'draft':
        return true; // Anyone can edit drafts (if they have access)
      case 'editing':
        return userRole === 'collaborator' || userRole === 'admin';
      case 'review':
        return userRole === 'admin'; // Only admins can edit during review
      case 'final':
        return false; // No one can edit final articles (except through admin override)
      default:
        return false;
    }
  }

  /**
   * Get default permissions (typically for unauthenticated or unauthorized users)
   */
  private static getDefaultPermissions(isAuthenticated: boolean): CollaborativePermissions {
    return {
      canEdit: false,
      canComment: isAuthenticated,
      canViewPresence: isAuthenticated,
      canManageCollaboration: false,
      isOwner: false,
      isAdmin: false
    };
  }

  /**
   * Validate that a collaborative operation is allowed
   */
  static async validateCollaborativeOperation(
    context: ArticlePermissionContext,
    operation: {
      type: 'cursor_update' | 'presence_update' | 'edit_operation' | 'comment_add';
      metadata?: any;
    }
  ): Promise<{ allowed: boolean; reason?: string }> {
    try {
      const permissions = await this.checkPermissions(context);

      switch (operation.type) {
        case 'cursor_update':
        case 'presence_update':
          if (!permissions.canViewPresence) {
            return { allowed: false, reason: 'Insufficient permissions to share presence' };
          }
          break;
        
        case 'edit_operation':
          if (!permissions.canEdit) {
            return { allowed: false, reason: 'Insufficient permissions to edit this article' };
          }
          break;
        
        case 'comment_add':
          if (!permissions.canComment) {
            return { allowed: false, reason: 'Insufficient permissions to add comments' };
          }
          break;
        
        default:
          return { allowed: false, reason: 'Unknown operation type' };
      }

      return { allowed: true };
    } catch (error) {
      console.error('Error validating operation:', error);
      return { allowed: false, reason: 'Permission validation failed' };
    }
  }

  /**
   * Get user-friendly permission description
   */
  static async getPermissionSummary(context: ArticlePermissionContext): Promise<string> {
    const permissions = await this.checkPermissions(context);
    
    if (permissions.isAdmin) {
      return 'Full admin access';
    } else if (permissions.isOwner) {
      return 'Owner access';
    } else if (permissions.canEdit) {
      return 'Edit access';
    } else if (permissions.canComment) {
      return 'Comment access';
    } else {
      return 'View only access';
    }
  }
}

// Export a singleton instance
export const collaborativePermissions = new CollaborativePermissionService(); 