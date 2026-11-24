import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Storefront SPA (index.html) + a fully independent static checkout page
// (checkout/index.html) that follows the /bp contract without any framework.
export default defineConfig({
  base: '/',
  plugins: [react()],
  server: { port: 5173 },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      input: {
        main: 'index.html',
        checkout: 'checkout/index.html'
      },
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom']
        }
      }
    }
  }
});
