import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let appVersion = '0.1.0';
try {
  const rootPkg = JSON.parse(readFileSync(path.resolve(__dirname, '../package.json'), 'utf8'));
  appVersion = rootPkg.version || appVersion;
} catch {
  // Ignorera om root package.json saknas
}

export default defineConfig({
  plugins: [
    react(),
    ...(process.env.VITE_USE_SSL === 'true' ? [basicSsl()] : []),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  define: {
    __APP_VERSION__: JSON.stringify(process.env.VITE_APP_VERSION || appVersion),
  },
  server: {
    host: true,
    port: 5176,
    strictPort: true,
    allowedHosts: true,
    cors: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3004',
        changeOrigin: true,
        secure: false,
      },
      '/uploads': {
        target: 'http://127.0.0.1:3004',
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
