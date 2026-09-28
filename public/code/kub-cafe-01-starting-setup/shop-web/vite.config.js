import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Khi chạy `npm run dev`, mọi request /api/* được chuyển sang bản đang chạy
// bằng Docker Compose ở cổng 8210. Trong image production thì nginx lo việc này.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5210,
    proxy: {
      '/api': 'http://localhost:8210',
    },
  },
});
