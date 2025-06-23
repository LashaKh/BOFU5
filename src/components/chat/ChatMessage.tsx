import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  User, 
  Bot, 
  Copy, 
  MoreVertical, 
  Star, 
  RefreshCw,
  Clock,
  Check,
  AlertCircle
} from 'lucide-react';
import { Message } from '../../types/chat';

interface ChatMessageProps {
  message: Message;
  isLast: boolean;
  productName?: string;
  onCopy?: (text: string) => void;
  onRegenerate?: (messageId: string) => void;
  onFavorite?: (messageId: string) => void;
}

const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  isLast,
  productName,
  onCopy,
  onRegenerate,
  onFavorite
}) => {
  const [showActions, setShowActions] = useState(false);
  const [copied, setCopied] = useState(false);

  const isUser = message.sender === 'user';
  const isError = message.type === 'error';
  const isSystem = message.type === 'system';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.text);
      setCopied(true);
      onCopy?.(message.text);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy message:', error);
    }
  };

  const formatTime = (timestamp: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(timestamp);
  };

  const messageVariants = {
    hidden: { 
      opacity: 0, 
      y: 20,
      scale: 0.95
    },
    visible: { 
      opacity: 1, 
      y: 0,
      scale: 1,
      transition: {
        type: "spring",
        duration: 0.5,
        bounce: 0.1
      }
    }
  };

  const avatarVariants = {
    hidden: { scale: 0, rotate: -180 },
    visible: { 
      scale: 1, 
      rotate: 0,
      transition: {
        type: "spring",
        delay: 0.1,
        duration: 0.4
      }
    }
  };

  // System message styling
  if (isSystem) {
    return (
      <motion.div
        variants={messageVariants}
        initial="hidden"
        animate="visible"
        className="flex justify-center my-4"
      >
        <div className="px-4 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/30 rounded-full">
          <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">
            {message.text}
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      variants={messageVariants}
      initial="hidden"
      animate="visible"
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} group`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className={`
        flex items-end space-x-3 max-w-[85%] lg:max-w-[75%]
        ${isUser ? 'flex-row-reverse space-x-reverse' : 'flex-row'}
      `}>
        {/* Avatar */}
        <motion.div
          variants={avatarVariants}
          initial="hidden"
          animate="visible"
          className={`
            flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center
            ${isUser 
              ? 'bg-gradient-to-br from-blue-500 to-purple-600' 
              : isError
                ? 'bg-gradient-to-br from-red-500 to-pink-600'
                : 'bg-gradient-to-br from-yellow-400 to-yellow-500'
            }
            shadow-lg ring-2 ring-white dark:ring-gray-800
          `}
        >
          {isUser ? (
            <User className="w-5 h-5 text-white" />
          ) : isError ? (
            <AlertCircle className="w-5 h-5 text-white" />
          ) : (
            <Bot className="w-5 h-5 text-white" />
          )}
        </motion.div>

        {/* Message Content */}
        <div className={`
          flex flex-col
          ${isUser ? 'items-end' : 'items-start'}
        `}>
          {/* Message Header */}
          <div className={`
            flex items-center space-x-2 mb-1
            ${isUser ? 'flex-row-reverse space-x-reverse' : 'flex-row'}
          `}>
            <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
              {isUser ? 'You' : (productName || 'AI Assistant')}
            </span>
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {formatTime(message.timestamp)}
            </span>
            {message.metadata?.processingTime && (
              <span className="text-xs text-gray-400 dark:text-gray-500 flex items-center space-x-1">
                <Clock className="w-3 h-3" />
                <span>{message.metadata.processingTime}ms</span>
              </span>
            )}
          </div>

          {/* Message Bubble */}
          <div className={`
            relative px-4 py-3 rounded-2xl shadow-sm
            ${isUser 
              ? 'bg-gradient-to-br from-blue-500 to-purple-600 text-white rounded-br-sm' 
              : isError
                ? 'bg-gradient-to-br from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20 border border-red-200 dark:border-red-800/30 text-red-800 dark:text-red-200 rounded-bl-sm'
                : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-bl-sm'
            }
            ${showActions ? 'ring-2 ring-blue-200 dark:ring-blue-800' : ''}
            transition-all duration-200
          `}>
            {/* Message Text */}
            <div className="prose prose-sm max-w-none">
              <p className={`
                text-sm leading-relaxed whitespace-pre-wrap break-words
                ${isUser 
                  ? 'text-white' 
                  : isError 
                    ? 'text-red-800 dark:text-red-200'
                    : 'text-gray-900 dark:text-white'
                }
              `}>
                {message.text}
              </p>
            </div>

            {/* Message Actions */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ 
                opacity: showActions ? 1 : 0,
                scale: showActions ? 1 : 0.8
              }}
              className={`
                absolute -top-10 flex items-center space-x-1 bg-white dark:bg-gray-800 
                border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg px-2 py-1
                ${isUser ? 'right-0' : 'left-0'}
              `}
            >
              <motion.button
                onClick={handleCopy}
                className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                title="Copy message"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-green-500" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
                )}
              </motion.button>

              {!isUser && !isError && onRegenerate && (
                <motion.button
                  onClick={() => onRegenerate(message.id)}
                  className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  title="Regenerate response"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
                </motion.button>
              )}

              {onFavorite && (
                <motion.button
                  onClick={() => onFavorite(message.id)}
                  className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  title="Add to favorites"
                >
                  <Star className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
                </motion.button>
              )}

              <motion.button
                className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                title="More actions"
              >
                <MoreVertical className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
              </motion.button>
            </motion.div>

            {/* Message Status */}
            {isLast && isUser && (
              <div className="flex items-center justify-end mt-1 space-x-1">
                <Check className="w-3 h-3 text-blue-200" />
                <span className="text-xs text-blue-200">Sent</span>
              </div>
            )}
          </div>

          {/* Message Metadata */}
          {message.metadata && (
            <div className="mt-1 text-xs text-gray-400 dark:text-gray-500">
              {message.metadata.model && (
                <span>Model: {message.metadata.model}</span>
              )}
              {message.metadata.tokens && (
                <span className="ml-2">Tokens: {message.metadata.tokens}</span>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default ChatMessage; 