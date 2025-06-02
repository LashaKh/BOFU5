import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Save, Check, X, Loader2 } from 'lucide-react';

interface SaveStatusIndicatorProps {
  status: 'idle' | 'saving' | 'success' | 'error';
  hasUnsavedChanges: boolean;
  lastSaved?: Date | null;
  className?: string;
}

export function SaveStatusIndicator({
  status,
  hasUnsavedChanges,
  lastSaved,
  className = ''
}: SaveStatusIndicatorProps) {
  const getStatusInfo = () => {
    switch (status) {
      case 'saving':
        return {
          icon: <Loader2 className="animate-spin" size={14} />,
          text: 'Saving...',
          bgColor: 'bg-blue-100',
          textColor: 'text-blue-700',
          borderColor: 'border-blue-200'
        };
      case 'success':
        return {
          icon: <Check size={14} />,
          text: 'Saved',
          bgColor: 'bg-green-100',
          textColor: 'text-green-700',
          borderColor: 'border-green-200'
        };
      case 'error':
        return {
          icon: <X size={14} />,
          text: 'Error saving',
          bgColor: 'bg-red-100',
          textColor: 'text-red-700',
          borderColor: 'border-red-200'
        };
      default:
        if (hasUnsavedChanges) {
          return {
            icon: <Save size={14} />,
            text: 'Unsaved changes',
            bgColor: 'bg-amber-100',
            textColor: 'text-amber-700',
            borderColor: 'border-amber-200'
          };
        }
        return null;
    }
  };

  const statusInfo = getStatusInfo();
  
  const formatLastSaved = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    return date.toLocaleDateString();
  };

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <AnimatePresence mode="wait">
        {statusInfo && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.2 }}
            className={`
              flex items-center space-x-1 px-2 py-1 rounded-md border
              ${statusInfo.bgColor} ${statusInfo.textColor} ${statusInfo.borderColor}
            `}
          >
            {statusInfo.icon}
            <span className="text-xs font-medium">{statusInfo.text}</span>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Last saved timestamp - only show when idle and recently saved */}
      {status === 'idle' && !hasUnsavedChanges && lastSaved && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-xs text-gray-500"
        >
          Saved {formatLastSaved(lastSaved)}
        </motion.div>
      )}
    </div>
  );
} 