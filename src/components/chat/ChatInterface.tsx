import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageSquare, 
  X, 
  Settings, 
  History, 
  Search, 
  MoreHorizontal,
  Maximize2,
  Minimize2,
  Download,
  Star,
  Archive,
  Clock,
  MessageCircle,
  Globe,
  ChevronDown
} from 'lucide-react';
import ChatHeader from './ChatHeader';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import StatusIndicator from './StatusIndicator';
import { Message, Product, ChatStatus } from '../../types/chat';
import { chatService, ChatConversation } from '../../services/chatService';

interface ChatInterfaceProps {
  isOpen: boolean;
  onClose: () => void;
  // External state props
  products?: Product[];
  selectedProduct?: Product | null;
  messages?: Message[];
  status?: ChatStatus;
  statusMessage?: string;
  inputValue?: string;
  onInputChange?: (value: string) => void;
  onProductSelect?: (product: Product) => void;
  onSendMessage?: (message: string) => void;
  onRetry?: () => void;
  isLoadingProducts?: boolean;
  className?: string;
  onStartNewChat?: () => void;
  onLoadMessages?: (messages: Message[]) => void;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ 
  isOpen, 
  onClose,
  // External state
  products = [],
  selectedProduct = null,
  messages = [],
  status = 'idle',
  statusMessage = '',
  inputValue = '',
  onInputChange,
  onProductSelect,
  onSendMessage,
  onRetry,
  isLoadingProducts = false,
  className = '',
  onStartNewChat,
  onLoadMessages
}) => {
  // Local state
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const savedMessageIds = useRef<Set<string>>(new Set());
  const [isLoadingConversation, setIsLoadingConversation] = useState(false);
  const isLoadingMessages = useRef(false);
  const lastLoadedConversationId = useRef<string | null>(null);
  const isCreatingConversation = useRef(false);

  // Load conversations on component mount
  useEffect(() => {
    if (isOpen) {
      loadConversations();
    }
  }, [isOpen]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Save messages when they change and auto-create conversation
  useEffect(() => {
    // Don't auto-save when we're loading messages from history
    if (isLoadingMessages.current) {
      console.log('Skipping auto-save during message loading');
      return;
    }
    
    // Don't auto-save when we're creating a conversation (prevents duplicate saves)
    if (isCreatingConversation.current) {
      console.log('Skipping auto-save during conversation creation');
      return;
    }
    
    if (messages.length > 0 && !currentConversationId) {
      // Auto-create conversation for first message
      createNewConversation();
    } else if (messages.length > 0 && currentConversationId) {
      // Save new messages to existing conversation
      saveNewMessagesToConversation();
    }
  }, [messages, currentConversationId]);

  // Load conversations from Supabase
  const loadConversations = async () => {
    try {
      console.log('Loading conversations from database...');
      setIsLoadingConversations(true);
      
      const loadedConversations = await chatService.getConversations();
      console.log('Loaded conversations from database:', loadedConversations.length);
      console.log('Conversation IDs:', loadedConversations.map(c => c.id));
      console.log('Archived status:', loadedConversations.map(c => ({ id: c.id, archived: c.is_archived })));
      
      setConversations(loadedConversations);
      
      // If no current conversation but we have messages, try to find or create one
      if (messages.length > 0 && !currentConversationId && loadedConversations.length > 0) {
        // Check if there's a recent conversation we can continue
        const recentConversation = loadedConversations[0];
        if (recentConversation) {
          console.log('Setting current conversation to most recent:', recentConversation.id);
          setCurrentConversationId(recentConversation.id);
        }
      }
      
      console.log('Conversations loaded successfully');
    } catch (error) {
      console.error('Failed to load conversations:', error);
    } finally {
      setIsLoadingConversations(false);
    }
  };

  // Create a new conversation
  const createNewConversation = async () => {
    if (messages.length === 0) return null;

    // Prevent duplicate saves during conversation creation
    isCreatingConversation.current = true;
    
    try {
      console.log('Creating new conversation with', messages.length, 'messages');
      
      const firstMessage = messages[0];
      const title = chatService.generateConversationTitle(
        firstMessage.text, 
        selectedProduct?.name
      );

      const conversation = await chatService.createConversation({
        title,
        product_id: selectedProduct?.id
      });

      if (conversation) {
        console.log('Created conversation:', conversation.id);
        setCurrentConversationId(conversation.id);
        setConversations(prev => [conversation, ...prev]);
        
        // Save all current messages to the new conversation
        console.log('Saving', messages.length, 'messages to new conversation');
        for (const message of messages) {
          const savedMessage = await chatService.addMessage(
            chatService.convertFromUIMessage(message, conversation.id)
          );
          // Mark as saved to prevent future duplicate saves
          savedMessageIds.current.add(message.id);
          console.log('Saved message:', message.id, 'as', savedMessage?.id);
        }
        
        console.log('Conversation creation complete');
      }

      return conversation;
    } catch (error) {
      console.error('Failed to create conversation:', error);
      return null;
    } finally {
      // Reset the flag after a delay to allow state to settle
      setTimeout(() => {
        isCreatingConversation.current = false;
        console.log('Conversation creation flag reset');
      }, 500);
    }
  };

  // Save new messages to current conversation
  const saveNewMessagesToConversation = async () => {
    if (!currentConversationId || messages.length === 0) return;
    
    try {
      // Get the last message that might not be saved yet
      const lastMessage = messages[messages.length - 1];
      
      // Check if this message is already saved
      const isUnsavedMessage = lastMessage.id.startsWith('msg-') || lastMessage.id.length < 30;
      const alreadySaved = savedMessageIds.current.has(lastMessage.id);
      
      if (isUnsavedMessage && !alreadySaved) {
        // Mark as being saved to prevent duplicates
        savedMessageIds.current.add(lastMessage.id);
        
        await chatService.addMessage({
          conversation_id: currentConversationId,
          role: lastMessage.sender,
          content: lastMessage.text,
          metadata: {
            productId: selectedProduct?.id,
            timestamp: lastMessage.timestamp,
            originalId: lastMessage.id
          }
        });
        console.log('Message saved to conversation:', currentConversationId);
      }
    } catch (error) {
      console.error('Error saving message:', error);
    }
  };

  // Load conversation messages
  const loadConversationMessages = async (conversationId: string) => {
    // Prevent double loading
    if (isLoadingConversation) {
      console.log('Already loading conversation, skipping...');
      return;
    }
    
    console.log('Starting to load conversation:', conversationId);
    setIsLoadingConversation(true);
    isLoadingMessages.current = true; // Prevent auto-save during loading
    
    try {
      console.log('Loading conversation:', conversationId);
      
      // Clear any pending saves to avoid conflicts
      savedMessageIds.current.clear();
      
      const messages = await chatService.getMessages(conversationId);
      console.log('Raw messages from database:', messages.length);
      
      const uiMessages = messages.map(msg => chatService.convertToUIMessage(msg));
      console.log('Converted UI messages:', uiMessages.length);
      
      // Set the current conversation ID first
      setCurrentConversationId(conversationId);
      
      // Call the external onLoadMessages callback if provided
      // This should replace all current messages with the loaded ones
      if (onLoadMessages) {
        console.log('Calling onLoadMessages with', uiMessages.length, 'messages');
        onLoadMessages(uiMessages);
      }
      
      // Close sidebar after loading
      setIsSidebarOpen(false);
      
      console.log('Successfully loaded conversation messages:', uiMessages.length);
    } catch (error) {
      console.error('Error loading conversation messages:', error);
      // Reset tracking on error
      lastLoadedConversationId.current = null;
    } finally {
      setIsLoadingConversation(false);
      // Reset the loading flag after a short delay to allow state to settle
      setTimeout(() => {
        isLoadingMessages.current = false;
      }, 100);
    }
  };

  // Handle conversation selection with debouncing
  const handleConversationSelect = useCallback((conversationId: string) => {
    console.log('handleConversationSelect called with:', conversationId);
    
    if (conversationId === 'current') {
      setIsSidebarOpen(false);
      return;
    }
    
    // Prevent loading the same conversation multiple times
    if (conversationId === lastLoadedConversationId.current) {
      console.log('Same conversation already loaded, skipping...');
      return;
    }
    
    // Prevent loading while another conversation is loading
    if (isLoadingConversation) {
      console.log('Already loading a conversation, skipping...');
      return;
    }
    
    lastLoadedConversationId.current = conversationId;
    loadConversationMessages(conversationId);
  }, [isLoadingConversation]);

  // Handle conversation removal
  const handleConversationRemove = async (conversationId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    
    // Prevent deletion of the "current" placeholder conversation
    if (conversationId === 'current') {
      console.log('Cannot delete current active conversation placeholder');
      return;
    }
    
    console.log('Attempting to remove conversation:', conversationId);
    
    try {
      // Archive the conversation in the database
      await chatService.archiveConversation(conversationId);
      console.log('Successfully archived conversation:', conversationId);
      
      // Update local state immediately
      setConversations(prev => {
        const filtered = prev.filter(conv => conv.id !== conversationId);
        console.log('Updated conversations state, remaining:', filtered.length);
        return filtered;
      });
      
      // Clear current conversation if it was the deleted one
      if (currentConversationId === conversationId) {
        console.log('Clearing current conversation ID');
        setCurrentConversationId(null);
      }
      
      console.log('Conversation removal completed successfully');
    } catch (error) {
      console.error('Failed to remove conversation:', error);
      // Optionally show user feedback here
      alert('Failed to delete conversation. Please try again.');
    }
  };

  // Handle clear all conversations
  const handleClearAllConversations = async () => {
    try {
      await chatService.clearAllConversations();
      setConversations([]);
      setCurrentConversationId(null);
      setIsSidebarOpen(false);
    } catch (error) {
      console.error('Failed to clear conversations:', error);
    }
  };

  // Scroll to bottom of messages
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ 
      behavior: 'smooth',
      block: 'end'
    });
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages, scrollToBottom]);

  // Animation variants
  const containerVariants = {
    hidden: { 
      opacity: 0, 
      scale: 0.92,
      y: 30
    },
    visible: { 
      opacity: 1, 
      scale: 1,
      y: 0,
      transition: {
        type: "spring",
        duration: 0.5,
        bounce: 0.1
      }
    },
    exit: { 
      opacity: 0, 
      scale: 0.92,
      y: 30,
      transition: {
        duration: 0.3
      }
    }
  };

  const gradientOverlay = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { duration: 0.8 }
    }
  };

  // Handle product change
  const handleProductChange = (product: Product) => {
    onProductSelect?.(product);
  };

  // Handle send message
  const handleSendMessage = () => {
    if (onSendMessage) {
      onSendMessage(inputValue);
    }
  };

  // Handle input change
  const handleInputChange = (value: string) => {
    onInputChange?.(value);
  };

  // Handle sidebar toggle
  const handleToggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  // Calculate dynamic dimensions
  const chatWidth = isMaximized ? 'w-screen' : 'w-full';
  const chatHeight = isMaximized ? 'h-screen' : 'h-full';
  const maxWidth = isMaximized ? 'max-w-none' : 'max-w-6xl';
  const maxHeight = isMaximized ? 'max-h-none' : 'max-h-[90vh]';
  const borderRadius = isMaximized ? 'rounded-none' : 'rounded-2xl';

  // Real chat history - combining current conversation with saved ones
  const recentConversations = [
    // Current conversation if it has messages and is not already saved
    ...(messages.length > 0 && !currentConversationId ? [{
      id: 'current',
      title: selectedProduct ? `${selectedProduct.name} Discussion` : 'Current Conversation',
      lastMessage: new Date().toLocaleString(),
      messageCount: messages.length,
      isActive: true,
      canDelete: false // Current unsaved conversation cannot be deleted
    }] : []),
    // Saved conversations
    ...conversations.map(conv => ({
      id: conv.id,
      title: conv.title,
      lastMessage: new Date(conv.updated_at).toLocaleString(),
      messageCount: 0, // Could be fetched if needed
      isActive: conv.id === currentConversationId,
      canDelete: true // Saved conversations can be deleted
    }))
  ];

  // Start a new chat conversation
  const handleStartNewChat = () => {
    // Clear current conversation state
    setCurrentConversationId(null);
    setIsSidebarOpen(false);
    
    // Trigger parent to clear messages and reset chat
    if (onStartNewChat) {
      onStartNewChat();
    }
  };

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              onClose();
            }
          }}
        >
          {/* Enhanced backdrop with gradient */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-br from-black/60 via-black/40 to-black/60 backdrop-blur-md"
            variants={gradientOverlay}
            initial="hidden"
            animate="visible"
            exit="hidden"
          />

          <motion.div
            ref={containerRef}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className={`relative z-0 flex ${chatWidth} ${chatHeight} ${maxWidth} ${maxHeight} bg-gray-800 ${borderRadius} shadow-2xl`}
          >
            {/* Sidebar */}
            <AnimatePresence>
              {isSidebarOpen && (
                <motion.div
                  initial={{ x: -320, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: -320, opacity: 0 }}
                  transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                  className="w-80 bg-gradient-to-b from-gray-900/95 via-gray-900/90 to-gray-900/95 backdrop-blur-xl border-r border-gray-700/50 flex flex-col relative overflow-hidden"
                  style={{ 
                    background: 'linear-gradient(135deg, rgba(17, 24, 39, 0.95) 0%, rgba(31, 41, 55, 0.90) 50%, rgba(17, 24, 39, 0.95) 100%)',
                    backdropFilter: 'blur(20px)',
                    borderRight: '1px solid rgba(156, 163, 175, 0.2)'
                  }}
                >
                  {/* Ambient Background Glow */}
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-0 left-0 w-32 h-32 bg-yellow-500/5 rounded-full blur-3xl transform -translate-x-16 -translate-y-16"></div>
                    <div className="absolute bottom-0 right-0 w-40 h-40 bg-blue-500/3 rounded-full blur-3xl transform translate-x-20 translate-y-20"></div>
                  </div>

                  {/* Enhanced Sidebar Header */}
                  <div className="relative p-6 border-b border-gray-700/30">
                    <div className="flex items-center justify-between">
                      <motion.div
                        className="flex items-center space-x-3"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                      >
                        <div className="p-2 rounded-xl bg-gradient-to-br from-yellow-500/20 to-yellow-600/20 border border-yellow-500/30">
                          <Clock className="w-5 h-5 text-yellow-400" />
                        </div>
                        <div>
                          <h2 className="text-lg font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                            Conversation History
                      </h2>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {recentConversations.length} {recentConversations.length === 1 ? 'conversation' : 'conversations'}
                          </p>
                        </div>
                      </motion.div>
                      <motion.button
                        onClick={() => setIsSidebarOpen(false)}
                        className="p-2 rounded-xl bg-gray-800/50 hover:bg-gray-700/50 text-gray-400 hover:text-white transition-all duration-200 border border-gray-700/30 hover:border-gray-600/50"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.3 }}
                      >
                        <X className="w-4 h-4" />
                      </motion.button>
                    </div>
                  </div>

                  {/* Enhanced Recent Conversations */}
                  <div className="flex-1 overflow-hidden relative">
                    <div className="h-full overflow-y-auto p-4 scroll-smooth" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(156, 163, 175, 0.3) transparent' }}>
                      <div className="space-y-2">
                        {recentConversations.map((conversation, index) => (
                        <motion.div
                          key={conversation.id}
                            initial={{ opacity: 0, y: 20, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            transition={{ 
                              delay: 0.1 * index, 
                              duration: 0.3,
                              ease: [0.23, 1, 0.32, 1]
                            }}
                            whileHover={{ 
                              scale: 1.02,
                              y: -2,
                              transition: { duration: 0.2 }
                            }}
                            className="group relative p-4 rounded-2xl cursor-pointer transition-all duration-300 hover:shadow-lg hover:shadow-black/20"
                            style={{
                              background: conversation.isActive 
                                ? 'linear-gradient(135deg, rgba(250, 204, 21, 0.15) 0%, rgba(234, 179, 8, 0.10) 100%)'
                                : 'linear-gradient(135deg, rgba(55, 65, 81, 0.8) 0%, rgba(75, 85, 99, 0.6) 100%)',
                              border: conversation.isActive 
                                ? '1px solid rgba(250, 204, 21, 0.3)'
                                : '1px solid rgba(75, 85, 99, 0.4)',
                              backdropFilter: 'blur(8px)'
                            }}
                          onClick={() => handleConversationSelect(conversation.id)}
                        >
                            {/* Active Conversation Glow */}
                            {conversation.isActive && (
                              <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-yellow-500/10 to-transparent opacity-50 pointer-events-none"></div>
                            )}

                            <div className="flex items-start space-x-3 relative z-10">
                              <motion.div 
                                className="flex-shrink-0 p-2 rounded-xl"
                                style={{
                                  background: conversation.isActive 
                                    ? 'linear-gradient(135deg, #facc15, #eab308)'
                                    : 'linear-gradient(135deg, rgba(250, 204, 21, 0.8), rgba(234, 179, 8, 0.6))'
                                }}
                                whileHover={{ rotate: 5 }}
                                transition={{ duration: 0.2 }}
                              >
                              <MessageCircle className="w-4 h-4 text-white" />
                              </motion.div>

                            <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between mb-2">
                                  <h3 className="text-sm font-semibold text-white truncate pr-2 leading-relaxed">
                                  {conversation.title}
                                </h3>
                                {conversation.canDelete && (
                                    <motion.button
                                    onClick={(e) => handleConversationRemove(conversation.id, e)}
                                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-all duration-200 border border-red-500/20 hover:border-red-500/40"
                                      whileHover={{ scale: 1.1 }}
                                      whileTap={{ scale: 0.9 }}
                                    title="Remove conversation"
                                  >
                                    <X className="w-3 h-3" />
                                    </motion.button>
                                )}
                              </div>
                                
                                <div className="flex items-center space-x-3 mb-2">
                                  {conversation.isActive && (
                                    <motion.div
                                      initial={{ scale: 0, opacity: 0 }}
                                      animate={{ scale: 1, opacity: 1 }}
                                      className="flex items-center space-x-1 px-2 py-1 bg-green-500/20 border border-green-500/30 rounded-full"
                                    >
                                      <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></div>
                                      <span className="text-xs font-medium text-green-300">Active</span>
                                    </motion.div>
                                  )}
                                {conversation.messageCount && (
                                    <div className="flex items-center space-x-1 text-gray-400">
                                      <div className="w-1 h-1 bg-gray-500 rounded-full"></div>
                                      <span className="text-xs">{conversation.messageCount} messages</span>
                                    </div>
                                )}
                                </div>
                                
                                <p className="text-xs text-gray-400 leading-relaxed">
                                {conversation.lastMessage}
                              </p>
                            </div>
                          </div>

                            {/* Hover Indicator */}
                            <motion.div
                              className="absolute right-3 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                              initial={false}
                            >
                              <div className="w-2 h-8 bg-gradient-to-t from-yellow-500/50 to-yellow-400/50 rounded-full"></div>
                            </motion.div>
                        </motion.div>
                      ))}
                    </div>

                      {/* Enhanced Empty State */}
                    {recentConversations.length === 0 && (
                        <motion.div 
                          className="text-center py-16 px-6"
                          initial={{ opacity: 0, y: 40 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.3, duration: 0.6 }}
                        >
                          <motion.div
                            className="relative mb-8"
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: 0.5, duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
                          >
                            <div className="relative mx-auto w-24 h-24 rounded-2xl p-6" style={{
                              background: 'linear-gradient(135deg, rgba(31, 41, 55, 0.8) 0%, rgba(55, 65, 81, 0.6) 100%)',
                              border: '1px solid rgba(75, 85, 99, 0.4)'
                            }}>
                              <Clock className="w-full h-full text-gray-400" />
                              <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-yellow-500/5 to-transparent"></div>
                      </div>
                          </motion.div>
                          <motion.h3
                            className="text-lg font-bold text-white mb-3"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.7 }}
                          >
                            No conversations yet
                          </motion.h3>
                          <motion.p
                            className="text-sm text-gray-400 leading-relaxed max-w-xs mx-auto"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.8 }}
                          >
                            Start your first conversation to see your chat history appear here
                          </motion.p>
                        </motion.div>
                    )}
                    </div>
                  </div>

                  {/* Enhanced Sidebar Footer */}
                  <div className="relative p-4 border-t border-gray-700/30">
                    <div className="space-y-2">
                      <motion.button 
                      onClick={loadConversations}
                        className="w-full group relative p-3 text-sm font-medium rounded-xl transition-all duration-300 overflow-hidden"
                        style={{
                          background: 'linear-gradient(135deg, rgba(250, 204, 21, 0.15) 0%, rgba(234, 179, 8, 0.10) 100%)',
                          border: '1px solid rgba(250, 204, 21, 0.3)'
                        }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        <div className="relative flex items-center justify-center space-x-2 text-yellow-300 group-hover:text-yellow-200">
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                            className="group-hover:animate-spin"
                    >
                            🔄
                          </motion.div>
                          <span>Refresh History</span>
                        </div>
                      </motion.button>
                      
                      <motion.button 
                      onClick={handleClearAllConversations}
                        className="w-full group relative p-3 text-sm font-medium rounded-xl transition-all duration-300 overflow-hidden"
                        style={{
                          background: 'linear-gradient(135deg, rgba(75, 85, 99, 0.6) 0%, rgba(55, 65, 81, 0.4) 100%)',
                          border: '1px solid rgba(75, 85, 99, 0.4)'
                        }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-red-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        <span className="relative text-gray-400 group-hover:text-white">Clear All History</span>
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Main Chat Area */}
            <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
              {/* Header */}
              <div className="relative z-50">
              <ChatHeader
                selectedProduct={selectedProduct}
                products={products}
                onProductChange={handleProductChange}
                onToggleSidebar={handleToggleSidebar}
                onToggleMaximize={() => setIsMaximized(!isMaximized)}
                onClose={onClose}
                isMaximized={isMaximized}
                isSidebarOpen={isSidebarOpen}
                onStartNewChat={handleStartNewChat}
              />
              </div>

              {/* Messages Area */}
              <div className="flex-1 min-h-0 flex flex-col">
                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 scroll-smooth">
                  {messages.length === 0 ? (
                    <motion.div 
                      className="flex items-center justify-center h-full relative"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
                    >
                      {/* Background Ambient Effects */}
                      <div className="absolute inset-0 pointer-events-none overflow-hidden">
                        <motion.div
                          className="absolute top-1/4 left-1/4 w-64 h-64 bg-yellow-500/5 rounded-full blur-3xl"
                          animate={{ 
                            scale: [1, 1.2, 1],
                            opacity: [0.3, 0.5, 0.3]
                          }}
                          transition={{ 
                            duration: 4,
                            repeat: Infinity,
                            ease: "easeInOut"
                          }}
                        />
                        <motion.div
                          className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-blue-500/3 rounded-full blur-3xl"
                          animate={{ 
                            scale: [1.2, 1, 1.2],
                            opacity: [0.2, 0.4, 0.2]
                          }}
                          transition={{ 
                            duration: 5,
                            repeat: Infinity,
                            ease: "easeInOut",
                            delay: 1
                          }}
                        />
                      </div>

                      <div className="relative text-center max-w-2xl mx-auto px-8">
                        {/* Hero Icon */}
                        <motion.div
                          className="relative mx-auto mb-10"
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ 
                            delay: 0.3,
                            duration: 0.8,
                            type: "spring",
                            stiffness: 120,
                            damping: 12
                          }}
                        >
                          <div className="relative w-32 h-32 mx-auto">
                            {/* Outer Ring */}
                            <motion.div
                              className="absolute inset-0 rounded-full border-2 border-yellow-500/20"
                              animate={{ rotate: 360 }}
                              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                            />
                            {/* Inner Glow */}
                            <div className="absolute inset-4 rounded-full bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 backdrop-blur-sm border border-yellow-500/20"></div>
                            {/* Icon Container */}
                            <div className="absolute inset-8 rounded-full bg-gradient-to-br from-yellow-500/20 to-yellow-600/10 flex items-center justify-center border border-yellow-500/30">
                              <MessageSquare className="w-10 h-10 text-yellow-400" />
                            </div>
                            {/* Floating Particles */}
                            {[...Array(3)].map((_, i) => (
                              <motion.div
                                key={i}
                                className="absolute w-1.5 h-1.5 bg-yellow-400/60 rounded-full"
                                style={{
                                  top: `${20 + i * 20}%`,
                                  left: `${20 + i * 30}%`
                                }}
                                animate={{
                                  y: [-10, 10, -10],
                                  opacity: [0.4, 1, 0.4]
                                }}
                                transition={{
                                  duration: 3 + i,
                                  repeat: Infinity,
                                  ease: "easeInOut",
                                  delay: i * 0.7
                                }}
                              />
                            ))}
                          </div>
                        </motion.div>

                        {/* Enhanced Typography */}
                        <motion.h3 
                          className="text-4xl font-bold mb-6 leading-tight"
                          style={{
                            background: 'linear-gradient(135deg, #ffffff 0%, #f3f4f6 40%, #d1d5db 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text'
                          }}
                          initial={{ opacity: 0, y: 30 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.7, duration: 0.6 }}
                        >
                          {selectedProduct ? 'Ready to Assist!' : 'Let\'s Get Started'}
                        </motion.h3>

                        <motion.div
                          className="mb-8"
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.9, duration: 0.6 }}
                        >
                          <p className="text-lg text-gray-300 leading-relaxed mb-4">
                          {selectedProduct 
                              ? `I'm your dedicated AI assistant for ${selectedProduct.name}. Let's explore everything this product has to offer.`
                              : 'Ready to help you with your questions.'
                            }
                          </p>
                        </motion.div>

                        {/* Feature Highlights */}
                        {selectedProduct && (
                          <motion.div
                            className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto"
                            initial={{ opacity: 0, y: 40 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 1.1, duration: 0.6 }}
                          >
                            {[
                              { icon: "🎯", title: "Targeted Insights", desc: "Product-specific guidance" },
                              { icon: "💡", title: "Smart Suggestions", desc: "AI-powered recommendations" },
                              { icon: "🚀", title: "Quick Solutions", desc: "Instant expert assistance" }
                            ].map((feature, index) => (
                              <motion.div
                                key={index}
                                className="p-4 rounded-2xl border border-gray-700/50 bg-gradient-to-br from-gray-800/40 to-gray-900/40 backdrop-blur-sm"
                                whileHover={{ 
                                  scale: 1.05,
                                  borderColor: 'rgba(250, 204, 21, 0.3)'
                                }}
                                transition={{ duration: 0.2 }}
                              >
                                <div className="text-2xl mb-2">{feature.icon}</div>
                                <h4 className="font-semibold text-white text-sm mb-1">{feature.title}</h4>
                                <p className="text-xs text-gray-400">{feature.desc}</p>
                              </motion.div>
                            ))}
                          </motion.div>
                        )}
                      </div>
                    </motion.div>
                  ) : (
                    <>
                      {messages.map((message, index) => (
                        <motion.div
                          key={message.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ 
                            delay: index * 0.1,
                            type: "spring",
                            stiffness: 200,
                            damping: 20
                          }}
                        >
                          <ChatMessage
                            message={message}
                            isLast={index === messages.length - 1}
                            productName={selectedProduct?.name}
                            onCopy={() => navigator.clipboard.writeText(message.text)}
                            onRegenerate={message.sender === 'assistant' ? () => onSendMessage?.(message.text) : undefined}
                          />
                        </motion.div>
                      ))}
                      <div ref={messagesEndRef} />
                    </>
                  )}
                </div>
              </div>

              {/* Enhanced Input Area */}
              <motion.div 
                className="flex-shrink-0 relative overflow-hidden"
                style={{
                  background: 'linear-gradient(135deg, rgba(31, 41, 55, 0.95) 0%, rgba(17, 24, 39, 0.98) 100%)',
                  borderTop: '1px solid rgba(75, 85, 99, 0.3)'
                }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                {/* Ambient Background Glow */}
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute top-0 left-1/4 w-32 h-16 bg-yellow-500/5 rounded-full blur-3xl"></div>
                  <div className="absolute top-0 right-1/4 w-24 h-12 bg-blue-500/3 rounded-full blur-2xl"></div>
                </div>

                <div className="relative p-6">
                <ChatInput
                  value={inputValue}
                  onChange={handleInputChange}
                  onSend={handleSendMessage}
                  status={status}
                  disabled={!selectedProduct || status === 'initializing' || status === 'product_load_error'}
                  placeholder={
                    !selectedProduct 
                      ? "Select a product to start our conversation..."
                      : `Ask me anything about ${selectedProduct.name}...`
                  }
                  autoFocus={!!selectedProduct}
                  enterToSend={true}
                  showCharacterCount={true}
                  showAttachments={true}
                  showVoiceInput={true}
                />
                </div>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ChatInterface; 