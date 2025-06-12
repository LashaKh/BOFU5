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

// Enhanced admin role types
export interface AdminRole {
  id: string;
  email: string;
  name?: string;
  admin_role: 'super_admin' | 'sub_admin';
  assigned_clients_count?: number;
}

export interface ClientAssignment {
  id: string;
  admin_id: string;
  client_user_id: string;
  client_email: string;
  client_company: string;
  assigned_at: string;
  assigned_by: string;
}

export interface AssignmentRequest {
  adminId: string;
  clientUserId: string;
}

// Get current user
async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

// Enhanced admin permission checking with role information
async function checkAdminPermission(): Promise<{ isAdmin: boolean; role?: 'super_admin' | 'sub_admin'; adminId?: string }> {
  const user = await getCurrentUser();
  if (!user) return { isAdmin: false };

  try {
    const { data: adminProfile, error } = await supabase
      .from('admin_profiles')
      .select('id, admin_role')
      .eq('id', user.id)
      .maybeSingle();

    if (error) {
      console.error("Error checking admin permission:", error);
      return { isAdmin: false };
    }

    if (!adminProfile) {
      return { isAdmin: false };
    }

    return { 
      isAdmin: true, 
      role: adminProfile.admin_role,
      adminId: adminProfile.id
    };
  } catch (e) {
    console.error("Exception in checkAdminPermission:", e);
    return { isAdmin: false };
  }
}

// Get assigned client IDs for current sub-admin
async function getAssignedClientIds(): Promise<string[]> {
  const user = await getCurrentUser();
  if (!user) return [];

  try {
    const { data: assignments, error } = await supabase
      .from('admin_client_assignments')
      .select('client_user_id')
      .eq('admin_id', user.id);

    if (error) {
      console.error("Error fetching assigned clients:", error);
      return [];
    }

    return assignments?.map(a => a.client_user_id) || [];
  } catch (e) {
    console.error("Exception in getAssignedClientIds:", e);
    return [];
  }
}

// Constants
const USER_PROFILE_SELECT_QUERY = 'id,email,company_name,created_at,updated_at';

