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
    include: [
      'react', 
      'react-dom', 
      '@tiptap/react', 
      '@tiptap/starter-kit',
      'use-isomorphic-layout-effect',
      'framer-motion'
    ]
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
    target: 'es2020',
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          // React ecosystem
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          
          // UI and animation libraries
          'ui-vendor': [
            '@headlessui/react',
            '@heroicons/react',
            '@radix-ui/react-avatar',
            '@radix-ui/react-scroll-area',
            '@radix-ui/react-select',
            '@radix-ui/react-slot',
            'framer-motion',
            'react-hot-toast',
            'lucide-react'
          ],
          
          // Editor ecosystem  
          'editor-vendor': [
            '@tiptap/core',
            '@tiptap/react',
            '@tiptap/starter-kit',
            '@tiptap/extension-character-count',
            '@tiptap/extension-code-block',
            '@tiptap/extension-collaboration',
            '@tiptap/extension-collaboration-cursor',
            '@tiptap/extension-color',
            '@tiptap/extension-highlight',
            '@tiptap/extension-horizontal-rule',
            '@tiptap/extension-image',
            '@tiptap/extension-link',
            '@tiptap/extension-strike',
            '@tiptap/extension-subscript',
            '@tiptap/extension-superscript',
            '@tiptap/extension-table',
            '@tiptap/extension-table-cell',
            '@tiptap/extension-table-header',
            '@tiptap/extension-table-row',
            '@tiptap/extension-task-item',
            '@tiptap/extension-task-list',
            '@tiptap/extension-text-align',
            '@tiptap/extension-text-style',
            '@tiptap/extension-typography',
            '@tiptap/extension-underline',
            'yjs'
          ],
          
          // PDF handling
          'pdf-vendor': [
            'pdfjs-dist',
            'jspdf',
            'html2canvas'
          ],
          
          // Database and auth
          'supabase-vendor': [
            '@supabase/supabase-js'
          ],
          
          // Document processing
          'document-vendor': [
            'docx',
            'mammoth',
            'jszip',
            'file-saver',
            'turndown',
            'markdown-it',
            'marked',
            'react-markdown',
            'remark',
            'remark-gfm',
            'remark-parse',
            'remark-stringify'
          ],
          
          // Utilities and other libraries
          'utils-vendor': [
            'axios',
            'lodash',
            'date-fns',
            'diff',
            'class-variance-authority',
            'clsx',
            'tailwind-merge',
            'react-dropzone',
            'react-textarea-autosize',
            'base64-arraybuffer'
          ],
          
          // Sentry monitoring
          'sentry-vendor': [
            '@sentry/react'
          ]
        }
      }
    },
    sourcemap: true,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    }
  },
  server: {
    port: 5173,
    hmr: true
  }
});