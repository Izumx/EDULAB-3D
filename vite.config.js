import process from 'node:process'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Loaded server-side only (no VITE_ prefix), so the key never reaches the browser bundle
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api/ai': {
          target: 'https://api.xkiro.com/v1',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/ai/, ''),
          headers: { Authorization: `Bearer ${env.XKIRO_API_KEY}` },
        },
      },
    },
  }
})
