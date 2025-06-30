import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

// Ensure environment variables are loaded. Values should be in your .env.local file.
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const openaiApiKey = process.env.OPENAI_API_KEY;
const universalAssistantId = process.env.UNIVERSAL_ASSISTANT_ID;

// Basic validation for environment variables
if (!supabaseUrl || !supabaseServiceRoleKey || !openaiApiKey || !universalAssistantId) {
  console.error('Missing required environment variables for /api/chat');
  // In a real app, you might throw an error or handle this more gracefully
}

// Initialize Supabase client if variables are present
const supabase = supabaseUrl && supabaseServiceRoleKey ? createClient(supabaseUrl, supabaseServiceRoleKey) : null;

// Initialize OpenAI client if variables are present
const openai = openaiApiKey ? new OpenAI({ apiKey: openaiApiKey }) : null;

interface ChatRequestBody {
  productId?: string; // Made optional to support basic AI mode
  message: string;
  threadId?: string;
  articleTitle?: string; // For context in basic AI mode
  articleContent?: string; // For context in basic AI mode
}

// Define potential structured error responses
const ErrorTypes = {
  MISSING_ENV_VARS: 'MISSING_ENV_VARS',
  INVALID_INPUT: 'INVALID_INPUT',
  SUPABASE_ERROR: 'SUPABASE_ERROR',
  PRODUCT_NOT_FOUND: 'PRODUCT_NOT_FOUND',
  VECTOR_STORE_NOT_FOUND: 'VECTOR_STORE_NOT_FOUND', // If vector store ID is missing/invalid
  OPENAI_API_ERROR: 'OPENAI_API_ERROR',
  THREAD_CREATION_ERROR: 'THREAD_CREATION_ERROR',
  RUN_CREATION_ERROR: 'RUN_CREATION_ERROR',
  ASSISTANT_ERROR: 'ASSISTANT_ERROR',
} as const;

type ErrorCode = typeof ErrorTypes[keyof typeof ErrorTypes];

