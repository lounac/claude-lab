# Aspira

![CI](https://github.com/lounac/claude-lab/actions/workflows/ci.yml/badge.svg)

**Aspira** (von lat. _aspirare_ – „anstreben, aufstreben") ist ein Begleiter für Bewerbung und
Karriere: Stellen und Bewerbungen verwalten, den eigenen Lebenslauf per KI gegen eine konkrete Stelle
abgleichen und den Übergang in die Arbeitslosigkeit (Agentur-Termine, ALG-Fahrplan, Unterlagen)
organisieren.

## Funktionen

- **Stellen-Pipeline** – Stellen/Bewerbungen mit Status (von „interessant" über „beworben" bis
  „zusage/absage"), Prioritäten und Wunschfirmen; Filter und Statusübersicht.
- **KI-Stärken-Analyse** – gleicht den hinterlegten CV gegen die Stellenbeschreibung ab (passende
  Stärken, Lücken, Rückfragen) und zeigt die Claude-Kosten je Aufruf an.
- **CV-Verwaltung** – CV-Text wird im Konto gespeichert und ist auf allen Geräten verfügbar.
- **Arbeitsagentur & Übergang** – Termine, Angebote der Agentur, ALG-Fahrplan und Unterlagen-Checkliste.
- **PWA** – installierbar, Offline-Lesezugriff, Hell-/Dunkel-Modus.

## Tech-Stack

- **Frontend:** Vue 3 + TypeScript, Vuetify 4, Pinia, Vue Router, Vite, vite-plugin-pwa
- **Backend:** NestJS (TypeScript), `@anthropic-ai/sdk` (Claude), class-validator
- **Daten & Auth:** Supabase (Postgres + Auth, Row Level Security)
- **Tests:** Vitest (Frontend), Jest (Backend)
- **Hosting:** Vercel (Frontend), Render (Backend)

## Architektur

```
        ┌──────────────┐   Auth + Daten (RLS)   ┌───────────────┐
        │   Frontend   │ ─────────────────────► │   Supabase    │
        │ (Vue, Vercel)│                        │ Postgres+Auth │
        └──────┬───────┘                        └───────────────┘
               │  POST /analyse  (Login-Token im Header)
               ▼
        ┌──────────────┐      Claude API       ┌───────────────┐
        │   Backend    │ ─────────────────────►│   Anthropic   │
        │(NestJS,Render)│                       │  (Sonnet 4.6) │
        └──────────────┘
```

Das Frontend redet für CRUD/Login **direkt** mit Supabase (durch Row Level Security abgesichert). Nur
die KI-Analyse läuft über das NestJS-Backend – es verbirgt den Claude-Key, prüft per Auth-Guard den
Supabase-Login-Token und schränkt CORS auf die echte Frontend-Adresse ein.

## Projektstruktur

```
aspira/
├── frontend/   # Vue-App (Stellen, CV, Agentur-Bereich, PWA)
└── backend/    # NestJS-API (KI-Stärken-Analyse)
```

## Lokale Entwicklung

Voraussetzungen: Node 24+, ein Supabase-Projekt, ein Anthropic-API-Schlüssel (nur fürs Backend).

### Frontend

```bash
cd frontend
cp .env.local.example .env.local   # Werte eintragen
npm install
npm run dev                        # http://localhost:5173
```

### Backend

```bash
cd backend
cp .env.example .env               # Werte eintragen
npm install
npm run start:dev                  # http://localhost:3000
```

Die benötigten Umgebungsvariablen stehen in `frontend/.env.local.example` bzw. `backend/.env.example`.

## Tests

```bash
cd frontend && npm test    # Vitest
cd backend  && npm test    # Jest
```

## Deployment

- **Frontend → Vercel:** Root Directory `aspira/frontend`, Env-Variablen `VITE_SUPABASE_URL`,
  `VITE_SUPABASE_ANON_KEY`, `VITE_API_URL`.
- **Backend → Render:** Root Directory `aspira/backend`, Build `npm install && npm run build`, Start
  `npm run start:prod`, Env-Variablen `ANTHROPIC_API_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`,
  `FRONTEND_URL`.

Beide deployen automatisch bei einem Push auf `main`.

---

Aspira ist Teil des Monorepos [`claude-lab`](../README.md).
