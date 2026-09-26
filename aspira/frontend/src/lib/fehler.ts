// Macht aus technischen Fehlermeldungen verständliches Deutsch.
export function freundlicherFehler(message: string): string {
  const m = message.toLowerCase()
  if (m.includes('failed to fetch') || m.includes('network')) {
    return 'Keine Internetverbindung – bitte später erneut versuchen.'
  }
  return message
}

// Liefert einen lesbaren Text für einen beliebigen Fehler.
// Supabase gibt Datenbankfehler als einfaches Objekt { message, code, … } zurück –
// das ist kein Error. "e instanceof Error" allein reicht daher nicht, sonst
// erscheint in der App nur "[object Object]".
export function fehlerText(e: unknown, ersatz = 'Unbekannter Fehler.'): string {
  if (e instanceof Error) return e.message
  if (typeof e === 'string') return e
  if (e && typeof e === 'object' && 'message' in e && typeof e.message === 'string') {
    const code = 'code' in e && typeof e.code === 'string' && e.code ? ` (${e.code})` : ''
    return e.message + code
  }
  return ersatz
}
