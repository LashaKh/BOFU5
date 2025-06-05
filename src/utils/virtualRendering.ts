import { performanceMonitor } from './performanceMonitor';

export interface VirtualRenderingConfig {
  // Enable content-visibility CSS optimization
  enableContentVisibility: boolean;
  // Virtual scrolling configuration
  enableVirtualScrolling: boolean;
  // Chunk size for document segmentation (in characters)
  chunkSize: number;
  // Buffer size (number of chunks to keep rendered around viewport)
  bufferSize: number;
  // Threshold for enabling virtualization (document size)
  virtualizationThreshold: number;
}

export interface DocumentChunk {
  id: string;
  startOffset: number;
  endOffset: number;
  content: string;
  isVisible: boolean;
  isRendered: boolean;
  element?: HTMLElement;
}

export class VirtualRendering {
  private config: VirtualRenderingConfig;
  private chunks: DocumentChunk[] = [];
  private observer?: IntersectionObserver;
  private resizeObserver?: ResizeObserver;
  private editorElement?: HTMLElement;
  private virtualContainer?: HTMLElement;

  constructor(config: Partial<VirtualRenderingConfig> = {}) {
    this.config = {
      enableContentVisibility: true,
      enableVirtualScrolling: false, // Disabled by default due to ProseMirror complexity
      chunkSize: 50000, // 50k characters per chunk
      bufferSize: 2, // Keep 2 chunks above and below viewport
      virtualizationThreshold: 100000, // Enable for docs > 100k characters
      ...config
    };
  }

  // Initialize virtual rendering for an editor element
  initialize(editorElement: HTMLElement): void {
    this.editorElement = editorElement;
    
    // Apply CSS content-visibility optimization
    if (this.config.enableContentVisibility) {
      this.applyContentVisibilityOptimization();
    }

    // Set up intersection observer for performance monitoring
    this.setupIntersectionObserver();

    // Set up resize observer for responsive adjustments
    this.setupResizeObserver();

    // Apply ProseMirror-specific optimizations
    this.applyProseMirrorOptimizations();

    console.log('Virtual rendering initialized for editor');
  }

  // Apply content-visibility CSS optimization
  private applyContentVisibilityOptimization(): void {
    if (!this.editorElement) return;

    // Apply to main editor container
    this.editorElement.style.contentVisibility = 'auto';
    this.editorElement.style.containIntrinsicSize = '1000px'; // Estimated height

    // Apply to large content blocks within the editor
    const applyToChildren = () => {
      const blocks = this.editorElement!.querySelectorAll('p, h1, h2, h3, h4, h5, h6, div, blockquote, pre');
      blocks.forEach((block) => {
        const element = block as HTMLElement;
        // Only apply to elements with significant content
        if (element.textContent && element.textContent.length > 1000) {
          element.style.contentVisibility = 'auto';
          element.style.containIntrinsicSize = 'auto 100px';
        }
      });
    };

    // Apply immediately and on content changes
    applyToChildren();

    // Re-apply when editor content changes
    const mutationObserver = new MutationObserver(() => {
      applyToChildren();
    });

    mutationObserver.observe(this.editorElement, {
      childList: true,
      subtree: true
    });
  }

  // Apply ProseMirror-specific optimizations
  private applyProseMirrorOptimizations(): void {
    if (!this.editorElement) return;

    // Optimize ProseMirror editor props for performance
    const proseMirrorEditor = this.editorElement.querySelector('.ProseMirror');
    if (proseMirrorEditor) {
      const element = proseMirrorEditor as HTMLElement;
      
      // Improve scroll performance
      element.style.willChange = 'scroll-position';
      element.style.overflowAnchor = 'none'; // Prevent scroll anchoring issues
      
      // Optimize for large content
      element.style.containIntrinsicSize = 'auto 500px';
      
      // Enable hardware acceleration for smooth scrolling
      element.style.transform = 'translateZ(0)';
      element.style.backfaceVisibility = 'hidden';
    }
  }

