import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { runChat, runResearch, ApiError } from './api/_lib/claude'

// Lokales Backend: bedient POST /api/chat und /api/research direkt im
// Vite-Dev-Server, damit zum Entwickeln kein Vercel-CLI nötig ist.
// In Produktion übernimmt Vercel dieselben Funktionen aus dem /api-Ordner.
function devApi(): Plugin {
  return {
    name: 'trainer-dev-api',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url ?? ''
        if (!url.startsWith('/api/')) {
          next()
          return
        }
        if (req.method !== 'POST') {
          res.statusCode = 405
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'Nur POST erlaubt' }))
          return
        }

        let raw = ''
        req.on('data', (chunk) => {
          raw += chunk
        })
        req.on('end', async () => {
          try {
            const body = raw ? JSON.parse(raw) : {}
            let result: unknown
            if (url.startsWith('/api/chat')) {
              result = await runChat(body)
            } else if (url.startsWith('/api/research')) {
              result = await runResearch(body)
            } else {
              next()
              return
            }
            res.statusCode = 200
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify(result))
          } catch (err) {
            const status = err instanceof ApiError ? err.status : 500
            const message =
              err instanceof Error ? err.message : 'Unbekannter Fehler'
            res.statusCode = status
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: message }))
          }
        })
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // .env.local lesen, damit das lokale Backend den API-Key kennt.
  const env = loadEnv(mode, process.cwd(), '')
  if (env.ANTHROPIC_API_KEY) {
    process.env.ANTHROPIC_API_KEY = env.ANTHROPIC_API_KEY
  }

  return {
    plugins: [
      react(),
      tailwindcss(),
      devApi(),
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
        // Service Worker nur im Production-Build aktiv, nicht beim Entwickeln
        devOptions: { enabled: false },
      }),
    ],
  }
})
