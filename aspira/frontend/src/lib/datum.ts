// Formatiert einen ISO-Zeitstempel als deutsches Datum + Uhrzeit
// (z. B. „9. Juli 2026, 10:00"). Leerer Wert → leerer String.
export function datumZeit(iso: string): string {
  if (!iso) return ''
  return new Date(iso).toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' })
}
