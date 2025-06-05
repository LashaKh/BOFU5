import express, { Request, Response, Router, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with service role key for admin access
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('Missing required environment variables for admin API');
}

const supabase = supabaseUrl && supabaseServiceRoleKey 
  ? createClient(supabaseUrl, supabaseServiceRoleKey)
  : null;

// Types for the API
interface ArticleListItem {
  id: string;
  title: string;
  user_id: string;
  user_email: string;
  user_company: string;
  product_name?: string;
  editing_status: 'draft' | 'editing' | 'review' | 'final';
  last_edited_at: string;
  last_edited_by: string;
  article_version: number;
  created_at: string;
  updated_at: string;
}

interface AdminArticlesResponse {
  articles: ArticleListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface ArticleDetail {
  id: string;
  title: string;
  user_id: string;
  user_email: string;
  user_company: string;
  product_name?: string;
  editing_status: 'draft' | 'editing' | 'review' | 'final';
  last_edited_at: string;
  last_edited_by: string;
  article_version: number;
  article_content: string;
  created_at: string;
  updated_at: string;
}

interface ErrorResponse {
  error: string;
  errorCode: string;
  details?: string;
}

// Async handler wrapper
const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => 
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

// Middleware function to verify admin status
async function verifyAdminAccess(authHeader: string | undefined): Promise<{ isAdmin: boolean; adminId?: string; error?: string }> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { isAdmin: false, error: 'Missing or invalid authorization header' };
  }

  const token = authHeader.substring(7);
  
  try {
    if (!supabase) {
      return { isAdmin: false, error: 'Supabase not configured' };
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return { isAdmin: false, error: 'Invalid authentication token' };
    }

    // Check if user is admin
    const { data: adminData, error: adminError } = await supabase
      .from('admin_profiles')
      .select('id')
      .eq('id', user.id)
      .single();

    if (adminError || !adminData) {
      return { isAdmin: false, error: 'Access denied: Admin privileges required' };
    }

    return { isAdmin: true, adminId: user.id };
  } catch (error) {
    return { isAdmin: false, error: 'Authentication verification failed' };
  }
}

// Log admin access to articles
async function logAdminAccess(
  adminId: string, 
  articleId: string | null, 
  action: string, 
  metadata: any = {}
): Promise<void> {
  try {
    if (!supabase) return;
    
    await supabase.rpc('log_admin_article_access', {
      p_article_id: articleId,
      p_action_type: action,
      p_notes: `Admin accessed articles via API`,
      p_metadata: metadata
    });
  } catch (error) {
    console.error('Failed to log admin access:', error);
    // Don't fail the request if logging fails
  }
}

// Create router
const router = Router();

// GET /api/admin/articles - List all articles with filtering and pagination
router.get('/articles', asyncHandler(async (req: Request, res: Response) => {
  if (!supabase) {
    return res.status(500).json({
      error: 'Backend not configured correctly. Missing environment variables.',
      errorCode: 'MISSING_ENV_VARS',
    });
  }

  // Verify admin access
  const authResult = await verifyAdminAccess(req.headers.authorization);
  if (!authResult.isAdmin) {
    return res.status(403).json({
      error: authResult.error || 'Access denied',
      errorCode: 'ACCESS_DENIED'
    });
  }

  // Parse query parameters
  const {
    page = '1',
    limit = '20',
    user_id,
    status,
    search,
    start_date,
    end_date,
    sort_by = 'last_edited_at',
    sort_order = 'desc'
  } = req.query;

  const pageNum = parseInt(page as string, 10);
  const limitNum = parseInt(limit as string, 10);
  const offset = (pageNum - 1) * limitNum;

  // Validate parameters
  if (pageNum < 1 || limitNum < 1 || limitNum > 100) {
    return res.status(400).json({
      error: 'Invalid pagination parameters',
      errorCode: 'INVALID_PARAMETERS'
    });
  }

  // Build query
  let query = supabase
    .from('content_briefs')
    .select(`
      id,
      title,
      user_id,
      product_name,
      editing_status,
      last_edited_at,
      last_edited_by,
      article_version,
      created_at,
      updated_at,
      user_profiles!user_id (
        email,
        company_name
      )
    `, { count: 'exact' });

  // Apply filters
  if (user_id) {
    query = query.eq('user_id', user_id);
  }

  if (status) {
    query = query.eq('editing_status', status);
  }

  if (search) {
    // Search in title, product_name, and article_content
    query = query.or(`title.ilike.%${search}%,product_name.ilike.%${search}%,article_content.ilike.%${search}%`);
  }

  if (start_date) {
    query = query.gte('last_edited_at', start_date);
  }

  if (end_date) {
    query = query.lte('last_edited_at', end_date);
  }

  // Apply sorting
  const validSortFields = ['last_edited_at', 'created_at', 'title', 'editing_status'];
  const sortField = validSortFields.includes(sort_by as string) ? sort_by as string : 'last_edited_at';
  const sortDirection = sort_order === 'asc' ? true : false;

  query = query.order(sortField, { ascending: sortDirection });

  // Apply pagination
  query = query.range(offset, offset + limitNum - 1);

  const { data: articles, error: queryError, count } = await query;

  if (queryError) {
    console.error('Supabase error fetching articles:', queryError);
    return res.status(500).json({
      error: 'Failed to fetch articles',
      errorCode: 'DATABASE_ERROR',
      details: queryError.message,
    });
  }

  // Transform the data to match our interface
  const transformedArticles: ArticleListItem[] = (articles || []).map(article => ({
    id: article.id,
    title: article.title || 'Untitled Article',
    user_id: article.user_id,
    user_email: (article.user_profiles as any)?.email || 'Unknown',
    user_company: (article.user_profiles as any)?.company_name || 'Unknown',
    product_name: article.product_name,
    editing_status: article.editing_status,
    last_edited_at: article.last_edited_at,
    last_edited_by: article.last_edited_by,
    article_version: article.article_version,
    created_at: article.created_at,
    updated_at: article.updated_at,
  }));

  // Log admin access
  await logAdminAccess(authResult.adminId!, null, 'view', {
    action: 'list_articles',
    filters: { user_id, status, search, start_date, end_date },
    result_count: transformedArticles.length
  });

  const totalPages = Math.ceil((count || 0) / limitNum);

  const response: AdminArticlesResponse = {
    articles: transformedArticles,
    total: count || 0,
    page: pageNum,
    limit: limitNum,
    totalPages,
  };

  return res.status(200).json(response);
}));

