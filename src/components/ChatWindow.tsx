import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MessageSquare, Send, ChevronDown, Bot, User, Loader2, Minimize2, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import OpenAI from 'openai'; 
import { supabase } from '../lib/supabase'; 

interface ChatWindowProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Product {
  id: string;
  name: string;
  openai_vector_store_id?: string; 
  description?: string; 
}

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
  threadId?: string;
}

type ChatStatus =
  | 'initializing' 
  | 'product_load_error' 
  | 'idle' 
  | 'product_selected_no_chat' 
  | 'ready_with_product' 
  | 'sending_to_backend' 
  | 'backend_processing_delay' 
  | 'backend_error' 
  | 'assistant_responding'; 

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
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [currentThreadId, setCurrentThreadId] = useState<string | null>(null); 
  const [chatStatus, setChatStatus] = useState<ChatStatus>('initializing');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);

  const messagesEndRef = useRef<null | HTMLDivElement>(null);
  const textareaRef = useRef<null | HTMLTextAreaElement>(null);

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
        setProducts(data || []); // Ensure data is not null
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

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'; 
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`; 
    }
  }, [inputValue]);

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

    const newUserMessage: Message = {
      id: `msg-${Date.now()}`,
      text: inputValue,
      sender: 'user',
      timestamp: new Date(),
    };
    setMessages((prevMessages) => [...prevMessages, newUserMessage]);
    const currentInput = inputValue;
    setInputValue('');
    setChatStatus('assistant_responding'); 
    setErrorMessage(null);

    let threadIdToUse = currentThreadId;

    try {
      // Step 1: Create a new thread if one doesn't exist
      if (!threadIdToUse) {
        console.log('Frontend: No thread ID, creating new thread...');
        const threadPayload: OpenAI.Beta.Threads.ThreadCreateParams = {};
        if (selectedProduct && selectedProduct.openai_vector_store_id) {
          console.log(
            `Creating new thread with Vector Store ID: ${selectedProduct.openai_vector_store_id} for product: ${selectedProduct.name}`
          );
          threadPayload.tool_resources = {
            file_search: {
              vector_store_ids: [selectedProduct.openai_vector_store_id],
            },
          };
        } else {
          console.log(
            'Creating new thread without specific Vector Store ID (using assistant defaults).'
          );
        }
        const newThread = await openai.beta.threads.create(threadPayload);
        setCurrentThreadId(newThread.id);
        threadIdToUse = newThread.id;
        console.log(
          'Frontend: New thread created, ID:',
          newThread.id,
          'with payload:',
          threadPayload
        );
      }

      if (!threadIdToUse) {
        // This should ideally not happen if thread creation was successful
        throw new Error('Failed to obtain a thread ID.');
      }

      // Step 2: Add the user's message to the thread
      console.log(`Frontend: Adding message to thread ${threadIdToUse}:`, currentInput);
      await openai.beta.threads.messages.create(threadIdToUse, {
        role: 'user',
        content: currentInput,
        // Attach vector store ID if available and needed by assistant (TBD)
        // file_ids: selectedProduct?.openai_vector_store_id ? [selectedProduct.openai_vector_store_id] : undefined
      });
      console.log('Frontend: Message added to thread.');

      // Step 3: Create a run for the assistant
      console.log(`Frontend: Creating run for thread ${threadIdToUse} with assistant ${VITE_UNIVERSAL_ASSISTANT_ID}`);
      const run = await openai.beta.threads.runs.create(threadIdToUse, {
        assistant_id: VITE_UNIVERSAL_ASSISTANT_ID as string, // Cast to string as SDK expects string
        // Potentially add instructions here if needed, or rely on assistant's default instructions
        // instructions: `Please address the user's query about the product: ${selectedProduct.name}. Product details: ${selectedProduct.description}`
      });
      console.log('Frontend: Run created with ID:', run.id);

      // Step 4: Poll for run completion and retrieve messages
      const pollInterval = 1500; // ms
      const maxAttempts = 20; // Approx 30 seconds
      let attempts = 0;
      let runStatus = run.status;

      while (attempts < maxAttempts && (runStatus === 'queued' || runStatus === 'in_progress' || runStatus === 'requires_action')) {
        await new Promise(resolve => setTimeout(resolve, pollInterval));
        try {
          const updatedRun = await openai.beta.threads.runs.retrieve(threadIdToUse, run.id);
          runStatus = updatedRun.status;
          console.log(`Frontend: Polling run ${run.id}, status: ${runStatus}`);

          if (runStatus === 'requires_action') {
            // This is where you would handle function calls if your assistant uses them.
            // For now, we'll log it and assume no function calls are defined for this basic setup.
            console.warn('Frontend: Run requires action (e.g., function call). This is not handled in the current implementation.');
            // If you had function calls, you would submit tool outputs here:
            // await openai.beta.threads.runs.submitToolOutputs(threadIdToUse, run.id, { tool_outputs: [...] });
            // For simplicity, we will treat this as a state that might resolve or eventually fail/timeout.
          }

        } catch (pollingError: any) {
          console.error('Frontend: Error polling run status:', pollingError);
          // Decide if this error is fatal or if polling can continue
          // For now, we'll let the loop continue, relying on maxAttempts
        }
        attempts++;
      }

      if (runStatus === 'completed') {
        console.log(`Frontend: Run ${run.id} completed. Fetching messages...`);
        const messageList = await openai.beta.threads.messages.list(threadIdToUse);
        
        // Filter for messages added by the assistant after the user's last message
        // OpenAI messages are typically listed in descending order by creation time
        const assistantMessages = messageList.data
          .filter(msg => msg.run_id === run.id && msg.role === 'assistant')
          .reverse(); // Reverse to get them in chronological order for display

        if (assistantMessages.length > 0) {
          assistantMessages.forEach(assistMsg => {
            if (assistMsg.content[0]?.type === 'text') {
              const newAssistantMessage: Message = {
                id: assistMsg.id,
                text: assistMsg.content[0].text.value,
                sender: 'assistant',
                timestamp: new Date(assistMsg.created_at * 1000),
                threadId: threadIdToUse,
              };
              setMessages((prevMessages) => [...prevMessages, newAssistantMessage]);
            }
          });
          setChatStatus('ready_with_product');
        } else {
          console.warn('Frontend: Run completed, but no new assistant messages found.');
          // Potentially set an error or a specific status if no message is a concern
          setErrorMessage('The assistant processed your request but did not provide a response.');
          setChatStatus('backend_error'); // Or a more specific status
        }
      } else if (runStatus === 'failed' || runStatus === 'cancelled' || runStatus === 'expired') {
        console.error(`Frontend: Run ${run.id} ended with status: ${runStatus}`);
        const runDetails = await openai.beta.threads.runs.retrieve(threadIdToUse, run.id);
        const lastError = runDetails.last_error;
        const errorCode = lastError?.code || 'ASSISTANT_ERROR';
        const errorMessageText = lastError?.message || 'The AI assistant failed to process your request.';
        console.error('Frontend: Assistant run failure details:', errorMessageText);
        setErrorMessage(getFriendlyErrorMessage(errorCode, `Assistant Error: ${errorMessageText.substring(0, 100)}`));
        setChatStatus('backend_error');
      } else {
        console.warn(`Frontend: Run ${run.id} timed out or ended with unexpected status: ${runStatus}`);
        setErrorMessage(getFriendlyErrorMessage(null, 'The request to the AI assistant timed out. Please try again.'));
        setChatStatus('backend_error');
      }

    } catch (error: any) {
      console.error('Frontend: OpenAI API error in handleSendMessage:', error);
      let codeToPass: string | null;
      if (typeof error.code === 'string') {
        codeToPass = error.code;
      } else if (typeof error.name === 'string' && error.name !== 'Error') { // Use error.name if it's specific
        codeToPass = error.name;
      } else {
        codeToPass = null; // Default to null if no specific code/name is found
      }
      const friendlyMessage = getFriendlyErrorMessage(codeToPass, 'An error occurred while sending your message.');
      setErrorMessage(friendlyMessage);
      setChatStatus('backend_error'); // Using 'backend_error' as a generic API error status
    }
  };

  const inputDisabled = 
    !selectedProduct || 
    isLoadingProducts || // Disable input while products are loading
    chatStatus === 'sending_to_backend' || 
    chatStatus === 'backend_processing_delay' || 
    chatStatus === 'assistant_responding' || 
    chatStatus === 'initializing' ||
    chatStatus === 'product_load_error';

  const sendButtonDisabled = 
    inputDisabled || 
    inputValue.trim() === '';

  const getStatusMessage = () => {
    if (chatStatus === 'initializing') return 'Loading products...';
    if (chatStatus === 'product_load_error' && errorMessage) return errorMessage;
    if (chatStatus === 'idle' && products.length > 0) return 'Select a product to start chatting.';
    if (chatStatus === 'idle' && products.length === 0 && !errorMessage) return 'No products available to chat about.';
    if (chatStatus === 'backend_error' && errorMessage) return errorMessage;
    if (chatStatus === 'backend_processing_delay') return 'Assistant is thinking (this might take a moment)...';
    return null;
  };
  
  const statusMessageText = getStatusMessage();

  const chatContainerVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.98 },
    visible: { opacity: 1, y: 0, scale: 1 },
  };

  const commonTransition = { type: 'spring', stiffness: 300, damping: 30 };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="chat-window-expanded"
          className="max-w-6xl mx-auto my-4 bg-white/70 backdrop-blur-md shadow-xl rounded-xl border border-gray-200/30 overflow-hidden z-40 flex flex-col"
          style={{ height: '600px' }}
          variants={chatContainerVariants}
          initial="hidden"
          animate="visible"
          exit="hidden"
          transition={commonTransition}
        >
          {/* Header */}
          <div className="p-3 border-b border-gray-200/30 bg-slate-100/50 flex justify-between items-center select-none">
            <div className="flex items-center">
              <MessageSquare className="w-5 h-5 text-[#e2ca00] mr-2" />
              <h2 className="text-sm font-semibold text-slate-700">AI Assistant</h2>
            </div>
            <button 
              onClick={onClose} 
              className="p-1 rounded-md hover:bg-slate-200/70 active:bg-slate-300/70 text-slate-500 hover:text-slate-700 transition-colors"
              title="Minimize chat"
            >
              <Minimize2 className="w-4 h-4" />
            </button>
          </div>

          {/* Product Selector */}
          <div className="p-2.5 border-b border-gray-200/30 bg-slate-50/70">
            <div className="relative">
              <select
                value={selectedProduct?.id || ''}
                onChange={(e) => {
                  const productId = e.target.value;
                  const product = products.find(p => p.id === productId) || null;
                  handleProductChange(productId);
                }}
                disabled={isLoadingProducts || chatStatus === 'initializing' || chatStatus === 'sending_to_backend'}
                className={`w-full p-1.5 pr-8 border border-gray-300 rounded-md text-xs shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-[#fee600] focus:border-[#fee600] appearance-none text-black ${(isLoadingProducts || chatStatus === 'initializing' || chatStatus === 'sending_to_backend') ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}`}
              >
                <option value="" disabled>
                  {isLoadingProducts ? 'Loading products...' : products.length === 0 ? (errorMessage || 'No products available') : 'Select a Product'}
                </option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
              {isLoadingProducts && <Loader2 className="w-5 h-5 text-indigo-400 animate-spin ml-2" />} {/* Loading indicator */}
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-grow p-3 space-y-3 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100/50">
            {statusMessageText && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex items-center p-2 rounded-md text-xs ${chatStatus === 'backend_error' || chatStatus === 'product_load_error' ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-blue-50 text-blue-600 border border-blue-100'}`}
              >
                {(chatStatus === 'backend_error' || chatStatus === 'product_load_error') && <AlertTriangle className="w-3.5 h-3.5 mr-1.5 flex-shrink-0" />}
                {statusMessageText}
              </motion.div>
            )}
            <AnimatePresence initial={false}>
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, transition: { duration: 0.15 } }}
                  className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] lg:max-w-[75%] px-3 py-1.5 rounded-xl shadow-sm text-black/90 border ${ 
                      message.sender === 'user'
                        ? 'bg-[#FFFBE6] border-amber-200/80 rounded-br-none'
                        : 'bg-white border-slate-200/80 rounded-bl-none'
                    }`}
                  >
                    <div className="flex items-center mb-0.5">
                      {message.sender === 'assistant' && <Bot className={`w-3.5 h-3.5 mr-1.5 text-[#c7b300] flex-shrink-0`} />}
                      <span className={`text-[0.6rem] font-medium ${message.sender === 'user' ? 'text-amber-700/80' : 'text-slate-500/90'}`}>
                        {message.sender === 'user' ? 'You' : selectedProduct?.name || 'Assistant'}
                      </span>
                      {message.sender === 'user' && <User className="w-3.5 h-3.5 ml-1.5 text-black/70 flex-shrink-0" />}
                    </div>
                    <p className="text-xs leading-snug whitespace-pre-wrap break-words">{message.text}</p>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {chatStatus === 'sending_to_backend' && (
              <motion.div 
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex justify-start"
              >
                <div className="max-w-xs lg:max-w-md px-3 py-2 rounded-xl shadow-sm bg-white text-slate-800 border border-slate-200/80 rounded-bl-none flex items-center">
                  <Bot className="w-4 h-4 mr-2 text-[#c7b300]" />
                  <Loader2 className="w-4 h-4 text-[#c7b300] animate-spin" />
                  <span className="ml-1.5 text-xs text-slate-500 italic">Assistant is typing...</span>
                </div>
              </motion.div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-2.5 border-t border-gray-200/30 bg-slate-50/70">
            <div className="flex items-center space-x-1.5">
              <textarea
                ref={textareaRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (!sendButtonDisabled) handleSendMessage();
                  }
                }}
                placeholder={inputDisabled ? (chatStatus === 'initializing' ? 'Initializing chat...' : chatStatus === 'product_load_error' ? (errorMessage || 'Error loading products.') : 'Select a product...') : `Ask about ${selectedProduct?.name}...`}
                className="flex-grow p-1.5 border border-gray-300 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-[#fee600] focus:border-[#fee600] shadow-sm overflow-y-hidden text-xs text-black"
                rows={1}
                disabled={inputDisabled}
                onClick={(e) => e.stopPropagation()} 
              />
              <button
                onClick={(e) => { e.stopPropagation(); handleSendMessage(); }}
                disabled={sendButtonDisabled}
                className={`p-2 rounded-md text-white transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-[#fee600] shadow-sm 
                            ${sendButtonDisabled
                              ? 'bg-slate-400 cursor-not-allowed'
                              : 'bg-[#e2ca00] hover:bg-[#d4be00] active:bg-[#c7b300]' 
                            }`}
                title="Send message"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </motion.div>
      ) 
    }
    </AnimatePresence>
  );
};

export default ChatWindow;
