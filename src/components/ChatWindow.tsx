import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import OpenAI from 'openai'; 
import { supabase } from '../lib/supabase'; 

// Import the sophisticated chat interface
import ChatInterface from './chat/ChatInterface';

// Import types
import { Product, Message, ChatStatus } from '../types/chat';

interface ChatWindowProps {
  isOpen: boolean;
  onClose: () => void;
}

type LegacyProduct = {
  id: string;
  name: string;
  openai_vector_store_id?: string; 
  description?: string; 
};

type LegacyMessage = {
  id: string;
  text: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
  threadId?: string;
};

const getFriendlyErrorMessage = (errorCode: string | null, defaultMessage: string): string => {
  if (!errorCode) return defaultMessage;
  switch (errorCode) {
    case 'INVALID_INPUT':
      return 'Invalid input provided. Please check your message and try again.';
    case 'PRODUCT_NOT_FOUND':
      return 'The selected product could not be found. Please select another product.';
    case 'VECTOR_STORE_NOT_FOUND':
      return 'Could not find relevant information for this product. Please try another query or product.';
    case 'OPENAI_API_ERROR':
      return 'There was an issue communicating with the AI assistant. Please try again later.';
    case 'THREAD_CREATION_FAILED':
    case 'MESSAGE_CREATION_FAILED':
    case 'RUN_CREATION_FAILED':
    case 'RUN_RETRIEVAL_FAILED':
      return 'An internal error occurred while processing your request with the AI. Please try again.';
    case 'ASSISTANT_ERROR':
      return 'The AI assistant encountered an error. Please try again.';
    case 'MISSING_CONFIG':
      return 'The application is not configured correctly. Please contact support.';
    default:
      return defaultMessage;
  }
};

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true, 
});

const VITE_UNIVERSAL_ASSISTANT_ID = import.meta.env.VITE_UNIVERSAL_ASSISTANT_ID;