// Admin Articles API
export const adminArticlesApi = {
  // Get list of articles with filtering and pagination (enhanced with role-based access)
  async getArticles(params: ArticleListParams = {}): Promise<{ data?: AdminArticlesResponse; error?: ErrorResponse }> {
    try {
      const adminCheck = await checkAdminPermission();
      if (!adminCheck.isAdmin) {
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

      console.log('DEBUG: Fetching content_briefs with role-based filtering...');
      console.log('DEBUG: Admin role:', adminCheck.role);

      // Step 1: Fetch content_briefs with role-based filtering
      let query = supabase
        .from('content_briefs')
        .select('*', { count: 'exact' });

      // Apply role-based filtering
      if (adminCheck.role === 'sub_admin') {
        const assignedClientIds = await getAssignedClientIds();
        console.log('DEBUG: Sub-admin assigned clients:', assignedClientIds);
        
        if (assignedClientIds.length === 0) {
          // Sub-admin has no assigned clients, return empty result
          return {
            data: {
              articles: [],
              total: 0,
              page,
              limit,
              totalPages: 0
            }
          };
        }
        
        query = query.in('user_id', assignedClientIds);
      }
      // Super admins see all articles (no additional filtering)

      // Apply other filters
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

  // Get specific article details (enhanced with role-based access)
  async getArticle(articleId: string): Promise<{ data?: ArticleDetail; error?: ErrorResponse }> {
    try {
      const adminCheck = await checkAdminPermission();
      if (!adminCheck.isAdmin) {
        return {
          error: {
            error: 'Unauthorized - Admin access required',
            errorCode: 'UNAUTHORIZED'
          }
        };
      }

      console.log('DEBUG: Fetching content_briefs article with role-based access...');

      // Step 1: Fetch content_brief
      const { data: fetchedArticle, error } = await supabase
        .from('content_briefs')
        .select('*')
        .eq('id', articleId)
        .maybeSingle();

      if (error) {
        console.error("Supabase error fetching article:", error);
        throw error;
      }

      if (!fetchedArticle) {
        return {
          error: {
            error: 'Article not found',
            errorCode: 'NOT_FOUND'
          }
        };
      }

      // Step 2: Check role-based access for sub-admins
      if (adminCheck.role === 'sub_admin') {
        const assignedClientIds = await getAssignedClientIds();
        if (!assignedClientIds.includes(fetchedArticle.user_id)) {
          return {
            error: {
              error: 'Access denied - Article not assigned to this admin',
              errorCode: 'ACCESS_DENIED'
            }
          };
        }
      }

      // Step 3: Fetch user profile separately
      const { data: userProfile, error: userError } = await supabase
        .from('user_profiles')
        .select('id,email,company_name')
        .eq('id', fetchedArticle.user_id)
        .maybeSingle();

      if (userError) {
        console.error("Error fetching user profile:", userError);
        // Continue without user data
      }

      console.log('DEBUG: Successfully fetched article and user profile');

      const response: ArticleDetail = {
        id: fetchedArticle.id,
        title: fetchedArticle.product_name || 'Untitled',
        content: fetchedArticle.article_content || '',
        article_content: fetchedArticle.article_content || '',
        user_id: fetchedArticle.user_id || '',
        user_email: userProfile?.email || 'Unknown User',
        user_company: userProfile?.company_name || '',
        product_name: fetchedArticle.product_name || '',
        editing_status: fetchedArticle.editing_status || 'draft',
        last_edited_at: fetchedArticle.last_edited_at || new Date().toISOString(),
        last_edited_by: fetchedArticle.last_edited_by || '',
        article_version: fetchedArticle.article_version || 1,
        created_at: fetchedArticle.created_at || new Date().toISOString(),
        updated_at: fetchedArticle.updated_at || new Date().toISOString(),
        link: fetchedArticle.link || null
      };

      return { data: response };
    } catch (error: any) {
      console.error("Error in getArticle:", error);
      return {
        error: {
          error: 'Failed to fetch article details',
          errorCode: 'FETCH_ERROR',
          details: error.message || String(error)
        }
      };
    }
  },

  // Update article (enhanced with role-based access)
  async updateArticle(
    articleId: string, 
    updates: ArticleUpdateRequest
  ): Promise<{ data?: ArticleDetail; error?: ErrorResponse }> {
    try {
      const adminCheck = await checkAdminPermission();
      if (!adminCheck.isAdmin) {
        return {
          error: {
            error: 'Unauthorized - Admin access required',
            errorCode: 'UNAUTHORIZED'
          }
        };
      }

      // Check role-based access for sub-admins
      if (adminCheck.role === 'sub_admin') {
        // First check if article exists and is assigned to this admin
        const { data: article, error: fetchError } = await supabase
          .from('content_briefs')
          .select('user_id')
          .eq('id', articleId)
          .maybeSingle();

        if (fetchError || !article) {
          return {
            error: {
              error: 'Article not found',
              errorCode: 'NOT_FOUND'
            }
          };
        }

        const assignedClientIds = await getAssignedClientIds();
        if (!assignedClientIds.includes(article.user_id)) {
          return {
            error: {
              error: 'Access denied - Article not assigned to this admin',
              errorCode: 'ACCESS_DENIED'
            }
          };
        }
      }

      // Prepare the update object
      const updateData: any = {
        ...updates,
        updated_at: new Date().toISOString()
      };

      // Perform the update
      const { data, error } = await supabase
        .from('content_briefs')
        .update(updateData)
        .eq('id', articleId)
        .select('*')
        .maybeSingle();

      if (error) {
        console.error("Supabase error updating article:", error);
        throw error;
      }

      if (!data) {
        return {
          error: {
            error: 'Article not found after update',
            errorCode: 'NOT_FOUND'
          }
        };
      }

      // Fetch user profile for the response
      const { data: userProfile } = await supabase
        .from('user_profiles')
        .select('id,email,company_name')
        .eq('id', data.user_id)
        .maybeSingle();

      const response: ArticleDetail = {
        id: data.id,
        title: data.product_name || 'Untitled',
        content: data.article_content || '',
        article_content: data.article_content || '',
        user_id: data.user_id || '',
        user_email: userProfile?.email || 'Unknown User',
        user_company: userProfile?.company_name || '',
        product_name: data.product_name || '',
        editing_status: data.editing_status || 'draft',
        last_edited_at: data.last_edited_at || new Date().toISOString(),
        last_edited_by: data.last_edited_by || '',
        article_version: data.article_version || 1,
        created_at: data.created_at || new Date().toISOString(),
        updated_at: data.updated_at || new Date().toISOString(),
        link: data.link || null
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

  // Change article status (enhanced with role-based access)
  async changeStatus(
    articleId: string, 
    status: ArticleUpdateRequest['editing_status'],
    notes?: string
  ): Promise<{ data?: ArticleDetail; error?: ErrorResponse }> {
    try {
      const adminCheck = await checkAdminPermission();
      if (!adminCheck.isAdmin) {
        return {
          error: {
            error: 'Unauthorized - Admin access required',
            errorCode: 'UNAUTHORIZED'
          }
        };
      }

      // Check role-based access for sub-admins
      if (adminCheck.role === 'sub_admin') {
        const { data: article, error: fetchError } = await supabase
          .from('content_briefs')
          .select('user_id')
          .eq('id', articleId)
          .maybeSingle();

        if (fetchError || !article) {
          return {
            error: {
              error: 'Article not found',
              errorCode: 'NOT_FOUND'
            }
          };
        }

        const assignedClientIds = await getAssignedClientIds();
        if (!assignedClientIds.includes(article.user_id)) {
          return {
            error: {
              error: 'Access denied - Article not assigned to this admin',
              errorCode: 'ACCESS_DENIED'
            }
          };
        }
      }

      return this.updateArticle(articleId, { editing_status: status });
    } catch (error: any) {
      console.error("Error in changeStatus:", error);
      return {
        error: {
          error: 'Failed to change status',
          errorCode: 'STATUS_CHANGE_ERROR',
          details: error.message || String(error)
        }
      };
    }
  },

  // Transfer ownership (enhanced with role-based access)
  async transferOwnership(
    articleId: string,
    newUserId: string,
    notes?: string
  ): Promise<{ data?: ArticleDetail; error?: ErrorResponse }> {
    try {
      const adminCheck = await checkAdminPermission();
      if (!adminCheck.isAdmin) {
        return {
          error: {
            error: 'Unauthorized - Admin access required',
            errorCode: 'UNAUTHORIZED'
          }
        };
      }

      // Only super admins can transfer ownership between different clients
      if (adminCheck.role === 'sub_admin') {
        // Sub-admins can only transfer within their assigned clients
        const assignedClientIds = await getAssignedClientIds();
        
        // Check current article owner
        const { data: article, error: fetchError } = await supabase
          .from('content_briefs')
          .select('user_id')
          .eq('id', articleId)
          .maybeSingle();

        if (fetchError || !article) {
          return {
            error: {
              error: 'Article not found',
              errorCode: 'NOT_FOUND'
            }
          };
        }

        // Check if both current and new owner are assigned to this sub-admin
        if (!assignedClientIds.includes(article.user_id) || !assignedClientIds.includes(newUserId)) {
          return {
            error: {
              error: 'Access denied - Can only transfer between assigned clients',
              errorCode: 'ACCESS_DENIED'
            }
          };
        }
      }

      return this.updateArticle(articleId, { user_id: newUserId });
    } catch (error: any) {
      console.error("Error in transferOwnership:", error);
      return {
        error: {
          error: 'Failed to transfer ownership',
          errorCode: 'TRANSFER_ERROR',
          details: error.message || String(error)
        }
      };
    }
  }
};

// Interface for Supabase response
interface SupabaseUserProfileWithCount {
  id: string;
  email: string;
  company_name: string | null;
  created_at: string;
  updated_at: string;
}

// Enhanced Admin Users API with role-based filtering
export const adminUsersApi = {
  // Get list of users for selection (enhanced with role-based access)
  async getUsers(params: UserSearchParams = {}): Promise<{ data?: AdminUsersResponse; error?: ErrorResponse }> {
    try {
      const adminCheck = await checkAdminPermission();
      if (!adminCheck.isAdmin) {
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

      // Apply role-based filtering
      if (adminCheck.role === 'sub_admin') {
        const assignedClientIds = await getAssignedClientIds();
        console.log('DEBUG: Sub-admin viewing assigned clients:', assignedClientIds);
        
        if (assignedClientIds.length === 0) {
          return {
            data: {
              users: []
            }
          };
        }
        
        query = query.in('id', assignedClientIds);
      }
      // Super admins see all users (no additional filtering)

      if (search) {
        query = query.or(`email.ilike.%${search}%,company_name.ilike.%${search}%`);
      }

      query = query.limit(limit);
      query = query.order('email', { ascending: true });

      const { data: users, error } = await query;

      if (error) throw error;

      const response: AdminUsersResponse = {
        users: users?.map((user: any) => {
          // Note: Article count removed since content_briefs relationship doesn't exist
          // This can be implemented later with proper database relationships
          const articleCount = 0;
          
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

// Client Assignment Management API
export const adminClientAssignmentApi = {
  // Get all admins with their roles and assignment counts
  async getAdmins(): Promise<{ data?: AdminRole[]; error?: ErrorResponse }> {
    try {
      const adminCheck = await checkAdminPermission();
      if (!adminCheck.isAdmin || adminCheck.role !== 'super_admin') {
        return {
          error: {
            error: 'Unauthorized - Super admin access required',
            errorCode: 'UNAUTHORIZED'
          }
        };
      }

      const { data: admins, error } = await supabase
        .from('admin_profiles')
        .select(`
          id,
          email,
          name,
          admin_role
        `)
        .order('email', { ascending: true });

      if (error) throw error;

      // Get assignment counts for each admin
      const { data: assignmentCounts, error: countError } = await supabase
        .from('admin_client_assignments')
        .select('admin_id, client_user_id')
        .order('admin_id');

      if (countError) {
        console.error("Error fetching assignment counts:", countError);
      }

      // Create count map
      const countMap = new Map<string, number>();
      assignmentCounts?.forEach(assignment => {
        const current = countMap.get(assignment.admin_id) || 0;
        countMap.set(assignment.admin_id, current + 1);
      });

      const response: AdminRole[] = admins?.map(admin => ({
        id: admin.id,
        email: admin.email,
        name: admin.name,
        admin_role: admin.admin_role,
        assigned_clients_count: countMap.get(admin.id) || 0
      })) || [];

      return { data: response };
    } catch (error: any) {
      console.error("Error in getAdmins:", error);
      return {
        error: {
          error: 'Failed to fetch admins',
          errorCode: 'FETCH_ERROR',
          details: error.message || String(error)
        }
      };
    }
  },

  // Get client assignments for a specific admin or all assignments
  async getClientAssignments(adminId?: string): Promise<{ data?: ClientAssignment[]; error?: ErrorResponse }> {
    try {
      const adminCheck = await checkAdminPermission();
      if (!adminCheck.isAdmin) {
        return {
          error: {
            error: 'Unauthorized - Admin access required',
            errorCode: 'UNAUTHORIZED'
          }
        };
      }

      // Sub-admins can only view their own assignments
      if (adminCheck.role === 'sub_admin') {
        adminId = adminCheck.adminId;
      }

      let query = supabase
        .from('admin_client_assignments')
        .select(`
          id,
          admin_id,
          client_user_id,
          assigned_at,
          assigned_by,
          user_profiles!admin_client_assignments_client_user_id_fkey (
            email,
            company_name
          )
        `);

      if (adminId) {
        query = query.eq('admin_id', adminId);
      }

      query = query.order('assigned_at', { ascending: false });

      const { data: assignments, error } = await query;

      if (error) throw error;

      const response: ClientAssignment[] = assignments?.map((assignment: any) => ({
        id: assignment.id,
        admin_id: assignment.admin_id,
        client_user_id: assignment.client_user_id,
        client_email: assignment.user_profiles?.email || 'Unknown',
        client_company: assignment.user_profiles?.company_name || '',
        assigned_at: assignment.assigned_at,
        assigned_by: assignment.assigned_by
      })) || [];

      return { data: response };
    } catch (error: any) {
      console.error("Error in getClientAssignments:", error);
      return {
        error: {
          error: 'Failed to fetch client assignments',
          errorCode: 'FETCH_ERROR',
          details: error.message || String(error)
        }
      };
    }
  },

  // Assign a client to a sub-admin
  async assignClient(request: AssignmentRequest): Promise<{ data?: { success: boolean }; error?: ErrorResponse }> {
    try {
      const adminCheck = await checkAdminPermission();
      if (!adminCheck.isAdmin || adminCheck.role !== 'super_admin') {
        return {
          error: {
            error: 'Unauthorized - Super admin access required',
            errorCode: 'UNAUTHORIZED'
          }
        };
      }

      const { adminId, clientUserId } = request;

      // Verify the admin exists and is a sub-admin
      const { data: targetAdmin, error: adminError } = await supabase
        .from('admin_profiles')
        .select('id, admin_role')
        .eq('id', adminId)
        .maybeSingle();

      if (adminError || !targetAdmin) {
        return {
          error: {
            error: 'Target admin not found',
            errorCode: 'NOT_FOUND'
          }
        };
      }

      if (targetAdmin.admin_role !== 'sub_admin') {
        return {
          error: {
            error: 'Can only assign clients to sub-admins',
            errorCode: 'INVALID_ROLE'
          }
        };
      }

      // Verify the client exists
      const { data: client, error: clientError } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('id', clientUserId)
        .maybeSingle();

      if (clientError || !client) {
        return {
          error: {
            error: 'Client not found',
            errorCode: 'NOT_FOUND'
          }
        };
      }

      // Create the assignment
      const { error: insertError } = await supabase
        .from('admin_client_assignments')
        .insert({
          admin_id: adminId,
          client_user_id: clientUserId,
          assigned_by: adminCheck.adminId
        });

      if (insertError) {
        if (insertError.code === '23505') { // Unique violation
          return {
            error: {
              error: 'Client is already assigned to this admin',
              errorCode: 'ALREADY_ASSIGNED'
            }
          };
        }
        throw insertError;
      }

      return { data: { success: true } };
    } catch (error: any) {
      console.error("Error in assignClient:", error);
      return {
        error: {
          error: 'Failed to assign client',
          errorCode: 'ASSIGNMENT_ERROR',
          details: error.message || String(error)
        }
      };
    }
  },

  // Unassign a client from a sub-admin
  async unassignClient(assignmentId: string): Promise<{ data?: { success: boolean }; error?: ErrorResponse }> {
    try {
      const adminCheck = await checkAdminPermission();
      if (!adminCheck.isAdmin || adminCheck.role !== 'super_admin') {
        return {
          error: {
            error: 'Unauthorized - Super admin access required',
            errorCode: 'UNAUTHORIZED'
          }
        };
      }

      const { error } = await supabase
        .from('admin_client_assignments')
        .delete()
        .eq('id', assignmentId);

      if (error) throw error;

      return { data: { success: true } };
    } catch (error: any) {
      console.error("Error in unassignClient:", error);
      return {
        error: {
          error: 'Failed to unassign client',
          errorCode: 'UNASSIGNMENT_ERROR',
          details: error.message || String(error)
        }
      };
    }
  },

  // Get unassigned clients (clients not assigned to any sub-admin)
  async getUnassignedClients(): Promise<{ data?: UserProfile[]; error?: ErrorResponse }> {
    try {
      const adminCheck = await checkAdminPermission();
      if (!adminCheck.isAdmin || adminCheck.role !== 'super_admin') {
        return {
          error: {
            error: 'Unauthorized - Super admin access required',
            errorCode: 'UNAUTHORIZED'
          }
        };
      }

      // First, get all assigned client IDs
      const { data: assignments, error: assignmentsError } = await supabase
        .from('admin_client_assignments')
        .select('client_user_id');

      if (assignmentsError) {
        console.error("Error fetching assignments:", assignmentsError);
        throw assignmentsError;
      }

      const assignedClientIds = assignments?.map(a => a.client_user_id) || [];

      // Get all user profiles
      const { data: allUsers, error } = await supabase
        .from('user_profiles')
        .select('id, email, company_name, created_at, updated_at')
        .order('email', { ascending: true });

      if (error) throw error;

      // Filter out assigned clients in JavaScript
      const unassignedClients = allUsers?.filter(user => 
        !assignedClientIds.includes(user.id)
      ) || [];

      const response: UserProfile[] = unassignedClients.map(client => ({
        id: client.id,
        email: client.email,
        company_name: client.company_name || '',
        created_at: client.created_at,
        updated_at: client.updated_at,
        article_count: 0 // We don't need counts for unassigned clients
      }));

      return { data: response };
    } catch (error: any) {
      console.error("Error in getUnassignedClients:", error);
      return {
        error: {
          error: 'Failed to fetch unassigned clients',
          errorCode: 'FETCH_ERROR',
          details: error.message || String(error)
        }
      };
    }
  }
};

// Admin Audit Logs API
export const adminAuditApi = {
  // Get audit logs with filtering (enhanced with role-based access)
  async getAuditLogs(params: AuditLogParams = {}): Promise<{ data?: AdminAuditLogsResponse; error?: ErrorResponse }> {
    try {
      const adminCheck = await checkAdminPermission();
      if (!adminCheck.isAdmin) {
        return {
          error: {
            error: 'Unauthorized - Admin access required',
            errorCode: 'UNAUTHORIZED'
          }
        };
      }

      // TODO: Implement actual audit log functionality
      // For now, return empty logs but with proper role checking
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

// Enhanced Bulk operations with role-based access
export const adminBulkApi = {
  // Bulk status change for multiple articles (enhanced with role-based access)
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

  // Bulk ownership transfer for multiple articles (enhanced with role-based access)
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

// Enhanced admin status check
export async function checkAdminStatus(): Promise<{ isAdmin: boolean; role?: 'super_admin' | 'sub_admin' }> {
  const result = await checkAdminPermission();
  return { isAdmin: result.isAdmin, role: result.role };
}