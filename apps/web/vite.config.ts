import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  server: {
    // host: true → escucha en 0.0.0.0 (accesible por la IP de red, no solo localhost).
    host: true,
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
