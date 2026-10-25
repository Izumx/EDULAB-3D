import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Loaded server-side only (no VITE_ prefix), so the key never reaches the browser bundle
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react()],
    build: {
      chunkSizeWarningLimit: 800, // three.js alone is ~720 kB; it is cached separately
      rollupOptions: {
        output: {
          // Big libraries in their own files: they change rarely, so the browser keeps them cached between updates
          manualChunks(id) {
            if (!id.includes('node_modules') || id.includes('@mediapipe')) return undefined // MediaPipe loads on demand
            // three.js has no dependencies, so it can live alone; React and its renderers must stay together
            // (splitting them creates circular chunks that crash at start-up)
            return id.includes('/node_modules/three/') ? 'three' : 'vendor'
          },
        },
      },
    },
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
