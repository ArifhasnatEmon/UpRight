import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  // Support both VITE_GEMINI_API_KEY and GEMINI_API_KEY from .env
  const geminiKey = env.VITE_GEMINI_API_KEY || env.GEMINI_API_KEY || '';
  return {
    plugins: [react(), tailwindcss()],
    base: './',
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(geminiKey),
      'import.meta.env.VITE_GEMINI_API_KEY': JSON.stringify(geminiKey),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      port: 3000,
      // HMR can be disabled via DISABLE_HMR env var
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
