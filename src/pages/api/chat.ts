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
  productId: string;
  message: string;
  threadId?: string;
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

  const { productId, message, threadId: clientThreadId } = req.body as ChatRequestBody;

  // 1. Rigorous Input Validation
  if (!productId || typeof productId !== 'string' || productId.trim() === '') {
    return res.status(400).json({ error: 'Missing or invalid productId', errorCode: ErrorTypes.INVALID_INPUT });
  }
  if (!message || typeof message !== 'string' || message.trim() === '') {
    return res.status(400).json({ error: 'Missing or invalid message', errorCode: ErrorTypes.INVALID_INPUT });
  }
  if (clientThreadId && typeof clientThreadId !== 'string') {
    return res.status(400).json({ error: 'Invalid threadId format', errorCode: ErrorTypes.INVALID_INPUT });
  }

  try {
    // 2. Fetch Product Details from Supabase
    const { data: productData, error: productError } = await supabase
      .from('products') // Assuming your table is named 'products'
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

    if (!productData) {
      return res.status(404).json({
        error: `Product with ID '${productId}' not found.`,
        errorCode: ErrorTypes.PRODUCT_NOT_FOUND,
      });
    }

    const { name: productName, description: productDescription, openai_vector_store_id: vectorStoreId } = productData;

    if (!vectorStoreId) {
      console.error(`Product ${productId} (${productName}) is missing an openai_vector_store_id.`);
      return res.status(500).json({
        error: `Configuration error: Product '${productName}' does not have an associated vector store ID.`,
        errorCode: ErrorTypes.VECTOR_STORE_NOT_FOUND,
      });
    }

    // 3. Manage OpenAI Thread
    let currentThreadId = clientThreadId;
    if (!currentThreadId) {
      try {
        const thread = await openai.beta.threads.create({
          tool_resources: {
            file_search: {
              vector_store_ids: [vectorStoreId] // Associate vector store at thread creation if possible, or per-run
            }
          }
        });
        currentThreadId = thread.id;
      } catch (e: any) {
        console.error('OpenAI error creating thread:', e);
        return res.status(500).json({
          error: 'Failed to create conversation thread with OpenAI.',
          errorCode: ErrorTypes.THREAD_CREATION_ERROR,
          details: e.message,
        });
      }
    } else {
      // Optionally, verify if the existing threadId is valid or update its tool_resources if needed
      // For now, we'll assume a provided threadId is valid and its resources are managed per-run
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
    // Inject product description and dynamically associate vector store per run
    const runInstructions = `You are a helpful assistant for the product: ${productName}. 
    Product Description: ${productDescription || 'No description available.'} 
    Please use the provided documents in the vector store to answer questions about this product. 
    If the information is not in the documents, say that you do not have that information.`;
    
    try {
      const run = await openai.beta.threads.runs.createAndPoll(currentThreadId!, {
        assistant_id: universalAssistantId!,
        instructions: runInstructions,
        tool_resources: {
          file_search: {
            vector_store_ids: [vectorStoreId]
          }
        },
        // stream: true, // if you want to handle streaming on the backend later
      });

      if (run.status === 'completed') {
        const messages = await openai.beta.threads.messages.list(run.thread_id);
        const assistantMessages = messages.data.filter(m => m.role === 'assistant');
        // Return the latest assistant message, or all if preferred
        const lastAssistantMessage = assistantMessages[0]; 
        
        if (lastAssistantMessage && lastAssistantMessage.content[0]?.type === 'text') {
          return res.status(200).json({
            response: lastAssistantMessage.content[0].text.value,
            threadId: run.thread_id, // Send back the threadId (new or existing)
          });
        } else {
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