  // Set up intersection observer for viewport monitoring
  private setupIntersectionObserver(): void {
    if (!this.editorElement) return;

    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const element = entry.target as HTMLElement;
          
          if (entry.isIntersecting) {
            // Element is visible, ensure it's optimized for interaction
            element.style.pointerEvents = 'auto';
          } else {
            // Element is not visible, optimize for memory
            element.style.pointerEvents = 'none';
          }
        });

        // Record performance measurement
        if (this.editorElement) {
          performanceMonitor.recordMeasurement(this.editorElement);
        }
      },
      {
        root: null,
        rootMargin: '100px', // Start optimizing 100px before element comes into view
        threshold: 0.1
      }
    );

    // Observe large content blocks
    const observeChildren = () => {
      const blocks = this.editorElement!.querySelectorAll('p, h1, h2, h3, h4, h5, h6, div, blockquote, pre, table');
      blocks.forEach((block) => {
        if (block.textContent && block.textContent.length > 500) {
          this.observer!.observe(block);
        }
      });
    };

    observeChildren();

    // Re-observe when content changes
    const mutationObserver = new MutationObserver(() => {
      observeChildren();
    });

    mutationObserver.observe(this.editorElement, {
      childList: true,
      subtree: true
    });
  }

  // Set up resize observer for responsive performance adjustments
  private setupResizeObserver(): void {
    if (!this.editorElement) return;

    this.resizeObserver = new ResizeObserver((entries) => {
      entries.forEach((entry) => {
        const { width, height } = entry.contentRect;
        
        // Adjust performance settings based on viewport size
        if (width < 768) { // Mobile
          this.adjustForMobile();
        } else if (width < 1024) { // Tablet
          this.adjustForTablet();
        } else { // Desktop
          this.adjustForDesktop();
        }

        // Update intrinsic size estimates
        if (this.editorElement) {
          this.editorElement.style.containIntrinsicSize = `${width}px ${height}px`;
        }
      });
    });

    this.resizeObserver.observe(this.editorElement);
  }

  // Adjust performance settings for mobile devices
  private adjustForMobile(): void {
    if (!this.editorElement) return;

    // More aggressive optimization for mobile
    this.editorElement.style.willChange = 'scroll-position, transform';
    
    // Reduce render quality for better performance
    const proseMirror = this.editorElement.querySelector('.ProseMirror') as HTMLElement;
    if (proseMirror) {
      proseMirror.style.imageRendering = 'optimizeSpeed';
      proseMirror.style.textRendering = 'optimizeSpeed';
    }
  }

  // Adjust performance settings for tablet devices
  private adjustForTablet(): void {
    if (!this.editorElement) return;

    // Balanced optimization for tablet
    const proseMirror = this.editorElement.querySelector('.ProseMirror') as HTMLElement;
    if (proseMirror) {
      proseMirror.style.imageRendering = 'auto';
      proseMirror.style.textRendering = 'optimizeSpeed';
    }
  }

  // Adjust performance settings for desktop devices
  private adjustForDesktop(): void {
    if (!this.editorElement) return;

    // High quality for desktop
    const proseMirror = this.editorElement.querySelector('.ProseMirror') as HTMLElement;
    if (proseMirror) {
      proseMirror.style.imageRendering = 'auto';
      proseMirror.style.textRendering = 'optimizeLegibility';
    }
  }

  // Optimize for large document editing
  optimizeForLargeDocument(): void {
    if (!this.editorElement) return;

    // Disable expensive visual effects for large documents
    const proseMirror = this.editorElement.querySelector('.ProseMirror') as HTMLElement;
    if (proseMirror) {
      // Disable smooth scrolling for better performance
      proseMirror.style.scrollBehavior = 'auto';
      
      // Optimize pointer events
      proseMirror.style.pointerEvents = 'auto';
      
      // Enable content containment
      proseMirror.style.contain = 'layout style paint';
    }

    // Apply aggressive content-visibility
    const allElements = this.editorElement.querySelectorAll('*');
    allElements.forEach((element) => {
      const el = element as HTMLElement;
      if (el.textContent && el.textContent.length > 100) {
        el.style.contentVisibility = 'auto';
      }
    });
  }

  // Get performance recommendations based on document size
  getPerformanceRecommendations(documentSize: number): string[] {
    const recommendations: string[] = [];

    if (documentSize > this.config.virtualizationThreshold) {
      recommendations.push('Enable content-visibility optimization');
      recommendations.push('Consider breaking document into smaller sections');
    }

    if (documentSize > 500000) { // 500k characters
      recommendations.push('Enable aggressive performance mode');
      recommendations.push('Disable real-time collaboration for better performance');
    }

    if (documentSize > 1000000) { // 1M characters
      recommendations.push('Consider using virtual scrolling');
      recommendations.push('Implement lazy loading for embedded content');
    }

    return recommendations;
  }

  // Memory cleanup
  cleanup(): void {
    if (this.observer) {
      this.observer.disconnect();
    }

    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }

    this.chunks = [];
    this.editorElement = undefined;
    this.virtualContainer = undefined;
  }

  // Get current optimization status
  getOptimizationStatus() {
    return {
      contentVisibilityEnabled: this.config.enableContentVisibility,
      virtualScrollingEnabled: this.config.enableVirtualScrolling,
      chunksCount: this.chunks.length,
      observersActive: {
        intersection: !!this.observer,
        resize: !!this.resizeObserver
      }
    };
  }
}

// Export convenience instance
export const virtualRendering = new VirtualRendering(); 