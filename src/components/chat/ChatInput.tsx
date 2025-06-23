import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Paperclip, Mic, Smile, Square, Sparkles, Zap, Brain, Wand2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChatStatus } from '../../types/chat';

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  status: ChatStatus;
  disabled?: boolean;
  placeholder?: string;
  maxLength?: number;
  autoFocus?: boolean;
  enterToSend?: boolean;
  showCharacterCount?: boolean;
  showAttachments?: boolean;
  showVoiceInput?: boolean;
  showEmoji?: boolean;
  onKeyPress?: (e: React.KeyboardEvent) => void;
}

const ChatInput: React.FC<ChatInputProps> = ({
  value,
  onChange,
  onSend,
  status,
  disabled = false,
  placeholder = "Type your message...",
  maxLength = 2000,
  autoFocus = false,
  enterToSend = true,
  showCharacterCount = true,
  showAttachments = false,
  showVoiceInput = false,
  showEmoji = false,
  onKeyPress
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [isComposing, setIsComposing] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const isDisabled = disabled || status === 'sending' || status === 'receiving' || status === 'loading';
  const canSend = value.trim().length > 0 && !isDisabled;
  const characterCount = value.length;
  const isNearLimit = characterCount > maxLength * 0.8;
  const isOverLimit = characterCount > maxLength;

  // Auto-resize textarea (more compact)
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      const maxHeight = 42; // 20% shorter than 52px
      textareaRef.current.style.height = `${Math.min(scrollHeight, maxHeight)}px`;
    }
  }, [value]);

  // Auto-focus on mount
  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [autoFocus]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (onKeyPress) {
      onKeyPress(e);
    }

    if (e.key === 'Enter') {
      if (enterToSend && !e.shiftKey && !isComposing) {
        e.preventDefault();
        if (canSend) {
          onSend();
        }
      }
    }
  }, [enterToSend, canSend, onSend, isComposing, onKeyPress]);

  const handleSendClick = useCallback(() => {
    if (canSend) {
      onSend();
    }
  }, [canSend, onSend]);

  const getStatusConfig = () => {
    switch (status) {
      case 'sending':
        return { text: 'Sending...', color: 'text-blue-400', bgColor: 'bg-blue-500/10', borderColor: 'border-blue-500/20' };
      case 'receiving':
        return { text: 'AI is responding...', color: 'text-yellow-400', bgColor: 'bg-yellow-500/10', borderColor: 'border-yellow-500/20' };
      case 'loading':
        return { text: 'Loading...', color: 'text-purple-400', bgColor: 'bg-purple-500/10', borderColor: 'border-purple-500/20' };
      case 'typing':
        return { text: 'AI is typing...', color: 'text-green-400', bgColor: 'bg-green-500/10', borderColor: 'border-green-500/20' };
      case 'error':
        return { text: 'Error occurred', color: 'text-red-400', bgColor: 'bg-red-500/10', borderColor: 'border-red-500/20' };
      default:
        return null;
    }
  };

  const statusConfig = getStatusConfig();

  return (
    <motion.div
      ref={containerRef}
      className="relative group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
    >
      {/* Ambient Background Glow */}
      <motion.div
        className="absolute -inset-2 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{
          background: 'linear-gradient(135deg, rgba(250, 204, 21, 0.1) 0%, rgba(59, 130, 246, 0.05) 50%, rgba(168, 85, 247, 0.05) 100%)',
          filter: 'blur(20px)'
        }}
        animate={{
          scale: [1, 1.02, 1],
          opacity: isFocused ? [0.3, 0.5, 0.3] : 0
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />

      {/* Main Container */}
      <motion.div
        className="relative overflow-hidden rounded-2xl backdrop-blur-xl shadow-2xl border transition-all duration-300"
        style={{
          background: isFocused 
            ? 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(249, 250, 251, 0.90) 100%)'
            : 'linear-gradient(135deg, rgba(255, 255, 255, 0.90) 0%, rgba(249, 250, 251, 0.85) 100%)',
          borderColor: isFocused 
            ? 'rgba(250, 204, 21, 0.3)'
            : isHovered 
              ? 'rgba(156, 163, 175, 0.4)'
              : 'rgba(156, 163, 175, 0.2)'
        }}
        whileHover={{ y: -1, shadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}
        animate={{
          scale: isFocused ? 1.01 : 1
        }}
        transition={{ duration: 0.2 }}
      >
        {/* Status Indicator */}
      <AnimatePresence>
          {statusConfig && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
              className={`px-4 py-2 border-b ${statusConfig.bgColor} ${statusConfig.borderColor}`}
          >
              <div className="flex items-center space-x-3">
              <motion.div
                  className={`w-2 h-2 rounded-full ${statusConfig.color.replace('text-', 'bg-')}`}
                  animate={{ 
                    scale: [1, 1.3, 1],
                    opacity: [0.7, 1, 0.7]
                  }}
                  transition={{ 
                    duration: 1.5, 
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                />
                <span className={`text-sm font-medium ${statusConfig.color}`}>
                  {statusConfig.text}
              </span>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                >
                  <Sparkles className={`w-3 h-3 ${statusConfig.color}`} />
                </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

        {/* Input Section */}
        <div className="relative p-1.5">
          {/* Floating Action Buttons */}
          <div className="absolute right-1.5 top-1.5 flex items-center space-x-1">
            {/* Enhanced Action Buttons */}
            {showAttachments && (
              <motion.button
                whileHover={{ scale: 1.1, rotate: 10 }}
                whileTap={{ scale: 0.9 }}
                className="p-2 rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 hover:from-yellow-100 hover:to-yellow-200 text-gray-600 hover:text-yellow-600 transition-all duration-200 shadow-sm hover:shadow-md"
                disabled={isDisabled}
                title="Attach file"
              >
                <Paperclip className="w-4 h-4" />
              </motion.button>
            )}

            {showVoiceInput && (
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="p-2 rounded-lg bg-gradient-to-br from-blue-100 to-blue-200 hover:from-blue-200 hover:to-blue-300 text-blue-600 hover:text-blue-700 transition-all duration-200 shadow-sm hover:shadow-md"
                disabled={isDisabled}
                title="Voice input"
              >
                <Mic className="w-4 h-4" />
              </motion.button>
            )}

            {showEmoji && (
              <motion.button
                whileHover={{ scale: 1.1, rotate: -10 }}
                whileTap={{ scale: 0.9 }}
                className="p-2 rounded-lg bg-gradient-to-br from-purple-100 to-purple-200 hover:from-purple-200 hover:to-purple-300 text-purple-600 hover:text-purple-700 transition-all duration-200 shadow-sm hover:shadow-md"
                disabled={isDisabled}
                title="Add emoji"
              >
                <Smile className="w-4 h-4" />
              </motion.button>
            )}

            {/* Premium Send Button */}
            <motion.button
              onClick={handleSendClick}
              disabled={!canSend}
              whileHover={canSend ? { scale: 1.05, y: -2 } : {}}
              whileTap={canSend ? { scale: 0.95 } : {}}
              className={`
                relative p-2.5 rounded-lg transition-all duration-300 shadow-lg overflow-hidden
                ${canSend
                  ? 'bg-gradient-to-br from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-white shadow-yellow-500/25 hover:shadow-yellow-500/40'
                  : 'bg-gradient-to-br from-gray-200 to-gray-300 text-gray-400 cursor-not-allowed'
                }
              `}
              title={enterToSend ? 'Send message (Enter)' : 'Send message'}
            >
              {/* Button Glow Effect */}
              {canSend && (
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent"
                  animate={{ x: [-100, 100] }}
                  transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 2 }}
                />
              )}
              
              <div className="relative z-10">
                {status === 'sending' ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  >
                    <Brain className="w-4 h-4" />
                  </motion.div>
                ) : (
                  <motion.div
                    animate={canSend ? { x: [0, 2, 0] } : {}}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <Send className="w-4 h-4" />
                  </motion.div>
                )}
              </div>
            </motion.button>
          </div>

          {/* Enhanced Textarea */}
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onCompositionStart={() => setIsComposing(true)}
          onCompositionEnd={() => setIsComposing(false)}
          placeholder={placeholder}
          disabled={isDisabled}
          maxLength={maxLength}
          className={`
                w-full pr-32 py-1 px-2.5 resize-none outline-none bg-transparent text-gray-900 placeholder-gray-500
                min-h-[28px] max-h-[42px] overflow-y-auto leading-relaxed
                ${isOverLimit ? 'text-red-600' : ''}
            ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}
          `}
              style={{ 
                fontSize: '14px',
                lineHeight: '1.3',
                scrollbarWidth: 'thin',
                scrollbarColor: 'rgba(156, 163, 175, 0.3) transparent'
              }}
            />
          </div>
            </div>
          </motion.div>
    </motion.div>
  );
};

export default ChatInput; 