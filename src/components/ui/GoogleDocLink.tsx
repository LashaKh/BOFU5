import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ExternalLink, FileText, Copy, Check } from 'lucide-react';

interface GoogleDocLinkProps {
  url: string;
  className?: string;
  variant?: 'light' | 'dark';
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showCopyButton?: boolean;
}

export const GoogleDocLink: React.FC<GoogleDocLinkProps> = ({ 
  url, 
  className = "", 
  variant = 'light',
  showLabel = true,
  size = 'md',
  showCopyButton = false
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy URL:', err);
    }
  };
  const sizeClasses = {
    sm: {
      padding: 'px-2 py-1',
      text: 'text-xs',
      icon: 12,
      indicator: 'w-1 h-1'
    },
    md: {
      padding: 'px-2.5 py-1.5',
      text: 'text-sm',
      icon: 13,
      indicator: 'w-1.5 h-1.5'
    },
    lg: {
      padding: 'px-3 py-2',
      text: 'text-base',
      icon: 16,
      indicator: 'w-2 h-2'
    }
  };

  const variantClasses = {
    light: {
      background: 'bg-gradient-to-r from-blue-50 to-emerald-50 hover:from-blue-100 hover:to-emerald-100',
      border: 'border-blue-200 hover:border-blue-300',
      text: 'text-blue-600 group-hover:text-blue-700',
      shadow: 'hover:shadow-md hover:shadow-blue-200/50',
      indicator: 'bg-emerald-500',
      separator: 'bg-gray-300'
    },
    dark: {
      background: 'bg-gradient-to-r from-blue-500/10 to-emerald-500/10 hover:from-blue-500/20 hover:to-emerald-500/20',
      border: 'border-blue-500/20 hover:border-blue-400/40',
      text: 'text-blue-400 group-hover:text-blue-300',
      shadow: 'hover:shadow-lg hover:shadow-blue-500/20',
      indicator: 'bg-emerald-400',
      separator: 'bg-gray-600'
    }
  };

  const currentSize = sizeClasses[size];
  const currentVariant = variantClasses[variant];

  return (
    <motion.div 
      className={`flex items-center space-x-1 ${className}`}
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.3 }}
    >
      <div className={`h-4 w-px ${currentVariant.separator} mx-1`} />
      <a 
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className={`
          group flex items-center space-x-1.5 
          ${currentSize.padding} 
          ${currentVariant.background}
          border ${currentVariant.border}
          rounded-lg transition-all duration-200 
          ${currentVariant.shadow}
          hover:scale-[1.02] active:scale-[0.98]
        `}
        title="Open source Google Document"
      >
        <ExternalLink 
          size={currentSize.icon} 
          className={`${currentVariant.text} transition-colors`} 
        />
        {showLabel && (
          <span className={`${currentVariant.text} font-medium transition-colors ${currentSize.text}`}>
            Google Doc
          </span>
        )}
        <motion.div
          className={`${currentSize.indicator} ${currentVariant.indicator} rounded-full opacity-0 group-hover:opacity-100`}
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.5, 1, 0.5]
          }}
          transition={{ 
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      </a>
      
      {showCopyButton && (
        <motion.button
          onClick={handleCopy}
          className={`
            ml-1 p-1.5 rounded-md transition-all duration-200
            ${currentVariant.background}
            border ${currentVariant.border}
            hover:scale-105 active:scale-95
          `}
          title={copied ? "Copied!" : "Copy Google Doc URL"}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 }}
        >
          {copied ? (
            <Check size={currentSize.icon - 2} className="text-emerald-500" />
          ) : (
            <Copy size={currentSize.icon - 2} className={`${currentVariant.text} transition-colors`} />
          )}
        </motion.button>
      )}
    </motion.div>
  );
};

export default GoogleDocLink;