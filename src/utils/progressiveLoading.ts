export interface ProgressiveLoadingOptions {
  enableSkeletonScreens?: boolean;
  prioritizeAboveFold?: boolean;
  deferSecondaryContent?: boolean;
  loadingDelay?: number;
  chunkSize?: number;
}

export interface ContentChunk {
  id: string;
  element: HTMLElement;
  priority: 'critical' | 'high' | 'medium' | 'low';
  loaded: boolean;
  type: 'article-content' | 'comments' | 'metadata' | 'navigation' | 'toolbar';
}

// Priority-based content loading system
export class ProgressiveLoader {
  private options: ProgressiveLoadingOptions;
  private contentChunks: Map<string, ContentChunk> = new Map();
  private loadQueue: ContentChunk[] = [];
  private isLoading = false;
  private loadedCount = 0;

  constructor(options: ProgressiveLoadingOptions = {}) {
    this.options = {
      enableSkeletonScreens: true,
      prioritizeAboveFold: true,
      deferSecondaryContent: true,
      loadingDelay: 16, // 1 frame
      chunkSize: 3, // Load 3 chunks at a time
      ...options
    };
  }

  // Register content chunks with priorities
  registerChunk(
    id: string, 
    element: HTMLElement, 
    type: ContentChunk['type'], 
    priority: ContentChunk['priority'] = 'medium'
  ): void {
    const chunk: ContentChunk = {
      id,
      element,
      priority,
      type,
      loaded: false
    };

    this.contentChunks.set(id, chunk);
    this.loadQueue.push(chunk);
    
    // Sort queue by priority
    this.sortLoadQueue();
    
    // Show skeleton if enabled
    if (this.options.enableSkeletonScreens) {
      this.showSkeleton(element, type);
    }
  }

  // Sort load queue by priority and viewport position
  private sortLoadQueue(): void {
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    
    this.loadQueue.sort((a, b) => {
      // First sort by priority
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      
      // Then by viewport position if enabled
      if (this.options.prioritizeAboveFold) {
        const aTop = a.element.getBoundingClientRect().top;
        const bTop = b.element.getBoundingClientRect().top;
        const viewportHeight = window.innerHeight;
        
        const aInView = aTop < viewportHeight;
        const bInView = bTop < viewportHeight;
        
        if (aInView && !bInView) return -1;
        if (!aInView && bInView) return 1;
        if (aInView && bInView) return aTop - bTop;
      }
      
      return 0;
    });
  }

  // Start progressive loading
  async startLoading(): Promise<void> {
    if (this.isLoading) return;
    this.isLoading = true;

    try {
      // Load critical content first
      await this.loadCriticalContent();
      
      // Then load other content progressively
      await this.loadRemainingContent();
      
    } catch (error) {
      console.error('Progressive loading failed:', error);
    } finally {
      this.isLoading = false;
    }
  }

  // Load critical content immediately
  private async loadCriticalContent(): Promise<void> {
    const criticalChunks = this.loadQueue.filter(chunk => 
      chunk.priority === 'critical' && !chunk.loaded
    );

    for (const chunk of criticalChunks) {
      await this.loadChunk(chunk);
    }
  }

  // Load remaining content in chunks
  private async loadRemainingContent(): Promise<void> {
    const remainingChunks = this.loadQueue.filter(chunk => 
      chunk.priority !== 'critical' && !chunk.loaded
    );

    for (let i = 0; i < remainingChunks.length; i += this.options.chunkSize!) {
      const chunkBatch = remainingChunks.slice(i, i + this.options.chunkSize!);
      
      // Load chunks in parallel within each batch
      const loadPromises = chunkBatch.map(chunk => this.loadChunk(chunk));
      await Promise.all(loadPromises);
      
      // Add delay between batches to avoid blocking the UI
      if (i + this.options.chunkSize! < remainingChunks.length) {
        await this.delay(this.options.loadingDelay!);
      }
    }
  }

  // Load a single content chunk
  private async loadChunk(chunk: ContentChunk): Promise<void> {
    if (chunk.loaded) return;

    try {
      // Simulate loading based on chunk type
      await this.loadChunkContent(chunk);
      
      // Hide skeleton
      this.hideSkeleton(chunk.element);
      
      // Show content with animation
      this.showContent(chunk.element);
      
      chunk.loaded = true;
      this.loadedCount++;
      
      // Emit progress event
      this.emitProgressEvent(this.loadedCount, this.contentChunks.size);
      
    } catch (error) {
      console.error(`Failed to load chunk ${chunk.id}:`, error);
      this.showErrorState(chunk.element);
    }
  }

