// Typen für den Arbeitsagentur-Bereich (Termine + Checklisten).

// Ein Termin bei der Agentur für Arbeit.
export interface Termin {
  id: string
  user_id: string
  titel: string
  datum: string // ISO-Zeitstempel (timestamptz)
  ort: string | null
  notiz: string | null
  created_at: string
}

// Eingabe-Form fürs Anlegen/Bearbeiten (ohne von der DB gesetzte Felder).
export interface TerminInput {
  titel: string
  datum: string
  ort: string | null
  notiz: string | null
}

// Welche Checkliste: der ALG-Fahrplan oder die Unterlagen.
export type AufgabenTyp = 'fahrplan' | 'unterlagen'

// Gespeicherter Zustand eines Checklisten-Punkts (aus Supabase).
export interface AufgabeZustand {
  schluessel: string
  typ: AufgabenTyp
  erledigt: boolean
  datum: string | null
  notiz: string | null
}

// Fest im Frontend definierter Checklisten-Punkt (mit Anzeigetext).
export interface AufgabeDefinition {
  schluessel: string
  titel: string
  hinweis?: string
  dringend?: boolean // true = Frist mit Folgen (Hinweis rot hervorheben)
}
