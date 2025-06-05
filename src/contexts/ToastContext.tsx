import React, { createContext, useContext } from 'react';
import { ToastContainer, useToast } from '../components/common/ToastContainer';
import type { ToastType } from '../components/common/Toast';

// Defensive check for React availability with better error reporting
if (typeof React === 'undefined' || typeof React.createContext === 'undefined') {
  console.error('React createContext debugging info:');
  console.error('- React import:', typeof React);
  console.error('- React.createContext:', typeof React?.createContext);
  console.error('- window.React:', typeof (window as any)?.React);
  throw new Error('React.createContext is not available. This indicates a critical bundling or import issue.');
}

interface ToastContextType {
  showToast: (message: string, type: ToastType) => void;
}

// Use React.createContext directly with fallback
const ToastContext = React.createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const { addToast } = useToast();

  const showToast = (message: string, type: ToastType) => {
    addToast(message, type);
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <ToastContainer />
    </ToastContext.Provider>
  );
}

export function useToastContext() {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToastContext must be used within a ToastProvider');
  }
  return context;
}
