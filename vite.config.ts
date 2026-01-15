import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

/**
 * manualChunks の安全設計方針
 * - "react" 文字列マッチは危険（react-chartjs-2 などまで巻き込む）
 * - node_modules/<pkg>/ を正規表現で厳密にマッチ
 * - 依存の土台は react-core に寄せ、循環依存を作らない
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  optimizeDeps: {
    // lucide-react は環境によって最適化で問題になるケースがあるため除外は維持
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

          // OS差異対策（Windowsパスも考慮）
          const p = id.replace(/\\/g, '/');

          // 1) Reactの土台（ここは他のvendorに依存させない）
          // react-dom は scheduler を参照するので一緒に固める
          if (
            /\/node_modules\/react\/|\/node_modules\/react-dom\/|\/node_modules\/scheduler\//.test(p)
          ) {
            return 'react-core';
          }

          // 2) Router（react-core にだけ依存する）
          if (
            /\/node_modules\/react-router\/|\/node_modules\/react-router-dom\//.test(p)
          ) {
            return 'react-router';
          }

          // 3) Chart系（react-core に依存、かつ chart.js を含むのでまとめる）
          // ※ react-chartjs-2 は chart.js 依存があるため react系チャンクには入れない
          if (
            /\/node_modules\/(chart\.js|react-chartjs-2|recharts)\//.test(p)
          ) {
            return 'chart-vendor';
          }

          // 4) UI系（Radix と lucide）
          if (
            /\/node_modules\/(@radix-ui|lucide-react)\//.test(p)
          ) {
            return 'ui-vendor';
          }

          // 5) Utils系（date-fns / xlsx / file-saver など）
          if (
            /\/node_modules\/(date-fns|xlsx|file-saver|exceljs|jspdf|jszip)\//.test(p)
          ) {
            return 'utils-vendor';
          }

          // 6) それ以外は Rollup に任せる（過剰分割しない方が安定しやすい）
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
