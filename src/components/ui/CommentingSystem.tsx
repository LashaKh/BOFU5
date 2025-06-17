import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { MessageCircle, MessageSquare, CheckCircle, Archive, MoreHorizontal, Settings, BarChart3, X, Plus, Filter, Search, Clock, Users, TrendingUp, AlertCircle, ChevronDown, ChevronUp, Sparkles, Eye, EyeOff } from 'lucide-react';
import { 
  ArticleComment, 
  getArticleComments,
  updateCommentStatus,
  resolveCommentWithReason,
  bulkUpdateCommentStatus,
  getCommentsWithMetrics,
  createComment,
  createCommentWithMentions
} from '../../lib/commentApi';
import { CommentMarker } from './CommentMarker';
import { CommentPopover } from './CommentPopover';
import { CommentThread } from './CommentThread';
import { CommentResolutionPanel } from './CommentResolutionPanel';
import { supabase } from '../../lib/supabase';
import { AnimatePresence, motion } from 'framer-motion';

export type { ArticleComment };

interface CommentingSystemProps {
  articleId: string;
  editorRef: React.RefObject<HTMLElement>;
  comments: ArticleComment[];
  onCommentsChange: (comments: ArticleComment[]) => void;
  highlightedCommentId: string | null;
  onHighlightComment: (commentId: string | null) => void;
  showResolutionPanel?: boolean;
  adminMode?: boolean;
  adminUser?: {
    id: string;
    email: string;
    company_name?: string;
  } | null;
}

interface TextSelection {
  start: number;
  end: number;
  text: string;
  range?: Range; // Make range optional since it's not serializable
}

// Enhanced global interaction state management
const GLOBAL_INTERACTION_KEY = 'commentSystemInteraction';

const setGlobalInteractionState = (isInteracting: boolean) => {
  try {
    sessionStorage.setItem(GLOBAL_INTERACTION_KEY, String(isInteracting));
    console.log('🔧 Global interaction state set:', isInteracting);
  } catch (error) {
    console.warn('Could not save interaction state:', error);
  }
};

const getGlobalInteractionState = (): boolean => {
  try {
    const stored = sessionStorage.getItem(GLOBAL_INTERACTION_KEY);
    return stored === 'true';
  } catch {
    return false;
  }
};

