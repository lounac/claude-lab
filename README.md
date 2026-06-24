# claude-lab

![CI](https://github.com/lounac/claude-lab/actions/workflows/ci.yml/badge.svg)

Persönliche Projekt-Sammlung (Monorepo). Jede App liegt in einem eigenen Unterordner, ist eigenständig
(eigene `package.json`) und wird separat deployt.

## Apps

| Ordner | Beschreibung | Stack |
|---|---|---|
| [`aspira/`](./aspira) | **Begleiter für Bewerbung & Karriere** – Stellen-/Bewerbungsverwaltung, KI-Stärken-Analyse, Arbeitsagentur-Bereich. _Hauptprojekt, siehe [aspira/README.md](./aspira/README.md)._ | Vue 3 + NestJS + Supabase + Claude |
| [`trainer-app/`](./trainer-app) | Interview-Trainer (PWA): Firmenwissen-Briefing + Quiz | React + TS + Claude API |

## Aufbau

```
claude-lab/
├── aspira/         # frontend/ (Vue) + backend/ (NestJS)
└── trainer-app/    # Interview-Trainer (Vite + React, PWA)
```

Die CI (GitHub Actions) baut, lintet und testet Aspira bei jedem Push auf `main`.
