import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

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

// Initialize OpenAI client for chat functionality
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY
});

// Initialize anon Supabase client for chat queries
const supabaseAnonUrl = process.env.VITE_SUPABASE_URL || 'https://nhxjashreguofalhaofj.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5oeGphc2hyZWd1b2ZhbGhhb2ZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM1MDg4NDQsImV4cCI6MjA1OTA4NDg0NH0.yECqdVt448XiKOZZovyFHfYLsIcwDRhPyPUIUpvy_to';
const supabaseAnon = createClient(supabaseAnonUrl, supabaseAnonKey);
console.log('Supabase initialized with URL:', supabaseAnonUrl);

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

// Fetch product details from Supabase
const getProductDetails = async (productId) => {
  console.log(`Backend: Fetching details for product ${productId}`);
  
  try {
    // First try to get from products table
    console.log('Querying products table...');
    const { data: products, error } = await supabaseAnon
      .from('products')
      .select('id, name, description, openai_vector_store_id')
      .eq('id', productId);
    
    console.log('Products query result:', { products, error });
    
    if (!error && products && products.length > 0) {
      const product = products[0];
      console.log('Found product in products table:', product.name, 'with vector store:', product.openai_vector_store_id);
      return product;
    }
    
    if (error) {
      console.log('Error fetching from products table:', error.message);
    }
    
    // If not found, try approved_products table
    const { data: approvedProducts, error: approvedError } = await supabaseAnon
      .from('approved_products')
      .select('id, product_name, product_description')
      .eq('id', productId);
    
    if (!approvedError && approvedProducts && approvedProducts.length > 0) {
      const approvedProduct = approvedProducts[0];
      console.log('Found product in approved_products table:', approvedProduct.product_name);
      return {
        id: approvedProduct.id,
        name: approvedProduct.product_name,
        description: approvedProduct.product_description,
        openai_vector_store_id: undefined
      };
    }
    
    console.log('Product not found in either table');
    return null;
  } catch (error) {
    console.error('Error fetching product:', error);
    return null;
  }
};

