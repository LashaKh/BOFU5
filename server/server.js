import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize Supabase client with service role key for admin access
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('Missing required environment variables for admin API');
}

const supabase = supabaseUrl && supabaseServiceRoleKey 
  ? createClient(supabaseUrl, supabaseServiceRoleKey)
  : null;

// Middleware
app.use(cors());
app.use(express.json());

// Root route
app.get('/', (req, res) => {
  res.json({ message: 'Chat API Server is running!' });
});

// Async handler wrapper
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Middleware function to verify admin status
async function verifyAdminAccess(authHeader) {
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

// GET /api/admin/users - List users for admin selection
app.get('/api/admin/users', asyncHandler(async (req, res) => {
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
  const limitNum = parseInt(limit, 10);

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

  return res.status(200).json({
    users: usersWithCounts
  });
}));

// GET /api/admin/articles - List articles (simplified version)
app.get('/api/admin/articles', asyncHandler(async (req, res) => {
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

  const { page = '1', limit = '20' } = req.query;
  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const offset = (pageNum - 1) * limitNum;

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

  // Transform the data
  const transformedArticles = (articles || []).map(article => ({
    id: article.id,
    title: article.title || 'Untitled Article',
    user_id: article.user_id,
    user_email: article.user_profiles?.email || 'Unknown',
    user_company: article.user_profiles?.company_name || 'Unknown',
    product_name: article.product_name,
    editing_status: article.editing_status,
    last_edited_at: article.last_edited_at,
    last_edited_by: article.last_edited_by,
    article_version: article.article_version,
    created_at: article.created_at,
    updated_at: article.updated_at,
  }));

  const totalPages = Math.ceil((count || 0) / limitNum);

  return res.status(200).json({
    articles: transformedArticles,
    total: count || 0,
    page: pageNum,
    limit: limitNum,
    totalPages,
  });
}));

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    error: 'Internal server error',
    errorCode: 'INTERNAL_ERROR',
    details: error.message
  });
});

app.listen(PORT, () => {
  console.log(`Backend server is running on http://localhost:${PORT}`);
  console.log(`Admin API available at http://localhost:${PORT}/api/admin`);
}); 