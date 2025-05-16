import express, { Request, Response } from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name in ES module scope
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure dotenv to load .env file from the server directory
dotenv.config({ path: path.resolve(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors()); // Enable CORS for all routes
app.use(bodyParser.json()); // Parse JSON bodies

// Simple Product Type (align with ChatWindow.tsx or Supabase eventually)
interface Product {
  id: string;
  name: string;
  openai_vector_store_id?: string; // Important for Task 13
  description?: string; // Important for Task 13
}

// Mock function to simulate fetching product details (replace with Supabase later)
const getProductDetails = async (productId: string): Promise<Product | null> => {
  console.log(`Backend: Fetching details for product ${productId}`);
  // In a real scenario, fetch from Supabase
  // Example: const { data, error } = await supabase.from('products').select('*').eq('id', productId).single();
  const mockProducts: Product[] = [
    { id: 'prod_real_1', name: 'Supabase Product One', openai_vector_store_id: 'vs_mock_1', description: 'This is Supabase Product One, known for its robust features.' },
    { id: 'prod_real_2', name: 'Supabase Product Two', openai_vector_store_id: 'vs_mock_2', description: 'Product Two is designed for scalability and performance.' },
    { id: 'prod_real_3', name: 'Supabase Product Three Deluxe', openai_vector_store_id: 'vs_mock_3', description: 'The Deluxe version of Product Three offers premium capabilities.' },
    { id: 'fallback1', name: 'Fallback Product A', openai_vector_store_id: 'vs_fallback_1', description: 'Fallback A provides essential services.' },
    { id: 'fallback2', name: 'Fallback Product B', openai_vector_store_id: 'vs_fallback_2', description: 'Fallback B is a basic offering.' },
  ];
  return mockProducts.find(p => p.id === productId) || null;
};

app.get('/', (req: Request, res: Response) => {
  res.send('Chat API Server is running!');
});

// Chat API endpoint
app.post('/api/chat', async (req: Request, res: Response): Promise<void> => {
  const { message, productId, threadId } = req.body;

  if (!message || !productId) {
    res.status(400).json({ error: 'Message and productId are required.' });
    return;
  }

  console.log(`Backend: Received message for product ${productId}: "${message}" (Thread: ${threadId || 'new'})`);

  const productDetails = await getProductDetails(productId);

  if (!productDetails) {
    res.status(404).json({ error: 'Product not found.' });
    return;
  }

  // --- OpenAI Interaction Logic will go here ---
  // For now, simulate a delay and mock a response
  // 1. Retrieve universal assistant (ID from env var: process.env.UNIVERSAL_ASSISTANT_ID)
  // 2. Connect assistant to product's vector store (productDetails.openai_vector_store_id)
  // 3. Inject product description into system prompt (productDetails.description)
  // 4. Create/use thread (threadId)
  // 5. Send message to OpenAI, get response (using process.env.OPENAI_API_KEY)

  await new Promise(resolve => setTimeout(resolve, 1500)); // Make setTimeout awaitable

  const assistantResponse = {
    text: `Backend mock response for "${message.substring(0, 20)}..." regarding ${productDetails.name}. Vector Store: ${productDetails.openai_vector_store_id}. Context: ${productDetails.description?.substring(0,30)}...`,
    sender: 'assistant',
    timestamp: new Date(),
    threadId: threadId || `thread_${Date.now()}` // Send back a threadId if new
  };
  console.log('Backend: Sending mock response:', assistantResponse);
  res.json(assistantResponse);
});

app.listen(PORT, () => {
  console.log(`Backend server is running on http://localhost:${PORT}`);
});
