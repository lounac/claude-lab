import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vuetify from 'vite-plugin-vuetify'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    // Lädt Vuetify-Komponenten automatisch, sobald sie im Template benutzt werden.
    vuetify({ autoImport: true }),
    // Macht die App installierbar (PWA) und cached die App-Hülle für offline.
    VitePWA({
      registerType: 'autoUpdate', // neue Version wird automatisch übernommen
      manifest: {
        name: 'Aspira',
        short_name: 'Aspira',
        description: 'Aspira – dein Begleiter für Bewerbung und Karriere.',
        lang: 'de',
        theme_color: '#1867C0',
        background_color: '#ffffff',
        display: 'standalone', // eigenes Fenster ohne Browser-Adressleiste
        start_url: '/',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Welche Dateien für offline zwischengespeichert werden.
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff,woff2}'],
        // Bei unbekannten Adressen die App-Startseite ausliefern (SPA-Routing offline).
        navigateFallback: 'index.html',
      },
    }),
  ],
})
