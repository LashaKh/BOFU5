import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { 
  MessageSquare, 
  X, 
  Settings, 
  History, 
  Search, 
  MoreHorizontal,
  Maximize2,
  Minimize2,
  ChevronDown,
  Sparkles,
  Brain,
  Plus,
  Zap,
  Shield,
  Globe
} from 'lucide-react';
import { Product } from '../../types/chat';

interface ChatHeaderProps {
  selectedProduct?: Product | null;
  products?: Product[];
  onProductChange?: (product: Product) => void;
  onToggleSidebar?: () => void;
  onToggleMaximize?: () => void;
  onClose?: () => void;
  isMaximized?: boolean;
  isSidebarOpen?: boolean;
  onStartNewChat?: () => void;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({
  selectedProduct = null,
  products = [],
  onProductChange,
  onToggleSidebar,
  onToggleMaximize,
  onClose,
  isMaximized = false,
  isSidebarOpen = false,
  onStartNewChat
}) => {
  const [isProductDropdownOpen, setIsProductDropdownOpen] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const productButtonRef = useRef<HTMLButtonElement>(null);
  const moreButtonRef = useRef<HTMLButtonElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const [moreMenuPosition, setMoreMenuPosition] = useState({ top: 0, left: 0 });

  // Calculate dropdown position when opened
  useEffect(() => {
    if (isProductDropdownOpen && productButtonRef.current) {
      const rect = productButtonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 8,
        left: rect.left
      });
    }
  }, [isProductDropdownOpen]);

  // Calculate more menu position when opened
  useEffect(() => {
    if (isMoreMenuOpen && moreButtonRef.current) {
      const rect = moreButtonRef.current.getBoundingClientRect();
      setMoreMenuPosition({
        top: rect.bottom + 8,
        left: rect.right - 224 // 224px is the width of the menu (w-56)
      });
    }
  }, [isMoreMenuOpen]);

  const handleProductSelect = (product: Product) => {
    onProductChange?.(product);
    setIsProductDropdownOpen(false);
  };

  return (
    <div className="relative overflow-hidden bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-b border-gray-200/30 dark:border-gray-700/30">
      {/* Remove ambient background effects section entirely */}

      <div className="relative px-5 py-2">
        <div className="flex items-center justify-between">
          {/* Enhanced Left Section */}
          <div className="flex items-center space-x-6">
            {/* Premium History Toggle */}
            <motion.button
              onClick={onToggleSidebar}
              className="group relative p-3 rounded-2xl text-white shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden"
              style={{ background: 'linear-gradient(135deg, #eab308, #f59e0b)' }}
              whileHover={{ scale: 1.05, y: -1 }}
              whileTap={{ scale: 0.95 }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <History className="w-5 h-5 relative z-10 group-hover:rotate-12 transition-transform duration-300" />
            </motion.button>

            {/* Sophisticated Brand Section */}
            <motion.div 
              className="flex items-center space-x-4"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
            >
              <div className="relative">
                <motion.div 
                  className="w-10 h-10 rounded-2xl flex items-center justify-center relative overflow-hidden"
                  style={{ background: 'linear-gradient(135deg, #facc15, #f59e0b)' }}
                  whileHover={{ rotate: 5 }}
                  transition={{ duration: 0.3 }}
                >
                  <Brain className="w-6 h-6 text-white relative z-10" />
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-tr from-white/30 to-transparent"
                    animate={{ opacity: [0.3, 0.6, 0.3] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                </motion.div>
                {/* Status Indicator */}
                <motion.div
                  className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-white rounded-full"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900 dark:text-white">
                  AI Assistant
                </h1>
                <motion.p 
                  className="text-xs text-gray-600 dark:text-gray-400 flex items-center space-x-1"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                >
                  <Zap className="w-3 h-3 text-yellow-500" />
                  <span>Powered by Advanced Intelligence</span>
                </motion.p>
              </div>
            </motion.div>

            {/* Revolutionary Product Selector */}
            <div className="relative">
              <motion.button
                onClick={() => setIsProductDropdownOpen(!isProductDropdownOpen)}
                className="group relative flex items-center space-x-3 px-6 py-3 rounded-2xl transition-all duration-300 overflow-hidden min-w-[280px]"
                style={{
                  background: selectedProduct 
                    ? 'rgba(34, 197, 94, 0.1)'
                    : 'rgba(156, 163, 175, 0.1)',
                  border: selectedProduct 
                    ? '1px solid rgba(34, 197, 94, 0.2)'
                    : '1px solid rgba(156, 163, 175, 0.2)',
                  backdropFilter: 'blur(8px)'
                }}
                whileHover={{ scale: 1.02, y: -1 }}
                whileTap={{ scale: 0.98 }}
                ref={productButtonRef}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                
                <div className="relative z-10 flex items-center space-x-3 flex-1">
                  <motion.div
                    className="w-8 h-8 rounded-xl flex items-center justify-center"
                    style={{
                      background: selectedProduct 
                        ? 'linear-gradient(135deg, #10b981, #059669)'
                        : 'linear-gradient(135deg, #9ca3af, #6b7280)'
                    }}
                    whileHover={{ rotate: 10 }}
                    transition={{ duration: 0.2 }}
                  >
                    {selectedProduct ? (
                      <Shield className="w-4 h-4 text-white" />
                    ) : (
                      <Globe className="w-4 h-4 text-white" />
                    )}
                  </motion.div>
                  
                  <div className="flex-1 text-left">
                    <div className="font-semibold text-gray-900 dark:text-white text-sm">
                      {selectedProduct ? selectedProduct.name : 'Choose Your Product'}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                      {selectedProduct 
                        ? 'Connected & Ready' 
                        : `${products.length} products available`
                      }
                    </div>
                  </div>
                  
                  <motion.div
                    animate={{ rotate: isProductDropdownOpen ? 180 : 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                  </motion.div>
                </div>
              </motion.button>

              {/* Enhanced Product Dropdown - Rendered via Portal */}
              {isProductDropdownOpen && createPortal(
                <AnimatePresence>
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
                    className="fixed w-96 rounded-2xl shadow-2xl overflow-hidden"
                    style={{
                      top: dropdownPosition.top,
                      left: dropdownPosition.left,
                      zIndex: 999999,
                      background: 'rgba(255, 255, 255, 0.95)',
                      backdropFilter: 'blur(20px)',
                      border: '1px solid rgba(229, 231, 235, 0.3)'
                    }}
                  >
                    {/* Dropdown Header */}
                    <div className="p-4 border-b border-gray-200/30">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-bold text-gray-800">
                          Select Your Product ({products.length})
                        </h3>
                        <motion.button
                          onClick={() => setIsProductDropdownOpen(false)}
                          className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-800 transition-colors"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <X className="w-4 h-4" />
                        </motion.button>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        Choose a product to unlock AI-powered insights
                      </p>
                    </div>

                    {/* Products List */}
                    <div className="max-h-80 overflow-y-auto p-2">
                      {products.map((product, index) => (
                        <motion.button
                          key={product.id}
                          onClick={() => handleProductSelect(product)}
                          className={`w-full p-4 rounded-xl text-left transition-all duration-200 mb-2 group relative overflow-hidden ${
                            selectedProduct?.id === product.id
                              ? 'bg-gradient-to-r from-yellow-500/20 to-yellow-600/10 border-2 border-yellow-500/30'
                              : 'bg-gray-50/50 hover:bg-gray-100/80 border-2 border-transparent hover:border-gray-200/50'
                          }`}
                          whileHover={{ scale: 1.02, y: -1 }}
                          whileTap={{ scale: 0.98 }}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                        >
                          <div className="flex items-center space-x-3">
                            <div className={`p-2 rounded-lg ${
                              selectedProduct?.id === product.id
                                ? 'bg-yellow-500 text-white'
                                : 'bg-gradient-to-br from-gray-200 to-gray-300 text-gray-700 group-hover:from-yellow-400 group-hover:to-yellow-500 group-hover:text-white'
                            }`}>
                              <Globe className="w-5 h-5" />
                            </div>
                            <div className="flex-1">
                              <h4 className="font-semibold text-gray-800 group-hover:text-gray-900">
                                {product.name}
                              </h4>
                              {product.description && (
                                <p className="text-sm text-gray-600 mt-0.5 line-clamp-2">
                                  {product.description}
                                </p>
                              )}
                            </div>
                            {selectedProduct?.id === product.id && (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="p-1.5 bg-yellow-500 rounded-full"
                              >
                                <div className="w-2 h-2 bg-white rounded-full" />
                              </motion.div>
                            )}
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  </motion.div>
                </AnimatePresence>,
                document.body
              )}
            </div>
          </div>

          {/* Enhanced Right Section */}
          <div className="flex items-center space-x-3">
            {/* Premium Action Menu */}
            <div className="relative">
              <motion.button
                onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
                className="p-3 rounded-2xl transition-all duration-300 group relative overflow-hidden"
                style={{
                  background: 'linear-gradient(135deg, rgba(156, 163, 175, 0.1) 0%, rgba(107, 114, 128, 0.05) 100%)',
                  border: '1px solid rgba(156, 163, 175, 0.2)'
                }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                ref={moreButtonRef}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <MoreHorizontal className="w-5 h-5 text-gray-600 relative z-10" />
              </motion.button>

              {/* Enhanced Actions Dropdown - Rendered via Portal */}
              {isMoreMenuOpen && createPortal(
                <AnimatePresence>
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    className="fixed w-56 rounded-2xl shadow-2xl overflow-hidden"
                    style={{
                      top: moreMenuPosition.top,
                      left: moreMenuPosition.left,
                      zIndex: 999999,
                      background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(249, 250, 251, 0.90) 100%)',
                      backdropFilter: 'blur(20px)',
                      border: '1px solid rgba(229, 231, 235, 0.3)'
                    }}
                  >
                    <div className="p-2">
                      <motion.button 
                        className="w-full text-left px-4 py-3 rounded-xl hover:bg-gray-50/80 transition-all duration-200 flex items-center space-x-3 group"
                        whileHover={{ x: 4 }}
                      >
                        <Search className="w-4 h-4 text-gray-500 group-hover:text-yellow-500 transition-colors" />
                        <span className="text-sm text-gray-700 group-hover:text-gray-900 font-medium">Search Messages</span>
                      </motion.button>
                      <motion.button 
                        className="w-full text-left px-4 py-3 rounded-xl hover:bg-gray-50/80 transition-all duration-200 flex items-center space-x-3 group"
                        whileHover={{ x: 4 }}
                      >
                        <Settings className="w-4 h-4 text-gray-500 group-hover:text-yellow-500 transition-colors" />
                        <span className="text-sm text-gray-700 group-hover:text-gray-900 font-medium">Chat Settings</span>
                      </motion.button>
                    </div>
                  </motion.div>
                </AnimatePresence>,
                document.body
              )}
            </div>

            {/* Premium New Chat Button */}
            <motion.button
              onClick={() => onStartNewChat?.()}
              className="group relative p-3 rounded-2xl text-white shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden"
              style={{ background: 'linear-gradient(135deg, #eab308, #f59e0b)' }}
              whileHover={{ scale: 1.05, y: -1 }}
              whileTap={{ scale: 0.95 }}
              title="Start New Chat"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <Plus className="w-5 h-5 relative z-10 group-hover:rotate-90 transition-transform duration-300" />
            </motion.button>

            {/* Elegant Maximize/Minimize */}
            <motion.button
              onClick={onToggleMaximize}
              className="p-3 rounded-2xl transition-all duration-300 group relative overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, rgba(156, 163, 175, 0.1) 0%, rgba(107, 114, 128, 0.05) 100%)',
                border: '1px solid rgba(156, 163, 175, 0.2)'
              }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              title={isMaximized ? "Restore" : "Maximize"}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              {isMaximized ? (
                <Minimize2 className="w-5 h-5 text-gray-600 relative z-10" />
              ) : (
                <Maximize2 className="w-5 h-5 text-gray-600 relative z-10" />
              )}
            </motion.button>

            {/* Premium Close Button */}
            <motion.button
              onClick={onClose}
              className="group relative p-3 rounded-2xl transition-all duration-300 overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(220, 38, 38, 0.05) 100%)',
                border: '1px solid rgba(239, 68, 68, 0.2)'
              }}
              whileHover={{ scale: 1.05, y: -1 }}
              whileTap={{ scale: 0.95 }}
              title="Close Chat"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-red-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <X className="w-5 h-5 text-red-600 relative z-10 group-hover:rotate-90 transition-transform duration-300" />
            </motion.button>
          </div>
        </div>
      </div>

      {/* Click outside handlers */}
      {(isProductDropdownOpen || isMoreMenuOpen) && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => {
            setIsProductDropdownOpen(false);
            setIsMoreMenuOpen(false);
          }}
        />
      )}
    </div>
  );
};

export default ChatHeader; 