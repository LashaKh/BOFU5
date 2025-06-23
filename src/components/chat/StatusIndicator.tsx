import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Loader2, 
  Wifi, 
  WifiOff, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  MessageSquare,
  Bot,
  Zap,
  Pause
} from 'lucide-react';
import { ChatStatus } from '../../types/chat';

interface StatusIndicatorProps {
  status: ChatStatus;
  message?: string;
  show?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'minimal' | 'detailed' | 'floating';
  onRetry?: () => void;
}

const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  status,
  message,
  show = true,
  className = '',
  size = 'md',
  variant = 'detailed',
  onRetry
}) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'initializing':
        return {
          icon: Loader2,
          text: message || 'Initializing chat...',
          color: 'text-blue-500',
          bgColor: 'bg-blue-50 dark:bg-blue-900/20',
          borderColor: 'border-blue-200 dark:border-blue-800',
          spinning: true,
          pulse: false,
        };
      case 'loading':
        return {
          icon: Loader2,
          text: message || 'Loading...',
          color: 'text-blue-500',
          bgColor: 'bg-blue-50 dark:bg-blue-900/20',
          borderColor: 'border-blue-200 dark:border-blue-800',
          spinning: true,
          pulse: false,
        };
      case 'ready':
        return {
          icon: CheckCircle,
          text: message || 'Ready to chat',
          color: 'text-green-500',
          bgColor: 'bg-green-50 dark:bg-green-900/20',
          borderColor: 'border-green-200 dark:border-green-800',
          spinning: false,
          pulse: false,
        };
      case 'typing':
        return {
          icon: MessageSquare,
          text: message || 'AI is typing...',
          color: 'text-blue-500',
          bgColor: 'bg-blue-50 dark:bg-blue-900/20',
          borderColor: 'border-blue-200 dark:border-blue-800',
          spinning: false,
          pulse: true,
        };
      case 'sending':
        return {
          icon: Zap,
          text: message || 'Sending message...',
          color: 'text-blue-500',
          bgColor: 'bg-blue-50 dark:bg-blue-900/20',
          borderColor: 'border-blue-200 dark:border-blue-800',
          spinning: false,
          pulse: true,
        };
      case 'receiving':
        return {
          icon: Bot,
          text: message || 'AI is responding...',
          color: 'text-purple-500',
          bgColor: 'bg-purple-50 dark:bg-purple-900/20',
          borderColor: 'border-purple-200 dark:border-purple-800',
          spinning: false,
          pulse: true,
        };
      case 'assistant_responding':
        return {
          icon: Bot,
          text: message || 'AI is thinking...',
          color: 'text-purple-500',
          bgColor: 'bg-purple-50 dark:bg-purple-900/20',
          borderColor: 'border-purple-200 dark:border-purple-800',
          spinning: false,
          pulse: true,
        };
      case 'error':
        return {
          icon: AlertCircle,
          text: message || 'An error occurred',
          color: 'text-red-500',
          bgColor: 'bg-red-50 dark:bg-red-900/20',
          borderColor: 'border-red-200 dark:border-red-800',
          spinning: false,
          pulse: false,
        };
      case 'product_load_error':
        return {
          icon: WifiOff,
          text: message || 'Failed to load products',
          color: 'text-red-500',
          bgColor: 'bg-red-50 dark:bg-red-900/20',
          borderColor: 'border-red-200 dark:border-red-800',
          spinning: false,
          pulse: false,
        };
      case 'backend_error':
        return {
          icon: AlertCircle,
          text: message || 'Backend connection error',
          color: 'text-red-500',
          bgColor: 'bg-red-50 dark:bg-red-900/20',
          borderColor: 'border-red-200 dark:border-red-800',
          spinning: false,
          pulse: false,
        };
      case 'idle':
        return {
          icon: Pause,
          text: message || 'Select a product to start chatting',
          color: 'text-gray-500',
          bgColor: 'bg-gray-50 dark:bg-gray-800',
          borderColor: 'border-gray-200 dark:border-gray-700',
          spinning: false,
          pulse: false,
        };
      default:
        return {
          icon: Wifi,
          text: message || 'Connected',
          color: 'text-green-500',
          bgColor: 'bg-green-50 dark:bg-green-900/20',
          borderColor: 'border-green-200 dark:border-green-800',
          spinning: false,
          pulse: false,
        };
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return {
          container: 'px-2 py-1 text-xs',
          icon: 'w-3 h-3',
          text: 'text-xs',
        };
      case 'md':
        return {
          container: 'px-3 py-2 text-sm',
          icon: 'w-4 h-4',
          text: 'text-sm',
        };
      case 'lg':
        return {
          container: 'px-4 py-3 text-base',
          icon: 'w-5 h-5',
          text: 'text-base',
        };
    }
  };

  const config = getStatusConfig();
  const sizeClasses = getSizeClasses();
  const IconComponent = config.icon;

  const isErrorStatus = status === 'error' || status === 'product_load_error' || status === 'backend_error';

  if (!show) return null;

  // Typing indicator with dots animation
  const TypingDots = () => (
    <div className="flex space-x-1">
      <motion.div
        className="w-2 h-2 bg-current rounded-full opacity-60"
        animate={{ scale: [1, 1.2, 1], opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 1, repeat: Infinity, delay: 0 }}
      />
      <motion.div
        className="w-2 h-2 bg-current rounded-full opacity-60"
        animate={{ scale: [1, 1.2, 1], opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
      />
      <motion.div
        className="w-2 h-2 bg-current rounded-full opacity-60"
        animate={{ scale: [1, 1.2, 1], opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
      />
    </div>
  );

  // Minimal variant - just icon
  if (variant === 'minimal') {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ duration: 0.2 }}
          className={`inline-flex items-center justify-center ${className}`}
        >
          <motion.div
            animate={{
              rotate: config.spinning ? 360 : 0,
              scale: config.pulse ? [1, 1.1, 1] : 1,
            }}
            transition={{
              rotate: config.spinning ? { duration: 1, repeat: Infinity, ease: "linear" } : {},
              scale: config.pulse ? { duration: 1.5, repeat: Infinity, ease: "easeInOut" } : {},
            }}
            className={`${config.color} ${sizeClasses.icon}`}
          >
            <IconComponent className="w-full h-full" />
          </motion.div>
        </motion.div>
      </AnimatePresence>
    );
  }

  // Floating variant - pill-shaped with backdrop
  if (variant === 'floating') {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.9 }}
          transition={{ duration: 0.3, type: "spring", stiffness: 300, damping: 25 }}
          className={`
            fixed bottom-20 left-1/2 transform -translate-x-1/2 z-50
            ${config.bgColor} ${config.borderColor} border backdrop-blur-sm
            rounded-full shadow-lg ${sizeClasses.container} ${className}
          `}
        >
          <div className="flex items-center space-x-2">
            <motion.div
              animate={{
                rotate: config.spinning ? 360 : 0,
                scale: config.pulse ? [1, 1.2, 1] : 1,
              }}
              transition={{
                rotate: config.spinning ? { duration: 1, repeat: Infinity, ease: "linear" } : {},
                scale: config.pulse ? { duration: 1.5, repeat: Infinity, ease: "easeInOut" } : {},
              }}
              className={`${config.color} ${sizeClasses.icon}`}
            >
              <IconComponent className="w-full h-full" />
            </motion.div>
            <span className={`${config.color} font-medium ${sizeClasses.text}`}>
              {config.text}
            </span>
            {status === 'typing' && <TypingDots />}
          </div>
        </motion.div>
      </AnimatePresence>
    );
  }

  // Default detailed variant
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        transition={{ duration: 0.3 }}
        className={`
          ${config.bgColor} ${config.borderColor} border rounded-lg
          ${sizeClasses.container} ${className}
        `}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <motion.div
              animate={{
                rotate: config.spinning ? 360 : 0,
                scale: config.pulse ? [1, 1.1, 1] : 1,
              }}
              transition={{
                rotate: config.spinning ? { duration: 1, repeat: Infinity, ease: "linear" } : {},
                scale: config.pulse ? { duration: 1.5, repeat: Infinity, ease: "easeInOut" } : {},
              }}
              className={`${config.color} ${sizeClasses.icon}`}
            >
              <IconComponent className="w-full h-full" />
            </motion.div>
            
            <div className="flex items-center space-x-2">
              <span className={`${config.color} font-medium ${sizeClasses.text}`}>
                {config.text}
              </span>
              {status === 'typing' && <TypingDots />}
            </div>
          </div>

          {/* Retry button for error states */}
          {isErrorStatus && onRetry && (
            <motion.button
              onClick={onRetry}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`
                ml-3 px-2 py-1 text-xs font-medium rounded
                ${config.color} hover:bg-current hover:bg-opacity-10
                transition-colors duration-200
              `}
            >
              Retry
            </motion.button>
          )}
        </div>

        {/* Progress bar for certain states */}
        {(status === 'loading' || status === 'initializing') && (
          <motion.div
            className="mt-2 h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <motion.div
              className={`h-full ${config.color.replace('text-', 'bg-')} rounded-full`}
              initial={{ width: '0%' }}
              animate={{ width: '100%' }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            />
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};

export default StatusIndicator; 