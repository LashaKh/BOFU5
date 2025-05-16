import React, { createContext, useContext } from 'react';
import { ToastContainer, useToast } from '../components/common/ToastContainer';
import type { ToastType } from '../components/common/Toast';

interface ToastContextType {
  showToast: (message: string, type: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

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
