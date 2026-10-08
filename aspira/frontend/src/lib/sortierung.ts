// Sortierung der Stellenliste nach einem der drei Datumsfelder – jeweils neueste zuerst.
import type { Application } from '../types/application'

export type Sortierfeld = 'created_at' | 'updated_at' | 'application_date'

export const SORTIER_OPTIONEN: { title: string; value: Sortierfeld }[] = [
  { title: 'Erstellt', value: 'created_at' },
  { title: 'Zuletzt geändert', value: 'updated_at' },
  { title: 'Beworben am', value: 'application_date' },
]

// Gibt eine sortierte Kopie zurück. Einträge ohne Datum (z. B. noch nicht beworben) stehen am Ende.
export function sortiert(liste: Application[], feld: Sortierfeld): Application[] {
  return [...liste].sort((a, b) => {
    const da = a[feld]
    const db = b[feld]
    if (!da && !db) return 0
    if (!da) return 1
    if (!db) return -1
    return new Date(db).getTime() - new Date(da).getTime()
  })
}