// Chat API endpoint with dynamic KB appending
app.post('/api/chat', asyncHandler(async (req, res) => {
  const { message, productId, threadId, articleTitle, articleContent } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Message is required.' });
  }

  const assistantId = process.env.VITE_UNIVERSAL_ASSISTANT_ID || process.env.UNIVERSAL_ASSISTANT_ID;
  
  if (!assistantId) {
    return res.status(500).json({ error: 'Universal Assistant ID not configured' });
  }

  // Handle no product selected - use your assistant without KB
  if (!productId) {
    console.log(`Backend: No product selected - using assistant without KB: "${message}"`);
    
    try {
      // Clear any vector stores from assistant when no product is selected
      await openai.beta.assistants.update(assistantId, {
        tool_resources: {
          file_search: {
            vector_store_ids: []
          }
        }
        // DO NOT update instructions - keep user's existing assistant prompt
      });
      console.log('Cleared all vector stores - assistant running without KB');

      // Create or retrieve thread
      let activeThreadId = threadId;
      if (!activeThreadId) {
        const thread = await openai.beta.threads.create();
        activeThreadId = thread.id;
        console.log('Created new thread:', activeThreadId);
      }

      // Add message to thread
      await openai.beta.threads.messages.create(activeThreadId, {
        role: "user",
        content: message
      });

      // Run the assistant
      console.log('Running assistant without KB...');
      const run = await openai.beta.threads.runs.create(activeThreadId, {
        assistant_id: assistantId
      });

      // Poll for completion
      let runStatus = await openai.beta.threads.runs.retrieve(activeThreadId, run.id);
      let attempts = 0;
      const maxAttempts = 60;
      
      while (runStatus.status !== 'completed' && runStatus.status !== 'failed' && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        runStatus = await openai.beta.threads.runs.retrieve(activeThreadId, run.id);
        console.log(`Run status: ${runStatus.status} (attempt ${attempts + 1}/${maxAttempts})`);
        attempts++;
      }

      if (runStatus.status === 'failed') {
        throw new Error('Assistant run failed: ' + (runStatus.last_error?.message || 'Unknown error'));
      }

      if (runStatus.status !== 'completed') {
        throw new Error('Assistant run timed out');
      }

      // Get the assistant's response
      const messages = await openai.beta.threads.messages.list(activeThreadId);
      const lastMessage = messages.data[0];
      
      let responseText = '';
      if (lastMessage && lastMessage.content[0].type === 'text') {
        responseText = lastMessage.content[0].text.value;
      }

      if (!responseText) {
        throw new Error('No response from assistant');
      }

      const assistantResponse = {
        response: responseText,
        threadId: activeThreadId
      };
      
      console.log('Backend: Sending assistant response (no KB)');
      return res.json(assistantResponse);
      
    } catch (error) {
      console.error('Assistant API Error (no KB):', error);
      return res.status(500).json({ 
        error: 'Failed to generate AI response',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // KB Assistant path - requires productId for dynamic KB appending
  console.log(`Backend: Received message for product ${productId}: "${message}" (Thread: ${threadId || 'new'})`);

  const productDetails = await getProductDetails(productId);

  if (!productDetails) {
    return res.status(404).json({ error: 'Product not found.' });
  }

  try {
    console.log('Using OpenAI Assistant API with ID:', assistantId);

    // Create or retrieve thread
    let activeThreadId = threadId;
    if (!activeThreadId) {
      const thread = await openai.beta.threads.create();
      activeThreadId = thread.id;
      console.log('Created new thread:', activeThreadId);
    }

    // Dynamically append only the product's KB - DO NOT change system prompt
    try {
      if (productDetails.openai_vector_store_id) {
        // First check if vector store exists before updating
        try {
          await openai.beta.vectorStores.retrieve(productDetails.openai_vector_store_id);
          
          // Vector store exists, append it to assistant
          await openai.beta.assistants.update(assistantId, {
            tool_resources: {
              file_search: {
                vector_store_ids: [productDetails.openai_vector_store_id]
              }
            }
            // DO NOT update instructions - keep user's existing assistant prompt
          });
          console.log('Appended product KB vector store:', productDetails.openai_vector_store_id);
        } catch (vectorStoreError) {
          console.warn('Vector store not found:', productDetails.openai_vector_store_id, 'Skipping KB attachment');
          // Continue without vector store - assistant will work with its existing configuration
        }
      } else {
        console.log('No vector store ID available for this product');
      }
    } catch (updateError) {
      console.warn('Failed to update assistant, continuing with existing configuration:', updateError);
      // Continue anyway - the assistant will still work with its existing configuration
    }

    // Add message to thread
    await openai.beta.threads.messages.create(activeThreadId, {
      role: "user",
      content: message
    });

    // Run the assistant
    console.log('Running assistant...');
    const run = await openai.beta.threads.runs.create(activeThreadId, {
      assistant_id: assistantId
    });

    // Poll for completion
    let runStatus = await openai.beta.threads.runs.retrieve(activeThreadId, run.id);
    let attempts = 0;
    const maxAttempts = 60; // 60 seconds timeout
    
    while (runStatus.status !== 'completed' && runStatus.status !== 'failed' && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      runStatus = await openai.beta.threads.runs.retrieve(activeThreadId, run.id);
      console.log(`Run status: ${runStatus.status} (attempt ${attempts + 1}/${maxAttempts})`);
      attempts++;
    }

    if (runStatus.status === 'failed') {
      throw new Error('Assistant run failed: ' + (runStatus.last_error?.message || 'Unknown error'));
    }

    if (runStatus.status !== 'completed') {
      throw new Error('Assistant run timed out');
    }

    // Get the assistant's response
    const messages = await openai.beta.threads.messages.list(activeThreadId);
    const lastMessage = messages.data[0];
    
    let responseText = '';
    if (lastMessage && lastMessage.content[0].type === 'text') {
      responseText = lastMessage.content[0].text.value;
    }

    if (!responseText) {
      throw new Error('No response from assistant');
    }

    const assistantResponse = {
      response: responseText,
      threadId: activeThreadId
    };
    
    console.log('Backend: Sending AI assistant response');
    return res.json(assistantResponse);
    
  } catch (error) {
    console.error('OpenAI Assistant API Error:', error);
    return res.status(500).json({ 
      error: 'Failed to generate AI response',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
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