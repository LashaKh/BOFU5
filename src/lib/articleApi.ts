import { supabase } from './supabase';
import { createVersionHistory } from './versionHistoryApi';
import { toast } from 'react-hot-toast';
import { auditLogger } from './auditLogger';
import { deleteAllCommentsForArticle } from './commentApi';

export interface ArticleContent {
  id: string;
  title: string;
  content: string;
  editing_status: 'draft' | 'editing' | 'review' | 'final' | 'published';
  last_edited_at: string;
  last_edited_by: string;
  article_version: number;
  user_id: string;
  product_name?: string;
  created_at: string;
  updated_at: string;
  google_doc_url?: string;
}

export interface ArticleSaveResult {
  success: boolean;
  data?: ArticleContent;
  error?: string;
}

export interface ArticleLoadResult {
  success: boolean;
  data?: ArticleContent;
  error?: string;
}

/**
 * Load article content by ID
 */
export async function loadArticleContent(articleId: string): Promise<ArticleLoadResult> {
  try {
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return {
        success: false,
        error: 'User not authenticated'
      };
    }

    // Fetch article content from content_briefs table
    const { data, error } = await supabase
      .from('content_briefs')
      .select(`
        id,
        product_name,
        article_content,
        editing_status,
        last_edited_at,
        last_edited_by,
        article_version,
        user_id,
        created_at,
        updated_at,
        google_doc_url
      `)
      .eq('id', articleId)
      .single();

    if (error) {
      console.error('Error loading article content:', error);
      return {
        success: false,
        error: `Failed to load article: ${error.message}`
      };
    }

    if (!data) {
      return {
        success: false,
        error: 'Article not found'
      };
    }

    return {
      success: true,
      data: {
        id: data.id,
        title: data.product_name || 'Untitled', // Map product_name to title
        content: data.article_content || '', // Map article_content to content
        editing_status: (data.editing_status as ArticleContent['editing_status']) || 'draft',
        last_edited_at: data.last_edited_at || data.updated_at,
        last_edited_by: data.last_edited_by || user.id,
        article_version: data.article_version || 1,
        user_id: data.user_id,
        product_name: data.product_name,
        created_at: data.created_at,
        updated_at: data.updated_at,
        google_doc_url: data.google_doc_url
      }
    };

  } catch (error) {
    console.error('Unexpected error loading article:', error);
    return {
      success: false,
      error: 'Unexpected error occurred while loading article'
    };
  }
}

/**
 * Save article content with version tracking and user attribution
 */
export async function saveArticleContent(
  articleId: string, 
  content: string,
  editingStatus: ArticleContent['editing_status'] = 'editing'
): Promise<ArticleSaveResult> {
  try {
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return {
        success: false,
        error: 'User not authenticated'
      };
    }

    console.log('💾 Saving article content:', {
      articleId,
      contentLength: content.length,
      editingStatus,
      userId: user.id
    });

    // Handle potential enum errors by mapping "published" to "final" if needed
    let validEditingStatus = editingStatus;
    if (editingStatus === 'published') {
      console.warn('⚠️ "published" status not yet supported in database, using "final" instead');
      validEditingStatus = 'final';
    }

    // Get current version to increment
    const { data: currentData, error: fetchError } = await supabase
      .from('content_briefs')
      .select('article_version, editing_status')
      .eq('id', articleId)
      .single();

    if (fetchError) {
      console.error('Error fetching current article data:', fetchError);
      return {
        success: false,
        error: `Failed to fetch article data: ${fetchError.message}`
      };
    }

    const newVersion = (currentData?.article_version || 0) + 1;

    // Update the article
    const { data, error } = await supabase
      .from('content_briefs')
      .update({
        article_content: content,
        editing_status: validEditingStatus,
        last_edited_at: new Date().toISOString(),
        last_edited_by: user.id,
        article_version: newVersion,
        updated_at: new Date().toISOString()
      })
      .eq('id', articleId)
      .select(`
        id,
        product_name,
        article_content,
        editing_status,
        last_edited_at,
        last_edited_by,
        article_version,
        user_id,
        created_at,
        updated_at,
        google_doc_url
      `)
      .single();

    if (error) {
      console.error('Error saving article content:', error);
      
      // Handle specific enum errors gracefully
      if (error.message?.includes('invalid input value for enum')) {
        console.warn('⚠️ Enum value error detected, retrying with "draft" status...');
        return saveArticleContent(articleId, content, 'draft');
      }
      
      return {
        success: false,
        error: `Failed to save article: ${error.message}`
      };
    }

    return {
      success: true,
      data: {
        id: data.id,
        title: data.product_name || 'Untitled', // Map product_name to title
        content: data.article_content || '', // Map article_content to content
        editing_status: data.editing_status as ArticleContent['editing_status'],
        last_edited_at: data.last_edited_at,
        last_edited_by: data.last_edited_by,
        article_version: data.article_version,
        user_id: data.user_id,
        product_name: data.product_name,
        created_at: data.created_at,
        updated_at: data.updated_at,
        google_doc_url: data.google_doc_url
      }
    };

  } catch (error) {
    console.error('Unexpected error saving article:', error);
    return {
      success: false,
      error: 'Unexpected error occurred while saving article'
    };
  }
}

