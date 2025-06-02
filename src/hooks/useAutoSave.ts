import { useCallback, useEffect, useRef, useState } from 'react';
import { ProductAnalysis } from '../types/product/types';

interface UseAutoSaveProps {
  data: ProductAnalysis;
  onSave: (data: ProductAnalysis) => Promise<boolean>;
  delay?: number;
  enabled?: boolean;
}

interface UseAutoSaveReturn {
  isSaving: boolean;
  hasUnsavedChanges: boolean;
  lastSaved: Date | null;
  saveStatus: 'idle' | 'saving' | 'success' | 'error';
  forceSave: () => Promise<void>;
}

export function useAutoSave({
  data,
  onSave,
  delay = 2000, // 2 seconds default
  enabled = true
}: UseAutoSaveProps): UseAutoSaveReturn {
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastDataRef = useRef<string>('');
  const isInitialMount = useRef(true);

  const performSave = useCallback(async () => {
    if (!enabled || !hasUnsavedChanges) return;

    setIsSaving(true);
    setSaveStatus('saving');

    try {
      const success = await onSave(data);
      if (success) {
        setHasUnsavedChanges(false);
        setLastSaved(new Date());
        setSaveStatus('success');
        lastDataRef.current = JSON.stringify(data);
        
        // Clear success status after 2 seconds
        setTimeout(() => {
          setSaveStatus('idle');
        }, 2000);
      } else {
        setSaveStatus('error');
        // Clear error status after 5 seconds
        setTimeout(() => {
          setSaveStatus('idle');
        }, 5000);
      }
    } catch (error) {
      console.error('Auto-save error:', error);
      setSaveStatus('error');
      // Clear error status after 5 seconds
      setTimeout(() => {
        setSaveStatus('idle');
      }, 5000);
    } finally {
      setIsSaving(false);
    }
  }, [data, onSave, enabled, hasUnsavedChanges]);

  const forceSave = useCallback(async () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    await performSave();
  }, [performSave]);

  useEffect(() => {
    const currentDataString = JSON.stringify(data);
    
    // Skip the initial mount to avoid false positive for unsaved changes
    if (isInitialMount.current) {
      lastDataRef.current = currentDataString;
      isInitialMount.current = false;
      return;
    }

    // Check if data has actually changed
    if (currentDataString !== lastDataRef.current) {
      setHasUnsavedChanges(true);

      if (enabled) {
        // Clear existing timeout
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }

        // Set new timeout for auto-save
        timeoutRef.current = setTimeout(() => {
          performSave();
        }, delay);
      }
    }

    // Cleanup function
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [data, delay, enabled, performSave]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    isSaving,
    hasUnsavedChanges,
    lastSaved,
    saveStatus,
    forceSave
  };
} 