// Zentrale Stelle für die verwendeten Claude-Modelle (Frontend-Seite).
// Das Backend hat eine erlaubte Liste; hier wählen wir pro Aufgabe.

export const MODELS = {
  /** Quiz: einfache Aufgabe → günstigeres, schnelles Modell. */
  quiz: 'claude-haiku-4-5',
  /** Rollenspiel/Chat: ausgewogenes Modell für natürliche Gespräche. */
  chat: 'claude-sonnet-4-6',
  /** Recherche (im Backend gesetzt). */
  research: 'claude-sonnet-4-6',
} as const
