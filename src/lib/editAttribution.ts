import { supabase } from './supabase';

// Types for edit attribution system
export interface EditAttribution {
  id: string;
  articleId: string;
  userId: string;
  userMetadata: {
    name?: string;
    email?: string;
    avatar_url?: string;
    color?: string;
  };
  operation: 'insert' | 'delete' | 'replace' | 'format';
  position: {
    from: number;
    to: number;
  };
  content?: string;
  length?: number;
  timestamp: string;
  metadata?: {
    transactionId?: string;
    batchId?: string;
    contentType?: string;
    formattingType?: string;
  };
}

export interface EditHighlight {
  userId: string;
  userColor: string;
  userName: string;
  from: number;
  to: number;
  timestamp: string;
  operation: EditAttribution['operation'];
}

export interface AttributionRange {
  from: number;
  to: number;
  attributions: EditAttribution[];
  dominantUser: {
    userId: string;
    userName: string;
    userColor: string;
    editCount: number;
  };
}

export interface EditBatch {
  batchId: string;
  userId: string;
  edits: EditAttribution[];
  startTime: string;
  endTime: string;
  description?: string;
}

export interface CollaborationMetrics {
  totalEdits: number;
  activeUsers: number;
  editsByUser: Map<string, number>;
  editsByTimeRange: Array<{
    timeRange: string;
    editCount: number;
    userCount: number;
  }>;
  collaborationPatterns: Array<{
    userPair: [string, string];
    sharedEdits: number;
    conflictCount: number;
  }>;
}

// Color palette for user attribution (consistent with cursor colors)
const ATTRIBUTION_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57',
  '#FF9FF3', '#54A0FF', '#5F27CD', '#00D2D3', '#FF9F43'
];

export class EditAttributionService {
  private articleId: string | null = null;
  private editQueue: EditAttribution[] = [];
  private batchQueue: EditBatch[] = [];
  private currentBatch: EditBatch | null = null;
  private userColors: Map<string, string> = new Map();
  private onAttributionChangeCallbacks: Array<(attributions: EditAttribution[]) => void> = [];
  private flushTimer: NodeJS.Timeout | null = null;

  // Configuration
  private readonly BATCH_TIMEOUT = 5000; // 5 seconds
  private readonly QUEUE_FLUSH_INTERVAL = 1000; // 1 second
  private readonly MAX_QUEUE_SIZE = 50;

  /**
   * Initialize the attribution service for an article
   */
  async initialize(articleId: string): Promise<void> {
    this.articleId = articleId;
    this.editQueue = [];
    this.batchQueue = [];
    this.currentBatch = null;

    // Load existing attributions
    await this.loadExistingAttributions();

    // Start periodic queue flushing
    this.startQueueFlushing();

    console.log(`Edit attribution service initialized for article ${articleId}`);
  }

