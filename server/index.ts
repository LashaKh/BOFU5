import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
// import adminRoutes from './adminRoutes.ts';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

// Get the directory name in ES module scope
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure dotenv to load .env file from the server directory
dotenv.config({ path: path.resolve(__dirname, '.env') });
// Also load from root .env
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY
});

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://nhxjashreguofalhaofj.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5oeGphc2hyZWd1b2ZhbGhhb2ZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM1MDg4NDQsImV4cCI6MjA1OTA4NDg0NH0.yECqdVt448XiKOZZovyFHfYLsIcwDRhPyPUIUpvy_to';
const supabase = createClient(supabaseUrl, supabaseKey);
console.log('Supabase initialized with URL:', supabaseUrl);

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174'],
  credentials: true
})); // Enable CORS for Vite dev server
app.use(bodyParser.json()); // Parse JSON bodies

// Simple Product Type (align with ChatWindow.tsx or Supabase eventually)
interface Product {
  id: string;
  name: string;
  openai_vector_store_id?: string; // Important for Task 13
  description?: string; // Important for Task 13
}

// Fetch product details from Supabase
const getProductDetails = async (productId: string): Promise<Product | null> => {
  console.log(`Backend: Fetching details for product ${productId}`);
  
  try {
    // First try to get from products table
    console.log('Querying products table...');
    const { data: products, error } = await supabase
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
    const { data: approvedProducts, error: approvedError } = await supabase
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

app.get('/', (req: Request, res: Response) => {
  res.send('Chat API Server is running!');
});

// Mount admin routes
// app.use('/api/admin', adminRoutes);

// Chat API endpoint
app.post('/api/chat', async (req: Request, res: Response): Promise<void> => {
  const { message, productId, threadId, articleTitle, articleContent } = req.body;

  if (!message) {
    res.status(400).json({ error: 'Message is required.' });
    return;
  }

  // Handle no product selected - use your assistant without KB
  if (!productId) {
    console.log(`Backend: No product selected - using assistant without KB: "${message}"`);
    
    try {
      const assistantId = process.env.VITE_UNIVERSAL_ASSISTANT_ID || process.env.UNIVERSAL_ASSISTANT_ID;
      
      if (!assistantId) {
        throw new Error('Universal Assistant ID not configured');
      }

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
      res.json(assistantResponse);
      return;
      
    } catch (error) {
      console.error('Assistant API Error (no KB):', error);
      res.status(500).json({ 
        error: 'Failed to generate AI response',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
      return;
    }
  }

  // KB Assistant path - requires productId
  console.log(`Backend: Received message for product ${productId}: "${message}" (Thread: ${threadId || 'new'})`);

  const productDetails = await getProductDetails(productId);

  if (!productDetails) {
    res.status(404).json({ error: 'Product not found.' });
    return;
  }

  try {
    // Get the universal assistant ID from environment
    const assistantId = process.env.VITE_UNIVERSAL_ASSISTANT_ID || process.env.UNIVERSAL_ASSISTANT_ID;
    
    if (!assistantId) {
      throw new Error('Universal Assistant ID not configured');
    }

    console.log('Using OpenAI Assistant API with ID:', assistantId);

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

    // Create run with vector store attached (if available) - DON'T modify the assistant permanently
    console.log('Running assistant...');
    const runOptions: any = {
      assistant_id: assistantId
    };

    // Attach vector store to THIS RUN ONLY
    if (productDetails.openai_vector_store_id) {
      try {
        // Check if vector store exists
        await openai.beta.vectorStores.retrieve(productDetails.openai_vector_store_id);
        
        runOptions.tool_resources = {
          file_search: {
            vector_store_ids: [productDetails.openai_vector_store_id]
          }
        };
        
        console.log(`✅ Attaching vector store ${productDetails.openai_vector_store_id} to run for product: ${productDetails.name}`);
      } catch (vectorStoreError) {
        console.warn(`⚠️ Vector store ${productDetails.openai_vector_store_id} not found or inaccessible`);
      }
    } else {
      console.log('No vector store ID available for this product');
    }

    const run = await openai.beta.threads.runs.create(activeThreadId, runOptions);

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
    res.json(assistantResponse);
    
  } catch (error) {
    console.error('OpenAI Assistant API Error:', error);
    res.status(500).json({ 
      error: 'Failed to generate AI response',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Error handling middleware
app.use((error: Error, req: Request, res: Response, _next: NextFunction) => {
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
