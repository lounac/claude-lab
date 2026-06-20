// Der "Bauplan" einer Bewerbung – an EINER Stelle definiert und überall wiederverwendet.

// Die erlaubten Status-Werte, in sinnvoller Pipeline-Reihenfolge:
//   interessant → in vorbereitung → beworben → antwort erhalten → interview → zusage → absage
// "as const" friert die Liste ein, damit TypeScript die einzelnen Werte als Typ kennt.
export const APPLICATION_STATUSES = [
  'interessant', // Wunschfirma, noch nicht beworben
  'in vorbereitung', // Bewerbung angefangen, noch nicht abgeschickt
  'beworben',
  'antwort erhalten',
  'interview',
  'zusage',
  'absage',
] as const

// Daraus leitet TypeScript automatisch den erlaubten Typ ab.
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number]

// Prioritäts-Stufen (für die Sortierung von Wunschfirmen).
export const APPLICATION_PRIORITIES = ['hoch', 'mittel', 'niedrig'] as const
export type ApplicationPriority = (typeof APPLICATION_PRIORITIES)[number]

// So sieht eine vollständige Bewerbung aus, wie sie in der Datenbank gespeichert ist.
export interface Application {
  id: string // eindeutige Kennung (uuid), vergibt die Datenbank
  user_id: string // wem die Bewerbung gehört (für den Login-Schutz)
  company_name: string // Firmenname
  position: string // Stellenbezeichnung
  status: ApplicationStatus // aktueller Stand (siehe oben)
  priority: ApplicationPriority | null // wie wichtig dir die Firma ist (optional)
  source: string | null // wo gefunden: LinkedIn, StepStone, Website … (optional)
  contact_person: string | null // Ansprechpartner:in / Kontakt (optional)
  application_date: string | null // Bewerbungsdatum als Text 'JJJJ-MM-TT' (optional)
  job_url: string | null // Link zur Stellenanzeige (optional)
  notes: string | null // freie Notizen (optional)
  next_deadline: string | null // nächste Frist als Text 'JJJJ-MM-TT' (optional)
  created_at: string // automatisch: wann angelegt
  updated_at: string // automatisch: wann zuletzt geändert
}

// Beim Anlegen oder Bearbeiten füllt man nur DIESE Felder aus.
// id, user_id, created_at und updated_at vergibt die Datenbank automatisch.
export type ApplicationInput = Pick<
  Application,
  | 'company_name'
  | 'position'
  | 'status'
  | 'priority'
  | 'source'
  | 'contact_person'
  | 'application_date'
  | 'job_url'
  | 'notes'
  | 'next_deadline'
>
