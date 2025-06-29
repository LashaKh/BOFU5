import React, { useEffect, useState, useRef } from 'react';
import ReactDOM from 'react-dom';
import { MessageCircle, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface TextSelection {
  start: number;
  end: number;
  text: string;
  range?: Range;
}

interface InlineCommentButtonProps {
  selection: TextSelection;
  editorRef: React.RefObject<HTMLElement>;
  onAddComment: (selection: TextSelection) => void;
  visible: boolean;
}

export const InlineCommentButton: React.FC<InlineCommentButtonProps> = ({
  selection,
  editorRef,
  onAddComment,
  visible
}) => {
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Calculate button position based on text selection
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
        
        // Position button at the end of the selection, slightly offset
        const left = rect.right - editorRect.left + 8;
        const top = rect.top - editorRect.top;
        
        // Ensure button stays within editor bounds
        const maxLeft = editorRect.width - 40; // Account for button width
        const constrainedLeft = Math.min(left, maxLeft);
        
        setPosition({
          left: constrainedLeft,
          top: top
        });
      } catch (error) {
        console.warn('Failed to calculate inline comment button position:', error);
        setPosition(null);
      }
    };

    calculatePosition();

    // Recalculate on window resize or scroll
    const handleResize = () => calculatePosition();
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleResize, true);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleResize, true);
    };
  }, [visible, selection.range, editorRef]);

  const handleClick = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    onAddComment(selection);
  };

  if (!visible || !position) {
    return null;
  }

  // Render the button as a portal within the editor
  return editorRef.current ? (
    <>
      {ReactDOM.createPortal(
        <AnimatePresence>
          <motion.button
            ref={buttonRef}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.15 }}
            onClick={handleClick}
            className="
              absolute z-50 flex items-center gap-1 px-2 py-1 
              bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium 
              rounded-md shadow-lg border border-blue-500
              transition-all duration-150 ease-out
              focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-1
            "
            style={{
              left: position.left,
              top: position.top,
              pointerEvents: 'auto'
            }}
            title="Add inline comment"
          >
            <Plus className="w-3 h-3" />
            <MessageCircle className="w-3 h-3" />
            <span className="text-xs">Comment</span>
          </motion.button>
        </AnimatePresence>,
        editorRef.current
      )}
    </>
  ) : null;
};