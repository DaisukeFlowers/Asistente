import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Todo lo que empiece con /api en dev
      // se envía a tu backend local (ajusta el puerto si usas otro)
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        // opcional: reescribe /api -> /api si tu back ya sirve bajo /api
        // rewrite: (path) => path.replace(/^\/api/, '/api'),
      },
    },
  },
})