  // Load content based on chunk type
  private async loadChunkContent(chunk: ContentChunk): Promise<void> {
    switch (chunk.type) {
      case 'article-content':
        return this.loadArticleContent(chunk);
      case 'comments':
        return this.loadComments(chunk);
      case 'metadata':
        return this.loadMetadata(chunk);
      case 'navigation':
        return this.loadNavigation(chunk);
      case 'toolbar':
        return this.loadToolbar(chunk);
    }
  }

  // Load article content chunk
  private async loadArticleContent(chunk: ContentChunk): Promise<void> {
    const element = chunk.element;
    const contentData = element.getAttribute('data-content-id');
    
    if (contentData) {
      // Simulate content loading with proper delay
      await this.delay(100);
      
      // If content is already in the DOM but hidden, just show it
      const hiddenContent = element.querySelector('[data-hidden-content]');
      if (hiddenContent) {
        (hiddenContent as HTMLElement).style.display = 'block';
      }
    }
  }

  // Load comments chunk
  private async loadComments(chunk: ContentChunk): Promise<void> {
    // Defer comments loading if option is enabled
    if (this.options.deferSecondaryContent) {
      await this.delay(500);
    }
    
    // Load comments component
    const commentsContainer = chunk.element;
    if (commentsContainer.getAttribute('data-defer-comments') === 'true') {
      // Trigger comment loading
      commentsContainer.dispatchEvent(new CustomEvent('loadComments'));
    }
  }

  // Load metadata chunk
  private async loadMetadata(chunk: ContentChunk): Promise<void> {
    await this.delay(50);
    
    const metadataContainer = chunk.element;
    const hiddenMetadata = metadataContainer.querySelector('[data-metadata]');
    if (hiddenMetadata) {
      (hiddenMetadata as HTMLElement).style.display = 'block';
    }
  }

  // Load navigation chunk
  private async loadNavigation(chunk: ContentChunk): Promise<void> {
    await this.delay(25);
    
    // Navigation is typically already loaded, just show it
    chunk.element.style.visibility = 'visible';
  }

  // Load toolbar chunk
  private async loadToolbar(chunk: ContentChunk): Promise<void> {
    await this.delay(75);
    
    // Load toolbar components progressively
    const toolbarSections = chunk.element.querySelectorAll('[data-toolbar-section]');
    for (const section of toolbarSections) {
      (section as HTMLElement).style.display = 'flex';
      await this.delay(10);
    }
  }

  // Show skeleton loader
  private showSkeleton(element: HTMLElement, type: ContentChunk['type']): void {
    const skeleton = document.createElement('div');
    skeleton.className = `skeleton skeleton-${type}`;
    
    // Different skeleton styles for different content types
    const skeletonStyles = this.getSkeletonStyles(type);
    skeleton.style.cssText = skeletonStyles;
    
    element.appendChild(skeleton);
    element.classList.add('progressive-loading');
  }

  // Hide skeleton loader
  private hideSkeleton(element: HTMLElement): void {
    const skeleton = element.querySelector('.skeleton');
    if (skeleton) {
      skeleton.remove();
    }
  }

  // Show content with animation
  private showContent(element: HTMLElement): void {
    element.classList.remove('progressive-loading');
    element.classList.add('progressive-loaded');
    
    // Add CSS transition
    element.style.transition = 'opacity 300ms ease-out, transform 300ms ease-out';
    element.style.opacity = '1';
    element.style.transform = 'translateY(0)';
  }

  // Show error state
  private showErrorState(element: HTMLElement): void {
    this.hideSkeleton(element);
    element.classList.add('progressive-error');
    
    const errorElement = document.createElement('div');
    errorElement.className = 'progressive-error-message';
    errorElement.textContent = 'Failed to load content';
    element.appendChild(errorElement);
  }

