// Zentrale Verbindung zu Supabase (Datenbank + Login).
// Diese Datei wird einmal geladen und überall in der App wiederverwendet.

import { createClient } from '@supabase/supabase-js'

// Die zwei Werte kommen aus deiner .env.local (Präfix VITE_ macht sie hier sichtbar).
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

// Sicherheitsnetz: Falls die Werte fehlen, lieber sofort einen klaren Fehler zeigen,
// als später eine kryptische Meldung beim ersten Datenbank-Zugriff zu bekommen.
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Supabase-Zugangsdaten fehlen. Prüfe, ob VITE_SUPABASE_URL und ' +
      'VITE_SUPABASE_ANON_KEY in der Datei .env.local stehen.',
  )
}

// Der "Client" ist unser Werkzeug für alle Datenbank- und Login-Aktionen.
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
