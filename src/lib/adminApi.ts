import { supabase } from './supabase';
import type {
  AdminArticlesResponse,
  ArticleDetail,
  ArticleUpdateRequest,
  ArticleListParams,
  AdminUsersResponse,
  UserSearchParams,
  AdminAuditLogsResponse,
  AuditLogParams,
  ErrorResponse,
  ArticleListItem,
  UserProfile
} from '../types/adminApi';

// Get current user
async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

// Check if user is admin
async function checkAdminPermission(): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;

  try {
    const { data: adminProfile, error } = await supabase
      .from('admin_profiles')
      .select('id')
      .eq('id', user.id)
      .maybeSingle();

    if (error) {
      console.error("Error checking admin permission:", error);
      return false;
    }
    return !!adminProfile;
  } catch (e) {
    console.error("Exception in checkAdminPermission:", e);
    return false;
  }
}

const USER_PROFILE_SELECT_QUERY = 'id,email,company_name,created_at,updated_at,content_briefs(count)';

// Define an interface for the raw Supabase article data with joined user_profiles
interface SupabaseArticleWithUser {
  id: string;
  product_name: string;
  article_content: string | null;
  article_version: number | null;
  editing_status: ArticleListItem['editing_status'] | null;
  last_edited_at: string;
  last_edited_by: string;
  created_at: string;
  updated_at: string;
  user_id: string; // From content_briefs, represents the foreign key to user_profiles via user_presence
  user_presence: { // Joined from user_presence table
    user_profiles: { // Nested join from user_profiles table
      id: string;
      email: string;
      company_name: string | null;
    };
  };
}


