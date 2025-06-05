import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { visualizer } from 'rollup-plugin-visualizer';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // Add bundle analyzer for development insights
    visualizer({
      filename: 'dist/bundle-analysis.html',
      open: false,
      gzipSize: true,
      brotliSize: true,
    })
  ],
  optimizeDeps: {
    exclude: ['lucide-react'],
    include: ['pdfjs-dist']
  },
  build: {
    // Break into more chunks to reduce individual file sizes
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'vendor';
          }
          // Split TipTap extensions for lazy loading
          if (id.includes('@tiptap/') || id.includes('prosemirror-')) {
            return 'editor';
          }
          if (id.includes('node_modules/framer-motion') || 
              id.includes('node_modules/react-hot-toast') || 
              id.includes('node_modules/clsx')) {
            return 'ui';
          }
          if (id.includes('node_modules/pdfjs-dist')) {
            return 'pdf';
          }
          if (id.includes('node_modules/mammoth') || 
              id.includes('node_modules/jszip') || 
              id.includes('node_modules/base64-arraybuffer')) {
            return 'utils';
          }
          if (id.includes('node_modules/lucide-react')) {
            return 'icons';
          }
          // Split large components into separate chunks
          if (id.includes('/admin/') || id.includes('AdminPanel')) {
            return 'admin';
          }
          if (id.includes('/ui/') && (
            id.includes('CommentingSystem') || 
            id.includes('VersionHistory') || 
            id.includes('CollaborativeCursors')
          )) {
            return 'collaboration';
          }
        }
      }
    },
    // Set a high limit to avoid warnings
    chunkSizeWarningLimit: 3000,
    // Use terser for better minification
    minify: 'terser',
    // Disable source maps to reduce build size and complexity
    sourcemap: false,
    // Target a more compatible ES version
    target: 'es2018',
    // Break CSS into smaller files
    cssCodeSplit: true,
    // Reduce the default module size for better chunking
    assetsInlineLimit: 2048,
    // Configure Terser to be more aggressive
    terserOptions: {
      compress: {
        // Aggressive size optimizations
        passes: 2,
        drop_console: true,
        drop_debugger: true
      },
      format: {
        comments: false
      }
    }
  },
  // Configure esbuild for stability
  esbuild: {
    logOverride: {
      'this-is-undefined-in-esm': 'silent'
    },
    // Disable JSX factory as we're using React 18
    jsx: 'automatic',
    // Ensure we're not using too many resources during build
    treeShaking: true,
    target: 'es2018',
    // Reduce memory usage
    legalComments: 'none',
    // Avoid too many workers
    supported: {
      'dynamic-import': true
    }
  },
  // Adjust server options
  server: {
    hmr: {
      overlay: false
    }
  },
  // Add resolver for PDF worker - this is crucial for the fix
  resolve: {
    alias: {
      'pdfjs-dist/build/pdf.worker.mjs': resolve(__dirname, 'node_modules/pdfjs-dist/build/pdf.worker.mjs')
    }
  }
});