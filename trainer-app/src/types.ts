// Zentrale Datentypen der App. Bewusst schlank gehalten und erweiterbar.

/** Aufbereitetes Wissen über eine Firma (Ergebnis der URL-Recherche). */
export interface CompanyKnowledge {
  url: string
  name: string
  /** Aufbereitetes Firmenwissen als Markdown. */
  summary: string
  /** ISO-Zeitstempel der Recherche. */
  fetchedAt: string
  /** Optionale Quellen, die bei der Recherche genutzt wurden. */
  sources?: { title: string; url: string }[]
}

/** Eine Nachricht im Chat (Rollenspiel-Modus). */
export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

/** Eine Quizfrage. Ohne `options` => offene Frage. */
export interface QuizQuestion {
  id: string
  question: string
  options?: string[]
  /** Korrekte bzw. Musterantwort (für die Auswertung). */
  answer?: string
}
