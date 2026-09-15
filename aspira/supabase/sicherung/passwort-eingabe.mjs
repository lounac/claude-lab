// Verarbeitet Tastatur-Eingaben für die unsichtbare Passwort-Abfrage.
// Reine Funktion (ohne Terminal), damit sie testbar ist.

// Steuersequenzen, die Terminals beim Einfügen oder bei Pfeiltasten mitschicken:
// "Bracketed Paste" (ESC[200~ … ESC[201~) und sonstige ESC[…-Sequenzen.
const STEUERSEQUENZ = /\x1b\[[0-9;]*[A-Za-z~]/g

// Nimmt den bisherigen Stand und ein neues Eingabe-Stück entgegen.
// Liefert den neuen Stand: { passwort, fertig, abgebrochen }.
export function passwortEingabe(bisher, stueck) {
  let passwort = bisher
  for (const z of stueck.replace(STEUERSEQUENZ, '')) {
    if (z === '\u0003') return { passwort, fertig: false, abgebrochen: true } // Strg+C
    // Enter: \r (Windows) oder \n. Ein \n ganz am Anfang ist ein Rest der E-Mail-Zeile.
    if (z === '\r' || (z === '\n' && passwort.length > 0)) {
      return { passwort, fertig: true, abgebrochen: false }
    }
    if (z === '\n') continue
    if (z === '\u007f' || z === '\b') {
      passwort = passwort.slice(0, -1) // Rücktaste
      continue
    }
    if (z < ' ') continue // andere Steuerzeichen (z. B. Strg+V im alten Konsolenfenster)
    passwort += z
  }
  return { passwort, fertig: false, abgebrochen: false }
}
