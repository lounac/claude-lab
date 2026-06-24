// Macht aus technischen Fehlermeldungen verständliches Deutsch.
export function freundlicherFehler(message: string): string {
  const m = message.toLowerCase()
  if (m.includes('failed to fetch') || m.includes('network')) {
    return 'Keine Internetverbindung – bitte später erneut versuchen.'
  }
  return message
}
