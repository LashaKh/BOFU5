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
  define: {
    // Ensure React is available globally for context creation
    global: 'globalThis',
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
    include: ['react', 'react-dom', '@tiptap/react', '@tiptap/starter-kit']
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      'react': resolve('./node_modules/react'),
      'react-dom': resolve('./node_modules/react-dom'),
    },
    dedupe: ['react', 'react-dom']
  },
  build: {
    // Break into more chunks to reduce individual file sizes
    rollupOptions: {
      external: [],
      output: {
        manualChunks: (id) => {
          // React core
          if (id.includes('react') || id.includes('react-dom')) {
            return 'react-vendor';
          }
          
          // TipTap editor libraries
          if (id.includes('@tiptap') || id.includes('prosemirror')) {
            return 'editor-vendor';
          }
          
          // UI/styling libraries
          if (id.includes('framer-motion') || id.includes('lucide-react')) {
            return 'ui-vendor';
          }
          
          // Supabase and other APIs
          if (id.includes('@supabase') || id.includes('supabase')) {
            return 'supabase-vendor';
          }
          
          // Large utility libraries
          if (id.includes('lodash') || id.includes('date-fns')) {
            return 'utils-vendor';
          }
          
          // PDF and document processing
          if (id.includes('pdfjs') || id.includes('pdf')) {
            return 'pdf-vendor';
          }
          
          // Node modules that aren't separated above
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        },
        // Ensure globals are properly defined
        globals: {
          'react': 'React',
          'react-dom': 'ReactDOM'
        }
      }
    },
    // Target modern browsers for better performance
    target: 'es2020',
    // Ensure source maps for debugging
    sourcemap: true,
    // Optimize chunk size warnings
    chunkSizeWarningLimit: 1000
  },
  server: {
    port: 5173,
    hmr: true
  }
});