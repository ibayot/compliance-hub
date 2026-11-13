import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import packageJson from './package.json';

const buildId =
  process.env.VITE_APP_BUILD_ID?.trim() || `${packageJson.version}-${new Date().toISOString()}`;

const appVersionManifest = JSON.stringify({
  version: packageJson.version,
  buildId,
});

export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        assetFileNames: ({ name }) => name === 'pdf.worker.min.mjs'
          ? 'assets/pdf.worker.min-[hash].js'
          : 'assets/[name]-[hash][extname]',
      },
    },
  },
  define: {
    'import.meta.env.VITE_APP_BUILD_ID': JSON.stringify(buildId),
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(packageJson.version),
  },
  plugins: [
    react(),
    {
      name: 'app-version-manifest',
      configureServer(server) {
        server.middlewares.use((request, response, next) => {
          if (request.url?.split('?')[0] !== '/app-version.json') {
            next();
            return;
          }
          response.statusCode = 200;
          response.setHeader('Content-Type', 'application/json; charset=utf-8');
          response.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
          response.end(appVersionManifest);
        });
      },
      generateBundle() {
        this.emitFile({
          type: 'asset',
          fileName: 'app-version.json',
          source: appVersionManifest,
        });
      },
    },
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'next/navigation': path.resolve(__dirname, './src/shims/next-navigation.ts'),
    },
  },
  server: {
    port: 3000,
    strictPort: false,
    host: '127.0.0.1',
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:4000',
        changeOrigin: true,
        // No rewrite needed — backend is mounted at /api
      },
    },
  },
});
