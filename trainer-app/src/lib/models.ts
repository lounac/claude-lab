// Zentrale Stelle für die verwendeten Claude-Modelle.
// Hier einfach umstellen, falls du ein anderes Modell nutzen möchtest.

export const MODELS = {
  /** Für Chat/Quiz: gutes Verhältnis aus Geschwindigkeit, Qualität und Kosten. */
  chat: 'claude-sonnet-4-6',
  /** Für die Firmen-Recherche (Web-Suche). */
  research: 'claude-sonnet-4-6',
} as const
