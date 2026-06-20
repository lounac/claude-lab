// Übersetzt die (englischen) Supabase-Login-Fehler in verständliches Deutsch.

export function uebersetzeAuthFehler(nachricht: string): string {
  const m = nachricht.toLowerCase()

  if (m.includes('invalid login credentials')) {
    return 'E-Mail oder Passwort ist falsch.'
  }
  if (m.includes('already registered') || m.includes('already been registered')) {
    return 'Diese E-Mail ist bereits registriert. Bitte melde dich an.'
  }
  if (m.includes('password should be at least')) {
    return 'Das Passwort muss mindestens 6 Zeichen lang sein.'
  }
  if (m.includes('unable to validate email') || m.includes('invalid format')) {
    return 'Bitte gib eine gültige E-Mail-Adresse ein.'
  }
  if (m.includes('email not confirmed')) {
    return 'Bitte bestätige zuerst deine E-Mail-Adresse.'
  }

  // Unbekannter Fehler: Originaltext zeigen (besser als gar nichts).
  return nachricht
}
