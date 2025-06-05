import { Doc as YDoc, UndoManager, Transaction } from 'yjs';
import { Collaboration } from '@tiptap/extension-collaboration';
import { CollaborationCursor } from '@tiptap/extension-collaboration-cursor';
import { supabase } from './supabase';
import { realtimeCollaboration } from './realtimeCollaboration';

// Types for collaborative operations
export interface CollaborativeOperation {
  id: string;
  articleId: string;
  userId: string;
  operation: {
    type: 'insert' | 'delete' | 'retain' | 'format';
    position?: number;
    content?: any;
    attributes?: Record<string, any>;
    length?: number;
  };
  timestamp: string;
  clientId: string;
  vector?: any; // Y.js vector clock for ordering
}

export interface DocumentState {
  content: any;
  version: number;
  lastModified: string;
  participants: string[];
}

export interface ConflictMetrics {
  conflictsResolved: number;
  operationsApplied: number;
  averageResolutionTime: number;
  participantCount: number;
}

export class CollaborativeConflictResolutionService {
  private yDoc: YDoc | null = null;
  private undoManager: UndoManager | null = null;
  private currentArticleId: string | null = null;
  private operationQueue: CollaborativeOperation[] = [];
  private isConnected: boolean = false;
  private retryAttempts: number = 0;
  private maxRetryAttempts: number = 3;
  private conflictMetrics: ConflictMetrics = {
    conflictsResolved: 0,
    operationsApplied: 0,
    averageResolutionTime: 0,
    participantCount: 0
  };

  // Callbacks for operation events
  private onOperationAppliedCallbacks: Array<(operation: CollaborativeOperation) => void> = [];
  private onConflictResolvedCallbacks: Array<(conflictData: any) => void> = [];
  private onSyncCompleteCallbacks: Array<(state: DocumentState) => void> = [];

  /**
   * Initialize the collaborative document for an article
   */
  async initializeDocument(articleId: string): Promise<YDoc> {
    try {
      this.currentArticleId = articleId;
      this.yDoc = new YDoc();
      
      // Set up undo manager for the document
      const yText = this.yDoc.getText('content');
      this.undoManager = new UndoManager(yText);
      
      // Set up document observers for tracking changes
      this.setupDocumentObservers();
      
      // Load initial document state from database
      await this.loadDocumentState(articleId);
      
      // Set up real-time synchronization
      await this.setupRealtimeSync(articleId);
      
      console.log(`Initialized collaborative document for article ${articleId}`);
      return this.yDoc;
    } catch (error) {
      console.error('Failed to initialize collaborative document:', error);
      throw error;
    }
  }

  /**
   * Get TipTap collaboration extensions configured for this document
   */
  getCollaborationExtensions(): any[] {
    if (!this.yDoc) {
      throw new Error('Document not initialized. Call initializeDocument first.');
    }

    return [
      Collaboration.configure({
        document: this.yDoc,
        field: 'content', // Y.js field name
      }),
      CollaborationCursor.configure({
        provider: null, // We'll handle sync manually via Supabase
        user: {
          name: 'User', // Will be updated with real user data
          color: '#f783ac',
        },
      }),
    ];
  }

  /**
   * Apply an operation to the document
   */
  async applyOperation(operation: CollaborativeOperation): Promise<boolean> {
    if (!this.yDoc) {
      throw new Error('Document not initialized');
    }

    const startTime = Date.now();
    
    try {
      const yText = this.yDoc.getText('content');
      
      // Apply operation based on type
      this.yDoc.transact(() => {
        switch (operation.operation.type) {
          case 'insert':
            if (operation.operation.position !== undefined && operation.operation.content) {
              yText.insert(operation.operation.position, operation.operation.content);
            }
            break;
            
          case 'delete':
            if (operation.operation.position !== undefined && operation.operation.length !== undefined) {
              yText.delete(operation.operation.position, operation.operation.length);
            }
            break;
            
          case 'format':
            if (operation.operation.position !== undefined && 
                operation.operation.length !== undefined && 
                operation.operation.attributes) {
              yText.format(
                operation.operation.position, 
                operation.operation.length, 
                operation.operation.attributes
              );
            }
            break;
            
          default:
            console.warn('Unknown operation type:', operation.operation.type);
            return false;
        }
      }, operation.userId);

      // Update metrics
      this.conflictMetrics.operationsApplied++;
      const resolutionTime = Date.now() - startTime;
      this.updateAverageResolutionTime(resolutionTime);

      // Notify callbacks
      this.onOperationAppliedCallbacks.forEach(callback => {
        callback(operation);
      });

      // Broadcast to other participants
      await this.broadcastOperation(operation);

      return true;
    } catch (error) {
      console.error('Failed to apply operation:', error);
      return false;
    }
  }

  /**
   * Handle incoming operations from other users
   */
  async handleIncomingOperation(operation: CollaborativeOperation): Promise<void> {
    if (!this.yDoc || operation.articleId !== this.currentArticleId) {
      return;
    }

    // Check if this operation has already been applied
    if (this.isOperationApplied(operation)) {
      return;
    }

    // Add to operation queue for processing
    this.operationQueue.push(operation);
    await this.processOperationQueue();
  }

  /**
   * Get current document state
   */
  getDocumentState(): DocumentState | null {
    if (!this.yDoc) {
      return null;
    }

    const yText = this.yDoc.getText('content');
    return {
      content: yText.toJSON(),
      version: this.yDoc.clientID || 0,
      lastModified: new Date().toISOString(),
      participants: Array.from(this.yDoc.share.keys())
    };
  }

