export interface LazyImageOptions {
  lowQualityPlaceholder?: string;
  enableBlurUp?: boolean;
  rootMargin?: string;
  threshold?: number;
  fadeInDuration?: number;
}

export interface LazyContentOptions {
  rootMargin?: string;
  threshold?: number;
  enableSkeleton?: boolean;
  skeletonHeight?: string;
}

// Create a low-quality placeholder for images
export function createLowQualityPlaceholder(width: number, height: number, color = '#f0f0f0'): string {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  
  if (ctx) {
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, width, height);
    
    // Add a subtle gradient for visual interest
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, 'rgba(255,255,255,0.1)');
    gradient.addColorStop(1, 'rgba(0,0,0,0.1)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }
  
  return canvas.toDataURL('image/jpeg', 0.1);
}

// Lazy load images with progressive enhancement
export class LazyImageLoader {
  private observer: IntersectionObserver;
  private options: LazyImageOptions;

  constructor(options: LazyImageOptions = {}) {
    this.options = {
      rootMargin: '50px',
      threshold: 0.1,
      enableBlurUp: true,
      fadeInDuration: 300,
      ...options
    };

    this.observer = new IntersectionObserver(
      this.handleIntersection.bind(this),
      {
        rootMargin: this.options.rootMargin,
        threshold: this.options.threshold
      }
    );
  }

  private handleIntersection(entries: IntersectionObserverEntry[]) {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target as HTMLImageElement;
        this.loadImage(img);
        this.observer.unobserve(img);
      }
    });
  }

  private async loadImage(img: HTMLImageElement): Promise<void> {
    const dataSrc = img.getAttribute('data-src');
    if (!dataSrc) return;

    // Create a new image element to preload
    const imageLoader = new Image();
    
    return new Promise((resolve, reject) => {
      imageLoader.onload = () => {
        // Apply blur-up effect if enabled
        if (this.options.enableBlurUp) {
          img.style.filter = 'blur(5px)';
          img.style.transition = `filter ${this.options.fadeInDuration}ms ease-out`;
        }

        // Set the actual source
        img.src = dataSrc;
        img.removeAttribute('data-src');

        // Remove blur effect after image loads
        if (this.options.enableBlurUp) {
          setTimeout(() => {
            img.style.filter = 'none';
          }, 50);
        }

        // Add fade-in effect
        img.style.opacity = '0';
        img.style.transition = `opacity ${this.options.fadeInDuration}ms ease-out`;
        
        requestAnimationFrame(() => {
          img.style.opacity = '1';
        });

        img.classList.add('lazy-loaded');
        resolve();
      };

      imageLoader.onerror = reject;
      imageLoader.src = dataSrc;
    });
  }

  // Observe an image element for lazy loading
  observe(img: HTMLImageElement): void {
    // Set up initial placeholder if not already set
    if (!img.src && !this.options.lowQualityPlaceholder) {
      const rect = img.getBoundingClientRect();
      const placeholder = createLowQualityPlaceholder(
        rect.width || 300, 
        rect.height || 200
      );
      img.src = placeholder;
    } else if (this.options.lowQualityPlaceholder) {
      img.src = this.options.lowQualityPlaceholder;
    }

    // Add loading attribute for modern browsers
    img.loading = 'lazy';
    
    // Add CSS classes for styling
    img.classList.add('lazy-image');
    
    this.observer.observe(img);
  }

  // Observe all images within a container
  observeAll(container: HTMLElement): void {
    const images = container.querySelectorAll('img[data-src]');
    images.forEach(img => this.observe(img as HTMLImageElement));
  }

  // Cleanup
  disconnect(): void {
    this.observer.disconnect();
  }
}

// Lazy load embedded content (comments, collaboration features, etc.)
export class LazyContentLoader {
  private observer: IntersectionObserver;
  private options: LazyContentOptions;
  private loadedComponents = new Set<string>();

  constructor(options: LazyContentOptions = {}) {
    this.options = {
      rootMargin: '100px',
      threshold: 0.1,
      enableSkeleton: true,
      skeletonHeight: '200px',
      ...options
    };

    this.observer = new IntersectionObserver(
      this.handleIntersection.bind(this),
      {
        rootMargin: this.options.rootMargin,
        threshold: this.options.threshold
      }
    );
  }