  /**
   * Record a new edit operation
   */
  async recordEdit(
    userId: string,
    userMetadata: EditAttribution['userMetadata'],
    operation: EditAttribution['operation'],
    position: { from: number; to: number },
    content?: string,
    metadata?: EditAttribution['metadata']
  ): Promise<void> {
    if (!this.articleId) {
      throw new Error('Attribution service not initialized');
    }

    // Assign color to user if not already assigned
    if (!this.userColors.has(userId)) {
      const colorIndex = this.userColors.size % ATTRIBUTION_COLORS.length;
      this.userColors.set(userId, ATTRIBUTION_COLORS[colorIndex]);
    }

    const attribution: EditAttribution = {
      id: `edit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      articleId: this.articleId,
      userId,
      userMetadata: {
        ...userMetadata,
        color: this.userColors.get(userId),
      },
      operation,
      position,
      content,
      length: content?.length || Math.abs(position.to - position.from),
      timestamp: new Date().toISOString(),
      metadata,
    };

    // Add to current batch or create new batch
    if (!this.currentBatch || this.shouldStartNewBatch(userId)) {
      await this.finalizeBatch();
      this.startNewBatch(userId, userMetadata);
    }

    this.currentBatch!.edits.push(attribution);
    this.editQueue.push(attribution);

    // Trigger callbacks for real-time updates
    this.triggerAttributionCallbacks();

    // Flush queue if it gets too large
    if (this.editQueue.length >= this.MAX_QUEUE_SIZE) {
      await this.flushQueue();
    }
  }

  /**
   * Get attributions for a specific range
   */
  getAttributionsForRange(from: number, to: number): AttributionRange[] {
    const relevantAttributions = this.editQueue.filter(attr => 
      this.rangesOverlap(attr.position, { from, to })
    );

    // Group attributions by overlapping ranges
    const ranges: AttributionRange[] = [];
    const processed = new Set<string>();

    for (const attribution of relevantAttributions) {
      if (processed.has(attribution.id)) continue;

      const range: AttributionRange = {
        from: Math.max(attribution.position.from, from),
        to: Math.min(attribution.position.to, to),
        attributions: [attribution],
        dominantUser: {
          userId: attribution.userId,
          userName: attribution.userMetadata.name || attribution.userMetadata.email || 'Unknown',
          userColor: attribution.userMetadata.color || '#3B82F6',
          editCount: 1,
        },
      };

      // Find overlapping attributions
      for (const other of relevantAttributions) {
        if (other.id !== attribution.id && !processed.has(other.id)) {
          if (this.rangesOverlap(other.position, { from: range.from, to: range.to })) {
            range.attributions.push(other);
            processed.add(other.id);
          }
        }
      }

      // Calculate dominant user
      const userEditCounts = new Map<string, number>();
      range.attributions.forEach(attr => {
        const count = userEditCounts.get(attr.userId) || 0;
        userEditCounts.set(attr.userId, count + 1);
      });

      let maxCount = 0;
      let dominantUserId = range.attributions[0].userId;
      userEditCounts.forEach((count, userId) => {
        if (count > maxCount) {
          maxCount = count;
          dominantUserId = userId;
        }
      });

      const dominantAttribution = range.attributions.find(a => a.userId === dominantUserId)!;
      range.dominantUser = {
        userId: dominantUserId,
        userName: dominantAttribution.userMetadata.name || dominantAttribution.userMetadata.email || 'Unknown',
        userColor: dominantAttribution.userMetadata.color || '#3B82F6',
        editCount: maxCount,
      };

      ranges.push(range);
      processed.add(attribution.id);
    }

    return ranges;
  }

  /**
   * Get edit highlights for visual rendering
   */
  getEditHighlights(timeRangeHours: number = 24): EditHighlight[] {
    const cutoffTime = new Date(Date.now() - (timeRangeHours * 60 * 60 * 1000)).toISOString();
    
    return this.editQueue
      .filter(attr => attr.timestamp > cutoffTime)
      .map(attr => ({
        userId: attr.userId,
        userColor: attr.userMetadata.color || '#3B82F6',
        userName: attr.userMetadata.name || attr.userMetadata.email || 'Unknown',
        from: attr.position.from,
        to: attr.position.to,
        timestamp: attr.timestamp,
        operation: attr.operation,
      }));
  }

  /**
   * Get collaboration metrics
   */
  async getCollaborationMetrics(timeRangeHours: number = 24): Promise<CollaborationMetrics> {
    const cutoffTime = new Date(Date.now() - (timeRangeHours * 60 * 60 * 1000)).toISOString();
    const recentEdits = this.editQueue.filter(attr => attr.timestamp > cutoffTime);

    // Calculate metrics
    const editsByUser = new Map<string, number>();
    const activeUsers = new Set<string>();

    recentEdits.forEach(edit => {
      activeUsers.add(edit.userId);
      editsByUser.set(edit.userId, (editsByUser.get(edit.userId) || 0) + 1);
    });

    // Group edits by time ranges (hourly buckets)
    const editsByTimeRange: Array<{
      timeRange: string;
      editCount: number;
      userCount: number;
    }> = [];

    const hourlyBuckets = new Map<string, { edits: number; users: Set<string> }>();
    recentEdits.forEach(edit => {
      const hour = new Date(edit.timestamp).toISOString().slice(0, 13) + ':00:00.000Z';
      if (!hourlyBuckets.has(hour)) {
        hourlyBuckets.set(hour, { edits: 0, users: new Set() });
      }
      const bucket = hourlyBuckets.get(hour)!;
      bucket.edits++;
      bucket.users.add(edit.userId);
    });

    hourlyBuckets.forEach((data, hour) => {
      editsByTimeRange.push({
        timeRange: hour,
        editCount: data.edits,
        userCount: data.users.size,
      });
    });

    // Calculate collaboration patterns (simplified)
    const collaborationPatterns: Array<{
      userPair: [string, string];
      sharedEdits: number;
      conflictCount: number;
    }> = [];

    // This would be more complex in a real implementation
    // For now, just create some basic patterns
    const users = Array.from(activeUsers);
    for (let i = 0; i < users.length; i++) {
      for (let j = i + 1; j < users.length; j++) {
        const user1Edits = recentEdits.filter(e => e.userId === users[i]);
        const user2Edits = recentEdits.filter(e => e.userId === users[j]);
        
        // Simple overlap detection
        let sharedEdits = 0;
        let conflictCount = 0;
        
        user1Edits.forEach(e1 => {
          user2Edits.forEach(e2 => {
            if (this.rangesOverlap(e1.position, e2.position)) {
              sharedEdits++;
              // Simple conflict detection based on timing
              const timeDiff = Math.abs(new Date(e1.timestamp).getTime() - new Date(e2.timestamp).getTime());
              if (timeDiff < 60000) { // Within 1 minute
                conflictCount++;
              }
            }
          });
        });

        if (sharedEdits > 0) {
          collaborationPatterns.push({
            userPair: [users[i], users[j]],
            sharedEdits,
            conflictCount,
          });
        }
      }
    }

    return {
      totalEdits: recentEdits.length,
      activeUsers: activeUsers.size,
      editsByUser,
      editsByTimeRange,
      collaborationPatterns,
    };
  }

  /**
   * Subscribe to attribution changes
   */
  onAttributionChange(callback: (attributions: EditAttribution[]) => void): () => void {
    this.onAttributionChangeCallbacks.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.onAttributionChangeCallbacks.indexOf(callback);
      if (index > -1) {
        this.onAttributionChangeCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Cleanup the service
   */
  cleanup(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    
    // Flush any remaining edits
    this.flushQueue();
    this.finalizeBatch();
    
    this.articleId = null;
    this.editQueue = [];
    this.batchQueue = [];
    this.currentBatch = null;
    this.onAttributionChangeCallbacks = [];
  }

  // Private helper methods
  private async loadExistingAttributions(): Promise<void> {
    try {
      // Load recent attributions from database
      const { data, error } = await supabase
        .from('edit_attributions')
        .select('*')
        .eq('article_id', this.articleId)
        .gte('timestamp', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours
        .order('timestamp', { ascending: true });

      if (error) throw error;

      // Convert database records to EditAttribution objects
      this.editQueue = (data || []).map(record => ({
        id: record.id,
        articleId: record.article_id,
        userId: record.user_id,
        userMetadata: record.user_metadata,
        operation: record.operation,
        position: record.position,
        content: record.content,
        length: record.length,
        timestamp: record.timestamp,
        metadata: record.metadata,
      }));

      // Rebuild user colors
      this.editQueue.forEach(edit => {
        if (edit.userMetadata.color) {
          this.userColors.set(edit.userId, edit.userMetadata.color);
        }
      });

    } catch (error) {
      console.error('Failed to load existing attributions:', error);
    }
  }

  private startQueueFlushing(): void {
    this.flushTimer = setInterval(() => {
      this.flushQueue();
    }, this.QUEUE_FLUSH_INTERVAL);
  }

  private async flushQueue(): Promise<void> {
    if (this.editQueue.length === 0) return;

    try {
      // Convert to database format
      const records = this.editQueue.map(edit => ({
        id: edit.id,
        article_id: edit.articleId,
        user_id: edit.userId,
        user_metadata: edit.userMetadata,
        operation: edit.operation,
        position: edit.position,
        content: edit.content,
        length: edit.length,
        timestamp: edit.timestamp,
        metadata: edit.metadata,
      }));

      // Insert into database
      const { error } = await supabase
        .from('edit_attributions')
        .insert(records);

      if (error) throw error;

      console.log(`Flushed ${this.editQueue.length} edit attributions to database`);
      this.editQueue = [];

    } catch (error) {
      console.error('Failed to flush edit queue:', error);
    }
  }

  private shouldStartNewBatch(userId: string): boolean {
    if (!this.currentBatch) return true;
    
    // Start new batch if different user or timeout exceeded
    const timeDiff = Date.now() - new Date(this.currentBatch.startTime).getTime();
    return this.currentBatch.userId !== userId || timeDiff > this.BATCH_TIMEOUT;
  }

  private startNewBatch(userId: string, userMetadata: EditAttribution['userMetadata']): void {
    this.currentBatch = {
      batchId: `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      edits: [],
      startTime: new Date().toISOString(),
      endTime: new Date().toISOString(),
      description: `Edits by ${userMetadata.name || userMetadata.email || 'Unknown User'}`,
    };
  }

  private async finalizeBatch(): Promise<void> {
    if (!this.currentBatch || this.currentBatch.edits.length === 0) return;

    this.currentBatch.endTime = new Date().toISOString();
    this.batchQueue.push(this.currentBatch);

    // TODO: Store batch in database for analytics
    console.log(`Finalized batch ${this.currentBatch.batchId} with ${this.currentBatch.edits.length} edits`);
    
    this.currentBatch = null;
  }

  private rangesOverlap(range1: { from: number; to: number }, range2: { from: number; to: number }): boolean {
    return range1.from < range2.to && range2.from < range1.to;
  }

  private triggerAttributionCallbacks(): void {
    this.onAttributionChangeCallbacks.forEach(callback => {
      try {
        callback([...this.editQueue]);
      } catch (error) {
        console.error('Error in attribution change callback:', error);
      }
    });
  }
}

// Export singleton instance
export const editAttributionService = new EditAttributionService(); 