// GET /api/admin/articles/:id - Get specific article details
router.get('/articles/:id', asyncHandler(async (req: Request, res: Response) => {
  if (!supabase) {
    return res.status(500).json({
      error: 'Backend not configured correctly. Missing environment variables.',
      errorCode: 'MISSING_ENV_VARS',
    });
  }

  // Verify admin access
  const authResult = await verifyAdminAccess(req.headers.authorization);
  if (!authResult.isAdmin) {
    return res.status(403).json({
      error: authResult.error || 'Access denied',
      errorCode: 'ACCESS_DENIED'
    });
  }

  const { id } = req.params;

  if (!id) {
    return res.status(400).json({
      error: 'Article ID is required',
      errorCode: 'INVALID_PARAMETERS'
    });
  }

  // Fetch article with user information
  const { data: article, error: queryError } = await supabase
    .from('content_briefs')
    .select(`
      id,
      title,
      user_id,
      product_name,
      editing_status,
      last_edited_at,
      last_edited_by,
      article_version,
      article_content,
      created_at,
      updated_at,
      user_profiles!user_id (
        email,
        company_name
      )
    `)
    .eq('id', id)
    .single();

  if (queryError) {
    console.error('Supabase error fetching article:', queryError);
    return res.status(500).json({
      error: 'Failed to fetch article',
      errorCode: 'DATABASE_ERROR',
      details: queryError.message,
    });
  }

  if (!article) {
    return res.status(404).json({
      error: 'Article not found',
      errorCode: 'ARTICLE_NOT_FOUND'
    });
  }

  // Transform the data
  const articleDetail: ArticleDetail = {
    id: article.id,
    title: article.title || 'Untitled Article',
    user_id: article.user_id,
    user_email: (article.user_profiles as any)?.email || 'Unknown',
    user_company: (article.user_profiles as any)?.company_name || 'Unknown',
    product_name: article.product_name,
    editing_status: article.editing_status,
    last_edited_at: article.last_edited_at,
    last_edited_by: article.last_edited_by,
    article_version: article.article_version,
    article_content: article.article_content || '',
    created_at: article.created_at,
    updated_at: article.updated_at,
  };

  // Log admin access
  await logAdminAccess(authResult.adminId!, id, 'view', {
    action: 'view_article_detail',
    article_title: article.title
  });

  return res.status(200).json(articleDetail);
}));

