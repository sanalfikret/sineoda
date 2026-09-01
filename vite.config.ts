import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  optimizeDeps: {
    include: ['hls.js'],
  },
  server: {
    host: true,
    port: 5173,
    allowedHosts: true,
    proxy: {
      '/api': 'http://localhost:3001',
      '/uploads': 'http://localhost:3001',
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: [
        'favicon.svg',
        'icon.svg',
        'brand/*',
        'pwa-192x192.png',
        'pwa-512x512.png',
        'apple-touch-icon.png',
        'tv-banner.png',
        'tv-banner.svg',
        '.well-known/assetlinks.json',
      ],
      manifest: {
        id: '/',
        name: 'Plooy',
        short_name: 'Plooy',
        description: 'Bağımsız sinema platformu — telefon, tablet ve Smart TV.',
        theme_color: '#080a12',
        background_color: '#080a12',
        display: 'standalone',
        display_override: ['standalone', 'minimal-ui', 'fullscreen'],
        orientation: 'any',
        start_url: '/?source=pwa',
        scope: '/',
        lang: 'tr',
        dir: 'ltr',
        categories: ['entertainment', 'video'],
        prefer_related_applications: false,
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: 'tv-banner.png',
            sizes: '320x180',
            type: 'image/png',
            purpose: 'any',
          },
        ],
        screenshots: [
          {
            src: 'tv-banner.png',
            sizes: '320x180',
            type: 'image/png',
            form_factor: 'wide',
            label: 'Plooy — Smart TV',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            form_factor: 'narrow',
            label: 'Plooy — mobil',
          },
        ],
      },
      workbox: {
        // index.html precache etme — deploy sonrası eski JS hash'i siyah ekran yapıyordu
        globPatterns: ['**/*.{js,css,ico,png,svg,woff2,webmanifest}'],
        navigateFallback: undefined,
        // HTML sayfalarını cache'leme — deploy sonrası eski index.html + yeni JS hash = siyah ekran
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/images\.unsplash\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'poster-cache',
              expiration: {
                maxEntries: 60,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
            },
          },
        ],
      },
    }),
  ],
})
