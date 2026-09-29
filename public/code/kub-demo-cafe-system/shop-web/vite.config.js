import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Bỏ tiền tố /api trước khi chuyển đi — đúng cách nginx.conf làm trong image
// production. Nhờ vậy code React gọi cùng một đường dẫn ở cả hai nơi.
const stripApi = (path) => path.replace(/^\/api/, '');

export default defineConfig(({ mode }) => {
  // Tham số thứ ba là '' để đọc cả biến không có tiền tố VITE_. Những biến này
  // chỉ dùng trong file cấu hình, không lọt vào bundle gửi xuống trình duyệt.
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react(), tailwindcss()],
    // styles.css là CSS thuần. Khoá việc tìm postcss.config để Vite không
    // nhặt cấu hình của một project khác khi thư mục này nằm lồng bên trong.
    css: { postcss: {} },
    server: {
      port: Number(env.DEV_PORT) || 5210,
      proxy: {
        '/api/menu': {
          target: env.MENU_API_TARGET || 'http://localhost:8213',
          changeOrigin: true,
          rewrite: stripApi,
        },
        '/api/orders': {
          target: env.ORDER_API_TARGET || 'http://localhost:8214',
          changeOrigin: true,
          rewrite: stripApi,
        },
      },
    },
  };
});