  // Get skeleton styles for different content types
  private getSkeletonStyles(type: ContentChunk['type']): string {
    const baseStyles = `
      background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
      background-size: 200% 100%;
      animation: skeletonLoading 1.5s infinite;
      border-radius: 4px;
    `;

    switch (type) {
      case 'article-content':
        return `${baseStyles} height: 400px; margin: 16px 0;`;
      case 'comments':
        return `${baseStyles} height: 200px; margin: 8px 0;`;
      case 'metadata':
        return `${baseStyles} height: 80px; margin: 8px 0;`;
      case 'navigation':
        return `${baseStyles} height: 60px; margin: 4px 0;`;
      case 'toolbar':
        return `${baseStyles} height: 48px; margin: 4px 0;`;
      default:
        return `${baseStyles} height: 100px; margin: 8px 0;`;
    }
  }

  // Emit progress events
  private emitProgressEvent(loaded: number, total: number): void {
    const progressEvent = new CustomEvent('progressiveLoadingProgress', {
      detail: {
        loaded,
        total,
        percentage: Math.round((loaded / total) * 100)
      }
    });
    
    document.dispatchEvent(progressEvent);
  }

  // Utility delay function
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Get loading progress
  getProgress(): { loaded: number; total: number; percentage: number } {
    return {
      loaded: this.loadedCount,
      total: this.contentChunks.size,
      percentage: Math.round((this.loadedCount / this.contentChunks.size) * 100)
    };
  }

  // Force load all remaining content
  async forceLoadAll(): Promise<void> {
    const unloadedChunks = this.loadQueue.filter(chunk => !chunk.loaded);
    const loadPromises = unloadedChunks.map(chunk => this.loadChunk(chunk));
    await Promise.all(loadPromises);
  }

  // Reset the loader
  reset(): void {
    this.contentChunks.clear();
    this.loadQueue = [];
    this.isLoading = false;
    this.loadedCount = 0;
  }
}

// Initialize progressive loading CSS if not already present
export function initializeProgressiveLoadingStyles(): void {
  if (document.querySelector('#progressive-loading-styles')) return;

  const style = document.createElement('style');
  style.id = 'progressive-loading-styles';
  style.textContent = `
    @keyframes skeletonLoading {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }
    
    .progressive-loading {
      opacity: 0.7;
    }
    
    .progressive-loaded {
      animation: progressiveFadeIn 300ms ease-out;
    }
    
    @keyframes progressiveFadeIn {
      from { 
        opacity: 0; 
        transform: translateY(10px); 
      }
      to { 
        opacity: 1; 
        transform: translateY(0); 
      }
    }
    
    .progressive-error {
      border: 1px solid #fecaca;
      background-color: #fef2f2;
      border-radius: 4px;
      padding: 16px;
    }
    
    .progressive-error-message {
      color: #dc2626;
      font-size: 14px;
      text-align: center;
    }
    
    .skeleton {
      border-radius: 4px;
    }
    
    .skeleton-article-content {
      min-height: 400px;
    }
    
    .skeleton-comments {
      min-height: 200px;
    }
    
    .skeleton-metadata {
      min-height: 80px;
    }
    
    .skeleton-navigation {
      min-height: 60px;
    }
    
    .skeleton-toolbar {
      min-height: 48px;
    }
  `;
  
  document.head.appendChild(style);
}

// Auto-detect and set up progressive loading for common content patterns
export function autoSetupProgressiveLoading(container: HTMLElement): ProgressiveLoader {
  const loader = new ProgressiveLoader();
  
  // Initialize styles
  initializeProgressiveLoadingStyles();
  
  // Register common content chunks
  
  // Article content (critical)
  const articleContent = container.querySelector('[data-article-content]');
  if (articleContent) {
    loader.registerChunk('article-content', articleContent as HTMLElement, 'article-content', 'critical');
  }
  
  // Navigation (high priority)
  const navigation = container.querySelector('[data-navigation]');
  if (navigation) {
    loader.registerChunk('navigation', navigation as HTMLElement, 'navigation', 'high');
  }
  
  // Toolbar (high priority)
  const toolbar = container.querySelector('[data-toolbar]');
  if (toolbar) {
    loader.registerChunk('toolbar', toolbar as HTMLElement, 'toolbar', 'high');
  }
  
  // Metadata (medium priority)
  const metadata = container.querySelector('[data-metadata]');
  if (metadata) {
    loader.registerChunk('metadata', metadata as HTMLElement, 'metadata', 'medium');
  }
  
  // Comments (low priority - deferred)
  const comments = container.querySelector('[data-comments]');
  if (comments) {
    loader.registerChunk('comments', comments as HTMLElement, 'comments', 'low');
  }
  
  return loader;
}

// Global instance for convenience
export const globalProgressiveLoader = new ProgressiveLoader(); 