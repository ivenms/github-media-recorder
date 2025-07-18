import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const baseUrl = env.VITE_BASE_URL || '/'
  
  return {
    base: baseUrl,
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png'],
        manifest: {
          name: 'Mobile Recorder PWA',
          short_name: 'Recorder',
          description: 'Record and upload audio/video files',
          start_url: baseUrl,
          display: 'standalone',
          theme_color: '#000000',
          background_color: '#ffffff',
          icons: [
            {
              src: `${baseUrl}icons/icon-192x192.png`.replace(/\/+/g, '/'),
              sizes: '192x192',
              type: 'image/png',
            },
            {
              src: `${baseUrl}icons/icon-512x512.png`.replace(/\/+/g, '/'),
              sizes: '512x512',
              type: 'image/png',
            },
          ],
        },
      }),
    ],
    define: {
      global: 'globalThis',
    },
    optimizeDeps: {
      exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/util'],
    },
    server: {
      allowedHosts: ['.ngrok-free.app'],
    },
  }
})
