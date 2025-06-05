import { supabase } from './supabase';
import { RealtimeChannel } from '@supabase/supabase-js';
import { debounce } from '../utils/debounce';

// Enhanced types for optimized collaboration
export interface OptimizedUserPresence {
  id: string;
  user_id: string;
  article_id: string;
  status: 'viewing' | 'editing' | 'idle';
  cursor_position?: {
    from: number;
    to: number;
    selection?: {
      anchor: number;
      head: number;
    };
  } | null;
  user_metadata: {
    email?: string;
    name?: string;
    avatar_url?: string;
    color?: string;
  };
  last_heartbeat: string;
  joined_at: string;
}

export interface BatchedEdit {
  id: string;
  article_id: string;
  user_id: string;
  operations: Array<{
    type: 'insert' | 'delete' | 'replace' | 'format';
    position: number;
    content?: string;
    length?: number;
    metadata?: any;
  }>;
  timestamp: string;
  batch_id: string;
}

export interface CollaborationMetrics {
  operationsPerSecond: number;
  averageLatency: number;
  batchEfficiency: number;
  networkSavings: number;
  activeUsers: number;
  lastMeasurement: Date;
}

interface PendingOperation {
  operation: BatchedEdit['operations'][0];
  timestamp: number;
  priority: 'high' | 'medium' | 'low';
}

export class OptimizedRealtimeCollaborationService {
  // Core collaboration state
  private channels: Map<string, RealtimeChannel> = new Map();
  private currentArticleId: string | null = null;
  private currentUserId: string | null = null;
  private userColors: Map<string, string> = new Map();

  // Performance optimization state
  private pendingOperations: PendingOperation[] = [];
  private operationBatchTimer: NodeJS.Timeout | null = null;
  private presenceThrottleTimer: NodeJS.Timeout | null = null;
  private lastPresenceUpdate: number = 0;

  // Configuration for optimization
  private readonly config = {
    // Batching configuration
    batchWindow: 75, // ms - time to wait before sending batch
    maxBatchSize: 10, // maximum operations per batch
    minBatchDelay: 50, // minimum delay between batches
    
    // Throttling configuration
    presenceThrottleInterval: 100, // ms between presence updates
    cursorThrottleInterval: 50, // ms between cursor updates
    heartbeatInterval: 5000, // ms between heartbeats
    
    // Debouncing configuration
    contentDebounceDelay: 100, // ms to wait before processing content changes
    presenceDebounceDelay: 150, // ms to wait before processing presence changes
    
    // Network optimization
    enableCompression: true,
    useDeltaUpdates: true,
    enablePredictiveSync: true,
  };

  // Performance monitoring
  private metrics: CollaborationMetrics = {
    operationsPerSecond: 0,
    averageLatency: 0,
    batchEfficiency: 0,
    networkSavings: 0,
    activeUsers: 0,
    lastMeasurement: new Date()
  };

  // Callbacks for events
  private onPresenceChangeCallbacks: Array<(presence: OptimizedUserPresence[]) => void> = [];
  private onCursorChangeCallbacks: Array<(cursors: Array<{ userId: string; position: any; metadata: any }>) => void> = [];
  private onMetricsUpdateCallbacks: Array<(metrics: CollaborationMetrics) => void> = [];

  // Operation tracking for metrics
  private operationTimes: number[] = [];
  private batchedOperationCount = 0;
  private totalOperationCount = 0;

  // User colors for visual distinction
  private readonly USER_COLORS = [
    '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
    '#06B6D4', '#EC4899', '#84CC16', '#F97316', '#6366F1',
  ];

  // Debounced functions
  private debouncedProcessContent = debounce(this.processContentChanges.bind(this), this.config.contentDebounceDelay);
  private debouncedProcessPresence = debounce(this.processPresenceChanges.bind(this), this.config.presenceDebounceDelay);