interface ErrorResponse {
  error: string;
  errorCode: ErrorCode;
  details?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<any | ErrorResponse>
) {
  if (!supabase || !openai) {
    return res.status(500).json({
      error: 'Backend not configured correctly. Missing environment variables.',
      errorCode: ErrorTypes.MISSING_ENV_VARS,
    });
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ 
      error: `Method ${req.method} Not Allowed`, 
      errorCode: ErrorTypes.INVALID_INPUT 
    });
  }

  const { productId, message, threadId: clientThreadId, articleTitle, articleContent } = req.body as ChatRequestBody;

  // 1. Input Validation
  if (!message || typeof message !== 'string' || message.trim() === '') {
    return res.status(400).json({ error: 'Missing or invalid message', errorCode: ErrorTypes.INVALID_INPUT });
  }
  if (productId && typeof productId !== 'string') {
    return res.status(400).json({ error: 'Invalid productId format', errorCode: ErrorTypes.INVALID_INPUT });
  }
  if (clientThreadId && typeof clientThreadId !== 'string') {
    return res.status(400).json({ error: 'Invalid threadId format', errorCode: ErrorTypes.INVALID_INPUT });
  }

  try {
    // 2. Handle Enhanced Mode (with product) vs Basic Mode (without product)
    let productData = null;
    let productName = null;
    let productDescription = null;
    let vectorStoreId = null;

    if (productId) {
      // Enhanced mode: Fetch Product Details from Supabase
      const { data: fetchedProductData, error: productError } = await supabase
        .from('products')
        .select('name, description, openai_vector_store_id')
        .eq('id', productId)
        .single();

      if (productError) {
        console.error('Supabase error fetching product:', productError);
        return res.status(500).json({
          error: 'Failed to fetch product details from Supabase.',
          errorCode: ErrorTypes.SUPABASE_ERROR,
          details: productError.message,
        });
      }

      if (!fetchedProductData) {
        return res.status(404).json({
          error: `Product with ID '${productId}' not found.`,
          errorCode: ErrorTypes.PRODUCT_NOT_FOUND,
        });
      }

      productData = fetchedProductData;
      productName = productData.name;
      productDescription = productData.description;
      vectorStoreId = productData.openai_vector_store_id;

      if (!vectorStoreId) {
        console.error(`Product ${productId} (${productName}) is missing an openai_vector_store_id.`);
        return res.status(500).json({
          error: `Configuration error: Product '${productName}' does not have an associated vector store ID.`,
          errorCode: ErrorTypes.VECTOR_STORE_NOT_FOUND,
        });
      }

      console.log(`🧠 Enhanced mode: Using vector store ${vectorStoreId} for product "${productName}"`);
    } else {
      console.log('🤖 Basic mode: No product context, using general AI assistant');
    }

    // 3. Manage OpenAI Thread
    let currentThreadId = clientThreadId;
    if (!currentThreadId) {
      try {
        const threadOptions: any = {};
        
        // Only add vector store for enhanced mode
        if (vectorStoreId) {
          threadOptions.tool_resources = {
            file_search: {
              vector_store_ids: [vectorStoreId]
            }
          };
        }
        
        const thread = await openai.beta.threads.create(threadOptions);
        currentThreadId = thread.id;
        console.log(`🧵 Created thread ${currentThreadId} with options:`, JSON.stringify(threadOptions, null, 2));
      } catch (e: any) {
        console.error('OpenAI error creating thread:', e);
        return res.status(500).json({
          error: 'Failed to create conversation thread with OpenAI.',
          errorCode: ErrorTypes.THREAD_CREATION_ERROR,
          details: e.message,
        });
      }
    }

    // 4. Add User Message to Thread
    try {
      await openai.beta.threads.messages.create(currentThreadId!, {
        role: 'user',
        content: message,
      });
    } catch (e:any) {
      console.error('OpenAI error adding message to thread:', e);
      return res.status(500).json({
        error: 'Failed to add message to conversation thread.',
        errorCode: ErrorTypes.OPENAI_API_ERROR,
        details: e.message,
      });
    }

    // 5. Create and Stream Run (or poll)
    const runOptions: any = {
      assistant_id: universalAssistantId!,
    };

    // Don't add vector store to run - it should already be on the thread
    console.log(productId && productName && vectorStoreId 
      ? `🔍 Using pre-configured assistant ${universalAssistantId} with vector store ${vectorStoreId} for product: ${productName}`
      : '🤖 Using pre-configured assistant in basic mode (no vector store)');
    
    try {
      console.log(`🚀 Creating OpenAI run with pre-configured assistant`);
      console.log(`🔧 Run options:`, JSON.stringify(runOptions, null, 2));
      
      const run = await openai.beta.threads.runs.createAndPoll(currentThreadId!, runOptions);
      console.log(`✅ Run completed with status: ${run.status}`);

      if (run.status === 'completed') {
        const messages = await openai.beta.threads.messages.list(run.thread_id);
        const assistantMessages = messages.data.filter(m => m.role === 'assistant');
        const lastAssistantMessage = assistantMessages[0]; 
        
        if (lastAssistantMessage && lastAssistantMessage.content[0]?.type === 'text') {
          const response = lastAssistantMessage.content[0].text.value;
          console.log(`📝 Assistant response: ${response.substring(0, 200)}...`);
          
          return res.status(200).json({
            response: response,
            threadId: run.thread_id,
          });
        } else {
          console.log(`⚠️ Unexpected message format:`, lastAssistantMessage);
          return res.status(200).json({
            response: 'Assistant responded, but the message format is unexpected.',
            threadId: run.thread_id,
          });
        }
      } else if (run.status === 'failed' || run.status === 'cancelled' || run.status === 'expired') {
        console.error('OpenAI Run failed:', run.last_error || 'Unknown reason', run.status);
        return res.status(500).json({
          error: `Assistant run failed with status: ${run.status}`,
          errorCode: ErrorTypes.ASSISTANT_ERROR,
          details: run.last_error ? run.last_error.message : 'Run did not complete successfully.',
        });
      } else {
        // Handle other statuses like 'requires_action' if using tools, or just wait if polling
        // For createAndPoll, it should resolve to a terminal status.
        return res.status(500).json({
          error: `Assistant run ended with unexpected status: ${run.status}`,
          errorCode: ErrorTypes.ASSISTANT_ERROR,
        });
      }

    } catch (e: any) {
      console.error('OpenAI error creating or polling run:', e);
      return res.status(500).json({
        error: 'Failed to get response from assistant.',
        errorCode: ErrorTypes.RUN_CREATION_ERROR,
        details: e.message,
      });
    }

  } catch (error: any) {
    console.error('Unhandled error in /api/chat:', error);
    return res.status(500).json({
      error: 'An unexpected error occurred.',
      errorCode: ErrorTypes.OPENAI_API_ERROR, // Generic fallback
      details: error.message,
    });
  }
}
