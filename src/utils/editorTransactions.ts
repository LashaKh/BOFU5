import { Editor } from '@tiptap/react';

export interface TransactionBatch {
  editor: Editor;
  description?: string;
}

/**
 * Utility for batching multiple editor operations into a single undo step
 */
export class EditorTransactionBatcher {
  private editor: Editor;
  private isInBatch = false;
  private batchDescription?: string;

  constructor(editor: Editor) {
    this.editor = editor;
  }

  /**
   * Start a transaction batch - all operations until endBatch() will be grouped into one undo step
   */
  startBatch(description?: string): void {
    if (this.isInBatch) {
      console.warn('Transaction batch already started. Call endBatch() first.');
      return;
    }

    this.isInBatch = true;
    this.batchDescription = description;

    // Start a new history transaction group
    const { state } = this.editor;
    const tr = state.tr.setMeta('addToHistory', false);
    this.editor.view.dispatch(tr);
  }

  /**
   * End the current transaction batch and commit all operations as a single undo step
   */
  endBatch(): void {
    if (!this.isInBatch) {
      console.warn('No transaction batch in progress.');
      return;
    }

    this.isInBatch = false;

    // End the transaction group and add to history
    const { state } = this.editor;
    const tr = state.tr.setMeta('addToHistory', true);
    if (this.batchDescription) {
      tr.setMeta('description', this.batchDescription);
    }
    this.editor.view.dispatch(tr);

    this.batchDescription = undefined;
  }

  /**
   * Execute a function within a transaction batch
   */
  executeBatch<T>(operations: () => T, description?: string): T {
    this.startBatch(description);
    try {
      const result = operations();
      this.endBatch();
      return result;
    } catch (error) {
      this.endBatch();
      throw error;
    }
  }

  /**
   * Check if currently in a batch
   */
  isInProgress(): boolean {
    return this.isInBatch;
  }
}

/**
 * Helper function to batch complex table operations
 */
export const batchTableOperation = (editor: Editor, operation: () => void, description?: string): void => {
  const batcher = new EditorTransactionBatcher(editor);
  batcher.executeBatch(operation, description || 'Table operation');
};

/**
 * Helper function to batch complex formatting operations
 */
export const batchFormattingOperation = (editor: Editor, operation: () => void, description?: string): void => {
  const batcher = new EditorTransactionBatcher(editor);
  batcher.executeBatch(operation, description || 'Formatting operation');
};

/**
 * Helper function to batch image operations (upload, resize, etc.)
 */
export const batchImageOperation = (editor: Editor, operation: () => void, description?: string): void => {
  const batcher = new EditorTransactionBatcher(editor);
  batcher.executeBatch(operation, description || 'Image operation');
};

/**
 * Helper function to batch list operations (indent, outdent, etc.)
 */
export const batchListOperation = (editor: Editor, operation: () => void, description?: string): void => {
  const batcher = new EditorTransactionBatcher(editor);
  batcher.executeBatch(operation, description || 'List operation');
}; 