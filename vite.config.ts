cat > vite.config.ts <<'EOF'
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

/**
 * manualChunks の安全設計方針:
 * - "react" 文字列マッチは危険（react-chartjs-2 等まで巻き込む）
 * - node_modules/<pkg>/ を正規表現で厳密にマッチ
 * - React基盤は react-core に寄せ、循環依存を作らない
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  server: {
    fs: { strict: true },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          const p = id.replace(/\\/g, '/');

          // React core
          if (/\/node_modules\/react\/|\/node_modules\/react-dom\/|\/node_modules\/scheduler\//.test(p)) {
            return 'react-core';
          }

          // Router
          if (/\/node_modules\/react-router\/|\/node_modules\/react-router-dom\//.test(p)) {
            return 'react-router';
          }

          // Chart
          if (/\/node_modules\/(chart\.js|react-chartjs-2|recharts)\//.test(p)) {
            return 'chart-vendor';
          }

          // UI
          if (/\/node_modules\/(@radix-ui|lucide-react)\//.test(p)) {
            return 'ui-vendor';
          }

          // Utils
          if (/\/node_modules\/(date-fns|xlsx|file-saver|exceljs|jspdf|jszip)\//.test(p)) {
            return 'utils-vendor';
          }

          return;
        },
      },
    },
    chunkSizeWarningLimit: 1000,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: false,
        drop_debugger: true,
      },
    },
  },
});
EOF