const ChatWindow: React.FC<ChatWindowProps> = ({ isOpen, onClose }) => {
  // Legacy state management (preserved exactly)
  const [products, setProducts] = useState<LegacyProduct[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<LegacyProduct | null>(null);
  const [messages, setMessages] = useState<LegacyMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [currentThreadId, setCurrentThreadId] = useState<string | null>(null); 
  const [chatStatus, setChatStatus] = useState<ChatStatus>('initializing');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);

  const messagesEndRef = useRef<null | HTMLDivElement>(null);

  // Convert legacy types to new types
  const convertToNewProduct = (legacyProduct: LegacyProduct): Product => ({
    id: legacyProduct.id,
    name: legacyProduct.name,
    description: legacyProduct.description,
    openai_vector_store_id: legacyProduct.openai_vector_store_id,
  });

  const convertToNewMessage = (legacyMessage: LegacyMessage): Message => ({
    id: legacyMessage.id,
    text: legacyMessage.text,
    sender: legacyMessage.sender,
    timestamp: legacyMessage.timestamp,
    threadId: legacyMessage.threadId ?? undefined,
    productId: selectedProduct?.id,
    type: 'text',
  });

  // Convert products array
  const newProducts = products.map(convertToNewProduct);
  const newMessages = messages.map(convertToNewMessage);
  const newSelectedProduct = selectedProduct ? convertToNewProduct(selectedProduct) : null;

  // All existing logic preserved exactly
  const fetchProducts = useCallback(async () => {
    setIsLoadingProducts(true);
    setChatStatus('initializing');
    setErrorMessage(null);
    console.log('Frontend: Fetching products...');
    try {
      if (!import.meta.env.VITE_OPENAI_API_KEY) {
        console.error('VITE_OPENAI_API_KEY is not set in .env file.');
        setErrorMessage(
          'OpenAI API Key is not configured. Please contact support.'
        );
        setChatStatus('product_load_error');
        setIsLoadingProducts(false);
        return;
      }
      if (!VITE_UNIVERSAL_ASSISTANT_ID) {
        console.error('VITE_UNIVERSAL_ASSISTANT_ID is not set in .env file.');
        setErrorMessage(
          'OpenAI Assistant ID is not configured. Please contact support.'
        );
        setChatStatus('product_load_error');
        setIsLoadingProducts(false);
        return;
      }

      const { data, error } = await supabase
        .from('products')
        .select('id, name, openai_vector_store_id, description');
      
      if (error) {
        console.error('Frontend: Error fetching products:', error);
        setErrorMessage(error.message || 'Failed to load product information. Please try again later.');
        setChatStatus('product_load_error');
        setProducts([]);
      } else {
        setProducts(data || []);
        if (data && data.length > 0) {
          setChatStatus('idle'); 
        } else {
          setChatStatus('idle'); 
          setErrorMessage('No products available to chat about at the moment.');
        }
        console.log('Frontend: Products fetched successfully.');
      }
    } catch (error: any) {
      console.error('Frontend: Error fetching products:', error);
      setErrorMessage(error.message || 'An unexpected error occurred while fetching products.');
      setChatStatus('product_load_error');
      setProducts([]);
    }
    setIsLoadingProducts(false);
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleProductChange = (productId: string) => {
    const product = products.find(p => p.id === productId);
    setSelectedProduct(product || null);
    setMessages([]);
    setCurrentThreadId(null); 
    setInputValue('');
    setErrorMessage(null);
    if (product) {
      setChatStatus('product_selected_no_chat');
      console.log('Frontend: Product selected:', product.name, 'Vector Store ID:', product.openai_vector_store_id);
    } else {
      setChatStatus('idle');
      setErrorMessage('Selected product not found. Please choose another.');
    }
  };

  const handleSendMessage = async () => {
    if (inputValue.trim() === '' || !selectedProduct || 
        (chatStatus !== 'ready_with_product' && chatStatus !== 'product_selected_no_chat' && chatStatus !== 'assistant_responding' && chatStatus !== 'backend_error')) {
      return;
    }

    const newUserMessage: LegacyMessage = {
      id: `msg-${Date.now()}`,
      text: inputValue,
      sender: 'user',
      timestamp: new Date(),
      threadId: currentThreadId ?? undefined,
    };

    setMessages((prevMessages) => [...prevMessages, newUserMessage]);
    setInputValue('');
    setChatStatus('assistant_responding');
    setErrorMessage(null);

    try {
      console.log('Frontend: Sending message to OpenAI...');
      
      let threadIdToUse = currentThreadId;
      if (!threadIdToUse) {
        console.log('Frontend: Creating new thread...');
        
        // Configure thread with vector store if available (correct approach)
        const threadConfig: any = {};
        if (selectedProduct.openai_vector_store_id) {
          threadConfig.tool_resources = {
            file_search: {
              vector_store_ids: [selectedProduct.openai_vector_store_id],
            },
          };
          console.log('Frontend: Creating thread with vector store:', selectedProduct.openai_vector_store_id);
        }
        
        const threadResponse = await openai.beta.threads.create(threadConfig);
        threadIdToUse = threadResponse.id;
        setCurrentThreadId(threadIdToUse);
        console.log('Frontend: Thread created:', threadIdToUse);
      }

      console.log('Frontend: Adding message to thread...');
      const messageData: any = {
        role: 'user',
        content: inputValue.trim(),
      };

      // Vector store is configured at thread level, not message level
      await openai.beta.threads.messages.create(threadIdToUse, messageData);

      console.log('Frontend: Creating run...');
      const runConfig: any = {
        assistant_id: VITE_UNIVERSAL_ASSISTANT_ID,
      };

      // Vector store is configured at thread level, not run level
      const run = await openai.beta.threads.runs.create(threadIdToUse, runConfig);

      console.log('Frontend: Waiting for run completion...');
      const maxAttempts = 60;
      let attempts = 0;
      let runStatus = run.status;

      while (runStatus === 'in_progress' || runStatus === 'queued') {
        if (attempts >= maxAttempts) {
          console.error('Frontend: Run timeout');
          setChatStatus('backend_error');
          setErrorMessage('The request timed out. Please try again.');
          return;
        }
        
        await new Promise((resolve) => setTimeout(resolve, 1000));
        const runCheck = await openai.beta.threads.runs.retrieve(threadIdToUse, run.id);
        runStatus = runCheck.status;
        attempts++;
        console.log(`Frontend: Run status: ${runStatus} (attempt ${attempts})`);
      }

      if (runStatus === 'completed') {
        console.log('Frontend: Run completed, fetching messages...');
        const messages = await openai.beta.threads.messages.list(threadIdToUse);
        
        if (messages.data.length > 0) {
          const assistantMessage = messages.data.find(
            (msg) => msg.role === 'assistant' && msg.run_id === run.id
          );

          if (assistantMessage && assistantMessage.content.length > 0) {
            const textContent = assistantMessage.content.find(
              (content) => content.type === 'text'
            );

            if (textContent && 'text' in textContent) {
              const assistantText = textContent.text.value;
              console.log('Frontend: Assistant response:', assistantText);

              const newAssistantMessage: LegacyMessage = {
                id: `msg-${Date.now() + 1}`,
                text: assistantText,
                sender: 'assistant',
                timestamp: new Date(),
                threadId: threadIdToUse,
              };
              setMessages((prevMessages) => [...prevMessages, newAssistantMessage]);
              setChatStatus('ready_with_product');
            } else {
              console.error('Frontend: Assistant response is not text content');
              setChatStatus('backend_error');
              setErrorMessage('The assistant returned an unexpected response format.');
            }
          } else {
            console.error('Frontend: Assistant message has no content');
            setChatStatus('backend_error');
            setErrorMessage('The assistant response was empty.');
          }
        } else {
          console.error('Frontend: No assistant messages found');
          setChatStatus('backend_error');
          setErrorMessage('No response received from the assistant.');
        }
      } else {
        console.error(`Frontend: Run failed with status: ${runStatus}`);
        setChatStatus('backend_error');
        setErrorMessage(getFriendlyErrorMessage(null, 'The assistant encountered an error while processing your request.'));
      }
    } catch (error: any) {
      console.error('Frontend: Error in handleSendMessage:', error);
      setChatStatus('backend_error');
      setErrorMessage(getFriendlyErrorMessage(error.code || null, 'An unexpected error occurred while processing your message.'));
    }
  };

  const getStatusMessage = () => {
    if (errorMessage) return errorMessage;
    switch (chatStatus) {
      case 'initializing':
        return 'Initializing chat system...';
      case 'product_load_error':
        return errorMessage || 'Failed to load products. Please refresh to try again.';
      case 'idle':
        return '';
      case 'product_selected_no_chat':
        setChatStatus('ready_with_product');
        return '';
      case 'ready_with_product':
        return '';
      case 'assistant_responding':
        return 'AI is thinking about your question...';
      case 'backend_error':
        return errorMessage || 'Something went wrong. Please try again.';
      default:
        return '';
    }
  };

  // Event handlers for ChatInterface
  const handleProductSelect = (product: Product) => {
    handleProductChange(product.id);
  };

  const handleSend = (message: string) => {
    if (message.trim() === '') return;
    // Update inputValue to match the message being sent
    setInputValue(message);
    // Small delay to ensure state is updated before sending
    setTimeout(() => {
      handleSendMessage();
    }, 0);
  };

  const handleRetry = () => {
    if (chatStatus === 'product_load_error') {
      fetchProducts();
    } else {
      setChatStatus('ready_with_product');
      setErrorMessage(null);
    }
  };

  const startNewChat = () => {
    // Clear current conversation
    setMessages([]);
    setInputValue('');
    setCurrentThreadId(null);
    setChatStatus('idle');
    setErrorMessage(null);
  };

  const handleLoadMessages = (loadedMessages: Message[]) => {
    console.log('ChatWindow: Received', loadedMessages.length, 'messages to load');
    
    // Convert new messages to legacy format and replace current messages
    const legacyMessages = loadedMessages.map(msg => ({
      id: msg.id,
      text: msg.text,
      sender: msg.sender,
      timestamp: msg.timestamp,
      threadId: msg.threadId
    }));
    
    console.log('ChatWindow: Converting to', legacyMessages.length, 'legacy messages');
    console.log('ChatWindow: Legacy message IDs:', legacyMessages.map(m => m.id));
    
    // Clear current messages and set new ones (replace, don't append)
    setMessages(legacyMessages);
    setChatStatus('ready_with_product');
    
    console.log('ChatWindow: Messages replaced successfully');
  };

  const statusMessage = getStatusMessage();

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          transition={{ 
            type: "spring", 
            stiffness: 300, 
            damping: 30,
            mass: 0.8
          }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full h-full max-w-6xl max-h-[90vh] bg-gray-800 rounded-2xl shadow-2xl overflow-hidden"
        >
          <ChatInterface
            isOpen={true}
            onClose={onClose}
            products={newProducts}
            selectedProduct={newSelectedProduct}
            messages={newMessages}
            status={chatStatus}
            statusMessage={statusMessage}
            inputValue={inputValue}
            onInputChange={setInputValue}
            onProductSelect={handleProductSelect}
            onSendMessage={handleSend}
            onRetry={handleRetry}
            isLoadingProducts={isLoadingProducts}
            onStartNewChat={startNewChat}
            onLoadMessages={handleLoadMessages}
          />
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ChatWindow;
