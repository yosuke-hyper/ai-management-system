import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  optimizeDeps: { exclude: ['lucide-react'] },
  server: { fs: { strict: true } },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          const p = id.replace(/\\/g, '/');
          if (/\/node_modules\/react\/|\/node_modules\/react-dom\/|\/node_modules\/scheduler\//.test(p)) return 'react-core';
          if (/\/node_modules\/react-router\/|\/node_modules\/react-router-dom\//.test(p)) return 'react-router';
          if (/\/node_modules\/(chart\.js|react-chartjs-2|recharts)\//.test(p)) return 'chart-vendor';
          if (/\/node_modules\/(@radix-ui|lucide-react)\//.test(p)) return 'ui-vendor';
          if (/\/node_modules\/(date-fns|xlsx|file-saver|exceljs|jspdf|jszip)\//.test(p)) return 'utils-vendor';
        },
      },
    },
    chunkSizeWarningLimit: 1000,
    minify: 'terser',
    terserOptions: { compress: { drop_console: false, drop_debugger: true } },
  },
});
