import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react({
    jsxRuntime: 'automatic' // Use modern automatic JSX runtime for React 18
  })],
  server: {
    port: 3002,
    host: '0.0.0.0',
    watch: {
      usePolling: true
    },
    hmr: {
      overlay: false,
      clientPort: 3002
    }
  },
  optimizeDeps: {
    exclude: ['jszip'],
    include: [
      'react',
      'react-dom',
      '@emotion/react',
      '@emotion/styled',
      '@mui/material',
      '@mui/icons-material'
    ]
  },
  define: {
    // Polyfill for process.env
    'process.env': {
      NODE_ENV: JSON.stringify(process.env.NODE_ENV || 'development')
    }
  },
  build: {
    // Optimize for production
    target: 'esnext',
    minify: 'terser',
    sourcemap: false,
    cssCodeSplit: true,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        // Optimize chunk sizes
        manualChunks: (id) => {
          // Core React ecosystem - bundle ALL React dependencies together to avoid issues
          if (id.includes('node_modules/react') || 
              id.includes('node_modules/react-dom') ||
              id.includes('@emotion') ||
              id.includes('@mui/material') ||
              id.includes('@mui/icons-material') ||
              id.includes('scheduler')) {
            return 'react-vendor';
          }
          
          // Router (separate as it can be lazy loaded)
          if (id.includes('react-router')) {
            return 'router';
          }
          
          // Data fetching
          if (id.includes('@tanstack/react-query') || id.includes('axios')) {
            return 'data-fetching';
          }
          
          // Charts and visualization
          if (id.includes('chart.js') || id.includes('d3')) {
            return 'visualization';
          }
          
          // Editor
          if (id.includes('monaco-editor') || id.includes('react-monaco-editor')) {
            return 'editor';
          }
          
          // Syntax highlighting
          if (id.includes('react-syntax-highlighter')) {
            return 'syntax-highlighter';
          }
          
          // Markdown
          if (id.includes('react-markdown') || id.includes('marked')) {
            return 'markdown';
          }
          
          // Date utilities
          if (id.includes('date-fns')) {
            return 'date-utils';
          }
          
          // Other utilities
          if (id.includes('lodash') || id.includes('uuid') || id.includes('jszip')) {
            return 'utils';
          }
          
          // OpenTelemetry
          if (id.includes('@opentelemetry')) {
            return 'telemetry';
          }
        },
        // Generate smaller chunks
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId ? chunkInfo.facadeModuleId.split('/').pop() : 'chunk';
          return `js/[name]-${facadeModuleId}-[hash].js`;
        },
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split('.');
          const ext = info[info.length - 1];
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext)) {
            return `images/[name]-[hash][extname]`;
          } else if (/woff2?|ttf|otf|eot/i.test(ext)) {
            return `fonts/[name]-[hash][extname]`;
          } else {
            return `assets/[name]-[hash][extname]`;
          }
        }
      }
    }
  }
})