// PUT /api/admin/articles/:id - Update article content and metadata
router.put('/articles/:id', asyncHandler(async (req: Request, res: Response) => {
  if (!supabase) {
    return res.status(500).json({
      error: 'Backend not configured correctly. Missing environment variables.',
      errorCode: 'MISSING_ENV_VARS',
    });
  }

  // Verify admin access
  const authResult = await verifyAdminAccess(req.headers.authorization);
  if (!authResult.isAdmin) {
    return res.status(403).json({
      error: authResult.error || 'Access denied',
      errorCode: 'ACCESS_DENIED'
    });
  }

  const { id } = req.params;
  const { 
    article_content, 
    editing_status, 
    title, 
    product_name,
    notes 
  } = req.body;

  if (!id) {
    return res.status(400).json({
      error: 'Article ID is required',
      errorCode: 'INVALID_PARAMETERS'
    });
  }

  // Build update object
  const updateData: any = {
    last_edited_by: authResult.adminId,
    last_edited_at: new Date().toISOString(),
  };

  if (article_content !== undefined) {
    updateData.article_content = article_content;
  }

  if (editing_status !== undefined) {
    updateData.editing_status = editing_status;
  }

  if (title !== undefined) {
    updateData.title = title;
  }

  if (product_name !== undefined) {
    updateData.product_name = product_name;
  }

  // Update the article
  const { data: updatedArticle, error: updateError } = await supabase
    .from('content_briefs')
    .update(updateData)
    .eq('id', id)
    .select(`
      id,
      title,
      user_id,
      product_name,
      editing_status,
      last_edited_at,
      last_edited_by,
      article_version,
      article_content,
      created_at,
      updated_at,
      user_profiles!user_id (
        email,
        company_name
      )
    `)
    .single();

  if (updateError) {
    console.error('Supabase error updating article:', updateError);
    return res.status(500).json({
      error: 'Failed to update article',
      errorCode: 'DATABASE_ERROR',
      details: updateError.message,
    });
  }

  if (!updatedArticle) {
    return res.status(404).json({
      error: 'Article not found',
      errorCode: 'ARTICLE_NOT_FOUND'
    });
  }

  // Log admin access
  await logAdminAccess(authResult.adminId!, id, 'edit', {
    action: 'update_article',
    changes: Object.keys(updateData),
    notes: notes || 'Admin updated article'
  });

  // Transform the response
  const articleDetail: ArticleDetail = {
    id: updatedArticle.id,
    title: updatedArticle.title || 'Untitled Article',
    user_id: updatedArticle.user_id,
    user_email: (updatedArticle.user_profiles as any)?.email || 'Unknown',
    user_company: (updatedArticle.user_profiles as any)?.company_name || 'Unknown',
    product_name: updatedArticle.product_name,
    editing_status: updatedArticle.editing_status,
    last_edited_at: updatedArticle.last_edited_at,
    last_edited_by: updatedArticle.last_edited_by,
    article_version: updatedArticle.article_version,
    article_content: updatedArticle.article_content || '',
    created_at: updatedArticle.created_at,
    updated_at: updatedArticle.updated_at,
  };

  return res.status(200).json(articleDetail);
}));

// GET /api/admin/users - List users for admin selection
router.get('/users', asyncHandler(async (req: Request, res: Response) => {
  if (!supabase) {
    return res.status(500).json({
      error: 'Backend not configured correctly. Missing environment variables.',
      errorCode: 'MISSING_ENV_VARS',
    });
  }

  // Verify admin access
  const authResult = await verifyAdminAccess(req.headers.authorization);
  if (!authResult.isAdmin) {
    return res.status(403).json({
      error: authResult.error || 'Access denied',
      errorCode: 'ACCESS_DENIED'
    });
  }

  const { search, limit = '50' } = req.query;
  const limitNum = parseInt(limit as string, 10);

  // Build query for users
  let query = supabase
    .from('user_profiles')
    .select(`
      id,
      email,
      company_name,
      created_at,
      updated_at
    `);

  // Apply search filter
  if (search) {
    query = query.or(`email.ilike.%${search}%,company_name.ilike.%${search}%`);
  }

  // Apply limit
  query = query.limit(limitNum);

  const { data: users, error: queryError } = await query;

  if (queryError) {
    console.error('Supabase error fetching users:', queryError);
    return res.status(500).json({
      error: 'Failed to fetch users',
      errorCode: 'DATABASE_ERROR',
      details: queryError.message,
    });
  }

  // Get article counts for each user
  const usersWithCounts = await Promise.all((users || []).map(async (user) => {
    const { count } = await supabase
      .from('content_briefs')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id);

    return {
      ...user,
      article_count: count || 0
    };
  }));

  // Log admin access
  await logAdminAccess(authResult.adminId!, null, 'view', {
    action: 'list_users',
    search: search || null,
    result_count: usersWithCounts.length
  });

  return res.status(200).json({
    users: usersWithCounts
  });
}));

// GET /api/admin/audit-logs - Get audit logs
router.get('/audit-logs', asyncHandler(async (req: Request, res: Response) => {
  if (!supabase) {
    return res.status(500).json({
      error: 'Backend not configured correctly. Missing environment variables.',
      errorCode: 'MISSING_ENV_VARS',
    });
  }

  // Verify admin access
  const authResult = await verifyAdminAccess(req.headers.authorization);
  if (!authResult.isAdmin) {
    return res.status(403).json({
      error: authResult.error || 'Access denied',
      errorCode: 'ACCESS_DENIED'
    });
  }

  const {
    article_id,
    admin_id,
    action_type,
    from_date,
    to_date,
    limit = '100',
    offset = '0'
  } = req.query;

  const limitNum = parseInt(limit as string, 10);
  const offsetNum = parseInt(offset as string, 10);

  // Call the database function to get audit logs
  const { data: logs, error: queryError } = await supabase
    .rpc('get_admin_article_access_logs', {
      p_article_id: article_id || null,
      p_admin_id: admin_id || null,
      p_action_type: action_type || null,
      p_from_date: from_date || null,
      p_to_date: to_date || null,
      p_limit: limitNum,
      p_offset: offsetNum
    });

  if (queryError) {
    console.error('Supabase error fetching audit logs:', queryError);
    return res.status(500).json({
      error: 'Failed to fetch audit logs',
      errorCode: 'DATABASE_ERROR',
      details: queryError.message,
    });
  }

  return res.status(200).json({
    logs: logs || []
  });
}));

export default router; 