  private handleIntersection(entries: IntersectionObserverEntry[]) {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const element = entry.target as HTMLElement;
        const componentType = element.getAttribute('data-component');
        
        if (componentType && !this.loadedComponents.has(componentType)) {
          this.loadComponent(element, componentType);
          this.loadedComponents.add(componentType);
        }
        
        this.observer.unobserve(element);
      }
    });
  }

  private async loadComponent(element: HTMLElement, componentType: string): Promise<void> {
    // Show skeleton loader if enabled
    if (this.options.enableSkeleton) {
      this.showSkeleton(element);
    }

    try {
      // Dynamically import components based on type
      let ComponentModule;
      
      switch (componentType) {
        case 'commenting-system':
          ComponentModule = await import('../components/ui/CommentingSystem');
          break;
        case 'version-history':
          ComponentModule = await import('../components/ui/VersionHistoryButton');
          break;
        case 'collaborative-cursors':
          ComponentModule = await import('../components/ui/CollaborativeCursors');
          break;
        case 'admin-panel':
          ComponentModule = await import('../components/admin/AdminPanel');
          break;
        case 'table-context-menu':
          ComponentModule = await import('../components/ui/TableContextMenu');
          break;
        default:
          console.warn(`Unknown component type: ${componentType}`);
          return;
      }

      // Remove skeleton and show component
      this.hideSkeleton(element);
      element.classList.add('lazy-content-loaded');
      
      // Trigger custom event for component loading
      element.dispatchEvent(new CustomEvent('lazyComponentLoaded', {
        detail: { componentType, module: ComponentModule }
      }));

    } catch (error) {
      console.error(`Failed to load component ${componentType}:`, error);
      this.hideSkeleton(element);
      element.classList.add('lazy-content-error');
    }
  }

  private showSkeleton(element: HTMLElement): void {
    if (element.querySelector('.lazy-skeleton')) return;

    const skeleton = document.createElement('div');
    skeleton.className = 'lazy-skeleton';
    skeleton.style.cssText = `
      background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
      background-size: 200% 100%;
      animation: loading 1.5s infinite;
      height: ${this.options.skeletonHeight};
      border-radius: 4px;
    `;

    // Add animation keyframes if not already present
    if (!document.querySelector('#lazy-loading-styles')) {
      const style = document.createElement('style');
      style.id = 'lazy-loading-styles';
      style.textContent = `
        @keyframes loading {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        .lazy-skeleton {
          background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
          background-size: 200% 100%;
          animation: loading 1.5s infinite;
        }
        .lazy-image {
          transition: opacity 300ms ease-out;
        }
        .lazy-content-loaded {
          animation: fadeIn 300ms ease-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `;
      document.head.appendChild(style);
    }

    element.appendChild(skeleton);
  }

  private hideSkeleton(element: HTMLElement): void {
    const skeleton = element.querySelector('.lazy-skeleton');
    if (skeleton) {
      skeleton.remove();
    }
  }

  // Observe an element for lazy component loading
  observe(element: HTMLElement, componentType: string): void {
    element.setAttribute('data-component', componentType);
    element.classList.add('lazy-content');
    this.observer.observe(element);
  }

  // Preload a component without waiting for intersection
  async preload(componentType: string): Promise<void> {
    if (this.loadedComponents.has(componentType)) return;

    try {
      let ComponentModule;
      
      switch (componentType) {
        case 'commenting-system':
          ComponentModule = await import('../components/ui/CommentingSystem');
          break;
        case 'version-history':
          ComponentModule = await import('../components/ui/VersionHistoryButton');
          break;
        case 'collaborative-cursors':
          ComponentModule = await import('../components/ui/CollaborativeCursors');
          break;
        case 'admin-panel':
          ComponentModule = await import('../components/admin/AdminPanel');
          break;
        default:
          console.warn(`Unknown component type for preload: ${componentType}`);
          return;
      }

      this.loadedComponents.add(componentType);
      console.log(`Preloaded component: ${componentType}`);
      
    } catch (error) {
      console.error(`Failed to preload component ${componentType}:`, error);
    }
  }

  // Cleanup
  disconnect(): void {
    this.observer.disconnect();
    this.loadedComponents.clear();
  }
}

// Global instances for easy access
export const lazyImageLoader = new LazyImageLoader();
export const lazyContentLoader = new LazyContentLoader();

// Utility function to initialize lazy loading for an entire editor
export function initializeLazyLoading(editorContainer: HTMLElement): void {
  // Set up lazy image loading
  lazyImageLoader.observeAll(editorContainer);

  // Set up lazy content loading for collaboration features
  const commentingSections = editorContainer.querySelectorAll('[data-commenting]');
  commentingSections.forEach(section => {
    lazyContentLoader.observe(section as HTMLElement, 'commenting-system');
  });

  // Preload critical components based on user permissions
  const userRole = document.body.getAttribute('data-user-role');
  if (userRole === 'admin') {
    lazyContentLoader.preload('admin-panel');
  }
}

// Cleanup function
export function cleanupLazyLoading(): void {
  lazyImageLoader.disconnect();
  lazyContentLoader.disconnect();
} 