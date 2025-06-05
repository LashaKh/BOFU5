import { useEffect, useRef, useState, useCallback } from 'react';
import { Editor } from '@tiptap/react';
import { performanceMonitor } from '../utils/performanceMonitor';
import { virtualRendering, VirtualRenderingConfig } from '../utils/virtualRendering';

interface UsePerformanceOptimizationOptions {
  editor?: Editor | null;
  config?: Partial<VirtualRenderingConfig>;
  enableMonitoring?: boolean;
  documentSizeThreshold?: number; // Threshold for enabling optimizations
  measurementInterval?: number; // How often to measure performance (ms)
}

interface PerformanceOptimizationState {
  isOptimized: boolean;
  documentSize: number;
  lastMeasurement: Date | null;
  warnings: string[];
  recommendations: string[];
  statistics: any;
}

export const usePerformanceOptimization = (
  options: UsePerformanceOptimizationOptions = {}
) => {
  const {
    editor,
    config = {},
    enableMonitoring = true,
    documentSizeThreshold = 50000, // 50k characters
    measurementInterval = 5000 // 5 seconds
  } = options;

  const editorElementRef = useRef<HTMLElement | null>(null);
  const measurementIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const [state, setState] = useState<PerformanceOptimizationState>({
    isOptimized: false,
    documentSize: 0,
    lastMeasurement: null,
    warnings: [],
    recommendations: [],
    statistics: null
  });

  // Initialize performance monitoring
  useEffect(() => {
    if (enableMonitoring) {
      performanceMonitor.startMonitoring();
      return () => {
        performanceMonitor.stopMonitoring();
      };
    }
  }, [enableMonitoring]);

  // Get editor element and set up virtual rendering
  useEffect(() => {
    if (!editor) return;

    // Find the editor element
    const editorDom = editor.view.dom;
    const editorContainer = editorDom.closest('.border') as HTMLElement; // ArticleEditor container
    
    if (editorContainer) {
      editorElementRef.current = editorContainer;
      
      // Initialize virtual rendering
      virtualRendering.initialize(editorContainer);
      
      console.log('Performance optimization initialized for editor');
    }

    return () => {
      virtualRendering.cleanup();
    };
  }, [editor]);

  // Set up periodic performance measurements
  useEffect(() => {
    if (!enableMonitoring || !editorElementRef.current) return;

    const measurePerformance = () => {
      if (!editorElementRef.current || !editor) return;

      // Measure document size
      const documentSize = editorElementRef.current.textContent?.length || 0;
      
      // Record measurement
      performanceMonitor.recordMeasurement(editorElementRef.current);
      
      // Check for warnings
      const warnings = performanceMonitor.checkPerformanceThresholds();
      
      // Get recommendations
      const recommendations = virtualRendering.getPerformanceRecommendations(documentSize);
      
      // Get statistics
      const statistics = performanceMonitor.getStatistics();
      
      // Update state
      setState(prevState => ({
        ...prevState,
        documentSize,
        lastMeasurement: new Date(),
        warnings: warnings || [],
        recommendations,
        statistics
      }));

      // Apply optimizations if needed
      if (documentSize > documentSizeThreshold && !state.isOptimized) {
        applyOptimizations(documentSize);
      }
    };

    // Initial measurement
    measurePerformance();

    // Set up interval
    measurementIntervalRef.current = setInterval(measurePerformance, measurementInterval);

    return () => {
      if (measurementIntervalRef.current) {
        clearInterval(measurementIntervalRef.current);
      }
    };
  }, [editor, enableMonitoring, measurementInterval, documentSizeThreshold, state.isOptimized]);

  // Apply performance optimizations based on document size
  const applyOptimizations = useCallback((documentSize: number) => {
    if (!editorElementRef.current) return;

    const container = editorElementRef.current;
    
    // Add performance optimization CSS classes
    container.classList.add('performance-optimized-container');
    
    // Determine device type and add appropriate classes
    const width = window.innerWidth;
    if (width < 768) {
      container.classList.add('performance-optimized-mobile');
    } else if (width < 1024) {
      container.classList.add('performance-optimized-tablet');
    } else {
      container.classList.add('performance-optimized-desktop');
    }

    // Apply large document optimizations if needed
    if (documentSize > 100000) { // 100k characters
      container.classList.add('editor-large-document');
      virtualRendering.optimizeForLargeDocument();
    }

    // Apply performance-optimized class to content blocks
    const blocks = container.querySelectorAll('p, h1, h2, h3, h4, h5, h6, div, blockquote, pre, table, img');
    blocks.forEach((block) => {
      const element = block as HTMLElement;
      if (element.textContent && element.textContent.length > 500) {
        element.classList.add('performance-optimized-block');
      }
      
      // Specific optimizations for different element types
      if (block.tagName === 'TABLE') {
        block.classList.add('performance-optimized-table');
      } else if (block.tagName === 'IMG') {
        block.classList.add('performance-optimized-image');
      }
    });

    setState(prevState => ({ ...prevState, isOptimized: true }));
    console.log(`Performance optimizations applied for document size: ${documentSize}`);
  }, []);

  // Remove performance optimizations
  const removeOptimizations = useCallback(() => {
    if (!editorElementRef.current) return;

    const container = editorElementRef.current;
    
    // Remove performance optimization CSS classes
    container.classList.remove(
      'performance-optimized-container',
      'performance-optimized-mobile',
      'performance-optimized-tablet',
      'performance-optimized-desktop',
      'editor-large-document'
    );

    // Remove optimizations from content blocks
    const blocks = container.querySelectorAll('.performance-optimized-block, .performance-optimized-table, .performance-optimized-image');
    blocks.forEach((block) => {
      block.classList.remove('performance-optimized-block', 'performance-optimized-table', 'performance-optimized-image');
    });

    setState(prevState => ({ ...prevState, isOptimized: false }));
    console.log('Performance optimizations removed');
  }, []);

  // Manually trigger performance measurement
  const measurePerformance = useCallback(() => {
    if (!editorElementRef.current || !editor) return null;

    const measureId = Date.now().toString();
    
    // Start render measurement
    performanceMonitor.startRenderMeasure(measureId);
    
    // Force a re-render or operation
    editor.view.updateState(editor.view.state);
    
    // End render measurement
    performanceMonitor.endRenderMeasure(measureId);
    
    // Record full measurement
    performanceMonitor.recordMeasurement(editorElementRef.current);
    
    return performanceMonitor.getCurrentMetric();
  }, [editor]);

  // Get detailed performance report
  const getPerformanceReport = useCallback(() => {
    return {
      ...state,
      optimizationStatus: virtualRendering.getOptimizationStatus(),
      performanceData: performanceMonitor.exportPerformanceData(),
      config: virtualRendering.getOptimizationStatus()
    };
  }, [state]);

  // Enable debug mode (visual indicators)
  const enableDebugMode = useCallback(() => {
    if (!editorElementRef.current) return;

    editorElementRef.current.classList.add('performance-debug');
    
    const blocks = editorElementRef.current.querySelectorAll('.performance-optimized-block');
    blocks.forEach(block => {
      block.classList.add('performance-debug');
    });
  }, []);

  // Disable debug mode
  const disableDebugMode = useCallback(() => {
    if (!editorElementRef.current) return;

    editorElementRef.current.classList.remove('performance-debug');
    
    const blocks = editorElementRef.current.querySelectorAll('.performance-debug');
    blocks.forEach(block => {
      block.classList.remove('performance-debug');
    });
  }, []);

  return {
    // State
    ...state,
    
    // Actions
    applyOptimizations,
    removeOptimizations,
    measurePerformance,
    getPerformanceReport,
    enableDebugMode,
    disableDebugMode,
    
    // Utilities
    editorElement: editorElementRef.current
  };
}; 