// Admin Articles API
export const adminArticlesApi = {
  // Get list of articles with filtering and pagination
  async getArticles(params: ArticleListParams = {}): Promise<{ data?: AdminArticlesResponse; error?: ErrorResponse }> {
    try {
      const isAdmin = await checkAdminPermission();
      if (!isAdmin) {
        return {
          error: {
            error: 'Unauthorized - Admin access required',
            errorCode: 'UNAUTHORIZED'
          }
        };
      }

      const {
        page = 1,
        limit = 20,
        search,
        status,
        user_id, // for filtering
        sort_by = 'last_edited_at',
        sort_order = 'desc'
      } = params;

      console.log('DEBUG: Fetching content_briefs without joins...');

      // Step 1: Fetch content_briefs without any joins
      let query = supabase
        .from('content_briefs')
        .select('*', { count: 'exact' });

      // Apply filters
      if (search) {
        query = query.or(`product_name.ilike.%${search}%,article_content.ilike.%${search}%`);
      }
      if (status) {
        query = query.eq('editing_status', status);
      }
      if (user_id) {
        query = query.eq('user_id', user_id);
      }

      // Apply sorting
      query = query.order(sort_by, { ascending: sort_order === 'asc' });

      // Apply pagination
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      query = query.range(from, to);

      const { data: articlesData, error: articlesError, count } = await query;

      if (articlesError) {
        console.error("Supabase error fetching content_briefs:", articlesError);
        throw articlesError;
      }

      console.log('DEBUG: Fetched content_briefs:', articlesData?.length, 'articles');

      if (!articlesData || articlesData.length === 0) {
        return {
          data: {
            articles: [],
            total: count || 0,
            page,
            limit,
            totalPages: Math.ceil((count || 0) / limit)
          }
        };
      }

      // Step 2: Get unique user IDs from the articles
      const userIds = [...new Set(articlesData.map((article: any) => article.user_id).filter(Boolean))];
      console.log('DEBUG: Unique user IDs to fetch:', userIds);

      // Step 3: Fetch user profiles for those IDs
      const { data: usersData, error: usersError } = await supabase
        .from('user_profiles')
        .select('id,email,company_name')
        .in('id', userIds);

      if (usersError) {
        console.error("Supabase error fetching user_profiles:", usersError);
        // Continue without user data rather than failing completely
      }

      console.log('DEBUG: Fetched user profiles:', usersData?.length, 'users');

      // Step 4: Create a lookup map for users
      const usersMap = new Map();
      usersData?.forEach((user: any) => {
        usersMap.set(user.id, user);
      });

      // Step 5: Combine the data
      const response: AdminArticlesResponse = {
        articles: articlesData.map((article: any) => {
          const user = usersMap.get(article.user_id);
          console.log('DEBUG: Processing article:', article.id, 'with user:', user?.email || 'NOT FOUND');
          
          return {
            id: article.id,
            title: article.product_name || 'Untitled',
            user_id: article.user_id || '',
            user_email: user?.email || 'Unknown User',
            user_company: user?.company_name || '',
            product_name: article.product_name || '',
            editing_status: article.editing_status || 'draft',
            last_edited_at: article.last_edited_at || new Date().toISOString(),
            last_edited_by: article.last_edited_by || '',
            article_version: article.article_version || 1,
            created_at: article.created_at || new Date().toISOString(),
            updated_at: article.updated_at || new Date().toISOString(),
          };
        }),
        total: count || 0,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit)
      };

      return { data: response };
    } catch (error: any) {
      console.error("Error in getArticles:", error);
      return {
        error: {
          error: 'Failed to fetch articles',
          errorCode: 'FETCH_ERROR',
          details: error.message || String(error)
        }
      };
    }
  },

  // Get specific article details
  async getArticle(articleId: string): Promise<{ data?: ArticleDetail; error?: ErrorResponse }> {
    try {
      const isAdmin = await checkAdminPermission();
      if (!isAdmin) {
        return {
          error: {
            error: 'Unauthorized - Admin access required',
            errorCode: 'UNAUTHORIZED'
          }
        };
      }

      const selectQuery = 'id,product_name,article_content,article_version,editing_status,last_edited_at,last_edited_by,created_at,updated_at,user_id,user_presence!inner(user_profiles!inner(id,email,company_name))';

      const { data: fetchedArticle, error } = await supabase
        .from('content_briefs')
        .select(selectQuery)
        .eq('id', articleId)
        .returns<SupabaseArticleWithUser>()
        .single();

      if (error) {
        console.error("Supabase error in getArticle:", error);
        if (error.message.includes("Could not find a relationship")) {
             return { error: { error: 'Failed to fetch article due to incorrect table relationship in query.', errorCode: 'QUERY_RELATIONSHIP_ERROR', details: error.message }};
        }
        throw error;
      }
      if (!fetchedArticle) return { error: { error: 'Article not found or access denied', errorCode: 'NOT_FOUND'}};
      
      const article: SupabaseArticleWithUser = fetchedArticle;

      const response: ArticleDetail = {
        id: article.id,
        title: article.product_name,
        article_content: article.article_content || '',
        article_version: article.article_version || 1,
        editing_status: (article.editing_status || 'draft'),
        last_edited_at: article.last_edited_at,
        last_edited_by: article.last_edited_by,
        created_at: article.created_at,
        updated_at: article.updated_at,
        user_id: article.user_presence.user_profiles.id,
        user_email: article.user_presence.user_profiles.email || '',
        user_company: article.user_presence.user_profiles.company_name || '',
        product_name: article.product_name
      };

      return { data: response };
    } catch (error: any) {
      console.error("Error in getArticle:", error);
      return {
        error: {
          error: 'Failed to fetch article',
          errorCode: 'FETCH_ERROR',
          details: error.message || String(error)
        }
      };
    }
  },

  // Update article content and metadata
  async updateArticle(
    articleId: string, 
    updates: ArticleUpdateRequest
  ): Promise<{ data?: ArticleDetail; error?: ErrorResponse }> {
    try {
      const isAdmin = await checkAdminPermission();
      if (!isAdmin) {
        return {
          error: {
            error: 'Unauthorized - Admin access required',
            errorCode: 'UNAUTHORIZED'
          }
        };
      }

      const currentUser = await getCurrentUser();
      if (!currentUser) {
        return {
          error: {
            error: 'User not authenticated',
            errorCode: 'UNAUTHORIZED'
          }
        };
      }

      const updateData: Partial<typeof updates & { last_edited_by: string, updated_at: string }> = {
        ...updates,
        last_edited_by: currentUser.id,
        updated_at: new Date().toISOString(),
      };

      // If user_id is part of updates, ensure it's handled correctly.
      // The content_briefs table has a user_id column that can be updated.
      if (updates.user_id) {
        updateData.user_id = updates.user_id;
      }


      const { data, error } = await supabase
        .from('content_briefs')
        .update(updateData)
        .eq('id', articleId)
        .select('id,product_name,article_content,article_version,editing_status,last_edited_at,last_edited_by,created_at,updated_at,user_id,user_presence!inner(user_profiles!inner(id,email,company_name))')
        .returns<SupabaseArticleWithUser>()
        .single();
      
      if (error) {
        console.error("Supabase error in updateArticle:", error);
        if (error.message.includes("Could not find a relationship")) {
          return { error: { error: 'Failed to update article due to incorrect table relationship in query.', errorCode: 'QUERY_RELATIONSHIP_ERROR', details: error.message }};
        }
        throw error;
      }

      if (!data) {
        return { error: { error: 'Failed to update article or article not found', errorCode: 'UPDATE_FAILED' } };
      }
      
      const article: SupabaseArticleWithUser = data;

      const response: ArticleDetail = {
        id: article.id,
        title: article.product_name,
        article_content: article.article_content || '',
        article_version: article.article_version || 1,
        editing_status: (article.editing_status || 'draft'),
        last_edited_at: article.last_edited_at,
        last_edited_by: article.last_edited_by,
        created_at: article.created_at,
        updated_at: article.updated_at,
        user_id: article.user_presence.user_profiles.id,
        user_email: article.user_presence.user_profiles.email || '',
        user_company: article.user_presence.user_profiles.company_name || '',
        product_name: article.product_name,
        // notes are not directly part of the article table, handle separately if needed
      };

      return { data: response };
    } catch (error: any) {
      console.error("Error in updateArticle:", error);
      return {
        error: {
          error: 'Failed to update article',
          errorCode: 'UPDATE_ERROR',
          details: error.message || String(error)
        }
      };
    }
  },

  // Change article status
  async changeStatus(
    articleId: string, 
    status: ArticleUpdateRequest['editing_status'],
    notes?: string // notes are passed but not directly used in content_briefs update here
  ): Promise<{ data?: ArticleDetail; error?: ErrorResponse }> {
    try {
      const isAdmin = await checkAdminPermission();
      if (!isAdmin) {
        return {
          error: {
            error: 'Unauthorized - Admin access required',
            errorCode: 'UNAUTHORIZED'
          }
        };
      }
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        return { error: { error: 'User not authenticated', errorCode: 'UNAUTHORIZED'}};
      }

      // Step 1: Update the article status without joins
      const { data: updatedArticle, error } = await supabase
        .from('content_briefs')
        .update({ 
          editing_status: status,
          last_edited_by: currentUser.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', articleId)
        .select('*')
        .single();

      if (error) {
        console.error("Supabase error in changeStatus:", error);
        throw error;
      }
      if (!updatedArticle) return { error: { error: 'Failed to change status or article not found', errorCode: 'UPDATE_FAILED'}};

      // Step 2: Fetch user profile separately
      let userEmail = '';
      let userCompany = '';
      if (updatedArticle.user_id) {
        const { data: userData, error: userError } = await supabase
          .from('user_profiles')
          .select('id,email,company_name')
          .eq('id', updatedArticle.user_id)
          .single();

        if (!userError && userData) {
          userEmail = userData.email || '';
          userCompany = userData.company_name || '';
        }
      }

      const response: ArticleDetail = {
        id: updatedArticle.id,
        title: updatedArticle.product_name,
        article_content: updatedArticle.article_content || '',
        article_version: updatedArticle.article_version || 1,
        editing_status: (updatedArticle.editing_status || 'draft'),
        last_edited_at: updatedArticle.last_edited_at,
        last_edited_by: updatedArticle.last_edited_by,
        created_at: updatedArticle.created_at,
        updated_at: updatedArticle.updated_at,
        user_id: updatedArticle.user_id || '',
        user_email: userEmail,
        user_company: userCompany,
        product_name: updatedArticle.product_name
      };

      // TODO: Handle 'notes' - perhaps log them to an audit trail or a separate notes table.
      if (notes) {
        console.log(`Admin note for status change on article ${articleId} to ${status}: ${notes}`);
        // Placeholder for actual note logging
      }

      return { data: response };
    } catch (error: any) {
      console.error("Error in changeStatus:", error);
      return {
        error: {
          error: 'Failed to change status',
          errorCode: 'UPDATE_ERROR',
          details: error.message || String(error)
        }
      };
    }
  },

  // Transfer article ownership (admin feature)
  async transferOwnership(
    articleId: string,
    newUserId: string,
    notes?: string // notes are passed but not directly used in content_briefs update here
  ): Promise<{ data?: ArticleDetail; error?: ErrorResponse }> {
    try {
      const isAdmin = await checkAdminPermission();
      if (!isAdmin) {
        return {
          error: {
            error: 'Unauthorized - Admin access required',
            errorCode: 'UNAUTHORIZED'
          }
        };
      }

      const currentUser = await getCurrentUser();
      if (!currentUser) {
        return { error: { error: 'User not authenticated', errorCode: 'UNAUTHORIZED'}};
      }
      
      // Verify the new user exists (optional, but good practice)
      const { data: newUserData, error: newUserError } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('id', newUserId)
        .single();

      if (newUserError || !newUserData) {
        console.error("Error fetching new user for ownership transfer:", newUserError);
        return { error: { error: 'New user not found or error fetching user.', errorCode: 'INVALID_TARGET_USER' } };
      }


      const { data, error } = await supabase
        .from('content_briefs')
        .update({ 
          user_id: newUserId, // This updates the direct user_id foreign key on content_briefs
          last_edited_by: currentUser.id, // Log who made the change
          updated_at: new Date().toISOString(),
        })
        .eq('id', articleId)
        .select('id,product_name,article_content,article_version,editing_status,last_edited_at,last_edited_by,created_at,updated_at,user_id,user_presence!inner(user_profiles!inner(id,email,company_name))')
        .returns<SupabaseArticleWithUser>()
        .single();

      if (error) {
        console.error("Supabase error in transferOwnership:", error);
        if (error.message.includes("Could not find a relationship")) {
          return { error: { error: 'Failed to transfer ownership due to incorrect table relationship in query.', errorCode: 'QUERY_RELATIONSHIP_ERROR', details: error.message }};
        }
        throw error;
      }
      if (!data) return { error: { error: 'Failed to transfer ownership or article not found', errorCode: 'UPDATE_FAILED'}};

      const article: SupabaseArticleWithUser = data;
      
      const response: ArticleDetail = {
        id: article.id,
        title: article.product_name,
        article_content: article.article_content || '',
        article_version: article.article_version || 1,
        editing_status: (article.editing_status || 'draft'),
        last_edited_at: article.last_edited_at,
        last_edited_by: article.last_edited_by,
        created_at: article.created_at,
        updated_at: article.updated_at,
        user_id: article.user_presence.user_profiles.id, // Reflects the new owner's ID from the joined data
        user_email: article.user_presence.user_profiles.email || '',
        user_company: article.user_presence.user_profiles.company_name || '',
        product_name: article.product_name
      };

      // TODO: Handle 'notes' - perhaps log them to an audit trail or a separate notes table.
      if (notes) {
        console.log(`Admin note for ownership transfer of article ${articleId} to user ${newUserId}: ${notes}`);
        // Placeholder for actual note logging
      }

      return { data: response };
    } catch (error: any) {
      console.error("Error in transferOwnership:", error);
      return { error: { error: 'Failed to transfer ownership', errorCode: 'TRANSFER_ERROR', details: error.message || String(error) } };
    }
  }
};