/**
 * Auto-save article content with debouncing support
 * This is optimized for frequent auto-save calls
 */
export async function autoSaveArticleContent(
  articleId: string,
  content: string
): Promise<ArticleSaveResult> {
  return saveArticleContent(articleId, content, 'editing');
}

/**
 * Get article save status and metadata
 */
export async function getArticleStatus(articleId: string): Promise<{
  success: boolean;
  data?: {
    editing_status: ArticleContent['editing_status'];
    last_edited_at: string;
    last_edited_by: string;
    article_version: number;
  };
  error?: string;
}> {
  try {
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return {
        success: false,
        error: 'User not authenticated'
      };
    }

    const { data, error } = await supabase
      .from('content_briefs')
      .select('editing_status, last_edited_at, last_edited_by, article_version')
      .eq('id', articleId)
      .single();

    if (error) {
      return {
        success: false,
        error: `Failed to get article status: ${error.message}`
      };
    }

    return {
      success: true,
      data: {
        editing_status: (data.editing_status as ArticleContent['editing_status']) || 'draft',
        last_edited_at: data.last_edited_at || '',
        last_edited_by: data.last_edited_by || '',
        article_version: data.article_version || 1
      }
    };

  } catch (error) {
    console.error('Unexpected error getting article status:', error);
    return {
      success: false,
      error: 'Unexpected error occurred while getting article status'
    };
  }
}

/**
 * Create a manual version snapshot of an article
 */
export async function createManualVersion(
  articleId: string,
  changeSummary?: string,
  versionTag: 'manual_save' | 'milestone' | 'published' | 'review' = 'manual_save'
): Promise<{ success: boolean; versionNumber?: number; error?: string }> {
  try {
    // Get the current article content
    const articleResult = await loadArticleContent(articleId);
    if (!articleResult.success || !articleResult.data) {
      return {
        success: false,
        error: `Failed to load article: ${articleResult.error}`
      };
    }

    const article = articleResult.data;

    // Create metadata
    const metadata = {
      title: article.product_name,
      editing_status: article.editing_status,
      content_length: article.content.length
    };

    // Create the version
    const versionResult = await createVersionHistory(
      articleId,
      article.content,
      metadata,
      changeSummary,
      versionTag
    );

    if (!versionResult.success || !versionResult.data) {
      return {
        success: false,
        error: `Failed to create version: ${versionResult.error}`
      };
    }

    return {
      success: true,
      versionNumber: versionResult.data.version_number
    };

  } catch (error) {
    console.error('Unexpected error creating manual version:', error);
    return {
      success: false,
      error: 'Unexpected error occurred while creating version'
    };
  }
}

/**
 * Enhanced save function that optionally creates a version
 */
