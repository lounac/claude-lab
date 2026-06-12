import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'Interview-Trainer',
        short_name: 'Trainer',
        description:
          'Firmenwissen lernen, Quiz und Interview-Rollenspiel mit Claude',
        lang: 'de',
        theme_color: '#6d28d9',
        background_color: '#0b0b12',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: 'icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
      // Service Worker nur im Production-Build aktiv, nicht beim lokalen Entwickeln
      devOptions: { enabled: false },
    }),
  ],
})