interface SupabaseUserProfileWithCount {
  id: string;
  email: string;
  company_name: string | null;
  created_at: string;
  updated_at: string;
  content_briefs: { count: number }[] | { count: number };
}

// Admin Users API
export const adminUsersApi = {
  // Get list of users for selection
  async getUsers(params: UserSearchParams = {}): Promise<{ data?: AdminUsersResponse; error?: ErrorResponse }> {
    try {
      const isAdmin = await checkAdminPermission();
      if (!isAdmin) {
        return {
          error: {
            error: 'Unauthorized - Admin access required',
            errorCode: 'UNAUTHORIZED'
          }
        };
      }

      const {
        search,
        limit = 20
      } = params;

      let query = supabase
        .from('user_profiles')
        .select(USER_PROFILE_SELECT_QUERY, { count: 'exact' });

      if (search) {
        query = query.or(`email.ilike.%${search}%,company_name.ilike.%${search}%`);
      }

      query = query.limit(limit);
      query = query.order('email', { ascending: true });

      const { data: users, error } = await query.returns<SupabaseUserProfileWithCount[]>();

      if (error) throw error;

      const response: AdminUsersResponse = {
        users: users?.map((user) => {
          let articleCount = 0;
          if (user.content_briefs) {
            if (Array.isArray(user.content_briefs)) {
              articleCount = user.content_briefs[0]?.count || 0;
            } else {
              articleCount = user.content_briefs.count;
            }
          }
          return {
            id: user.id,
            email: user.email,
            company_name: user.company_name || '',
            created_at: user.created_at,
            updated_at: user.updated_at,
            article_count: articleCount
          }
        }) || []
      };

      return { data: response };
    } catch (error: any) {
      console.error("Error in getUsers:", error);
      return {
        error: {
          error: 'Failed to fetch users',
          errorCode: 'FETCH_ERROR',
          details: error.message || String(error)
        }
      };
    }
  }
};

