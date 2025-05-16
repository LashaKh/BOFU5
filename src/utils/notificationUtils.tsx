import React from 'react';
import { toast, ToastOptions } from 'react-hot-toast';

type NotificationType = 'success' | 'error' | 'info' | 'loading';

interface NotificationOptions extends ToastOptions {
  description?: string;
}

const defaultOptions: ToastOptions = {
  duration: 4000,
  position: 'top-right',
};

/**
 * Show a notification toast
 * @param type - Type of notification
 * @param message - Main notification message
 * @param options - Additional options for the toast
 * @returns Toast ID
 */
export const notify = (
  type: NotificationType,
  message: string,
  options?: NotificationOptions
): string => {
  const { description, ...restOptions } = options || {};
  const toastOptions = { ...defaultOptions, ...restOptions };
  
  const content = (
    <div>
      <p className="font-medium">{message}</p>
      {description && <p className="text-sm opacity-90">{description}</p>}
    </div>
  );
  
  switch (type) {
    case 'success':
      return toast.success(content, toastOptions);
    case 'error':
      return toast.error(content, toastOptions);
    case 'loading':
      return toast.loading(content, toastOptions);
    case 'info':
    default:
      return toast(content, toastOptions);
  }
};

/**
 * Update an existing toast notification
 * @param id - ID of the toast to update
 * @param type - New type of notification
 * @param message - New message
 * @param options - Additional options for the toast
 */
export const updateNotification = (
  id: string,
  type: NotificationType,
  message: string,
  options?: NotificationOptions
): void => {
  const { description, ...restOptions } = options || {};
  const toastOptions = { ...defaultOptions, ...restOptions, id };
  
  const content = (
    <div>
      <p className="font-medium">{message}</p>
      {description && <p className="text-sm opacity-90">{description}</p>}
    </div>
  );
  
  switch (type) {
    case 'success':
      toast.success(content, toastOptions);
      break;
    case 'error':
      toast.error(content, toastOptions);
      break;
    case 'loading':
      toast.loading(content, toastOptions);
      break;
    case 'info':
    default:
      toast(content, toastOptions);
      break;
  }
};

/**
 * Dismiss a notification toast
 * @param id - ID of the toast to dismiss
 */
export const dismissNotification = (id: string): void => {
  toast.dismiss(id);
};

/**
 * Utility to create loading notifications that will update to success/error when the promise resolves/rejects
 * @param promise - Promise to track
 * @param messages - Messages for loading, success, and error states
 * @param options - Additional options for the toast
 * @returns The original promise
 */
export const promiseNotification = <T,>(
  promise: Promise<T>,
  messages: {
    loading: string;
    success: string;
    error: string | ((err: any) => string);
  },
  options?: NotificationOptions
): Promise<T> => {
  toast.promise(
    promise,
    messages,
    { ...defaultOptions, ...(options || {}) }
  );
  
  return promise;
};
