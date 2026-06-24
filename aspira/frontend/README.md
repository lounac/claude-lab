# Aspira – Frontend (Vue 3)

Die Vue-PWA von Aspira: Stellen-/Bewerbungsverwaltung, CV, Arbeitsagentur-Bereich und der Dialog für die
KI-Stärken-Analyse.

Teil von [Aspira](../README.md). Backend (NestJS) siehe [`../backend`](../backend).

## Stack
Vue 3 + TypeScript · Vuetify 4 · Pinia · Vue Router · Vite · vite-plugin-pwa · Vitest

## Lokale Entwicklung
```bash
cp .env.local.example .env.local   # Werte eintragen
npm install
npm run dev                        # http://localhost:5173
```
Benötigte Variablen: siehe [`.env.local.example`](./.env.local.example) (`VITE_SUPABASE_URL`,
`VITE_SUPABASE_ANON_KEY`, optional `VITE_API_URL` für die KI-Funktion).

## Befehle
| Befehl | Zweck |
|---|---|
| `npm run dev` | Dev-Server |
| `npm test` | Unit-Tests (Vitest) |
| `npm run build` | Production-Build (inkl. `vue-tsc`-Typecheck) |
| `npm run preview` | gebaute App lokal ansehen |

## Deployment
Vercel: Root Directory `aspira/frontend`, Env-Variablen wie oben. Deployt automatisch bei Push auf `main`.
