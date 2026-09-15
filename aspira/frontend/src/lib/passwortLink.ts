// Erkennt, ob die App über den Link aus der "Passwort vergessen"-Mail geöffnet wurde.
// Supabase hängt dann u. a. "type=recovery" hinter das # der Adresse.
export function istPasswortLink(hash: string): boolean {
  const parameter = new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash)
  return parameter.get('type') === 'recovery'
}
