import React, { useState, useCallback, useEffect, useRef } from 'react';
import { MessageCircle, MessageSquare, CheckCircle, Archive, MoreHorizontal, Settings, BarChart3 } from 'lucide-react';
import { 
  ArticleComment, 
  getArticleComments, 
  subscribeToComments, 
  updateCommentStatus,
  resolveCommentWithReason,
  bulkUpdateCommentStatus,
  getCommentsWithMetrics
} from '../../lib/commentApi';
import { CommentMarker } from './CommentMarker';
import { CommentPopover } from './CommentPopover';
import { CommentThread } from './CommentThread';
import { CommentResolutionPanel } from './CommentResolutionPanel';

interface CommentingSystemProps {
  articleId: string;
  editorRef: React.RefObject<HTMLElement>;
  onCommentsChange?: (comments: ArticleComment[]) => void;
  showResolutionPanel?: boolean;
  adminMode?: boolean;
}

interface TextSelection {
  start: number;
  end: number;
  text: string;
  range: Range;
}

export const CommentingSystem: React.FC<CommentingSystemProps> = ({
  articleId,
  editorRef,
  onCommentsChange,
  showResolutionPanel = false,
  adminMode = false
}) => {
  const [comments, setComments] = useState<ArticleComment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedText, setSelectedText] = useState<TextSelection | null>(null);
  const [showCommentPopover, setShowCommentPopover] = useState(false);
  const [selectedComment, setSelectedComment] = useState<ArticleComment | null>(null);
  const [popoverPosition, setPopoverPosition] = useState({ x: 0, y: 0 });
  const [showResolutionManagement, setShowResolutionManagement] = useState(showResolutionPanel);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  // Load comments on mount
  useEffect(() => {
    loadComments();
  }, [articleId]);

  // Subscribe to real-time comment changes
  useEffect(() => {
    if (!articleId) return;

    const unsubscribe = subscribeToComments(articleId, (updatedComments) => {
      setComments(updatedComments);
      onCommentsChange?.(updatedComments);
    });

    return unsubscribe;
  }, [articleId, onCommentsChange]);

  // Handle text selection in the editor
  useEffect(() => {
    const handleSelectionChange = () => {
      const selection = window.getSelection();
      if (!selection || !editorRef.current || selection.rangeCount === 0) {
        setSelectedText(null);
        return;
      }

      const range = selection.getRangeAt(0);
      
      // Check if selection is within the editor
      if (!editorRef.current.contains(range.commonAncestorContainer)) {
        setSelectedText(null);
        return;
      }

      const selectedTextContent = selection.toString().trim();
      if (selectedTextContent.length === 0) {
        setSelectedText(null);
        return;
      }

      // Calculate character positions relative to editor content
      const editorTextContent = editorRef.current.textContent || '';
      const startOffset = getTextOffset(editorRef.current, range.startContainer, range.startOffset);
      const endOffset = getTextOffset(editorRef.current, range.endContainer, range.endOffset);

      setSelectedText({
        start: startOffset,
        end: endOffset,
        text: selectedTextContent,
        range: range.cloneRange()
      });
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, [editorRef]);

  const loadComments = async () => {
    try {
      setIsLoading(true);
      // Use enhanced comments with metrics if admin mode or resolution panel is enabled
      const fetchedComments = (showResolutionManagement || adminMode) 
        ? await getCommentsWithMetrics(articleId)
        : await getArticleComments(articleId);
      setComments(fetchedComments);
      onCommentsChange?.(fetchedComments);
    } catch (error) {
      console.error('Error loading comments:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateComment = useCallback((selection: TextSelection) => {
    const rect = selection.range.getBoundingClientRect();
    setPopoverPosition({
      x: rect.right + 10,
      y: rect.top
    });
    setSelectedText(selection);
    setSelectedComment(null);
    setShowCommentPopover(true);
  }, []);

  const handleCommentMarkerClick = useCallback((comment: ArticleComment, position: { x: number; y: number }) => {
    setPopoverPosition(position);
    setSelectedComment(comment);
    setSelectedText(null);
    setShowCommentPopover(true);
  }, []);

  const handleClosePopover = useCallback(() => {
    setShowCommentPopover(false);
    setSelectedText(null);
    setSelectedComment(null);
    
    // Clear text selection
    const selection = window.getSelection();
    if (selection) {
      selection.removeAllRanges();
    }
  }, []);

  const handleCommentCreated = useCallback(() => {
    handleClosePopover();
    loadComments(); // Refresh comments
  }, [handleClosePopover]);

  // Enhanced comment status change handler
  const handleCommentStatusChange = useCallback(async (commentId: string, status: 'active' | 'resolved' | 'archived') => {
    try {
      setLoadingAction(`status-${commentId}`);
      await updateCommentStatus(commentId, status);
      await loadComments(); // Refresh to get updated data
    } catch (error) {
      console.error('Error updating comment status:', error);
    } finally {
      setLoadingAction(null);
    }
  }, []);

  // Enhanced resolve with reason handler
  const handleResolveWithReason = useCallback(async (commentId: string, reason: string) => {
    try {
      setLoadingAction(`resolve-${commentId}`);
      await resolveCommentWithReason(commentId, reason);
      await loadComments(); // Refresh to get updated data
    } catch (error) {
      console.error('Error resolving comment with reason:', error);
    } finally {
      setLoadingAction(null);
    }
  }, []);

  // Bulk status change handler for resolution panel
  const handleBulkStatusChange = useCallback(async (commentIds: string[], status: 'active' | 'resolved' | 'archived') => {
    try {
      setLoadingAction(`bulk-${status}`);
      await bulkUpdateCommentStatus(commentIds, status);
      await loadComments(); // Refresh to get updated data
    } catch (error) {
      console.error('Error bulk updating comment status:', error);
    } finally {
      setLoadingAction(null);
    }
  }, []);

  // Delete comment handler
  const handleDeleteComment = useCallback(async (commentId: string) => {
    try {
      setLoadingAction(`delete-${commentId}`);
      // Import deleteComment if needed
      // await deleteComment(commentId);
      await loadComments(); // Refresh comments
    } catch (error) {
      console.error('Error deleting comment:', error);
    } finally {
      setLoadingAction(null);
    }
  }, []);

  // Reply to comment handler
  const handleReplyToComment = useCallback((comment: ArticleComment) => {
    // Set up reply context and show popover
    setSelectedComment(comment);
    setSelectedText(null);
    setShowCommentPopover(true);
  }, []);

  // Edit comment handler
  const handleEditComment = useCallback((comment: ArticleComment) => {
    // Set up edit context and show popover
    setSelectedComment(comment);
    setSelectedText(null);
    setShowCommentPopover(true);
  }, []);

  // Get comment markers for current comments
  const getCommentMarkers = useCallback(() => {
    if (!editorRef.current) return [];

    return comments
      .filter(comment => comment.selection_start !== undefined && comment.selection_end !== undefined)
      .map(comment => ({
        comment,
        position: getMarkerPosition(comment.selection_start!, comment.selection_end!)
      }))
      .filter(item => item.position);
  }, [comments, editorRef]);

  const getMarkerPosition = (start: number, end: number) => {
    if (!editorRef.current) return null;

    try {
      const textNode = getTextNodeAtOffset(editorRef.current, start);
      if (!textNode) return null;

      const range = document.createRange();
      range.setStart(textNode.node, textNode.offset);
      range.setEnd(textNode.node, Math.min(textNode.offset + (end - start), textNode.node.textContent?.length || 0));

      const rect = range.getBoundingClientRect();
      const editorRect = editorRef.current.getBoundingClientRect();

      return {
        top: rect.top - editorRect.top,
        left: editorRect.width - 30, // Position in margin
        height: rect.height
      };
    } catch (error) {
      console.error('Error calculating marker position:', error);
      return null;
    }
  };

  return (
    <div className="relative">
      {/* Header Controls */}
      {(adminMode || showResolutionPanel) && (
        <div className="mb-4 flex items-center justify-between bg-gray-50 px-4 py-2 rounded-lg">
          <div className="flex items-center gap-2">
            <MessageCircle size={16} className="text-gray-600" />
            <span className="text-sm font-medium text-gray-700">
              Comments ({comments.length})
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowResolutionManagement(!showResolutionManagement)}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                showResolutionManagement 
                  ? 'bg-blue-100 text-blue-700' 
                  : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
            >
              <BarChart3 size={14} className="inline mr-1" />
              Resolution Panel
            </button>
            {adminMode && (
              <button
                onClick={loadComments}
                disabled={isLoading}
                className="px-3 py-1 text-sm bg-white text-gray-600 rounded-md hover:bg-gray-100 disabled:opacity-50"
              >
                {isLoading ? 'Loading...' : 'Refresh'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Resolution Management Panel */}
      {showResolutionManagement && (
        <div className="mb-6">
          <CommentResolutionPanel
            comments={comments}
            onStatusChange={handleBulkStatusChange}
            onRefresh={loadComments}
            showAnalytics={adminMode}
          />
        </div>
      )}

      {/* Comment Markers */}
      <div className="absolute inset-0 pointer-events-none">
        {getCommentMarkers().map(({ comment, position }) => (
          position && (
            <CommentMarker
              key={comment.id}
              comment={comment}
              position={position}
              onClick={(comment: ArticleComment, pos: { x: number; y: number }) => {
                const rect = editorRef.current?.getBoundingClientRect();
                if (rect) {
                  handleCommentMarkerClick(comment, {
                    x: rect.right + 10,
                    y: rect.top + pos.y
                  });
                }
              }}
            />
          )
        ))}
      </div>

      {/* Selection Comment Button */}
      {selectedText && !showCommentPopover && (
        <CommentSelectionButton
          selection={selectedText}
          onCreateComment={handleCreateComment}
        />
      )}

      {/* Comment Popover */}
      {showCommentPopover && (
        <CommentPopover
          position={popoverPosition}
          selection={selectedText}
          articleId={articleId}
          selectedComment={selectedComment}
          onClose={handleClosePopover}
          onCommentCreated={handleCommentCreated}
        />
      )}

      {/* Enhanced Comments Panel */}
      <CommentsSidebar
        comments={comments}
        isLoading={isLoading}
        onCommentClick={handleCommentMarkerClick}
        onStatusChange={handleCommentStatusChange}
        onResolveWithReason={handleResolveWithReason}
        onDelete={handleDeleteComment}
        onReply={handleReplyToComment}
        onEdit={handleEditComment}
        showResolutionDetails={showResolutionManagement || adminMode}
        loadingAction={loadingAction}
      />
    </div>
  );
};

// Helper component for the comment button that appears on text selection
interface CommentSelectionButtonProps {
  selection: TextSelection;
  onCreateComment: (selection: TextSelection) => void;
}

const CommentSelectionButton: React.FC<CommentSelectionButtonProps> = ({
  selection,
  onCreateComment
}) => {
  const [position, setPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const rect = selection.range.getBoundingClientRect();
    setPosition({
      x: rect.right + 10,
      y: rect.top
    });
  }, [selection]);

  return (
    <div
      className="fixed z-10 bg-blue-600 text-white px-3 py-2 rounded-lg shadow-lg text-sm font-medium cursor-pointer hover:bg-blue-700 transition-colors"
      style={{
        left: position.x,
        top: position.y,
        transform: 'translate(0, -50%)'
      }}
      onClick={() => onCreateComment(selection)}
    >
      <MessageSquare size={14} className="inline mr-1" />
      Add Comment
    </div>
  );
};

// Enhanced comments sidebar with resolution workflow features
interface CommentsSidebarProps {
  comments: ArticleComment[];
  isLoading: boolean;
  onCommentClick: (comment: ArticleComment, position: { x: number; y: number }) => void;
  onStatusChange: (commentId: string, status: 'active' | 'resolved' | 'archived') => void;
  onResolveWithReason: (commentId: string, reason: string) => void;
  onDelete: (commentId: string) => void;
  onReply: (comment: ArticleComment) => void;
  onEdit: (comment: ArticleComment) => void;
  showResolutionDetails?: boolean;
  loadingAction?: string | null;
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
  loadingAction
}) => {
  const [filter, setFilter] = useState<'all' | 'active' | 'resolved' | 'archived'>('all');

  const filteredComments = comments.filter(comment => {
    if (filter === 'all') return true;
    return comment.status === filter;
  });

  if (isLoading) {
    return (
      <div className="p-4 text-center text-gray-500">
        <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
        Loading comments...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter Controls */}
      {showResolutionDetails && (
        <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
          <span className="text-sm font-medium text-gray-700">Filter:</span>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="text-sm border border-gray-300 rounded px-2 py-1"
          >
            <option value="all">All Comments</option>
            <option value="active">Active</option>
            <option value="resolved">Resolved</option>
            <option value="archived">Archived</option>
          </select>
          <span className="text-sm text-gray-500 ml-auto">
            {filteredComments.length} of {comments.length}
          </span>
        </div>
      )}

      {/* Comments List */}
      {filteredComments.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <MessageCircle size={48} className="mx-auto mb-2 text-gray-300" />
          <p>No comments found.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredComments.map((comment) => (
            <CommentThread
              key={comment.id}
              comment={comment}
              onReply={onReply}
              onEdit={onEdit}
              onDelete={onDelete}
              onStatusChange={onStatusChange}
              onResolveWithReason={onResolveWithReason}
              showResolutionDetails={showResolutionDetails}
              showActions={true}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// Helper functions remain the same
function getTextOffset(container: Element, node: Node, offset: number): number {
  const walker = document.createTreeWalker(
    container,
    NodeFilter.SHOW_TEXT,
    null
  );

  let currentOffset = 0;
  let currentNode: Node | null;

  while (currentNode = walker.nextNode()) {
    if (currentNode === node) {
      return currentOffset + offset;
    }
    currentOffset += currentNode.textContent?.length || 0;
  }

  return currentOffset;
}

function getTextNodeAtOffset(container: Element, offset: number): { node: Text; offset: number } | null {
  const walker = document.createTreeWalker(
    container,
    NodeFilter.SHOW_TEXT,
    null
  );

  let currentOffset = 0;
  let currentNode: Node | null;

  while (currentNode = walker.nextNode()) {
    const nodeLength = currentNode.textContent?.length || 0;
    if (currentOffset + nodeLength >= offset) {
      return {
        node: currentNode as Text,
        offset: offset - currentOffset
      };
    }
    currentOffset += nodeLength;
  }

  return null;
} 