import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, X, Loader2 } from 'lucide-react';
import { CommentEditor } from './CommentEditor';

interface TextSelection {
  start: number;
  end: number;
  text: string;
  range?: Range;
}

interface InlineCommentEditorProps {
  selection: TextSelection;
  editorRef: React.RefObject<HTMLElement>;
  visible: boolean;
  onSubmit: (content: string, mentions: string[]) => Promise<void>;
  onCancel: () => void;
  articleId: string;
}

export const InlineCommentEditor: React.FC<InlineCommentEditorProps> = ({
  selection,
  editorRef,
  visible,
  onSubmit,
  onCancel,
  articleId
}) => {
  const [position, setPosition] = useState<{ top: number; left: number; placement: 'above' | 'below' } | null>(null);
  const [content, setContent] = useState('');
  const [mentions, setMentions] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Calculate optimal position for the inline editor
  useEffect(() => {
    if (!visible || !selection.range || !editorRef.current) {
      setPosition(null);
      return;
    }

    const calculatePosition = () => {
      try {
        const range = selection.range!;
        const rect = range.getBoundingClientRect();
        const editorRect = editorRef.current!.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        
        const editorContainerTop = rect.top - editorRect.top;
        const editorContainerBottom = rect.bottom - editorRect.top;
        
        // Estimate editor height (300px)
        const editorHeight = 300;
        const spaceBelow = viewportHeight - rect.bottom;
        const spaceAbove = rect.top;
        
        // Prefer below unless there's insufficient space
        const placement = spaceBelow >= editorHeight + 20 ? 'below' : 'above';
        
        let top: number;
        if (placement === 'below') {
          top = editorContainerBottom + 8;
        } else {
          top = editorContainerTop - editorHeight - 8;
        }
        
        // Center horizontally within the selection, with bounds checking
        const selectionWidth = rect.width;
        const editorWidth = 400; // Fixed width for the editor
        const centerLeft = (rect.left - editorRect.left) + (selectionWidth / 2) - (editorWidth / 2);
        const minLeft = 16; // Minimum margin from edge
        const maxLeft = editorRect.width - editorWidth - 16;
        const left = Math.max(minLeft, Math.min(centerLeft, maxLeft));
        
        setPosition({ top, left, placement });
      } catch (error) {
        console.warn('Failed to calculate inline comment editor position:', error);
        setPosition(null);
      }
    };

    calculatePosition();

    const handleResize = () => calculatePosition();
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleResize, true);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleResize, true);
    };
  }, [visible, selection.range, editorRef]);

  const handleSubmit = async () => {
    if (!content.trim() || isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      await onSubmit(content, mentions);
      setContent('');
      setMentions([]);
    } catch (error) {
      console.error('Failed to submit comment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setContent('');
    setMentions([]);
    onCancel();
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      handleCancel();
    } else if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      handleSubmit();
    }
  };

  if (!visible || !position) {
    return null;
  }

  // Render as portal within the editor
  return editorRef.current ? (
    <>
      {ReactDOM.createPortal(
        <AnimatePresence>
          <motion.div
            ref={containerRef}
            initial={{ opacity: 0, y: position.placement === 'below' ? -10 : 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: position.placement === 'below' ? -10 : 10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="absolute z-50"
            style={{
              left: position.left,
              top: position.top,
              width: '400px',
              maxWidth: 'calc(100vw - 32px)' // Responsive width
            }}
            onKeyDown={handleKeyDown}
          >
            {/* Backdrop blur overlay for focus */}
            <div className="absolute inset-0 -m-2 bg-black/5 backdrop-blur-sm rounded-lg" />
            
            <div className="relative bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Comment on "{selection.text.length > 30 ? selection.text.substring(0, 30) + '...' : selection.text}"
                  </span>
                </div>
                <button
                  onClick={handleCancel}
                  className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  title="Cancel (Esc)"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Comment Editor */}
              <div className="p-4">
                <CommentEditor
                  value={content}
                  onChange={setContent}
                  onMentionsChange={setMentions}
                  placeholder="Add your comment..."
                  articleId={articleId}
                  compact={true}
                  autoFocus={true}
                />
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 rounded-b-lg">
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Cmd+Enter to send • Esc to cancel
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCancel}
                    className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={!content.trim() || isSubmitting}
                    className="
                      flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 
                      disabled:bg-gray-300 disabled:cursor-not-allowed
                      text-white text-sm font-medium rounded-md transition-colors
                    "
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Send className="w-3 h-3" />
                        Comment
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Pointer/Arrow */}
              <div 
                className={`
                  absolute left-1/2 transform -translate-x-1/2 w-0 h-0 
                  ${position.placement === 'below' ? 'bottom-full' : 'top-full'}
                  border-l-8 border-r-8 border-transparent
                  ${position.placement === 'below' ? 'border-b-8 border-b-white dark:border-b-gray-800' : 'border-t-8 border-t-white dark:border-t-gray-800'}
                `}
              />
            </div>
          </motion.div>
        </AnimatePresence>,
        editorRef.current
      )}
    </>
  ) : null;
};