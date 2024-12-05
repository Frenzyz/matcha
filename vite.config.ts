import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [
    react({
      fastRefresh: true,
      jsxRuntime: 'automatic'
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      global: 'window'
    }
  },
  define: {
    global: 'window',
  },
  server: {
    proxy: {
      '/socket.io': {
        target: 'http://localhost:3001',
        ws: true
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          ui: ['lucide-react', 'zustand'],
          supabase: ['@supabase/supabase-js'],
          webrtc: ['simple-peer', 'socket.io-client']
        }
      }
    }
  },
  optimizeDeps: {
    include: ['@supabase/supabase-js', 'simple-peer']
  }
});