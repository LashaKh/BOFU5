export interface PerformanceMetrics {
  documentSize: number;
  renderTime: number;
  memoryUsage: number;
  scrollPerformance: number;
  lastMeasurement: Date;
}

export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: PerformanceMetrics[] = [];
  private performanceObserver?: PerformanceObserver;

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  startMonitoring() {
    // Initialize Performance Observer for measuring render times
    if ('PerformanceObserver' in window) {
      this.performanceObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.name.includes('editor-render')) {
            this.recordRenderTime(entry.duration);
          }
        });
      });

      this.performanceObserver.observe({ entryTypes: ['measure'] });
    }
  }

  stopMonitoring() {
    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
    }
  }

  // Measure document size (character count and DOM nodes)
  measureDocumentSize(editorElement: HTMLElement): number {
    const textContent = editorElement.textContent || '';
    const domNodes = editorElement.querySelectorAll('*').length;
    return textContent.length + domNodes * 10; // Weight DOM nodes more heavily
  }

  // Measure memory usage (approximation using performance API)
  measureMemoryUsage(): number {
    if ('memory' in performance) {
      const memInfo = (performance as any).memory;
      return memInfo.usedJSHeapSize || 0;
    }
    return 0;
  }

  // Start measuring render time
  startRenderMeasure(measureId: string) {
    performance.mark(`editor-render-start-${measureId}`);
  }

  // End measuring render time
  endRenderMeasure(measureId: string) {
    const startMark = `editor-render-start-${measureId}`;
    const endMark = `editor-render-end-${measureId}`;
    const measureName = `editor-render-${measureId}`;
    
    performance.mark(endMark);
    performance.measure(measureName, startMark, endMark);
  }

  // Record render time manually
  recordRenderTime(duration: number) {
    const currentMetric = this.getCurrentMetric();
    if (currentMetric) {
      currentMetric.renderTime = duration;
    }
  }

  // Measure scroll performance using frame timing
  measureScrollPerformance(callback: () => void): Promise<number> {
    return new Promise((resolve) => {
      const startTime = performance.now();
      let frameCount = 0;
      let totalFrameTime = 0;

      const measureFrame = () => {
        const frameTime = performance.now();
        frameCount++;
        totalFrameTime += frameTime - startTime;

        if (frameCount < 10) {
          requestAnimationFrame(measureFrame);
        } else {
          const averageFrameTime = totalFrameTime / frameCount;
          resolve(averageFrameTime);
        }
      };

      callback();
      requestAnimationFrame(measureFrame);
    });
  }

  // Record a complete performance measurement
  recordMeasurement(editorElement: HTMLElement) {
    const measurement: PerformanceMetrics = {
      documentSize: this.measureDocumentSize(editorElement),
      renderTime: 0, // Will be updated by Performance Observer
      memoryUsage: this.measureMemoryUsage(),
      scrollPerformance: 0, // Will be measured separately
      lastMeasurement: new Date()
    };

    this.metrics.push(measurement);

    // Keep only last 100 measurements
    if (this.metrics.length > 100) {
      this.metrics = this.metrics.slice(-100);
    }
  }

  // Get current metric (latest one)
  getCurrentMetric(): PerformanceMetrics | null {
    return this.metrics.length > 0 ? this.metrics[this.metrics.length - 1] : null;
  }

  // Get performance statistics
  getStatistics() {
    if (this.metrics.length === 0) return null;

    const stats = {
      averageRenderTime: this.metrics.reduce((sum, m) => sum + m.renderTime, 0) / this.metrics.length,
      maxRenderTime: Math.max(...this.metrics.map(m => m.renderTime)),
      averageDocumentSize: this.metrics.reduce((sum, m) => sum + m.documentSize, 0) / this.metrics.length,
      maxDocumentSize: Math.max(...this.metrics.map(m => m.documentSize)),
      memoryTrend: this.calculateMemoryTrend(),
      measurementCount: this.metrics.length
    };

    return stats;
  }

  // Calculate memory usage trend
  private calculateMemoryTrend(): 'increasing' | 'stable' | 'decreasing' {
    if (this.metrics.length < 2) return 'stable';

    const recent = this.metrics.slice(-10);
    const oldest = recent[0].memoryUsage;
    const newest = recent[recent.length - 1].memoryUsage;
    
    const trend = (newest - oldest) / oldest;
    
    if (trend > 0.1) return 'increasing';
    if (trend < -0.1) return 'decreasing';
    return 'stable';
  }

  // Export performance data for analysis
  exportPerformanceData() {
    return {
      metrics: this.metrics,
      statistics: this.getStatistics(),
      timestamp: new Date().toISOString()
    };
  }

  // Log performance warnings
  checkPerformanceThresholds() {
    const current = this.getCurrentMetric();
    if (!current) return;

    const warnings: string[] = [];

    if (current.renderTime > 100) {
      warnings.push(`High render time: ${current.renderTime.toFixed(2)}ms`);
    }

    if (current.documentSize > 1000000) { // 1MB equivalent
      warnings.push(`Large document size: ${(current.documentSize / 1000).toFixed(0)}K units`);
    }

    const memoryTrend = this.calculateMemoryTrend();
    if (memoryTrend === 'increasing') {
      warnings.push('Memory usage is increasing');
    }

    if (warnings.length > 0) {
      console.warn('Performance warnings:', warnings);
    }

    return warnings;
  }
}

// Convenience function to get the singleton instance
export const performanceMonitor = PerformanceMonitor.getInstance(); 