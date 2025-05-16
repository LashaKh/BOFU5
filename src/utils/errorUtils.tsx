import React from 'react';
import { notify } from './notificationUtils.tsx';

/**
 * Standard error type with additional context
 */
export class AppError extends Error {
  public context?: Record<string, any>;
  public originalError?: any;
  public statusCode?: number;

  constructor(message: string, options?: {
    context?: Record<string, any>;
    originalError?: any;
    statusCode?: number;
  }) {
    super(message);
    this.name = 'AppError';
    this.context = options?.context;
    this.originalError = options?.originalError;
    this.statusCode = options?.statusCode;
  }
}

/**
 * Handles API errors consistently
 * @param error - The error object
 * @param defaultMessage - Default message to show if error handling fails
 * @param silent - If true, no notification will be shown
 */
export const handleApiError = (error: any, defaultMessage = 'An unexpected error occurred', silent = false): AppError => {
  console.error('API Error:', error);
  
  let errorMessage = defaultMessage;
  let statusCode: number | undefined;
  let errorContext: Record<string, any> | undefined;
  
  // Extract information from different error types
  if (error instanceof AppError) {
    errorMessage = error.message;
    statusCode = error.statusCode;
    errorContext = error.context;
  } else if (error?.message) {
    errorMessage = error.message;
    statusCode = error?.status || error?.statusCode;
  } else if (typeof error === 'string') {
    errorMessage = error;
  }
  
  // Create standardized AppError
  const appError = new AppError(errorMessage, {
    originalError: error,
    statusCode,
    context: errorContext,
  });
  
  // Show error notification unless silent mode is requested
  if (!silent) {
    notify('error', errorMessage);
  }
  
  return appError;
};

/**
 * Wraps async operations with consistent error handling
 * @param promise - Promise to handle
 * @param errorMessage - Custom error message
 * @param silent - If true, no notification will be shown on error
 */
export async function withErrorHandling<T>(
  promise: Promise<T>, 
  errorMessage?: string,
  silent = false
): Promise<T> {
  try {
    return await promise;
  } catch (error) {
    throw handleApiError(error, errorMessage, silent);
  }
}

interface ErrorFallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
}

/**
 * Creates an error boundary fallback UI
 * @param error - The error that was caught
 * @param resetErrorBoundary - Function to reset the error state
 */
export const ErrorFallback = ({ 
  error, 
  resetErrorBoundary 
}: ErrorFallbackProps): JSX.Element => {
  return (
    <div className="error-fallback p-4 border border-red-300 bg-red-50 rounded-md">
      <h2 className="text-lg font-semibold text-red-800">Something went wrong</h2>
      <p className="my-2 text-red-700">{error.message}</p>
      <button 
        onClick={resetErrorBoundary}
        className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
      >
        Try again
      </button>
    </div>
  );
};
