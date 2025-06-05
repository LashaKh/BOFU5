export interface CollaborationPerformanceMetrics {
  // Real-time collaboration metrics
  averageLatency: number;
  operationsPerSecond: number;
  batchEfficiency: number;
  networkSavings: number;
  conflictResolutionTime: number;
  
  // User and session metrics
  activeUsers: number;
  averageSessionDuration: number;
  totalSessions: number;
  concurrentEditors: number;
  
  // Network and data metrics
  bytesTransferred: number;
  compressionRatio: number;
  updateFrequency: number;
  failureRate: number;
  
  // Performance indices
  collaborationScore: number; // Overall performance score 0-100
  userExperienceIndex: number; // UX quality score 0-100
  
  // Timestamps and metadata
  lastUpdated: Date;
  measurementPeriod: number; // seconds
  reportId: string;
}

export interface CacheMetrics {
  hitRate: number;
  missRate: number;
  totalRequests: number;
  cacheSize: number;
  evictions: number;
}

export interface PerformanceAlert {
  id: string;
  type: 'latency' | 'conflict' | 'network' | 'cache' | 'user_experience';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: Date;
  metrics: Partial<CollaborationPerformanceMetrics>;
  resolved: boolean;
}

// IndexedDB interface for local caching
interface CachedDocument {
  id: string;
  articleId: string;
  content: any;
  version: number;
  timestamp: number;
  size: number;
  userId: string;
}

interface CachedOperation {
  id: string;
  articleId: string;
  operation: any;
  timestamp: number;
  applied: boolean;
  batchId?: string;
}

export class CollaborationPerformanceMonitor {
  private metrics: CollaborationPerformanceMetrics;
  private alerts: PerformanceAlert[] = [];
  private db: IDBDatabase | null = null;
  private isInitialized = false;
  
  // Cache implementation
  private documentCache = new Map<string, CachedDocument>();
  private operationCache = new Map<string, CachedOperation>();
  private cacheMetrics: CacheMetrics = {
    hitRate: 0,
    missRate: 0,
    totalRequests: 0,
    cacheSize: 0,
    evictions: 0
  };
  
  // Measurement tracking
  private latencyMeasurements: number[] = [];
  private operationTimestamps: number[] = [];
  private sessionStartTimes = new Map<string, number>();
  private bytesTransferred = 0;
  private operationCount = 0;
  
  // Thresholds for alerts
  private readonly thresholds = {
    latency: {
      medium: 100, // ms
      high: 250,
      critical: 500
    },
    conflictResolution: {
      medium: 50, // ms
      high: 100,
      critical: 200
    },
    failureRate: {
      medium: 0.05, // 5%
      high: 0.1,
      critical: 0.2
    },
    networkSavings: {
      low: 0.2, // 20%
      medium: 0.5,
      high: 0.8
    }
  };

  constructor() {
    this.metrics = this.initializeMetrics();
    this.initializeIndexedDB();
  }

  private initializeMetrics(): CollaborationPerformanceMetrics {
    return {
      averageLatency: 0,
      operationsPerSecond: 0,
      batchEfficiency: 0,
      networkSavings: 0,
      conflictResolutionTime: 0,
      activeUsers: 0,
      averageSessionDuration: 0,
      totalSessions: 0,
      concurrentEditors: 0,
      bytesTransferred: 0,
      compressionRatio: 0,
      updateFrequency: 0,
      failureRate: 0,
      collaborationScore: 100,
      userExperienceIndex: 100,
      lastUpdated: new Date(),
      measurementPeriod: 60, // 1 minute
      reportId: this.generateReportId()
    };
  }

  // Initialize IndexedDB for local caching
  private async initializeIndexedDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('CollaborationCache', 1);
      
      request.onerror = () => {
        console.error('Failed to open IndexedDB');
        reject(request.error);
      };
      
