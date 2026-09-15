// Sichert alle Aspira-Daten aus Supabase als JSON-Dateien.
//
// Aufruf (im Ordner aspira/supabase/sicherung):
//   npm run export -- "C:\Pfad\zum\Sicherungsordner"
//
// - Adresse + anon-Key kommen aus ../frontend/.env.local (wie in der App).
// - E-Mail und Passwort fragt das Skript im Terminal ab (Passwort unsichtbar).
//   Gelesen wird mit deinem Login → Row Level Security gilt wie in der App.
// - Der Zielordner muss AUSSERHALB des Git-Repos liegen (persönliche Daten)
//   und leer bzw. neu sein, damit keine ältere Sicherung überschrieben wird.
// - Das Skript ändert in Supabase NICHTS (nur Lesezugriffe).

import { createClient } from '@supabase/supabase-js'
import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import readline from 'node:readline/promises'
import { fileURLToPath } from 'node:url'
import { passwortEingabe } from './passwort-eingabe.mjs'

const skriptOrdner = path.dirname(fileURLToPath(import.meta.url))
const aspiraOrdner = path.resolve(skriptOrdner, '..', '..') // aspira/
const repoOrdner = path.resolve(aspiraOrdner, '..') // claude-lab/

// Tabelle → Spalte für eine stabile Reihenfolge beim seitenweisen Lesen.
const TABELLEN = {
  applications: 'id',
  agentur_termine: 'id',
  agentur_aufgaben: 'schluessel',
  cv: 'user_id',
}
const SEITENGROESSE = 1000 // Supabase liefert höchstens 1000 Zeilen pro Anfrage

function abbruch(meldung) {
  console.error(`\n✖ ${meldung}`)
  process.exit(1)
}

function liegtIm(ordner, pfad) {
  const rel = path.relative(ordner.toLowerCase(), pfad.toLowerCase())
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel))
}

// Liest ein Passwort, ohne die Zeichen im Terminal anzuzeigen.
function passwortAbfragen(frage) {
  return new Promise((resolve, reject) => {
    const stdin = process.stdin
    process.stdout.write(frage)
    stdin.setRawMode(true)
    stdin.resume()
    stdin.setEncoding('utf8')
    let passwort = ''
    function aufraeumen() {
      stdin.removeListener('data', beiEingabe)
      stdin.setRawMode(false)
      stdin.pause()
    }
    function beiEingabe(stueck) {
      const stand = passwortEingabe(passwort, stueck)
      passwort = stand.passwort
      if (stand.abgebrochen) {
        aufraeumen()
        reject(new Error('Abgebrochen.'))
      } else if (stand.fertig) {
        aufraeumen()
        process.stdout.write('\n')
        resolve(passwort)
      }
    }
    stdin.on('data', beiEingabe)
  })
}

async function tabelleLesen(supabase, tabelle, sortierung) {
  const zeilen = []
  let gesamt = null
  for (let von = 0; ; von += SEITENGROESSE) {
    const { data, error, count } = await supabase
      .from(tabelle)
      .select('*', { count: 'exact' })
      .order(sortierung, { ascending: true })
      .range(von, von + SEITENGROESSE - 1)
    if (error) throw new Error(`${tabelle}: ${error.message}`)
    if (gesamt === null) gesamt = count
    zeilen.push(...data)
    if (data.length < SEITENGROESSE) break
  }
  if (gesamt !== null && gesamt !== zeilen.length) {
    throw new Error(`${tabelle}: ${zeilen.length} Zeilen gelesen, Supabase meldet aber ${gesamt}.`)
  }
  return zeilen
}

async function main() {
  // 1) Zielordner prüfen
  const zielArg = process.argv[2]
  if (!zielArg) abbruch('Bitte einen Zielordner angeben: npm run export -- "C:\\Pfad\\zum\\Ordner"')
  const ziel = path.resolve(zielArg)
  if (liegtIm(repoOrdner, ziel)) {
    abbruch(`Der Zielordner liegt im Git-Repo (${repoOrdner}). Bitte einen Ordner außerhalb wählen.`)
  }
  if (existsSync(ziel) && readdirSync(ziel).length > 0) {
    abbruch(`Der Zielordner ist nicht leer: ${ziel}\nBitte einen neuen Ordner angeben.`)
  }

  // 2) Supabase-Zugang aus der Frontend-Konfiguration
  const envDatei = path.resolve(aspiraOrdner, 'frontend', '.env.local')
  if (!existsSync(envDatei)) abbruch(`Nicht gefunden: ${envDatei}`)
  process.loadEnvFile(envDatei)
  const url = process.env.VITE_SUPABASE_URL
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY
  if (!url || !anonKey) abbruch('VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY fehlen in .env.local.')

  if (!process.stdin.isTTY) {
    abbruch('Bitte in einem normalen Terminal (z. B. PowerShell) starten – die Passwort-Eingabe braucht das.')
  }

  // 3) Einloggen
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  const email = (await rl.question('E-Mail (Aspira-Login): ')).trim()
  rl.close()
  if (!email.includes('@')) abbruch(`Das sieht nicht wie eine E-Mail-Adresse aus: "${email}"`)
  const passwort = await passwortAbfragen('Passwort (wird nicht angezeigt): ')
  // Nur die Länge anzeigen – hilft, Tipp- oder Einfügefehler zu erkennen.
  console.log(`(E-Mail: ${email} · Passwort: ${passwort.length} Zeichen erkannt)`)

  const supabase = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    db: { schema: 'aspira' }, // seit Migration 002 (vorher: public)
  })
  const { data: login, error: loginFehler } = await supabase.auth.signInWithPassword({
    email,
    password: passwort,
  })
  if (loginFehler) abbruch(`Login fehlgeschlagen: ${loginFehler.message}`)

  // 4) Tabellen lesen und speichern
  mkdirSync(ziel, { recursive: true })
  const meta = {
    exportiert_am: new Date().toISOString(),
    supabase_user_id: login.user.id,
    auth_erstellt_am: login.user.created_at,
    tabellen: {},
  }

  for (const [tabelle, sortierung] of Object.entries(TABELLEN)) {
    const zeilen = await tabelleLesen(supabase, tabelle, sortierung)
    writeFileSync(path.join(ziel, `${tabelle}.json`), JSON.stringify(zeilen, null, 2), 'utf8')

    const spalten = [...new Set(zeilen.flatMap((z) => Object.keys(z)))].sort()
    // Größte Zeile in Bytes – zur Einschätzung der Datenmenge.
    const groessteZeileBytes = zeilen.reduce(
      (max, z) => Math.max(max, Buffer.byteLength(JSON.stringify(z), 'utf8')),
      0,
    )
    meta.tabellen[tabelle] = { zeilen: zeilen.length, spalten, groessteZeileBytes }
  }

  writeFileSync(path.join(ziel, 'meta.json'), JSON.stringify(meta, null, 2), 'utf8')
  await supabase.auth.signOut()

  // 5) Zusammenfassung (enthält keine Inhalte, nur Zahlen und Spaltennamen)
  console.log(`\n✔ Sicherung gespeichert in: ${ziel}\n`)
  console.log(`Supabase-User-ID: ${meta.supabase_user_id}`)
  for (const [tabelle, info] of Object.entries(meta.tabellen)) {
    const kb = (info.groessteZeileBytes / 1024).toFixed(1)
    console.log(`\n${tabelle}: ${info.zeilen} Zeilen (größte Zeile ${kb} KB)`)
    console.log(`  Spalten: ${info.spalten.join(', ') || '–'}`)
  }
}

main().catch((e) => abbruch(e instanceof Error ? e.message : String(e)))
