import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/foodtimer/',
  plugins: [react()],
  build: {
    target: 'es2020',
    cssMinify: true,
    rollupOptions: {
      output: {
        // Split vendor code so app updates don't invalidate the React cache.
        manualChunks: {
          vendor: ['react', 'react-dom'],
        },
      },
    },
  },
});
