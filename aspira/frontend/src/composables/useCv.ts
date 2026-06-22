// Verwaltet den Lebenslauf-TEXT der eingeloggten Person.
// Quelle der Wahrheit = Supabase-Tabelle "cv" → der CV ist auf JEDEM Gerät verfügbar.
// Zusätzlich eine lokale Kopie (localStorage) als Offline-Anzeige.
// Es wird bewusst NUR der Text gespeichert (keine PDF) – spart Platz & Claude-Kosten.
import { ref } from 'vue'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/auth'

const KEY = 'bt_cv'

interface CvDaten {
  name: string // Dateiname, z. B. "Lebenslauf.pdf"
  text: string // der ausgelesene Text
}

function ausCache(): CvDaten | null {
  try {
    const roh = localStorage.getItem(KEY)
    return roh ? (JSON.parse(roh) as CvDaten) : null
  } catch {
    return null
  }
}

function inCache(daten: CvDaten | null) {
  if (daten) localStorage.setItem(KEY, JSON.stringify(daten))
  else localStorage.removeItem(KEY)
}

// Wird beim Logout aufgerufen, damit auf geteilten Geräten keine CV-Kopie zurückbleibt.
export function cvCacheLeeren() {
  localStorage.removeItem(KEY)
}

// Modul-weit geteilt: alle Komponenten sehen denselben CV.
// Start: sofort die Offline-Kopie zeigen (auch ohne Netz ist der CV gleich da).
const cv = ref<CvDaten | null>(ausCache())

export function useCv() {
  // Holt den aktuellen CV aus Supabase und aktualisiert Anzeige + Offline-Kopie.
  async function laden(): Promise<void> {
    const auth = useAuthStore()
    if (!auth.user) return
    try {
      const { data, error } = await supabase
        .from('cv')
        .select('cv_name, cv_text')
        .eq('user_id', auth.user.id)
        .maybeSingle() // 0 oder 1 Zeile – kein Fehler, wenn noch kein CV da ist
      if (error) throw error
      if (data) {
        cv.value = { name: data.cv_name ?? 'Lebenslauf', text: data.cv_text }
        inCache(cv.value)
      } else {
        // Kein CV in der Datenbank → auch die lokale Kopie leeren.
        cv.value = null
        inCache(null)
      }
    } catch {
      // Offline/Fehler: einfach bei der vorhandenen Offline-Kopie bleiben.
    }
  }

  // Speichert den CV in Supabase (genau ein Eintrag pro Nutzer) + Offline-Kopie.
  async function speichern(daten: CvDaten): Promise<void> {
    if (!navigator.onLine) {
      throw new Error('Keine Internetverbindung – Speichern ist gerade nicht möglich.')
    }
    const auth = useAuthStore()
    if (!auth.user) throw new Error('Bitte zuerst einloggen.')
    const { error } = await supabase.from('cv').upsert(
      {
        user_id: auth.user.id,
        cv_name: daten.name,
        cv_text: daten.text,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }, // vorhandenen Eintrag überschreiben statt doppeln
    )
    if (error) throw error
    cv.value = daten
    inCache(daten)
  }

  // Löscht den CV in Supabase + Offline-Kopie.
  async function loeschen(): Promise<void> {
    if (!navigator.onLine) {
      throw new Error('Keine Internetverbindung – Löschen ist gerade nicht möglich.')
    }
    const auth = useAuthStore()
    if (!auth.user) throw new Error('Bitte zuerst einloggen.')
    const { error } = await supabase.from('cv').delete().eq('user_id', auth.user.id)
    if (error) throw error
    cv.value = null
    inCache(null)
  }

  return { cv, laden, speichern, loeschen }
}
