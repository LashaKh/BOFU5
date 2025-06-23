import React from 'react';
import { motion } from 'framer-motion';
import { User, Bot, AlertTriangle, Info, CheckCircle } from 'lucide-react';

interface MessageBubbleProps {
  children: React.ReactNode;
  sender: 'user' | 'assistant' | 'system' | 'error';
  isLoading?: boolean;
  timestamp?: Date;
  showAvatar?: boolean;
  showTimestamp?: boolean;
  className?: string;
  onHover?: () => void;
  onLeave?: () => void;
  animate?: boolean;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({
  children,
  sender,
  isLoading = false,
  timestamp,
  showAvatar = true,
  showTimestamp = false,
  className = '',
  onHover,
  onLeave,
  animate = true,
}) => {
  const getBubbleStyles = () => {
    switch (sender) {
      case 'user':
        return {
          container: 'justify-end',
          bubble: 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg',
          avatar: 'bg-blue-500 text-white',
          icon: User,
        };
      case 'assistant':
        return {
          container: 'justify-start',
          bubble: 'bg-gray-700 text-gray-100 shadow-lg border border-gray-600',
          avatar: 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white',
          icon: Bot,
        };
      case 'system':
        return {
          container: 'justify-center',
          bubble: 'bg-gray-700 text-gray-300 shadow-sm border border-gray-600',
          avatar: 'bg-gray-500 text-white',
          icon: Info,
        };
      case 'error':
        return {
          container: 'justify-center',
          bubble: 'bg-red-900/30 text-red-200 shadow-sm border border-red-700',
          avatar: 'bg-red-500 text-white',
          icon: AlertTriangle,
        };
      default:
        return {
          container: 'justify-start',
          bubble: 'bg-gray-700 text-gray-100 shadow-sm border border-gray-600',
          avatar: 'bg-gray-500 text-white',
          icon: Info,
        };
    }
  };

  const styles = getBubbleStyles();
  const IconComponent = styles.icon;
  const isSystemMessage = sender === 'system' || sender === 'error';

  const formatTimestamp = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const bubbleVariants = {
    initial: animate ? { opacity: 0, y: 20, scale: 0.95 } : {},
    animate: animate ? { opacity: 1, y: 0, scale: 1 } : {},
    exit: animate ? { opacity: 0, y: -10, scale: 0.95 } : {},
  };

  const avatarVariants = {
    initial: animate ? { scale: 0, rotate: -180 } : {},
    animate: animate ? { scale: 1, rotate: 0 } : {},
    hover: { scale: 1.1, rotate: 5 },
  };

  return (
    <motion.div
      variants={bubbleVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={`flex ${styles.container} mb-4 ${className}`}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
    >
      <div className={`flex items-end space-x-3 max-w-[80%] ${isSystemMessage ? 'max-w-[90%]' : ''}`}>
        {/* Avatar */}
        {showAvatar && !isSystemMessage && (
          <motion.div
            variants={avatarVariants}
            whileHover="hover"
            className={`
              flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center
              ${styles.avatar} shadow-md
            `}
          >
            <IconComponent className="w-4 h-4" />
          </motion.div>
        )}

        {/* Message Container */}
        <div className="flex flex-col">
          {/* Message Bubble */}
          <motion.div
            className={`
              relative px-4 py-3 rounded-2xl max-w-none
              ${styles.bubble}
              ${isLoading ? 'animate-pulse' : ''}
              ${isSystemMessage ? 'rounded-lg text-center text-sm' : ''}
              ${sender === 'user' ? 'rounded-br-md' : 'rounded-bl-md'}
            `}
            whileHover={animate ? { scale: 1.02 } : {}}
            transition={{ duration: 0.2 }}
          >
            {/* Loading indicator for assistant messages */}
            {isLoading && sender === 'assistant' && (
              <div className="flex items-center space-x-2">
                <div className="flex space-x-1">
                  <motion.div
                    className="w-2 h-2 bg-gray-400 rounded-full"
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
                  />
                  <motion.div
                    className="w-2 h-2 bg-gray-400 rounded-full"
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
                  />
                  <motion.div
                    className="w-2 h-2 bg-gray-400 rounded-full"
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
                  />
                </div>
                <span className="text-sm text-gray-500 dark:text-gray-400">AI is thinking...</span>
              </div>
            )}

            {/* Message Content */}
            {!isLoading && (
              <div className="break-words">
                {children}
              </div>
            )}

            {/* System message icon */}
            {isSystemMessage && (
              <div className="flex items-center justify-center space-x-2">
                <IconComponent className="w-4 h-4" />
                <span>{children}</span>
              </div>
            )}

            {/* Message tail */}
            {!isSystemMessage && (
              <div
                className={`
                  absolute bottom-0 w-3 h-3 transform rotate-45
                  ${sender === 'user' 
                    ? 'right-0 translate-x-1 translate-y-1 bg-blue-600' 
                    : 'left-0 -translate-x-1 translate-y-1 bg-gray-700 border-r border-b border-gray-600'
                  }
                `}
              />
            )}
          </motion.div>

          {/* Timestamp */}
          {showTimestamp && timestamp && (
            <motion.div
              initial={animate ? { opacity: 0 } : {}}
              animate={animate ? { opacity: 1 } : {}}
              transition={{ delay: 0.2 }}
              className={`
                text-xs text-gray-500 dark:text-gray-400 mt-1 px-1
                ${sender === 'user' ? 'text-right' : 'text-left'}
                ${isSystemMessage ? 'text-center' : ''}
              `}
            >
              {formatTimestamp(timestamp)}
            </motion.div>
          )}
        </div>

        {/* User Avatar (right side for user messages) */}
        {showAvatar && sender === 'user' && (
          <motion.div
            variants={avatarVariants}
            whileHover="hover"
            className={`
              flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center
              ${styles.avatar} shadow-md
            `}
          >
            <IconComponent className="w-4 h-4" />
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};

export default MessageBubble; 