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
        devOptions: {
          enabled: true,
          type: 'module'
        },
        devDistDir: 'dist',
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest}'],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/api\.github\.com\//,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'github-api-cache',
                networkTimeoutSeconds: 10,
                cacheableResponse: {
                  statuses: [0, 200]
                }
              }
            }
          ]
        },
        includeAssets: ['favicon.ico', 'icon.svg', 'icons/*.png'],
        manifest: {
          name: 'Github Media Recorder for Mobiles',
          short_name: 'Media Recorder',
          description: 'Record and upload audio/video files',
          start_url: baseUrl,
          scope: baseUrl,
          display: 'standalone',
          theme_color: '#667eea',
          background_color: '#ffffff',
          orientation: "portrait",
          categories: ['utilities', 'productivity'],
          prefer_related_applications: false,
          dir: 'ltr',
          lang: 'en',
          display_override: ['standalone', 'fullscreen'],
          icons: [
            {
              src: `${baseUrl}icons/icon-16x16.png`.replace(/\/+/g, '/'),
              sizes: '16x16',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: `${baseUrl}icons/icon-32x32.png`.replace(/\/+/g, '/'),
              sizes: '32x32',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: `${baseUrl}icons/icon-48x48.png`.replace(/\/+/g, '/'),
              sizes: '48x48',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: `${baseUrl}icons/icon-72x72.png`.replace(/\/+/g, '/'),
              sizes: '72x72',
              type: 'image/png',
              purpose: 'any maskable'
            },
            {
              src: `${baseUrl}icons/icon-96x96.png`.replace(/\/+/g, '/'),
              sizes: '96x96',
              type: 'image/png',
              purpose: 'any maskable'
            },
            {
              src: `${baseUrl}icons/icon-128x128.png`.replace(/\/+/g, '/'),
              sizes: '128x128',
              type: 'image/png',
              purpose: 'any maskable'
            },
            {
              src: `${baseUrl}icons/icon-144x144.png`.replace(/\/+/g, '/'),
              sizes: '144x144',
              type: 'image/png',
              purpose: 'any maskable'
            },
            {
              src: `${baseUrl}icons/icon-152x152.png`.replace(/\/+/g, '/'),
              sizes: '152x152',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: `${baseUrl}icons/icon-180x180.png`.replace(/\/+/g, '/'),
              sizes: '180x180',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: `${baseUrl}icons/icon-192x192.png`.replace(/\/+/g, '/'),
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any maskable'
            },
            {
              src: `${baseUrl}icons/icon-256x256.png`.replace(/\/+/g, '/'),
              sizes: '256x256',
              type: 'image/png',
              purpose: 'any maskable'
            },
            {
              src: `${baseUrl}icons/icon-512x512.png`.replace(/\/+/g, '/'),
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable'
            }
          ],
        },
      }),
    ],
    define: {
      global: 'globalThis',
      // Add Node.js process polyfill for FFmpeg
      'process.env': JSON.stringify(process.env),
    },
    optimizeDeps: {
      exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/util'],
    },
    build: {
      target: 'esnext',
      rollupOptions: {
        output: {
          manualChunks: {
            // Separate FFmpeg into its own chunk
            ffmpeg: ['@ffmpeg/ffmpeg', '@ffmpeg/util'],
          },
        },
      },
    },
    server: {
      allowedHosts: ['.ngrok-free.app'],
    },
  }
})