export async function saveArticleContentWithVersion(
  articleId: string,
  content: string,
  editingStatus: ArticleContent['editing_status'] = 'editing',
  createVersion: boolean = false,
  changeSummary?: string
): Promise<ArticleSaveResult & { versionNumber?: number }> {
  try {
    // Save the article first
    const saveResult = await saveArticleContent(articleId, content, editingStatus);
    
    if (!saveResult.success) {
      return saveResult;
    }

    let versionNumber;

    // Create manual version if requested
    if (createVersion) {
      const versionResult = await createManualVersion(
        articleId,
        changeSummary,
        editingStatus === 'final' || editingStatus === 'review' ? editingStatus as 'review' : 'manual_save'
      );
      
      if (versionResult.success) {
        versionNumber = versionResult.versionNumber;
      }
    }

    return {
      ...saveResult,
      versionNumber
    };

  } catch (error) {
    console.error('Unexpected error saving article with version:', error);
    return {
      success: false,
      error: 'Unexpected error occurred while saving article with version'
    };
  }
}

// Admin-specific functions for cross-user article access
export const loadArticleContentAsAdmin = async (
  articleId: string, 
  adminUserId: string
): Promise<ArticleContent | null> => {
  try {
    console.log('loadArticleContentAsAdmin called:', { articleId, adminUserId });
    
    // Verify admin permissions
    const { data: adminProfile, error: adminError } = await supabase
      .from('admin_profiles')
      .select('id, email, role, permissions')
      .eq('id', adminUserId)
      .single();

    if (adminError || !adminProfile) {
      console.error('Admin verification failed:', adminError);
      throw new Error('Admin access denied - user not found in admin_profiles');
    }

    console.log('Admin verified:', adminProfile.email);

    // Load article with all relevant fields
    const { data: article, error } = await supabase
      .from('content_briefs')
      .select(`
        id,
        product_name,
        article_content,
        editing_status,
        last_edited_at,
        last_edited_by,
        article_version,
        user_id,
        created_at,
        updated_at,
        google_doc_url
      `)
      .eq('id', articleId)
      .single();

    if (error) {
      console.error('Database error loading article:', error);
      throw error;
    }

    if (!article) {
      console.error('Article not found');
      throw new Error('Article not found');
    }

    console.log('Raw article data from database:', {
      id: article.id,
      product_name: article.product_name,
      article_content_length: article.article_content?.length || 0,
      article_content_preview: article.article_content?.substring(0, 100),
      editing_status: article.editing_status,
      user_id: article.user_id
    });

    // Log admin access
    await auditLogger.logAction(
      articleId,
      'view',
      `Admin ${adminProfile.email} loaded article for editing`,
      { 
        admin_id: adminUserId,
        admin_email: adminProfile.email,
        original_author: article.user_id,
        access_type: 'admin_load'
      }
    );

    // Return data in the expected ArticleContent format
    const result = {
      id: article.id,
      title: article.product_name || 'Untitled', // Use product_name as fallback
      content: article.article_content || '', // Map article_content to content
      editing_status: article.editing_status || 'draft',
      last_edited_at: article.last_edited_at || article.updated_at,
      last_edited_by: article.last_edited_by || adminUserId,
      article_version: article.article_version || 1,
      user_id: article.user_id,
      product_name: article.product_name,
      created_at: article.created_at,
      updated_at: article.updated_at,
      google_doc_url: article.google_doc_url
    } as ArticleContent;

    console.log('Formatted result for ArticleEditor:', {
      id: result.id,
      title: result.title,
      content_length: result.content?.length || 0,
      content_preview: result.content?.substring(0, 100),
      editing_status: result.editing_status
    });

    return result;
  } catch (error) {
    console.error('Error loading article content as admin:', error);
    toast.error('Failed to load article content');
    return null;
  }
};

