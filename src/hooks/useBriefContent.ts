import { useState, useCallback, useEffect } from 'react';
import { Editor } from '@tiptap/react';
import { useToastContext } from '../contexts/ToastContext';
import { updateContentBrief } from '../services/supabase';

interface BriefContentState {
  version: string;
  content: string;
  lastSavedContent: string;
  updatedAt: string;
}

interface UseBriefContentProps {
  editor: Editor | null;
  briefId: string;
}

export function useBriefContent({ editor, briefId }: UseBriefContentProps) {
  const [state, setState] = useState<BriefContentState>(() => ({
    version: '1.0',
    content: editor?.getHTML() || '',
    lastSavedContent: editor?.getHTML() || '',
    updatedAt: new Date().toISOString()
  }));

  const [isSaving, setIsSaving] = useState(false);
  const { showToast } = useToastContext();

  // Update state when editor changes
  useEffect(() => {
    if (editor) {
      const content = editor.getHTML();
      setState((prev: BriefContentState) => ({
        ...prev,
        content,
        lastSavedContent: content
      }));
    }
  }, [editor]);

  const updateContent = useCallback(async (newContent: string) => {
    const previousContent = state.content;
    setState((prev: BriefContentState) => ({
      ...prev,
      content: newContent
    }));

    setIsSaving(true);

    try {
      await updateContentBrief(briefId, newContent, state.version);
      setState((prev: BriefContentState) => ({
        ...prev,
        lastSavedContent: newContent,
        updatedAt: new Date().toISOString()
      }));
      showToast('Changes saved successfully', 'success');
    } catch (error) {
      setState((prev: BriefContentState) => ({
        ...prev,
        content: previousContent
      }));
      showToast('Failed to save changes. Please try again.', 'error');
    } finally {
      setIsSaving(false);
    }
  }, [state.content, state.version, briefId, showToast]);

  const hasUnsavedChanges = useCallback(() => {
    return state.content !== state.lastSavedContent;
  }, [state.content, state.lastSavedContent]);

  return {
    state,
    isSaving,
    updateContent,
    hasUnsavedChanges
  };
}
