// Formatiert einen ISO-Zeitstempel als deutsches Datum + Uhrzeit
// (z. B. „9. Juli 2026, 10:00"). Leerer Wert → leerer String.
export function datumZeit(iso: string): string {
  if (!iso) return ''
  return new Date(iso).toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' })
}

// Macht aus 'JJJJ-MM-TT' oder einem ISO-Zeitstempel den lokalen Kalendertag (Mitternacht).
function kalendertag(wert: string): Date {
  // Reines Datum direkt zerlegen – new Date('JJJJ-MM-TT') würde es als UTC lesen.
  const nurDatum = /^(\d{4})-(\d{2})-(\d{2})$/.exec(wert)
  if (nurDatum) return new Date(+nurDatum[1], +nurDatum[2] - 1, +nurDatum[3])
  const d = new Date(wert)
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

// Wie viele Kalendertage liegt das Datum zurück? (0 = heute, negativ = in der Zukunft)
export function tageHer(wert: string, heute: Date = new Date()): number {
  const von = kalendertag(wert)
  const bis = new Date(heute.getFullYear(), heute.getMonth(), heute.getDate())
  return Math.round((bis.getTime() - von.getTime()) / 86_400_000)
}

// Datum mit Abstand, z. B. „24.09.2026 (vor 14 Tagen)". Leerer Wert → leerer String.
export function datumMitAbstand(wert: string | null, heute: Date = new Date()): string {
  if (!wert) return ''
  const datum = kalendertag(wert).toLocaleDateString('de-DE', { dateStyle: 'medium' })
  const tage = tageHer(wert, heute)
  let abstand: string
  if (tage === 0) abstand = 'heute'
  else if (tage > 0) abstand = `vor ${tage} ${tage === 1 ? 'Tag' : 'Tagen'}`
  else abstand = `in ${-tage} ${tage === -1 ? 'Tag' : 'Tagen'}`
  return `${datum} (${abstand})`
}
