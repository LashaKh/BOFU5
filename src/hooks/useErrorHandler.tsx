import { useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { AlertTriangle, CheckCircle, Info } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';

interface ErrorOptions {
  title?: string;
  fallbackMessage?: string;
  showError?: boolean;
  retry?: () => Promise<void>;
}

export function useErrorHandler() {
  const handleError = useCallback((error: unknown, options: ErrorOptions = {}) => {
    const {
      title = 'Error',
      fallbackMessage = 'An unexpected error occurred',
      showError = process.env.NODE_ENV === 'development',
      retry
    } = options;

    console.error('Error caught by useErrorHandler:', error);

    const errorMessage = error instanceof Error ? error.message : fallbackMessage;
    
    toast.error(
      <div className="flex items-center gap-3">
        <AlertTriangle className="h-5 w-5 text-red-500" />
        <div>
          <p className="font-medium">{title}</p>
          <p className="text-sm text-gray-500">
            {showError ? errorMessage : fallbackMessage}
          </p>
        </div>
        {retry && (
          <button
            onClick={() => {
              toast.dismiss();
              retry();
            }}
            className="ml-2 text-sm text-red-600 hover:text-red-700"
          >
            Retry
          </button>
        )}
      </div>
    );

    return error;
  }, []);

  const showSuccess = useCallback((message: string, title?: string) => {
    toast.success(
      <div className="flex items-center gap-3">
        <CheckCircle className="h-5 w-5 text-green-500" />
        <div>
          {title && <p className="font-medium">{title}</p>}
          <p className="text-sm text-gray-600">{message}</p>
        </div>
      </div>
    );
  }, []);

  const showInfo = useCallback((message: string, title?: string) => {
    toast.custom(
      <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 p-4 rounded-lg">
        <Info className="h-5 w-5 text-blue-500" />
        <div>
          {title && <p className="font-medium text-blue-700">{title}</p>}
          <p className="text-sm text-blue-600">{message}</p>
        </div>
      </div>
    );
  }, []);

  return {
    handleError,
    showSuccess,
    showInfo
  };
}
