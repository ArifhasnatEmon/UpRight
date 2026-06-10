import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  return {
    plugins: [react(), tailwindcss()],
    base: './',
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      port: 3000,
      hmr: process.env.DISABLE_HMR !== 'true',
    },
    build: {
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('@mediapipe')) return 'vendor-mediapipe';
              if (id.includes('face-api.js')) return 'vendor-face-api';
              if (id.includes('lucide-react')) return 'vendor-icons';
              if (id.includes('recharts') || id.includes('motion')) return 'vendor-ui';
              if (id.includes('react') || id.includes('react-dom')) return 'vendor-react';
              if (id.includes('@supabase')) return 'vendor-supabase';
              return 'vendor-core';
            }
          }
        }
      }
    }
  };
});
