import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// 相对 base：本地预览、任意子路径静态托管、以及 hash 路由都不依赖服务端 rewrite。
export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
  },
  preview: {
    host: '127.0.0.1',
    port: 4173,
    strictPort: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    target: 'es2022',
  },
});