// Admin Audit Logs API
export const adminAuditApi = {
  // Get audit logs with filtering
  async getAuditLogs(params: AuditLogParams = {}): Promise<{ data?: AdminAuditLogsResponse; error?: ErrorResponse }> {
    try {
      const isAdmin = await checkAdminPermission();
      if (!isAdmin) {
        return {
          error: {
            error: 'Unauthorized - Admin access required',
            errorCode: 'UNAUTHORIZED'
          }
        };
      }

      const response: AdminAuditLogsResponse = {
        logs: []
      };

      return { data: response };
    } catch (error: any) {
      console.error("Error in getAuditLogs:", error);
      return {
        error: {
          error: 'Failed to fetch audit logs',
          errorCode: 'FETCH_ERROR',
          details: error.message || String(error)
        }
      };
    }
  }
};

// Bulk operations
export const adminBulkApi = {
  // Bulk status change for multiple articles
  async bulkStatusChange(
    articleIds: string[],
    status: ArticleUpdateRequest['editing_status'],
    notes?: string
  ): Promise<{ successes: string[]; failures: { id: string; error: string }[] }> {
    const results = await Promise.allSettled(
      articleIds.map(id => 
        adminArticlesApi.changeStatus(id, status, notes)
      )
    );

    const successes: string[] = [];
    const failures: { id: string; error: string }[] = [];

    results.forEach((result, index) => {
      const articleId = articleIds[index];
      if (result.status === 'fulfilled' && result.value.data) {
        successes.push(articleId);
      } else {
        const errorDetail = result.status === 'rejected' 
          ? (result.reason as any)?.message || 'Unknown error'
          : (result.value as any)?.error?.error || 'Update failed';
        failures.push({ id: articleId, error: errorDetail });
      }
    });

    return { successes, failures };
  },

  // Bulk ownership transfer for multiple articles
  async bulkTransferOwnership(
    articleIds: string[],
    newUserId: string,
    notes?: string
  ): Promise<{ successes: string[]; failures: { id: string; error: string }[] }> {
    const results = await Promise.allSettled(
      articleIds.map(id => 
        adminArticlesApi.transferOwnership(id, newUserId, notes)
      )
    );

    const successes: string[] = [];
    const failures: { id: string; error: string }[] = [];

    results.forEach((result, index) => {
      const articleId = articleIds[index];
      if (result.status === 'fulfilled' && result.value.data) {
        successes.push(articleId);
      } else {
        const errorDetail = result.status === 'rejected' 
          ? (result.reason as any)?.message || 'Unknown error'
          : (result.value as any)?.error?.error || 'Transfer failed';
        failures.push({ id: articleId, error: errorDetail });
      }
    });

    return { successes, failures };
  }
};

// Check admin status
export async function checkAdminStatus(): Promise<boolean> {
  return checkAdminPermission();
}