export const saveArticleContentAsAdmin = async (
  articleId: string,
  content: string,
  adminUserId: string,
  originalAuthorId: string,
  editingStatus: 'draft' | 'editing' | 'review' | 'final' | 'published' = 'editing',
  adminNote?: string
): Promise<ArticleContent | null> => {
  try {
    // Verify admin permissions
    const { data: adminProfile, error: adminError } = await supabase
      .from('admin_profiles')
      .select('id, email, role, permissions')
      .eq('id', adminUserId)
      .single();

    if (adminError || !adminProfile) {
      throw new Error('Admin access denied - user not found in admin_profiles');
    }

    // Get current article version
    const { data: currentArticle, error: fetchError } = await supabase
      .from('content_briefs')
      .select('article_version, editing_status')
      .eq('id', articleId)
      .single();

    if (fetchError) {
      throw fetchError;
    }

    const newVersion = (currentArticle?.article_version || 0) + 1;

    // Update article with admin attribution
    const { data: updatedArticle, error: updateError } = await supabase
      .from('content_briefs')
      .update({
        article_content: content,
        editing_status: editingStatus,
        last_edited_at: new Date().toISOString(),
        last_edited_by: adminUserId,
        article_version: newVersion,
        updated_at: new Date().toISOString()
      })
      .eq('id', articleId)
      .select(`
        id,
        product_name,
        article_content,
        editing_status,
        last_edited_at,
        last_edited_by,
        article_version,
        user_id,
        created_at,
        updated_at,
        google_doc_url
      `)
      .single();

    if (updateError) {
      throw updateError;
    }

    // Log admin save action
    await auditLogger.logAction(
      articleId,
      'edit',
      `Admin ${adminProfile.email} saved article content`,
      {
        admin_id: adminUserId,
        admin_email: adminProfile.email,
        original_author: originalAuthorId,
        new_version: newVersion,
        new_status: editingStatus,
        admin_note: adminNote || null,
        action_type: 'admin_save'
      }
    );

    // Return data in the expected ArticleContent format
    return {
      id: updatedArticle.id,
      title: updatedArticle.product_name || 'Untitled',
      content: updatedArticle.article_content || '',
      editing_status: updatedArticle.editing_status || 'draft',
      last_edited_at: updatedArticle.last_edited_at,
      last_edited_by: updatedArticle.last_edited_by,
      article_version: updatedArticle.article_version,
      user_id: updatedArticle.user_id,
      product_name: updatedArticle.product_name,
      created_at: updatedArticle.created_at,
      updated_at: updatedArticle.updated_at,
      google_doc_url: updatedArticle.google_doc_url
    } as ArticleContent;
  } catch (error) {
    console.error('Error saving article content as admin:', error);
    toast.error('Failed to save article content');
    return null;
  }
};

export const autoSaveArticleContentAsAdmin = async (
  articleId: string,
  content: string,
  adminUserId: string,
  originalAuthorId: string
): Promise<boolean> => {
  try {
    console.log('autoSaveArticleContentAsAdmin called:', { articleId, adminUserId, originalAuthorId, contentLength: content.length });
    
    // Verify admin permissions
    const { data: adminProfile, error: adminError } = await supabase
      .from('admin_profiles')
      .select('id, email')
      .eq('id', adminUserId)
      .single();

    if (adminError || !adminProfile) {
      console.error('Admin verification failed for auto-save:', adminError);
      return false;
    }

    console.log('Auto-save admin verified:', adminProfile.email);

    // Auto-save without version increment (draft save)
    const { data, error: updateError } = await supabase
      .from('content_briefs')
      .update({
        article_content: content,
        last_edited_at: new Date().toISOString(),
        last_edited_by: adminUserId,
        updated_at: new Date().toISOString()
      })
      .eq('id', articleId)
      .select('id, article_version')
      .single();

    if (updateError) {
      console.error('Database update error during auto-save:', updateError);
      throw updateError;
    }

    console.log('Auto-save successful:', { articleId, version: data?.article_version });

    // Log auto-save (less verbose logging)
    await auditLogger.logAction(
      articleId,
      'edit',
      'Admin auto-save',
      {
        admin_id: adminUserId,
        original_author: originalAuthorId,
        action_type: 'admin_auto_save'
      }
    );

    return true;
  } catch (error) {
    console.error('Error auto-saving article content as admin:', error);
    return false;
  }
};

