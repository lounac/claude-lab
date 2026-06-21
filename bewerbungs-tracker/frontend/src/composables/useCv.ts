// Merkt sich den aus der PDF ausgelesenen Lebenslauf-TEXT lokal im Browser.
// So geht bei jeder Analyse nur der schlanke Text an Claude (spart Tokens/Kosten).
import { ref } from 'vue'

const KEY = 'bt_cv'

interface CvDaten {
  name: string // Dateiname, z. B. "Lebenslauf.pdf"
  text: string // der ausgelesene Text
}

function ausSpeicher(): CvDaten | null {
  try {
    const roh = localStorage.getItem(KEY)
    return roh ? (JSON.parse(roh) as CvDaten) : null
  } catch {
    return null
  }
}

// Modul-weit geteilt: alle Komponenten sehen denselben CV.
const cv = ref<CvDaten | null>(ausSpeicher())

export function useCv() {
  function speichern(daten: CvDaten) {
    cv.value = daten
    localStorage.setItem(KEY, JSON.stringify(daten))
  }

  function loeschen() {
    cv.value = null
    localStorage.removeItem(KEY)
  }

  return { cv, speichern, loeschen }
}