// Memoized CommentingSystem with enhanced comparison and debugging
const CommentingSystemComponent = React.memo(({
  articleId,
  editorRef,
  comments,
  onCommentsChange,
  highlightedCommentId,
  onHighlightComment,
  adminMode = false,
  showResolutionPanel = false,
  adminUser = null,
}: CommentingSystemProps) => {
  // Use a more specific console log that includes render timestamp
  const renderTimestamp = Date.now();
  console.log('🎯 CommentingSystem rendered:', { 
    articleId, 
    hasEditorRef: !!editorRef?.current, 
    showResolutionPanel, 
    adminMode,
    commentsCount: comments.length,
    renderTimestamp,
    highlightedCommentId
  });

  const [selectedText, setSelectedText] = useState<TextSelection | null>(null);
  const [selectedComment, setSelectedComment] = useState<ArticleComment | null>(null);
  const [showPopover, setShowPopover] = useState(false);
  const [popoverPosition, setPopoverPosition] = useState({ x: 0, y: 0 });
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [showResolutionManagement, setShowResolutionManagement] = useState(false);
  const [contentDriftDetected, setContentDriftDetected] = useState(false);
  const [layoutStable, setLayoutStable] = useState(false);

  const isCreatingCommentRef = useRef(false);
  const pendingSelectionRef = useRef<TextSelection | null>(null);

  // Enhanced interaction tracking with multiple approaches
  const isInteractingWithCommentUIRef = useRef(false);
  const interactionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const setInteractionFlag = useCallback((isInteracting: boolean, duration = 800) => {
    console.log('🔧 Setting interaction flag:', isInteracting, 'for', duration, 'ms');
    
    // Clear any existing timeout
    if (interactionTimeoutRef.current) {
      clearTimeout(interactionTimeoutRef.current);
    }
    
    // Set both local and global state
    isInteractingWithCommentUIRef.current = isInteracting;
    setGlobalInteractionState(isInteracting);
    
    if (isInteracting) {
      // Auto-clear after specified duration
      interactionTimeoutRef.current = setTimeout(() => {
        console.log('🔧 Auto-clearing interaction flag after', duration, 'ms');
        isInteractingWithCommentUIRef.current = false;
        setGlobalInteractionState(false);
      }, duration);
    }
  }, []);

  // Global state management functions
  const getGlobalPopoverState = () => {
    try {
      const stored = sessionStorage.getItem('commentPopoverState');
      return stored ? JSON.parse(stored) : { showPopover: false };
    } catch {
      return { showPopover: false };
    }
  };

  const setGlobalPopoverState = (state: any) => {
    try {
      sessionStorage.setItem('commentPopoverState', JSON.stringify(state));
    } catch (error) {
      console.warn('Could not save popover state:', error);
    }
  };

  const clearGlobalPopoverState = () => {
    console.log('🗑️ Cleared global popover state');
    try {
      sessionStorage.removeItem('commentPopoverState');
    } catch (error) {
      console.warn('Could not clear popover state:', error);
    }
  };

  // Calculate comment metrics based on the comments passed as props
  const commentMetrics = useMemo(() => {
    const now = Date.now();
    const hourAgo = now - (60 * 60 * 1000);
    
    return {
      total: comments.length,
      active: comments.filter(c => c.status === 'active').length,
      resolved: comments.filter(c => c.status === 'resolved').length,
      archived: comments.filter(c => c.status === 'archived').length,
      recent: comments.filter(c => new Date(c.created_at).getTime() > hourAgo).length
    };
  }, [comments]);

  // Load comments function that triggers parent to refresh
  const loadComments = useCallback(async () => {
    try {
      setIsLoading(true);
      console.log('📥 Loading comments for article:', articleId);
      // Use basic comments API to avoid permission issues
      const fetchedComments = await getArticleComments(articleId);
      console.log('📥 Loaded comments:', fetchedComments.length, 'comments');
      onCommentsChange(fetchedComments);
      
      // Reset content drift detection when loading fresh comments
      setContentDriftDetected(false);
    } catch (error) {
      console.error('❌ Error loading comments:', error);
    } finally {
      setIsLoading(false);
    }
  }, [articleId, onCommentsChange]);

  // Set up real-time subscription only (no initial loading since we get comments as props)
  useEffect(() => {
    console.log('🔔 Setting up comment subscription for:', articleId);
    const subscription = supabase
      .channel(`article_comments_${articleId}`)
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'article_comments', filter: `article_id=eq.${articleId}` },
        () => {
          console.log('🔄 Comment change detected, reloading...');
          loadComments();
        }
      )
      .subscribe();

    return () => {
      console.log('🔌 Cleaning up comment subscription');
      subscription.unsubscribe();
    };
  }, [articleId, loadComments]);

  // Detect when layout has stabilized after sidebar loading
  useEffect(() => {
    // Wait for the component to render and layout to stabilize
    const stabilizeLayout = () => {
      // Use multiple checks to ensure layout is really stable
      setTimeout(() => {
        console.log('🎯 Layout stabilization check 1...');
        if (editorRef.current) {
          // Force a reflow to ensure layout is complete
          const editorWidth = editorRef.current.offsetWidth;
          console.log('📐 Editor width after stabilization:', editorWidth);
          
          // Wait a bit more to be absolutely sure
          setTimeout(() => {
            console.log('🎯 Layout stabilization check 2...');
            setLayoutStable(true);
            console.log('✅ Layout marked as stable - markers can now render');
          }, 300);
        }
      }, 100);
    };

    // Initial stabilization
    stabilizeLayout();

    // Also re-stabilize when comments change (sidebar content changes)
    const debounceTimer = setTimeout(stabilizeLayout, 200);

    return () => {
      clearTimeout(debounceTimer);
    };
  }, [comments.length, isExpanded, editorRef]);

  // Set up text selection monitoring with enhanced interaction checking
  useEffect(() => {
    if (!editorRef.current) return;

    console.log('🔍 Setting up selection change listener');
    const handleSelectionChange = () => {
      // Enhanced interaction checking - check both local and global state
      const localInteracting = isCreatingCommentRef.current || showPopover;
      const globalInteracting = getGlobalInteractionState();
      const globalPopoverState = getGlobalPopoverState();
      
      if (localInteracting || globalInteracting || globalPopoverState.showPopover || isInteractingWithCommentUIRef.current) {
        console.log('🚫 Skipping selection change - interaction detected', {
          localInteracting,
          globalInteracting,
          globalPopover: globalPopoverState.showPopover,
          uiInteraction: isInteractingWithCommentUIRef.current
        });
        return;
      }

      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) {
        console.log('🔍 Empty selection, clearing');
        setSelectedText(null);
        return;
      }

      const range = selection.getRangeAt(0);
      const selectedTextContent = selection.toString().trim();

      if (!selectedTextContent) {
        console.log('🔍 Empty selection, clearing');
        setSelectedText(null);
        return;
      }

      // Check if selection is within the editor
      if (!editorRef.current || !editorRef.current.contains(range.commonAncestorContainer)) {
        console.log('🔍 Selection outside editor, clearing');
        setSelectedText(null);
        return;
      }

      const editorTextContent = editorRef.current.textContent || '';
      console.log('🔍 Text selected:', {
        text: selectedTextContent.substring(0, 30) + '...',
        length: selectedTextContent.length,
        editorLength: editorTextContent.length
      });

      if (selectedTextContent.length >= 3) {
        // FIXED: Use actual range position instead of indexOf() which finds first occurrence
        // Calculate start position using the Range API for precise positioning
        const startNode = range.startContainer;
        const startOffset = range.startOffset;
        
        // Get the actual text offset within the editor
        const actualStart = getTextOffset(editorRef.current, startNode, startOffset);
        const actualEnd = actualStart + selectedTextContent.length;
        
        // ENHANCED VALIDATION: Verify that our calculated offsets match the selected text
        const editorText = editorTextContent;
        const textAtCalculatedPosition = editorText.substring(actualStart, actualEnd);
        
        console.log('🔍 Selection validation:', {
          selectedText: selectedTextContent.substring(0, 50) + '...',
          calculatedStart: actualStart,
          calculatedEnd: actualEnd,
          textAtPosition: textAtCalculatedPosition.substring(0, 50) + '...',
          positionMatches: selectedTextContent === textAtCalculatedPosition,
          selectionLength: selectedTextContent.length,
          calculatedLength: textAtCalculatedPosition.length,
          editorTotalLength: editorText.length
        });
        
        // Only proceed if our calculation matches the actual selection
        if (actualStart >= 0 && actualEnd <= editorTextContent.length && selectedTextContent === textAtCalculatedPosition) {
          const newSelection: TextSelection = {
            start: actualStart,
            end: actualEnd,
            text: selectedTextContent,
            range: range.cloneRange()
          };
          
          console.log('✅ Valid and verified selection found:', newSelection);
          setSelectedText(newSelection);
        } else {
          console.error('❌ Selection validation FAILED:', { 
            start: actualStart, 
            end: actualEnd, 
            editorLength: editorTextContent.length,
            textMismatch: selectedTextContent !== textAtCalculatedPosition
          });
          setSelectedText(null);
        }
      } else {
        console.log('🔍 Selection too short, clearing');
        setSelectedText(null);
      }
    };

    document.addEventListener('selectionchange', handleSelectionChange);

    return () => {
      console.log('🔌 Cleaning up selection change listener');
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, [editorRef, showPopover]);

  const handleCreateComment = (selection: TextSelection) => {
    console.log('💬 Creating comment for selection:', {
      text: selection.text.substring(0, 50) + '...',
      start: selection.start,
      end: selection.end,
      length: selection.text.length
    });
    
    // **CRITICAL DEBUG: Verify the selection data integrity**
    const editorContent = editorRef.current?.textContent || '';
    const actualTextAtCoordinates = editorContent.substring(selection.start, selection.end);
    console.log('🔍 Verifying selection integrity:', {
      selectedText: selection.text.substring(0, 50) + '...',
      actualTextAtCoords: actualTextAtCoordinates.substring(0, 50) + '...',
      coordinatesMatch: selection.text === actualTextAtCoordinates,
      editorLength: editorContent.length
    });
    
    isCreatingCommentRef.current = true;
    pendingSelectionRef.current = selection;
    
    setSelectedText(selection);
    setSelectedComment(null);
    
    // Popover will auto-center, no need to calculate position
    setPopoverPosition({ x: 0, y: 0 }); // Not used anymore but keeping for compatibility
    
    setShowPopover(true);
  };

  // Enhanced comment click handler with immediate interaction flag setting
  const handleCommentClick = useCallback((comment: ArticleComment) => {
    console.log('🖱️ Comment clicked:', comment.id);
    
    // Set interaction flag IMMEDIATELY to prevent any selection changes
    setInteractionFlag(true, 1000);
    
    // Toggle selection: if clicking the same comment, deselect it
    if (highlightedCommentId === comment.id) {
      console.log('🔄 Deselecting comment:', comment.id);
      onHighlightComment(null);
    } else {
      console.log('🔄 Selecting comment:', comment.id);
      onHighlightComment(comment.id);
      
      // Note: Removed automatic scrolling to prevent unwanted page jumps
      // The comment will be highlighted but won't automatically scroll to the referenced text
    }
  }, [highlightedCommentId, onHighlightComment, setInteractionFlag]);

  const handleClosePopover = () => {
    console.log('❌ Closing popover');
    setShowPopover(false);
    setSelectedComment(null);
    setSelectedText(null);
    isCreatingCommentRef.current = false;
    pendingSelectionRef.current = null;
    clearGlobalPopoverState();
    onHighlightComment(null);
  };

  const handleCommentSubmit = async (content: string) => {
    console.log('📝 Submitting comment:', { content, selectedText, selectedComment });
    
    try {
      if (selectedText && !selectedComment) {
        // Creating a new comment with mention support
        console.log('🆕 Creating new comment with coordinates:', {
          articleId,
          content: content.trim().substring(0, 50) + '...',
          selection_start: selectedText.start,
          selection_end: selectedText.end,
          selected_text: selectedText.text.substring(0, 50) + '...'
        });
        
        // Use the regular createComment API with selected_text
        const result = await createComment({
          article_id: articleId,
          content: content.trim(),
          content_type: 'text',
          selection_start: selectedText.start,
          selection_end: selectedText.end,
          selected_text: selectedText.text // Store the original selected text
        });
        
        // **CRITICAL DEBUG: Verify what was actually saved**
        console.log('💾 Comment creation result:', {
          success: !!result,
          savedCoordinates: {
            start: result.selection_start,
            end: result.selection_end
          },
          savedSelectedText: result.selected_text?.substring(0, 50) + '...',
          originalSelection: {
            text: selectedText.text.substring(0, 50) + '...',
            start: selectedText.start,
            end: selectedText.end
          },
          currentEditorLength: editorRef.current?.textContent?.length || 0
        });
        
        // **FINAL VERIFICATION: Check the text at saved coordinates**
        if (editorRef.current) {
          const editorContent = editorRef.current.textContent || '';
          const textAtSavedCoords = editorContent.substring(selectedText.start, selectedText.end);
          console.log('✅ Final verification - text at saved coordinates:', {
            savedText: textAtSavedCoords.substring(0, 50) + '...',
            originalSelectedText: selectedText.text.substring(0, 50) + '...',
            storedSelectedText: result.selected_text?.substring(0, 50) + '...',
            coordsMatch: textAtSavedCoords === selectedText.text,
            storedTextMatch: result.selected_text === selectedText.text
          });
        }
        
        if (result) {
          console.log('✅ Comment created successfully with stored coordinates and selected text:', {
            id: result.id,
            stored_start: result.selection_start,
            stored_end: result.selection_end,
            stored_selected_text: result.selected_text?.substring(0, 50) + '...',
            original_start: selectedText.start,
            original_end: selectedText.end,
            coordinates_match: result.selection_start === selectedText.start && result.selection_end === selectedText.end,
            selected_text_match: result.selected_text === selectedText.text
          });
          await loadComments(); // Refresh comments
          handleClosePopover();
        } else {
          console.error('❌ Failed to create comment');
        }
      } else if (selectedComment) {
        // Creating a reply to an existing comment with mention support
        console.log('💬 Creating reply to comment:', selectedComment.id);
        
        const result = await createCommentWithMentions(
          articleId,
          content.trim(),
          'text',
          undefined, // no image file
          undefined, // no selection start
          undefined, // no selection end
          selectedComment.id // parent comment for reply
        );
        
        if (result) {
          console.log('✅ Reply created successfully:', result);
          await loadComments(); // Refresh comments to show the new reply
          handleClosePopover();
        } else {
          console.error('❌ Failed to create reply');
        }
      }
    } catch (error) {
      console.error('❌ Error in handleCommentSubmit:', error);
    } finally {
      isCreatingCommentRef.current = false;
      pendingSelectionRef.current = null;
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    console.log('🗑️ Deleting comment:', commentId);
    
    setInteractionFlag(true, 1000);

    try {
      setLoadingAction(`delete-${commentId}`);
      
      // Actually delete the comment using the API
      const { error } = await supabase
        .from('article_comments')
        .delete()
        .eq('id', commentId);
      
      if (error) {
        console.error('❌ Error deleting comment:', error);
        throw error;
      }
      
      console.log('✅ Comment deleted successfully:', commentId);
      await loadComments(); // Refresh after delete
    } catch (error) {
      console.error('❌ Error deleting comment:', error);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleStatusChange = async (commentId: string, status: 'active' | 'resolved' | 'archived') => {
    console.log('🔄 Changing comment status:', { commentId, status });
    
    setInteractionFlag(true, 1000);
    
    try {
      setLoadingAction(`status-${commentId}`);
      await updateCommentStatus(commentId, status);
      await loadComments(); // Refresh after status change
    } catch (error) {
      console.error('❌ Error updating comment status:', error);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleResolveWithReason = async (commentId: string, reason: string) => {
    console.log('✅ Resolving comment with reason:', { commentId, reason });
    
    setInteractionFlag(true, 1000);
    
    try {
      setLoadingAction(`resolve-${commentId}`);
      await resolveCommentWithReason(commentId, reason);
      await loadComments(); // Refresh after resolution
    } catch (error) {
      console.error('❌ Error resolving comment:', error);
    } finally {
      setLoadingAction(null);
    }
  };
  
  const handleBulkStatusUpdate = async (commentIds: string[], status: 'active' | 'resolved' | 'archived') => {
    console.log('🔄 Bulk status update:', { commentIds, status });
    try {
      setLoadingAction('bulk-update');
      await bulkUpdateCommentStatus(commentIds, status);
      await loadComments(); // Refresh after bulk update
    } catch (error) {
      console.error('❌ Error in bulk status update:', error);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleReply = (comment: ArticleComment) => {
    console.log('💬 Replying to comment:', comment.id);
    
    setInteractionFlag(true, 1000);
    
    setSelectedComment(comment);
    setSelectedText(null);
    
    // Popover will auto-center, no need to calculate position
    setPopoverPosition({ x: 0, y: 0 }); // Not used anymore but keeping for compatibility
    
    setShowPopover(true);
  };

  const handleEdit = (comment: ArticleComment) => {
    console.log('✏️ Editing comment:', comment.id);
    
    setInteractionFlag(true, 1000);
    
    setSelectedComment(comment);
    setSelectedText(null);
    
    // Popover will auto-center, no need to calculate position
    setPopoverPosition({ x: 0, y: 0 }); // Not used anymore but keeping for compatibility
    
    setShowPopover(true);
  };

  const [filter, setFilter] = useState<'all' | 'active' | 'resolved' | 'archived'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Function to recursively collect all comments (including nested replies) for filtering
  const getAllCommentsFlat = (comments: ArticleComment[]): ArticleComment[] => {
    const flatComments: ArticleComment[] = [];
    
    const addCommentsRecursively = (commentList: ArticleComment[]) => {
      commentList.forEach(comment => {
        flatComments.push(comment);
        if (comment.replies && comment.replies.length > 0) {
          addCommentsRecursively(comment.replies);
        }
      });
    };
    
    addCommentsRecursively(comments);
    return flatComments;
  };

  // Filter comments (including nested replies) based on search and filter criteria
  const filterComment = (comment: ArticleComment): boolean => {
    const matchesFilter = filter === 'all' || comment.status === filter;
    const matchesSearch = !searchQuery || 
      comment.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (comment.user?.name || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  };

  // Recursively filter the threaded comment structure
  const filterThreadedComments = (comments: ArticleComment[]): ArticleComment[] => {
    return comments.map(comment => {
      const filteredReplies = comment.replies ? filterThreadedComments(comment.replies) : [];
      
      // Include comment if it matches the filter, or if any of its replies match
      const commentMatches = filterComment(comment);
      const hasMatchingReplies = filteredReplies.length > 0;
      
      if (commentMatches || hasMatchingReplies) {
        return {
          ...comment,
          replies: filteredReplies
        };
      }
      return null;
    }).filter(Boolean) as ArticleComment[];
  };

  // Apply filtering to the already-threaded comments
  const filteredThreadedComments = filterThreadedComments(comments);
  
  // Get all comments flat for counting
  const allCommentsFlat = getAllCommentsFlat(comments);
  const filteredCommentsFlat = getAllCommentsFlat(filteredThreadedComments);

  if (isLoading) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8">
        <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4" />
        <p className="text-gray-500 dark:text-gray-400 font-medium">Loading comments...</p>
      </div>
    );
  }

  return (
    <>
      {/* Comment markers in editor - render as portals for proper positioning */}
      {/* Only render markers after layout has stabilized to prevent timing issues */}
      {layoutStable && comments.map((comment, index) => {
        // **DEBUG: Log each comment being processed for marker rendering**
        console.log(`🎯 Processing comment ${index + 1}/${comments.length} for marker:`, {
          id: comment.id,
          content: comment.content.substring(0, 50) + '...',
          selection_start: comment.selection_start,
          selection_end: comment.selection_end,
          selected_text: comment.selected_text ? comment.selected_text.substring(0, 30) + '...' : 'NOT_STORED',
          status: comment.status,
          created_at: comment.created_at
        });

        if (typeof comment.selection_start !== 'number' || typeof comment.selection_end !== 'number') {
          console.warn(`🚨 Comment ${comment.id} has invalid selection coordinates:`, {
            selection_start: comment.selection_start,
            selection_end: comment.selection_end
          });
          return null;
        }

        // **COORDINATE VALIDATION: Check if stored coordinates match stored selected_text**
        if (editorRef.current && comment.selected_text) {
          const editorContent = editorRef.current.textContent || '';
          const textAtCoordinates = editorContent.substring(comment.selection_start, comment.selection_end);
          
          if (textAtCoordinates !== comment.selected_text) {
            console.warn(`🚨 COORDINATE MISMATCH for comment ${comment.id}:`, {
              storedText: comment.selected_text.substring(0, 50) + '...',
              textAtCoords: textAtCoordinates.substring(0, 50) + '...',
              coordinates: `${comment.selection_start}-${comment.selection_end}`,
              match: false
            });
            
            // Skip rendering marker for mismatched comments to avoid confusion
            return null;
          } else {
            console.log(`✅ Coordinate validation passed for comment ${comment.id}`);
          }
        }

        const position = getMarkerPosition(comment.selection_start, comment.selection_end, editorRef, setContentDriftDetected);
        if (!position || !editorRef.current) {
          console.warn(`🚨 Could not calculate position for comment ${comment.id}`);
          return null;
        }

        console.log(`✅ Rendering marker for comment ${comment.id} at position:`, position);

        return ReactDOM.createPortal(
          <div
            key={comment.id}
            style={{
              position: 'absolute',
              top: position.top,
              left: position.left - 40, // Position marker to the left of selection start
              zIndex: 15,
              pointerEvents: 'auto'
            }}
          >
            <CommentMarker
              comment={comment}
              position={position}
              onClick={handleCommentClick}
            />
          </div>,
          editorRef.current
        );
      })}

      <motion.div 
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="h-full bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 shadow-xl"
        style={{ 
          width: '420px', 
          maxWidth: '420px'
        }}
      >
        {/* Layout Stabilization Indicator */}
        <AnimatePresence>
          {!layoutStable && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-700 px-4 py-2"
            >
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 border border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  Positioning comments...
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Content Drift Warning */}
        <AnimatePresence>
          {contentDriftDetected && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="bg-orange-50 dark:bg-orange-900/20 border-b border-orange-200 dark:border-orange-700 px-4 py-3"
            >
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-orange-800 dark:text-orange-200">
                    Content Changes Detected
                  </p>
                  <p className="text-xs text-orange-700 dark:text-orange-300 mt-1">
                    Some comments may not be visible because the article content has changed since they were created.
                  </p>
                </div>
                <button
                  onClick={() => setContentDriftDetected(false)}
                  className="text-orange-600 dark:text-orange-400 hover:text-orange-800 dark:hover:text-orange-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Enhanced Selection button */}
        {selectedText && !showPopover && ReactDOM.createPortal(
          <motion.div key="comment-selection-button">
            <CommentSelectionButton
              selection={selectedText}
              onCreateComment={handleCreateComment}
            />
          </motion.div>,
          document.body
        )}

        {/* Comment popover */}
        {showPopover && ReactDOM.createPortal(
          <CommentPopover 
            position={popoverPosition}
            articleId={articleId}
            selectedText={selectedText}
            selectedComment={selectedComment}
            onClose={handleClosePopover}
            onSubmit={handleCommentSubmit}
            onCommentCreated={async (comment) => {
              console.log('✅ Comment created with image/mentions:', comment);
              await loadComments(); // Refresh comments to show the new comment with image
              handleClosePopover();
            }}
          />,
          document.body
        )}

        {/* Professional Comments Interface */}
        <div className="h-full flex flex-col">
          {/* Clean Modern Header */}
          <div className="flex-shrink-0 px-6 py-6 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-900 border-b border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl flex items-center justify-center shadow-lg">
                    <MessageCircle className="w-6 h-6 text-white" />
                  </div>
                  {commentMetrics.recent > 0 && (
                    <motion.div 
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center shadow-lg"
                    >
                      <span className="text-xs font-bold text-white">{commentMetrics.recent}</span>
                    </motion.div>
                  )}
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                    Comments
                  </h1>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {commentMetrics.total} total • {commentMetrics.active} active
                  </p>
                </div>
              </div>
              
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-3 rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                {isExpanded ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </motion.button>
            </div>

            {/* Professional Metrics Cards */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active</p>
                    <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{commentMetrics.active}</p>
                  </div>
                  <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
                    <AlertCircle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                  </div>
                </div>
              </div>
              
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Resolved</p>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">{commentMetrics.resolved}</p>
                  </div>
                  <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Professional Comments List */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="flex-1 overflow-hidden"
              >
                <CommentsSidebar
                  comments={comments}
                  isLoading={isLoading}
                  onCommentClick={handleCommentClick}
                  onStatusChange={handleStatusChange}
                  onResolveWithReason={handleResolveWithReason}
                  onDelete={handleDeleteComment}
                  onReply={handleReply}
                  onEdit={handleEdit}
                  showResolutionDetails={showResolutionManagement}
                  loadingAction={loadingAction}
                  highlightedCommentId={highlightedCommentId}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Resolution Management Panel */}
          <AnimatePresence>
            {showResolutionManagement && adminMode && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="border-t border-gray-100 dark:border-gray-700"
              >
                <CommentResolutionPanel
                  comments={comments}
                  onStatusChange={handleBulkStatusUpdate}
                  onRefresh={loadComments}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Professional Footer Actions */}
          <div className="flex-shrink-0 p-4 bg-gray-50 dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowResolutionManagement(!showResolutionManagement)}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm transition-colors shadow-sm"
                >
                  <Settings className="w-4 h-4" />
                  <span>{showResolutionManagement ? 'Hide Panel' : 'Manage'}</span>
                </motion.button>
                
                {commentMetrics.recent > 0 && (
                  <motion.div 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="flex items-center space-x-2 px-3 py-2 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded-lg text-sm font-medium"
                  >
                    <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
                    <span>{commentMetrics.recent} new</span>
                  </motion.div>
                )}
              </div>
              
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Updated {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
});

// Enhanced comparison function with detailed logging
CommentingSystemComponent.displayName = 'CommentingSystem';

const CommentingSystemMemoized = React.memo(CommentingSystemComponent, (prevProps, nextProps) => {
  console.log('🔍 CommentingSystem memo comparison triggered');
  
  // Log what changed for debugging
  const changes: string[] = [];
  
  if (prevProps.articleId !== nextProps.articleId) changes.push('articleId');
  if (prevProps.adminMode !== nextProps.adminMode) changes.push('adminMode');
  if (prevProps.showResolutionPanel !== nextProps.showResolutionPanel) changes.push('showResolutionPanel');
  if (prevProps.highlightedCommentId !== nextProps.highlightedCommentId) changes.push('highlightedCommentId');
  if (prevProps.comments.length !== nextProps.comments.length) changes.push('comments.length');
  if (!!prevProps.editorRef?.current !== !!nextProps.editorRef?.current) changes.push('editorRef');
  
  // Deep comparison of comment IDs to detect actual comment changes
  const prevCommentIds = prevProps.comments.map(c => c.id).sort().join(',');
  const nextCommentIds = nextProps.comments.map(c => c.id).sort().join(',');
  if (prevCommentIds !== nextCommentIds) changes.push('comment IDs');
  
  // Function reference comparison - these will always be different but we don't care
  if (prevProps.onCommentsChange !== nextProps.onCommentsChange) changes.push('onCommentsChange (callback)');
  if (prevProps.onHighlightComment !== nextProps.onHighlightComment) changes.push('onHighlightComment (callback)');
  
  const shouldRerender = changes.some(change => 
    !change.includes('callback') // Ignore callback changes
  );
  
  console.log('🔍 Memo comparison result:', {
    changes,
    shouldRerender,
    timestamp: Date.now()
  });
  
  return !shouldRerender; // Return true to skip re-render, false to re-render
});

export { CommentingSystemMemoized as CommentingSystem };

// Helper component for the comment button that appears on text selection
interface CommentSelectionButtonProps {
  selection: TextSelection;
  onCreateComment: (selection: TextSelection) => void;
}

const CommentSelectionButton: React.FC<CommentSelectionButtonProps> = ({
  selection,
  onCreateComment
}) => {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('💬 CommentSelectionButton clicked!', { 
      selection: selection.text.substring(0, 50) + (selection.text.length > 50 ? '...' : ''),
      selectionLength: selection.text.length,
      start: selection.start,
      end: selection.end
    });
    onCreateComment(selection);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: 10 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 60000,
        pointerEvents: 'auto',
      }}
    >
      {/* Professional backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/20 backdrop-blur-sm"
        style={{ 
          zIndex: -1,
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0
        }}
      />
      
      {/* Modern comment card */}
      <motion.div
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden max-w-sm"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-6 py-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-white font-semibold text-lg">Add Comment</h3>
              <p className="text-blue-100 text-sm">Share your thoughts on this selection</p>
            </div>
          </div>
        </div>
        
        {/* Content */}
        <div className="p-6">
          <div className="mb-4">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Selected text:</p>
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 border-l-4 border-blue-500">
              <p className="text-sm text-gray-600 dark:text-gray-400 italic">
                "{selection.text.length > 80 ? `${selection.text.substring(0, 80)}...` : selection.text}"
              </p>
            </div>
          </div>
          
          <motion.button
            whileHover={{ backgroundColor: '#1d4ed8' }}
            whileTap={{ scale: 0.98 }}
            onClick={handleClick}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-xl transition-colors flex items-center justify-center space-x-2 shadow-lg"
          >
            <MessageSquare className="w-5 h-5" />
            <span>Add Comment</span>
          </motion.button>
          
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-3">
            Click anywhere outside to cancel
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
};

// Enhanced comments sidebar with resolution workflow features
interface CommentsSidebarProps {
  comments: ArticleComment[];
  isLoading: boolean;
  onCommentClick: (comment: ArticleComment) => void;
  onStatusChange: (commentId: string, status: 'active' | 'resolved' | 'archived') => void;
  onResolveWithReason: (commentId: string, reason: string) => void;
  onDelete: (commentId: string) => void;
  onReply: (comment: ArticleComment) => void;
  onEdit: (comment: ArticleComment) => void;
  showResolutionDetails?: boolean;
  loadingAction?: string | null;
  highlightedCommentId?: string | null;
}

const CommentsSidebar: React.FC<CommentsSidebarProps> = ({
  comments,
  isLoading,
  onCommentClick,
  onStatusChange,
  onResolveWithReason,
  onDelete,
  onReply,
  onEdit,
  showResolutionDetails = false,
  loadingAction,
  highlightedCommentId
}) => {
  const [filter, setFilter] = useState<'all' | 'active' | 'resolved' | 'archived'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Function to recursively collect all comments (including nested replies) for filtering
  const getAllCommentsFlat = (comments: ArticleComment[]): ArticleComment[] => {
    const flatComments: ArticleComment[] = [];
    
    const addCommentsRecursively = (commentList: ArticleComment[]) => {
      commentList.forEach(comment => {
        flatComments.push(comment);
        if (comment.replies && comment.replies.length > 0) {
          addCommentsRecursively(comment.replies);
        }
      });
    };
    
    addCommentsRecursively(comments);
    return flatComments;
  };

  // Filter comments (including nested replies) based on search and filter criteria
  const filterComment = (comment: ArticleComment): boolean => {
    const matchesFilter = filter === 'all' || comment.status === filter;
    const matchesSearch = !searchQuery || 
      comment.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (comment.user?.name || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  };

  // Recursively filter the threaded comment structure
  const filterThreadedComments = (comments: ArticleComment[]): ArticleComment[] => {
    return comments.map(comment => {
      const filteredReplies = comment.replies ? filterThreadedComments(comment.replies) : [];
      
      // Include comment if it matches the filter, or if any of its replies match
      const commentMatches = filterComment(comment);
      const hasMatchingReplies = filteredReplies.length > 0;
      
      if (commentMatches || hasMatchingReplies) {
        return {
          ...comment,
          replies: filteredReplies
        };
      }
      return null;
    }).filter(Boolean) as ArticleComment[];
  };

  // Apply filtering to the already-threaded comments
  const filteredThreadedComments = filterThreadedComments(comments);
  
  // Get all comments flat for counting
  const allCommentsFlat = getAllCommentsFlat(comments);
  const filteredCommentsFlat = getAllCommentsFlat(filteredThreadedComments);

  if (isLoading) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8">
        <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4" />
        <p className="text-gray-500 dark:text-gray-400 font-medium">Loading comments...</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Modern Search & Filter */}
      <div className="flex-shrink-0 p-4 bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
        {/* Search Bar */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search comments..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
          />
        </div>

        {/* Filter Tabs */}
        {showResolutionDetails && comments.length > 0 && (
          <div className="flex space-x-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            {[
              { key: 'all', label: 'All', count: comments.length },
              { key: 'active', label: 'Active', count: comments.filter(c => c.status === 'active').length },
              { key: 'resolved', label: 'Resolved', count: comments.filter(c => c.status === 'resolved').length },
              { key: 'archived', label: 'Archive', count: comments.filter(c => c.status === 'archived').length }
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key as any)}
                className={`
                  flex-1 py-2 px-3 rounded-md text-xs font-medium transition-all duration-200
                  ${filter === tab.key 
                    ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm' 
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                  }
                `}
              >
                <div className="text-center">
                  <div>{tab.label}</div>
                  <div className="font-bold">{tab.count}</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Comments List */}
      <div className="flex-1 overflow-y-auto">
        {filteredThreadedComments.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center mb-4">
              <MessageCircle className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
              {comments.length === 0 ? "No comments yet" : "No matching comments"}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {comments.length === 0 
                ? "Select text in the article to add the first comment" 
                : "Try adjusting your filters or search terms"
              }
            </p>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {filteredThreadedComments.map((comment, index) => (
              <motion.div
                key={comment.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`
                  relative rounded-xl border cursor-pointer transition-all duration-200 overflow-hidden
                  ${highlightedCommentId === comment.id 
                    ? 'bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-700 shadow-lg ring-2 ring-blue-100 dark:ring-blue-800' 
                    : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600'
                  }
                `}
                onClick={() => onCommentClick(comment)}
              >
                {/* Single CommentThread component - no duplicate content */}
                <CommentThread
                  comment={comment}
                  onReply={onReply}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onStatusChange={onStatusChange}
                  onResolveWithReason={onResolveWithReason}
                  showResolutionDetails={showResolutionDetails}
                  showActions={true}
                  loadingAction={loadingAction}
                  highlightedCommentId={highlightedCommentId}
                />
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Helper functions to calculate text offsets
// These are crucial for mapping selection ranges to the editor's text content

function getTextOffset(container: Element, targetNode: Node, targetOffset: number): number {
  // Walk through all text nodes in the container to calculate the precise offset
  const walker = document.createTreeWalker(
    container,
    NodeFilter.SHOW_TEXT,
    null
  );
  
  let totalOffset = 0;
  let currentNode = walker.nextNode();
  
  while (currentNode) {
    if (currentNode === targetNode) {
      // Found our target node, add the offset within this node
      const finalOffset = totalOffset + targetOffset;
      
      console.log('🎯 Text offset calculation - TARGET FOUND:', {
        targetNodeText: targetNode.textContent?.substring(0, 50) + '...',
        targetOffset,
        totalOffsetBeforeNode: totalOffset,
        finalCalculatedOffset: finalOffset,
        containerTotalLength: container.textContent?.length || 0
      });
      
      return finalOffset;
    }
    
    // Add this node's text length to our running total
    const nodeLength = currentNode.textContent?.length || 0;
    totalOffset += nodeLength;
    
    console.log('🔍 Walking text node:', {
      nodeText: currentNode.textContent?.substring(0, 30) + '...',
      nodeLength,
      runningTotal: totalOffset
    });
    
    currentNode = walker.nextNode();
  }
  
  // If we didn't find the target node, return the total offset (edge case)
  console.warn('⚠️ Target node not found in container, returning total offset:', totalOffset);
  return totalOffset;
}

function getTextNodeAtOffset(container: Element, offset: number): { node: Text; offset: number } | null {
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null);
  let currentNode = walker.nextNode() as Text;
  let currentOffset = 0;

  while (currentNode) {
    const nodeLength = currentNode.textContent?.length || 0;
    if (currentOffset + nodeLength >= offset) {
      return { node: currentNode, offset: offset - currentOffset };
    }
    currentOffset += nodeLength;
    currentNode = walker.nextNode() as Text;
  }
  return null;
}

const getMarkerPosition = (start: number, end: number, editorRef: React.RefObject<HTMLElement>, setDriftDetected?: (detected: boolean) => void) => {
  if (!editorRef.current) return null;

  try {
    const editorTextContent = editorRef.current.textContent || '';
    const editorLength = editorTextContent.length;
    
    // **DEBUG: Log the positioning attempt**
    console.log('🎯 Calculating marker position:', { 
      start, 
      end, 
      editorLength,
      actualText: editorTextContent.substring(start, end),
      firstChars: editorTextContent.substring(0, 50) + '...',
      aroundSelection: editorTextContent.substring(Math.max(0, start - 20), start + end - start + 20)
    });
    
    // **CONTENT DRIFT DETECTION: Check if coordinates are completely out of bounds**
    if (start >= editorLength || end > editorLength) {
      console.warn(`🚨 CONTENT DRIFT DETECTED: Comment coordinates (${start}-${end}) exceed current editor length (${editorLength}). Article content may have changed since comment was created.`);
      
      // Set the drift detection state if callback provided
      if (setDriftDetected) {
        setDriftDetected(true);
      }
      
      // **RECOVERY STRATEGY: Try to find the comment text in the current content**
      // This is a fallback for when content has been significantly modified
      return null; // For now, hide the marker rather than show it in wrong position
    }
    
    // **ULTRA-ROBUST CHECK: Validate the entire range against editor length**
    if (start < 0 || end < start || start >= editorLength || end > editorLength) {
      console.warn(`📌 Invalid range for marker position: start=${start}, end=${end}, editorLength=${editorLength}. Skipping.`);
      return null;
    }

    const textNode = getTextNodeAtOffset(editorRef.current, start);
    if (!textNode) {
      console.warn(`📌 Could not find text node at offset ${start}. Skipping.`);
      return null;
    }

    console.log('🎯 Found text node:', { 
      nodeText: textNode.node.textContent?.substring(0, 50) + '...',
      offset: textNode.offset,
      nodeLength: textNode.node.textContent?.length
    });

    const range = document.createRange();
    range.setStart(textNode.node, textNode.offset);
    
    // **DEFENSIVE END POSITION SETTING**
    const endTextNode = getTextNodeAtOffset(editorRef.current, Math.min(end, editorLength));
    if (!endTextNode) {
      console.warn(`📌 Could not find end text node at offset ${end}. Using start position.`);
      range.setEnd(textNode.node, textNode.offset);
    } else {
      range.setEnd(endTextNode.node, endTextNode.offset);
    }

    const rangeText = range.toString();
    console.log('🎯 Range created:', { 
      rangeText: rangeText.substring(0, 50) + (rangeText.length > 50 ? '...' : ''),
      rangeLength: rangeText.length,
      expectedLength: end - start
    });

    const rect = range.getBoundingClientRect();
    const editorRect = editorRef.current.getBoundingClientRect();

    // **ADDITIONAL VALIDATION: Ensure the rect is valid**
    if (rect.width === 0 && rect.height === 0) {
      console.warn(`📌 Invalid rect dimensions for range ${start}-${end}. Skipping.`);
      return null;
    }

    const position = {
      top: rect.top - editorRect.top,
      left: rect.left - editorRect.left,
      width: rect.width,
      height: rect.height
    };

    console.log('✅ Marker position calculated:', position);

    return position;
  } catch (error) {
    console.error('❌ Error calculating marker position:', error);
    return null;
  }
}; 