import React, { useState, useCallback } from 'react';
import { ArticleComment, createComment, createCommentWithMentions } from '../../lib/commentApi';
import { InlineCommentButton } from './InlineCommentButton';
import { InlineCommentEditor } from './InlineCommentEditor';
import { InlineCommentBubble } from './InlineCommentBubble';

interface TextSelection {
  start: number;
  end: number;
  text: string;
  range?: Range;
}

interface InlineCommentingExtensionProps {
  articleId: string;
  editorRef: React.RefObject<HTMLElement>;
  selectedText: TextSelection | null;
  comments: ArticleComment[];
  onCommentsChange: (comments: ArticleComment[]) => void;
  getMarkerPosition: (start: number, end: number, editorRef: React.RefObject<HTMLElement>) => { top: number; left: number; width: number; height: number } | null;
  onCommentClick: (comment: ArticleComment) => void;
  onCommentStatusChange?: (commentId: string, status: string) => void;
  inlineMode?: boolean;
}

export const InlineCommentingExtension: React.FC<InlineCommentingExtensionProps> = ({
  articleId,
  editorRef,
  selectedText,
  comments,
  onCommentsChange,
  getMarkerPosition,
  onCommentClick,
  onCommentStatusChange,
  inlineMode = true
}) => {
  const [showInlineEditor, setShowInlineEditor] = useState(false);
  const [activeSelection, setActiveSelection] = useState<TextSelection | null>(null);

  const handleAddComment = useCallback((selection: TextSelection) => {
    console.log('🎯 Inline comment requested for selection:', selection);
    setActiveSelection(selection);
    setShowInlineEditor(true);
  }, []);

  const handleSubmitComment = useCallback(async (content: string, mentions: string[]) => {
    if (!activeSelection) return;

    console.log('📝 Submitting inline comment:', { content, mentions, selection: activeSelection });
    
    try {
      let newComment: ArticleComment;
      
      if (mentions.length > 0) {
        newComment = await createCommentWithMentions({
          article_id: articleId,
          content: content.trim(),
          content_type: 'text',
          selection_start: activeSelection.start,
          selection_end: activeSelection.end,
          selected_text: activeSelection.text,
          mentions
        });
      } else {
        newComment = await createComment({
          article_id: articleId,
          content: content.trim(),
          content_type: 'text',
          selection_start: activeSelection.start,
          selection_end: activeSelection.end,
          selected_text: activeSelection.text
        });
      }

      // Add the new comment to the list
      const updatedComments = [...comments, newComment];
      onCommentsChange(updatedComments);
      
      // Reset state
      setShowInlineEditor(false);
      setActiveSelection(null);
      
      console.log('✅ Inline comment created successfully:', newComment.id);
    } catch (error) {
      console.error('❌ Failed to create inline comment:', error);
      throw error;
    }
  }, [activeSelection, articleId, comments, onCommentsChange]);

  const handleCancelComment = useCallback(() => {
    setShowInlineEditor(false);
    setActiveSelection(null);
  }, []);

  if (!inlineMode) {
    return null;
  }

  return (
    <>
      {/* Inline comment button for text selection */}
      {selectedText && !showInlineEditor && (
        <InlineCommentButton
          selection={selectedText}
          editorRef={editorRef}
          onAddComment={handleAddComment}
          visible={true}
        />
      )}

      {/* Inline comment editor */}
      {showInlineEditor && activeSelection && (
        <InlineCommentEditor
          selection={activeSelection}
          editorRef={editorRef}
          visible={true}
          onSubmit={handleSubmitComment}
          onCancel={handleCancelComment}
          articleId={articleId}
        />
      )}

      {/* Inline comment bubbles for existing comments */}
      {comments.map((comment) => {
        // Only show bubbles for comments with valid coordinates
        if (typeof comment.selection_start !== 'number' || typeof comment.selection_end !== 'number') {
          return null;
        }

        const position = getMarkerPosition(comment.selection_start, comment.selection_end, editorRef);
        if (!position) return null;

        return (
          <InlineCommentBubble
            key={comment.id}
            comment={comment}
            position={position}
            editorRef={editorRef}
            onClick={onCommentClick}
            onStatusChange={onCommentStatusChange}
            compact={false}
          />
        );
      })}
    </>
  );
};