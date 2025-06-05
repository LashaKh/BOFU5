import { useEffect, useRef, useCallback, useState } from 'react';
import { Editor } from '@tiptap/react';
import { 
  lazyImageLoader, 
  lazyContentLoader, 
  initializeLazyLoading,
  cleanupLazyLoading 
} from '../utils/lazyLoading';
import { 
  ProgressiveLoader, 
  autoSetupProgressiveLoading,
  initializeProgressiveLoadingStyles 
} from '../utils/progressiveLoading';

interface UseAssetOptimizationOptions {
  editor?: Editor | null;
  enableLazyImages?: boolean;
  enableLazyComponents?: boolean;
  enableProgressiveLoading?: boolean;
  preloadAdminFeatures?: boolean;
  deferComments?: boolean;
  optimizeForMobile?: boolean;
}

interface AssetOptimizationState {
  imagesLoaded: number;
  totalImages: number;
  componentsLoaded: number;
  totalComponents: number;
  progressiveLoadingProgress: number;
  isOptimized: boolean;
}

export const useAssetOptimization = (
  options: UseAssetOptimizationOptions = {}
) => {
  const {
    editor,
    enableLazyImages = true,
    enableLazyComponents = true,
    enableProgressiveLoading = true,
    preloadAdminFeatures = false,
    deferComments = true,
    optimizeForMobile = true
  } = options;

  const editorContainerRef = useRef<HTMLElement | null>(null);
  const progressiveLoaderRef = useRef<ProgressiveLoader | null>(null);
  const isInitializedRef = useRef(false);

  const [state, setState] = useState<AssetOptimizationState>({
    imagesLoaded: 0,
    totalImages: 0,
    componentsLoaded: 0,
    totalComponents: 0,
    progressiveLoadingProgress: 0,
    isOptimized: false
  });

  // Initialize asset optimization when editor is ready
  useEffect(() => {
    if (!editor || isInitializedRef.current) return;

    const editorDom = editor.view.dom;
    const editorContainer = editorDom.closest('.border') as HTMLElement;
    
    if (editorContainer) {
      editorContainerRef.current = editorContainer;
      initializeOptimizations(editorContainer);
      isInitializedRef.current = true;
    }

    return () => {
      cleanupOptimizations();
    };
  }, [editor]);

  // Initialize all optimization systems
  const initializeOptimizations = useCallback((container: HTMLElement) => {
    try {
      // Initialize progressive loading styles
      initializeProgressiveLoadingStyles();

      // Set up lazy image loading
      if (enableLazyImages) {
        setupLazyImageLoading(container);
      }

      // Set up lazy component loading
      if (enableLazyComponents) {
        setupLazyComponentLoading(container);
      }

      // Set up progressive loading
      if (enableProgressiveLoading) {
        setupProgressiveLoading(container);
      }

      // Mobile optimizations
      if (optimizeForMobile && isMobileDevice()) {
        applyMobileOptimizations(container);
      }

      // Preload admin features if needed
      if (preloadAdminFeatures) {
        preloadAdminComponents();
      }

      setState((prev: AssetOptimizationState) => ({ ...prev, isOptimized: true }));
      console.log('Asset optimization initialized successfully');

    } catch (error) {
      console.error('Failed to initialize asset optimization:', error);
    }
  }, [enableLazyImages, enableLazyComponents, enableProgressiveLoading, preloadAdminFeatures, optimizeForMobile]);

  // Set up lazy image loading
  const setupLazyImageLoading = useCallback((container: HTMLElement) => {
    // Initialize lazy loading for existing images
    initializeLazyLoading(container);

    // Set up observer for dynamically added images
    const imageObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node as HTMLElement;
              const images = element.querySelectorAll('img[data-src]');
              images.forEach(img => lazyImageLoader.observe(img as HTMLImageElement));
            }
          });
        }
      });
    });

    imageObserver.observe(container, {
      childList: true,
      subtree: true
    });

    // Track image loading progress
    const imageElements = container.querySelectorAll('img');
    setState((prev: AssetOptimizationState) => ({ ...prev, totalImages: imageElements.length }));

    // Listen for image load events
    const handleImageLoad = () => {
      setState((prev: AssetOptimizationState) => ({ ...prev, imagesLoaded: prev.imagesLoaded + 1 }));
    };

    imageElements.forEach(img => {
      if (img.complete) {
        handleImageLoad();
      } else {
        img.addEventListener('load', handleImageLoad, { once: true });
      }
    });

  }, []);

  // Set up lazy component loading
  const setupLazyComponentLoading = useCallback((container: HTMLElement) => {
    // Set up lazy loading for collaboration features
    const setupCollaborationLazyLoading = () => {
      const commentingSections = container.querySelectorAll('[data-commenting="true"]');
      commentingSections.forEach(section => {
        lazyContentLoader.observe(section as HTMLElement, 'commenting-system');
      });

      const versionHistorySections = container.querySelectorAll('[data-version-history="true"]');
      versionHistorySections.forEach(section => {
        lazyContentLoader.observe(section as HTMLElement, 'version-history');
      });

      const adminPanelTriggers = container.querySelectorAll('[data-admin-panel="true"]');
      adminPanelTriggers.forEach(trigger => {
        lazyContentLoader.observe(trigger as HTMLElement, 'admin-panel');
      });
    };

    setupCollaborationLazyLoading();

    // Listen for lazy component loading events
    const handleComponentLoad = (event: CustomEvent) => {
      const { componentType } = event.detail;
      console.log(`Lazy loaded component: ${componentType}`);
      setState((prev: AssetOptimizationState) => ({ ...prev, componentsLoaded: prev.componentsLoaded + 1 }));
    };

    container.addEventListener('lazyComponentLoaded', handleComponentLoad as EventListener);

    // Count total components that will be lazy loaded
    const lazyComponents = container.querySelectorAll('[data-component]');
    setState((prev: AssetOptimizationState) => ({ ...prev, totalComponents: lazyComponents.length }));

  }, []);

  // Set up progressive loading
  const setupProgressiveLoading = useCallback((container: HTMLElement) => {
    const loader = autoSetupProgressiveLoading(container);
    progressiveLoaderRef.current = loader;

    // Listen for progress events
    const handleProgressiveProgress = (event: CustomEvent) => {
      const { percentage } = event.detail;
      setState((prev: AssetOptimizationState) => ({ ...prev, progressiveLoadingProgress: percentage }));
    };

    document.addEventListener('progressiveLoadingProgress', handleProgressiveProgress as EventListener);

    // Start progressive loading
    loader.startLoading().catch(error => {
      console.error('Progressive loading failed:', error);
    });

  }, []);

  // Apply mobile-specific optimizations
  const applyMobileOptimizations = useCallback((container: HTMLElement) => {
    // Reduce image quality on mobile
    const images = container.querySelectorAll('img');
    images.forEach(img => {
      img.loading = 'lazy';
      
      // Add mobile-specific classes for optimization
      img.classList.add('mobile-optimized-image');
    });

    // Defer non-essential content on mobile
    const nonEssentialElements = container.querySelectorAll('[data-mobile-defer="true"]');
    nonEssentialElements.forEach(element => {
      (element as HTMLElement).style.display = 'none';
      
      // Show after a delay
      setTimeout(() => {
        (element as HTMLElement).style.display = '';
        (element as HTMLElement).classList.add('mobile-deferred-content');
      }, 1000);
    });

    container.classList.add('mobile-asset-optimized');
  }, []);

  // Preload admin components
  const preloadAdminComponents = useCallback(async () => {
    try {
      await lazyContentLoader.preload('admin-panel');
      await lazyContentLoader.preload('version-history');
      console.log('Admin components preloaded');
    } catch (error) {
      console.error('Failed to preload admin components:', error);
    }
  }, []);

  // Force load all remaining content
  const forceLoadAll = useCallback(async () => {
    try {
      if (progressiveLoaderRef.current) {
        await progressiveLoaderRef.current.forceLoadAll();
      }
      
      // Force load any remaining lazy components
      const unloadedComponents = editorContainerRef.current?.querySelectorAll('[data-component]:not(.lazy-content-loaded)');
      if (unloadedComponents) {
        unloadedComponents.forEach(component => {
          const componentType = component.getAttribute('data-component');
          if (componentType) {
            lazyContentLoader.preload(componentType);
          }
        });
      }

      console.log('Force loaded all remaining content');
    } catch (error) {
      console.error('Failed to force load content:', error);
    }
  }, []);

  // Cleanup optimizations
  const cleanupOptimizations = useCallback(() => {
    cleanupLazyLoading();
    
    if (progressiveLoaderRef.current) {
      progressiveLoaderRef.current.reset();
      progressiveLoaderRef.current = null;
    }

    isInitializedRef.current = false;
    setState({
      imagesLoaded: 0,
      totalImages: 0,
      componentsLoaded: 0,
      totalComponents: 0,
      progressiveLoadingProgress: 0,
      isOptimized: false
    });
  }, []);

  // Utility function to detect mobile devices
  const isMobileDevice = (): boolean => {
    return window.innerWidth <= 768 || /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  };

  // Get optimization status
  const getOptimizationStatus = useCallback(() => {
    return {
      isInitialized: isInitializedRef.current,
      ...state,
      progressiveLoader: progressiveLoaderRef.current?.getProgress() || null
    };
  }, [state]);

  // Enable debug mode for performance analysis
  const enableDebugMode = useCallback(() => {
    if (editorContainerRef.current) {
      editorContainerRef.current.classList.add('asset-optimization-debug');
      
      // Add visual indicators for lazy loaded content
      const lazyImages = editorContainerRef.current.querySelectorAll('.lazy-image');
      lazyImages.forEach(img => img.classList.add('debug-lazy-image'));
      
      const lazyComponents = editorContainerRef.current.querySelectorAll('.lazy-content');
      lazyComponents.forEach(component => component.classList.add('debug-lazy-component'));
      
      console.log('Asset optimization debug mode enabled');
    }
  }, []);

  // Disable debug mode
  const disableDebugMode = useCallback(() => {
    if (editorContainerRef.current) {
      editorContainerRef.current.classList.remove('asset-optimization-debug');
      
      const debugElements = editorContainerRef.current.querySelectorAll('.debug-lazy-image, .debug-lazy-component');
      debugElements.forEach(element => {
        element.classList.remove('debug-lazy-image', 'debug-lazy-component');
      });
      
      console.log('Asset optimization debug mode disabled');
    }
  }, []);

  return {
    // State
    ...state,
    
    // Status
    getOptimizationStatus,
    
    // Actions
    forceLoadAll,
    preloadAdminComponents,
    enableDebugMode,
    disableDebugMode,
    
    // Cleanup
    cleanup: cleanupOptimizations
  };
}; 