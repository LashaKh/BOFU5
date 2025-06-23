import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageSquare, 
  X, 
  Settings,
  History,
  Sparkles,
  BookOpen,
  Lightbulb,
  Zap,
  Minimize2,
  Maximize2,
  RotateCcw,
  Send,
  Mic,
  MicOff,
  PaperclipIcon,
  Brain,
  Wand2,
  FileText,
  Edit3,
  Eye,
  CheckCircle,
  Clock,
  Star,
  TrendingUp,
  Target,
  ChevronDown
} from 'lucide-react';
import { Product, Message, ChatStatus } from '../../types/chat';
import { Product as ProductType } from '../../types';
import { chatService, ChatConversation } from '../../services/chatService';
import { supabase } from '../../lib/supabase';
import OpenAI from 'openai'; // Keep for fallback when no productId

interface ArticleAICoPilotProps {
  isVisible: boolean;
  onToggle: () => void;
  articleContent: string;
  articleTitle: string;
  productId?: string; // Optional product ID to connect to knowledge base
  authorCompanyName?: string; // Company name of the article author to filter products
  onSuggestion?: (suggestion: string) => void;
  className?: string;
}

interface SuggestionTemplate {
  id: string;
  title: string;
  icon: string;
  description: string;
  prompt: string;
  category: 'content' | 'style' | 'seo' | 'engagement';
}

const suggestionTemplates: SuggestionTemplate[] = [
  {
    id: 'improve-intro',
    title: 'Enhance Introduction',
    icon: '🎯',
    description: 'Make your opening more compelling',
    prompt: 'Analyze the introduction of this article and suggest improvements to make it more engaging and hook readers immediately.',
    category: 'content'
  },
  {
    id: 'add-transitions',
    title: 'Smooth Transitions',
    icon: '🌊',
    description: 'Improve flow between sections',
    prompt: 'Review the article structure and suggest better transitions between paragraphs and sections for improved readability.',
    category: 'style'
  },
  {
    id: 'seo-optimize',
    title: 'SEO Enhancement',
    icon: '📈',
    description: 'Optimize for search engines',
    prompt: 'Analyze this article for SEO opportunities and suggest improvements for keywords, meta descriptions, and structure.',
    category: 'seo'
  },
  {
    id: 'add-examples',
    title: 'Add Examples',
    icon: '💡',
    description: 'Include practical examples',
    prompt: 'Suggest specific, practical examples that could be added to this article to make concepts clearer and more actionable.',
    category: 'content'
  },
  {
    id: 'call-to-action',
    title: 'Strengthen CTA',
    icon: '🚀',
    description: 'Improve calls to action',
    prompt: 'Review and suggest improvements for the calls-to-action in this article to increase engagement and conversion.',
    category: 'engagement'
  },
  {
    id: 'readability',
    title: 'Readability Check',
    icon: '👁️',
    description: 'Enhance clarity and flow',
    prompt: 'Analyze the readability of this article and suggest improvements for sentence structure, word choice, and overall clarity.',
    category: 'style'
  }
];

