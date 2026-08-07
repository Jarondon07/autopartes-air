import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 4301,
    proxy: {
      '/api': {
        target: 'http://localhost:4300',
        changeOrigin: true,
      },
      // Archivos subidos (logos, imágenes) servidos por la API.
      '/uploads': {
        target: 'http://localhost:4300',
        changeOrigin: true,
      },
    },
  },
});
