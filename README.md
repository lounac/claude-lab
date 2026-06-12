# claude-lab

Eine Sammlung kleiner Apps, die mit der Claude API gebaut werden. Jede App liegt in einem eigenen Unterordner und ist eigenständig (eigene `package.json`, eigenes Deployment).

## Apps

| Ordner | Beschreibung | Status |
|---|---|---|
| [`trainer-app/`](./trainer-app) | Interview-Trainer (PWA, React + TypeScript): Firmenwissen lernen, Quiz, Interview-Rollenspiel | 🚧 in Arbeit |

## Aufbau

```
claude-lab/
└── trainer-app/      # Interview-Trainer-App (Vite + React + TS, PWA)
```

Eine neue App anlegen = neuer Ordner neben den bestehenden, mit eigenem Setup und (optional) eigenem Vercel-Projekt.