  /**
   * Join an article with optimized collaboration
   */
  async joinArticle(articleId: string, userMetadata?: Partial<OptimizedUserPresence['user_metadata']>): Promise<void> {
    try {
      const startTime = performance.now();
      
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('User not authenticated');
      }

      this.currentArticleId = articleId;
      this.currentUserId = user.id;

      // Assign optimized color
      this.assignUserColor(user.id);

      // Prepare optimized user metadata
      const fullUserMetadata = this.prepareUserMetadata(user, userMetadata);

      // Update presence with batching
      await this.updatePresenceOptimized(articleId, 'viewing', undefined, fullUserMetadata);

      // Subscribe to optimized channel
      await this.subscribeToOptimizedChannel(articleId);

      // Start optimized heartbeat
      this.startOptimizedHeartbeat(articleId, fullUserMetadata);

      // Track join latency
      const joinLatency = performance.now() - startTime;
      this.updateLatencyMetrics(joinLatency);

      console.log(`Joined article ${articleId} with optimized collaboration (${joinLatency.toFixed(2)}ms)`);
    } catch (error) {
      console.error('Failed to join article with optimization:', error);
      throw error;
    }
  }

  /**
   * Leave article with cleanup optimization
   */
  async leaveArticle(): Promise<void> {
    try {
      if (this.currentArticleId) {
        // Flush any pending operations before leaving
        await this.flushPendingOperations();
        
        // Clean up optimized systems
        await this.removePresenceOptimized(this.currentArticleId);
        this.unsubscribeFromOptimizedChannel(this.currentArticleId);
        this.stopOptimizedHeartbeat();
        
        console.log(`Left article ${this.currentArticleId} with optimization cleanup`);
        this.currentArticleId = null;
        this.currentUserId = null;
      }
    } catch (error) {
      console.error('Failed to leave article with optimization:', error);
    }
  }

  /**
   * Send operation with batching optimization
   */
  async sendOperation(operation: PendingOperation['operation'], priority: PendingOperation['priority'] = 'medium'): Promise<void> {
    const pendingOp: PendingOperation = {
      operation,
      timestamp: Date.now(),
      priority
    };

    this.pendingOperations.push(pendingOp);
    this.totalOperationCount++;

    // Sort by priority and timestamp
    this.pendingOperations.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      return priorityDiff !== 0 ? priorityDiff : a.timestamp - b.timestamp;
    });

    // Trigger batching logic
    this.scheduleBatchProcessing();
  }

  /**
   * Update cursor position with throttling
   */
  async updateCursorPositionOptimized(cursorPosition: OptimizedUserPresence['cursor_position']): Promise<void> {
    const now = Date.now();
    
    // Throttle cursor updates
    if (now - this.lastPresenceUpdate < this.config.cursorThrottleInterval) {
      return;
    }

    this.lastPresenceUpdate = now;
    
    if (this.currentArticleId) {
      try {
        await this.updatePresenceOptimized(this.currentArticleId, 'editing', cursorPosition);
      } catch (error) {
        console.error('Failed to update cursor position:', error);
      }
    }
  }

  /**
   * Get performance metrics
   */
  getMetrics(): CollaborationMetrics {
    return { ...this.metrics };
  }

  /**
   * Enable/disable specific optimizations
   */
  configureOptimizations(config: Partial<typeof this.config>): void {
    Object.assign(this.config, config);
    console.log('Updated collaboration optimization config:', config);
  }

  /**
   * Force flush all pending operations (useful before critical operations)
   */
  async flushPendingOperations(): Promise<void> {
    if (this.operationBatchTimer) {
      clearTimeout(this.operationBatchTimer);
      this.operationBatchTimer = null;
    }
    
    if (this.pendingOperations.length > 0) {
      await this.processBatchedOperations();
    }
  }

  // Private optimized methods

  private assignUserColor(userId: string): void {
    if (!this.userColors.has(userId)) {
      const colorIndex = this.userColors.size % this.USER_COLORS.length;
      this.userColors.set(userId, this.USER_COLORS[colorIndex]);
    }
  }

  private prepareUserMetadata(user: any, userMetadata?: any): OptimizedUserPresence['user_metadata'] {
    return {
      email: user.email,
      name: userMetadata?.name || user.user_metadata?.full_name || user.email?.split('@')[0],
      avatar_url: userMetadata?.avatar_url || user.user_metadata?.avatar_url,
      color: this.userColors.get(user.id),
      ...userMetadata,
    };
  }

  private scheduleBatchProcessing(): void {
    // Clear existing timer
    if (this.operationBatchTimer) {
      clearTimeout(this.operationBatchTimer);
    }

    // Check if we should process immediately (high priority or batch is full)
    const hasHighPriority = this.pendingOperations.some(op => op.priority === 'high');
    const isBatchFull = this.pendingOperations.length >= this.config.maxBatchSize;

    if (hasHighPriority || isBatchFull) {
      // Process immediately for high priority or full batch
      this.processBatchedOperations();
    } else {
      // Schedule processing after batch window
      this.operationBatchTimer = setTimeout(() => {
        this.processBatchedOperations();
      }, this.config.batchWindow);
    }
  }

  private async processBatchedOperations(): Promise<void> {
    if (this.pendingOperations.length === 0) return;

    const startTime = performance.now();
    
    try {
      // Take operations for this batch
      const operationsToProcess = this.pendingOperations.splice(0, this.config.maxBatchSize);
      const batchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const batchedEdit: BatchedEdit = {
        id: `edit_${Date.now()}`,
        article_id: this.currentArticleId!,
        user_id: this.currentUserId!,
        operations: operationsToProcess.map(pending => pending.operation),
        timestamp: new Date().toISOString(),
        batch_id: batchId
      };

      // Send batched operations
      await this.sendBatchedEdit(batchedEdit);

      // Update metrics
      this.batchedOperationCount += operationsToProcess.length;
      const processingTime = performance.now() - startTime;
      this.updateBatchMetrics(operationsToProcess.length, processingTime);

      console.log(`Processed batch of ${operationsToProcess.length} operations in ${processingTime.toFixed(2)}ms`);

    } catch (error) {
      console.error('Failed to process batched operations:', error);
      // Re-add failed operations to the front of the queue for retry
      this.pendingOperations.unshift(...this.pendingOperations);
    } finally {
      this.operationBatchTimer = null;
      
      // Schedule next batch if there are more operations
      if (this.pendingOperations.length > 0) {
        setTimeout(() => this.scheduleBatchProcessing(), this.config.minBatchDelay);
      }
    }
  }

  private async sendBatchedEdit(batchedEdit: BatchedEdit): Promise<void> {
    const channel = this.channels.get(this.currentArticleId!);
    if (!channel) {
      throw new Error('No active channel for article');
    }

    // Compress data if enabled
    let payload = batchedEdit;
    if (this.config.enableCompression) {
      payload = this.compressBatchedEdit(batchedEdit);
    }

    const { error } = await channel.send({
      type: 'broadcast',
      event: 'batched_edit',
      payload
    });

    if (error) {
      throw error;
    }
  }

  private compressBatchedEdit(batchedEdit: BatchedEdit): BatchedEdit {
    // Simple compression: remove redundant data and optimize payload
    const compressed = {
      ...batchedEdit,
      operations: batchedEdit.operations.map(op => {
        // Remove undefined/null values to reduce payload size
        const cleanOp: any = { type: op.type, position: op.position };
        if (op.content !== undefined) cleanOp.content = op.content;
        if (op.length !== undefined) cleanOp.length = op.length;
        if (op.metadata) cleanOp.metadata = op.metadata;
        return cleanOp;
      })
    };

    return compressed;
  }

  private async updatePresenceOptimized(
    articleId: string,
    status: OptimizedUserPresence['status'],
    cursorPosition?: OptimizedUserPresence['cursor_position'],
    userMetadata?: OptimizedUserPresence['user_metadata']
  ): Promise<void> {
    // Use throttling for presence updates
    this.debouncedProcessPresence.call(this, articleId, status, cursorPosition, userMetadata);
  }

  private async processPresenceChanges(
    articleId: string,
    status: OptimizedUserPresence['status'],
    cursorPosition?: OptimizedUserPresence['cursor_position'],
    userMetadata?: OptimizedUserPresence['user_metadata']
  ): Promise<void> {
    try {
      const { error } = await supabase.rpc('update_user_presence_optimized', {
        p_article_id: articleId,
        p_status: status,
        p_cursor_position: cursorPosition || null,
        p_user_metadata: userMetadata || {},
        p_optimization_flags: {
          batch_updates: true,
          compress_data: this.config.enableCompression
        }
      });

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Failed to update optimized presence:', error);
      throw error;
    }
  }

  private async processContentChanges(): Promise<void> {
    // Process any pending content-related operations
    if (this.pendingOperations.length > 0) {
      await this.processBatchedOperations();
    }
  }

  private async removePresenceOptimized(articleId: string): Promise<void> {
    try {
      const { error } = await supabase.rpc('leave_article_optimized', {
        p_article_id: articleId,
        p_cleanup_orphaned: true,
        p_batch_cleanup: true
      });

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Failed to remove optimized presence:', error);
      throw error;
    }
  }

  private async subscribeToOptimizedChannel(articleId: string): Promise<void> {
    const channelName = `article_collaboration_optimized:${articleId}`;
    
    const channel = supabase
      .channel(channelName)
      .on('broadcast', { event: 'batched_edit' }, (payload) => {
        this.handleOptimizedContentChange(payload);
      })
      .on('presence', { event: 'sync' }, () => {
        this.debouncedProcessPresence();
      })
      .on('presence', { event: 'join' }, (payload) => {
        this.handleOptimizedPresenceJoin(payload);
      })
      .on('presence', { event: 'leave' }, (payload) => {
        this.handleOptimizedPresenceLeave(payload);
      });

    const { error } = await channel.subscribe();
    if (error) {
      throw error;
    }

    this.channels.set(articleId, channel);
    console.log(`Subscribed to optimized channel: ${channelName}`);
  }

  private unsubscribeFromOptimizedChannel(articleId: string): void {
    const channel = this.channels.get(articleId);
    if (channel) {
      channel.unsubscribe();
      this.channels.delete(articleId);
      console.log(`Unsubscribed from optimized channel for article: ${articleId}`);
    }
  }

  private handleOptimizedContentChange(payload: any): void {
    // Handle incoming batched edits with optimization
    if (payload.payload && payload.payload.operations) {
      const batchedEdit = payload.payload as BatchedEdit;
      
      // Process each operation in the batch
      batchedEdit.operations.forEach(operation => {
        // Apply operation to local state
        this.applyIncomingOperation(operation);
      });

      // Update metrics
      this.metrics.operationsPerSecond = this.calculateOperationsPerSecond();
      this.notifyMetricsUpdate();
    }
  }

  private handleOptimizedPresenceJoin(payload: any): void {
    this.metrics.activeUsers++;
    this.notifyMetricsUpdate();
    this.notifyPresenceCallbacks();
  }

  private handleOptimizedPresenceLeave(payload: any): void {
    this.metrics.activeUsers = Math.max(0, this.metrics.activeUsers - 1);
    this.notifyMetricsUpdate();
    this.notifyPresenceCallbacks();
  }

  private applyIncomingOperation(operation: BatchedEdit['operations'][0]): void {
    // This would integrate with ProseMirror to apply the operation
    // For now, just log and update metrics
    console.log('Applying optimized operation:', operation);
    
    // Track operation timing
    this.operationTimes.push(Date.now());
    
    // Keep only recent operations for metrics (last 10 seconds)
    const cutoff = Date.now() - 10000;
    this.operationTimes = this.operationTimes.filter(time => time > cutoff);
  }

  private startOptimizedHeartbeat(articleId: string, userMetadata: OptimizedUserPresence['user_metadata']): void {
    this.stopOptimizedHeartbeat(); // Ensure no duplicate intervals
    
    this.presenceThrottleTimer = setInterval(async () => {
      try {
        await this.updatePresenceOptimized(articleId, 'viewing', undefined, userMetadata);
      } catch (error) {
        console.error('Optimized heartbeat failed:', error);
      }
    }, this.config.heartbeatInterval);
  }

  private stopOptimizedHeartbeat(): void {
    if (this.presenceThrottleTimer) {
      clearInterval(this.presenceThrottleTimer);
      this.presenceThrottleTimer = null;
    }
  }

  private updateLatencyMetrics(latency: number): void {
    const alpha = 0.1; // Exponential moving average factor
    this.metrics.averageLatency = this.metrics.averageLatency * (1 - alpha) + latency * alpha;
  }

  private updateBatchMetrics(operationsInBatch: number, processingTime: number): void {
    // Calculate batch efficiency (operations per ms)
    const efficiency = operationsInBatch / processingTime;
    this.metrics.batchEfficiency = this.metrics.batchEfficiency * 0.9 + efficiency * 0.1;
    
    // Calculate network savings (percentage of operations batched)
    const savingsRatio = this.batchedOperationCount / this.totalOperationCount;
    this.metrics.networkSavings = savingsRatio * 100;
    
    this.metrics.lastMeasurement = new Date();
  }

  private calculateOperationsPerSecond(): number {
    const recentOps = this.operationTimes.filter(time => time > Date.now() - 1000);
    return recentOps.length;
  }

  private notifyMetricsUpdate(): void {
    this.onMetricsUpdateCallbacks.forEach(callback => {
      callback(this.metrics);
    });
  }

  private notifyPresenceCallbacks(): void {
    // This would get the actual presence data and notify callbacks
    // For now, just trigger the callbacks
    this.onPresenceChangeCallbacks.forEach(callback => {
      callback([]); // Would pass actual presence data
    });
  }

  // Event subscription methods
  onPresenceChange(callback: (presence: OptimizedUserPresence[]) => void): () => void {
    this.onPresenceChangeCallbacks.push(callback);
    return () => {
      const index = this.onPresenceChangeCallbacks.indexOf(callback);
      if (index > -1) {
        this.onPresenceChangeCallbacks.splice(index, 1);
      }
    };
  }

  onCursorChange(callback: (cursors: Array<{ userId: string; position: any; metadata: any }>) => void): () => void {
    this.onCursorChangeCallbacks.push(callback);
    return () => {
      const index = this.onCursorChangeCallbacks.indexOf(callback);
      if (index > -1) {
        this.onCursorChangeCallbacks.splice(index, 1);
      }
    };
  }

  onMetricsUpdate(callback: (metrics: CollaborationMetrics) => void): () => void {
    this.onMetricsUpdateCallbacks.push(callback);
    return () => {
      const index = this.onMetricsUpdateCallbacks.indexOf(callback);
      if (index > -1) {
        this.onMetricsUpdateCallbacks.splice(index, 1);
      }
    };
  }

  // Cleanup method
  cleanup(): void {
    this.leaveArticle();
    this.onPresenceChangeCallbacks = [];
    this.onCursorChangeCallbacks = [];
    this.onMetricsUpdateCallbacks = [];
    
    if (this.operationBatchTimer) {
      clearTimeout(this.operationBatchTimer);
    }
    
    this.pendingOperations = [];
    this.userColors.clear();
  }
}

// Global instance for easy access
export const optimizedRealtimeCollaboration = new OptimizedRealtimeCollaborationService(); 