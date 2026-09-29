import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { 
    port: 5173,
    proxy: {
      '/cpcb-api': {
        target: 'https://airquality.cpcb.gov.in/caaqms/rss_feed',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/cpcb-api/, '')
      }
    }
  },
});