const ArticleAICoPilot: React.FC<ArticleAICoPilotProps> = ({
  isVisible,
  onToggle,
  articleContent,
  articleTitle,
  productId,
  authorCompanyName,
  onSuggestion,
  className = ''
}) => {
  // Component state
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showTemplates, setShowTemplates] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isListening, setIsListening] = useState(false);
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [assistantThreadId, setAssistantThreadId] = useState<string | null>(null);
  
  // Product selection state
  const [availableProducts, setAvailableProducts] = useState<ProductType[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<ProductType | null>(null);
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize speech recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window) {
      const recognition = new (window as any).webkitSpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';
      
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputValue(transcript);
        setIsListening(false);
      };
      
      recognition.onerror = () => {
        setIsListening(false);
      };
      
      recognition.onend = () => {
        setIsListening(false);
      };
      
      recognitionRef.current = recognition;
    }
  }, []);

  // Load conversation history and products
  useEffect(() => {
    if (isVisible) {
      loadConversations();
      loadProducts();
    }
  }, [isVisible, authorCompanyName]);

  // Handle click outside dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowProductDropdown(false);
      }
    };

    if (showProductDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showProductDropdown]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const loadConversations = async () => {
    try {
      const loadedConversations = await chatService.getConversations();
      setConversations(loadedConversations.filter(conv => 
        conv.title.includes('Article Assistant') || conv.title.includes(articleTitle)
      ));
    } catch (error) {
      console.error('Failed to load conversations:', error);
    }
  };

  const loadProducts = async () => {
    setIsLoadingProducts(true);
    try {
      let query = supabase
        .from('products')
        .select('id, name, description, openai_vector_store_id, created_at, user_id');

      // If we have an author company name, filter products by that company
      if (authorCompanyName) {
        console.log(`🏢 Filtering products for company: "${authorCompanyName}"`);
        
        // First get users from that company, then filter products by those users
        const { data: companyUsers, error: usersError } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('company_name', authorCompanyName);

        if (usersError) {
          console.warn('Could not load company users, showing all products:', usersError);
        } else if (companyUsers && companyUsers.length > 0) {
          const userIds = companyUsers.map(user => user.id);
          query = query.in('user_id', userIds);
          console.log(`🏢 Found ${userIds.length} users for company "${authorCompanyName}"`);
        } else {
          console.log(`🏢 No users found for company "${authorCompanyName}", showing all products`);
        }
      } else {
        console.log('🏢 No company name provided, showing all products');
      }

      const { data: products, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      // Filter products that have vector store IDs (knowledge bases)
      const productsWithKB = (products || []).filter(p => p.openai_vector_store_id);
      console.log(`🧠 Found ${productsWithKB.length} products with knowledge bases${authorCompanyName ? ` for company "${authorCompanyName}"` : ''}`);
      
      if (productsWithKB.length > 0) {
        console.log('🧠 Products with KB:', productsWithKB.map(p => ({ name: p.name, id: p.id })));
      }
      
      setAvailableProducts(productsWithKB);
      
      // Auto-select provided productId if it exists
      if (productId && productsWithKB.length > 0) {
        const matchingProduct = productsWithKB.find(p => p.id === productId);
        if (matchingProduct) {
          setSelectedProduct(matchingProduct);
        }
      }
    } catch (error) {
      console.error('Failed to load products:', error);
    } finally {
      setIsLoadingProducts(false);
    }
  };

  const handleProductSelect = (product: ProductType | null) => {
    setSelectedProduct(product);
    setShowProductDropdown(false);
    
    // Reset thread when switching products to start fresh conversation
    if (product?.id !== selectedProduct?.id) {
      setAssistantThreadId(null);
      setMessages([]);
    }
  };

  const createNewConversation = async () => {
    try {
      const conversation = await chatService.createConversation({
        title: `Article Assistant: ${articleTitle}`,
        product_id: undefined
      });
      
      if (conversation) {
        setCurrentConversationId(conversation.id);
        setConversations(prev => [conversation, ...prev]);
      }
      
      return conversation;
    } catch (error) {
      console.error('Failed to create conversation:', error);
      return null;
    }
  };

  const handleSendMessage = async (messageText?: string) => {
    const text = messageText || inputValue.trim();
    if (!text || isLoading) return;

    setIsLoading(true);
    setInputValue('');
    setShowTemplates(false);

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      text,
      sender: 'user',
      timestamp: new Date(),
      type: 'text'
    };

    setMessages(prev => [...prev, userMessage]);

    try {
      // Create conversation if needed
      let conversationId = currentConversationId;
      if (!conversationId) {
        const conversation = await createNewConversation();
        conversationId = conversation?.id || null;
      }

      // Save user message
      if (conversationId) {
        await chatService.addMessage({
          conversation_id: conversationId,
          role: 'user',
          content: text,
          metadata: { articleTitle, context: 'article-editing' }
        });
      }

      // Generate AI response using OpenAI
      const aiResponse = await generateAIResponse(text, articleContent);
      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        text: aiResponse,
        sender: 'assistant',
        timestamp: new Date(),
        type: 'text'
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Save assistant message
      if (conversationId) {
        await chatService.addMessage({
          conversation_id: conversationId,
          role: 'assistant',
          content: aiResponse,
          metadata: { articleTitle, context: 'article-editing' }
        });
      }

    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        text: 'I apologize, but I encountered an error. Please try again.',
        sender: 'assistant',
        timestamp: new Date(),
        type: 'error'
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const generateAIResponse = async (userInput: string, content: string): Promise<string> => {
    try {
      // Use selected product from dropdown, fallback to prop productId
      const activeProductId = selectedProduct?.id || productId;
      
      // If we have a product selected, use your templated assistant with knowledge base
      if (activeProductId) {
        console.log('🧠 Using templated assistant with knowledge base for product:', activeProductId, 
                   selectedProduct ? '(from dropdown)' : '(from prop)');
        
        // Enhance the user input with article context for better responses
        const enhancedMessage = `As a content writing assistant, please help with this article:

Title: "${articleTitle}"
Content Length: ${content.split(' ').length} words
Content Preview: ${content.substring(0, 500)}...

User Request: ${userInput}

Please provide specific, actionable advice that can be immediately implemented for improving this business content. Be concise but thorough.`;

        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            productId: activeProductId,
            message: enhancedMessage,
            threadId: assistantThreadId // Maintain conversation context
          })
        });

        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();
        
        // Update thread ID for future requests in this session
        if (data.threadId && data.threadId !== assistantThreadId) {
          setAssistantThreadId(data.threadId);
        }

        return data.response || "I'm unable to provide suggestions at the moment. Please try again.";
      } 
      
      // Fallback to basic OpenAI API if no productId (same as before but simplified)
      else {
        console.log('🤖 Using fallback OpenAI API (no product context)');
        
        const openai = new OpenAI({
          apiKey: import.meta.env.VITE_OPENAI_API_KEY,
          dangerouslyAllowBrowser: true
        });

        if (!import.meta.env.VITE_OPENAI_API_KEY) {
          throw new Error('OpenAI API key not configured');
        }

        const systemPrompt = `You are an expert content writing assistant for business articles. Provide specific, actionable advice for:

Article: "${articleTitle}"
Context: ${content.substring(0, 300)}...

Focus on practical improvements that can be implemented immediately.`;

        const completion = await openai.chat.completions.create({
          model: "gpt-4-turbo-preview",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userInput }
          ],
          max_tokens: 500,
          temperature: 0.7
        });

        return completion.choices[0]?.message?.content || "I'm unable to provide suggestions at the moment. Please try again.";
      }
    } catch (error) {
      console.error('AI Response Error:', error);
      
      // Enhanced fallback responses based on input analysis
      if (userInput.toLowerCase().includes('seo')) {
        return "For SEO optimization, consider:\n\n• Adding relevant keywords naturally throughout the content\n• Improving your meta description and title tags\n• Creating clear headings (H1, H2, H3) for better structure\n• Including internal and external links to authoritative sources\n• Optimizing content length for your target keywords";
      }
      
      if (userInput.toLowerCase().includes('engagement') || userInput.toLowerCase().includes('hook')) {
        return "To improve engagement:\n\n• Start with a compelling hook or statistic\n• Use storytelling elements to connect with readers\n• Add interactive elements like questions or calls-to-action\n• Break up text with bullet points and subheadings\n• Include real examples and case studies";
      }
      
      if (userInput.toLowerCase().includes('structure') || userInput.toLowerCase().includes('flow')) {
        return "For better content structure:\n\n• Create a clear introduction-body-conclusion flow\n• Use transitional phrases between sections\n• Ensure each paragraph focuses on one main idea\n• Add a table of contents for longer articles\n• Include a compelling conclusion with next steps";
      }
      
      return "I'm currently experiencing connectivity issues. Here are some general tips:\n\n• Focus on clear, actionable content\n• Use compelling headlines and subheadings\n• Include specific examples and data\n• Ensure your content addresses reader pain points\n• End with a strong call-to-action";
    }
  };

  const handleTemplateClick = (template: SuggestionTemplate) => {
    const contextualPrompt = `${template.prompt}\n\nArticle Title: "${articleTitle}"\n\nCurrent Content: ${articleContent.substring(0, 500)}...`;
    handleSendMessage(contextualPrompt);
  };

  const handleVoiceInput = () => {
    if (!recognitionRef.current) return;
    
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      setIsListening(true);
      recognitionRef.current.start();
    }
  };

  const filteredTemplates = selectedCategory === 'all' 
    ? suggestionTemplates 
    : suggestionTemplates.filter(t => t.category === selectedCategory);

  const categories = [
    { id: 'all', label: 'All', icon: '🎯' },
    { id: 'content', label: 'Content', icon: '📝' },
    { id: 'style', label: 'Style', icon: '🎨' },
    { id: 'seo', label: 'SEO', icon: '📈' },
    { id: 'engagement', label: 'Engagement', icon: '🚀' }
  ];

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ x: 400, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 400, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className={`fixed right-0 top-0 h-full z-40 ${className}`}
        style={{
          width: isMinimized ? '80px' : '420px',
          transition: 'width 0.3s ease'
        }}
      >
        {/* Main Container */}
        <div className="h-full flex flex-col bg-gray-800 border-l border-gray-700/50 shadow-2xl">
          {/* Ambient Background Effects */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute top-1/4 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-3xl"></div>
            <div className="absolute bottom-1/3 right-0 w-24 h-24 bg-blue-500/3 rounded-full blur-2xl"></div>
            <div className="absolute top-2/3 right-0 w-16 h-16 bg-emerald-500/4 rounded-full blur-xl"></div>
          </div>

          {/* Header */}
          <motion.div 
            className="relative p-4 border-b border-gray-700/30"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <motion.div
                  className="p-2 rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-purple-500/30"
                  whileHover={{ scale: 1.05, rotate: 5 }}
                  transition={{ duration: 0.2 }}
                >
                  <Brain className="w-5 h-5 text-purple-400" />
                </motion.div>
                {!isMinimized && (
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                        AI Co-Pilot
                      </h2>
                      {(selectedProduct || productId) && (
                        <div className="flex items-center gap-1 px-2 py-1 bg-emerald-500/20 text-emerald-300 rounded-full text-xs">
                          <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                          KB
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-gray-400">
                      {(selectedProduct || productId) ? 'Enhanced with Product Knowledge' : 'Article Writing Assistant'}
                    </p>
                  </motion.div>
                )}
              </div>
              
              <div className="flex items-center space-x-2">
                {!isMinimized && (
                  <motion.button
                    onClick={() => setShowHistory(!showHistory)}
                    className="p-2 rounded-xl bg-gray-800/50 hover:bg-gray-700/50 text-gray-400 hover:text-white transition-all duration-200"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <History className="w-4 h-4" />
                  </motion.button>
                )}
                
                <motion.button
                  onClick={() => setIsMinimized(!isMinimized)}
                  className="p-2 rounded-xl bg-gray-800/50 hover:bg-gray-700/50 text-gray-400 hover:text-white transition-all duration-200"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
                </motion.button>
                
                <motion.button
                  onClick={onToggle}
                  className="p-2 rounded-xl bg-gray-800/50 hover:bg-gray-700/50 text-gray-400 hover:text-red-300 transition-all duration-200"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <X className="w-4 h-4" />
                </motion.button>
              </div>
            </div>
          </motion.div>

          {!isMinimized && (
            <>
              {/* Product Knowledge Base Selector */}
              <motion.div 
                className="relative p-4 border-b border-gray-700/30"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
              >
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setShowProductDropdown(!showProductDropdown)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-gray-800/60 border border-gray-700/40 rounded-xl text-white hover:border-purple-500/50 focus:ring-2 focus:ring-purple-500/50 transition-all duration-200"
                    disabled={isLoadingProducts}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${
                        selectedProduct ? 'bg-emerald-400 animate-pulse' : 'bg-gray-500'
                      }`} />
                      <span className="text-sm">
                        {isLoadingProducts ? 'Loading products...' :
                         selectedProduct ? selectedProduct.name : 
                         'Select Knowledge Base'}
                      </span>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${
                      showProductDropdown ? 'rotate-180' : ''
                    }`} />
                  </button>

                  <AnimatePresence>
                    {showProductDropdown && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute top-full left-0 right-0 mt-2 bg-gray-800 border border-gray-700/40 rounded-xl shadow-xl z-50 max-h-64 overflow-y-auto"
                      >
                        {/* No KB Option */}
                        <button
                          onClick={() => handleProductSelect(null)}
                          className={`w-full px-4 py-3 text-left hover:bg-gray-700/50 transition-colors border-b border-gray-700/30 ${
                            !selectedProduct ? 'bg-purple-500/20 text-purple-300' : 'text-gray-300'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-2 h-2 bg-gray-500 rounded-full" />
                            <div>
                              <div className="text-sm font-medium">Basic AI Assistant</div>
                              <div className="text-xs text-gray-400">No product knowledge base</div>
                            </div>
                          </div>
                        </button>

                        {/* Product Options */}
                        {availableProducts.map((product) => (
                          <button
                            key={product.id}
                            onClick={() => handleProductSelect(product)}
                            className={`w-full px-4 py-3 text-left hover:bg-gray-700/50 transition-colors ${
                              selectedProduct?.id === product.id ? 'bg-emerald-500/20 text-emerald-300' : 'text-gray-300'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-2 h-2 rounded-full ${
                                selectedProduct?.id === product.id ? 'bg-emerald-400' : 'bg-blue-400'
                              }`} />
                              <div>
                                <div className="text-sm font-medium">{product.name}</div>
                                <div className="text-xs text-gray-400">
                                  {product.description || 'Product knowledge base available'}
                                </div>
                              </div>
                            </div>
                          </button>
                        ))}

                        {availableProducts.length === 0 && !isLoadingProducts && (
                          <div className="px-4 py-6 text-center text-gray-400">
                            <div className="text-sm">No products with knowledge bases found</div>
                            <div className="text-xs mt-1">Create products with vector stores to enable KB features</div>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>

              {/* Quick Stats */}
              <motion.div 
                className="relative p-4 border-b border-gray-700/30"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Words', value: articleContent.split(' ').length, icon: FileText, color: 'text-blue-400' },
                    { label: 'Read Time', value: `${Math.ceil(articleContent.split(' ').length / 200)}m`, icon: Clock, color: 'text-emerald-400' },
                    { label: 'Score', value: '85%', icon: Target, color: 'text-purple-400' }
                  ].map((stat, index) => (
                    <motion.div
                      key={stat.label}
                      className="text-center p-3 rounded-xl bg-gradient-to-br from-gray-800/60 to-gray-900/40 border border-gray-700/40"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.3 + index * 0.1 }}
                    >
                      <stat.icon className={`w-4 h-4 mx-auto mb-1 ${stat.color}`} />
                      <div className="text-sm font-bold text-white">{stat.value}</div>
                      <div className="text-xs text-gray-400">{stat.label}</div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>

              {/* Content Area */}
              <div className="flex-1 flex flex-col min-h-0">
                {showTemplates ? (
                  <motion.div 
                    className="flex-1 overflow-y-auto p-4 space-y-4"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                  >
                    {/* Category Filters */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      {categories.map((category) => (
                        <motion.button
                          key={category.id}
                          onClick={() => setSelectedCategory(category.id)}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
                            selectedCategory === category.id
                              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                              : 'bg-gray-800/60 text-gray-400 border border-gray-700/40 hover:bg-gray-700/60'
                          }`}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <span className="mr-1">{category.icon}</span>
                          {category.label}
                        </motion.button>
                      ))}
                    </div>

                    {/* Suggestion Templates */}
                    <div className="space-y-3">
                      {filteredTemplates.map((template, index) => (
                        <motion.button
                          key={template.id}
                          onClick={() => handleTemplateClick(template)}
                          className="w-full p-4 rounded-xl bg-gradient-to-br from-gray-800/60 to-gray-900/40 border border-gray-700/40 hover:border-purple-500/40 transition-all duration-200 text-left group"
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.4 + index * 0.1 }}
                          whileHover={{ scale: 1.02 }}
                        >
                          <div className="flex items-start space-x-3">
                            <div className="text-2xl">{template.icon}</div>
                            <div className="flex-1">
                              <h3 className="font-semibold text-white group-hover:text-purple-300 transition-colors">
                                {template.title}
                              </h3>
                              <p className="text-sm text-gray-400 mt-1 leading-relaxed">
                                {template.description}
                              </p>
                            </div>
                            <Sparkles className="w-4 h-4 text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  </motion.div>
                ) : (
                  /* Chat Messages */
                  <motion.div 
                    className="flex-1 overflow-y-auto p-4 space-y-4"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    {messages.length === 0 ? (
                      <motion.div 
                        className="text-center py-8"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                      >
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center">
                          <MessageSquare className="w-8 h-8 text-purple-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-white mb-2">Start a Conversation</h3>
                        <p className="text-sm text-gray-400">Ask me anything about your article!</p>
                      </motion.div>
                    ) : (
                      <>
                        {messages.map((message, index) => (
                          <motion.div
                            key={message.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                                message.sender === 'user'
                                  ? 'bg-gradient-to-br from-purple-500/80 to-blue-500/80 text-white'
                                  : message.type === 'error'
                                  ? 'bg-gradient-to-br from-red-500/20 to-red-600/10 text-red-300 border border-red-500/30'
                                  : 'bg-gradient-to-br from-gray-800/80 to-gray-900/60 text-gray-100 border border-gray-700/40'
                              }`}
                            >
                              <p className="text-sm leading-relaxed">{message.text}</p>
                              <p className="text-xs opacity-70 mt-2">
                                {message.timestamp.toLocaleTimeString()}
                              </p>
                            </div>
                          </motion.div>
                        ))}
                        {isLoading && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex justify-start"
                          >
                            <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/60 rounded-2xl px-4 py-3 border border-gray-700/40">
                              <div className="flex items-center space-x-2">
                                <div className="flex space-x-1">
                                  {[0, 1, 2].map((i) => (
                                    <motion.div
                                      key={i}
                                      className="w-2 h-2 bg-purple-400 rounded-full"
                                      animate={{ scale: [1, 1.2, 1] }}
                                      transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                                    />
                                  ))}
                                </div>
                                <span className="text-xs text-gray-400">AI is thinking...</span>
                              </div>
                            </div>
                          </motion.div>
                        )}
                        <div ref={messagesEndRef} />
                      </>
                    )}
                  </motion.div>
                )}
              </div>

              {/* Input Area */}
              <motion.div 
                className="border-t border-gray-700/30 p-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                {!showTemplates && (
                  <motion.button
                    onClick={() => setShowTemplates(true)}
                    className="w-full mb-3 px-3 py-2 rounded-xl bg-gradient-to-r from-purple-500/20 to-blue-500/20 border border-purple-500/30 text-purple-300 hover:text-purple-200 transition-all duration-200 text-sm font-medium"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Lightbulb className="w-4 h-4 inline mr-2" />
                    Show Suggestions
                  </motion.button>
                )}
                
                <div className="relative flex items-center space-x-2">
                  <div className="flex-1 relative">
                    <input
                      ref={inputRef}
                      type="text"
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                      placeholder="Ask about your article..."
                      className="w-full px-4 py-3 pl-12 pr-20 bg-gray-800/60 border border-gray-700/40 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all duration-200"
                      disabled={isLoading}
                    />
                    <Edit3 className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    
                    <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
                      {recognitionRef.current && (
                        <motion.button
                          onClick={handleVoiceInput}
                          className={`p-2 rounded-lg transition-all duration-200 ${
                            isListening 
                              ? 'bg-red-500/20 text-red-400' 
                              : 'bg-gray-700/50 text-gray-400 hover:text-white'
                          }`}
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                        >
                          {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                        </motion.button>
                      )}
                      
                      <motion.button
                        onClick={() => handleSendMessage()}
                        disabled={!inputValue.trim() || isLoading}
                        className="p-2 rounded-lg bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 hover:text-purple-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                      >
                        <Send className="w-4 h-4" />
                      </motion.button>
                    </div>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ArticleAICoPilot;