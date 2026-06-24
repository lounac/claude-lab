# Aspira – Backend (NestJS)

NestJS-API für die **KI-Stärken-Analyse**. Sie verbirgt den Claude-Key, prüft per Guard den
Supabase-Login-Token und ist per CORS auf die Aspira-Frontend-Adresse beschränkt.

Teil von [Aspira](../README.md). Frontend siehe [`../frontend`](../frontend).

## Stack
NestJS · `@anthropic-ai/sdk` (Claude) · class-validator · Jest

## Endpunkte
| Methode | Pfad | Zweck |
|---|---|---|
| `POST` | `/analyse/staerken` | erste Stärken-Analyse (CV ↔ Stelle) — Guard-geschützt |
| `POST` | `/analyse/verfeinern` | Analyse mit Antworten verfeinern — Guard-geschützt |
| `GET` | `/health` | Lebenszeichen (`{ status, zeit }`) |

## Lokale Entwicklung
```bash
cp .env.example .env   # Werte eintragen
npm install
npm run start:dev      # http://localhost:3000
```
Benötigte Variablen: siehe [`.env.example`](./.env.example) (`ANTHROPIC_API_KEY`, `SUPABASE_URL`,
`SUPABASE_ANON_KEY`, `FRONTEND_URL`).

## Befehle
| Befehl | Zweck |
|---|---|
| `npm run start:dev` | Dev-Server mit Auto-Reload |
| `npm test` | Unit-Tests (Jest) |
| `npm run lint` | ESLint |
| `npm run build` | Production-Build (`dist/`) |
| `npm run start:prod` | gebautes Backend starten |

## Deployment
Render: Root Directory `aspira/backend`, Build `npm install && npm run build`, Start `npm run start:prod`,
Env-Variablen wie oben. Deployt automatisch bei Push auf `main`.
