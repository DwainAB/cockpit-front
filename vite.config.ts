import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  server: {
    port: 5173,
    // En développement, /api est relayé vers le backend Node.js (SSE compris).
    proxy: { '/api': { target: process.env.API_PROXY_TARGET ?? 'http://localhost:4000', changeOrigin: true } },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          mantine: ['@mantine/core', '@mantine/hooks', '@mantine/dates', '@mantine/notifications', '@mantine/spotlight', '@mantine/form'],
          charts: ['@mantine/charts', 'recharts'],
          icons: ['@tabler/icons-react'],
        },
      },
    },
    chunkSizeWarningLimit: 700,
  },
});