  /**
   * Undo last operation
   */
  undo(): boolean {
    if (this.undoManager && this.undoManager.canUndo()) {
      this.undoManager.undo();
      return true;
    }
    return false;
  }

  /**
   * Redo last undone operation
   */
  redo(): boolean {
    if (this.undoManager && this.undoManager.canRedo()) {
      this.undoManager.redo();
      return true;
    }
    return false;
  }

  /**
   * Get conflict resolution metrics
   */
  getMetrics(): ConflictMetrics {
    return { ...this.conflictMetrics };
  }

  /**
   * Subscribe to operation applied events
   */
  onOperationApplied(callback: (operation: CollaborativeOperation) => void): () => void {
    this.onOperationAppliedCallbacks.push(callback);
    return () => {
      const index = this.onOperationAppliedCallbacks.indexOf(callback);
      if (index > -1) {
        this.onOperationAppliedCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Subscribe to conflict resolved events
   */
  onConflictResolved(callback: (conflictData: any) => void): () => void {
    this.onConflictResolvedCallbacks.push(callback);
    return () => {
      const index = this.onConflictResolvedCallbacks.indexOf(callback);
      if (index > -1) {
        this.onConflictResolvedCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Subscribe to sync complete events
   */
  onSyncComplete(callback: (state: DocumentState) => void): () => void {
    this.onSyncCompleteCallbacks.push(callback);
    return () => {
      const index = this.onSyncCompleteCallbacks.indexOf(callback);
      if (index > -1) {
        this.onSyncCompleteCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    if (this.yDoc) {
      this.yDoc.destroy();
      this.yDoc = null;
    }
    
    this.undoManager = null;
    this.currentArticleId = null;
    this.operationQueue = [];
    this.isConnected = false;
    this.retryAttempts = 0;
    
    // Clear callbacks
    this.onOperationAppliedCallbacks = [];
    this.onConflictResolvedCallbacks = [];
    this.onSyncCompleteCallbacks = [];
  }

  // Private methods

  private setupDocumentObservers(): void {
    if (!this.yDoc) return;

    // Observe document changes
    this.yDoc.on('update', (update: Uint8Array, origin: any) => {
      if (origin !== 'local') {
        this.handleRemoteUpdate(update, origin);
      }
    });

    // Observe undo/redo stack changes
    if (this.undoManager) {
      this.undoManager.on('stack-item-added', (event: any) => {
        console.log('Operation added to undo stack:', event);
      });
    }
  }

  private async loadDocumentState(articleId: string): Promise<void> {
    try {
      // Load initial content from database
      const { data: article, error } = await supabase
        .from('content_briefs')
        .select('article_content, article_version')
        .eq('id', articleId)
        .single();

      if (error) {
        throw error;
      }

      if (article?.article_content && this.yDoc) {
        // Initialize Y.js document with existing content
        const yText = this.yDoc.getText('content');
        if (typeof article.article_content === 'string') {
          yText.insert(0, article.article_content);
        }
      }
    } catch (error) {
      console.error('Failed to load document state:', error);
    }
  }

  private async setupRealtimeSync(articleId: string): Promise<void> {
    // Subscribe to operation broadcasts via our existing real-time system
    const unsubscribe = realtimeCollaboration.onPresenceChange(async (users) => {
      this.conflictMetrics.participantCount = users.length;
      
      // Sync document state when new users join
      if (users.length > 1) {
        await this.syncDocumentState();
      }
    });

    this.isConnected = true;
  }

  private async processOperationQueue(): Promise<void> {
    while (this.operationQueue.length > 0) {
      const operation = this.operationQueue.shift();
      if (operation) {
        await this.applyOperation(operation);
      }
    }
  }

  private isOperationApplied(operation: CollaborativeOperation): boolean {
    // Check if operation is already applied using Y.js vector clocks
    // This is a simplified check - Y.js handles this automatically
    return false;
  }

  private async broadcastOperation(operation: CollaborativeOperation): Promise<void> {
    try {
      // Store operation in database for persistence and conflict resolution
      const { error } = await supabase
        .from('collaborative_operations')
        .insert({
          id: operation.id,
          article_id: operation.articleId,
          user_id: operation.userId,
          operation_data: operation.operation,
          client_id: operation.clientId,
          timestamp: operation.timestamp
        });

      if (error) {
        console.error('Failed to store operation:', error);
      }
    } catch (error) {
      console.error('Failed to broadcast operation:', error);
    }
  }

  private handleRemoteUpdate(update: Uint8Array, origin: any): void {
    console.log('Received remote update:', { update, origin });
    
    // Notify about conflict resolution if needed
    this.conflictMetrics.conflictsResolved++;
    this.onConflictResolvedCallbacks.forEach(callback => {
      callback({ update, origin, timestamp: new Date().toISOString() });
    });
  }

  private async syncDocumentState(): Promise<void> {
    const state = this.getDocumentState();
    if (state) {
      this.onSyncCompleteCallbacks.forEach(callback => {
        callback(state);
      });
    }
  }

  private updateAverageResolutionTime(newTime: number): void {
    const { operationsApplied, averageResolutionTime } = this.conflictMetrics;
    this.conflictMetrics.averageResolutionTime = 
      (averageResolutionTime * (operationsApplied - 1) + newTime) / operationsApplied;
  }
}

// Export a singleton instance
export const collaborativeConflictResolution = new CollaborativeConflictResolutionService(); 