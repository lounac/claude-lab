// Schalter für die KI-Stärken-Analyse (Umgebungsvariable VITE_ANALYSE_AKTIV).
// Standard: aus – nur der Wert "true" schaltet das Starten neuer Analysen ein.
export function analyseAktiv(wert: string | undefined): boolean {
  return wert?.trim().toLowerCase() === 'true'
}