      request.onsuccess = () => {
        this.db = request.result;
        this.isInitialized = true;
        console.log('IndexedDB initialized for collaboration caching');
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create object stores
        if (!db.objectStoreNames.contains('documents')) {
          const documentStore = db.createObjectStore('documents', { keyPath: 'id' });
          documentStore.createIndex('articleId', 'articleId', { unique: false });
          documentStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
        
        if (!db.objectStoreNames.contains('operations')) {
          const operationStore = db.createObjectStore('operations', { keyPath: 'id' });
          operationStore.createIndex('articleId', 'articleId', { unique: false });
          operationStore.createIndex('timestamp', 'timestamp', { unique: false });
          operationStore.createIndex('batchId', 'batchId', { unique: false });
        }
        
        if (!db.objectStoreNames.contains('metrics')) {
          db.createObjectStore('metrics', { keyPath: 'id' });
        }
      };
    });
  }

  // Performance measurement methods
  startLatencyMeasurement(): string {
    const measurementId = `lat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    performance.mark(`latency_start_${measurementId}`);
    return measurementId;
  }

  endLatencyMeasurement(measurementId: string): number {
    const startMark = `latency_start_${measurementId}`;
    const endMark = `latency_end_${measurementId}`;
    
    performance.mark(endMark);
    performance.measure(`latency_${measurementId}`, startMark, endMark);
    
    const entries = performance.getEntriesByName(`latency_${measurementId}`);
    if (entries.length > 0) {
      const latency = entries[0].duration;
      this.recordLatency(latency);
      
      // Clean up performance marks
      performance.clearMarks(startMark);
      performance.clearMarks(endMark);
      performance.clearMeasures(`latency_${measurementId}`);
      
      return latency;
    }
    
    return 0;
  }

  recordLatency(latency: number): void {
    this.latencyMeasurements.push(latency);
    
    // Keep only recent measurements (last 100)
    if (this.latencyMeasurements.length > 100) {
      this.latencyMeasurements = this.latencyMeasurements.slice(-100);
    }
    
    // Update average latency
    this.metrics.averageLatency = this.latencyMeasurements.reduce((sum, lat) => sum + lat, 0) / this.latencyMeasurements.length;
    
    // Check for latency alerts
    this.checkLatencyAlerts(latency);
  }

  recordOperation(operationType: string, bytesTransferred: number = 0): void {
    const now = Date.now();
    this.operationTimestamps.push(now);
    this.operationCount++;
    this.bytesTransferred += bytesTransferred;
    
    // Keep only recent operations (last 60 seconds)
    const cutoff = now - 60000;
    this.operationTimestamps = this.operationTimestamps.filter(timestamp => timestamp > cutoff);
    
    // Update operations per second
    this.metrics.operationsPerSecond = this.operationTimestamps.length;
    this.metrics.bytesTransferred = this.bytesTransferred;
  }

  recordBatchOperation(operationsInBatch: number, processingTime: number): void {
    // Update batch efficiency
    const efficiency = operationsInBatch / processingTime;
    this.metrics.batchEfficiency = this.metrics.batchEfficiency * 0.9 + efficiency * 0.1;
    
    // Calculate network savings
    const potentialRequests = operationsInBatch;
    const actualRequests = 1; // One batched request
    const savings = (potentialRequests - actualRequests) / potentialRequests;
    this.metrics.networkSavings = this.metrics.networkSavings * 0.9 + savings * 0.1;
  }

  recordConflictResolution(resolutionTime: number): void {
    // Update conflict resolution time with exponential moving average
    this.metrics.conflictResolutionTime = this.metrics.conflictResolutionTime * 0.8 + resolutionTime * 0.2;
    
    // Check for conflict resolution alerts
    this.checkConflictResolutionAlerts(resolutionTime);
  }

  recordUserSession(userId: string, action: 'join' | 'leave'): void {
    const now = Date.now();
    
    if (action === 'join') {
      this.sessionStartTimes.set(userId, now);
      this.metrics.activeUsers++;
      this.metrics.totalSessions++;
    } else if (action === 'leave') {
      const startTime = this.sessionStartTimes.get(userId);
      if (startTime) {
        const sessionDuration = now - startTime;
        // Update average session duration
        this.metrics.averageSessionDuration = this.metrics.averageSessionDuration * 0.9 + sessionDuration * 0.1;
        this.sessionStartTimes.delete(userId);
      }
      this.metrics.activeUsers = Math.max(0, this.metrics.activeUsers - 1);
    }
    
    // Update concurrent editors (users actively editing)
    this.updateConcurrentEditors();
  }

  // Cache management methods
  async cacheDocument(document: Omit<CachedDocument, 'timestamp'>): Promise<void> {
    const cachedDoc: CachedDocument = {
      ...document,
      timestamp: Date.now()
    };
    
    // Add to memory cache
    this.documentCache.set(document.id, cachedDoc);
    
    // Add to IndexedDB
    if (this.db) {
      try {
        const transaction = this.db.transaction(['documents'], 'readwrite');
        const store = transaction.objectStore('documents');
        await store.put(cachedDoc);
        
        this.cacheMetrics.cacheSize++;
      } catch (error) {
        console.error('Failed to cache document:', error);
      }
    }
    
    // Trigger cache cleanup if needed
    await this.cleanupCache();
  }

  async getCachedDocument(documentId: string): Promise<CachedDocument | null> {
    this.cacheMetrics.totalRequests++;
    
    // Check memory cache first
    const memoryDoc = this.documentCache.get(documentId);
    if (memoryDoc) {
      this.cacheMetrics.hitRate = (this.cacheMetrics.hitRate * (this.cacheMetrics.totalRequests - 1) + 1) / this.cacheMetrics.totalRequests;
      return memoryDoc;
    }
    
    // Check IndexedDB
    if (this.db) {
      try {
        const transaction = this.db.transaction(['documents'], 'readonly');
        const store = transaction.objectStore('documents');
        const request = store.get(documentId);
        
        return new Promise((resolve) => {
          request.onsuccess = () => {
            const doc = request.result;
            if (doc) {
              // Add to memory cache for faster access
              this.documentCache.set(documentId, doc);
              this.cacheMetrics.hitRate = (this.cacheMetrics.hitRate * (this.cacheMetrics.totalRequests - 1) + 1) / this.cacheMetrics.totalRequests;
              resolve(doc);
            } else {
              this.cacheMetrics.missRate = (this.cacheMetrics.missRate * (this.cacheMetrics.totalRequests - 1) + 1) / this.cacheMetrics.totalRequests;
              resolve(null);
            }
          };
          
          request.onerror = () => {
            this.cacheMetrics.missRate = (this.cacheMetrics.missRate * (this.cacheMetrics.totalRequests - 1) + 1) / this.cacheMetrics.totalRequests;
            resolve(null);
          };
        });
      } catch (error) {
        console.error('Failed to get cached document:', error);
        this.cacheMetrics.missRate = (this.cacheMetrics.missRate * (this.cacheMetrics.totalRequests - 1) + 1) / this.cacheMetrics.totalRequests;
        return null;
      }
    }
    
    this.cacheMetrics.missRate = (this.cacheMetrics.missRate * (this.cacheMetrics.totalRequests - 1) + 1) / this.cacheMetrics.totalRequests;
    return null;
  }

  private async cleanupCache(): Promise<void> {
    const maxCacheSize = 100; // Maximum number of cached documents
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    const now = Date.now();
    
    // Cleanup memory cache
    if (this.documentCache.size > maxCacheSize) {
      // Sort by timestamp and remove oldest
      const entries = Array.from(this.documentCache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      const toRemove = entries.slice(0, entries.length - maxCacheSize);
      toRemove.forEach(([id]) => {
        this.documentCache.delete(id);
        this.cacheMetrics.evictions++;
      });
    }
    
    // Cleanup IndexedDB
    if (this.db) {
      try {
        const transaction = this.db.transaction(['documents'], 'readwrite');
        const store = transaction.objectStore('documents');
        const index = store.index('timestamp');
        
        const range = IDBKeyRange.upperBound(now - maxAge);
        const request = index.openCursor(range);
        
        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest).result;
          if (cursor) {
            cursor.delete();
            this.cacheMetrics.evictions++;
            cursor.continue();
          }
        };
      } catch (error) {
        console.error('Failed to cleanup IndexedDB cache:', error);
      }
    }
  }

  // Alert system methods
  private checkLatencyAlerts(latency: number): void {
    let severity: PerformanceAlert['severity'] | null = null;
    
    if (latency > this.thresholds.latency.critical) {
      severity = 'critical';
    } else if (latency > this.thresholds.latency.high) {
      severity = 'high';
    } else if (latency > this.thresholds.latency.medium) {
      severity = 'medium';
    }
    
    if (severity) {
      this.createAlert('latency', severity, `High collaboration latency detected: ${latency.toFixed(2)}ms`);
    }
  }

  private checkConflictResolutionAlerts(resolutionTime: number): void {
    let severity: PerformanceAlert['severity'] | null = null;
    
    if (resolutionTime > this.thresholds.conflictResolution.critical) {
      severity = 'critical';
    } else if (resolutionTime > this.thresholds.conflictResolution.high) {
      severity = 'high';
    } else if (resolutionTime > this.thresholds.conflictResolution.medium) {
      severity = 'medium';
    }
    
    if (severity) {
      this.createAlert('conflict', severity, `Slow conflict resolution: ${resolutionTime.toFixed(2)}ms`);
    }
  }

  private createAlert(
    type: PerformanceAlert['type'],
    severity: PerformanceAlert['severity'],
    message: string
  ): void {
    const alert: PerformanceAlert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      severity,
      message,
      timestamp: new Date(),
      metrics: { ...this.metrics },
      resolved: false
    };
    
    this.alerts.push(alert);
    
    // Keep only recent alerts (last 50)
    if (this.alerts.length > 50) {
      this.alerts = this.alerts.slice(-50);
    }
    
    console.warn(`Performance Alert [${severity.toUpperCase()}]:`, message);
  }

  // Calculate composite scores
  private updateConcurrentEditors(): void {
    // This would typically be determined by tracking active editing states
    // For now, approximate as 70% of active users
    this.metrics.concurrentEditors = Math.floor(this.metrics.activeUsers * 0.7);
  }

  private calculateCollaborationScore(): number {
    // Weighted score based on multiple factors
    const latencyScore = Math.max(0, 100 - (this.metrics.averageLatency / 10));
    const efficiencyScore = Math.min(100, this.metrics.batchEfficiency * 10);
    const networkScore = this.metrics.networkSavings * 100;
    const conflictScore = Math.max(0, 100 - (this.metrics.conflictResolutionTime / 5));
    
    return (latencyScore * 0.3 + efficiencyScore * 0.2 + networkScore * 0.3 + conflictScore * 0.2);
  }

  private calculateUserExperienceIndex(): number {
    // UX score based on user-facing metrics
    const responsiveness = Math.max(0, 100 - (this.metrics.averageLatency / 5));
    const reliability = Math.max(0, 100 - (this.metrics.failureRate * 500));
    const efficiency = Math.min(100, this.metrics.operationsPerSecond * 2);
    
    return (responsiveness * 0.5 + reliability * 0.3 + efficiency * 0.2);
  }

  // Public API methods
  getMetrics(): CollaborationPerformanceMetrics {
    // Update composite scores before returning
    this.metrics.collaborationScore = this.calculateCollaborationScore();
    this.metrics.userExperienceIndex = this.calculateUserExperienceIndex();
    this.metrics.lastUpdated = new Date();
    
    return { ...this.metrics };
  }

  getCacheMetrics(): CacheMetrics {
    return { ...this.cacheMetrics };
  }

  getAlerts(unresolved = false): PerformanceAlert[] {
    return unresolved ? this.alerts.filter(alert => !alert.resolved) : [...this.alerts];
  }

  resolveAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.resolved = true;
      return true;
    }
    return false;
  }

  exportMetrics(): string {
    return JSON.stringify({
      metrics: this.getMetrics(),
      cacheMetrics: this.getCacheMetrics(),
      alerts: this.getAlerts(),
      exportTimestamp: new Date().toISOString(),
      reportId: this.metrics.reportId
    }, null, 2);
  }

  reset(): void {
    this.metrics = this.initializeMetrics();
    this.alerts = [];
    this.latencyMeasurements = [];
    this.operationTimestamps = [];
    this.sessionStartTimes.clear();
    this.documentCache.clear();
    this.operationCache.clear();
    this.cacheMetrics = {
      hitRate: 0,
      missRate: 0,
      totalRequests: 0,
      cacheSize: 0,
      evictions: 0
    };
    this.bytesTransferred = 0;
    this.operationCount = 0;
  }

  private generateReportId(): string {
    return `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Cleanup method
  cleanup(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
    this.reset();
  }
}

// Global instance for easy access
export const collaborationPerformanceMonitor = new CollaborationPerformanceMonitor(); 