/**
 * Delete article content and link by ID (preserves original brief)
 */
export async function deleteArticle(articleId: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return {
        success: false,
        error: 'User not authenticated'
      };
    }

    console.log('🗑️ Clearing article content and all article metadata:', { articleId, userId: user.id });

    // First, get the article to verify ownership and get metadata for cleanup
    const { data: articleData, error: fetchError } = await supabase
      .from('content_briefs')
      .select('id, product_name, user_id, article_content, link')
      .eq('id', articleId)
      .single();

    if (fetchError) {
      console.error('Error fetching article for deletion:', fetchError);
      return {
        success: false,
        error: `Article not found or access denied: ${fetchError.message}`
      };
    }

    if (!articleData) {
      return {
        success: false,
        error: 'Article not found or you do not have permission to delete it'
      };
    }

    // Delete related data first (comments, images, etc.)
    try {
      console.log('🔍 Starting comment cleanup process...');
      
      // Delete all comments for this article using the dedicated function
      const commentDeletionResult = await deleteAllCommentsForArticle(articleId);
      
      if (!commentDeletionResult.success) {
        console.warn('⚠️ Comment deletion had issues:', commentDeletionResult.error);
        // Continue with article deletion even if comment deletion fails
        if (commentDeletionResult.deletedCount === 0) {
          console.warn('❌ No comments were deleted, but continuing with article deletion');
        }
      } else {
        console.log(`✅ Successfully deleted ${commentDeletionResult.deletedCount} comments`);
      }

      // Delete article images and their metadata
      const { data: imageData, error: imagesError } = await supabase
        .from('article_images')
        .select('storage_path')
        .eq('article_id', articleId);

      if (imagesError) {
        console.warn('Warning: Could not fetch article images for cleanup:', imagesError);
      } else if (imageData && imageData.length > 0) {
        // Delete images from storage
        const imagePaths = imageData.map(img => img.storage_path);
        const { error: storageError } = await supabase
          .storage
          .from('article-images')
          .remove(imagePaths);

        if (storageError) {
          console.warn('Warning: Could not delete images from storage:', storageError);
        }

        // Delete image metadata
        const { error: imageMetaError } = await supabase
          .from('article_images')
          .delete()
          .eq('article_id', articleId);

        if (imageMetaError) {
          console.warn('Warning: Could not delete image metadata:', imageMetaError);
        }
      }

      // Delete version history if it exists
      const { error: versionError } = await supabase
        .from('article_version_history')
        .delete()
        .eq('article_id', articleId);

      if (versionError) {
        console.warn('Warning: Could not delete version history:', versionError);
      }

    } catch (cleanupError) {
      console.warn('Warning: Some cleanup operations failed:', cleanupError);
      // Continue with main article content deletion even if cleanup fails
    }

    // Clear article content and all related metadata (reset to original brief state)
    const { error: updateError } = await supabase
      .from('content_briefs')
      .update({
        article_content: null,
        link: null,
        editing_status: null,
        last_edited_at: null,
        last_edited_by: null,
        article_version: null,
        current_version: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', articleId);

    if (updateError) {
      console.error('Error clearing article content:', updateError);
      return {
        success: false,
        error: `Failed to clear article content: ${updateError.message}`
      };
    }

    // Log successful deletion
    await auditLogger.logAction(
      articleId,
      'delete',
      `Article content and metadata completely cleared for "${articleData.product_name}" by user`,
      {
        product_name: articleData.product_name,
        user_id: user.id,
        action_type: 'complete_article_reset'
      }
    );

    console.log('✅ Article content and metadata cleared successfully:', articleId);

    return {
      success: true
    };

  } catch (error) {
    console.error('Unexpected error clearing article content:', error);
    return {
      success: false,
      error: 'Unexpected error occurred while clearing article content'
    };
  }
} 