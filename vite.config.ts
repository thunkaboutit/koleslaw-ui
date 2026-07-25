import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import { blogStatic } from './plugins/blog-static'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), vueDevTools(), blogStatic()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    host: '0.0.0.0',
    proxy: {
      '/auth': 'http://localhost:8000',
      '/v1': 'http://localhost:8000',
    },
  },
})
